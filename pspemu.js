var Emulator = (function () {
    function Emulator() {
        this.memory = new core.Memory();
    }
    Emulator.prototype.stopAsync = function () {
        if (!this.display)
            return Promise.resolve();

        return Promise.all([
            this.display.stopAsync(),
            this.controller.stopAsync(),
            this.gpu.stopAsync(),
            this.audio.stopAsync(),
            this.threadManager.stopAsync()
        ]);
    };

    Emulator.prototype.startAsync = function () {
        var _this = this;
        return this.stopAsync().then(function () {
            _this.memory.reset();
            _this.emulatorContext = new EmulatorContext();
            _this.memoryManager = new hle.MemoryManager();
            _this.audio = new core.PspAudio();
            _this.canvas = (document.getElementById('canvas'));
            _this.webgl_canvas = (document.getElementById('webgl_canvas'));
            _this.display = new core.PspDisplay(_this.memory, _this.canvas);
            _this.gpu = new core.gpu.PspGpu(_this.memory, _this.webgl_canvas);
            _this.controller = new core.PspController();
            _this.instructionCache = new InstructionCache(_this.memory);
            _this.syscallManager = new core.SyscallManager(_this.emulatorContext);
            _this.fileManager = new hle.FileManager();
            _this.threadManager = new hle.ThreadManager(_this.memory, _this.memoryManager, _this.display, _this.syscallManager, _this.instructionCache);
            _this.moduleManager = new hle.ModuleManager(_this.emulatorContext);

            _this.fileManager.mount('ms0', new hle.vfs.MemoryVfs());

            hle.ModuleManagerSyscalls.registerSyscalls(_this.syscallManager, _this.moduleManager);

            _this.emulatorContext.init(_this.display, _this.controller, _this.gpu, _this.memoryManager, _this.threadManager, _this.audio, _this.memory, _this.instructionCache, _this.fileManager);

            return Promise.all([
                _this.display.startAsync(),
                _this.controller.startAsync(),
                _this.gpu.startAsync(),
                _this.audio.startAsync(),
                _this.threadManager.startAsync()
            ]);
        });
    };

    Emulator.prototype._loadAsync = function (asyncStream, pathToFile) {
        var _this = this;
        return format.detectFormatAsync(asyncStream).then(function (fileFormat) {
            console.info(sprintf('File:: size: %d, format: "%s", name: "%s"', asyncStream.size, fileFormat, asyncStream.name));
            switch (fileFormat) {
                case 'ciso':
                    return format.cso.Cso.fromStreamAsync(asyncStream).then(function (asyncStream2) {
                        return _this._loadAsync(asyncStream2, pathToFile);
                    });
                case 'pbp':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        var pbp = format.pbp.Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
                        return _this._loadAsync(new MemoryAsyncStream(pbp.get('psp.data').toArrayBuffer()), pathToFile);
                    });
                case 'iso':
                    return format.iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
                        var isoFs = new hle.vfs.IsoVfs(iso);
                        _this.fileManager.mount('umd0', isoFs);
                        _this.fileManager.mount('disc0', isoFs);

                        return isoFs.open('PSP_GAME/SYSDIR/BOOT.BIN', 1 /* Read */, parseInt('777', 8)).readAllAsync().then(function (data) {
                            return _this._loadAsync(new MemoryAsyncStream(data), 'umd0:/PSP_GAME/SYSDIR/BOOT.BIN');
                        });
                    });
                case 'elf':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        _this.fileManager.getDevice('ms0').vfs.addFile('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);

                        var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);

                        //console.log(new Uint8Array(executableArrayBuffer));
                        var pspElf = new hle.elf.PspElfLoader(_this.memory, _this.memoryManager, _this.moduleManager, _this.syscallManager);

                        pspElf.load(elfStream);

                        var moduleInfo = pspElf.moduleInfo;

                        var arguments = [pathToFile];
                        var argumentsPartition = _this.memoryManager.userPartition.allocateLow(0x4000);

                        var argument = arguments.map(function (argument) {
                            return argument + String.fromCharCode(0);
                        }).join('');

                        //console.log(argument);
                        _this.memory.getPointerStream(argumentsPartition.low).writeString(argument);

                        //argumentsPartition.low
                        // "ms0:/PSP/GAME/virtual/EBOOT.PBP"
                        var thread = _this.threadManager.create('main', moduleInfo.pc, 10);
                        thread.state.GP = moduleInfo.gp;
                        thread.state.gpr[4] = argument.length;
                        thread.state.gpr[5] = argumentsPartition.low;
                        thread.start();
                    });

                default:
                    throw (new Error(sprintf("Unhandled format '%s'", fileFormat)));
            }
        });
    };

    Emulator.prototype.loadAndExecuteAsync = function (asyncStream) {
        var _this = this;
        return this.startAsync().then(function () {
            return _this._loadAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
            throw (e);
        });
    };

    Emulator.prototype.downloadAndExecuteAsync = function (url) {
        var _this = this;
        return downloadFileAsync(url).then(function (data) {
            setImmediate(function () {
                // escape try/catch!
                _this.loadAndExecuteAsync(new MemoryAsyncStream(data, url));
            });
        });
    };

    Emulator.prototype.executeFileAsync = function (file) {
        var _this = this;
        setImmediate(function () {
            // escape try/catch!
            _this.loadAndExecuteAsync(new FileAsyncStream(file));
        });
    };
    return Emulator;
})();

function controllerRegister() {
    function createButton(query, button) {
        var jq = $(query);
        function down() {
            jq.addClass('pressed');
            window['emulator'].controller.simulateButtonDown(button);
        }
        function up() {
            jq.removeClass('pressed');
            window['emulator'].controller.simulateButtonUp(button);
        }

        jq.mousedown(down).mouseup(up).on('touchstart', down).on('touchend', up);
    }

    createButton('#button_left', 128 /* left */);
    createButton('#button_up', 16 /* up */);
    createButton('#button_down', 64 /* down */);
    createButton('#button_right', 32 /* right */);

    createButton('#button_up_left', 16 /* up */ | 128 /* left */);
    createButton('#button_up_right', 16 /* up */ | 32 /* right */);
    createButton('#button_down_left', 64 /* down */ | 128 /* left */);
    createButton('#button_down_right', 64 /* down */ | 32 /* right */);

    createButton('#button_cross', 16384 /* cross */);
    createButton('#button_circle', 8192 /* circle */);
    createButton('#button_triangle', 4096 /* triangle */);
    createButton('#button_square', 32768 /* square */);

    createButton('#button_l', 256 /* leftTrigger */);
    createButton('#button_r', 512 /* rightTrigger */);

    createButton('#button_start', 8 /* start */);
    createButton('#button_select', 1 /* select */);
    //document['ontouchmove'] = (e) => { e.preventDefault(); };
    //document.onselectstart = () => { return false; };
}

function main() {
    var emulator = new Emulator();
    window['emulator'] = emulator;
    var sampleDemo = '';

    if (document.location.hash) {
        sampleDemo = document.location.hash.substr(1);
    }

    if (sampleDemo) {
        emulator.downloadAndExecuteAsync(sampleDemo);
    }
}
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ANode = (function () {
    function ANode() {
    }
    ANode.prototype.toJs = function () {
    };

    ANode.prototype.optimize = function () {
        return this;
    };
    return ANode;
})();

var ANodeStm = (function (_super) {
    __extends(ANodeStm, _super);
    function ANodeStm() {
        _super.apply(this, arguments);
    }
    return ANodeStm;
})(ANode);

var ANodeStmList = (function (_super) {
    __extends(ANodeStmList, _super);
    function ANodeStmList(childs) {
        _super.call(this);
        this.childs = childs;
    }
    ANodeStmList.prototype.toJs = function () {
        return this.childs.map(function (item) {
            return item.toJs();
        }).join("\n");
    };
    return ANodeStmList;
})(ANodeStm);

var ANodeStmRaw = (function (_super) {
    __extends(ANodeStmRaw, _super);
    function ANodeStmRaw(content) {
        _super.call(this);
        this.content = content;
    }
    ANodeStmRaw.prototype.toJs = function () {
        return this.content;
    };
    return ANodeStmRaw;
})(ANodeStm);

var ANodeStmExpr = (function (_super) {
    __extends(ANodeStmExpr, _super);
    function ANodeStmExpr(expr) {
        _super.call(this);
        this.expr = expr;
    }
    ANodeStmExpr.prototype.toJs = function () {
        return this.expr.toJs() + ';';
    };
    return ANodeStmExpr;
})(ANodeStm);

var ANodeExpr = (function (_super) {
    __extends(ANodeExpr, _super);
    function ANodeExpr() {
        _super.apply(this, arguments);
    }
    return ANodeExpr;
})(ANode);

var ANodeExprLValue = (function (_super) {
    __extends(ANodeExprLValue, _super);
    function ANodeExprLValue() {
        _super.apply(this, arguments);
    }
    return ANodeExprLValue;
})(ANodeExpr);

var ANodeExprLValueVar = (function (_super) {
    __extends(ANodeExprLValueVar, _super);
    function ANodeExprLValueVar(name) {
        _super.call(this);
        this.name = name;
    }
    ANodeExprLValueVar.prototype.toJs = function () {
        return this.name;
    };
    return ANodeExprLValueVar;
})(ANodeExprLValue);

var ANodeExprI32 = (function (_super) {
    __extends(ANodeExprI32, _super);
    function ANodeExprI32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprI32.prototype.toJs = function () {
        return String(this.value);
    };
    return ANodeExprI32;
})(ANodeExpr);

var ANodeExprU32 = (function (_super) {
    __extends(ANodeExprU32, _super);
    function ANodeExprU32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprU32.prototype.toJs = function () {
        return sprintf('0x%08X', this.value);
    };
    return ANodeExprU32;
})(ANodeExpr);

var ANodeExprBinop = (function (_super) {
    __extends(ANodeExprBinop, _super);
    function ANodeExprBinop(left, op, right) {
        _super.call(this);
        this.left = left;
        this.op = op;
        this.right = right;
    }
    ANodeExprBinop.prototype.toJs = function () {
        return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')';
    };
    return ANodeExprBinop;
})(ANodeExpr);

var ANodeExprUnop = (function (_super) {
    __extends(ANodeExprUnop, _super);
    function ANodeExprUnop(op, right) {
        _super.call(this);
        this.op = op;
        this.right = right;
    }
    ANodeExprUnop.prototype.toJs = function () {
        return '(' + this.op + '(' + this.right.toJs() + '))';
    };
    return ANodeExprUnop;
})(ANodeExpr);

var ANodeExprAssign = (function (_super) {
    __extends(ANodeExprAssign, _super);
    function ANodeExprAssign(left, right) {
        _super.call(this);
        this.left = left;
        this.right = right;
    }
    ANodeExprAssign.prototype.toJs = function () {
        return this.left.toJs() + ' = ' + this.right.toJs();
    };
    return ANodeExprAssign;
})(ANodeExpr);

var ANodeExprCall = (function (_super) {
    __extends(ANodeExprCall, _super);
    function ANodeExprCall(name, arguments) {
        _super.call(this);
        this.name = name;
        this.arguments = arguments;
    }
    ANodeExprCall.prototype.toJs = function () {
        return this.name + '(' + this.arguments.map(function (argument) {
            return argument.toJs();
        }).join(',') + ')';
    };
    return ANodeExprCall;
})(ANodeExpr);

var ANodeStmIf = (function (_super) {
    __extends(ANodeStmIf, _super);
    function ANodeStmIf(cond, codeTrue, codeFalse) {
        _super.call(this);
        this.cond = cond;
        this.codeTrue = codeTrue;
        this.codeFalse = codeFalse;
    }
    ANodeStmIf.prototype.toJs = function () {
        var result = '';
        result += 'if (' + this.cond.toJs() + ')';
        result += ' { ' + this.codeTrue.toJs() + ' }';
        if (this.codeFalse)
            result += ' else { ' + this.codeFalse.toJs() + ' }';
        return result;
    };
    return ANodeStmIf;
})(ANodeStm);

var AstBuilder = (function () {
    function AstBuilder() {
    }
    AstBuilder.prototype.assign = function (ref, value) {
        return new ANodeExprAssign(ref, value);
    };

    AstBuilder.prototype._if = function (cond, codeTrue, codeFalse) {
        return new ANodeStmIf(cond, codeTrue, codeFalse);
    };

    AstBuilder.prototype.binop = function (left, op, right) {
        return new ANodeExprBinop(left, op, right);
    };

    AstBuilder.prototype.unop = function (op, right) {
        return new ANodeExprUnop(op, right);
    };

    AstBuilder.prototype.binop_i = function (left, op, right) {
        return this.binop(left, op, this.imm32(right));
    };

    AstBuilder.prototype.imm32 = function (value) {
        return new ANodeExprI32(value);
    };

    AstBuilder.prototype.u_imm32 = function (value) {
        //return new ANodeExprI32(value);
        return new ANodeExprU32(value);
    };

    AstBuilder.prototype.stm = function (expr) {
        return new ANodeStmExpr(expr);
    };

    AstBuilder.prototype.stmEmpty = function () {
        return new ANodeStm();
    };

    AstBuilder.prototype.stms = function (stms) {
        return new ANodeStmList(stms);
    };

    AstBuilder.prototype.call = function (name, exprList) {
        return new ANodeExprCall(name, exprList);
    };
    return AstBuilder;
})();

var MipsAstBuilder = (function (_super) {
    __extends(MipsAstBuilder, _super);
    function MipsAstBuilder() {
        _super.apply(this, arguments);
    }
    MipsAstBuilder.prototype.debugger = function () {
        return new ANodeStmRaw("debugger;");
    };

    MipsAstBuilder.prototype.functionPrefix = function () {
        //return new ANodeStmRaw('var gpr = state.gpr;');
        return this.stmEmpty();
    };

    MipsAstBuilder.prototype.gpr = function (index) {
        if (index === 0)
            return new ANodeExprLValueVar('0');
        return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getGprAccessName(index));
    };

    MipsAstBuilder.prototype.fpr = function (index) {
        return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getFprAccessName(index));
    };

    MipsAstBuilder.prototype.fpr_i = function (index) {
        return this.call('MathFloat.reinterpretFloatAsInt', [this.fpr(index)]);
    };

    MipsAstBuilder.prototype.fcr31_cc = function () {
        return new ANodeExprLValueVar('state.fcr31_cc');
    };
    MipsAstBuilder.prototype.lo = function () {
        return new ANodeExprLValueVar('state.LO');
    };
    MipsAstBuilder.prototype.hi = function () {
        return new ANodeExprLValueVar('state.HI');
    };
    MipsAstBuilder.prototype.ic = function () {
        return new ANodeExprLValueVar('state.IC');
    };
    MipsAstBuilder.prototype.pc = function () {
        return new ANodeExprLValueVar('state.PC');
    };
    MipsAstBuilder.prototype.branchflag = function () {
        return new ANodeExprLValueVar('state.BRANCHFLAG');
    };
    MipsAstBuilder.prototype.branchpc = function () {
        return new ANodeExprLValueVar('state.BRANCHPC');
    };

    MipsAstBuilder.prototype.assignGpr = function (index, expr) {
        if (index == 0)
            return this.stmEmpty();

        //return this.stm(this.assign(this.gpr(index), this.binop(expr, '|', this.imm32(0))));
        return this.stm(this.assign(this.gpr(index), expr));
    };

    MipsAstBuilder.prototype.assignIC = function (expr) {
        return this.stm(this.assign(this.ic(), expr));
    };

    MipsAstBuilder.prototype.assignFpr = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), expr));
    };

    MipsAstBuilder.prototype.assignFpr_I = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), this.call('MathFloat.reinterpretIntAsFloat', [expr])));
    };
    return MipsAstBuilder;
})(AstBuilder);
///<reference path="../../typings/promise/promise.d.ts" />

function String_repeat(str, num) {
    return new Array(num + 1).join(str);
}

var Endian;
(function (Endian) {
    Endian[Endian["LITTLE"] = 0] = "LITTLE";
    Endian[Endian["BIG"] = 1] = "BIG";
})(Endian || (Endian = {}));

var IndentStringGenerator = (function () {
    function IndentStringGenerator() {
        this.indentation = 0;
        this.output = '';
        this.newLine = true;
    }
    IndentStringGenerator.prototype.indent = function (callback) {
        this.indentation++;
        try  {
            callback();
        } finally {
            this.indentation--;
        }
    };

    IndentStringGenerator.prototype.write = function (text) {
        var chunks = text.split('\n');
        for (var n = 0; n < chunks.length; n++) {
            if (n != 0)
                this.writeBreakLine();
            this.writeInline(chunks[n]);
        }
    };

    IndentStringGenerator.prototype.writeInline = function (text) {
        if (text == null || text.length == 0)
            return;

        if (this.newLine) {
            this.output += String_repeat('\t', this.indentation);
            this.newLine = false;
        }
        this.output += text;
    };

    IndentStringGenerator.prototype.writeBreakLine = function () {
        this.output += '\n';
        this.newLine = true;
    };
    return IndentStringGenerator;
})();

function base64_toArrayBuffer(base64string) {
    var outstr = atob(base64string);
    var out = new ArrayBuffer(outstr.length);
    var ia = new Uint8Array(out);
    for (var n = 0; n < outstr.length; n++)
        ia[n] = outstr.charCodeAt(n);
    return out;
}

var MemoryAsyncStream = (function () {
    function MemoryAsyncStream(data, name) {
        if (typeof name === "undefined") { name = 'memory'; }
        this.data = data;
        this.name = name;
    }
    MemoryAsyncStream.fromArrayBuffer = function (data) {
        return new MemoryAsyncStream(data);
    };

    Object.defineProperty(MemoryAsyncStream.prototype, "size", {
        get: function () {
            return this.data.byteLength;
        },
        enumerable: true,
        configurable: true
    });

    MemoryAsyncStream.prototype.readChunkAsync = function (offset, count) {
        return Promise.resolve(this.data.slice(offset, offset + count));
    };
    return MemoryAsyncStream;
})();

var FileAsyncStream = (function () {
    function FileAsyncStream(file) {
        this.file = file;
    }
    Object.defineProperty(FileAsyncStream.prototype, "name", {
        get: function () {
            return this.file.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileAsyncStream.prototype, "size", {
        get: function () {
            return this.file.size;
        },
        enumerable: true,
        configurable: true
    });

    FileAsyncStream.prototype.readChunkAsync = function (offset, count) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                resolve(fileReader.result);
            };
            fileReader.onerror = function (e) {
                reject(e.error);
            };
            fileReader.readAsArrayBuffer(_this.file.slice(offset, offset + count));
        });
    };
    return FileAsyncStream;
})();

var Stream = (function () {
    function Stream(data, offset) {
        if (typeof offset === "undefined") { offset = 0; }
        this.data = data;
        this.offset = offset;
    }
    Stream.fromArrayBuffer = function (data) {
        return new Stream(new DataView(data));
    };

    Stream.fromDataView = function (data, offset) {
        if (typeof offset === "undefined") { offset = 0; }
        return new Stream(data);
    };

    Stream.fromBase64 = function (data) {
        return new Stream(new DataView(base64_toArrayBuffer(data)));
    };

    Stream.prototype.toUInt8Array = function () {
        return new Uint8Array(this.toArrayBuffer());
    };

    Stream.prototype.toArrayBuffer = function () {
        return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
    };

    Stream.fromUint8Array = function (array) {
        return Stream.fromArray(array);
    };

    Stream.fromArray = function (array) {
        var buffer = new ArrayBuffer(array.length);
        var w8 = new Uint8Array(buffer);
        for (var n = 0; n < array.length; n++)
            w8[n] = array[n];
        return new Stream(new DataView(buffer));
    };

    Stream.prototype.sliceWithLength = function (low, count) {
        return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, count));
    };

    Stream.prototype.sliceWithLowHigh = function (low, high) {
        return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, high - low));
    };

    Object.defineProperty(Stream.prototype, "available", {
        get: function () {
            return this.length - this.offset;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Stream.prototype, "length", {
        get: function () {
            return this.data.byteLength;
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(Stream.prototype, "position", {
        get: function () {
            return this.offset;
        },
        set: function (value) {
            this.offset = value;
        },
        enumerable: true,
        configurable: true
    });

    Stream.prototype.skip = function (count, pass) {
        this.offset += count;
        return pass;
    };

    Stream.prototype.readInt8 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getInt8(this.offset));
    };
    Stream.prototype.readInt16 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getInt16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readInt32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getInt32(this.offset, (endian == 0 /* LITTLE */)));
    };

    //readInt64() { return this.skip(8, this.data.getInt32(this.offset + 0, true) * Math.pow(2, 32) + this.data.getInt32(this.offset + 4, true) * Math.pow(2, 0)); }
    Stream.prototype.readFloat32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getFloat32(this.offset, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.readUInt8 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getUint8(this.offset));
    };
    Stream.prototype.readUInt16 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getUint16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readUInt32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getUint32(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readUInt64 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(8, this.data.getUint32(this.offset, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.writeInt8 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.setInt8(this.offset, value));
    };
    Stream.prototype.writeInt16 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.setInt16(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeInt32 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.setInt32(this.offset, value, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.writeUInt8 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.setUint8(this.offset, value));
    };
    Stream.prototype.writeUInt16 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.setUint16(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeUInt32 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.setUint32(this.offset, value, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.readBytes = function (count) {
        return this.skip(count, new Uint8Array(this.data.buffer, this.data.byteOffset + this.offset, count));
    };

    Stream.prototype.readInt16Array = function (count) {
        return this.skip(count, new Int16Array(this.data.buffer, this.data.byteOffset + this.offset, count));
    };

    Stream.prototype.readFloat32Array = function (count) {
        return new Float32Array(this.readBytes(count));
    };

    Stream.prototype.readStream = function (count) {
        return Stream.fromUint8Array(this.readBytes(count));
    };

    Stream.prototype.readUtf8String = function (count) {
        return Utf8.decode(this.readString(count));
    };

    /*
    writeStream(from: Stream) {
    new Uint8Array(this.data.buffer, this.data.byteOffset).set();
    }
    */
    Stream.prototype.writeString = function (str) {
        var _this = this;
        str.split('').forEach(function (char) {
            _this.writeUInt8(char.charCodeAt(0));
        });
    };

    Stream.prototype.readString = function (count) {
        var str = '';
        for (var n = 0; n < count; n++) {
            str += String.fromCharCode(this.readInt8());
        }
        return str;
    };

    Stream.prototype.readUtf8Stringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 2147483648; }
        return Utf8.decode(this.readStringz(maxCount));
    };

    Stream.prototype.readStringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 2147483648; }
        var str = '';
        for (var n = 0; n < maxCount; n++) {
            if (this.available <= 0)
                break;
            var char = this.readInt8();
            if (char == 0)
                break;
            str += String.fromCharCode(char);
        }
        return str;
    };
    return Stream;
})();

var Int64Type = (function () {
    function Int64Type(endian) {
        this.endian = endian;
    }
    Int64Type.prototype.read = function (stream) {
        if (this.endian == 0 /* LITTLE */) {
            var low = stream.readUInt32(this.endian);
            var high = stream.readUInt32(this.endian);
        } else {
            var high = stream.readUInt32(this.endian);
            var low = stream.readUInt32(this.endian);
        }
        return high * Math.pow(2, 32) + low;
    };
    Int64Type.prototype.write = function (stream, value) {
        var low = Math.floor(value % Math.pow(2, 32));
        var high = Math.floor(value / Math.pow(2, 32));
        if (this.endian == 0 /* LITTLE */) {
            stream.writeInt32(low, this.endian);
            stream.writeInt32(high, this.endian);
        } else {
            stream.writeInt32(high, this.endian);
            stream.writeInt32(low, this.endian);
        }
    };
    Object.defineProperty(Int64Type.prototype, "length", {
        get: function () {
            return 8;
        },
        enumerable: true,
        configurable: true
    });
    return Int64Type;
})();

var Int32Type = (function () {
    function Int32Type(endian) {
        this.endian = endian;
    }
    Int32Type.prototype.read = function (stream) {
        return stream.readInt32(this.endian);
    };
    Int32Type.prototype.write = function (stream, value) {
        stream.writeInt32(value, this.endian);
    };
    Object.defineProperty(Int32Type.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return Int32Type;
})();

var Int16Type = (function () {
    function Int16Type(endian) {
        this.endian = endian;
    }
    Int16Type.prototype.read = function (stream) {
        return stream.readInt16(this.endian);
    };
    Int16Type.prototype.write = function (stream, value) {
        stream.writeInt16(value, this.endian);
    };
    Object.defineProperty(Int16Type.prototype, "length", {
        get: function () {
            return 2;
        },
        enumerable: true,
        configurable: true
    });
    return Int16Type;
})();

var Int8Type = (function () {
    function Int8Type(endian) {
        this.endian = endian;
    }
    Int8Type.prototype.read = function (stream) {
        return stream.readInt8(this.endian);
    };
    Int8Type.prototype.write = function (stream, value) {
        stream.writeInt8(value, this.endian);
    };
    Object.defineProperty(Int8Type.prototype, "length", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return Int8Type;
})();

var UInt32Type = (function () {
    function UInt32Type(endian) {
        this.endian = endian;
    }
    UInt32Type.prototype.read = function (stream) {
        return stream.readUInt32(this.endian);
    };
    UInt32Type.prototype.write = function (stream, value) {
        stream.writeUInt32(value, this.endian);
    };
    Object.defineProperty(UInt32Type.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return UInt32Type;
})();

var UInt16Type = (function () {
    function UInt16Type(endian) {
        this.endian = endian;
    }
    UInt16Type.prototype.read = function (stream) {
        return stream.readUInt16(this.endian);
    };
    UInt16Type.prototype.write = function (stream, value) {
        stream.writeUInt16(value, this.endian);
    };
    Object.defineProperty(UInt16Type.prototype, "length", {
        get: function () {
            return 2;
        },
        enumerable: true,
        configurable: true
    });
    return UInt16Type;
})();

var UInt8Type = (function () {
    function UInt8Type(endian) {
        this.endian = endian;
    }
    UInt8Type.prototype.read = function (stream) {
        return stream.readUInt8(this.endian);
    };
    UInt8Type.prototype.write = function (stream, value) {
        stream.writeUInt8(value, this.endian);
    };
    Object.defineProperty(UInt8Type.prototype, "length", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return UInt8Type;
})();

var Struct = (function () {
    function Struct(items) {
        this.items = items;
    }
    Struct.create = function (items) {
        return new Struct(items);
    };

    Struct.prototype.read = function (stream) {
        var out = {};
        this.items.forEach(function (item) {
            out[item.name] = item.type.read(stream);
        });
        return out;
    };
    Struct.prototype.write = function (stream, value) {
        this.items.forEach(function (item) {
            item.type.write(stream, value[item.name]);
        });
    };
    Object.defineProperty(Struct.prototype, "length", {
        get: function () {
            return this.items.sum(function (item) {
                if (!item)
                    throw ("Invalid item!!");
                if (!item.type)
                    throw ("Invalid item type!!");
                return item.type.length;
            });
        },
        enumerable: true,
        configurable: true
    });
    return Struct;
})();

var StructClass = (function () {
    function StructClass(_class, items) {
        this._class = _class;
        this.items = items;
    }
    StructClass.create = function (_class, items) {
        return new StructClass(_class, items);
    };

    StructClass.prototype.read = function (stream) {
        var _class = this._class;
        var out = new _class();
        this.items.forEach(function (item) {
            out[item.name] = item.type.read(stream);
        });
        return out;
    };
    StructClass.prototype.write = function (stream, value) {
        this.items.forEach(function (item) {
            item.type.write(stream, value[item.name]);
        });
    };
    Object.defineProperty(StructClass.prototype, "length", {
        get: function () {
            return this.items.sum(function (item) {
                if (!item)
                    throw ("Invalid item!!");
                if (!item.type) {
                    console.log(item);
                    throw ("Invalid item type!!");
                }
                return item.type.length;
            });
        },
        enumerable: true,
        configurable: true
    });
    return StructClass;
})();

var StructArray = (function () {
    function StructArray(elementType, count) {
        this.elementType = elementType;
        this.count = count;
    }
    StructArray.create = function (elementType, count) {
        return new StructArray(elementType, count);
    };

    StructArray.prototype.read = function (stream) {
        var out = [];
        for (var n = 0; n < this.count; n++) {
            out.push(this.elementType.read(stream));
        }
        return out;
    };
    StructArray.prototype.write = function (stream, value) {
        for (var n = 0; n < this.count; n++)
            this.elementType.write(stream, value[n]);
    };
    Object.defineProperty(StructArray.prototype, "length", {
        get: function () {
            return this.elementType.length * this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructArray;
})();

var StructStringn = (function () {
    function StructStringn(count) {
        this.count = count;
    }
    StructStringn.prototype.read = function (stream) {
        var out = '';
        for (var n = 0; n < this.count; n++) {
            out += String.fromCharCode(stream.readUInt8());
        }
        return out;
    };
    StructStringn.prototype.write = function (stream, value) {
        throw ("Not implemented StructStringn.write");
    };
    Object.defineProperty(StructStringn.prototype, "length", {
        get: function () {
            return this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringn;
})();

var StructStringz = (function () {
    function StructStringz(count) {
        this.count = count;
        this.stringn = new StructStringn(count);
    }
    StructStringz.prototype.read = function (stream) {
        return this.stringn.read(stream).split(String.fromCharCode(0))[0];
    };
    StructStringz.prototype.write = function (stream, value) {
        var items = value.split('').map(function (char) {
            return char.charCodeAt(0);
        });
        while (items.length < this.count)
            items.push(0);
        for (var n = 0; n < items.length; n++)
            stream.writeUInt8(items[n]);
    };
    Object.defineProperty(StructStringz.prototype, "length", {
        get: function () {
            return this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringz;
})();

var Int16 = new Int16Type(0 /* LITTLE */);
var Int32 = new Int32Type(0 /* LITTLE */);
var Int64 = new Int64Type(0 /* LITTLE */);
var Int8 = new Int8Type(0 /* LITTLE */);

var UInt16 = new UInt16Type(0 /* LITTLE */);
var UInt32 = new UInt32Type(0 /* LITTLE */);
var UInt8 = new UInt8Type(0 /* LITTLE */);

var UInt16_b = new UInt16Type(1 /* BIG */);
var UInt32_b = new UInt32Type(1 /* BIG */);

var UInt32_2lbStruct = (function () {
    function UInt32_2lbStruct() {
    }
    UInt32_2lbStruct.prototype.read = function (stream) {
        var l = stream.readUInt32(0 /* LITTLE */);
        var b = stream.readUInt32(1 /* BIG */);
        return l;
    };
    UInt32_2lbStruct.prototype.write = function (stream, value) {
        stream.writeUInt32(value, 0 /* LITTLE */);
        stream.writeUInt32(value, 1 /* BIG */);
    };
    Object.defineProperty(UInt32_2lbStruct.prototype, "length", {
        get: function () {
            return 8;
        },
        enumerable: true,
        configurable: true
    });
    return UInt32_2lbStruct;
})();

var UInt16_2lbStruct = (function () {
    function UInt16_2lbStruct() {
    }
    UInt16_2lbStruct.prototype.read = function (stream) {
        var l = stream.readUInt16(0 /* LITTLE */);
        var b = stream.readUInt16(1 /* BIG */);
        return l;
    };
    UInt16_2lbStruct.prototype.write = function (stream, value) {
        stream.writeUInt16(value, 0 /* LITTLE */);
        stream.writeUInt16(value, 1 /* BIG */);
    };
    Object.defineProperty(UInt16_2lbStruct.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return UInt16_2lbStruct;
})();

var UInt32_2lb = new UInt32_2lbStruct();

var UInt16_2lb = new UInt16_2lbStruct();

function Stringn(count) {
    return new StructStringn(count);
}
function Stringz(count) {
    return new StructStringz(count);
}

var SortedSet = (function () {
    function SortedSet() {
        this.elements = [];
    }
    SortedSet.prototype.has = function (element) {
        return this.elements.indexOf(element) >= 0;
    };

    SortedSet.prototype.add = function (element) {
        if (!this.has(element))
            this.elements.push(element);
        return element;
    };

    Object.defineProperty(SortedSet.prototype, "length", {
        get: function () {
            return this.elements.length;
        },
        enumerable: true,
        configurable: true
    });

    SortedSet.prototype.delete = function (element) {
        this.elements.remove(element);
    };

    SortedSet.prototype.filter = function (callback) {
        return this.elements.filter(callback);
    };

    SortedSet.prototype.forEach = function (callback) {
        this.elements.slice(0).forEach(callback);
    };
    return SortedSet;
})();

var DSet = (function (_super) {
    __extends(DSet, _super);
    function DSet() {
        _super.apply(this, arguments);
    }
    return DSet;
})(SortedSet);

var UidCollection = (function () {
    function UidCollection(lastId) {
        if (typeof lastId === "undefined") { lastId = 1; }
        this.lastId = lastId;
        this.items = {};
    }
    UidCollection.prototype.allocate = function (item) {
        var id = this.lastId++;
        this.items[id] = item;
        return id;
    };

    UidCollection.prototype.get = function (id) {
        return this.items[id];
    };

    UidCollection.prototype.remove = function (id) {
        delete this.items[id];
    };
    return UidCollection;
})();

var Signal = (function () {
    function Signal() {
        this.callbacks = new SortedSet();
    }
    Signal.prototype.add = function (callback) {
        this.callbacks.add(callback);
    };

    Signal.prototype.remove = function (callback) {
        this.callbacks.delete(callback);
    };

    Signal.prototype.once = function (callback) {
        var _this = this;
        var once = function () {
            _this.remove(once);
            callback();
        };
        this.add(once);
    };

    Signal.prototype.dispatch = function () {
        this.callbacks.forEach(function (callback) {
            callback();
        });
    };
    return Signal;
})();

var BitUtils = (function () {
    function BitUtils() {
    }
    BitUtils.mask = function (value) {
        return (1 << value) - 1;
    };

    BitUtils.bitrev32 = function (v) {
        v = ((v >>> 1) & 0x55555555) | ((v & 0x55555555) << 1); // swap odd and even bits
        v = ((v >>> 2) & 0x33333333) | ((v & 0x33333333) << 2); // swap consecutive pairs
        v = ((v >>> 4) & 0x0F0F0F0F) | ((v & 0x0F0F0F0F) << 4); // swap nibbles ...
        v = ((v >>> 8) & 0x00FF00FF) | ((v & 0x00FF00FF) << 8); // swap bytes
        v = ((v >>> 16) & 0x0000FFFF) | ((v & 0x0000FFFF) << 16); // swap 2-byte long pairs
        return v;
    };

    BitUtils.rotr = function (value, offset) {
        return (value >>> offset) | (value << (32 - offset));
    };

    BitUtils.clo = function (x) {
        var ret = 0;
        while ((x & 0x80000000) != 0) {
            x <<= 1;
            ret++;
        }
        return ret;
    };

    BitUtils.clz = function (x) {
        return BitUtils.clo(~x);
    };

    BitUtils.seb = function (x) {
        x = x & 0xFF;
        if (x & 0x80)
            x = 0xFFFFFF00 | x;
        return x;
    };

    BitUtils.seh = function (x) {
        x = x & 0xFFFF;
        if (x & 0x8000)
            x = 0xFFFF0000 | x;
        return x;
    };

    BitUtils.wsbh = function (v) {
        return ((v & 0xFF00FF00) >>> 8) | ((v & 0x00FF00FF) << 8);
    };

    BitUtils.wsbw = function (v) {
        return (((v & 0xFF000000) >>> 24) | ((v & 0x00FF0000) >>> 8) | ((v & 0x0000FF00) << 8) | ((v & 0x000000FF) << 24));
    };

    BitUtils.extract = function (data, offset, length) {
        return (data >>> offset) & BitUtils.mask(length);
    };

    BitUtils.extractScale = function (data, offset, length, scale) {
        var mask = BitUtils.mask(length);
        return (((data >>> offset) & mask) * scale / mask) | 0;
    };

    BitUtils.extractEnum = function (data, offset, length) {
        return this.extract(data, offset, length);
    };

    BitUtils.clear = function (data, offset, length) {
        data &= ~(BitUtils.mask(length) << offset);
        return data;
    };

    BitUtils.insert = function (data, offset, length, value) {
        value &= BitUtils.mask(length);
        data = BitUtils.clear(data, offset, length);
        data |= value << offset;
        return data;
    };
    return BitUtils;
})();

var MathFloat = (function () {
    function MathFloat() {
    }
    MathFloat.reinterpretFloatAsInt = function (floatValue) {
        MathFloat.floatArray[0] = floatValue;
        return MathFloat.intArray[0];
    };

    MathFloat.reinterpretIntAsFloat = function (integerValue) {
        MathFloat.intArray[0] = integerValue;
        return MathFloat.floatArray[0];
    };

    MathFloat.round = function (value) {
        return Math.round(value);
    };

    MathFloat.rint = function (value) {
        return Math.round(value);
    };

    MathFloat.cast = function (value) {
        return (value < 0) ? Math.ceil(value) : Math.floor(value);
    };

    MathFloat.floor = function (value) {
        return Math.floor(value);
    };

    MathFloat.ceil = function (value) {
        return Math.ceil(value);
    };
    MathFloat.floatArray = new Float32Array(1);
    MathFloat.intArray = new Int32Array(MathFloat.floatArray.buffer);
    return MathFloat;
})();

function compare(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return +1;
    return 0;
}

function identity(a) {
    return a;
}

Array.prototype.max = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    return array.reduce(function (previous, current) {
        return Math.max(previous, selector(current));
    }, selector(array[0]));
});

Array.prototype.sortBy = function (selector) {
    return this.slice(0).sort(function (a, b) {
        return compare(selector(a), selector(b));
    });
};

Array.prototype.first = (function (selector) {
    var array = this;
    if (!selector)
        selector = identity;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            return array[n];
    return undefined;
});

Array.prototype.sum = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    return array.reduce(function (previous, current) {
        return previous + selector(current);
    }, 0);
});

Array.prototype.remove = function (item) {
    var array = this;
    var index = array.indexOf(item);
    if (index >= 0)
        array.splice(index, 1);
};

String.prototype.rstrip = function () {
    var string = this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function (value) {
    var string = this;
    return string.indexOf(value) >= 0;
};

function setImmediate(callback) {
    setTimeout(callback, 0);
}

var MathUtils = (function () {
    function MathUtils() {
    }
    MathUtils.prevAligned = function (value, alignment) {
        return Math.floor(value / alignment) * alignment;
    };

    MathUtils.nextAligned = function (value, alignment) {
        if (alignment <= 1)
            return value;
        if ((value % alignment) == 0)
            return value;
        return value + (alignment - (value % alignment));
    };
    return MathUtils;
})();

var Utf8 = (function () {
    function Utf8() {
    }
    Utf8.decode = function (input) {
        return decodeURIComponent(escape(input));
    };

    Utf8.encode = function (input) {
        return unescape(encodeURIComponent(input));
    };
    return Utf8;
})();

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (begin, end) {
        var that = new Uint8Array(this);
        if (end == undefined)
            end = that.length;
        var result = new ArrayBuffer(end - begin);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++)
            resultArray[i] = that[i + begin];
        return result;
    };
}

window['AudioContext'] = window['AudioContext'] || window['webkitAudioContext'];

var ArrayBufferUtils = (function () {
    function ArrayBufferUtils() {
    }
    ArrayBufferUtils.fromUInt8Array = function (input) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    };

    ArrayBufferUtils.concat = function (chunks) {
        var tmp = new Uint8Array(chunks.sum(function (chunk) {
            return chunk.byteLength;
        }));
        var offset = 0;
        chunks.forEach(function (chunk) {
            tmp.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        });
        return tmp.buffer;
    };
    return ArrayBufferUtils;
})();

var PromiseUtils = (function () {
    function PromiseUtils() {
    }
    PromiseUtils.sequence = function (generators) {
        return new Promise(function (resolve, reject) {
            generators = generators.slice(0);
            function step() {
                if (generators.length > 0) {
                    var generator = generators.shift();
                    var promise = generator();
                    promise.then(step);
                } else {
                    resolve();
                }
            }
            step();
        });
    };

    PromiseUtils.delayAsync = function (ms) {
        return new Promise(function (resolve, reject) {
            return setTimeout(resolve, ms);
        });
    };
    return PromiseUtils;
})();

window['requestFileSystem'] = window['requestFileSystem'] || window['webkitRequestFileSystem'];
///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var PspAudioBuffer = (function () {
        function PspAudioBuffer(readedCallback, data) {
            this.readedCallback = readedCallback;
            this.data = data;
            this.offset = 0;
        }
        PspAudioBuffer.prototype.resolve = function () {
            if (this.readedCallback)
                this.readedCallback();
            this.readedCallback = null;
        };

        Object.defineProperty(PspAudioBuffer.prototype, "hasMore", {
            get: function () {
                return this.offset < this.length;
            },
            enumerable: true,
            configurable: true
        });

        PspAudioBuffer.prototype.read = function () {
            return this.data[this.offset++];
        };

        Object.defineProperty(PspAudioBuffer.prototype, "available", {
            get: function () {
                return this.length - this.offset;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PspAudioBuffer.prototype, "length", {
            get: function () {
                return this.data.length;
            },
            enumerable: true,
            configurable: true
        });
        return PspAudioBuffer;
    })();
    core.PspAudioBuffer = PspAudioBuffer;

    var PspAudioChannel = (function () {
        function PspAudioChannel(audio, context) {
            var _this = this;
            this.audio = audio;
            this.context = context;
            this.buffers = [];
            if (this.context) {
                this.node = this.context.createScriptProcessor(1024, 2, 2);
                this.node.onaudioprocess = function (e) {
                    _this.process(e);
                };
            }
        }
        PspAudioChannel.prototype.start = function () {
            if (this.node)
                this.node.connect(this.context.destination);
            this.audio.playingChannels.add(this);
        };

        PspAudioChannel.prototype.stop = function () {
            if (this.node)
                this.node.disconnect();
            this.audio.playingChannels.delete(this);
        };

        PspAudioChannel.prototype.process = function (e) {
            var left = e.outputBuffer.getChannelData(0);
            var right = e.outputBuffer.getChannelData(1);
            var sampleCount = left.length;

            for (var n = 0; n < sampleCount; n++) {
                if (!this.currentBuffer) {
                    if (this.buffers.length == 0)
                        break;

                    this.currentBuffer = this.buffers.shift();
                    this.currentBuffer.resolve();
                }

                if (this.currentBuffer.available >= 2) {
                    left[n] = this.currentBuffer.read();
                    right[n] = this.currentBuffer.read();
                } else {
                    this.currentBuffer = null;
                }
            }
        };

        PspAudioChannel.prototype.playAsync = function (data) {
            var _this = this;
            return new Promise(function (resolved, rejected) {
                if (_this.node) {
                    _this.buffers.push(new PspAudioBuffer(resolved, data));
                } else {
                    resolved();
                }
            });
        };
        return PspAudioChannel;
    })();
    core.PspAudioChannel = PspAudioChannel;

    var PspAudio = (function () {
        function PspAudio() {
            this.playingChannels = new SortedSet();
            try  {
                this.context = new AudioContext();
            } catch (e) {
            }
        }
        PspAudio.prototype.createChannel = function () {
            return new PspAudioChannel(this, this.context);
        };

        PspAudio.convertS16ToF32 = function (input) {
            var output = new Float32Array(input.length);
            for (var n = 0; n < output.length; n++)
                output[n] = input[n] / 32767.0;
            return output;
        };

        PspAudio.prototype.startAsync = function () {
            return Promise.resolve();
        };

        PspAudio.prototype.stopAsync = function () {
            this.playingChannels.forEach(function (channel) {
                channel.stop();
            });
            return Promise.resolve();
        };
        return PspAudio;
    })();
    core.PspAudio = PspAudio;
})(core || (core = {}));
///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var SceCtrlData = (function () {
        function SceCtrlData() {
            this.timeStamp = 0;
            this.buttons = 0 /* none */;
            this.lx = 0;
            this.ly = 0;
            this._rsrv = [0, 0, 0, 0, 0];
            this.x = 0;
            this.y = 0;
        }
        Object.defineProperty(SceCtrlData.prototype, "x", {
            get: function () {
                return ((this.lx / 255.0) - 0.5) * 2.0;
            },
            set: function (value) {
                this.lx = (((value / 2.0) + 0.5) * 255.0);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SceCtrlData.prototype, "y", {
            get: function () {
                return ((this.ly / 255.0) - 0.5) * 2.0;
            },
            set: function (value) {
                this.ly = (((value / 2.0) + 0.5) * 255.0);
            },
            enumerable: true,
            configurable: true
        });


        SceCtrlData.struct = StructClass.create(SceCtrlData, [
            { type: UInt32, name: 'timeStamp' },
            { type: UInt32, name: 'buttons' },
            { type: Int8, name: 'lx' },
            { type: Int8, name: 'ly' },
            { type: StructArray.create(Int8, 6), name: '_rsrv' }
        ]);
        return SceCtrlData;
    })();
    core.SceCtrlData = SceCtrlData;

    var PspController = (function () {
        function PspController() {
            this.data = new SceCtrlData();
            this.buttonMapping = {};
            this.buttonMapping = {};
            this.buttonMapping[38 /* up */] = 16 /* up */;
            this.buttonMapping[37 /* left */] = 128 /* left */;
            this.buttonMapping[39 /* right */] = 32 /* right */;
            this.buttonMapping[40 /* down */] = 64 /* down */;
            this.buttonMapping[13 /* enter */] = 8 /* start */;
            this.buttonMapping[32 /* space */] = 1 /* select */;
            this.buttonMapping[81 /* q */] = 256 /* leftTrigger */;
            this.buttonMapping[69 /* e */] = 512 /* rightTrigger */;
            this.buttonMapping[87 /* w */] = 4096 /* triangle */;
            this.buttonMapping[83 /* s */] = 16384 /* cross */;
            this.buttonMapping[65 /* a */] = 32768 /* square */;
            this.buttonMapping[68 /* d */] = 8192 /* circle */;
            //this.buttonMapping[KeyCodes.Down] = PspCtrlButtons.Down;
        }
        PspController.prototype.keyDown = function (e) {
            //console.log(e.keyCode);
            var button = this.buttonMapping[e.keyCode];
            if (button !== undefined) {
                this.data.buttons |= button;
            }
        };

        PspController.prototype.keyUp = function (e) {
            var button = this.buttonMapping[e.keyCode];
            if (button !== undefined) {
                this.data.buttons &= ~button;
            }
        };

        PspController.prototype.simulateButtonDown = function (button) {
            this.data.buttons |= button;
        };

        PspController.prototype.simulateButtonUp = function (button) {
            this.data.buttons &= ~button;
        };

        PspController.prototype.simulateButtonPress = function (button) {
            var _this = this;
            this.simulateButtonDown(button);
            setTimeout(function () {
                _this.simulateButtonUp(button);
            }, 60);
        };

        PspController.prototype.startAsync = function () {
            var _this = this;
            document.addEventListener('keydown', function (e) {
                return _this.keyDown(e);
            });
            document.addEventListener('keyup', function (e) {
                return _this.keyUp(e);
            });
            return Promise.resolve();
        };

        PspController.prototype.stopAsync = function () {
            document.removeEventListener('keydown', this.keyDown);
            document.removeEventListener('keyup', this.keyUp);
            return Promise.resolve();
        };
        return PspController;
    })();
    core.PspController = PspController;

    (function (PspCtrlButtons) {
        PspCtrlButtons[PspCtrlButtons["none"] = 0x0000000] = "none";
        PspCtrlButtons[PspCtrlButtons["select"] = 0x0000001] = "select";
        PspCtrlButtons[PspCtrlButtons["start"] = 0x0000008] = "start";
        PspCtrlButtons[PspCtrlButtons["up"] = 0x0000010] = "up";
        PspCtrlButtons[PspCtrlButtons["right"] = 0x0000020] = "right";
        PspCtrlButtons[PspCtrlButtons["down"] = 0x0000040] = "down";
        PspCtrlButtons[PspCtrlButtons["left"] = 0x0000080] = "left";
        PspCtrlButtons[PspCtrlButtons["leftTrigger"] = 0x0000100] = "leftTrigger";
        PspCtrlButtons[PspCtrlButtons["rightTrigger"] = 0x0000200] = "rightTrigger";
        PspCtrlButtons[PspCtrlButtons["triangle"] = 0x0001000] = "triangle";
        PspCtrlButtons[PspCtrlButtons["circle"] = 0x0002000] = "circle";
        PspCtrlButtons[PspCtrlButtons["cross"] = 0x0004000] = "cross";
        PspCtrlButtons[PspCtrlButtons["square"] = 0x0008000] = "square";
        PspCtrlButtons[PspCtrlButtons["home"] = 0x0010000] = "home";
        PspCtrlButtons[PspCtrlButtons["hold"] = 0x0020000] = "hold";
        PspCtrlButtons[PspCtrlButtons["wirelessLanUp"] = 0x0040000] = "wirelessLanUp";
        PspCtrlButtons[PspCtrlButtons["remote"] = 0x0080000] = "remote";
        PspCtrlButtons[PspCtrlButtons["volumeUp"] = 0x0100000] = "volumeUp";
        PspCtrlButtons[PspCtrlButtons["volumeDown"] = 0x0200000] = "volumeDown";
        PspCtrlButtons[PspCtrlButtons["screen"] = 0x0400000] = "screen";
        PspCtrlButtons[PspCtrlButtons["note"] = 0x0800000] = "note";
        PspCtrlButtons[PspCtrlButtons["discPresent"] = 0x1000000] = "discPresent";
        PspCtrlButtons[PspCtrlButtons["memoryStickPresent"] = 0x2000000] = "memoryStickPresent";
    })(core.PspCtrlButtons || (core.PspCtrlButtons = {}));
    var PspCtrlButtons = core.PspCtrlButtons;

    (function (HtmlKeyCodes) {
        HtmlKeyCodes[HtmlKeyCodes["backspace"] = 8] = "backspace";
        HtmlKeyCodes[HtmlKeyCodes["tab"] = 9] = "tab";
        HtmlKeyCodes[HtmlKeyCodes["enter"] = 13] = "enter";
        HtmlKeyCodes[HtmlKeyCodes["shift"] = 16] = "shift";
        HtmlKeyCodes[HtmlKeyCodes["ctrl"] = 17] = "ctrl";
        HtmlKeyCodes[HtmlKeyCodes["alt"] = 18] = "alt";
        HtmlKeyCodes[HtmlKeyCodes["pause"] = 19] = "pause";
        HtmlKeyCodes[HtmlKeyCodes["caps_lock"] = 20] = "caps_lock";
        HtmlKeyCodes[HtmlKeyCodes["escape"] = 27] = "escape";
        HtmlKeyCodes[HtmlKeyCodes["space"] = 32] = "space";
        HtmlKeyCodes[HtmlKeyCodes["page_up"] = 33] = "page_up";
        HtmlKeyCodes[HtmlKeyCodes["page_down"] = 34] = "page_down";
        HtmlKeyCodes[HtmlKeyCodes["end"] = 35] = "end";
        HtmlKeyCodes[HtmlKeyCodes["home"] = 36] = "home";
        HtmlKeyCodes[HtmlKeyCodes["left"] = 37] = "left";
        HtmlKeyCodes[HtmlKeyCodes["up"] = 38] = "up";
        HtmlKeyCodes[HtmlKeyCodes["right"] = 39] = "right";
        HtmlKeyCodes[HtmlKeyCodes["down"] = 40] = "down";
        HtmlKeyCodes[HtmlKeyCodes["insert"] = 45] = "insert";
        HtmlKeyCodes[HtmlKeyCodes["delete"] = 46] = "delete";
        HtmlKeyCodes[HtmlKeyCodes["k0"] = 48] = "k0";
        HtmlKeyCodes[HtmlKeyCodes["k1"] = 49] = "k1";
        HtmlKeyCodes[HtmlKeyCodes["k2"] = 50] = "k2";
        HtmlKeyCodes[HtmlKeyCodes["k3"] = 51] = "k3";
        HtmlKeyCodes[HtmlKeyCodes["k4"] = 52] = "k4";
        HtmlKeyCodes[HtmlKeyCodes["k5"] = 53] = "k5";
        HtmlKeyCodes[HtmlKeyCodes["k6"] = 54] = "k6";
        HtmlKeyCodes[HtmlKeyCodes["k7"] = 55] = "k7";
        HtmlKeyCodes[HtmlKeyCodes["k8"] = 56] = "k8";
        HtmlKeyCodes[HtmlKeyCodes["k9"] = 57] = "k9";
        HtmlKeyCodes[HtmlKeyCodes["a"] = 65] = "a";
        HtmlKeyCodes[HtmlKeyCodes["b"] = 66] = "b";
        HtmlKeyCodes[HtmlKeyCodes["c"] = 67] = "c";
        HtmlKeyCodes[HtmlKeyCodes["d"] = 68] = "d";
        HtmlKeyCodes[HtmlKeyCodes["e"] = 69] = "e";
        HtmlKeyCodes[HtmlKeyCodes["f"] = 70] = "f";
        HtmlKeyCodes[HtmlKeyCodes["g"] = 71] = "g";
        HtmlKeyCodes[HtmlKeyCodes["h"] = 72] = "h";
        HtmlKeyCodes[HtmlKeyCodes["i"] = 73] = "i";
        HtmlKeyCodes[HtmlKeyCodes["j"] = 74] = "j";
        HtmlKeyCodes[HtmlKeyCodes["k"] = 75] = "k";
        HtmlKeyCodes[HtmlKeyCodes["l"] = 76] = "l";
        HtmlKeyCodes[HtmlKeyCodes["m"] = 77] = "m";
        HtmlKeyCodes[HtmlKeyCodes["n"] = 78] = "n";
        HtmlKeyCodes[HtmlKeyCodes["o"] = 79] = "o";
        HtmlKeyCodes[HtmlKeyCodes["p"] = 80] = "p";
        HtmlKeyCodes[HtmlKeyCodes["q"] = 81] = "q";
        HtmlKeyCodes[HtmlKeyCodes["r"] = 82] = "r";
        HtmlKeyCodes[HtmlKeyCodes["s"] = 83] = "s";
        HtmlKeyCodes[HtmlKeyCodes["t"] = 84] = "t";
        HtmlKeyCodes[HtmlKeyCodes["u"] = 85] = "u";
        HtmlKeyCodes[HtmlKeyCodes["v"] = 86] = "v";
        HtmlKeyCodes[HtmlKeyCodes["w"] = 87] = "w";
        HtmlKeyCodes[HtmlKeyCodes["x"] = 88] = "x";
        HtmlKeyCodes[HtmlKeyCodes["y"] = 89] = "y";
        HtmlKeyCodes[HtmlKeyCodes["z"] = 90] = "z";
        HtmlKeyCodes[HtmlKeyCodes["left_window_key"] = 91] = "left_window_key";
        HtmlKeyCodes[HtmlKeyCodes["right_window_key"] = 92] = "right_window_key";
        HtmlKeyCodes[HtmlKeyCodes["select_key"] = 93] = "select_key";
        HtmlKeyCodes[HtmlKeyCodes["numpad_0"] = 96] = "numpad_0";
        HtmlKeyCodes[HtmlKeyCodes["numpad_1"] = 97] = "numpad_1";
        HtmlKeyCodes[HtmlKeyCodes["numpad_2"] = 98] = "numpad_2";
        HtmlKeyCodes[HtmlKeyCodes["numpad_3"] = 99] = "numpad_3";
        HtmlKeyCodes[HtmlKeyCodes["numpad_4"] = 100] = "numpad_4";
        HtmlKeyCodes[HtmlKeyCodes["numpad_5"] = 101] = "numpad_5";
        HtmlKeyCodes[HtmlKeyCodes["numpad_6"] = 102] = "numpad_6";
        HtmlKeyCodes[HtmlKeyCodes["numpad_7"] = 103] = "numpad_7";
        HtmlKeyCodes[HtmlKeyCodes["numpad_8"] = 104] = "numpad_8";
        HtmlKeyCodes[HtmlKeyCodes["numpad_9"] = 105] = "numpad_9";
        HtmlKeyCodes[HtmlKeyCodes["multiply"] = 106] = "multiply";
        HtmlKeyCodes[HtmlKeyCodes["add"] = 107] = "add";
        HtmlKeyCodes[HtmlKeyCodes["subtract"] = 109] = "subtract";
        HtmlKeyCodes[HtmlKeyCodes["decimal_point"] = 110] = "decimal_point";
        HtmlKeyCodes[HtmlKeyCodes["divide"] = 111] = "divide";
        HtmlKeyCodes[HtmlKeyCodes["f1"] = 112] = "f1";
        HtmlKeyCodes[HtmlKeyCodes["f2"] = 113] = "f2";
        HtmlKeyCodes[HtmlKeyCodes["f3"] = 114] = "f3";
        HtmlKeyCodes[HtmlKeyCodes["f4"] = 115] = "f4";
        HtmlKeyCodes[HtmlKeyCodes["f5"] = 116] = "f5";
        HtmlKeyCodes[HtmlKeyCodes["f6"] = 117] = "f6";
        HtmlKeyCodes[HtmlKeyCodes["f7"] = 118] = "f7";
        HtmlKeyCodes[HtmlKeyCodes["f8"] = 119] = "f8";
        HtmlKeyCodes[HtmlKeyCodes["f9"] = 120] = "f9";
        HtmlKeyCodes[HtmlKeyCodes["f10"] = 121] = "f10";
        HtmlKeyCodes[HtmlKeyCodes["f11"] = 122] = "f11";
        HtmlKeyCodes[HtmlKeyCodes["f12"] = 123] = "f12";
        HtmlKeyCodes[HtmlKeyCodes["num_lock"] = 144] = "num_lock";
        HtmlKeyCodes[HtmlKeyCodes["scroll_lock"] = 145] = "scroll_lock";
        HtmlKeyCodes[HtmlKeyCodes["semi_colon"] = 186] = "semi_colon";
        HtmlKeyCodes[HtmlKeyCodes["equal_sign"] = 187] = "equal_sign";
        HtmlKeyCodes[HtmlKeyCodes["comma"] = 188] = "comma";
        HtmlKeyCodes[HtmlKeyCodes["dash"] = 189] = "dash";
        HtmlKeyCodes[HtmlKeyCodes["period"] = 190] = "period";
        HtmlKeyCodes[HtmlKeyCodes["forward_slash"] = 191] = "forward_slash";
        HtmlKeyCodes[HtmlKeyCodes["grave_accent"] = 192] = "grave_accent";
        HtmlKeyCodes[HtmlKeyCodes["open_bracket"] = 219] = "open_bracket";
        HtmlKeyCodes[HtmlKeyCodes["back_slash"] = 220] = "back_slash";
        HtmlKeyCodes[HtmlKeyCodes["close_braket"] = 221] = "close_braket";
        HtmlKeyCodes[HtmlKeyCodes["single_quote"] = 222] = "single_quote";
    })(core.HtmlKeyCodes || (core.HtmlKeyCodes = {}));
    var HtmlKeyCodes = core.HtmlKeyCodes;
})(core || (core = {}));
var core;
(function (core) {
    (function (cpu) {
        var MipsAssembler = (function () {
            function MipsAssembler() {
                this.instructions = core.cpu.Instructions.instance;
            }
            MipsAssembler.prototype.assembleToMemory = function (memory, PC, lines) {
                for (var n = 0; n < lines.length; n++) {
                    var instructions = this.assemble(PC, lines[n]);
                    for (var m = 0; m < instructions.length; m++) {
                        var instruction = instructions[m];
                        memory.writeInt32(PC, instruction.data);
                        PC += 4;
                    }
                }
            };

            MipsAssembler.prototype.assemble = function (PC, line) {
                //console.log(line);
                var matches = line.match(/^\s*(\w+)(.*)$/);
                var instructionName = matches[1];
                var instructionArguments = matches[2].replace(/^\s+/, '').replace(/\s+$/, '');

                switch (instructionName) {
                    case 'li':
                        var parts = instructionArguments.split(',');

                        //console.log(parts);
                        return this.assemble(PC, 'addiu ' + parts[0] + ', r0, ' + parts[1]);
                }

                var instructionType = this.instructions.findByName(instructionName);
                var instruction = new core.cpu.Instruction(PC, instructionType.vm.value);
                var types = [];

                var formatPattern = instructionType.format.replace('(', '\\(').replace(')', '\\)').replace(/(%\w+)/g, function (type) {
                    types.push(type);

                    switch (type) {
                        case '%J':
                        case '%s':
                        case '%d':
                        case '%t':
                            return '([$r]\\d+)';
                        case '%i':
                            return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                        case '%C':
                            return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                        default:
                            throw ("MipsAssembler.Transform: Unknown type '" + type + "'");
                    }
                }).replace(/\s+/g, '\\s*');

                //console.log(formatPattern);
                var regex = new RegExp('^' + formatPattern + '$', '');

                //console.log(line);
                //console.log(formatPattern);
                var matches = instructionArguments.match(regex);

                //console.log(matches);
                //console.log(types);
                if (matches === null) {
                    throw ('Not matching ' + instructionArguments + ' : ' + regex + ' : ' + instructionType.format);
                }

                for (var n = 0; n < types.length; n++) {
                    var type = types[n];
                    var match = matches[n + 1];

                    //console.log(type + ' = ' + match);
                    this.update(instruction, type, match);
                }

                //console.log(instructionType);
                //console.log(matches);
                return [instruction];
            };

            MipsAssembler.prototype.decodeRegister = function (name) {
                //console.log(name);
                if (name.charAt(0) == '$')
                    return parseInt(name.substr(1));
                if (name.charAt(0) == 'r')
                    return parseInt(name.substr(1));
                throw ('Invalid register "' + name + '"');
            };

            MipsAssembler.prototype.decodeInteger = function (str) {
                str = str.replace(/_/g, '');
                if (str.substr(0, 2) == '0b')
                    return parseInt(str.substr(2), 2);
                if (str.substr(0, 2) == '0x')
                    return parseInt(str.substr(2), 16);
                return parseInt(str, 10);
            };

            MipsAssembler.prototype.update = function (instruction, type, value) {
                switch (type) {
                    case '%J':
                    case '%s':
                        instruction.rs = this.decodeRegister(value);
                        break;
                    case '%d':
                        instruction.rd = this.decodeRegister(value);
                        break;
                    case '%t':
                        instruction.rt = this.decodeRegister(value);
                        break;
                    case '%i':
                        instruction.imm16 = this.decodeInteger(value);
                        break;
                    case '%C':
                        instruction.syscall = this.decodeInteger(value);
                        break;
                    default:
                        throw ("MipsAssembler.Update: Unknown type '" + type + "'");
                }
            };
            return MipsAssembler;
        })();
        cpu.MipsAssembler = MipsAssembler;

        var MipsDisassembler = (function () {
            function MipsDisassembler() {
                this.instructions = core.cpu.Instructions.instance;
            }
            MipsDisassembler.prototype.encodeRegister = function (index) {
                return '$' + index;
            };

            MipsDisassembler.prototype.disassemble = function (instruction) {
                var _this = this;
                var instructionType = this.instructions.findByData(instruction.data);
                var arguments = instructionType.format.replace(/(\%\w+)/g, function (type) {
                    switch (type) {
                        case '%s':
                            return _this.encodeRegister(instruction.rs);
                            break;
                        case '%d':
                            return _this.encodeRegister(instruction.rd);
                            break;
                        case '%t':
                            return _this.encodeRegister(instruction.rt);
                            break;
                        default:
                            throw ("MipsDisassembler.Disassemble: Unknown type '" + type + "'");
                    }
                });
                return instructionType.name + ' ' + arguments;
            };
            return MipsDisassembler;
        })();
        cpu.MipsDisassembler = MipsDisassembler;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (cpu) {
        (function (_ast) {
            var ast;

            function assignGpr(index, expr) {
                return ast.assignGpr(index, expr);
            }
            function assignFpr(index, expr) {
                return ast.assignFpr(index, expr);
            }
            function assignFpr_I(index, expr) {
                return ast.assignFpr_I(index, expr);
            }
            function assignIC(expr) {
                return ast.assignIC(expr);
            }

            function fcr31_cc() {
                return ast.fcr31_cc();
            }
            function fpr(index) {
                return ast.fpr(index);
            }
            function fpr_i(index) {
                return ast.fpr_i(index);
            }
            function gpr(index) {
                return ast.gpr(index);
            }
            function immBool(value) {
                return ast.imm32(value ? 1 : 0);
            }
            function imm32(value) {
                return ast.imm32(value);
            }
            function u_imm32(value) {
                return ast.u_imm32(value);
            }
            function unop(op, right) {
                return ast.unop(op, right);
            }
            function binop(left, op, right) {
                return ast.binop(left, op, right);
            }
            function binop_i(left, op, right) {
                return ast.binop_i(left, op, right);
            }
            function _if(cond, codeTrue, codeFalse) {
                return ast._if(cond, codeTrue, codeFalse);
            }
            function call(name, exprList) {
                return ast.call(name, exprList);
            }
            function stm(expr) {
                return ast.stm(expr);
            }
            function stms(stms) {
                return ast.stms(stms);
            }
            function pc() {
                return ast.pc();
            }
            function lo() {
                return ast.lo();
            }
            function hi() {
                return ast.hi();
            }
            function ic() {
                return ast.ic();
            }
            function branchflag() {
                return ast.branchflag();
            }
            function branchpc() {
                return ast.branchpc();
            }
            function assign(ref, value) {
                return ast.assign(ref, value);
            }
            function i_simm16(i) {
                return imm32(i.imm16);
            }
            function i_uimm16(i) {
                return u_imm32(i.u_imm16);
            }
            function rs_imm16(i) {
                return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0));
            }
            function cast_uint(expr) {
                return binop(expr, '>>>', ast.imm32(0));
            }

            var InstructionAst = (function () {
                function InstructionAst() {
                    ast = new MipsAstBuilder();
                }
                InstructionAst.prototype.lui = function (i) {
                    return assignGpr(i.rt, u_imm32(i.imm16 << 16));
                };

                InstructionAst.prototype.add = function (i) {
                    return this.addu(i);
                };
                InstructionAst.prototype.addu = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt)));
                };
                InstructionAst.prototype.addi = function (i) {
                    return this.addiu(i);
                };
                InstructionAst.prototype.addiu = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16)));
                };

                InstructionAst.prototype.sub = function (i) {
                    return this.subu(i);
                };
                InstructionAst.prototype.subu = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt)));
                };

                InstructionAst.prototype.sll = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos)));
                };
                InstructionAst.prototype.srl = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos)));
                };
                InstructionAst.prototype.rotr = function (i) {
                    return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)]));
                };
                InstructionAst.prototype.rotrv = function (i) {
                    return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.rs)]));
                };

                InstructionAst.prototype.bitrev = function (i) {
                    return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)]));
                };

                InstructionAst.prototype.sra = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos)));
                };

                InstructionAst.prototype.sllv = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31))));
                };
                InstructionAst.prototype.srav = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31))));
                };
                InstructionAst.prototype.srlv = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31))));
                };

                InstructionAst.prototype.and = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '&', gpr(i.rt)));
                };
                InstructionAst.prototype.or = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '|', gpr(i.rt)));
                };
                InstructionAst.prototype.xor = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '^', gpr(i.rt)));
                };
                InstructionAst.prototype.nor = function (i) {
                    return assignGpr(i.rd, unop('~', binop(gpr(i.rs), '|', gpr(i.rt))));
                };

                InstructionAst.prototype.andi = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '&', u_imm32(i.u_imm16)));
                };
                InstructionAst.prototype.ori = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '|', u_imm32(i.u_imm16)));
                };
                InstructionAst.prototype.xori = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '^', u_imm32(i.u_imm16)));
                };

                InstructionAst.prototype.mflo = function (i) {
                    return assignGpr(i.rd, lo());
                };
                InstructionAst.prototype.mfhi = function (i) {
                    return assignGpr(i.rd, hi());
                };
                InstructionAst.prototype.mfic = function (i) {
                    return assignGpr(i.rt, ic());
                };

                InstructionAst.prototype.mtic = function (i) {
                    return assignIC(gpr(i.rt));
                };
                InstructionAst.prototype.mtlo = function (i) {
                    return assign(lo(), gpr(i.rs));
                };
                InstructionAst.prototype.mthi = function (i) {
                    return assign(hi(), gpr(i.rs));
                };

                InstructionAst.prototype.slt = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '<', gpr(i.rt)));
                };
                InstructionAst.prototype.slti = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '<', imm32(i.imm16)));
                };
                InstructionAst.prototype.sltu = function (i) {
                    return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.sltiu = function (i) {
                    return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.u_imm16)]));
                };

                InstructionAst.prototype.movz = function (i) {
                    return _if(binop(gpr(i.rt), '==', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
                };
                InstructionAst.prototype.movn = function (i) {
                    return _if(binop(gpr(i.rt), '!=', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
                };

                InstructionAst.prototype.ext = function (i) {
                    return assignGpr(i.rt, call('BitUtils.extract', [gpr(i.rs), imm32(i.pos), imm32(i.size_e)]));
                };
                InstructionAst.prototype.ins = function (i) {
                    return assignGpr(i.rt, call('BitUtils.insert', [gpr(i.rt), imm32(i.pos), imm32(i.size_i), gpr(i.rs)]));
                };

                InstructionAst.prototype.clz = function (i) {
                    return assignGpr(i.rd, call('BitUtils.clz', [gpr(i.rs)]));
                };
                InstructionAst.prototype.clo = function (i) {
                    return assignGpr(i.rd, call('BitUtils.clo', [gpr(i.rs)]));
                };
                InstructionAst.prototype.seb = function (i) {
                    return assignGpr(i.rd, call('BitUtils.seb', [gpr(i.rt)]));
                };
                InstructionAst.prototype.seh = function (i) {
                    return assignGpr(i.rd, call('BitUtils.seh', [gpr(i.rt)]));
                };

                InstructionAst.prototype.wsbh = function (i) {
                    return assignGpr(i.rd, call('BitUtils.wsbh', [gpr(i.rt)]));
                };
                InstructionAst.prototype.wsbw = function (i) {
                    return assignGpr(i.rd, call('BitUtils.wsbw', [gpr(i.rt)]));
                };

                InstructionAst.prototype._trace_state = function () {
                    return stm(ast.call('state._trace_state', []));
                };

                InstructionAst.prototype["mov.s"] = function (i) {
                    return assignFpr(i.fd, fpr(i.fs));
                };
                InstructionAst.prototype["add.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '+', fpr(i.ft)));
                };
                InstructionAst.prototype["sub.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '-', fpr(i.ft)));
                };
                InstructionAst.prototype["mul.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '*', fpr(i.ft)));
                };
                InstructionAst.prototype["div.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '/', fpr(i.ft)));
                };
                InstructionAst.prototype["abs.s"] = function (i) {
                    return assignFpr(i.fd, call('Math.abs', [fpr(i.fs)]));
                };
                InstructionAst.prototype["sqrt.s"] = function (i) {
                    return assignFpr(i.fd, call('Math.sqrt', [fpr(i.fs)]));
                };
                InstructionAst.prototype["neg.s"] = function (i) {
                    return assignFpr(i.fd, unop('-', fpr(i.fs)));
                };

                InstructionAst.prototype.min = function (i) {
                    return assignGpr(i.rd, call('state.min', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.max = function (i) {
                    return assignGpr(i.rd, call('state.max', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.div = function (i) {
                    return stm(call('state.div', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.divu = function (i) {
                    return stm(call('state.divu', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.mult = function (i) {
                    return stm(call('state.mult', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.multu = function (i) {
                    return stm(call('state.multu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.madd = function (i) {
                    return stm(call('state.madd', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.maddu = function (i) {
                    return stm(call('state.maddu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.msub = function (i) {
                    return stm(call('state.msub', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.msubu = function (i) {
                    return stm(call('state.msubu', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.syscall = function (i) {
                    return stm(call('state.syscall', [imm32(i.syscall)]));
                };
                InstructionAst.prototype.dbreak = function (i) {
                    return stm(call('state.dbreak', []));
                };

                InstructionAst.prototype._likely = function (isLikely, code) {
                    return isLikely ? _if(branchflag(), code) : code;
                };

                InstructionAst.prototype._postBranch = function (nextPc) {
                    return _if(branchflag(), stm(assign(pc(), branchpc())), stm(assign(pc(), u_imm32(nextPc))));
                };

                InstructionAst.prototype._storePC = function (_pc) {
                    return assign(pc(), u_imm32(_pc));
                };

                InstructionAst.prototype._branch = function (i, cond) {
                    return stms([
                        stm(assign(branchflag(), cond)),
                        stm(assign(branchpc(), u_imm32(i.PC + i.imm16 * 4 + 4)))
                    ]);
                };

                InstructionAst.prototype.beq = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "==", gpr(i.rt)));
                };
                InstructionAst.prototype.bne = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "!=", gpr(i.rt)));
                };
                InstructionAst.prototype.bltz = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "<", imm32(0)));
                };
                InstructionAst.prototype.blez = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "<=", imm32(0)));
                };
                InstructionAst.prototype.bgtz = function (i) {
                    return this._branch(i, binop(gpr(i.rs), ">", imm32(0)));
                };
                InstructionAst.prototype.bgez = function (i) {
                    return this._branch(i, binop(gpr(i.rs), ">=", imm32(0)));
                };

                InstructionAst.prototype.beql = function (i) {
                    return this.beq(i);
                };
                InstructionAst.prototype.bnel = function (i) {
                    return this.bne(i);
                };
                InstructionAst.prototype.bltzl = function (i) {
                    return this.bltz(i);
                };
                InstructionAst.prototype.blezl = function (i) {
                    return this.blez(i);
                };
                InstructionAst.prototype.bgtzl = function (i) {
                    return this.bgtz(i);
                };
                InstructionAst.prototype.bgezl = function (i) {
                    return this.bgez(i);
                };

                InstructionAst.prototype.bltzal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltz(i)]);
                };
                InstructionAst.prototype.bltzall = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltzl(i)]);
                };

                InstructionAst.prototype.bgezal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgez(i)]);
                };
                InstructionAst.prototype.bgezall = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgezl(i)]);
                };

                InstructionAst.prototype.bc1t = function (i) {
                    return this._branch(i, fcr31_cc());
                };
                InstructionAst.prototype.bc1f = function (i) {
                    return this._branch(i, unop("!", fcr31_cc()));
                };

                InstructionAst.prototype.bc1tl = function (i) {
                    return this.bc1t(i);
                };
                InstructionAst.prototype.bc1fl = function (i) {
                    return this.bc1f(i);
                };

                InstructionAst.prototype.sb = function (i) {
                    return stm(call('state.sb', [gpr(i.rt), rs_imm16(i)]));
                };
                InstructionAst.prototype.sh = function (i) {
                    return stm(call('state.sh', [gpr(i.rt), rs_imm16(i)]));
                };
                InstructionAst.prototype.sw = function (i) {
                    return stm(call('state.sw', [gpr(i.rt), rs_imm16(i)]));
                };

                InstructionAst.prototype.swc1 = function (i) {
                    return stm(call('state.swc1', [fpr(i.ft), rs_imm16(i)]));
                };
                InstructionAst.prototype.lwc1 = function (i) {
                    return assignFpr_I(i.ft, call('state.lw', [rs_imm16(i)]));
                };

                //public AstNodeStm mfc1() { return ast.AssignGPR(RT, ast.CallStatic((Func < float, int>) MathFloat.ReinterpretFloatAsInt, ast.FPR(FS))); }
                //public AstNodeStm mtc1() { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }
                InstructionAst.prototype.mfc1 = function (i) {
                    return assignGpr(i.rt, ast.fpr_i(i.fs));
                };
                InstructionAst.prototype.mtc1 = function (i) {
                    return assignFpr_I(i.fs, ast.gpr(i.rt));
                };

                //mtc1(i: Instruction) { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }
                //cfc1(i: Instruction) { }
                //public AstNodeStm cfc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._cfc1_impl, ast.CpuThreadState, RD, RT)); }
                //public AstNodeStm ctc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._ctc1_impl, ast.CpuThreadState, RD, RT)); }
                InstructionAst.prototype.cfc1 = function (i) {
                    return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)]));
                };
                InstructionAst.prototype.ctc1 = function (i) {
                    return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)]));
                };

                //public AstNodeStm cvt_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < CpuThreadState, float, int>) CpuEmitterUtils._cvt_w_s_impl, ast.CpuThreadState, ast.FPR(FS))); }
                //public AstNodeStm cvt_s_w() { return ast.AssignFPR_F(FD, ast.Cast<float>(ast.FPR_I(FS))); }
                //public AstNodeStm trunc_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < float, int>) MathFloat.Cast, ast.FPR(FS))); }
                InstructionAst.prototype["trunc.w.s"] = function (i) {
                    return assignFpr_I(i.fd, call('MathFloat.cast', [fpr(i.fs)]));
                };

                InstructionAst.prototype["cvt.s.w"] = function (i) {
                    return assignFpr(i.fd, fpr_i(i.fs));
                };
                InstructionAst.prototype["cvt.w.s"] = function (i) {
                    return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)]));
                };

                InstructionAst.prototype.lb = function (i) {
                    return assignGpr(i.rt, call('state.lb', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lbu = function (i) {
                    return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lw = function (i) {
                    return assignGpr(i.rt, call('state.lw', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lwl = function (i) {
                    return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
                };
                InstructionAst.prototype.lwr = function (i) {
                    return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
                };

                InstructionAst.prototype.lh = function (i) {
                    return assignGpr(i.rt, call('state.lh', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lhu = function (i) {
                    return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)]));
                };

                InstructionAst.prototype.j = function (i) {
                    return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]);
                };
                InstructionAst.prototype.jr = function (i) {
                    return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), gpr(i.rs)))]);
                };
                InstructionAst.prototype.jal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.j(i)]);
                };
                InstructionAst.prototype.jalr = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.jr(i)]);
                };

                InstructionAst.prototype._comp = function (i, fc02, fc3) {
                    //throw("Not implemented _comp");
                    var fc_unordererd = ((fc02 & 1) != 0);
                    var fc_equal = ((fc02 & 2) != 0);
                    var fc_less = ((fc02 & 4) != 0);
                    var fc_inv_qnan = (fc3 != 0);

                    return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));
                };

                InstructionAst.prototype["c.f.s"] = function (i) {
                    return this._comp(i, 0, 0);
                };
                InstructionAst.prototype["c.un.s"] = function (i) {
                    return this._comp(i, 1, 0);
                };
                InstructionAst.prototype["c.eq.s"] = function (i) {
                    return this._comp(i, 2, 0);
                };
                InstructionAst.prototype["c.ueq.s"] = function (i) {
                    return this._comp(i, 3, 0);
                };
                InstructionAst.prototype["c.olt.s"] = function (i) {
                    return this._comp(i, 4, 0);
                };
                InstructionAst.prototype["c.ult.s"] = function (i) {
                    return this._comp(i, 5, 0);
                };
                InstructionAst.prototype["c.ole.s"] = function (i) {
                    return this._comp(i, 6, 0);
                };
                InstructionAst.prototype["c.ule.s"] = function (i) {
                    return this._comp(i, 7, 0);
                };

                InstructionAst.prototype["c.sf.s"] = function (i) {
                    return this._comp(i, 0, 1);
                };
                InstructionAst.prototype["c.ngle.s"] = function (i) {
                    return this._comp(i, 1, 1);
                };
                InstructionAst.prototype["c.seq.s"] = function (i) {
                    return this._comp(i, 2, 1);
                };
                InstructionAst.prototype["c.ngl.s"] = function (i) {
                    return this._comp(i, 3, 1);
                };
                InstructionAst.prototype["c.lt.s"] = function (i) {
                    return this._comp(i, 4, 1);
                };
                InstructionAst.prototype["c.nge.s"] = function (i) {
                    return this._comp(i, 5, 1);
                };
                InstructionAst.prototype["c.le.s"] = function (i) {
                    return this._comp(i, 6, 1);
                };
                InstructionAst.prototype["c.ngt.s"] = function (i) {
                    return this._comp(i, 7, 1);
                };

                InstructionAst.prototype["break"] = function (i) {
                    return assignGpr(i.rt, call('state.break', []));
                };
                return InstructionAst;
            })();
            _ast.InstructionAst = InstructionAst;
        })(cpu.ast || (cpu.ast = {}));
        var ast = cpu.ast;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (cpu) {
        var ADDR_TYPE_NONE = 0;
        var ADDR_TYPE_REG = 1;
        var ADDR_TYPE_16 = 2;
        var ADDR_TYPE_26 = 3;
        var INSTR_TYPE_PSP = (1 << 0);
        var INSTR_TYPE_SYSCALL = (1 << 1);
        var INSTR_TYPE_B = (1 << 2);
        var INSTR_TYPE_LIKELY = (1 << 3);
        var INSTR_TYPE_JAL = (1 << 4);
        var INSTR_TYPE_JUMP = (1 << 5);
        var INSTR_TYPE_BREAK = (1 << 6);

        function VM(format) {
            var counts = {
                "cstw": 1, "cstz": 1, "csty": 1, "cstx": 1,
                "absw": 1, "absz": 1, "absy": 1, "absx": 1,
                "mskw": 1, "mskz": 1, "msky": 1, "mskx": 1,
                "negw": 1, "negz": 1, "negy": 1, "negx": 1,
                "one": 1, "two": 1, "vt1": 1,
                "vt2": 2,
                "satw": 2, "satz": 2, "saty": 2, "satx": 2,
                "swzw": 2, "swzz": 2, "swzy": 2, "swzx": 2,
                "imm3": 3,
                "imm4": 4,
                "fcond": 4,
                "c0dr": 5, "c0cr": 5, "c1dr": 5, "c1cr": 5, "imm5": 5, "vt5": 5,
                "rs": 5, "rd": 5, "rt": 5, "sa": 5, "lsb": 5, "msb": 5, "fs": 5, "fd": 5, "ft": 5,
                "vs": 7, "vt": 7, "vd": 7, "imm7": 7,
                "imm8": 8,
                "imm14": 14,
                "imm16": 16,
                "imm20": 20,
                "imm26": 26
            };

            var value = 0;
            var mask = 0;

            format.split(':').forEach(function (item) {
                // normal chunk
                if (/^[01\-]+$/.test(item)) {
                    for (var n = 0; n < item.length; n++) {
                        value <<= 1;
                        mask <<= 1;
                        if (item[n] == '0') {
                            value |= 0;
                            mask |= 1;
                        }
                        if (item[n] == '1') {
                            value |= 1;
                            mask |= 1;
                        }
                        if (item[n] == '-') {
                            value |= 0;
                            mask |= 0;
                        }
                    }
                } else {
                    var displacement = counts[item];
                    if (displacement === undefined)
                        throw ("Invalid item '" + item + "'");
                    value <<= displacement;
                    mask <<= displacement;
                }
            });

            return { value: value, mask: mask };
        }

        var InstructionType = (function () {
            function InstructionType(name, vm, format, addressType, instructionType) {
                this.name = name;
                this.vm = vm;
                this.format = format;
                this.addressType = addressType;
                this.instructionType = instructionType;
            }
            InstructionType.prototype.match = function (i32) {
                //printf("%08X | %08X | %08X", i32, this.vm.value, this.vm.mask);
                return (i32 & this.vm.mask) == (this.vm.value & this.vm.mask);
            };

            InstructionType.prototype.isInstructionType = function (mask) {
                return (this.instructionType & mask) != 0;
            };

            Object.defineProperty(InstructionType.prototype, "isSyscall", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_SYSCALL);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "isBreak", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_BREAK);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "hasDelayedBranch", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_B) || this.isInstructionType(INSTR_TYPE_JAL) || this.isInstructionType(INSTR_TYPE_JUMP);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "isLikely", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_LIKELY);
                },
                enumerable: true,
                configurable: true
            });

            InstructionType.prototype.toString = function () {
                return sprintf("InstructionType('%s', %08X, %08X)", this.name, this.vm.value, this.vm.mask);
            };
            return InstructionType;
        })();
        cpu.InstructionType = InstructionType;

        var Instructions = (function () {
            function Instructions() {
                var _this = this;
                this.instructionTypeListByName = {};
                this.instructionTypeList = [];
                var ID = function (name, vm, format, addressType, instructionType) {
                    _this.add(name, vm, format, addressType, instructionType);
                };

                // Arithmetic operations.
                ID("add", VM("000000:rs:rt:rd:00000:100000"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("addu", VM("000000:rs:rt:rd:00000:100001"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("addi", VM("001000:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("addiu", VM("001001:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("sub", VM("000000:rs:rt:rd:00000:100010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("subu", VM("000000:rs:rt:rd:00000:100011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);

                // Logical Operations.
                ID("and", VM("000000:rs:rt:rd:00000:100100"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("andi", VM("001100:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
                ID("nor", VM("000000:rs:rt:rd:00000:100111"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("or", VM("000000:rs:rt:rd:00000:100101"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("ori", VM("001101:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
                ID("xor", VM("000000:rs:rt:rd:00000:100110"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("xori", VM("001110:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);

                // Shift Left/Right Logical/Arithmethic (Variable).
                ID("sll", VM("000000:00000:rt:rd:sa:000000"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("sllv", VM("000000:rs:rt:rd:00000:000100"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("sra", VM("000000:00000:rt:rd:sa:000011"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("srav", VM("000000:rs:rt:rd:00000:000111"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("srl", VM("000000:00000:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("srlv", VM("000000:rs:rt:rd:00000:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("rotr", VM("000000:00001:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("rotrv", VM("000000:rs:rt:rd:00001:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);

                // Set Less Than (Immediate) (Unsigned).
                ID("slt", VM("000000:rs:rt:rd:00000:101010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("slti", VM("001010:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("sltu", VM("000000:rs:rt:rd:00000:101011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("sltiu", VM("001011:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);

                // Load Upper Immediate.
                ID("lui", VM("001111:00000:rt:imm16"), "%t, %I", ADDR_TYPE_NONE, 0);

                // Sign Extend Byte/Half word.
                ID("seb", VM("011111:00000:rt:rd:10000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);
                ID("seh", VM("011111:00000:rt:rd:11000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);

                // BIT REVerse.
                ID("bitrev", VM("011111:00000:rt:rd:10100:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // MAXimum/MINimum.
                ID("max", VM("000000:rs:rt:rd:00000:101100"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("min", VM("000000:rs:rt:rd:00000:101101"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // DIVide (Unsigned).
                ID("div", VM("000000:rs:rt:00000:00000:011010"), "%s, %t", ADDR_TYPE_NONE, 0);
                ID("divu", VM("000000:rs:rt:00000:00000:011011"), "%s, %t", ADDR_TYPE_NONE, 0);

                // MULTiply (Unsigned).
                ID("mult", VM("000000:rs:rt:00000:00000:011000"), "%s, %t", ADDR_TYPE_NONE, 0);
                ID("multu", VM("000000:rs:rt:00000:00000:011001"), "%s, %t", ADDR_TYPE_NONE, 0);

                // Multiply ADD/SUBstract (Unsigned).
                ID("madd", VM("000000:rs:rt:00000:00000:011100"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("maddu", VM("000000:rs:rt:00000:00000:011101"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("msub", VM("000000:rs:rt:00000:00000:101110"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("msubu", VM("000000:rs:rt:00000:00000:101111"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Move To/From HI/LO.
                ID("mfhi", VM("000000:00000:00000:rd:00000:010000"), "%d", ADDR_TYPE_NONE, 0);
                ID("mflo", VM("000000:00000:00000:rd:00000:010010"), "%d", ADDR_TYPE_NONE, 0);
                ID("mthi", VM("000000:rs:00000:00000:00000:010001"), "%s", ADDR_TYPE_NONE, 0);
                ID("mtlo", VM("000000:rs:00000:00000:00000:010011"), "%s", ADDR_TYPE_NONE, 0);

                // Move if Zero/Non zero.
                ID("movz", VM("000000:rs:rt:rd:00000:001010"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("movn", VM("000000:rs:rt:rd:00000:001011"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // EXTract/INSert.
                ID("ext", VM("011111:rs:rt:msb:lsb:000000"), "%t, %s, %a, %ne", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("ins", VM("011111:rs:rt:msb:lsb:000100"), "%t, %s, %a, %ni", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Count Leading Ones/Zeros in word.
                ID("clz", VM("000000:rs:00000:rd:00000:010110"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("clo", VM("000000:rs:00000:rd:00000:010111"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Word Swap Bytes Within Halfwords/Words.
                ID("wsbh", VM("011111:00000:rt:rd:00010:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("wsbw", VM("011111:00000:rt:rd:00011:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("beq", VM("000100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("beql", VM("010100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Greater Equal Zero (And Link) (Likely).
                ID("bgez", VM("000001:rs:00001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bgezl", VM("000001:rs:00011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bgezal", VM("000001:rs:10001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
                ID("bgezall", VM("000001:rs:10011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

                // Branch on Less Than Zero (And Link) (Likely).
                ID("bltz", VM("000001:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bltzl", VM("000001:rs:00010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bltzal", VM("000001:rs:10000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
                ID("bltzall", VM("000001:rs:10010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

                // Branch on Less Or Equals than Zero (Likely).
                ID("blez", VM("000110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("blezl", VM("010110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Great Than Zero (Likely).
                ID("bgtz", VM("000111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bgtzl", VM("010111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Not Equals (Likely).
                ID("bne", VM("000101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bnel", VM("010101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Jump (And Link) (Register).
                ID("j", VM("000010:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JUMP);
                ID("jr", VM("000000:rs:00000:00000:00000:001000"), "%J", ADDR_TYPE_REG, INSTR_TYPE_JUMP);
                ID("jalr", VM("000000:rs:00000:rd:00000:001001"), "%J, %d", ADDR_TYPE_REG, INSTR_TYPE_JAL);
                ID("jal", VM("000011:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JAL);

                // Branch on C1 False/True (Likely).
                ID("bc1f", VM("010001:01000:00000:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1t", VM("010001:01000:00001:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1fl", VM("010001:01000:00010:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1tl", VM("010001:01000:00011:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);

                ID("lb", VM("100000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lh", VM("100001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lw", VM("100011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lwl", VM("100010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lwr", VM("100110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lbu", VM("100100:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lhu", VM("100101:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

                // Store Byte/Half word/Word (Left/Right).
                ID("sb", VM("101000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("sh", VM("101001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("sw", VM("101011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swl", VM("101010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swr", VM("101110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

                // Load Linked word.
                // Store Conditional word.
                ID("ll", VM("110000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);
                ID("sc", VM("111000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);

                // Load Word to Cop1 floating point.
                // Store Word from Cop1 floating point.
                ID("lwc1", VM("110001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swc1", VM("111001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);

                // Binary Floating Point Unit Operations
                ID("add.s", VM("010001:10000:ft:fs:fd:000000"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("sub.s", VM("010001:10000:ft:fs:fd:000001"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("mul.s", VM("010001:10000:ft:fs:fd:000010"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("div.s", VM("010001:10000:ft:fs:fd:000011"), "%D, %S, %T", ADDR_TYPE_NONE, 0);

                // Unary Floating Point Unit Operations
                ID("sqrt.s", VM("010001:10000:00000:fs:fd:000100"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("abs.s", VM("010001:10000:00000:fs:fd:000101"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("mov.s", VM("010001:10000:00000:fs:fd:000110"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("neg.s", VM("010001:10000:00000:fs:fd:000111"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("round.w.s", VM("010001:10000:00000:fs:fd:001100"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("trunc.w.s", VM("010001:10000:00000:fs:fd:001101"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("ceil.w.s", VM("010001:10000:00000:fs:fd:001110"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("floor.w.s", VM("010001:10000:00000:fs:fd:001111"), "%D, %S", ADDR_TYPE_NONE, 0);

                // Convert
                ID("cvt.s.w", VM("010001:10100:00000:fs:fd:100000"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("cvt.w.s", VM("010001:10000:00000:fs:fd:100100"), "%D, %S", ADDR_TYPE_NONE, 0);

                // Move float point registers
                ID("mfc1", VM("010001:00000:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);
                ID("mtc1", VM("010001:00100:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);

                // CFC1 -- move Control word from/to floating point (C1)
                ID("cfc1", VM("010001:00010:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);
                ID("ctc1", VM("010001:00110:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);

                // Compare <condition> Single.
                ID("c.f.s", VM("010001:10000:ft:fs:00000:11:0000"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.un.s", VM("010001:10000:ft:fs:00000:11:0001"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.eq.s", VM("010001:10000:ft:fs:00000:11:0010"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ueq.s", VM("010001:10000:ft:fs:00000:11:0011"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.olt.s", VM("010001:10000:ft:fs:00000:11:0100"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ult.s", VM("010001:10000:ft:fs:00000:11:0101"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ole.s", VM("010001:10000:ft:fs:00000:11:0110"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ule.s", VM("010001:10000:ft:fs:00000:11:0111"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.sf.s", VM("010001:10000:ft:fs:00000:11:1000"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngle.s", VM("010001:10000:ft:fs:00000:11:1001"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.seq.s", VM("010001:10000:ft:fs:00000:11:1010"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngl.s", VM("010001:10000:ft:fs:00000:11:1011"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.lt.s", VM("010001:10000:ft:fs:00000:11:1100"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.nge.s", VM("010001:10000:ft:fs:00000:11:1101"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.le.s", VM("010001:10000:ft:fs:00000:11:1110"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngt.s", VM("010001:10000:ft:fs:00000:11:1111"), "%S, %T", ADDR_TYPE_NONE, 0);

                // Syscall
                ID("syscall", VM("000000:imm20:001100"), "%C", ADDR_TYPE_NONE, INSTR_TYPE_SYSCALL);

                ID("cache", VM("101111--------------------------"), "%k, %o", ADDR_TYPE_NONE, 0);
                ID("sync", VM("000000:00000:00000:00000:00000:001111"), "", ADDR_TYPE_NONE, 0);

                ID("break", VM("000000:imm20:001101"), "%c", ADDR_TYPE_NONE, 0);
                ID("dbreak", VM("011100:00000:00000:00000:00000:111111"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP | INSTR_TYPE_BREAK);
                ID("halt", VM("011100:00000:00000:00000:00000:000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // (D?/Exception) RETurn
                ID("dret", VM("011100:00000:00000:00000:00000:111110"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("eret", VM("010000:10000:00000:00000:00000:011000"), "", ADDR_TYPE_NONE, 0);

                // Move (From/To) IC
                ID("mfic", VM("011100:rt:00000:00000:00000:100100"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtic", VM("011100:rt:00000:00000:00000:100110"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Move (From/To) DR
                ID("mfdr", VM("011100:00000:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtdr", VM("011100:00100:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // C? (From/To) Cop0
                ID("cfc0", VM("010000:00010:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CFC0(010000:00010:rt:c0cr:00000:000000)
                ID("ctc0", VM("010000:00110:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CTC0(010000:00110:rt:c0cr:00000:000000)

                // Move (From/To) Cop0
                ID("mfc0", VM("010000:00000:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MFC0(010000:00000:rt:c0dr:00000:000000)
                ID("mtc0", VM("010000:00100:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MTC0(010000:00100:rt:c0dr:00000:000000)

                // Move From/to Vfpu (C?).
                ID("mfv", VM("010010:00:011:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mfvc", VM("010010:00:011:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtv", VM("010010:00:111:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtvc", VM("010010:00:111:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Load/Store Vfpu (Left/Right).
                ID("lv.s", VM("110010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lv.q", VM("110110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lvl.q", VM("110101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lvr.q", VM("110101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("sv.q", VM("111110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu DOT product
                // Vfpu SCaLe/ROTate
                ID("vdot", VM("011001:001:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vscl", VM("011001:010:vt:two:vs:one:vd"), "%zp, %yp, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsge", VM("011011:110:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                //ID("vslt",        VM("011011:100:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vslt", VM("011011:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // FIXED 2013-07-14

                // ROTate
                ID("vrot", VM("111100:111:01:imm5:two:vs:one:vd"), "%zp, %ys, %vr", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu ZERO/ONE
                ID("vzero", VM("110100:00:000:0:0110:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vone", VM("110100:00:000:0:0111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu MOVe/SiGN/Reverse SQuare root/COSine/Arc SINe/LOG2
                ID("vmov", VM("110100:00:000:0:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vabs", VM("110100:00:000:0:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vneg", VM("110100:00:000:0:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vocp", VM("110100:00:010:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsgn", VM("110100:00:010:0:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrcp", VM("110100:00:000:1:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrsq", VM("110100:00:000:1:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsin", VM("110100:00:000:1:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcos", VM("110100:00:000:1:0011:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vexp2", VM("110100:00:000:1:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vlog2", VM("110100:00:000:1:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsqrt", VM("110100:00:000:1:0110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vasin", VM("110100:00:000:1:0111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vnrcp", VM("110100:00:000:1:1000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vnsin", VM("110100:00:000:1:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrexp2", VM("110100:00:000:1:1100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsat0", VM("110100:00:000:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsat1", VM("110100:00:000:0:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu ConSTant
                ID("vcst", VM("110100:00:011:imm5:two:0000000:one:vd"), "%zp, %vk", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu Matrix MULtiplication
                ID("vmmul", VM("111100:000:vt:two:vs:one:vd"), "%zm, %tym, %xm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // -
                ID("vhdp", VM("011001:100:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcrs.t", VM("011001:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcrsp.t", VM("111100:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu Integer to(2) Color
                ID("vi2c", VM("110100:00:001:11:101:two:vs:one:vd"), "%zs, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2uc", VM("110100:00:001:11:100:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // -
                ID("vtfm2", VM("111100:001:vt:0:vs:1:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vtfm3", VM("111100:010:vt:1:vs:0:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vtfm4", VM("111100:011:vt:1:vs:1:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vhtfm2", VM("111100:001:vt:0:vs:0:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vhtfm3", VM("111100:010:vt:0:vs:1:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vhtfm4", VM("111100:011:vt:1:vs:0:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsrt3", VM("110100:00:010:01000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vfad", VM("110100:00:010:00110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu MINimum/MAXium/ADD/SUB/DIV/MUL
                ID("vmin", VM("011011:010:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmax", VM("011011:011:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vadd", VM("011000:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsub", VM("011000:001:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vdiv", VM("011000:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmul", VM("011001:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu (Matrix) IDenTity
                ID("vidt", VM("110100:00:000:0:0011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmidt", VM("111100:111:00:00011:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("viim", VM("110111:11:0:vd:imm16"), "%xs, %vi", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vmmov", VM("111100:111:00:00000:two:vs:one:vd"), "%zm, %ym", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmzero", VM("111100:111:00:00110:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmone", VM("111100:111:00:00111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vnop", VM("111111:1111111111:00000:00000000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsync", VM("111111:1111111111:00000:01100100000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vflush", VM("111111:1111111111:00000:10000001101"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vpfxd", VM("110111:10:------------:mskw:mskz:msky:mskx:satw:satz:saty:satx"), "[%vp4, %vp5, %vp6, %vp7]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vpfxs", VM("110111:00:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vpfxt", VM("110111:01:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vdet", VM("011001:110:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vrnds", VM("110100:00:001:00:000:two:vs:one:0000000"), "%ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndi", VM("110100:00:001:00:001:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndf1", VM("110100:00:001:00:010:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndf2", VM("110100:00:001:00:011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vcmp", VM("011011:000:vt:two:vs:one:000:imm4"), "%Zn, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vcmovf", VM("110100:10:101:01:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcmovt", VM("110100:10:101:00:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vavg", VM("110100:00:010:00111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2id", VM("110100:10:011:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2in", VM("110100:10:000:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2iu", VM("110100:10:010:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2iz", VM("110100:10:001:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2f", VM("110100:10:100:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vscmp", VM("011011:101:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmscl", VM("111100:100:vt:two:vs:one:vd"), "%zm, %ym, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vt4444.q", VM("110100:00:010:11001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vt5551.q", VM("110100:00:010:11010:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vt5650.q", VM("110100:00:010:11011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vmfvc", VM("110100:00:010:10000:1:imm7:0:vd"), "%zs, %2s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmtvc", VM("110100:00:010:10001:0:vs:1:imm7"), "%2d, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("mfvme", VM("011010--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);
                ID("mtvme", VM("101100--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);

                ID("sv.s", VM("111010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vfim", VM("110111:11:1:vt:imm16"), "%xs, %vh", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("svl.q", VM("111101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("svr.q", VM("111101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vbfy1", VM("110100:00:010:00010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vbfy2", VM("110100:00:010:00011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vf2h", VM("110100:00:001:10:010:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vh2f", VM("110100:00:001:10:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vi2s", VM("110100:00:001:11:111:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2us", VM("110100:00:001:11:110:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vlgb", VM("110100:00:001:10:111:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vqmul", VM("111100:101:vt:1:vs:1:vd"), "%zq, %yq, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vs2i", VM("110100:00:001:11:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Working on it.
                //"110100:00:001:11:000:1000000010000001"
                ID("vc2i", VM("110100:00:001:11:001:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vuc2i", VM("110100:00:001:11:000:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsbn", VM("011000:010:vt:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsbz", VM("110100:00:001:10110:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsocp", VM("110100:00:010:00101:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt1", VM("110100:00:010:00000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt2", VM("110100:00:010:00001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt4", VM("110100:00:010:01001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vus2i", VM("110100:00:001:11010:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vwbn", VM("110100:11:imm8:two:vs:one:vd"), "%zs, %xs, %I", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                //ID("vwb.q",       VM("111110------------------------1-"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("bvf", VM("010010:01:000:imm3:00:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
                ID("bvt", VM("010010:01:000:imm3:01:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
                ID("bvfl", VM("010010:01:000:imm3:10:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bvtl", VM("010010:01:000:imm3:11:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
            }
            Object.defineProperty(Instructions, "instance", {
                get: function () {
                    if (!Instructions._instance)
                        Instructions._instance = new Instructions();
                    return Instructions._instance;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instructions.prototype, "instructions", {
                get: function () {
                    return this.instructionTypeList.slice(0);
                },
                enumerable: true,
                configurable: true
            });

            Instructions.prototype.add = function (name, vm, format, addressType, instructionType) {
                var it = new InstructionType(name, vm, format, addressType, instructionType);
                this.instructionTypeListByName[name] = it;
                this.instructionTypeList.push(it);
            };

            Instructions.prototype.findByName = function (name) {
                var instructionType = this.instructionTypeListByName[name];
                if (!instructionType)
                    throw ("Cannot find instruction " + sprintf("%s", name));
                return instructionType;
            };

            Instructions.prototype.findByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                //return this.slowFindByData(i32, pc);
                return this.fastFindByData(i32, pc);
            };

            Instructions.prototype.fastFindByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                if (!this.decoder) {
                    var switchCode = DecodingTable.createSwitch(this.instructionTypeList);
                    this.decoder = (new Function('instructionsByName', 'value', 'pc', switchCode));
                }
                try  {
                    return this.decoder(this.instructionTypeListByName, i32, pc);
                } catch (e) {
                    console.log(this.decoder);
                    console.log(this.instructionTypeListByName);
                    console.log(this.instructionTypeList);
                    throw (e);
                }
            };

            Instructions.prototype.slowFindByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                for (var n = 0; n < this.instructionTypeList.length; n++) {
                    var instructionType = this.instructionTypeList[n];
                    if (instructionType.match(i32))
                        return instructionType;
                }
                throw (sprintf("Cannot find instruction 0x%08X at 0x%08X", i32, pc));
            };
            return Instructions;
        })();
        cpu.Instructions = Instructions;

        var DecodingTable = (function () {
            function DecodingTable() {
                this.lastId = 0;
            }
            DecodingTable.prototype.getCommonMask = function (instructions, baseMask) {
                if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
                return instructions.reduce(function (left, item) {
                    return left & item.vm.mask;
                }, baseMask);
            };

            DecodingTable.createSwitch = function (instructions) {
                var writer = new IndentStringGenerator();
                var decodingTable = new DecodingTable();
                decodingTable._createSwitch(writer, instructions);
                return writer.output;
            };

            DecodingTable.prototype._createSwitch = function (writer, instructions, baseMask, level) {
                var _this = this;
                if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
                if (typeof level === "undefined") { level = 0; }
                if (level >= 10)
                    throw ('ERROR: Recursive detection');
                var commonMask = this.getCommonMask(instructions, baseMask);
                var groups = {};
                instructions.forEach(function (item) {
                    var commonValue = item.vm.value & commonMask;
                    if (!groups[commonValue])
                        groups[commonValue] = [];
                    groups[commonValue].push(item);
                });

                writer.write('switch ((value & ' + sprintf('0x%08X', commonMask) + ') >>> 0) {\n');
                writer.indent(function () {
                    for (var groupKey in groups) {
                        var group = groups[groupKey];
                        writer.write('case ' + sprintf('0x%08X', groupKey) + ':');
                        writer.indent(function () {
                            if (group.length == 1) {
                                writer.write(' return instructionsByName[' + JSON.stringify(group[0].name) + '];');
                            } else {
                                writer.write('\n');
                                _this._createSwitch(writer, group, ~commonMask, level + 1);
                                writer.write('break;\n');
                            }
                        });
                    }
                    writer.write('default: throw(sprintf("Invalid instruction 0x%08X at 0x%08X (' + _this.lastId++ + ') failed mask 0x%08X", value, pc, ' + commonMask + '));\n');
                });
                writer.write('}\n');
            };
            return DecodingTable;
        })();

        var Instruction = (function () {
            function Instruction(PC, data) {
                this.PC = PC;
                this.data = data;
            }
            Instruction.fromMemoryAndPC = function (memory, PC) {
                return new Instruction(PC, memory.readInt32(PC));
            };

            Instruction.prototype.extract = function (offset, length) {
                return BitUtils.extract(this.data, offset, length);
            };
            Instruction.prototype.insert = function (offset, length, value) {
                this.data = BitUtils.insert(this.data, offset, length, value);
            };

            Object.defineProperty(Instruction.prototype, "rd", {
                get: function () {
                    return this.extract(11 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "rt", {
                get: function () {
                    return this.extract(11 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "rs", {
                get: function () {
                    return this.extract(11 + 5 * 2, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 2, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "fd", {
                get: function () {
                    return this.extract(6 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "fs", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "ft", {
                get: function () {
                    return this.extract(6 + 5 * 2, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 2, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "pos", {
                get: function () {
                    return this.lsb;
                },
                set: function (value) {
                    this.lsb = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "size_e", {
                get: function () {
                    return this.msb + 1;
                },
                set: function (value) {
                    this.msb = value - 1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "size_i", {
                get: function () {
                    return this.msb - this.lsb + 1;
                },
                set: function (value) {
                    this.msb = this.lsb + value - 1;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "lsb", {
                get: function () {
                    return this.extract(6 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "msb", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "c1cr", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "syscall", {
                get: function () {
                    return this.extract(6, 20);
                },
                set: function (value) {
                    this.insert(6, 20, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "imm16", {
                get: function () {
                    var res = this.u_imm16;
                    if (res & 0x8000)
                        res |= 0xFFFF0000;
                    return res;
                },
                set: function (value) {
                    this.insert(0, 16, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "u_imm16", {
                get: function () {
                    return this.extract(0, 16);
                },
                set: function (value) {
                    this.insert(0, 16, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "u_imm26", {
                get: function () {
                    return this.extract(0, 26);
                },
                set: function (value) {
                    this.insert(0, 26, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "jump_bits", {
                get: function () {
                    return this.extract(0, 26);
                },
                set: function (value) {
                    this.insert(0, 26, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "jump_real", {
                get: function () {
                    return (this.jump_bits * 4) >>> 0;
                },
                set: function (value) {
                    this.jump_bits = (value / 4) >>> 0;
                },
                enumerable: true,
                configurable: true
            });
            return Instruction;
        })();
        cpu.Instruction = Instruction;

        var DecodedInstruction = (function () {
            function DecodedInstruction(instruction, type) {
                this.instruction = instruction;
                this.type = type;
            }
            return DecodedInstruction;
        })();
        cpu.DecodedInstruction = DecodedInstruction;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (cpu) {
        var CpuState = (function () {
            function CpuState(memory, syscallManager) {
                this.memory = memory;
                this.syscallManager = syscallManager;
                this.gpr = new Int32Array(32);
                this.fpr = new Float32Array(32);
                //fpr: Float64Array = new Float64Array(32);
                this.BRANCHFLAG = false;
                this.BRANCHPC = 0;
                this.PC = 0;
                this.LO = 0;
                this.HI = 0;
                this.IC = 0;
                this.thread = null;
                this.fcr31_rm = 0;
                this.fcr31_cc = false;
                this.fcr31_fs = false;
                this.fcr0_imp = 0;
                this.fcr0_rev = 0;
            }
            CpuState.getGprAccessName = function (index) {
                return 'gpr[' + index + ']';
            };
            CpuState.getFprAccessName = function (index) {
                return 'fpr[' + index + ']';
            };

            Object.defineProperty(CpuState.prototype, "V0", {
                get: function () {
                    return this.gpr[2];
                },
                set: function (value) {
                    this.gpr[2] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "V1", {
                get: function () {
                    return this.gpr[3];
                },
                set: function (value) {
                    this.gpr[3] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "K0", {
                get: function () {
                    return this.gpr[26];
                },
                set: function (value) {
                    this.gpr[26] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "GP", {
                get: function () {
                    return this.gpr[28];
                },
                set: function (value) {
                    this.gpr[28] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "SP", {
                get: function () {
                    return this.gpr[29];
                },
                set: function (value) {
                    this.gpr[29] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "FP", {
                get: function () {
                    return this.gpr[30];
                },
                set: function (value) {
                    this.gpr[30] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "RA", {
                get: function () {
                    return this.gpr[31];
                },
                set: function (value) {
                    this.gpr[31] = value;
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype.getPointerStream = function (address) {
                return this.memory.getPointerStream(address);
            };

            Object.defineProperty(CpuState.prototype, "REGS", {
                get: function () {
                    return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype._trace_state = function () {
                console.info(this);
                throw ('_trace_state');
            };

            Object.defineProperty(CpuState.prototype, "fcr31", {
                get: function () {
                    var value = 0;
                    value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
                    value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
                    value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
                    return value;
                },
                set: function (value) {
                    this.fcr31_rm = BitUtils.extract(value, 0, 2);
                    this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
                    this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(CpuState.prototype, "fcr0", {
                get: function () {
                    return (this.fcr0_imp << 8) | (this.fcr0_rev);
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype._cfc1_impl = function (d, t) {
                switch (d) {
                    case 0:
                        this.gpr[t] = this.fcr0;
                        break;
                    case 31:
                        this.gpr[t] = this.fcr31;
                        break;
                    default:
                        throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
                }
            };

            CpuState.prototype._ctc1_impl = function (d, t) {
                switch (d) {
                    case 31:
                        this.fcr31 = t;
                        break;
                    default:
                        throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
                }
            };

            CpuState.prototype._comp_impl = function (s, t, fc_unordererd, fc_equal, fc_less, fc_inv_qnan) {
                if (isNaN(s) || isNaN(t)) {
                    this.fcr31_cc = fc_unordererd;
                } else {
                    //bool cc = false;
                    //if (fc_equal) cc = cc || (s == t);
                    //if (fc_less) cc = cc || (s < t);
                    //return cc;
                    var equal = (fc_equal) && (s == t);
                    var less = (fc_less) && (s < t);

                    this.fcr31_cc = (less || equal);
                }
            };

            CpuState.prototype._cvt_w_s_impl = function (FS) {
                switch (this.fcr31_rm) {
                    case 0:
                        return MathFloat.rint(FS);
                    case 1:
                        return MathFloat.cast(FS);
                    case 2:
                        return MathFloat.ceil(FS);
                    case 3:
                        return MathFloat.floor(FS);
                }

                throw ("RM has an invalid value!!");
            };

            CpuState.prototype.syscall = function (id) {
                this.syscallManager.call(this, id);
            };
            CpuState.prototype.dbreak = function () {
                throw (new CpuBreakException());
            };
            CpuState.prototype.sb = function (value, address) {
                this.memory.writeInt8(address, value);
            };
            CpuState.prototype.sh = function (value, address) {
                this.memory.writeInt16(address, value);
            };
            CpuState.prototype.sw = function (value, address) {
                this.memory.writeInt32(address, value);
            };
            CpuState.prototype.swc1 = function (value, address) {
                this.memory.writeFloat32(address, value);
            };
            CpuState.prototype.lwc1 = function (address) {
                var value = this.memory.readFloat32(address);

                //console.warn('lwc1: ' + value);
                return this.memory.readFloat32(address);
            };
            CpuState.prototype.lb = function (address) {
                return this.memory.readInt8(address);
            };
            CpuState.prototype.lbu = function (address) {
                return this.memory.readUInt8(address);
            };
            CpuState.prototype.lw = function (address) {
                return this.memory.readInt32(address);
            };
            CpuState.prototype.lh = function (address) {
                return this.memory.readInt16(address);
            };
            CpuState.prototype.lhu = function (address) {
                return this.memory.readUInt16(address);
            };
            CpuState.prototype.min = function (a, b) {
                return (a < b) ? a : b;
            };
            CpuState.prototype.max = function (a, b) {
                return (a > b) ? a : b;
            };
            CpuState.prototype.sltu = function (a, b) {
                return ((a >>> 0) < (b >>> 0));
            };

            CpuState.prototype.lwl = function (RS, Offset, RT) {
                var Address = (RS + Offset);
                var AddressAlign = Address & 3;
                var Value = this.memory.readInt32(Address & ~3);
                return ((Value << CpuState.LwlShift[AddressAlign]) | (RT & CpuState.LwlMask[AddressAlign]));
            };

            CpuState.prototype.lwr = function (RS, Offset, RT) {
                var Address = (RS + Offset);
                var AddressAlign = Address & 3;
                var Value = this.memory.readInt32(Address & ~3);
                return ((Value >>> CpuState.LwrShift[AddressAlign]) | (RT & CpuState.LwrMask[AddressAlign]));
            };

            CpuState.prototype.div = function (rs, rt) {
                this.LO = (rs / rt) | 0;
                this.HI = (rs % rt) | 0;
            };

            CpuState.prototype.divu = function (rs, rt) {
                rs >>>= 0; // unsigned
                rt >>>= 0; // unsigned
                this.LO = (rs / rt) | 0;
                this.HI = (rs % rt) | 0;
            };

            CpuState.prototype.mult = function (rs, rt) {
                //this.LO = (((rs >> 0) & 0xFFFF) * ((rt >> 0) & 0xFFFF)) | 0;
                //this.HI = (((rs >> 16) & 0xFFFF) * ((rt >> 16) & 0xFFFF)) | 0; // @TODO: carry!
                var result = rs * rt;
                this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
                this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
            };

            CpuState.prototype.multu = function (rs, rt) {
                var result = (rs >>> 0) * (rt >>> 0);
                this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
                this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
            };

            CpuState.prototype.madd = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.maddu = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.msub = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.msubu = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.break = function () {
                console.log('break!');
            };
            CpuState.LwrMask = [0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00];
            CpuState.LwrShift = [0, 8, 16, 24];

            CpuState.LwlMask = [0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000];
            CpuState.LwlShift = [24, 16, 8, 0];
            return CpuState;
        })();
        cpu.CpuState = CpuState;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (PixelFormat) {
        PixelFormat[PixelFormat["NONE"] = -1] = "NONE";
        PixelFormat[PixelFormat["RGBA_5650"] = 0] = "RGBA_5650";
        PixelFormat[PixelFormat["RGBA_5551"] = 1] = "RGBA_5551";
        PixelFormat[PixelFormat["RGBA_4444"] = 2] = "RGBA_4444";
        PixelFormat[PixelFormat["RGBA_8888"] = 3] = "RGBA_8888";
        PixelFormat[PixelFormat["PALETTE_T4"] = 4] = "PALETTE_T4";
        PixelFormat[PixelFormat["PALETTE_T8"] = 5] = "PALETTE_T8";
        PixelFormat[PixelFormat["PALETTE_T16"] = 6] = "PALETTE_T16";
        PixelFormat[PixelFormat["PALETTE_T32"] = 7] = "PALETTE_T32";
        PixelFormat[PixelFormat["COMPRESSED_DXT1"] = 8] = "COMPRESSED_DXT1";
        PixelFormat[PixelFormat["COMPRESSED_DXT3"] = 9] = "COMPRESSED_DXT3";
        PixelFormat[PixelFormat["COMPRESSED_DXT5"] = 10] = "COMPRESSED_DXT5";
    })(core.PixelFormat || (core.PixelFormat = {}));
    var PixelFormat = core.PixelFormat;

    var BasePspDisplay = (function () {
        function BasePspDisplay() {
            this.address = core.Memory.DEFAULT_FRAME_ADDRESS;
            this.bufferWidth = 512;
            this.pixelFormat = 3 /* RGBA_8888 */;
            this.sync = 1;
        }
        return BasePspDisplay;
    })();
    core.BasePspDisplay = BasePspDisplay;

    var DummyPspDisplay = (function (_super) {
        __extends(DummyPspDisplay, _super);
        function DummyPspDisplay() {
            _super.call(this);
            this.vblankCount = 0;
        }
        DummyPspDisplay.prototype.waitVblankAsync = function () {
            return new Promise(function (resolve) {
                setTimeout(resolve, 20);
            });
        };

        DummyPspDisplay.prototype.startAsync = function () {
            return Promise.resolve();
        };

        DummyPspDisplay.prototype.stopAsync = function () {
            return Promise.resolve();
        };
        return DummyPspDisplay;
    })(BasePspDisplay);
    core.DummyPspDisplay = DummyPspDisplay;

    var PspDisplay = (function (_super) {
        __extends(PspDisplay, _super);
        function PspDisplay(memory, canvas) {
            _super.call(this);
            this.memory = memory;
            this.canvas = canvas;
            this.vblank = new Signal();
            this.interval = -1;
            this.vblankCount = 0;
            this.context = this.canvas.getContext('2d');
            this.imageData = this.context.createImageData(512, 272);
        }
        PspDisplay.prototype.update = function () {
            if (!this.context || !this.imageData)
                return;

            var count = 512 * 272;
            var imageData = this.imageData;
            var w8 = imageData.data;
            var baseAddress = this.address & 0x0FFFFFFF;

            //var from8 = this.memory.u8;
            //var from16 = this.memory.u16;
            PixelConverter.decode(this.pixelFormat, this.memory.buffer, baseAddress, w8, 0, count, false);

            this.context.putImageData(imageData, 0, 0);
        };

        PspDisplay.prototype.startAsync = function () {
            var _this = this;
            //$(this.canvas).focus();
            this.interval = setInterval(function () {
                _this.vblankCount++;
                _this.update();
                _this.vblank.dispatch();
            }, 1000 / 59.999);
            return Promise.resolve();
        };

        PspDisplay.prototype.stopAsync = function () {
            clearInterval(this.interval);
            this.interval = -1;
            return Promise.resolve();
        };

        PspDisplay.prototype.waitVblankAsync = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.vblank.once(function () {
                    resolve(0);
                });
            });
        };
        return PspDisplay;
    })(BasePspDisplay);
    core.PspDisplay = PspDisplay;

    var PixelConverter = (function () {
        function PixelConverter() {
        }
        PixelConverter.decode = function (format, from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            if (typeof palette === "undefined") { palette = null; }
            if (typeof clutStart === "undefined") { clutStart = 0; }
            if (typeof clutShift === "undefined") { clutShift = 0; }
            if (typeof clutMask === "undefined") { clutMask = 0; }
            switch (format) {
                case 3 /* RGBA_8888 */:
                    PixelConverter.decode8888(new Uint8Array(from), (fromIndex >>> 0) & core.Memory.MASK, to, toIndex, count, useAlpha);
                    break;
                case 1 /* RGBA_5551 */:
                    PixelConverter.update5551(new Uint16Array(from), (fromIndex >>> 1) & core.Memory.MASK, to, toIndex, count, useAlpha);
                    break;
                case 0 /* RGBA_5650 */:
                    PixelConverter.update5650(new Uint16Array(from), (fromIndex >>> 1) & core.Memory.MASK, to, toIndex, count, useAlpha);
                    break;
                case 2 /* RGBA_4444 */:
                    PixelConverter.update4444(new Uint16Array(from), (fromIndex >>> 1) & core.Memory.MASK, to, toIndex, count, useAlpha);
                    break;
                case 5 /* PALETTE_T8 */:
                    PixelConverter.updateT8(new Uint8Array(from), (fromIndex >>> 0) & core.Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
                    break;
                case 4 /* PALETTE_T4 */:
                    PixelConverter.updateT4(new Uint8Array(from), (fromIndex >>> 0) & core.Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
                    break;
                default:
                    throw (new Error(sprintf("Unsupported pixel format %d", format)));
            }
        };

        PixelConverter.updateT4 = function (from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            if (typeof palette === "undefined") { palette = null; }
            if (typeof clutStart === "undefined") { clutStart = 0; }
            if (typeof clutShift === "undefined") { clutShift = 0; }
            if (typeof clutMask === "undefined") { clutMask = 0; }
            for (var n = 0, m = 0; n < count * 8; n += 8, m++) {
                var color1 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 0, 4) & clutMask) << clutShift)];
                var color2 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 4, 4) & clutMask) << clutShift)];
                to[toIndex + n + 0] = BitUtils.extract(color1, 0, 8);
                to[toIndex + n + 1] = BitUtils.extract(color1, 8, 8);
                to[toIndex + n + 2] = BitUtils.extract(color1, 16, 8);
                to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color1, 24, 8) : 0xFF;

                to[toIndex + n + 4] = BitUtils.extract(color2, 0, 8);
                to[toIndex + n + 5] = BitUtils.extract(color2, 8, 8);
                to[toIndex + n + 6] = BitUtils.extract(color2, 16, 8);
                to[toIndex + n + 7] = useAlpha ? BitUtils.extract(color2, 24, 8) : 0xFF;
            }
        };

        PixelConverter.updateT8 = function (from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            if (typeof palette === "undefined") { palette = null; }
            if (typeof clutStart === "undefined") { clutStart = 0; }
            if (typeof clutShift === "undefined") { clutShift = 0; }
            if (typeof clutMask === "undefined") { clutMask = 0; }
            for (var n = 0, m = 0; n < count * 4; n += 4, m++) {
                var colorIndex = clutStart + ((from[fromIndex + m] & clutMask) << clutShift);
                var color = palette[colorIndex];
                to[toIndex + n + 0] = BitUtils.extract(color, 0, 8);
                to[toIndex + n + 1] = BitUtils.extract(color, 8, 8);
                to[toIndex + n + 2] = BitUtils.extract(color, 16, 8);
                to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color, 24, 8) : 0xFF;
            }
        };

        PixelConverter.decode8888 = function (from, fromIndex, to, toIndex, count, useAlpha) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            for (var n = 0; n < count * 4; n += 4) {
                to[toIndex + n + 0] = from[fromIndex + n + 0];
                to[toIndex + n + 1] = from[fromIndex + n + 1];
                to[toIndex + n + 2] = from[fromIndex + n + 2];
                to[toIndex + n + 3] = useAlpha ? from[fromIndex + n + 3] : 0xFF;
            }
        };

        PixelConverter.update5551 = function (from, fromIndex, to, toIndex, count, useAlpha) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            for (var n = 0; n < count * 4; n += 4) {
                var it = from[fromIndex++];
                to[toIndex + n + 0] = BitUtils.extractScale(it, 0, 5, 0xFF);
                to[toIndex + n + 1] = BitUtils.extractScale(it, 5, 5, 0xFF);
                to[toIndex + n + 2] = BitUtils.extractScale(it, 10, 5, 0xFF);
                to[toIndex + n + 3] = useAlpha ? BitUtils.extractScale(it, 15, 1, 0xFF) : 0xFF;
            }
        };

        PixelConverter.update5650 = function (from, fromIndex, to, toIndex, count, useAlpha) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            for (var n = 0; n < count * 4; n += 4) {
                var it = from[fromIndex++];
                to[toIndex + n + 0] = BitUtils.extractScale(it, 0, 5, 0xFF);
                to[toIndex + n + 1] = BitUtils.extractScale(it, 5, 6, 0xFF);
                to[toIndex + n + 2] = BitUtils.extractScale(it, 11, 5, 0xFF);
                to[toIndex + n + 3] = 0xFF;
            }
        };

        PixelConverter.update4444 = function (from, fromIndex, to, toIndex, count, useAlpha) {
            if (typeof useAlpha === "undefined") { useAlpha = true; }
            for (var n = 0; n < count * 4; n += 4) {
                var it = from[fromIndex++];
                to[toIndex + n + 0] = BitUtils.extractScale(it, 0, 4, 0xFF);
                to[toIndex + n + 1] = BitUtils.extractScale(it, 4, 4, 0xFF);
                to[toIndex + n + 2] = BitUtils.extractScale(it, 8, 4, 0xFF);
                to[toIndex + n + 3] = useAlpha ? BitUtils.extractScale(it, 12, 4, 0xFF) : 0xFF;
            }
        };
        return PixelConverter;
    })();
    core.PixelConverter = PixelConverter;
})(core || (core = {}));
var core;
(function (core) {
    (function (gpu) {
        (function (impl) {
            var Context2dPspDrawDriver = (function () {
                function Context2dPspDrawDriver(memory, canvas) {
                    this.memory = memory;
                    this.canvas = canvas;
                    this.transformMatrix = mat4.create();
                    this.test11 = false;
                    //this.gl = this.canvas.getContext('webgl');
                    this.context = this.canvas.getContext('2d');
                }
                Context2dPspDrawDriver.prototype.initAsync = function () {
                    return Promise.resolve();
                };

                Context2dPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
                    this.clearing = clearing;
                };

                Context2dPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
                    this.projectionMatrix = projectionMatrix;
                    this.viewMatrix = viewMatrix;
                    this.worldMatrix = worldMatrix;

                    //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
                    mat4.identity(this.transformMatrix);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
                };

                Context2dPspDrawDriver.prototype.setState = function (state) {
                };

                Context2dPspDrawDriver.prototype.textureFlush = function (state) {
                };

                Context2dPspDrawDriver.prototype.transformVertex = function (vertex, vertexState) {
                    if (vertexState.transform2D) {
                        return {
                            x: vertex.px,
                            y: vertex.py
                        };
                    }
                    var o = vec4.transformMat4(vec4.create(), vec4.fromValues(vertex.px, vertex.py, vertex.pz, 0), this.transformMatrix);
                    return {
                        x: o[0] * 480 / 2 + 480 / 2,
                        y: o[1] * 272 / 2 + 272 / 2
                    };
                };

                Context2dPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
                    this.context.fillStyle = this.clearing ? 'black' : 'red';
                    for (var n = 0; n < count; n += 2) {
                        var a = this.transformVertex(vertices[n + 0], vertexState);
                        var b = this.transformVertex(vertices[n + 1], vertexState);
                        this.context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
                    }
                };

                Context2dPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
                    switch (primitiveType) {
                        case 6 /* Sprites */:
                            this.drawSprites(vertices, count, vertexState);
                            break;
                        case 3 /* Triangles */:
                            this.drawTriangles(vertices, count, vertexState);
                            break;
                    }
                };

                Context2dPspDrawDriver.prototype.drawTriangles = function (vertices, count, vertexState) {
                    this.context.fillStyle = this.clearing ? 'black' : 'red';
                    this.context.beginPath();

                    if (!this.test11) {
                        this.test11 = true;
                        console.log(vertices[0]);
                        console.log(vertices[1]);
                        console.log(vertices[2]);
                    }

                    for (var n = 0; n < count; n += 3) {
                        //console.log(n);
                        var v0 = this.transformVertex(vertices[n + 0], vertexState);
                        var v1 = this.transformVertex(vertices[n + 1], vertexState);
                        var v2 = this.transformVertex(vertices[n + 2], vertexState);
                        this.context.moveTo(v0.x, v0.y);
                        this.context.lineTo(v1.x, v1.y);
                        this.context.lineTo(v2.x, v2.y);
                    }
                    this.context.fill();
                };
                return Context2dPspDrawDriver;
            })();
        })(gpu.impl || (gpu.impl = {}));
        var impl = gpu.impl;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (gpu) {
        (function (impl) {
            var ShaderCache = (function () {
                function ShaderCache(gl, shaderVertString, shaderFragString) {
                    this.gl = gl;
                    this.shaderVertString = shaderVertString;
                    this.shaderFragString = shaderFragString;
                    this.programs = {};
                }
                ShaderCache.prototype.getProgram = function (vertex) {
                    var hash = vertex.hash;
                    if (this.programs[hash])
                        return this.programs[hash];
                    return this.programs[hash] = this.createProgram(vertex);
                };

                ShaderCache.prototype.createProgram = function (vertex) {
                    var defines = [];
                    if (vertex.hasColor)
                        defines.push('#define VERTEX_COLOR 1');
                    if (vertex.hasTexture)
                        defines.push('#define VERTEX_TEXTURE 1');

                    return ShaderCache.shaderProgram(this.gl, defines.join("\n") + "\n" + this.shaderVertString, defines.join("\n") + "\n" + this.shaderFragString);
                };

                ShaderCache.shaderProgram = function (gl, vs, fs) {
                    var prog = gl.createProgram();
                    var addshader = function (type, source) {
                        var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
                        gl.shaderSource(s, source);
                        gl.compileShader(s);
                        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                            throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s) + "\n\n" + source));
                        gl.attachShader(prog, s);
                    };
                    addshader('vertex', vs);
                    addshader('fragment', fs);
                    gl.linkProgram(prog);
                    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
                        throw (new Error("Could not link the shader program!"));
                    return prog;
                };
                return ShaderCache;
            })();

            var TextureHandler = (function () {
                function TextureHandler(memory, gl) {
                    this.memory = memory;
                    this.gl = gl;
                }
                TextureHandler.prototype.bindTexture = function (program, state) {
                    var gl = this.gl;
                    var texture = gl.createTexture();

                    var mipmap = state.texture.mipmaps[0];

                    var h = mipmap.textureHeight;

                    //var w2 = mipmap.textureWidth;
                    //var w = mipmap.textureWidth, w2 = mipmap.textureWidth;
                    var w = mipmap.textureWidth, w2 = mipmap.bufferWidth;

                    //var w = mipmap.bufferWidth, w2 = mipmap.textureWidth;
                    //printf("%d, %d", w, h);
                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    var imageData = ctx.createImageData(w2, h);
                    var u8 = imageData.data;

                    //console.error('pixelFormat:' + state.texture.pixelFormat);
                    var clut = state.texture.clut;
                    var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
                    var paletteU8 = new Uint8Array(paletteBuffer);
                    var palette = new Uint32Array(paletteBuffer);

                    switch (state.texture.pixelFormat) {
                        case 6 /* PALETTE_T16 */:
                        case 5 /* PALETTE_T8 */:
                        case 4 /* PALETTE_T4 */:
                            //console.log(sprintf('%08X', clut.adress));
                            //var items = [];
                            //for (var n = 0; n < 10; n++) items.push(this.memory.readUInt32(clut.adress + n * 4));
                            //console.log(items.join(','));
                            core.PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);

                            break;
                    }

                    //console.log(palette);
                    core.PixelConverter.decode(state.texture.pixelFormat, this.memory.buffer, mipmap.address, u8, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

                    ctx.clearRect(0, 0, w, h);
                    ctx.putImageData(imageData, 0, 0);

                    //ctx.fillStyle = 'red';
                    //ctx.fillRect(0, 0, w, h);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
                    gl.generateMipmap(gl.TEXTURE_2D);
                    gl.bindTexture(gl.TEXTURE_2D, null);

                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                    gl.uniform1i(gl.getUniformLocation(program, "uSampler"), 0);
                };

                TextureHandler.prototype.unbindTexture = function (program, state) {
                    var gl = this.gl;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                };
                return TextureHandler;
            })();

            var WebGlPspDrawDriver = (function () {
                function WebGlPspDrawDriver(memory, canvas) {
                    this.memory = memory;
                    this.canvas = canvas;
                    this.baseShaderFragString = '';
                    this.baseShaderVertString = '';
                    this.transformMatrix = mat4.create();
                    this.transformMatrix2d = mat4.create();
                    this.testCount = 20;
                    this.gl = this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });
                    if (!this.gl)
                        this.canvas.getContext('webgl', { preserveDrawingBuffer: false });

                    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                    this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, -1000, +1000);
                }
                WebGlPspDrawDriver.prototype.initAsync = function () {
                    var _this = this;
                    return downloadFileAsync('src/core/gpu/shader.vert').then(function (shaderVert) {
                        return downloadFileAsync('src/core/gpu/shader.frag').then(function (shaderFrag) {
                            var shaderVertString = Stream.fromArrayBuffer(shaderVert).readUtf8String(shaderVert.byteLength);
                            var shaderFragString = Stream.fromArrayBuffer(shaderFrag).readUtf8String(shaderFrag.byteLength);

                            _this.cache = new ShaderCache(_this.gl, shaderVertString, shaderFragString);
                            _this.textureHandler = new TextureHandler(_this.memory, _this.gl);
                        });
                    });
                };

                WebGlPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
                    this.clearing = clearing;
                };

                WebGlPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
                    this.projectionMatrix = projectionMatrix;
                    this.viewMatrix = viewMatrix;
                    this.worldMatrix = worldMatrix;

                    //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
                    mat4.identity(this.transformMatrix);

                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
                };

                WebGlPspDrawDriver.prototype.enableDisable = function (type, enable) {
                    if (enable)
                        this.gl.enable(type);
                    else
                        this.gl.disable(type);
                    return enable;
                };

                WebGlPspDrawDriver.prototype.setState = function (state) {
                    this.state = state;
                    if (this.enableDisable(this.gl.CULL_FACE, state.culling.enabled)) {
                        this.gl.cullFace((state.culling.direction == 1 /* ClockWise */) ? this.gl.FRONT : this.gl.BACK);
                    }

                    this.gl.enable(this.gl.BLEND);
                    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
                };

                WebGlPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
                    if (primitiveType == 6 /* Sprites */) {
                        return this.drawSprites(vertices, count, vertexState);
                    } else {
                        return this.drawElementsInternal(primitiveType, vertices, count, vertexState);
                    }
                };

                WebGlPspDrawDriver.prototype.textureFlush = function (state) {
                };

                WebGlPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
                    var vertices2 = [];

                    for (var n = 0; n < count; n += 2) {
                        var v0 = vertices[n + 0];
                        var v1 = vertices[n + 1];

                        //console.log(sprintf('%f, %f : %f, %f', v1.px, v1.py, v1.tx, v1.ty));
                        v0.r = v1.r;
                        v0.g = v1.g;
                        v0.b = v1.b;
                        v0.a = v1.a;
                        var vtl = v0.clone();
                        var vtr = v0.clone();
                        var vbl = v1.clone();
                        var vbr = v1.clone();

                        vtr.px = v1.px;
                        vbl.px = v0.px;

                        vtr.tx = v1.tx;
                        vbl.tx = v0.tx;

                        vertices2.push(vtl, vtr, vbl);
                        vertices2.push(vtr, vbr, vbl);
                    }
                    this.drawElementsInternal(3 /* Triangles */, vertices2, vertices2.length, vertexState);
                };

                WebGlPspDrawDriver.prototype.drawElementsInternal = function (primitiveType, vertices, count, vertexState) {
                    //console.log(primitiveType);
                    var gl = this.gl;

                    var program = this.cache.getProgram(vertexState);

                    gl.useProgram(program);

                    var textureState = this.state.texture;

                    var positionData = [];
                    var colorData = [];
                    var textureData = [];
                    for (var n = 0; n < count; n++) {
                        var v = vertices[n];
                        positionData.push(v.px);
                        positionData.push(v.py);
                        positionData.push(v.pz);

                        if (vertexState.hasColor) {
                            colorData.push(v.r);
                            colorData.push(v.g);
                            colorData.push(v.b);
                            colorData.push(v.a);
                        }
                        if (vertexState.hasTexture) {
                            if (vertexState.transform2D) {
                                textureData.push(v.tx / this.state.texture.mipmaps[0].bufferWidth);
                                textureData.push(v.ty / this.state.texture.mipmaps[0].textureHeight);
                                textureData.push(1.0);
                            } else {
                                textureData.push(v.tx * textureState.scaleU);
                                textureData.push(v.ty * textureState.scaleV);
                                textureData.push(v.tz);
                            }
                        }
                    }

                    if (vertexState.hasTexture) {
                        this.textureHandler.bindTexture(program, this.state);
                    } else {
                        this.textureHandler.unbindTexture(program, this.state);
                    }

                    if (this.testCount-- >= 0) {
                        //console.log(textureData);
                        //console.log(this.state.texture);
                    }

                    WebGlPspDrawDriver.uniformSetMat4(gl, program, 'u_modelViewProjMatrix', vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

                    WebGlPspDrawDriver.attributeSetFloats(gl, program, "vPosition", 3, positionData);
                    if (vertexState.hasTexture) {
                        gl.uniform1i(gl.getUniformLocation(program, 'tfx'), this.state.texture.effect);
                        gl.uniform1i(gl.getUniformLocation(program, 'tcc'), this.state.texture.colorComponent);
                        WebGlPspDrawDriver.attributeSetFloats(gl, program, "vTexcoord", 3, textureData);
                    }
                    if (vertexState.hasColor) {
                        WebGlPspDrawDriver.attributeSetFloats(gl, program, "vColor", 4, colorData);
                    }

                    switch (primitiveType) {
                        case 0 /* Points */:
                            gl.drawArrays(gl.POINTS, 0, count);
                            break;
                        case 1 /* Lines */:
                            gl.drawArrays(gl.LINES, 0, count);
                            break;
                        case 2 /* LineStrip */:
                            gl.drawArrays(gl.LINE_STRIP, 0, count);
                            break;
                        case 3 /* Triangles */:
                            gl.drawArrays(gl.TRIANGLES, 0, count);
                            break;
                        case 4 /* TriangleStrip */:
                            gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
                            break;
                        case 5 /* TriangleFan */:
                            gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
                            break;
                    }

                    WebGlPspDrawDriver.attributeDisable(gl, program, 'vPosition');
                    if (vertexState.hasTexture)
                        WebGlPspDrawDriver.attributeDisable(gl, program, 'vTexcoord');
                    if (vertexState.hasColor)
                        WebGlPspDrawDriver.attributeDisable(gl, program, 'vColor');
                };

                WebGlPspDrawDriver.uniformSetMat4 = function (gl, prog, uniform_name, arr) {
                    var uniform = gl.getUniformLocation(prog, uniform_name);
                    if (uniform)
                        gl.uniformMatrix4fv(uniform, false, new Float32Array(arr));
                };

                WebGlPspDrawDriver.attributeDisable = function (gl, prog, attr_name) {
                    var attr = gl.getAttribLocation(prog, attr_name);
                    if (attr >= 0) {
                        gl.disableVertexAttribArray(attr);
                    }
                };

                WebGlPspDrawDriver.attributeSetFloats = function (gl, prog, attr_name, rsize, arr) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
                    var varr = new Float32Array(arr);
                    gl.bufferData(gl.ARRAY_BUFFER, varr, gl.STATIC_DRAW);
                    var attr = gl.getAttribLocation(prog, attr_name);
                    if (attr >= 0) {
                        gl.enableVertexAttribArray(attr);
                        gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
                    }
                };
                return WebGlPspDrawDriver;
            })();
            impl.WebGlPspDrawDriver = WebGlPspDrawDriver;
        })(gpu.impl || (gpu.impl = {}));
        var impl = gpu.impl;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
var core;
(function (core) {
    (function (gpu) {
        (function (SyncType) {
            SyncType[SyncType["ListDone"] = 0] = "ListDone";
            SyncType[SyncType["ListQueued"] = 1] = "ListQueued";
            SyncType[SyncType["ListDrawingDone"] = 2] = "ListDrawingDone";
            SyncType[SyncType["ListStallReached"] = 3] = "ListStallReached";
            SyncType[SyncType["ListCancelDone"] = 4] = "ListCancelDone";
        })(gpu.SyncType || (gpu.SyncType = {}));
        var SyncType = gpu.SyncType;

        var GpuFrameBufferState = (function () {
            function GpuFrameBufferState() {
                this.lowAddress = 0;
                this.highAddress = 0;
                this.width = 0;
            }
            return GpuFrameBufferState;
        })();
        gpu.GpuFrameBufferState = GpuFrameBufferState;

        (function (IndexEnum) {
            IndexEnum[IndexEnum["Void"] = 0] = "Void";
            IndexEnum[IndexEnum["Byte"] = 1] = "Byte";
            IndexEnum[IndexEnum["Short"] = 2] = "Short";
        })(gpu.IndexEnum || (gpu.IndexEnum = {}));
        var IndexEnum = gpu.IndexEnum;

        (function (NumericEnum) {
            NumericEnum[NumericEnum["Void"] = 0] = "Void";
            NumericEnum[NumericEnum["Byte"] = 1] = "Byte";
            NumericEnum[NumericEnum["Short"] = 2] = "Short";
            NumericEnum[NumericEnum["Float"] = 3] = "Float";
        })(gpu.NumericEnum || (gpu.NumericEnum = {}));
        var NumericEnum = gpu.NumericEnum;

        (function (ColorEnum) {
            ColorEnum[ColorEnum["Void"] = 0] = "Void";
            ColorEnum[ColorEnum["Invalid1"] = 1] = "Invalid1";
            ColorEnum[ColorEnum["Invalid2"] = 2] = "Invalid2";
            ColorEnum[ColorEnum["Invalid3"] = 3] = "Invalid3";
            ColorEnum[ColorEnum["Color5650"] = 4] = "Color5650";
            ColorEnum[ColorEnum["Color5551"] = 5] = "Color5551";
            ColorEnum[ColorEnum["Color4444"] = 6] = "Color4444";
            ColorEnum[ColorEnum["Color8888"] = 7] = "Color8888";
        })(gpu.ColorEnum || (gpu.ColorEnum = {}));
        var ColorEnum = gpu.ColorEnum;

        var Vertex = (function () {
            function Vertex() {
                this.px = 0.0;
                this.py = 0.0;
                this.pz = 0.0;
                this.nx = 0.0;
                this.ny = 0.0;
                this.nz = 0.0;
                this.tx = 0.0;
                this.ty = 0.0;
                this.tz = 0.0;
                this.r = 0.0;
                this.g = 0.0;
                this.b = 0.0;
                this.a = 1.0;
                this.w0 = 0.0;
                this.w1 = 0.0;
                this.w2 = 0.0;
                this.w3 = 0.0;
                this.w4 = 0.0;
                this.w5 = 0.0;
                this.w6 = 0.0;
                this.w7 = 0.0;
            }
            Vertex.prototype.clone = function () {
                var vertex = new Vertex();
                vertex.px = this.px;
                vertex.py = this.py;
                vertex.pz = this.pz;
                vertex.nx = this.nx;
                vertex.ny = this.ny;
                vertex.nz = this.nz;
                vertex.tx = this.tx;
                vertex.ty = this.ty;
                vertex.tz = this.tz;
                vertex.r = this.r;
                vertex.g = this.g;
                vertex.b = this.b;
                vertex.a = this.a;
                vertex.w0 = this.w0;
                vertex.w1 = this.w1;
                vertex.w2 = this.w2;
                vertex.w3 = this.w3;
                vertex.w4 = this.w4;
                vertex.w5 = this.w5;
                vertex.w6 = this.w6;
                vertex.w7 = this.w7;
                return vertex;
            };
            return Vertex;
        })();
        gpu.Vertex = Vertex;

        var VertexState = (function () {
            function VertexState() {
                this.address = 0;
                this._value = 0;
                this.reversedNormal = false;
                this.textureComponentCount = 2;
            }
            Object.defineProperty(VertexState.prototype, "value", {
                get: function () {
                    return this._value;
                },
                set: function (value) {
                    this._value = value;
                    this.size = this.getVertexSize();
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(VertexState.prototype, "hash", {
                //getReader() { return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount); }
                get: function () {
                    return [this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.weightSize, this.morphingVertexCount, this.transform2D, this.textureComponentCount].join('_');
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(VertexState.prototype, "hasTexture", {
                get: function () {
                    return this.texture != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "hasColor", {
                get: function () {
                    return this.color != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "hasNormal", {
                get: function () {
                    return this.normal != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "hasPosition", {
                get: function () {
                    return this.position != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "hasWeight", {
                get: function () {
                    return this.weight != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "hasIndex", {
                get: function () {
                    return this.index != 0 /* Void */;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(VertexState.prototype, "texture", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 0, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "color", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 2, 3);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "normal", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 5, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "position", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 7, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "weight", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 9, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "index", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 11, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "weightCount", {
                get: function () {
                    return BitUtils.extract(this.value, 14, 3);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "morphingVertexCount", {
                get: function () {
                    return BitUtils.extract(this.value, 18, 2);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "transform2D", {
                get: function () {
                    return BitUtils.extractEnum(this.value, 23, 1);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(VertexState.prototype, "weightSize", {
                get: function () {
                    return this.NumericEnumGetSize(this.weight);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "colorSize", {
                get: function () {
                    return this.ColorEnumGetSize(this.color);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "textureSize", {
                get: function () {
                    return this.NumericEnumGetSize(this.texture);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "positionSize", {
                get: function () {
                    return this.NumericEnumGetSize(this.position);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "normalSize", {
                get: function () {
                    return this.NumericEnumGetSize(this.normal);
                },
                enumerable: true,
                configurable: true
            });

            VertexState.prototype.IndexEnumGetSize = function (item) {
                switch (item) {
                    case 0 /* Void */:
                        return 0;
                    case 1 /* Byte */:
                        return 1;
                    case 2 /* Short */:
                        return 2;
                    default:
                        throw ("Invalid enum");
                }
            };

            VertexState.prototype.NumericEnumGetSize = function (item) {
                switch (item) {
                    case 0 /* Void */:
                        return 0;
                    case 1 /* Byte */:
                        return 1;
                    case 2 /* Short */:
                        return 2;
                    case 3 /* Float */:
                        return 4;
                    default:
                        throw ("Invalid enum");
                }
            };

            VertexState.prototype.ColorEnumGetSize = function (item) {
                switch (item) {
                    case 0 /* Void */:
                        return 0;
                    case 4 /* Color5650 */:
                        return 2;
                    case 5 /* Color5551 */:
                        return 2;
                    case 6 /* Color4444 */:
                        return 2;
                    case 7 /* Color8888 */:
                        return 4;
                    default:
                        throw ("Invalid enum");
                }
            };

            VertexState.prototype.GetMaxAlignment = function () {
                return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
            };

            Object.defineProperty(VertexState.prototype, "realWeightCount", {
                get: function () {
                    return this.weightCount + 1;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(VertexState.prototype, "realMorphingVertexCount", {
                get: function () {
                    return this.morphingVertexCount + 1;
                },
                enumerable: true,
                configurable: true
            });

            VertexState.prototype.getVertexSize = function () {
                var size = 0;
                size = MathUtils.nextAligned(size, this.weightSize);
                size += this.realWeightCount * this.weightSize;
                size = MathUtils.nextAligned(size, this.textureSize);
                size += this.textureComponentCount * this.textureSize;
                size = MathUtils.nextAligned(size, this.colorSize);
                size += 1 * this.colorSize;
                size = MathUtils.nextAligned(size, this.normalSize);
                size += 3 * this.normalSize;
                size = MathUtils.nextAligned(size, this.positionSize);
                size += 3 * this.positionSize;

                var alignmentSize = this.GetMaxAlignment();
                size = MathUtils.nextAligned(size, alignmentSize);

                //Console.WriteLine("Size:" + Size);
                return size;
            };

            VertexState.prototype.read = function (memory, count) {
                //console.log('read vertices ' + count);
                var vertices = [];
                for (var n = 0; n < count; n++)
                    vertices.push(this.readOne(memory));
                return vertices;
            };

            VertexState.prototype.readOne = function (memory) {
                var address = this.address;
                var vertex = {};

                //console.log(vertex);
                this.address += this.size;

                return vertex;
            };
            return VertexState;
        })();
        gpu.VertexState = VertexState;

        var Matrix4x4 = (function () {
            function Matrix4x4() {
                this.index = 0;
                this.values = mat4.create();
            }
            Matrix4x4.prototype.put = function (value) {
                this.values[this.index++] = value;
            };

            Matrix4x4.prototype.reset = function (startIndex) {
                this.index = startIndex;
            };
            return Matrix4x4;
        })();
        gpu.Matrix4x4 = Matrix4x4;

        var Matrix4x3 = (function () {
            function Matrix4x3() {
                this.index = 0;
                this.values = mat4.create();
            }
            Matrix4x3.prototype.put = function (value) {
                this.values[Matrix4x3.indices[this.index++]] = value;
            };

            Matrix4x3.prototype.reset = function (startIndex) {
                this.index = startIndex;
            };
            Matrix4x3.indices = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];
            return Matrix4x3;
        })();
        gpu.Matrix4x3 = Matrix4x3;

        var ViewPort = (function () {
            function ViewPort() {
                this.x1 = 0;
                this.y1 = 0;
                this.x2 = 0;
                this.y2 = 0;
            }
            return ViewPort;
        })();
        gpu.ViewPort = ViewPort;

        var Light = (function () {
            function Light() {
                this.enabled = false;
            }
            return Light;
        })();
        gpu.Light = Light;

        var Lightning = (function () {
            function Lightning() {
                this.enabled = false;
                this.lights = [new Light(), new Light(), new Light(), new Light()];
            }
            return Lightning;
        })();
        gpu.Lightning = Lightning;

        var MipmapState = (function () {
            function MipmapState() {
                this.address = 0;
                this.bufferWidth = 0;
                this.textureWidth = 0;
                this.textureHeight = 0;
            }
            return MipmapState;
        })();
        gpu.MipmapState = MipmapState;

        var ColorState = (function () {
            function ColorState() {
                this.r = 1;
                this.g = 1;
                this.b = 1;
                this.a = 1;
            }
            return ColorState;
        })();
        gpu.ColorState = ColorState;

        var ClutState = (function () {
            function ClutState() {
                this.adress = 0;
                this.numberOfColors = 0;
                this.pixelFormat = 3 /* RGBA_8888 */;
                this.shift = 0;
                this.mask = 0x00;
                this.start = 0;
            }
            return ClutState;
        })();
        gpu.ClutState = ClutState;

        var TextureState = (function () {
            function TextureState() {
                this.enabled = false;
                this.swizzled = false;
                this.mipmapShareClut = false;
                this.mipmapMaxLevel = 0;
                this.filterMinification = 0 /* Nearest */;
                this.filterMagnification = 0 /* Nearest */;
                this.wrapU = 0 /* Repeat */;
                this.offsetU = 0;
                this.offsetV = 0;
                this.scaleU = 1;
                this.scaleV = 1;
                this.wrapV = 0 /* Repeat */;
                this.effect = 0 /* Modulate */;
                this.colorComponent = 0 /* Rgb */;
                this.envColor = new ColorState();
                this.fragment2X = false;
                this.pixelFormat = 3 /* RGBA_8888 */;
                this.clut = new ClutState();
                this.mipmaps = [new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState()];
            }
            return TextureState;
        })();
        gpu.TextureState = TextureState;

        var CullingState = (function () {
            function CullingState() {
            }
            return CullingState;
        })();
        gpu.CullingState = CullingState;

        var GpuState = (function () {
            function GpuState() {
                this.clearing = false;
                this.clearFlags = 0;
                this.baseAddress = 0;
                this.baseOffset = 0;
                this.indexAddress = 0;
                this.frameBuffer = new GpuFrameBufferState();
                this.vertex = new VertexState();
                this.projectionMatrix = new Matrix4x4();
                this.viewMatrix = new Matrix4x3();
                this.worldMatrix = new Matrix4x3();
                this.viewPort = new ViewPort();
                this.lightning = new Lightning();
                this.texture = new TextureState();
                this.culling = new CullingState();
            }
            return GpuState;
        })();
        gpu.GpuState = GpuState;

        (function (WrapMode) {
            WrapMode[WrapMode["Repeat"] = 0] = "Repeat";
            WrapMode[WrapMode["Clamp"] = 1] = "Clamp";
        })(gpu.WrapMode || (gpu.WrapMode = {}));
        var WrapMode = gpu.WrapMode;

        (function (TextureEffect) {
            TextureEffect[TextureEffect["Modulate"] = 0] = "Modulate";
            TextureEffect[TextureEffect["Decal"] = 1] = "Decal";
            TextureEffect[TextureEffect["Blend"] = 2] = "Blend";
            TextureEffect[TextureEffect["Replace"] = 3] = "Replace";
            TextureEffect[TextureEffect["Add"] = 4] = "Add";
        })(gpu.TextureEffect || (gpu.TextureEffect = {}));
        var TextureEffect = gpu.TextureEffect;

        (function (TextureFilter) {
            TextureFilter[TextureFilter["Nearest"] = 0] = "Nearest";
            TextureFilter[TextureFilter["Linear"] = 1] = "Linear";
            TextureFilter[TextureFilter["NearestMipmapNearest"] = 4] = "NearestMipmapNearest";
            TextureFilter[TextureFilter["LinearMipmapNearest"] = 5] = "LinearMipmapNearest";
            TextureFilter[TextureFilter["NearestMipmapLinear"] = 6] = "NearestMipmapLinear";
            TextureFilter[TextureFilter["LinearMipmapLinear"] = 7] = "LinearMipmapLinear";
        })(gpu.TextureFilter || (gpu.TextureFilter = {}));
        var TextureFilter = gpu.TextureFilter;

        (function (TextureColorComponent) {
            TextureColorComponent[TextureColorComponent["Rgb"] = 0] = "Rgb";
            TextureColorComponent[TextureColorComponent["Rgba"] = 1] = "Rgba";
        })(gpu.TextureColorComponent || (gpu.TextureColorComponent = {}));
        var TextureColorComponent = gpu.TextureColorComponent;

        (function (PrimitiveType) {
            PrimitiveType[PrimitiveType["Points"] = 0] = "Points";
            PrimitiveType[PrimitiveType["Lines"] = 1] = "Lines";
            PrimitiveType[PrimitiveType["LineStrip"] = 2] = "LineStrip";
            PrimitiveType[PrimitiveType["Triangles"] = 3] = "Triangles";
            PrimitiveType[PrimitiveType["TriangleStrip"] = 4] = "TriangleStrip";
            PrimitiveType[PrimitiveType["TriangleFan"] = 5] = "TriangleFan";
            PrimitiveType[PrimitiveType["Sprites"] = 6] = "Sprites";
            PrimitiveType[PrimitiveType["ContinuePreviousPrim"] = 7] = "ContinuePreviousPrim";
        })(gpu.PrimitiveType || (gpu.PrimitiveType = {}));
        var PrimitiveType = gpu.PrimitiveType;

        (function (GpuOpCodes) {
            GpuOpCodes[GpuOpCodes["NOP"] = 0x00] = "NOP";
            GpuOpCodes[GpuOpCodes["VADDR"] = 0x01] = "VADDR";
            GpuOpCodes[GpuOpCodes["IADDR"] = 0x02] = "IADDR";
            GpuOpCodes[GpuOpCodes["Unknown0x03"] = 0x03] = "Unknown0x03";
            GpuOpCodes[GpuOpCodes["PRIM"] = 0x04] = "PRIM";
            GpuOpCodes[GpuOpCodes["BEZIER"] = 0x05] = "BEZIER";
            GpuOpCodes[GpuOpCodes["SPLINE"] = 0x06] = "SPLINE";
            GpuOpCodes[GpuOpCodes["BBOX"] = 0x07] = "BBOX";
            GpuOpCodes[GpuOpCodes["JUMP"] = 0x08] = "JUMP";
            GpuOpCodes[GpuOpCodes["BJUMP"] = 0x09] = "BJUMP";
            GpuOpCodes[GpuOpCodes["CALL"] = 0x0A] = "CALL";
            GpuOpCodes[GpuOpCodes["RET"] = 0x0B] = "RET";
            GpuOpCodes[GpuOpCodes["END"] = 0x0C] = "END";
            GpuOpCodes[GpuOpCodes["Unknown0x0D"] = 0x0D] = "Unknown0x0D";
            GpuOpCodes[GpuOpCodes["SIGNAL"] = 0x0E] = "SIGNAL";
            GpuOpCodes[GpuOpCodes["FINISH"] = 0x0F] = "FINISH";
            GpuOpCodes[GpuOpCodes["BASE"] = 0x10] = "BASE";
            GpuOpCodes[GpuOpCodes["Unknown0x11"] = 0x11] = "Unknown0x11";
            GpuOpCodes[GpuOpCodes["VTYPE"] = 0x12] = "VTYPE";
            GpuOpCodes[GpuOpCodes["OFFSET_ADDR"] = 0x13] = "OFFSET_ADDR";
            GpuOpCodes[GpuOpCodes["ORIGIN_ADDR"] = 0x14] = "ORIGIN_ADDR";
            GpuOpCodes[GpuOpCodes["REGION1"] = 0x15] = "REGION1";
            GpuOpCodes[GpuOpCodes["REGION2"] = 0x16] = "REGION2";
            GpuOpCodes[GpuOpCodes["LTE"] = 0x17] = "LTE";
            GpuOpCodes[GpuOpCodes["LTE0"] = 0x18] = "LTE0";
            GpuOpCodes[GpuOpCodes["LTE1"] = 0x19] = "LTE1";
            GpuOpCodes[GpuOpCodes["LTE2"] = 0x1A] = "LTE2";
            GpuOpCodes[GpuOpCodes["LTE3"] = 0x1B] = "LTE3";
            GpuOpCodes[GpuOpCodes["CPE"] = 0x1C] = "CPE";
            GpuOpCodes[GpuOpCodes["BCE"] = 0x1D] = "BCE";
            GpuOpCodes[GpuOpCodes["TME"] = 0x1E] = "TME";
            GpuOpCodes[GpuOpCodes["FGE"] = 0x1F] = "FGE";
            GpuOpCodes[GpuOpCodes["DTE"] = 0x20] = "DTE";
            GpuOpCodes[GpuOpCodes["ABE"] = 0x21] = "ABE";
            GpuOpCodes[GpuOpCodes["ATE"] = 0x22] = "ATE";
            GpuOpCodes[GpuOpCodes["ZTE"] = 0x23] = "ZTE";
            GpuOpCodes[GpuOpCodes["STE"] = 0x24] = "STE";
            GpuOpCodes[GpuOpCodes["AAE"] = 0x25] = "AAE";
            GpuOpCodes[GpuOpCodes["PCE"] = 0x26] = "PCE";
            GpuOpCodes[GpuOpCodes["CTE"] = 0x27] = "CTE";
            GpuOpCodes[GpuOpCodes["LOE"] = 0x28] = "LOE";
            GpuOpCodes[GpuOpCodes["Unknown0x29"] = 0x29] = "Unknown0x29";
            GpuOpCodes[GpuOpCodes["BOFS"] = 0x2A] = "BOFS";
            GpuOpCodes[GpuOpCodes["BONE"] = 0x2B] = "BONE";
            GpuOpCodes[GpuOpCodes["MW0"] = 0x2C] = "MW0";
            GpuOpCodes[GpuOpCodes["MW1"] = 0x2D] = "MW1";
            GpuOpCodes[GpuOpCodes["MW2"] = 0x2E] = "MW2";
            GpuOpCodes[GpuOpCodes["MW3"] = 0x2F] = "MW3";
            GpuOpCodes[GpuOpCodes["MW4"] = 0x30] = "MW4";
            GpuOpCodes[GpuOpCodes["MW5"] = 0x31] = "MW5";
            GpuOpCodes[GpuOpCodes["MW6"] = 0x32] = "MW6";
            GpuOpCodes[GpuOpCodes["MW7"] = 0x33] = "MW7";
            GpuOpCodes[GpuOpCodes["Unknown0x34"] = 0x34] = "Unknown0x34";
            GpuOpCodes[GpuOpCodes["Unknown0x35"] = 0x35] = "Unknown0x35";
            GpuOpCodes[GpuOpCodes["PSUB"] = 0x36] = "PSUB";
            GpuOpCodes[GpuOpCodes["PPRIM"] = 0x37] = "PPRIM";
            GpuOpCodes[GpuOpCodes["PFACE"] = 0x38] = "PFACE";
            GpuOpCodes[GpuOpCodes["Unknown0x39"] = 0x39] = "Unknown0x39";
            GpuOpCodes[GpuOpCodes["WORLD_START"] = 0x3A] = "WORLD_START";
            GpuOpCodes[GpuOpCodes["WORLD_PUT"] = 0x3B] = "WORLD_PUT";
            GpuOpCodes[GpuOpCodes["VIEW_START"] = 0x3C] = "VIEW_START";
            GpuOpCodes[GpuOpCodes["VIEW_PUT"] = 0x3D] = "VIEW_PUT";
            GpuOpCodes[GpuOpCodes["PROJ_START"] = 0x3E] = "PROJ_START";
            GpuOpCodes[GpuOpCodes["PROJ_PUT"] = 0x3F] = "PROJ_PUT";
            GpuOpCodes[GpuOpCodes["TMS"] = 0x40] = "TMS";
            GpuOpCodes[GpuOpCodes["TMATRIX"] = 0x41] = "TMATRIX";
            GpuOpCodes[GpuOpCodes["XSCALE"] = 0x42] = "XSCALE";
            GpuOpCodes[GpuOpCodes["YSCALE"] = 0x43] = "YSCALE";
            GpuOpCodes[GpuOpCodes["ZSCALE"] = 0x44] = "ZSCALE";
            GpuOpCodes[GpuOpCodes["XPOS"] = 0x45] = "XPOS";
            GpuOpCodes[GpuOpCodes["YPOS"] = 0x46] = "YPOS";
            GpuOpCodes[GpuOpCodes["ZPOS"] = 0x47] = "ZPOS";
            GpuOpCodes[GpuOpCodes["USCALE"] = 0x48] = "USCALE";
            GpuOpCodes[GpuOpCodes["VSCALE"] = 0x49] = "VSCALE";
            GpuOpCodes[GpuOpCodes["UOFFSET"] = 0x4A] = "UOFFSET";
            GpuOpCodes[GpuOpCodes["VOFFSET"] = 0x4B] = "VOFFSET";
            GpuOpCodes[GpuOpCodes["OFFSETX"] = 0x4C] = "OFFSETX";
            GpuOpCodes[GpuOpCodes["OFFSETY"] = 0x4D] = "OFFSETY";
            GpuOpCodes[GpuOpCodes["Unknown0x4E"] = 0x4E] = "Unknown0x4E";
            GpuOpCodes[GpuOpCodes["Unknown0x4F"] = 0x4F] = "Unknown0x4F";
            GpuOpCodes[GpuOpCodes["SHADE"] = 0x50] = "SHADE";
            GpuOpCodes[GpuOpCodes["RNORM"] = 0x51] = "RNORM";
            GpuOpCodes[GpuOpCodes["Unknown0x52"] = 0x52] = "Unknown0x52";
            GpuOpCodes[GpuOpCodes["CMAT"] = 0x53] = "CMAT";
            GpuOpCodes[GpuOpCodes["EMC"] = 0x54] = "EMC";
            GpuOpCodes[GpuOpCodes["AMC"] = 0x55] = "AMC";
            GpuOpCodes[GpuOpCodes["DMC"] = 0x56] = "DMC";
            GpuOpCodes[GpuOpCodes["SMC"] = 0x57] = "SMC";
            GpuOpCodes[GpuOpCodes["AMA"] = 0x58] = "AMA";
            GpuOpCodes[GpuOpCodes["Unknown0x59"] = 0x59] = "Unknown0x59";
            GpuOpCodes[GpuOpCodes["Unknown0x5A"] = 0x5A] = "Unknown0x5A";
            GpuOpCodes[GpuOpCodes["SPOW"] = 0x5B] = "SPOW";
            GpuOpCodes[GpuOpCodes["ALC"] = 0x5C] = "ALC";
            GpuOpCodes[GpuOpCodes["ALA"] = 0x5D] = "ALA";
            GpuOpCodes[GpuOpCodes["LMODE"] = 0x5E] = "LMODE";
            GpuOpCodes[GpuOpCodes["LT0"] = 0x5F] = "LT0";
            GpuOpCodes[GpuOpCodes["LT1"] = 0x60] = "LT1";
            GpuOpCodes[GpuOpCodes["LT2"] = 0x61] = "LT2";
            GpuOpCodes[GpuOpCodes["LT3"] = 0x62] = "LT3";
            GpuOpCodes[GpuOpCodes["LXP0"] = 0x63] = "LXP0";
            GpuOpCodes[GpuOpCodes["LYP0"] = 0x64] = "LYP0";
            GpuOpCodes[GpuOpCodes["LZP0"] = 0x65] = "LZP0";
            GpuOpCodes[GpuOpCodes["LXP1"] = 0x66] = "LXP1";
            GpuOpCodes[GpuOpCodes["LYP1"] = 0x67] = "LYP1";
            GpuOpCodes[GpuOpCodes["LZP1"] = 0x68] = "LZP1";
            GpuOpCodes[GpuOpCodes["LXP2"] = 0x69] = "LXP2";
            GpuOpCodes[GpuOpCodes["LYP2"] = 0x6A] = "LYP2";
            GpuOpCodes[GpuOpCodes["LZP2"] = 0x6B] = "LZP2";
            GpuOpCodes[GpuOpCodes["LXP3"] = 0x6C] = "LXP3";
            GpuOpCodes[GpuOpCodes["LYP3"] = 0x6D] = "LYP3";
            GpuOpCodes[GpuOpCodes["LZP3"] = 0x6E] = "LZP3";
            GpuOpCodes[GpuOpCodes["LXD0"] = 0x6F] = "LXD0";
            GpuOpCodes[GpuOpCodes["LYD0"] = 112] = "LYD0";
            GpuOpCodes[GpuOpCodes["LZD0"] = 113] = "LZD0";
            GpuOpCodes[GpuOpCodes["LXD1"] = 114] = "LXD1";
            GpuOpCodes[GpuOpCodes["LYD1"] = 115] = "LYD1";
            GpuOpCodes[GpuOpCodes["LZD1"] = 116] = "LZD1";
            GpuOpCodes[GpuOpCodes["LXD2"] = 117] = "LXD2";
            GpuOpCodes[GpuOpCodes["LYD2"] = 118] = "LYD2";
            GpuOpCodes[GpuOpCodes["LZD2"] = 119] = "LZD2";
            GpuOpCodes[GpuOpCodes["LXD3"] = 120] = "LXD3";
            GpuOpCodes[GpuOpCodes["LYD3"] = 121] = "LYD3";
            GpuOpCodes[GpuOpCodes["LZD3"] = 122] = "LZD3";
            GpuOpCodes[GpuOpCodes["LCA0"] = 123] = "LCA0";
            GpuOpCodes[GpuOpCodes["LLA0"] = 124] = "LLA0";
            GpuOpCodes[GpuOpCodes["LQA0"] = 125] = "LQA0";
            GpuOpCodes[GpuOpCodes["LCA1"] = 126] = "LCA1";
            GpuOpCodes[GpuOpCodes["LLA1"] = 127] = "LLA1";
            GpuOpCodes[GpuOpCodes["LQA1"] = 128] = "LQA1";
            GpuOpCodes[GpuOpCodes["LCA2"] = 129] = "LCA2";
            GpuOpCodes[GpuOpCodes["LLA2"] = 130] = "LLA2";
            GpuOpCodes[GpuOpCodes["LQA2"] = 131] = "LQA2";
            GpuOpCodes[GpuOpCodes["LCA3"] = 132] = "LCA3";
            GpuOpCodes[GpuOpCodes["LLA3"] = 133] = "LLA3";
            GpuOpCodes[GpuOpCodes["LQA3"] = 134] = "LQA3";
            GpuOpCodes[GpuOpCodes["SPOTEXP0"] = 135] = "SPOTEXP0";
            GpuOpCodes[GpuOpCodes["SPOTEXP1"] = 136] = "SPOTEXP1";
            GpuOpCodes[GpuOpCodes["SPOTEXP2"] = 137] = "SPOTEXP2";
            GpuOpCodes[GpuOpCodes["SPOTEXP3"] = 138] = "SPOTEXP3";
            GpuOpCodes[GpuOpCodes["SPOTCUT0"] = 139] = "SPOTCUT0";
            GpuOpCodes[GpuOpCodes["SPOTCUT1"] = 140] = "SPOTCUT1";
            GpuOpCodes[GpuOpCodes["SPOTCUT2"] = 141] = "SPOTCUT2";
            GpuOpCodes[GpuOpCodes["SPOTCUT3"] = 142] = "SPOTCUT3";
            GpuOpCodes[GpuOpCodes["ALC0"] = 143] = "ALC0";
            GpuOpCodes[GpuOpCodes["DLC0"] = 144] = "DLC0";
            GpuOpCodes[GpuOpCodes["SLC0"] = 145] = "SLC0";
            GpuOpCodes[GpuOpCodes["ALC1"] = 146] = "ALC1";
            GpuOpCodes[GpuOpCodes["DLC1"] = 147] = "DLC1";
            GpuOpCodes[GpuOpCodes["SLC1"] = 148] = "SLC1";
            GpuOpCodes[GpuOpCodes["ALC2"] = 149] = "ALC2";
            GpuOpCodes[GpuOpCodes["DLC2"] = 150] = "DLC2";
            GpuOpCodes[GpuOpCodes["SLC2"] = 151] = "SLC2";
            GpuOpCodes[GpuOpCodes["ALC3"] = 152] = "ALC3";
            GpuOpCodes[GpuOpCodes["DLC3"] = 153] = "DLC3";
            GpuOpCodes[GpuOpCodes["SLC3"] = 154] = "SLC3";
            GpuOpCodes[GpuOpCodes["FFACE"] = 155] = "FFACE";
            GpuOpCodes[GpuOpCodes["FBP"] = 156] = "FBP";
            GpuOpCodes[GpuOpCodes["FBW"] = 157] = "FBW";
            GpuOpCodes[GpuOpCodes["ZBP"] = 158] = "ZBP";
            GpuOpCodes[GpuOpCodes["ZBW"] = 159] = "ZBW";
            GpuOpCodes[GpuOpCodes["TBP0"] = 160] = "TBP0";
            GpuOpCodes[GpuOpCodes["TBP1"] = 161] = "TBP1";
            GpuOpCodes[GpuOpCodes["TBP2"] = 162] = "TBP2";
            GpuOpCodes[GpuOpCodes["TBP3"] = 163] = "TBP3";
            GpuOpCodes[GpuOpCodes["TBP4"] = 164] = "TBP4";
            GpuOpCodes[GpuOpCodes["TBP5"] = 165] = "TBP5";
            GpuOpCodes[GpuOpCodes["TBP6"] = 166] = "TBP6";
            GpuOpCodes[GpuOpCodes["TBP7"] = 167] = "TBP7";
            GpuOpCodes[GpuOpCodes["TBW0"] = 168] = "TBW0";
            GpuOpCodes[GpuOpCodes["TBW1"] = 169] = "TBW1";
            GpuOpCodes[GpuOpCodes["TBW2"] = 170] = "TBW2";
            GpuOpCodes[GpuOpCodes["TBW3"] = 171] = "TBW3";
            GpuOpCodes[GpuOpCodes["TBW4"] = 172] = "TBW4";
            GpuOpCodes[GpuOpCodes["TBW5"] = 173] = "TBW5";
            GpuOpCodes[GpuOpCodes["TBW6"] = 174] = "TBW6";
            GpuOpCodes[GpuOpCodes["TBW7"] = 175] = "TBW7";
            GpuOpCodes[GpuOpCodes["CBP"] = 176] = "CBP";
            GpuOpCodes[GpuOpCodes["CBPH"] = 177] = "CBPH";
            GpuOpCodes[GpuOpCodes["TRXSBP"] = 178] = "TRXSBP";
            GpuOpCodes[GpuOpCodes["TRXSBW"] = 179] = "TRXSBW";
            GpuOpCodes[GpuOpCodes["TRXDBP"] = 180] = "TRXDBP";
            GpuOpCodes[GpuOpCodes["TRXDBW"] = 181] = "TRXDBW";
            GpuOpCodes[GpuOpCodes["Unknown0xB6"] = 182] = "Unknown0xB6";
            GpuOpCodes[GpuOpCodes["Unknown0xB7"] = 183] = "Unknown0xB7";
            GpuOpCodes[GpuOpCodes["TSIZE0"] = 184] = "TSIZE0";
            GpuOpCodes[GpuOpCodes["TSIZE1"] = 185] = "TSIZE1";
            GpuOpCodes[GpuOpCodes["TSIZE2"] = 186] = "TSIZE2";
            GpuOpCodes[GpuOpCodes["TSIZE3"] = 187] = "TSIZE3";
            GpuOpCodes[GpuOpCodes["TSIZE4"] = 188] = "TSIZE4";
            GpuOpCodes[GpuOpCodes["TSIZE5"] = 189] = "TSIZE5";
            GpuOpCodes[GpuOpCodes["TSIZE6"] = 190] = "TSIZE6";
            GpuOpCodes[GpuOpCodes["TSIZE7"] = 191] = "TSIZE7";
            GpuOpCodes[GpuOpCodes["TMAP"] = 192] = "TMAP";
            GpuOpCodes[GpuOpCodes["TEXTURE_ENV_MAP_MATRIX"] = 193] = "TEXTURE_ENV_MAP_MATRIX";
            GpuOpCodes[GpuOpCodes["TMODE"] = 194] = "TMODE";
            GpuOpCodes[GpuOpCodes["TPSM"] = 195] = "TPSM";
            GpuOpCodes[GpuOpCodes["CLOAD"] = 196] = "CLOAD";
            GpuOpCodes[GpuOpCodes["CMODE"] = 197] = "CMODE";
            GpuOpCodes[GpuOpCodes["TFLT"] = 198] = "TFLT";
            GpuOpCodes[GpuOpCodes["TWRAP"] = 199] = "TWRAP";
            GpuOpCodes[GpuOpCodes["TBIAS"] = 200] = "TBIAS";
            GpuOpCodes[GpuOpCodes["TFUNC"] = 201] = "TFUNC";
            GpuOpCodes[GpuOpCodes["TEC"] = 202] = "TEC";
            GpuOpCodes[GpuOpCodes["TFLUSH"] = 203] = "TFLUSH";
            GpuOpCodes[GpuOpCodes["TSYNC"] = 204] = "TSYNC";
            GpuOpCodes[GpuOpCodes["FFAR"] = 205] = "FFAR";
            GpuOpCodes[GpuOpCodes["FDIST"] = 206] = "FDIST";
            GpuOpCodes[GpuOpCodes["FCOL"] = 207] = "FCOL";
            GpuOpCodes[GpuOpCodes["TSLOPE"] = 208] = "TSLOPE";
            GpuOpCodes[GpuOpCodes["Unknown0xD1"] = 209] = "Unknown0xD1";
            GpuOpCodes[GpuOpCodes["PSM"] = 210] = "PSM";
            GpuOpCodes[GpuOpCodes["CLEAR"] = 211] = "CLEAR";
            GpuOpCodes[GpuOpCodes["SCISSOR1"] = 212] = "SCISSOR1";
            GpuOpCodes[GpuOpCodes["SCISSOR2"] = 213] = "SCISSOR2";
            GpuOpCodes[GpuOpCodes["NEARZ"] = 214] = "NEARZ";
            GpuOpCodes[GpuOpCodes["FARZ"] = 215] = "FARZ";
            GpuOpCodes[GpuOpCodes["CTST"] = 216] = "CTST";
            GpuOpCodes[GpuOpCodes["CREF"] = 217] = "CREF";
            GpuOpCodes[GpuOpCodes["CMSK"] = 218] = "CMSK";
            GpuOpCodes[GpuOpCodes["ATST"] = 219] = "ATST";
            GpuOpCodes[GpuOpCodes["STST"] = 220] = "STST";
            GpuOpCodes[GpuOpCodes["SOP"] = 221] = "SOP";
            GpuOpCodes[GpuOpCodes["ZTST"] = 222] = "ZTST";
            GpuOpCodes[GpuOpCodes["ALPHA"] = 223] = "ALPHA";
            GpuOpCodes[GpuOpCodes["SFIX"] = 224] = "SFIX";
            GpuOpCodes[GpuOpCodes["DFIX"] = 225] = "DFIX";
            GpuOpCodes[GpuOpCodes["DTH0"] = 226] = "DTH0";
            GpuOpCodes[GpuOpCodes["DTH1"] = 227] = "DTH1";
            GpuOpCodes[GpuOpCodes["DTH2"] = 228] = "DTH2";
            GpuOpCodes[GpuOpCodes["DTH3"] = 229] = "DTH3";
            GpuOpCodes[GpuOpCodes["LOP"] = 230] = "LOP";
            GpuOpCodes[GpuOpCodes["ZMSK"] = 231] = "ZMSK";
            GpuOpCodes[GpuOpCodes["PMSKC"] = 232] = "PMSKC";
            GpuOpCodes[GpuOpCodes["PMSKA"] = 233] = "PMSKA";
            GpuOpCodes[GpuOpCodes["TRXKICK"] = 234] = "TRXKICK";
            GpuOpCodes[GpuOpCodes["TRXSPOS"] = 235] = "TRXSPOS";
            GpuOpCodes[GpuOpCodes["TRXDPOS"] = 236] = "TRXDPOS";
            GpuOpCodes[GpuOpCodes["Unknown0xED"] = 237] = "Unknown0xED";
            GpuOpCodes[GpuOpCodes["TRXSIZE"] = 238] = "TRXSIZE";
            GpuOpCodes[GpuOpCodes["Unknown0xEF"] = 239] = "Unknown0xEF";
            GpuOpCodes[GpuOpCodes["Unknown0xF0"] = 240] = "Unknown0xF0";
            GpuOpCodes[GpuOpCodes["Unknown0xF1"] = 241] = "Unknown0xF1";
            GpuOpCodes[GpuOpCodes["Unknown0xF2"] = 242] = "Unknown0xF2";
            GpuOpCodes[GpuOpCodes["Unknown0xF3"] = 243] = "Unknown0xF3";
            GpuOpCodes[GpuOpCodes["Unknown0xF4"] = 244] = "Unknown0xF4";
            GpuOpCodes[GpuOpCodes["Unknown0xF5"] = 245] = "Unknown0xF5";
            GpuOpCodes[GpuOpCodes["Unknown0xF6"] = 246] = "Unknown0xF6";
            GpuOpCodes[GpuOpCodes["Unknown0xF7"] = 247] = "Unknown0xF7";
            GpuOpCodes[GpuOpCodes["Unknown0xF8"] = 248] = "Unknown0xF8";
            GpuOpCodes[GpuOpCodes["Unknown0xF9"] = 249] = "Unknown0xF9";
            GpuOpCodes[GpuOpCodes["Unknown0xFA"] = 250] = "Unknown0xFA";
            GpuOpCodes[GpuOpCodes["Unknown0xFB"] = 251] = "Unknown0xFB";
            GpuOpCodes[GpuOpCodes["Unknown0xFC"] = 252] = "Unknown0xFC";
            GpuOpCodes[GpuOpCodes["Unknown0xFD"] = 253] = "Unknown0xFD";
            GpuOpCodes[GpuOpCodes["Unknown0xFE"] = 254] = "Unknown0xFE";
            GpuOpCodes[GpuOpCodes["Dummy"] = 255] = "Dummy";
        })(gpu.GpuOpCodes || (gpu.GpuOpCodes = {}));
        var GpuOpCodes = gpu.GpuOpCodes;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var Memory = (function () {
        function Memory() {
            this.buffer = new ArrayBuffer(0x10000000);
            this.data = new DataView(this.buffer);
            this.s8 = new Int8Array(this.buffer);
            this.u8 = new Uint8Array(this.buffer);
            this.u16 = new Uint16Array(this.buffer);
            this.s16 = new Int16Array(this.buffer);
            this.u32 = new Uint32Array(this.buffer);
            this.f32 = new Float32Array(this.buffer);
        }
        Memory.prototype.reset = function () {
            this.memset(Memory.DEFAULT_FRAME_ADDRESS, 0, 0x200000);
        };

        Memory.prototype.getPointerDataView = function (address, size) {
            return new DataView(this.buffer, address & Memory.MASK, size);
        };

        Memory.prototype.getPointerStream = function (address, size) {
            if (address == 0)
                return null;
            return new Stream(this.getPointerDataView(address, size));
        };

        Memory.prototype.writeInt8 = function (address, value) {
            this.u8[(address >> 0) & Memory.MASK] = value;
        };
        Memory.prototype.readInt8 = function (address) {
            return this.s8[(address >> 0) & Memory.MASK];
        };
        Memory.prototype.readUInt8 = function (address) {
            return this.u8[(address >> 0) & Memory.MASK];
        };

        Memory.prototype.writeInt16 = function (address, value) {
            this.u16[(address >> 1) & Memory.MASK] = value;
        };
        Memory.prototype.readInt16 = function (address) {
            return this.s16[(address >> 1) & Memory.MASK];
        };
        Memory.prototype.readUInt16 = function (address) {
            return this.u16[(address >> 1) & Memory.MASK];
        };

        Memory.prototype.writeInt32 = function (address, value) {
            this.u32[(address >> 2) & Memory.MASK] = value;
        };
        Memory.prototype.readInt32 = function (address) {
            return this.u32[(address >> 2) & Memory.MASK];
        };
        Memory.prototype.readUInt32 = function (address) {
            return this.u32[(address >> 2) & Memory.MASK];
        };

        Memory.prototype.writeFloat32 = function (address, value) {
            this.f32[(address >> 2) & Memory.MASK] = value;
        };
        Memory.prototype.readFloat32 = function (address) {
            return this.f32[(address >> 2) & Memory.MASK];
        };

        Memory.prototype.writeBytes = function (address, data) {
            Memory.memoryCopy(data, 0, this.buffer, address & Memory.MASK, data.byteLength);
        };

        Memory.prototype.readBytes = function (address, length) {
            return new Uint8Array(this.buffer, address, length);
        };

        Memory.prototype.writeStream = function (address, stream) {
            stream = stream.sliceWithLength(0, stream.length);
            while (stream.available > 0) {
                this.writeInt8(address++, stream.readUInt8());
            }
        };

        Memory.prototype.readStringz = function (address) {
            var out = '';
            while (true) {
                var char = this.readUInt8(address++);
                if (char == 0)
                    break;
                out += String.fromCharCode(char);
            }
            return out;
        };

        Memory.prototype.sliceWithBounds = function (low, high) {
            return new Stream(new DataView(this.buffer, low & Memory.MASK, high - low));
        };

        Memory.prototype.sliceWithSize = function (address, size) {
            return new Stream(new DataView(this.buffer, address & Memory.MASK, size));
        };

        Memory.prototype.copy = function (from, to, length) {
            from &= Memory.MASK;
            to &= Memory.MASK;
            for (var n = 0; n < length; n++) {
                this.u8[to + n] = this.u8[from + n];
            }
        };

        Memory.prototype.memset = function (address, value, length) {
            address &= Memory.MASK;
            for (var n = 0; n < length; n++) {
                this.u8[address + n] = value;
            }
        };

        Memory.memoryCopy = function (source, sourcePosition, destination, destinationPosition, length) {
            var _source = new Uint8Array(source, sourcePosition, length);
            var _destination = new Uint8Array(destination, destinationPosition, length);
            _destination.set(_source);
        };
        Memory.DEFAULT_FRAME_ADDRESS = 0x04000000;

        Memory.MASK = 0x0FFFFFFF;
        Memory.MAIN_OFFSET = 0x08000000;
        return Memory;
    })();
    core.Memory = Memory;
})(core || (core = {}));
///<reference path="./memory.ts" />
///<reference path="../util/utils.ts" />
var core;
(function (core) {
    (function (gpu) {
        var VertexBuffer = (function () {
            function VertexBuffer() {
                this.vertices = [];
                for (var n = 0; n < 1024; n++)
                    this.vertices[n] = new core.gpu.Vertex();
            }
            return VertexBuffer;
        })();

        var VertexReaderFactory = (function () {
            function VertexReaderFactory() {
            }
            VertexReaderFactory.get = function (vertexState) {
                var cacheId = vertexState.hash;
                var vertexReader = this.cache[cacheId];
                if (vertexReader !== undefined)
                    return vertexReader;
                return this.cache[cacheId] = new VertexReader(vertexState);
            };
            VertexReaderFactory.cache = {};
            return VertexReaderFactory;
        })();
        gpu.VertexReaderFactory = VertexReaderFactory;

        var VertexReader = (function () {
            function VertexReader(vertexState) {
                this.vertexState = vertexState;
                this.readOffset = 0;
                this.readCode = this.createJs();
                this.readOneFunc = (new Function('output', 'input', 'inputOffset', this.readCode));
            }
            VertexReader.prototype.readCount = function (output, input, count) {
                var inputOffset = 0;
                for (var n = 0; n < count; n++) {
                    this.readOneFunc(output[n], input, inputOffset);
                    inputOffset += this.vertexState.size;
                }
            };

            VertexReader.prototype.read = function (output, input, inputOffset) {
                this.readOneFunc(output, input, inputOffset);
            };

            VertexReader.prototype.createJs = function () {
                var indentStringGenerator = new IndentStringGenerator();

                this.readOffset = 0;

                this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, !this.vertexState.transform2D);
                this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, !this.vertexState.transform2D);
                this.createColorJs(indentStringGenerator, this.vertexState.color);
                this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, !this.vertexState.transform2D);
                this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, !this.vertexState.transform2D);

                return indentStringGenerator.output;
            };

            VertexReader.prototype.createColorJs = function (indentStringGenerator, type) {
                if (type == 0 /* Void */)
                    return;

                switch (type) {
                    case 7 /* Color8888 */:
                        this.align(4);
                        indentStringGenerator.write('output.r = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
                        indentStringGenerator.write('output.g = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
                        indentStringGenerator.write('output.b = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
                        indentStringGenerator.write('output.a = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
                        break;
                    default:
                        throw ("Not implemented color format");
                }
            };

            VertexReader.prototype.align = function (count) {
                this.readOffset = MathUtils.nextAligned(this.readOffset, count);
            };

            VertexReader.prototype.getOffsetAlignAndIncrement = function (size) {
                this.align(size);
                var offset = this.readOffset;
                this.readOffset += size;
                return offset;
            };

            VertexReader.prototype.createNumberJs = function (indentStringGenerator, components, type, normalize) {
                var _this = this;
                if (type == 0 /* Void */)
                    return;

                components.forEach(function (component) {
                    switch (type) {
                        case 1 /* Byte */:
                            indentStringGenerator.write('output.' + component + ' = (input.getInt8(inputOffset + ' + _this.getOffsetAlignAndIncrement(1) + ')');
                            if (normalize)
                                indentStringGenerator.write(' / 127.0');
                            break;
                        case 2 /* Short */:
                            indentStringGenerator.write('output.' + component + ' = (input.getInt16(inputOffset + ' + _this.getOffsetAlignAndIncrement(2) + ', true)');
                            if (normalize)
                                indentStringGenerator.write(' / 32767.0');
                            break;
                        case 3 /* Float */:
                            indentStringGenerator.write('output.' + component + ' = (input.getFloat32(inputOffset + ' + _this.getOffsetAlignAndIncrement(4) + ', true)');
                            break;
                    }
                    indentStringGenerator.write(');\n');
                });
            };
            return VertexReader;
        })();
        gpu.VertexReader = VertexReader;

        var vertexBuffer = new VertexBuffer();
        var singleCallTest = false;

        var PspGpuList = (function () {
            function PspGpuList(id, memory, drawDriver, runner) {
                this.id = id;
                this.memory = memory;
                this.drawDriver = drawDriver;
                this.runner = runner;
                this.completed = false;
                this.state = new core.gpu.GpuState();
                this.errorCount = 0;
            }
            PspGpuList.prototype.complete = function () {
                this.completed = true;
                this.runner.deallocate(this);
                this.promiseResolve(0);
            };

            PspGpuList.prototype.jumpRelativeOffset = function (offset) {
                this.current = this.state.baseAddress + offset;
            };

            PspGpuList.prototype.runInstruction = function (current, instruction) {
                var op = instruction >>> 24;
                var params24 = instruction & 0xFFFFFF;

                switch (op) {
                    case 2 /* IADDR */:
                        this.state.indexAddress = params24;
                        break;
                    case 19 /* OFFSET_ADDR */:
                        this.state.baseOffset = (params24 << 8);
                        break;
                    case 156 /* FBP */:
                        this.state.frameBuffer.lowAddress = params24;
                        break;
                    case 21 /* REGION1 */:
                        this.state.viewPort.x1 = BitUtils.extract(params24, 0, 10);
                        this.state.viewPort.y1 = BitUtils.extract(params24, 10, 10);
                        break;
                    case 22 /* REGION2 */:
                        this.state.viewPort.x2 = BitUtils.extract(params24, 0, 10);
                        this.state.viewPort.y2 = BitUtils.extract(params24, 10, 10);
                        break;
                    case 157 /* FBW */:
                        this.state.frameBuffer.highAddress = BitUtils.extract(params24, 16, 8);
                        this.state.frameBuffer.width = BitUtils.extract(params24, 0, 16);
                        break;
                    case 23 /* LTE */:
                        this.state.lightning.enabled = params24 != 0;
                        break;
                    case 24 /* LTE0 */:
                        this.state.lightning.lights[0].enabled = params24 != 0;
                        break;
                    case 25 /* LTE1 */:
                        this.state.lightning.lights[1].enabled = params24 != 0;
                        break;
                    case 26 /* LTE2 */:
                        this.state.lightning.lights[2].enabled = params24 != 0;
                        break;
                    case 27 /* LTE3 */:
                        this.state.lightning.lights[3].enabled = params24 != 0;
                        break;
                    case 16 /* BASE */:
                        this.state.baseAddress = ((params24 << 8) & 0xff000000);
                        break;
                    case 8 /* JUMP */:
                        this.jumpRelativeOffset(params24 & ~3);
                        break;
                    case 0 /* NOP */:
                        break;
                    case 18 /* VTYPE */:
                        this.state.vertex.value = params24;
                        break;
                    case 1 /* VADDR */:
                        this.state.vertex.address = params24;
                        break;
                    case 194 /* TMODE */:
                        this.state.texture.swizzled = BitUtils.extract(params24, 0, 8) != 0;
                        this.state.texture.mipmapShareClut = BitUtils.extract(params24, 8, 8) != 0;
                        this.state.texture.mipmapMaxLevel = BitUtils.extract(params24, 16, 8);
                        break;
                    case 198 /* TFLT */:
                        this.state.texture.filterMinification = BitUtils.extract(params24, 0, 8);
                        this.state.texture.filterMagnification = BitUtils.extract(params24, 8, 8);
                        break;
                    case 199 /* TWRAP */:
                        this.state.texture.wrapU = BitUtils.extract(params24, 0, 8);
                        this.state.texture.wrapV = BitUtils.extract(params24, 8, 8);
                        break;

                    case 30 /* TME */:
                        this.state.texture.enabled = (params24 != 0);
                        break;

                    case 202 /* TEC */:
                        this.state.texture.envColor.r = BitUtils.extractScale(params24, 0, 8, 1);
                        this.state.texture.envColor.g = BitUtils.extractScale(params24, 8, 8, 1);
                        this.state.texture.envColor.b = BitUtils.extractScale(params24, 16, 8, 1);
                        break;

                    case 201 /* TFUNC */:
                        this.state.texture.effect = BitUtils.extract(params24, 0, 8);
                        this.state.texture.colorComponent = BitUtils.extract(params24, 8, 8);
                        this.state.texture.fragment2X = (BitUtils.extract(params24, 16, 8) != 0);
                        break;
                    case 74 /* UOFFSET */:
                        this.state.texture.offsetU = MathFloat.reinterpretIntAsFloat(params24 << 8);
                        break;
                    case 75 /* VOFFSET */:
                        this.state.texture.offsetV = MathFloat.reinterpretIntAsFloat(params24 << 8);
                        break;

                    case 72 /* USCALE */:
                        this.state.texture.scaleU = MathFloat.reinterpretIntAsFloat(params24 << 8);
                        break;
                    case 73 /* VSCALE */:
                        this.state.texture.scaleV = MathFloat.reinterpretIntAsFloat(params24 << 8);
                        break;

                    case 203 /* TFLUSH */:
                        this.drawDriver.textureFlush(this.state);
                        break;
                    case 195 /* TPSM */:
                        this.state.texture.pixelFormat = BitUtils.extract(params24, 0, 4);
                        break;

                    case 184 /* TSIZE0 */:
                    case 185 /* TSIZE1 */:
                    case 186 /* TSIZE2 */:
                    case 187 /* TSIZE3 */:
                    case 188 /* TSIZE4 */:
                    case 189 /* TSIZE5 */:
                    case 190 /* TSIZE6 */:
                    case 191 /* TSIZE7 */:
                        var mipMap = this.state.texture.mipmaps[op - 184 /* TSIZE0 */];
                        var WidthExp = BitUtils.extract(params24, 0, 4);
                        var HeightExp = BitUtils.extract(params24, 8, 4);
                        var UnknownFlag = (BitUtils.extract(params24, 15, 1) != 0);
                        WidthExp = Math.min(WidthExp, 9);
                        HeightExp = Math.min(HeightExp, 9);
                        mipMap.textureWidth = 1 << WidthExp;
                        mipMap.textureHeight = 1 << HeightExp;

                        break;

                    case 160 /* TBP0 */:
                    case 161 /* TBP1 */:
                    case 162 /* TBP2 */:
                    case 163 /* TBP3 */:
                    case 164 /* TBP4 */:
                    case 165 /* TBP5 */:
                    case 166 /* TBP6 */:
                    case 167 /* TBP7 */:
                        var mipMap = this.state.texture.mipmaps[op - 160 /* TBP0 */];
                        mipMap.address = (mipMap.address & 0xFF000000) | (params24 & 0x00FFFFFF);
                        break;

                    case 168 /* TBW0 */:
                    case 169 /* TBW1 */:
                    case 170 /* TBW2 */:
                    case 171 /* TBW3 */:
                    case 172 /* TBW4 */:
                    case 173 /* TBW5 */:
                    case 174 /* TBW6 */:
                    case 175 /* TBW7 */:
                        var mipMap = this.state.texture.mipmaps[op - 168 /* TBW0 */];
                        mipMap.bufferWidth = BitUtils.extract(params24, 0, 16);
                        mipMap.address = (mipMap.address & 0x00FFFFFF) | ((BitUtils.extract(params24, 16, 8) << 24) & 0xFF000000);
                        break;

                    case 176 /* CBP */:
                        this.state.texture.clut.adress = (this.state.texture.clut.adress & 0xFF000000) | ((params24 << 0) & 0x00FFFFFF);
                        break;

                    case 177 /* CBPH */:
                        this.state.texture.clut.adress = (this.state.texture.clut.adress & 0x00FFFFFF) | ((params24 << 8) & 0xFF000000);
                        break;

                    case 196 /* CLOAD */:
                        this.state.texture.clut.numberOfColors = BitUtils.extract(params24, 0, 8) * 8;
                        break;

                    case 197 /* CMODE */:
                        this.state.texture.clut.pixelFormat = BitUtils.extract(params24, 0, 2);
                        this.state.texture.clut.shift = BitUtils.extract(params24, 2, 5);
                        this.state.texture.clut.mask = BitUtils.extract(params24, 8, 8);
                        this.state.texture.clut.start = BitUtils.extract(params24, 16, 5);
                        break;

                    case 62 /* PROJ_START */:
                        this.state.projectionMatrix.reset(params24);
                        break;
                    case 63 /* PROJ_PUT */:
                        this.state.projectionMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8));
                        break;

                    case 60 /* VIEW_START */:
                        this.state.viewMatrix.reset(params24);
                        break;
                    case 61 /* VIEW_PUT */:
                        this.state.viewMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8));
                        break;

                    case 58 /* WORLD_START */:
                        this.state.worldMatrix.reset(params24);
                        break;
                    case 59 /* WORLD_PUT */:
                        this.state.worldMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8));
                        break;

                    case 211 /* CLEAR */:
                        this.state.clearing = (BitUtils.extract(params24, 0, 1) != 0);
                        this.state.clearFlags = BitUtils.extract(params24, 8, 8);
                        this.drawDriver.setClearMode(this.state.clearing, this.state.clearFlags);
                        break;

                    case 29 /* BCE */:
                        this.state.culling.enabled = (params24 != 0);
                    case 155 /* FFACE */:
                        this.state.culling.direction = params24; // FrontFaceDirectionEnum
                        break;

                    case 4 /* PRIM */:
                        //console.log('GPU PRIM');
                        var primitiveType = BitUtils.extractEnum(params24, 16, 3);
                        var vertexCount = BitUtils.extract(params24, 0, 16);
                        var vertexState = this.state.vertex;
                        var vertexSize = this.state.vertex.size;
                        var vertexAddress = this.state.baseAddress + this.state.vertex.address;
                        var vertexReader = VertexReaderFactory.get(vertexState);
                        var vertexInput = this.memory.getPointerDataView(vertexAddress);
                        var vertices = vertexBuffer.vertices;
                        vertexReader.readCount(vertices, vertexInput, vertexCount);

                        this.drawDriver.setMatrices(this.state.projectionMatrix, this.state.viewMatrix, this.state.worldMatrix);
                        this.drawDriver.setState(this.state);

                        if (this.errorCount < 400) {
                            //console.log('PRIM:' + primitiveType + ' : ' + vertexCount + ':' + vertexState.hasIndex);
                        }

                        this.drawDriver.drawElements(primitiveType, vertices, vertexCount, vertexState);

                        break;

                    case 15 /* FINISH */:
                        break;

                    case 12 /* END */:
                        this.complete();
                        return true;
                        break;

                    default:
                        //setTimeout(() => this.complete(), 50);
                        this.errorCount++;
                        if (this.errorCount >= 400) {
                            if (this.errorCount == 400) {
                                console.error(sprintf('Stop showing gpu errors'));
                            }
                        } else {
                            //console.error(sprintf('Not implemented gpu opcode 0x%02X : %s', op, GpuOpCodes[op]));
                        }
                }

                return false;
            };

            Object.defineProperty(PspGpuList.prototype, "hasMoreInstructions", {
                get: function () {
                    return !this.completed && ((this.stall == 0) || (this.current < this.stall));
                },
                enumerable: true,
                configurable: true
            });

            PspGpuList.prototype.runUntilStall = function () {
                while (this.hasMoreInstructions) {
                    var instruction = this.memory.readUInt32(this.current);
                    this.current += 4;
                    if (this.runInstruction(this.current - 4, instruction))
                        return;
                }
            };

            PspGpuList.prototype.enqueueRunUntilStall = function () {
                var _this = this;
                setImmediate(function () {
                    _this.runUntilStall();
                });
            };

            PspGpuList.prototype.updateStall = function (stall) {
                this.stall = stall;
                this.enqueueRunUntilStall();
            };

            PspGpuList.prototype.start = function () {
                var _this = this;
                this.promise = new Promise(function (resolve, reject) {
                    _this.promiseResolve = resolve;
                    _this.promiseReject = reject;
                });
                this.completed = false;

                this.enqueueRunUntilStall();
            };

            PspGpuList.prototype.waitAsync = function () {
                return this.promise;
            };
            return PspGpuList;
        })();

        (function (CullingDirection) {
            CullingDirection[CullingDirection["CounterClockWise"] = 0] = "CounterClockWise";
            CullingDirection[CullingDirection["ClockWise"] = 1] = "ClockWise";
        })(gpu.CullingDirection || (gpu.CullingDirection = {}));
        var CullingDirection = gpu.CullingDirection;

        var PspGpuListRunner = (function () {
            function PspGpuListRunner(memory, drawDriver) {
                this.memory = memory;
                this.drawDriver = drawDriver;
                this.lists = [];
                this.freeLists = [];
                this.runningLists = [];
                for (var n = 0; n < 32; n++) {
                    var list = new PspGpuList(n, memory, drawDriver, this);
                    this.lists.push(list);
                    this.freeLists.push(list);
                }
            }
            PspGpuListRunner.prototype.allocate = function () {
                if (!this.freeLists.length)
                    throw ('Out of gpu free lists');
                var list = this.freeLists.pop();
                this.runningLists.push(list);
                return list;
            };

            PspGpuListRunner.prototype.getById = function (id) {
                return this.lists[id];
            };

            PspGpuListRunner.prototype.deallocate = function (list) {
                this.freeLists.push(list);
                this.runningLists.remove(list);
            };

            PspGpuListRunner.prototype.waitAsync = function () {
                return Promise.all(this.runningLists.map(function (list) {
                    return list.waitAsync();
                })).then(function () {
                    return 0;
                });
            };
            return PspGpuListRunner;
        })();

        var PspGpu = (function () {
            function PspGpu(memory, canvas) {
                this.memory = memory;
                this.canvas = canvas;
                this.driver = new core.gpu.impl.WebGlPspDrawDriver(memory, canvas);

                //this.driver = new Context2dPspDrawDriver(memory, canvas);
                this.listRunner = new PspGpuListRunner(memory, this.driver);
            }
            PspGpu.prototype.startAsync = function () {
                return this.driver.initAsync();
            };

            PspGpu.prototype.stopAsync = function () {
                return Promise.resolve();
            };

            PspGpu.prototype.listEnqueue = function (start, stall, callbackId, argsPtr) {
                var list = this.listRunner.allocate();
                list.current = start;
                list.stall = stall;
                list.callbackId = callbackId;
                list.start();
                return list.id;
            };

            PspGpu.prototype.listSync = function (displayListId, syncType) {
                //console.log('listSync');
                return this.listRunner.getById(displayListId).waitAsync();
            };

            PspGpu.prototype.updateStallAddr = function (displayListId, stall) {
                this.listRunner.getById(displayListId).updateStall(stall);
                return 0;
            };

            PspGpu.prototype.drawSync = function (syncType) {
                //console.log('drawSync');
                return this.listRunner.waitAsync();
            };
            return PspGpu;
        })();
        gpu.PspGpu = PspGpu;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var PspRtc = (function () {
        function PspRtc() {
        }
        PspRtc.prototype.getTime = function () {
            //window.performance.now()
        };
        return PspRtc;
    })();
})(core || (core = {}));
var EmulatorContext = (function () {
    function EmulatorContext() {
    }
    EmulatorContext.prototype.init = function (display, controller, gpu, memoryManager, threadManager, audio, memory, instructionCache, fileManager) {
        this.display = display;
        this.controller = controller;
        this.gpu = gpu;
        this.memoryManager = memoryManager;
        this.threadManager = threadManager;
        this.audio = audio;
        this.memory = memory;
        this.instructionCache = instructionCache;
        this.fileManager = fileManager;
    };
    return EmulatorContext;
})();

var CpuBreakException = (function () {
    function CpuBreakException(name, message) {
        if (typeof name === "undefined") { name = 'CpuBreakException'; }
        if (typeof message === "undefined") { message = 'CpuBreakException'; }
        this.name = name;
        this.message = message;
    }
    return CpuBreakException;
})();

var FunctionGenerator = (function () {
    function FunctionGenerator(memory) {
        this.memory = memory;
        this.instructions = core.cpu.Instructions.instance;
        this.instructionAst = new core.cpu.ast.InstructionAst();
    }
    FunctionGenerator.prototype.decodeInstruction = function (address) {
        var instruction = core.cpu.Instruction.fromMemoryAndPC(this.memory, address);
        var instructionType = this.getInstructionType(instruction);
        return new core.cpu.DecodedInstruction(instruction, instructionType);
    };

    FunctionGenerator.prototype.getInstructionType = function (i) {
        return this.instructions.findByData(i.data, i.PC);
    };

    FunctionGenerator.prototype.generateInstructionAstNode = function (di) {
        var instruction = di.instruction;
        var instructionType = di.type;
        var func = this.instructionAst[instructionType.name];
        if (func === undefined)
            throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
        return func.call(this.instructionAst, instruction);
    };

    FunctionGenerator.prototype.create = function (address) {
        var _this = this;
        if (address == 0x00000000) {
            throw (new Error("Trying to execute 0x00000000"));
        }

        var ast = new MipsAstBuilder();

        var PC = address;
        var stms = [ast.functionPrefix()];

        var emitInstruction = function () {
            var result = _this.generateInstructionAstNode(_this.decodeInstruction(PC));
            PC += 4;
            return result;
        };

        for (var n = 0; n < 100000; n++) {
            var di = this.decodeInstruction(PC + 0);

            //console.log(di);
            if (PC == 0x089005D0) {
                //stms.push(ast.debugger());
            }

            if (di.type.hasDelayedBranch) {
                var di2 = this.decodeInstruction(PC + 4);

                stms.push(emitInstruction());

                var delayedSlotInstruction = emitInstruction();
                if (di2.type.isSyscall) {
                    stms.push(this.instructionAst._postBranch(PC));
                    stms.push(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                } else {
                    stms.push(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                    stms.push(this.instructionAst._postBranch(PC));
                }

                break;
            } else {
                if (di.type.isSyscall) {
                    stms.push(this.instructionAst._storePC(PC + 4));
                }
                stms.push(emitInstruction());
                if (di.type.isBreak) {
                    break;
                }
            }
        }

        //console.debug(sprintf("// function_%08X:\n%s", address, ast.stms(stms).toJs()));
        if (n >= 100000)
            throw (new Error(sprintf("Too large function PC=%08X", address)));

        return new Function('state', ast.stms(stms).toJs());
    };
    return FunctionGenerator;
})();

var CpuSpecialAddresses;
(function (CpuSpecialAddresses) {
    CpuSpecialAddresses[CpuSpecialAddresses["EXIT_THREAD"] = 0x0FFFFFFF] = "EXIT_THREAD";
})(CpuSpecialAddresses || (CpuSpecialAddresses = {}));

var InstructionCache = (function () {
    function InstructionCache(memory) {
        this.memory = memory;
        this.cache = {};
        this.functionGenerator = new FunctionGenerator(memory);
    }
    InstructionCache.prototype.invalidateRange = function (from, to) {
        for (var n = from; n < to; n += 4)
            delete this.cache[n];
    };

    InstructionCache.prototype.getFunction = function (address) {
        var item = this.cache[address];
        if (item)
            return item;

        switch (address) {
            case 268435455 /* EXIT_THREAD */:
                return this.cache[address] = function (state) {
                    console.log(state);
                    console.log(state.thread);
                    console.warn('Thread: CpuSpecialAddresses.EXIT_THREAD: ' + state.thread.name);
                    state.thread.stop();
                    throw (new CpuBreakException());
                };
                break;
            default:
                return this.cache[address] = this.functionGenerator.create(address);
        }
    };
    return InstructionCache;
})();

var ProgramExecutor = (function () {
    function ProgramExecutor(state, instructionCache) {
        this.state = state;
        this.instructionCache = instructionCache;
        this.lastPC = 0;
    }
    ProgramExecutor.prototype.executeStep = function () {
        if (this.state.PC == 0) {
            console.error(sprintf("Calling 0x%08X from 0x%08X", this.state.PC, this.lastPC));
        }
        this.lastPC = this.state.PC;
        var func = this.instructionCache.getFunction(this.state.PC);
        func(this.state);
    };

    ProgramExecutor.prototype.execute = function (maxIterations) {
        if (typeof maxIterations === "undefined") { maxIterations = -1; }
        try  {
            while (maxIterations != 0) {
                this.executeStep();
                if (maxIterations > 0)
                    maxIterations--;
            }
        } catch (e) {
            if (!(e instanceof CpuBreakException)) {
                console.log(this.state);
                throw (e);
            }
        }
    };
    return ProgramExecutor;
})();
///<reference path="../util/utils.ts" />
///<reference path="./cpu/state.ts" />
///<reference path="../cpu.ts" />
var core;
(function (core) {
    var NativeFunction = (function () {
        function NativeFunction() {
        }
        return NativeFunction;
    })();
    core.NativeFunction = NativeFunction;

    var SyscallManager = (function () {
        function SyscallManager(context) {
            this.context = context;
            this.calls = {};
            this.lastId = 1;
        }
        SyscallManager.prototype.register = function (nativeFunction) {
            return this.registerWithId(this.lastId++, nativeFunction);
        };

        SyscallManager.prototype.registerWithId = function (id, nativeFunction) {
            this.calls[id] = nativeFunction;
            return id;
        };

        SyscallManager.prototype.call = function (state, id) {
            var nativeFunction = this.calls[id];
            if (!nativeFunction)
                throw (sprintf("Can't call syscall %s: 0x%06X", id));

            //printf('calling syscall 0x%04X : %s', id, nativeFunction.name);
            nativeFunction.call(this.context, state);
        };
        return SyscallManager;
    })();
    core.SyscallManager = SyscallManager;
})(core || (core = {}));
var format;
(function (format) {
    (function (cso) {
        var CSO_MAGIC = 'CISO';

        var Header = (function () {
            function Header() {
            }
            Object.defineProperty(Header.prototype, "numberOfBlocks", {
                get: function () {
                    return Math.floor(this.totalBytes / this.blockSize);
                },
                enumerable: true,
                configurable: true
            });

            Header.struct = StructClass.create(Header, [
                { type: Stringz(4), name: "magic" },
                { type: UInt32, name: "headerSize" },
                { type: Int64, name: "totalBytes" },
                { type: UInt32, name: "blockSize" },
                { type: UInt8, name: "version" },
                { type: UInt8, name: "alignment" },
                { type: UInt16, name: "reserved" }
            ]);
            return Header;
        })();

        var Cso = (function () {
            function Cso() {
            }
            Cso.fromStreamAsync = function (stream) {
                return new Cso().loadAsync(stream);
            };

            Object.defineProperty(Cso.prototype, "name", {
                get: function () {
                    return this.stream.name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Cso.prototype, "size", {
                get: function () {
                    return this.header.totalBytes;
                },
                enumerable: true,
                configurable: true
            });

            Cso.prototype.decodeBlockAsync = function (index) {
                var _this = this;
                if (this.cachedBlockIndex == index)
                    return Promise.resolve(this.cachedBlockData);
                this.cachedBlockIndex = index;
                var compressed = ((this.offsets[index + 0] & 0x80000000) == 0);
                var low = this.offsets[index + 0] & 0x7FFFFFFF;
                var high = this.offsets[index + 1] & 0x7FFFFFFF;
                return this.stream.readChunkAsync(low, high - low).then(function (data) {
                    return _this.cachedBlockData = (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
                }).catch(function (e) {
                    console.error(e);
                    throw (e);
                });
            };

            Cso.prototype.readChunkAsync = function (offset, count) {
                var _this = this;
                var blockIndex = Math.floor(offset / this.header.blockSize);
                var blockLow = MathUtils.prevAligned(offset, this.header.blockSize);
                var blockHigh = blockLow + this.header.blockSize;
                var maxReadCount = blockHigh - offset;
                var toReadInChunk = Math.min(count, maxReadCount);
                var chunkPromise = this.decodeBlockAsync(blockIndex).then(function (data) {
                    //console.log(data.byteLength);
                    var low = offset - blockLow;
                    return data.slice(low, low + toReadInChunk);
                });

                //console.log(sprintf("readChunkAsync: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));
                if (count <= maxReadCount) {
                    return chunkPromise;
                } else {
                    return chunkPromise.then(function (chunk1) {
                        return _this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(function (chunk2) {
                            return ArrayBufferUtils.concat([chunk1, chunk2]);
                        });
                    });
                }
            };

            Cso.prototype.loadAsync = function (stream) {
                var _this = this;
                this.stream = stream;

                return stream.readChunkAsync(0, Header.struct.length).then(function (buffer) {
                    var header = _this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
                    if (header.magic != CSO_MAGIC)
                        throw ('Not a CSO file');

                    return stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4).then(function (buffer) {
                        _this.offsets = new Uint32Array(buffer);
                        return _this;
                    });
                });
            };
            return Cso;
        })();
        cso.Cso = Cso;
    })(format.cso || (format.cso = {}));
    var cso = format.cso;
})(format || (format = {}));
var format;
(function (format) {
    function detectFormatAsync(asyncStream) {
        return asyncStream.readChunkAsync(0, 4).then(function (data) {
            var stream = Stream.fromArrayBuffer(data);
            var magic = stream.readString(4);
            switch (magic) {
                case '\u0000PBP':
                    return 'pbp';
                case '\u007FELF':
                    return 'elf';
                case 'CISO':
                    return 'ciso';
                case '\u0000\u0000\u0000\u0000':
                    return asyncStream.readChunkAsync(0x10 * 0x800, 6).then(function (data) {
                        var stream = Stream.fromArrayBuffer(data);
                        var magic = stream.readString(6);
                        switch (magic) {
                            case '\u0001CD001':
                                return 'iso';
                            default:
                                throw (sprintf("Unknown format. Magic: '%s'", magic));
                        }
                    });
                default:
                    break;
            }
            throw (sprintf("Unknown format. Magic: '%s'", magic));
        });
    }
    format.detectFormatAsync = detectFormatAsync;
})(format || (format = {}));
var format;
(function (format) {
    (function (_iso) {
        var SECTOR_SIZE = 0x800;

        var DirectoryRecordDate = (function () {
            function DirectoryRecordDate() {
            }
            Object.defineProperty(DirectoryRecordDate.prototype, "date", {
                get: function () {
                    return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
                },
                enumerable: true,
                configurable: true
            });

            DirectoryRecordDate.struct = StructClass.create(DirectoryRecordDate, [
                { type: UInt8, name: 'year' },
                { type: UInt8, name: 'month' },
                { type: UInt8, name: 'day' },
                { type: UInt8, name: 'hour' },
                { type: UInt8, name: 'minute' },
                { type: UInt8, name: 'second' },
                { type: UInt8, name: 'offset' }
            ]);
            return DirectoryRecordDate;
        })();

        var IsoStringDate = (function () {
            function IsoStringDate() {
            }
            Object.defineProperty(IsoStringDate.prototype, "year", {
                get: function () {
                    return parseInt(this.data.substr(0, 4));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "month", {
                get: function () {
                    return parseInt(this.data.substr(4, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "day", {
                get: function () {
                    return parseInt(this.data.substr(6, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "hour", {
                get: function () {
                    return parseInt(this.data.substr(8, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "minute", {
                get: function () {
                    return parseInt(this.data.substr(10, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "second", {
                get: function () {
                    return parseInt(this.data.substr(12, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "hsecond", {
                get: function () {
                    return parseInt(this.data.substr(14, 2));
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoStringDate.prototype, "offset", {
                get: function () {
                    return parseInt(this.data.substr(16, 1));
                },
                enumerable: true,
                configurable: true
            });

            IsoStringDate.struct = StructClass.create(IsoStringDate, [
                { type: Stringz(17), name: 'data' }
            ]);
            return IsoStringDate;
        })();

        var VolumeDescriptorHeaderType;
        (function (VolumeDescriptorHeaderType) {
            VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["BootRecord"] = 0x00] = "BootRecord";
            VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionSetTerminator"] = 0xFF] = "VolumePartitionSetTerminator";
            VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["PrimaryVolumeDescriptor"] = 0x01] = "PrimaryVolumeDescriptor";
            VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["SupplementaryVolumeDescriptor"] = 0x02] = "SupplementaryVolumeDescriptor";
            VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionDescriptor"] = 0x03] = "VolumePartitionDescriptor";
        })(VolumeDescriptorHeaderType || (VolumeDescriptorHeaderType = {}));

        var VolumeDescriptorHeader = (function () {
            function VolumeDescriptorHeader() {
            }
            VolumeDescriptorHeader.struct = StructClass.create(VolumeDescriptorHeader, [
                { type: UInt8, name: 'type' },
                { type: Stringz(5), name: 'id' },
                { type: UInt8, name: 'version' }
            ]);
            return VolumeDescriptorHeader;
        })();

        var DirectoryRecordFlags;
        (function (DirectoryRecordFlags) {
            DirectoryRecordFlags[DirectoryRecordFlags["Unknown1"] = 1 << 0] = "Unknown1";
            DirectoryRecordFlags[DirectoryRecordFlags["Directory"] = 1 << 1] = "Directory";
            DirectoryRecordFlags[DirectoryRecordFlags["Unknown2"] = 1 << 2] = "Unknown2";
            DirectoryRecordFlags[DirectoryRecordFlags["Unknown3"] = 1 << 3] = "Unknown3";
            DirectoryRecordFlags[DirectoryRecordFlags["Unknown4"] = 1 << 4] = "Unknown4";
            DirectoryRecordFlags[DirectoryRecordFlags["Unknown5"] = 1 << 5] = "Unknown5";
        })(DirectoryRecordFlags || (DirectoryRecordFlags = {}));

        var DirectoryRecord = (function () {
            function DirectoryRecord() {
                this.name = '';
            }
            Object.defineProperty(DirectoryRecord.prototype, "offset", {
                get: function () {
                    return this.extent * SECTOR_SIZE;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(DirectoryRecord.prototype, "isDirectory", {
                get: function () {
                    return (this.flags & DirectoryRecordFlags.Directory) != 0;
                },
                enumerable: true,
                configurable: true
            });

            DirectoryRecord.struct = StructClass.create(DirectoryRecord, [
                { type: UInt8, name: 'length' },
                { type: UInt8, name: 'extendedAttributeLength' },
                { type: UInt32_2lb, name: 'extent' },
                { type: UInt32_2lb, name: 'size' },
                { type: DirectoryRecordDate.struct, name: 'date' },
                { type: UInt8, name: 'flags' },
                { type: UInt8, name: 'fileUnitSize' },
                { type: UInt8, name: 'interleave' },
                { type: UInt16_2lb, name: 'volumeSequenceNumber' },
                { type: UInt8, name: 'nameLength' }
            ]);
            return DirectoryRecord;
        })();

        var PrimaryVolumeDescriptor = (function () {
            function PrimaryVolumeDescriptor() {
            }
            PrimaryVolumeDescriptor.struct = StructClass.create(PrimaryVolumeDescriptor, [
                { type: VolumeDescriptorHeader.struct, name: 'header' },
                { type: UInt8, name: '_pad1' },
                { type: Stringz(0x20), name: 'systemId' },
                { type: Stringz(0x20), name: 'volumeId' },
                { type: Int64, name: '_pad2' },
                { type: UInt32_2lb, name: 'volumeSpaceSize' },
                { type: StructArray.create(Int64, 4), name: '_pad3' },
                { type: UInt32, name: 'volumeSetSize' },
                { type: UInt32, name: 'volumeSequenceNumber' },
                { type: UInt16_2lb, name: 'logicalBlockSize' },
                { type: UInt32_2lb, name: 'pathTableSize' },
                { type: UInt32, name: 'typeLPathTable' },
                { type: UInt32, name: 'optType1PathTable' },
                { type: UInt32, name: 'typeMPathTable' },
                { type: UInt32, name: 'optTypeMPathTable' },
                { type: DirectoryRecord.struct, name: 'directoryRecord' },
                { type: UInt8, name: '_pad4' },
                { type: Stringz(0x80), name: 'volumeSetId' },
                { type: Stringz(0x80), name: 'publisherId' },
                { type: Stringz(0x80), name: 'preparerId' },
                { type: Stringz(0x80), name: 'applicationId' },
                { type: Stringz(37), name: 'copyrightFileId' },
                { type: Stringz(37), name: 'abstractFileId' },
                { type: Stringz(37), name: 'bibliographicFileId' },
                { type: IsoStringDate.struct, name: 'creationDate' },
                { type: IsoStringDate.struct, name: 'modificationDate' },
                { type: IsoStringDate.struct, name: 'expirationDate' },
                { type: IsoStringDate.struct, name: 'effectiveDate' },
                { type: UInt8, name: 'fileStructureVersion' },
                { type: UInt8, name: 'pad5' },
                { type: StructArray.create(UInt8, 0x200), name: 'pad5' },
                { type: StructArray.create(UInt8, 653), name: 'pad6' }
            ]);
            return PrimaryVolumeDescriptor;
        })();

        var IsoNode = (function () {
            function IsoNode(iso, directoryRecord, parent) {
                if (typeof parent === "undefined") { parent = null; }
                this.iso = iso;
                this.directoryRecord = directoryRecord;
                this.parent = parent;
                this.childs = [];
                this.childsByName = {};
            }
            Object.defineProperty(IsoNode.prototype, "isRoot", {
                get: function () {
                    return this.parent == null;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoNode.prototype, "size", {
                get: function () {
                    return this.directoryRecord.size;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoNode.prototype, "path", {
                get: function () {
                    return (this.parent && !this.parent.isRoot) ? (this.parent.path + '/' + this.name) : this.name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoNode.prototype, "name", {
                get: function () {
                    return this.directoryRecord.name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoNode.prototype, "isDirectory", {
                get: function () {
                    return this.directoryRecord.isDirectory;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoNode.prototype, "date", {
                get: function () {
                    return this.directoryRecord.date.date;
                },
                enumerable: true,
                configurable: true
            });

            IsoNode.prototype.readChunkAsync = function (offset, count) {
                var fileBaseLow = this.directoryRecord.offset;
                var low = fileBaseLow + offset;
                var high = Math.min(low + count, fileBaseLow + this.size);
                return this.iso.readChunkAsync(low, high - low);
            };

            IsoNode.prototype.addChild = function (child) {
                this.childs.push(child);
                this.childsByName[child.name] = child;
            };

            IsoNode.prototype.toString = function () {
                return sprintf('IsoNode(%s, %d)', this.path, this.size);
            };
            return IsoNode;
        })();

        var Iso = (function () {
            function Iso() {
            }
            Object.defineProperty(Iso.prototype, "name", {
                get: function () {
                    return this.asyncStream.name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Iso.prototype, "root", {
                get: function () {
                    return this._root;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Iso.prototype, "childrenByPath", {
                get: function () {
                    return this._childrenByPath;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Iso.prototype, "children", {
                get: function () {
                    return this._children.slice();
                },
                enumerable: true,
                configurable: true
            });

            Iso.fromStreamAsync = function (asyncStream) {
                return new Iso().loadAsync(asyncStream);
            };

            Iso.prototype.get = function (path) {
                path = path.replace(/^\/+/, '');
                var node = this._childrenByPath[path];
                if (!node) {
                    console.info(this);
                    throw (new Error(sprintf("Can't find node '%s'", path)));
                }
                return node;
            };

            Object.defineProperty(Iso.prototype, "size", {
                get: function () {
                    return this.asyncStream.size;
                },
                enumerable: true,
                configurable: true
            });

            Iso.prototype.readChunkAsync = function (offset, count) {
                return this.asyncStream.readChunkAsync(offset, count);
            };

            Iso.prototype.loadAsync = function (asyncStream) {
                var _this = this;
                this.asyncStream = asyncStream;

                if (PrimaryVolumeDescriptor.struct.length != SECTOR_SIZE)
                    throw (sprintf("Invalid PrimaryVolumeDescriptor.struct size %d != %d", PrimaryVolumeDescriptor.struct.length, SECTOR_SIZE));

                return asyncStream.readChunkAsync(SECTOR_SIZE * 0x10, 0x800).then(function (arrayBuffer) {
                    var stream = Stream.fromArrayBuffer(arrayBuffer);
                    var pvd = PrimaryVolumeDescriptor.struct.read(stream);
                    if (pvd.header.type != 1 /* PrimaryVolumeDescriptor */)
                        throw ("Not an ISO file");
                    if (pvd.header.id != 'CD001')
                        throw ("Not an ISO file");

                    //if (pvd.systemId.rstrip() != 'Win32') throw ("Invalid ISO file systemId:'" + pvd.systemId + "'");
                    //if (pvd.volumeId.rstrip() != 'CDROM') throw ("Invalid ISO file volumeId:'" + pvd.volumeId + "'");
                    _this._children = [];
                    _this._childrenByPath = {};
                    _this._root = new IsoNode(_this, pvd.directoryRecord);

                    return _this.processDirectoryRecordAsync(_this._root).then(function () {
                        return _this;
                    });
                });
            };

            Iso.prototype.processDirectoryRecordAsync = function (parentIsoNode) {
                var _this = this;
                var directoryStart = parentIsoNode.directoryRecord.extent * SECTOR_SIZE;
                var directoryLength = parentIsoNode.directoryRecord.size;

                return this.asyncStream.readChunkAsync(directoryStart, directoryLength).then(function (data) {
                    var directoryStream = Stream.fromArrayBuffer(data);

                    while (directoryStream.available) {
                        var directoryRecordSize = directoryStream.readUInt8();

                        // Even if a directory spans multiple sectors, the directory entries are not permitted to cross the sector boundary (unlike the path table).
                        // Where there is not enough space to record an entire directory entry at the end of a sector, that sector is zero-padded and the next
                        // consecutive sector is used.
                        if (directoryRecordSize == 0) {
                            directoryStream.position = MathUtils.nextAligned(directoryStream.position, SECTOR_SIZE);

                            continue;
                        }

                        directoryStream.position = directoryStream.position - 1;

                        //Console.WriteLine("[{0}:{1:X}-{2:X}]", DirectoryRecordSize, DirectoryStream.Position, DirectoryStream.Position + DirectoryRecordSize);
                        var directoryRecordStream = directoryStream.readStream(directoryRecordSize);
                        var directoryRecord = DirectoryRecord.struct.read(directoryRecordStream);
                        directoryRecord.name = directoryRecordStream.readStringz(directoryRecordStream.available);

                        //Console.WriteLine("{0}", name); Console.ReadKey();
                        if (directoryRecord.name == "" || directoryRecord.name == "\x01")
                            continue;

                        //console.log(directoryRecord);
                        //writefln("   %s", name);
                        var child = new IsoNode(_this, directoryRecord, parentIsoNode);
                        parentIsoNode.addChild(child);
                        _this._children.push(child);
                        _this._childrenByPath[child.path] = child;
                    }

                    var promiseGenerators = [];

                    parentIsoNode.childs.forEach(function (child) {
                        if (child.isDirectory) {
                            promiseGenerators.push(function () {
                                return _this.processDirectoryRecordAsync(child);
                            });
                        }
                    });

                    return PromiseUtils.sequence(promiseGenerators);
                });
            };
            return Iso;
        })();
        _iso.Iso = Iso;
    })(format.iso || (format.iso = {}));
    var iso = format.iso;
})(format || (format = {}));
var format;
(function (format) {
    (function (_pbp) {
        var PbpMagic;
        (function (PbpMagic) {
            PbpMagic[PbpMagic["expected"] = 0x50425000] = "expected";
        })(PbpMagic || (PbpMagic = {}));

        var PbpHeader = (function () {
            function PbpHeader() {
            }
            PbpHeader.struct = StructClass.create(PbpHeader, [
                { type: Int32, name: 'magic' },
                { type: Int32, name: 'version' },
                { type: new StructArray(Int32, 8), name: 'offsets' }
            ]);
            return PbpHeader;
        })();

        var Pbp = (function () {
            function Pbp() {
            }
            Pbp.fromStream = function (stream) {
                var pbp = new Pbp();
                pbp.load(stream);
                return pbp;
            };

            Pbp.prototype.load = function (stream) {
                this.stream = stream;
                this.header = PbpHeader.struct.read(stream);
                if (this.header.magic != 1346523136 /* expected */)
                    throw ("Not a PBP file");
                this.header.offsets.push(stream.length);
            };

            Pbp.prototype.get = function (name) {
                var index = Pbp.names.indexOf(name);
                return this.getByIndex(index);
            };

            Pbp.prototype.getByIndex = function (index) {
                var offsets = this.header.offsets;
                return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
            };
            Pbp.names = ["param.sfo", "icon0.png", "icon1.pmf", "pic0.png", "pic1.png", "snd0.at3", "psp.data", "psar.data"];
            return Pbp;
        })();
        _pbp.Pbp = Pbp;
    })(format.pbp || (format.pbp = {}));
    var pbp = format.pbp;
})(format || (format = {}));
var format;
(function (format) {
    (function (_psf) {
        var DataType;
        (function (DataType) {
            DataType[DataType["Binary"] = 0] = "Binary";
            DataType[DataType["Text"] = 2] = "Text";
            DataType[DataType["Int"] = 4] = "Int";
        })(DataType || (DataType = {}));

        var HeaderStruct = (function () {
            function HeaderStruct() {
            }
            HeaderStruct.struct = StructClass.create(HeaderStruct, [
                { type: UInt32, name: 'magic' },
                { type: UInt32, name: 'version' },
                { type: UInt32, name: 'keyTable' },
                { type: UInt32, name: 'valueTable' },
                { type: UInt32, name: 'numberOfPairs' }
            ]);
            return HeaderStruct;
        })();

        var EntryStruct = (function () {
            function EntryStruct() {
            }
            EntryStruct.struct = StructClass.create(EntryStruct, [
                { type: UInt16, name: 'keyOffset' },
                { type: UInt8, name: 'unknown' },
                { type: UInt8, name: 'dataType' },
                { type: UInt32, name: 'valueSize' },
                { type: UInt32, name: 'valueSizePad' },
                { type: UInt32, name: 'valueOffset' }
            ]);
            return EntryStruct;
        })();

        var Psf = (function () {
            function Psf() {
                this.entries = [];
                this.entriesByName = {};
            }
            Psf.fromStream = function (stream) {
                var psf = new Psf();
                psf.load(stream);
                return psf;
            };

            Psf.prototype.load = function (stream) {
                var header = this.header = HeaderStruct.struct.read(stream);
                if (header.magic != 0x46535000)
                    throw ("Not a PSF file");
                var entries = StructArray.create(EntryStruct.struct, header.numberOfPairs).read(stream);
                var entriesByName = {};

                var keysStream = stream.sliceWithLength(header.keyTable);
                var valuesStream = stream.sliceWithLength(header.valueTable);

                entries.forEach(function (entry) {
                    var key = keysStream.sliceWithLength(entry.keyOffset).readUtf8Stringz();
                    var valueStream = valuesStream.sliceWithLength(entry.valueOffset, entry.valueSize);
                    entry.key = key;

                    switch (entry.dataType) {
                        case 0 /* Binary */:
                            entry.value = valueStream.sliceWithLength(0);
                            break;
                        case 4 /* Int */:
                            entry.value = valueStream.readInt32();
                            break;
                        case 2 /* Text */:
                            entry.value = valueStream.readUtf8Stringz();
                            break;
                        default:
                            throw (sprintf("Unknown dataType: %s", entry.dataType));
                    }

                    entriesByName[entry.key] = entry.value;
                });

                this.entries = entries;
                this.entriesByName = entriesByName;
            };
            return Psf;
        })();
        _psf.Psf = Psf;
    })(format.psf || (format.psf = {}));
    var psf = format.psf;
})(format || (format = {}));
var hle;
(function (hle) {
    (function (_elf) {
        var ElfHeader = (function () {
            function ElfHeader() {
            }
            Object.defineProperty(ElfHeader.prototype, "hasValidMagic", {
                get: function () {
                    return this.magic == String.fromCharCode(0x7F) + 'ELF';
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(ElfHeader.prototype, "hasValidMachine", {
                get: function () {
                    return this.machine == 8 /* ALLEGREX */;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(ElfHeader.prototype, "hasValidType", {
                get: function () {
                    return [2 /* Executable */, 65440 /* Prx */].indexOf(this.type) >= 0;
                },
                enumerable: true,
                configurable: true
            });

            ElfHeader.struct = StructClass.create(ElfHeader, [
                { type: Stringn(4), name: 'magic' },
                { type: Int8, name: 'class' },
                { type: Int8, name: 'data' },
                { type: Int8, name: 'idVersion' },
                { type: StructArray.create(Int8, 9), name: '_padding' },
                { type: UInt16, name: 'type' },
                { type: Int16, name: 'machine' },
                { type: Int32, name: 'version' },
                { type: Int32, name: 'entryPoint' },
                { type: Int32, name: 'programHeaderOffset' },
                { type: Int32, name: 'sectionHeaderOffset' },
                { type: Int32, name: 'flags' },
                { type: Int16, name: 'elfHeaderSize' },
                { type: Int16, name: 'programHeaderEntrySize' },
                { type: Int16, name: 'programHeaderCount' },
                { type: Int16, name: 'sectionHeaderEntrySize' },
                { type: Int16, name: 'sectionHeaderCount' },
                { type: Int16, name: 'sectionHeaderStringTable' }
            ]);
            return ElfHeader;
        })();

        var ElfProgramHeader = (function () {
            function ElfProgramHeader() {
            }
            ElfProgramHeader.struct = StructClass.create(ElfProgramHeader, [
                { type: UInt32, name: 'type' },
                { type: UInt32, name: 'offset' },
                { type: UInt32, name: 'virtualAddress' },
                { type: UInt32, name: 'psysicalAddress' },
                { type: UInt32, name: 'fileSize' },
                { type: UInt32, name: 'memorySize' },
                { type: UInt32, name: 'flags' },
                { type: UInt32, name: 'alignment' }
            ]);
            return ElfProgramHeader;
        })();

        var ElfSectionHeader = (function () {
            function ElfSectionHeader() {
                this.stream = null;
            }
            ElfSectionHeader.struct = StructClass.create(ElfSectionHeader, [
                { type: UInt32, name: 'nameOffset' },
                { type: UInt32, name: 'type' },
                { type: UInt32, name: 'flags' },
                { type: UInt32, name: 'address' },
                { type: UInt32, name: 'offset' },
                { type: UInt32, name: 'size' },
                { type: UInt32, name: 'link' },
                { type: UInt32, name: 'info' },
                { type: UInt32, name: 'addressAlign' },
                { type: UInt32, name: 'entitySize' }
            ]);
            return ElfSectionHeader;
        })();

        var ElfProgramHeaderType;
        (function (ElfProgramHeaderType) {
            ElfProgramHeaderType[ElfProgramHeaderType["NoLoad"] = 0] = "NoLoad";
            ElfProgramHeaderType[ElfProgramHeaderType["Load"] = 1] = "Load";
            ElfProgramHeaderType[ElfProgramHeaderType["Reloc1"] = 0x700000A0] = "Reloc1";
            ElfProgramHeaderType[ElfProgramHeaderType["Reloc2"] = 0x700000A1] = "Reloc2";
        })(ElfProgramHeaderType || (ElfProgramHeaderType = {}));

        var ElfSectionHeaderType;
        (function (ElfSectionHeaderType) {
            ElfSectionHeaderType[ElfSectionHeaderType["Null"] = 0] = "Null";
            ElfSectionHeaderType[ElfSectionHeaderType["ProgramBits"] = 1] = "ProgramBits";
            ElfSectionHeaderType[ElfSectionHeaderType["SYMTAB"] = 2] = "SYMTAB";
            ElfSectionHeaderType[ElfSectionHeaderType["STRTAB"] = 3] = "STRTAB";
            ElfSectionHeaderType[ElfSectionHeaderType["RELA"] = 4] = "RELA";
            ElfSectionHeaderType[ElfSectionHeaderType["HASH"] = 5] = "HASH";
            ElfSectionHeaderType[ElfSectionHeaderType["DYNAMIC"] = 6] = "DYNAMIC";
            ElfSectionHeaderType[ElfSectionHeaderType["NOTE"] = 7] = "NOTE";
            ElfSectionHeaderType[ElfSectionHeaderType["NoBits"] = 8] = "NoBits";
            ElfSectionHeaderType[ElfSectionHeaderType["Relocation"] = 9] = "Relocation";
            ElfSectionHeaderType[ElfSectionHeaderType["SHLIB"] = 10] = "SHLIB";
            ElfSectionHeaderType[ElfSectionHeaderType["DYNSYM"] = 11] = "DYNSYM";

            ElfSectionHeaderType[ElfSectionHeaderType["LOPROC"] = 0x70000000] = "LOPROC";
            ElfSectionHeaderType[ElfSectionHeaderType["HIPROC"] = 0x7FFFFFFF] = "HIPROC";
            ElfSectionHeaderType[ElfSectionHeaderType["LOUSER"] = 0x80000000] = "LOUSER";
            ElfSectionHeaderType[ElfSectionHeaderType["HIUSER"] = 0xFFFFFFFF] = "HIUSER";

            ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation"] = (ElfSectionHeaderType.LOPROC | 0xA0)] = "PrxRelocation";
            ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation_FW5"] = (ElfSectionHeaderType.LOPROC | 0xA1)] = "PrxRelocation_FW5";
        })(ElfSectionHeaderType || (ElfSectionHeaderType = {}));

        var ElfSectionHeaderFlags;
        (function (ElfSectionHeaderFlags) {
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["None"] = 0] = "None";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Write"] = 1] = "Write";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Allocate"] = 2] = "Allocate";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Execute"] = 4] = "Execute";
        })(ElfSectionHeaderFlags || (ElfSectionHeaderFlags = {}));

        var ElfProgramHeaderFlags;
        (function (ElfProgramHeaderFlags) {
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Executable"] = 0x1] = "Executable";

            // Note: demo PRX's were found to be not writable
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Writable"] = 0x2] = "Writable";
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Readable"] = 0x4] = "Readable";
        })(ElfProgramHeaderFlags || (ElfProgramHeaderFlags = {}));

        var ElfType;
        (function (ElfType) {
            ElfType[ElfType["Executable"] = 0x0002] = "Executable";
            ElfType[ElfType["Prx"] = 0xFFA0] = "Prx";
        })(ElfType || (ElfType = {}));

        var ElfMachine;
        (function (ElfMachine) {
            ElfMachine[ElfMachine["ALLEGREX"] = 8] = "ALLEGREX";
        })(ElfMachine || (ElfMachine = {}));

        var ElfPspModuleFlags;
        (function (ElfPspModuleFlags) {
            ElfPspModuleFlags[ElfPspModuleFlags["User"] = 0x0000] = "User";
            ElfPspModuleFlags[ElfPspModuleFlags["Kernel"] = 0x1000] = "Kernel";
        })(ElfPspModuleFlags || (ElfPspModuleFlags = {}));

        var ElfPspLibFlags;
        (function (ElfPspLibFlags) {
            ElfPspLibFlags[ElfPspLibFlags["DirectJump"] = 0x0001] = "DirectJump";
            ElfPspLibFlags[ElfPspLibFlags["Syscall"] = 0x4000] = "Syscall";
            ElfPspLibFlags[ElfPspLibFlags["SysLib"] = 0x8000] = "SysLib";
        })(ElfPspLibFlags || (ElfPspLibFlags = {}));

        var ElfPspModuleNids;
        (function (ElfPspModuleNids) {
            ElfPspModuleNids[ElfPspModuleNids["MODULE_INFO"] = 0xF01D73A7] = "MODULE_INFO";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_BOOTSTART"] = 0xD3744BE0] = "MODULE_BOOTSTART";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_REBOOT_BEFORE"] = 0x2F064FA6] = "MODULE_REBOOT_BEFORE";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_START"] = 0xD632ACDB] = "MODULE_START";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_START_THREAD_PARAMETER"] = 0x0F7C276C] = "MODULE_START_THREAD_PARAMETER";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP"] = 0xCEE8593C] = "MODULE_STOP";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP_THREAD_PARAMETER"] = 0xCF0CC697] = "MODULE_STOP_THREAD_PARAMETER";
        })(ElfPspModuleNids || (ElfPspModuleNids = {}));

        var ElfPspModuleImport = (function () {
            function ElfPspModuleImport() {
            }
            ElfPspModuleImport.struct = Struct.create([
                { type: UInt32, name: "nameOffset" },
                { type: UInt16, name: "version" },
                { type: UInt16, name: "flags" },
                { type: UInt8, name: "entrySize" },
                { type: UInt8, name: "variableCount" },
                { type: UInt16, name: "functionCount" },
                { type: UInt32, name: "nidAddress" },
                { type: UInt32, name: "callAddress" }
            ]);
            return ElfPspModuleImport;
        })();

        var ElfPspModuleExport = (function () {
            function ElfPspModuleExport() {
            }
            ElfPspModuleExport.struct = Struct.create([
                { type: UInt32, name: "name" },
                { type: UInt16, name: "version" },
                { type: UInt16, name: "flags" },
                { type: UInt8, name: "entrySize" },
                { type: UInt8, name: "variableCount" },
                { type: UInt16, name: "functionCount" },
                { type: UInt32, name: "exports" }
            ]);
            return ElfPspModuleExport;
        })();

        var ElfPspModuleInfoAtributesEnum;
        (function (ElfPspModuleInfoAtributesEnum) {
            ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["UserMode"] = 0x0000] = "UserMode";
            ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["KernelMode"] = 0x100] = "KernelMode";
        })(ElfPspModuleInfoAtributesEnum || (ElfPspModuleInfoAtributesEnum = {}));

        var ElfPspModuleInfo = (function () {
            function ElfPspModuleInfo() {
            }
            ElfPspModuleInfo.struct = StructClass.create(ElfPspModuleInfo, [
                { type: UInt16, name: "moduleAtributes" },
                { type: UInt16, name: "moduleVersion" },
                { type: Stringz(28), name: "name" },
                { type: UInt32, name: "gp" },
                { type: UInt32, name: "exportsStart" },
                { type: UInt32, name: "exportsEnd" },
                { type: UInt32, name: "importsStart" },
                { type: UInt32, name: "importsEnd" }
            ]);
            return ElfPspModuleInfo;
        })();
        _elf.ElfPspModuleInfo = ElfPspModuleInfo;

        var ElfRelocType;
        (function (ElfRelocType) {
            ElfRelocType[ElfRelocType["None"] = 0] = "None";
            ElfRelocType[ElfRelocType["Mips16"] = 1] = "Mips16";
            ElfRelocType[ElfRelocType["Mips32"] = 2] = "Mips32";
            ElfRelocType[ElfRelocType["MipsRel32"] = 3] = "MipsRel32";
            ElfRelocType[ElfRelocType["Mips26"] = 4] = "Mips26";
            ElfRelocType[ElfRelocType["MipsHi16"] = 5] = "MipsHi16";
            ElfRelocType[ElfRelocType["MipsLo16"] = 6] = "MipsLo16";
            ElfRelocType[ElfRelocType["MipsGpRel16"] = 7] = "MipsGpRel16";
            ElfRelocType[ElfRelocType["MipsLiteral"] = 8] = "MipsLiteral";
            ElfRelocType[ElfRelocType["MipsGot16"] = 9] = "MipsGot16";
            ElfRelocType[ElfRelocType["MipsPc16"] = 10] = "MipsPc16";
            ElfRelocType[ElfRelocType["MipsCall16"] = 11] = "MipsCall16";
            ElfRelocType[ElfRelocType["MipsGpRel32"] = 12] = "MipsGpRel32";
            ElfRelocType[ElfRelocType["StopRelocation"] = 0xFF] = "StopRelocation";
        })(ElfRelocType || (ElfRelocType = {}));

        var ElfReloc = (function () {
            function ElfReloc() {
            }
            Object.defineProperty(ElfReloc.prototype, "pointeeSectionHeaderBase", {
                get: function () {
                    return (this.info >> 16) & 0xFF;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ElfReloc.prototype, "pointerSectionHeaderBase", {
                get: function () {
                    return (this.info >> 8) & 0xFF;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ElfReloc.prototype, "type", {
                get: function () {
                    return ((this.info >> 0) & 0xFF);
                },
                enumerable: true,
                configurable: true
            });

            ElfReloc.struct = StructClass.create(ElfReloc, [
                { type: UInt32, name: "pointerAddress" },
                { type: UInt32, name: "info" }
            ]);
            return ElfReloc;
        })();

        var ElfLoader = (function () {
            function ElfLoader() {
                this.header = null;
                this.stream = null;
            }
            ElfLoader.prototype.load = function (stream) {
                var _this = this;
                this.readAndCheckHeaders(stream);

                var programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
                var sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);

                this.programHeaders = StructArray.create(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
                this.sectionHeaders = StructArray.create(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);

                this.sectionHeaderStringTable = this.sectionHeaders[this.header.sectionHeaderStringTable];
                this.stringTableStream = this.getSectionHeaderFileStream(this.sectionHeaderStringTable);

                this.sectionHeadersByName = {};
                this.sectionHeaders.forEach(function (sectionHeader) {
                    var name = _this.getStringFromStringTable(sectionHeader.nameOffset);
                    sectionHeader.name = name;
                    if (sectionHeader.type != 0 /* Null */) {
                        sectionHeader.stream = _this.getSectionHeaderFileStream(sectionHeader);
                    }
                    _this.sectionHeadersByName[name] = sectionHeader;
                });
            };

            ElfLoader.prototype.readAndCheckHeaders = function (stream) {
                this.stream = stream;
                var header = this.header = ElfHeader.struct.read(stream);
                if (!header.hasValidMagic)
                    throw ('Not an ELF file');
                if (!header.hasValidMachine)
                    throw ('Not a PSP ELF file');
                if (!header.hasValidType)
                    throw ('Not a executable or a Prx but has type ' + header.type);
            };

            ElfLoader.prototype.getStringFromStringTable = function (index) {
                this.stringTableStream.position = index;
                return this.stringTableStream.readStringz();
            };

            ElfLoader.prototype.getSectionHeaderFileStream = function (sectionHeader) {
                switch (sectionHeader.type) {
                    case 8 /* NoBits */:
                    case 0 /* Null */:
                        return this.stream.sliceWithLength(0, 0);
                        break;
                    default:
                        return this.stream.sliceWithLength(sectionHeader.offset, sectionHeader.size);
                }
            };

            ElfLoader.fromStream = function (stream) {
                var elf = new ElfLoader();
                elf.load(stream);
                return elf;
            };

            Object.defineProperty(ElfLoader.prototype, "isPrx", {
                get: function () {
                    return (this.header.type & 65440 /* Prx */) != 0;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ElfLoader.prototype, "needsRelocation", {
                get: function () {
                    return this.isPrx || (this.header.entryPoint < core.Memory.MAIN_OFFSET);
                },
                enumerable: true,
                configurable: true
            });
            return ElfLoader;
        })();

        var InstructionReader = (function () {
            function InstructionReader(memory) {
                this.memory = memory;
            }
            InstructionReader.prototype.read = function (address) {
                return new core.cpu.Instruction(address, this.memory.readUInt32(address));
            };

            InstructionReader.prototype.write = function (address, instruction) {
                this.memory.writeInt32(address, instruction.data);
            };
            return InstructionReader;
        })();

        var PspElfLoader = (function () {
            function PspElfLoader(memory, memoryManager, moduleManager, syscallManager) {
                this.memory = memory;
                this.memoryManager = memoryManager;
                this.moduleManager = moduleManager;
                this.syscallManager = syscallManager;
                this.assembler = new core.cpu.MipsAssembler();
                this.baseAddress = 0;
            }
            PspElfLoader.prototype.load = function (stream) {
                this.elfLoader = ElfLoader.fromStream(stream);

                //ElfSectionHeaderFlags.Allocate
                this.allocateMemory();
                this.writeToMemory();
                this.relocateFromHeaders();
                this.readModuleInfo();
                this.updateModuleImports();

                console.log(this.moduleInfo);
            };

            PspElfLoader.prototype.getSectionHeaderMemoryStream = function (sectionHeader) {
                return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size);
            };

            PspElfLoader.prototype.readModuleInfo = function () {
                this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
                this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
            };

            PspElfLoader.prototype.allocateMemory = function () {
                this.baseAddress = 0;

                if (this.elfLoader.needsRelocation) {
                    this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(function (partition) {
                        return partition.size;
                    }).reverse().first().low;
                    this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
                }
            };

            PspElfLoader.prototype.relocateFromHeaders = function () {
                var _this = this;
                var RelocProgramIndex = 0;
                this.elfLoader.programHeaders.forEach(function (programHeader) {
                    switch (programHeader.type) {
                        case 1879048352 /* Reloc1 */:
                            console.warn("SKIPPING Elf.ProgramHeader.TypeEnum.Reloc1!");
                            break;
                        case 1879048353 /* Reloc2 */:
                            throw ("Not implemented");
                    }
                });

                var RelocSectionIndex = 0;
                this.elfLoader.sectionHeaders.forEach(function (sectionHeader) {
                    switch (sectionHeader.type) {
                        case 9 /* Relocation */:
                            console.log(sectionHeader);
                            console.error("Not implemented ElfSectionHeaderType.Relocation");
                            break;

                        case ElfSectionHeaderType.PrxRelocation:
                            var relocs = StructArray.create(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
                            _this.relocateRelocs(relocs);
                            break;
                        case ElfSectionHeaderType.PrxRelocation_FW5:
                            throw ("Not implemented ElfSectionHeader.Type.PrxRelocation_FW5");
                    }
                });
            };

            PspElfLoader.prototype.relocateRelocs = function (relocs) {
                var baseAddress = this.baseAddress;
                var hiValue;
                var deferredHi16 = [];
                var instructionReader = new InstructionReader(this.memory);

                for (var index = 0; index < relocs.length; index++) {
                    var reloc = relocs[index];
                    if (reloc.type == 255 /* StopRelocation */)
                        break;

                    var pointerBaseOffset = this.elfLoader.programHeaders[reloc.pointerSectionHeaderBase].virtualAddress;
                    var pointeeBaseOffset = this.elfLoader.programHeaders[reloc.pointeeSectionHeaderBase].virtualAddress;

                    // Address of data to relocate
                    var RelocatedPointerAddress = (baseAddress + reloc.pointerAddress + pointerBaseOffset);

                    // Value of data to relocate
                    var instruction = instructionReader.read(RelocatedPointerAddress);

                    var S = baseAddress + pointeeBaseOffset;
                    var GP_ADDR = (baseAddress + reloc.pointerAddress);
                    var GP_OFFSET = GP_ADDR - (baseAddress & 0xFFFF0000);

                    switch (reloc.type) {
                        case 0 /* None */:
                            break;
                        case 1 /* Mips16 */:
                            instruction.u_imm16 += S;
                            break;
                        case 2 /* Mips32 */:
                            instruction.data += S;
                            break;
                        case 3 /* MipsRel32 */:
                            throw ("Not implemented MipsRel32");
                        case 4 /* Mips26 */:
                            instruction.jump_real = instruction.jump_real + S;
                            break;
                        case 5 /* MipsHi16 */:
                            hiValue = instruction.u_imm16;
                            deferredHi16.push(RelocatedPointerAddress);
                            break;
                        case 6 /* MipsLo16 */:
                            var A = instruction.u_imm16;

                            instruction.u_imm16 = ((hiValue << 16) | (A & 0x0000FFFF)) + S;

                            deferredHi16.forEach(function (data_addr2) {
                                var data2 = instructionReader.read(data_addr2);
                                var result = ((data2.data & 0x0000FFFF) << 16) + A + S;
                                if ((A & 0x8000) != 0) {
                                    result -= 0x10000;
                                }
                                if ((result & 0x8000) != 0) {
                                    result += 0x10000;
                                }
                                data2.u_imm16 = (result >>> 16);
                                instructionReader.write(data_addr2, data2);
                            });

                            deferredHi16 = [];
                            break;
                        case 7 /* MipsGpRel16 */:
                            break;
                        default:
                            throw (new Error(sprintf("RelocType %d not implemented", reloc.type)));
                    }

                    instructionReader.write(RelocatedPointerAddress, instruction);
                }
            };

            PspElfLoader.prototype.writeToMemory = function () {
                var _this = this;
                var needsRelocate = this.elfLoader.needsRelocation;

                //var loadAddress = this.elfLoader.programHeaders[0].psysicalAddress;
                var loadAddress = this.baseAddress;

                console.info(sprintf("PspElfLoader: needsRelocate=%s, loadAddress=%08X", needsRelocate, loadAddress));

                //console.log(moduleInfo);
                this.elfLoader.sectionHeaders.filter(function (sectionHeader) {
                    return ((sectionHeader.flags & 2 /* Allocate */) != 0);
                }).forEach(function (sectionHeader) {
                    var low = loadAddress + sectionHeader.address;

                    switch (sectionHeader.type) {
                        case 8 /* NoBits */:
                            for (var n = 0; n < sectionHeader.size; n++)
                                _this.memory.writeInt8(low + n, 0);
                            break;
                        default:
                            break;
                        case 1 /* ProgramBits */:
                            var stream = sectionHeader.stream;

                            var length = stream.length;

                            var memorySegment = _this.memoryManager.userPartition.allocateSet(length, low);

                            //console.log(sprintf('low: %08X, %08X, size: %08X', sectionHeader.address, low, stream.length));
                            _this.memory.writeStream(low, stream);

                            break;
                    }
                });
            };

            PspElfLoader.prototype.updateModuleImports = function () {
                var _this = this;
                var moduleInfo = this.moduleInfo;
                console.log(moduleInfo);
                var importsBytesSize = moduleInfo.importsEnd - moduleInfo.importsStart;
                var importsStream = this.memory.sliceWithBounds(moduleInfo.importsStart, moduleInfo.importsEnd);
                var importsCount = importsBytesSize / ElfPspModuleImport.struct.length;
                var imports = StructArray.create(ElfPspModuleImport.struct, importsCount).read(importsStream);
                imports.forEach(function (_import) {
                    _import.name = _this.memory.readStringz(_import.nameOffset);
                    _this.updateModuleFunctions(_import);
                    _this.updateModuleVars(_import);
                });
                //console.log(imports);
            };

            PspElfLoader.prototype.updateModuleFunctions = function (moduleImport) {
                var _this = this;
                var _module = this.moduleManager.getByName(moduleImport.name);
                var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
                var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);

                var registerN = function (nid, n) {
                    var nfunc;
                    try  {
                        nfunc = _module.getByNid(nid);
                    } catch (e) {
                        console.warn(e);
                        nfunc = new core.NativeFunction();
                        nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                        nfunc.nid = nid;
                        nfunc.firmwareVersion = 150;
                        nfunc.call = function (context, state) {
                            throw ("Not implemented '" + nfunc.name + "'");
                        };
                    }
                    var syscallId = _this.syscallManager.register(nfunc);

                    //printf("%s:%08X -> %s", moduleImport.name, nid, syscallId);
                    return syscallId;
                };

                for (var n = 0; n < moduleImport.functionCount; n++) {
                    var nid = nidsStream.readUInt32();
                    var syscall = registerN(nid, n);

                    callStream.writeInt32(this.assembler.assemble(0, sprintf('jr $31'))[0].data);
                    callStream.writeInt32(this.assembler.assemble(0, sprintf('syscall %d', syscall))[0].data);
                }
            };

            PspElfLoader.prototype.updateModuleVars = function (moduleImport) {
            };
            return PspElfLoader;
        })();
        _elf.PspElfLoader = PspElfLoader;
    })(hle.elf || (hle.elf = {}));
    var elf = hle.elf;
})(hle || (hle = {}));
var hle;
(function (hle) {
    var Device = (function () {
        function Device(name, vfs) {
            this.name = name;
            this.vfs = vfs;
            this.cwd = '';
        }
        Device.prototype.open = function (uri, flags, mode) {
            var entry = this.vfs.open(uri.pathWithoutDevice, flags, mode);
            return entry;
        };
        return Device;
    })();
    hle.Device = Device;

    var HleFile = (function () {
        function HleFile(entry) {
            this.entry = entry;
            this.cursor = 0;
        }
        HleFile.prototype.close = function () {
            this.entry.close();
        };
        return HleFile;
    })();
    hle.HleFile = HleFile;

    var Uri = (function () {
        function Uri(path) {
            this.path = path;
        }
        Object.defineProperty(Uri.prototype, "device", {
            get: function () {
                return (this.path.split(':'))[0];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Uri.prototype, "pathWithoutDevice", {
            get: function () {
                return (this.path.split(':'))[1];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Uri.prototype, "isAbsolute", {
            get: function () {
                return this.path.contains(':');
            },
            enumerable: true,
            configurable: true
        });

        Uri.prototype.append = function (that) {
            if (that.isAbsolute)
                return that;
            return new Uri(this.path + '/' + that.path);
        };
        return Uri;
    })();
    hle.Uri = Uri;

    var FileManager = (function () {
        function FileManager() {
            this.devices = {};
            this.cwd = new Uri('');
        }
        FileManager.prototype.chdir = function (cwd) {
            this.cwd = new Uri(cwd);
        };

        FileManager.prototype.getDevice = function (name) {
            var device = this.devices[name];
            if (!device)
                throw (new Error(sprintf("Can't find device '%s'", name)));
            return device;
        };

        FileManager.prototype.open = function (name, flags, mode) {
            var uri = this.cwd.append(new Uri(name));
            var entry = this.getDevice(uri.device).open(uri, flags, mode);
            return new HleFile(entry);
        };

        FileManager.prototype.mount = function (device, vfs) {
            this.devices[device] = new Device(device, vfs);
        };
        return FileManager;
    })();
    hle.FileManager = FileManager;
})(hle || (hle = {}));
var hle;
(function (hle) {
    var MemoryPartitions;
    (function (MemoryPartitions) {
        MemoryPartitions[MemoryPartitions["Kernel0"] = 0] = "Kernel0";
        MemoryPartitions[MemoryPartitions["User"] = 2] = "User";
        MemoryPartitions[MemoryPartitions["VolatilePartition"] = 5] = "VolatilePartition";
        MemoryPartitions[MemoryPartitions["UserStacks"] = 6] = "UserStacks";
    })(MemoryPartitions || (MemoryPartitions = {}));

    (function (MemoryAnchor) {
        MemoryAnchor[MemoryAnchor["Low"] = 0] = "Low";
        MemoryAnchor[MemoryAnchor["High"] = 1] = "High";
        MemoryAnchor[MemoryAnchor["Address"] = 2] = "Address";
        MemoryAnchor[MemoryAnchor["LowAligned"] = 3] = "LowAligned";
        MemoryAnchor[MemoryAnchor["HighAligned"] = 4] = "HighAligned";
    })(hle.MemoryAnchor || (hle.MemoryAnchor = {}));
    var MemoryAnchor = hle.MemoryAnchor;

    var MemoryPartition = (function () {
        function MemoryPartition(name, low, high, allocated, parent) {
            this.name = name;
            this.low = low;
            this.high = high;
            this.allocated = allocated;
            this.parent = parent;
            this._childPartitions = [];
        }
        Object.defineProperty(MemoryPartition.prototype, "size", {
            get: function () {
                return this.high - this.low;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(MemoryPartition.prototype, "root", {
            get: function () {
                return (this.parent) ? this.parent.root : this;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(MemoryPartition.prototype, "childPartitions", {
            get: function () {
                if (this._childPartitions.length == 0)
                    this._childPartitions.push(new MemoryPartition("", this.low, this.high, false));
                return this._childPartitions;
            },
            enumerable: true,
            configurable: true
        });

        MemoryPartition.prototype.contains = function (address) {
            return address >= this.low && address < this.high;
        };

        MemoryPartition.prototype.deallocate = function () {
            this.allocated = false;
            if (this.parent) {
                this.parent.cleanup();
            }
        };

        MemoryPartition.prototype.allocate = function (size, anchor, address, name) {
            if (typeof address === "undefined") { address = 0; }
            if (typeof name === "undefined") { name = ''; }
            switch (anchor) {
                case 3 /* LowAligned */:
                case 0 /* Low */:
                    return this.allocateLow(size, name);
                case 1 /* High */:
                    return this.allocateHigh(size, name);
                case 2 /* Address */:
                    return this.allocateSet(size, address, name);
                default:
                    throw (new Error(sprintf("Not implemented anchor %d:%s", anchor, MemoryAnchor[anchor])));
            }
        };

        MemoryPartition.prototype.allocateSet = function (size, addressLow, name) {
            if (typeof name === "undefined") { name = ''; }
            var childs = this.childPartitions;
            var addressHigh = addressLow + size;

            if (!this.contains(addressLow) || !this.contains(addressHigh)) {
                throw (new Error(sprintf("Can't allocate [%08X-%08X] in [%08X-%08X]", addressLow, addressHigh, this.low, this.high)));
            }

            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (!child.contains(addressLow))
                    continue;
                if (child.allocated)
                    throw (new Error("Memory already allocated"));
                if (!child.contains(addressHigh - 1))
                    throw (new Error("Can't fit memory"));

                var p1 = new MemoryPartition('', child.low, addressLow, false, this);
                var p2 = new MemoryPartition(name, addressLow, addressHigh, true, this);
                var p3 = new MemoryPartition('', addressHigh, child.high, false, this);

                childs.splice(n, 1, p1, p2, p3);

                this.cleanup();
                return p2;
            }
            console.log(sprintf('address: %08X, size: %d', addressLow, size));
            console.log(this);
            throw (new Error("Can't find the segment"));
        };

        MemoryPartition.prototype.allocateLow = function (size, name) {
            if (typeof name === "undefined") { name = ''; }
            return this.allocateLowHigh(size, true, name);
        };

        MemoryPartition.prototype.allocateHigh = function (size, name) {
            if (typeof name === "undefined") { name = ''; }
            return this.allocateLowHigh(size, false, name);
        };

        MemoryPartition.prototype.allocateLowHigh = function (size, low, name) {
            if (typeof name === "undefined") { name = ''; }
            var childs = this.childPartitions;
            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (child.allocated)
                    continue;
                if (child.size < size)
                    continue;

                if (low) {
                    var p1 = child.low;
                    var p2 = child.low + size;
                    var p3 = child.high;
                    var allocatedChild = new MemoryPartition(name, p1, p2, true, this);
                    var unallocatedChild = new MemoryPartition("", p2, p3, false, this);
                } else {
                    var p1 = child.low;
                    var p2 = child.high - size;
                    var p3 = child.high;
                    var unallocatedChild = new MemoryPartition("", p1, p2, false, this);
                    var allocatedChild = new MemoryPartition(name, p2, p3, true, this);
                }
                childs.splice(n, 1, allocatedChild, unallocatedChild);
                this.cleanup();
                return allocatedChild;
            }

            console.info(this);
            throw ("Can't find a partition with " + size + " available");
        };

        MemoryPartition.prototype.unallocate = function () {
            this.name = '';
            this.allocated = false;
            if (this.parent)
                this.parent.cleanup();
        };

        MemoryPartition.prototype.cleanup = function () {
            // join contiguous free memory
            var childs = this.childPartitions;
            if (childs.length >= 2) {
                for (var n = 0; n < childs.length - 1; n++) {
                    var child = childs[n + 0];
                    var c1 = childs[n + 1];
                    if (!child.allocated && !c1.allocated) {
                        childs.splice(n, 2, new MemoryPartition("", child.low, c1.high, false, this));
                        n--;
                    }
                }
            }

            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (!child.allocated && child.size == 0)
                    childs.splice(n, 1);
            }
        };

        Object.defineProperty(MemoryPartition.prototype, "nonAllocatedPartitions", {
            get: function () {
                return this.childPartitions.filter(function (item) {
                    return !item.allocated;
                });
            },
            enumerable: true,
            configurable: true
        });

        MemoryPartition.prototype.getTotalFreeMemory = function () {
            return this.nonAllocatedPartitions.reduce(function (prev, item) {
                return item.size + prev;
            }, 0);
        };

        MemoryPartition.prototype.getMaxContiguousFreeMemory = function () {
            var items = this.nonAllocatedPartitions.sort(function (a, b) {
                return a.size - b.size;
            });
            return (items.length) ? items[0].size : 0;
        };

        MemoryPartition.prototype.findFreeChildWithSize = function (size) {
        };
        return MemoryPartition;
    })();
    hle.MemoryPartition = MemoryPartition;

    var MemoryManager = (function () {
        function MemoryManager() {
            this.memoryPartitionsUid = {};
            this.init();
        }
        MemoryManager.prototype.init = function () {
            this.memoryPartitionsUid[0 /* Kernel0 */] = new MemoryPartition("Kernel Partition 1", 0x88000000, 0x88300000, false);
            this.memoryPartitionsUid[2 /* User */] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
            this.memoryPartitionsUid[6 /* UserStacks */] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
            this.memoryPartitionsUid[5 /* VolatilePartition */] = new MemoryPartition("Volatile Partition", 0x08400000, 0x08800000, false);
        };

        Object.defineProperty(MemoryManager.prototype, "userPartition", {
            get: function () {
                return this.memoryPartitionsUid[2 /* User */];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(MemoryManager.prototype, "stackPartition", {
            get: function () {
                return this.memoryPartitionsUid[6 /* UserStacks */];
            },
            enumerable: true,
            configurable: true
        });
        return MemoryManager;
    })();
    hle.MemoryManager = MemoryManager;
})(hle || (hle = {}));
var hle;
(function (hle) {
    var ModuleWrapper = (function () {
        function ModuleWrapper(moduleName, _module) {
            this.moduleName = moduleName;
            this._module = _module;
            this.names = {};
            this.nids = {};
            for (var key in _module) {
                var item = _module[key];
                if (item && item instanceof core.NativeFunction) {
                    var nativeFunction = item;
                    nativeFunction.name = key;
                    this.nids[nativeFunction.nid] = nativeFunction;
                    this.names[nativeFunction.name] = nativeFunction;
                }
            }
        }
        ModuleWrapper.prototype.getByName = function (name) {
            return this._module[name];
        };

        ModuleWrapper.prototype.getByNid = function (nid) {
            var result = this.nids[nid];
            if (!result)
                throw (sprintf("Can't find function '%s':0x%08X", this.moduleName, nid));
            return result;
        };
        return ModuleWrapper;
    })();
    hle.ModuleWrapper = ModuleWrapper;

    var ModuleManager = (function () {
        function ModuleManager(context) {
            this.context = context;
            this.names = {};
            this.moduleWrappers = {};
            for (var key in hle.modules) {
                if (key == 'createNativeFunction')
                    continue;
                this.add(key, hle.modules[key]);
            }
        }
        ModuleManager.prototype.getByName = function (name) {
            var _moduleWrapper = this.moduleWrappers[name];
            if (_moduleWrapper)
                return _moduleWrapper;

            var _class = this.names[name];
            if (!_class)
                throw ("Can't find module '" + name + "'");

            var _module = new _class(this.context);
            return this.moduleWrappers[name] = new ModuleWrapper(name, _module);
        };

        ModuleManager.prototype.add = function (name, _class) {
            if (!_class)
                throw ("Can't find module '" + name + "'");
            this.names[name] = _class;
        };
        return ModuleManager;
    })();
    hle.ModuleManager = ModuleManager;

    var ModuleManagerSyscalls = (function () {
        function ModuleManagerSyscalls() {
        }
        ModuleManagerSyscalls.registerSyscalls = function (syscallManager, moduleManager) {
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x206D, "ThreadManForUser", "sceKernelCreateThread");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x206F, "ThreadManForUser", "sceKernelStartThread");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2071, "ThreadManForUser", "sceKernelExitDeleteThread");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20BF, "UtilsForUser", "sceKernelUtilsMt19937Init");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20C0, "UtilsForUser", "sceKernelUtilsMt19937UInt");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x213A, "sceDisplay", "sceDisplaySetMode");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2147, "sceDisplay", "sceDisplayWaitVblankStart");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x213F, "sceDisplay", "sceDisplaySetFrameBuf");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20EB, "LoadExecForUser", "sceKernelExitGame");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2150, "sceCtrl", "sceCtrlPeekBufferPositive");
        };

        ModuleManagerSyscalls.registerModule = function (syscallManager, moduleManager, id, moduleName, functionName) {
            syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
        };
        return ModuleManagerSyscalls;
    })();
    hle.ModuleManagerSyscalls = ModuleManagerSyscalls;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var InterruptManager = (function () {
            function InterruptManager(context) {
                this.context = context;
            }
            return InterruptManager;
        })();
        modules.InterruptManager = InterruptManager;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var IoFileMgrForUser = (function () {
            function IoFileMgrForUser(context) {
                var _this = this;
                this.context = context;
                this.sceIoDevctl = hle.modules.createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, function (deviceName, command, inputPointer, inputLength, outputPointer, outputLength) {
                    var input = _this.context.memory.getPointerStream(inputPointer, inputLength);
                    var output = _this.context.memory.getPointerStream(outputPointer, outputLength);

                    switch (deviceName) {
                        case 'emulator:':
                        case 'kemulator:':
                            switch (command) {
                                case 1:
                                    output.writeInt32(1);
                                    return 0;
                                    break;
                                case 2:
                                    $('#output').append(input.readString(input.length));

                                    //console.info();
                                    return 0;
                                    break;
                            }
                            break;
                    }

                    console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoDevctl("%s", %d, %08X, %d, %08X, %d)', deviceName, command, inputPointer, inputLength, outputPointer, outputLength));
                    return 0;
                });
                this.sceIoDopen = hle.modules.createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, function (directoryPath) {
                    console.warn('Not implemented IoFileMgrForUser.sceIoDopen("' + directoryPath + '")');
                    return 0;
                });
                this.sceIoDclose = hle.modules.createNativeFunction(0xEB092469, 150, 'uint', 'int', this, function (fileId) {
                    console.warn('Not implemented IoFileMgrForUser.sceIoDclose');
                    return 0;
                });
                this.fileUids = new UidCollection(1);
                this.sceIoOpen = hle.modules.createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
                    var file = _this.context.fileManager.open(filename, flags, mode);
                    console.info(sprintf('IoFileMgrForUser.sceIoOpen("%s", %d, 0%o)', filename, flags, mode));
                    return _this.fileUids.allocate(file);
                });
                this.sceIoClose = hle.modules.createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, function (fileId) {
                    var file = _this.fileUids.get(fileId);
                    file.close();

                    _this.fileUids.remove(fileId);

                    return 0;
                });
                this.sceIoWrite = hle.modules.createNativeFunction(0x42EC03AC, 150, 'int', 'int/uint/int', this, function (fileId, inputPointer, inputLength) {
                    var input = _this.context.memory.getPointerStream(inputPointer, inputLength);

                    //console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite("%s")', input.readString(input.length)));
                    //console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite(%d, 0x%08X, %d)', fileId, inputPointer, inputLength));
                    return inputLength;
                });
                this.sceIoRead = hle.modules.createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, function (fileId, outputPointer, outputLength) {
                    var file = _this.fileUids.get(fileId);

                    return file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                        file.cursor += readedData.byteLength;
                        _this.context.memory.writeBytes(outputPointer, readedData);
                        return readedData.byteLength;
                    });
                });
                this.sceIoChdir = hle.modules.createNativeFunction(0x55F4717D, 150, 'int', 'string', this, function (path) {
                    console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
                    _this.context.fileManager.chdir(path);
                    return 0;
                });
                this.sceIoLseek = hle.modules.createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, function (fileId, offset, whence) {
                    console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d)', fileId, offset, whence));
                    return _this._seek(fileId, offset, whence);
                });
                this.sceIoLseek32 = hle.modules.createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, function (fileId, offset, whence) {
                    console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d)', fileId, offset, whence));
                    return _this._seek(fileId, offset, whence);
                });
            }
            IoFileMgrForUser.prototype._seek = function (fileId, offset, whence) {
                var file = this.fileUids.get(fileId);
                switch (whence) {
                    case 0 /* Set */:
                        file.cursor = 0 + offset;
                        break;
                    case 1 /* Cursor */:
                        file.cursor = file.cursor + offset;
                        break;
                    case 2 /* End */:
                        file.cursor = file.entry.size + offset;
                        break;
                }
                return file.cursor;
            };
            return IoFileMgrForUser;
        })();
        modules.IoFileMgrForUser = IoFileMgrForUser;

        var SeekAnchor;
        (function (SeekAnchor) {
            SeekAnchor[SeekAnchor["Set"] = 0] = "Set";
            SeekAnchor[SeekAnchor["Cursor"] = 1] = "Cursor";
            SeekAnchor[SeekAnchor["End"] = 2] = "End";
        })(SeekAnchor || (SeekAnchor = {}));
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var KDebugForKernel = (function () {
            function KDebugForKernel(context) {
                this.context = context;
            }
            return KDebugForKernel;
        })();
        modules.KDebugForKernel = KDebugForKernel;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var Kernel_Library = (function () {
            function Kernel_Library(context) {
                this.context = context;
                this.sceKernelCpuSuspendIntr = hle.modules.createNativeFunction(0x092968F4, 150, 'uint', '', this, function () {
                    console.warn(sprintf("sceKernelCpuSuspendIntr not implemented"));
                    return 0;
                });
                this.sceKernelCpuResumeIntr = hle.modules.createNativeFunction(0x5F10D406, 150, 'uint', '', this, function (flags) {
                    console.warn(sprintf("sceKernelCpuResumeIntr not implemented"));
                    return 0;
                });
            }
            return Kernel_Library;
        })();
        modules.Kernel_Library = Kernel_Library;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var LoadCoreForKernel = (function () {
            function LoadCoreForKernel(context) {
                this.context = context;
            }
            return LoadCoreForKernel;
        })();
        modules.LoadCoreForKernel = LoadCoreForKernel;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var LoadExecForUser = (function () {
            function LoadExecForUser(context) {
                this.context = context;
                this.sceKernelExitGame = hle.modules.createNativeFunction(0xBD2F1094, 150, 'uint', 'HleThread', this, function (thread) {
                    console.info('sceKernelExitGame');
                    thread.stop();
                    throw (new CpuBreakException());
                    return 0;
                });
                this.sceKernelExitGame2 = hle.modules.createNativeFunction(0x05572A5F, 150, 'uint', 'EmulatorContext/CpuState', this, function (context, state) {
                    var thread = state.thread;
                    console.info('sceKernelExitGame');
                    thread.stop();
                    throw (new CpuBreakException());
                });
                this.sceKernelRegisterExitCallback = hle.modules.createNativeFunction(0x4AC57943, 150, 'uint', 'int', this, function (callbackId) {
                    console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
                    return 0;
                });
            }
            return LoadExecForUser;
        })();
        modules.LoadExecForUser = LoadExecForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var ModuleMgrForUser = (function () {
            function ModuleMgrForUser(context) {
                this.context = context;
                this.sceKernelSelfStopUnloadModule = hle.modules.createNativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int', this, function (unknown, argsize, argp) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
                    return 0;
                });
                this.sceKernelLoadModule = hle.modules.createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, function (path, flags, sceKernelLMOption) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule(%s, %d)', path, flags));
                    return 0;
                });
                this.sceKernelStartModule = hle.modules.createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, function (moduleId, argumentSize, argumentPointer, status, sceKernelSMOption) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
                    return 0;
                });
                this.sceKernelGetModuleIdByAddress = hle.modules.createNativeFunction(0xD8B73127, 150, 'uint', 'uint', this, function (address) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
                    return -1;
                });
            }
            return ModuleMgrForUser;
        })();
        modules.ModuleMgrForUser = ModuleMgrForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceAtrac3plus = (function () {
            function sceAtrac3plus(context) {
                this.context = context;
                this.sceAtracSetDataAndGetID = hle.modules.createNativeFunction(0x7A20E7AF, 150, 'uint', 'void*/int', this, function (dataPointer, dataLength) {
                    return 0;
                });
                this.sceAtracGetSecondBufferInfo = hle.modules.createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, function (id, puiPosition, puiDataByte) {
                    puiPosition.writeInt32(0);
                    puiDataByte.writeInt32(0);
                    return 0;
                });
            }
            return sceAtrac3plus;
        })();
        modules.sceAtrac3plus = sceAtrac3plus;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var AudioFormat;
        (function (AudioFormat) {
            AudioFormat[AudioFormat["Stereo"] = 0x00] = "Stereo";
            AudioFormat[AudioFormat["Mono"] = 0x10] = "Mono";
        })(AudioFormat || (AudioFormat = {}));

        var Channel = (function () {
            function Channel(id) {
                this.id = id;
                this.allocated = false;
                this.sampleCount = 44100;
                this.format = 0 /* Stereo */;
            }
            return Channel;
        })();

        var sceAudio = (function () {
            function sceAudio(context) {
                var _this = this;
                this.context = context;
                this.channels = [];
                this.sceAudioChReserve = hle.modules.createNativeFunction(0x5EC81C55, 150, 'uint', 'int/int/int', this, function (channelId, sampleCount, format) {
                    if (channelId >= _this.channels.length)
                        return -1;
                    if (channelId < 0) {
                        channelId = _this.channels.first(function (channel) {
                            return !channel.allocated;
                        }).id;
                        if (channelId === undefined) {
                            console.warn('Not implemented sceAudio.sceAudioChReserve');
                            return -2;
                        }
                    }
                    var channel = _this.channels[channelId];
                    channel.allocated = true;
                    channel.sampleCount = sampleCount;
                    channel.format = format;

                    //console.log(this.context);
                    channel.channel = _this.context.audio.createChannel();
                    channel.channel.start();
                    return channelId;
                });
                this.sceAudioChRelease = hle.modules.createNativeFunction(0x6FC46853, 150, 'uint', 'int', this, function (channelId) {
                    var channel = _this.channels[channelId];
                    channel.allocated = false;
                    channel.channel.stop();
                    channel.channel = null;
                });
                this.sceAudioOutputPannedBlocking = hle.modules.createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
                    var channel = _this.channels[channelId];
                    return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
                });
                this.sceAudioOutputBlocking = hle.modules.createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
                    var channel = _this.channels[channelId];
                    return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
                });
                this.sceAudioChangeChannelVolume = hle.modules.createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, function (channelId, volumeLeft, volumeRight) {
                    console.warn("Not implemented sceAudioChangeChannelVolume");
                    return 0;
                });
                for (var n = 0; n < 8; n++)
                    this.channels.push(new Channel(n));
            }
            return sceAudio;
        })();
        modules.sceAudio = sceAudio;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceCtrl = (function () {
            function sceCtrl(context) {
                var _this = this;
                this.context = context;
                this.sceCtrlPeekBufferPositive = hle.modules.createNativeFunction(0x3A622550, 150, 'uint', 'void*/int', this, function (sceCtrlDataPtr, count) {
                    core.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);
                    return 0;
                });
                this.sceCtrlReadBufferPositive = hle.modules.createNativeFunction(0x1F803938, 150, 'uint', 'CpuState/void*/int', this, function (state, sceCtrlDataPtr, count) {
                    core.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);

                    return _this.context.display.waitVblankAsync();
                });
                this.sceCtrlSetSamplingCycle = hle.modules.createNativeFunction(0x6A2774F3, 150, 'uint', 'int', this, function (samplingCycle) {
                    console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
                    return 0;
                });
                this.sceCtrlSetSamplingMode = hle.modules.createNativeFunction(0x1F4011E6, 150, 'uint', 'int', this, function (samplingMode) {
                    console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
                    return 0;
                });
            }
            return sceCtrl;
        })();
        modules.sceCtrl = sceCtrl;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceDisplay = (function () {
            function sceDisplay(context) {
                var _this = this;
                this.context = context;
                this.sceDisplaySetMode = hle.modules.createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, function (mode, width, height) {
                    console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
                    return 0;
                });
                this.sceDisplayWaitVblank = hle.modules.createNativeFunction(0x36CDFADE, 150, 'uint', 'int', this, function (cycleNum) {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayWaitVblankCB = hle.modules.createNativeFunction(0x8EB9EC49, 150, 'uint', 'int', this, function (cycleNum) {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayWaitVblankStart = hle.modules.createNativeFunction(0x984C27E7, 150, 'uint', '', this, function () {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayGetVcount = hle.modules.createNativeFunction(0x9C6EAAD7, 150, 'uint', '', this, function () {
                    return _this.context.display.vblankCount;
                });
                this.sceDisplayWaitVblankStartCB = hle.modules.createNativeFunction(0x46F186C3, 150, 'uint', '', this, function () {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplaySetFrameBuf = hle.modules.createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, function (address, bufferWidth, pixelFormat, sync) {
                    _this.context.display.address = address;
                    _this.context.display.bufferWidth = bufferWidth;
                    _this.context.display.pixelFormat = pixelFormat;
                    _this.context.display.sync = sync;
                    return 0;
                });
            }
            return sceDisplay;
        })();
        modules.sceDisplay = sceDisplay;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceDmac = (function () {
            function sceDmac(context) {
                var _this = this;
                this.context = context;
                this.sceDmacMemcpy = hle.modules.createNativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
                    _this.context.memory.copy(source, destination, size);
                    return 0;
                });
            }
            return sceDmac;
        })();
        modules.sceDmac = sceDmac;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceGe_user = (function () {
            function sceGe_user(context) {
                var _this = this;
                this.context = context;
                this.sceGeEdramGetAddr = hle.modules.createNativeFunction(0xE47E40E4, 150, 'uint', '', this, function () {
                    return 0x04000000;
                });
                this.sceGeSetCallback = hle.modules.createNativeFunction(0xA4FC06A4, 150, 'uint', 'int', this, function (callbackDataPtr) {
                    //console.warn('Not implemented sceGe_user.sceGeSetCallback');
                    return 0;
                });
                this.sceGeListEnQueue = hle.modules.createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, function (start, stall, callbackId, argsPtr) {
                    return _this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
                });
                this.sceGeListSync = hle.modules.createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, function (displayListId, syncType) {
                    //console.warn('Not implemented sceGe_user.sceGeListSync');
                    return _this.context.gpu.listSync(displayListId, syncType);
                });
                this.sceGeListUpdateStallAddr = hle.modules.createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, function (displayListId, stall) {
                    //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
                    return _this.context.gpu.updateStallAddr(displayListId, stall);
                });
                this.sceGeDrawSync = hle.modules.createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, function (syncType) {
                    //console.warn('Not implemented sceGe_user.sceGeDrawSync');
                    return _this.context.gpu.drawSync(syncType);
                });
            }
            return sceGe_user;
        })();
        modules.sceGe_user = sceGe_user;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceHprm = (function () {
            function sceHprm(context) {
                this.context = context;
            }
            return sceHprm;
        })();
        modules.sceHprm = sceHprm;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceImpose = (function () {
            function sceImpose(context) {
                this.context = context;
                this.sceImposeGetBatteryIconStatus = hle.modules.createNativeFunction(0x8C943191, 150, 'uint', 'void*/void*', this, function (isChargingPointer, iconStatusPointer) {
                    isChargingPointer.writeInt32(0);
                    iconStatusPointer.writeInt32(0);
                    return 0;
                });
            }
            return sceImpose;
        })();
        modules.sceImpose = sceImpose;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceMpeg = (function () {
            function sceMpeg(context) {
                this.context = context;
            }
            return sceMpeg;
        })();
        modules.sceMpeg = sceMpeg;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNet = (function () {
            function sceNet(context) {
                this.context = context;
            }
            return sceNet;
        })();
        modules.sceNet = sceNet;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetAdhoc = (function () {
            function sceNetAdhoc(context) {
                this.context = context;
            }
            return sceNetAdhoc;
        })();
        modules.sceNetAdhoc = sceNetAdhoc;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetAdhocctl = (function () {
            function sceNetAdhocctl(context) {
                this.context = context;
            }
            return sceNetAdhocctl;
        })();
        modules.sceNetAdhocctl = sceNetAdhocctl;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetAdhocMatching = (function () {
            function sceNetAdhocMatching(context) {
                this.context = context;
            }
            return sceNetAdhocMatching;
        })();
        modules.sceNetAdhocMatching = sceNetAdhocMatching;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetApctl = (function () {
            function sceNetApctl(context) {
                this.context = context;
            }
            return sceNetApctl;
        })();
        modules.sceNetApctl = sceNetApctl;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetInet = (function () {
            function sceNetInet(context) {
                this.context = context;
            }
            return sceNetInet;
        })();
        modules.sceNetInet = sceNetInet;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceNetResolver = (function () {
            function sceNetResolver(context) {
                this.context = context;
            }
            return sceNetResolver;
        })();
        modules.sceNetResolver = sceNetResolver;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var scePower = (function () {
            function scePower(context) {
                var _this = this;
                this.context = context;
                this.cpuFreq = 222;
                this.scePowerGetCpuClockFrequencyInt = hle.modules.createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, function () {
                    return _this.cpuFreq;
                });
                this.scePowerRegisterCallback = hle.modules.createNativeFunction(0x04B7766E, 150, 'int', '', this, function (slotIndex, callbackId) {
                    console.warn("Not implemented scePowerRegisterCallback");
                    return 0;
                });
            }
            return scePower;
        })();
        modules.scePower = scePower;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceRtc = (function () {
            function sceRtc(context) {
                this.context = context;
                this.sceRtcGetCurrentTick = hle.modules.createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, function (tickPtr) {
                    tickPtr.writeInt32(new Date().getTime());
                    tickPtr.writeInt32(0);
                    return 0;
                });
                this.sceRtcGetDayOfWeek = hle.modules.createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, function (year, month, day) {
                    return new Date(year, month, day).getDay();
                });
                this.sceRtcGetDaysInMonth = hle.modules.createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, function (year, month) {
                    return new Date(year, month, 0).getDate();
                });
                this.sceRtcGetTickResolution = hle.modules.createNativeFunction(0xC41C2853, 150, 'uint', '', this, function (tickPtr) {
                    return 1000000;
                });
                this.sceRtcSetTick = hle.modules.createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, function (date, ticks) {
                    throw (new TypeError("Not implemented sceRtcSetTick"));
                });
                this.sceRtcGetTick = hle.modules.createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, function (date, ticks) {
                    throw (new TypeError("Not implemented sceRtcGetTick"));
                });
            }
            return sceRtc;
        })();
        modules.sceRtc = sceRtc;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceSasCore = (function () {
            function sceSasCore(context) {
                this.context = context;
            }
            return sceSasCore;
        })();
        modules.sceSasCore = sceSasCore;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceSuspendForUser = (function () {
            function sceSuspendForUser(context) {
                this.context = context;
            }
            return sceSuspendForUser;
        })();
        modules.sceSuspendForUser = sceSuspendForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceUmdUser = (function () {
            function sceUmdUser(context) {
                this.context = context;
                this.sceUmdRegisterUMDCallBack = hle.modules.createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, function (callbackId) {
                    console.warn('Not implemented sceUmdRegisterUMDCallBack');
                    return 0;
                });
                this.sceUmdCheckMedium = hle.modules.createNativeFunction(0x46EBB729, 150, 'uint', '', this, function () {
                    console.warn('Not implemented sceUmdCheckMedium');
                    return 0;
                });
                this.sceUmdWaitDriveStat = hle.modules.createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, function (pspUmdState) {
                    console.warn('Not implemented sceUmdWaitDriveStat');
                    return 0;
                });
                this.sceUmdWaitDriveStatCB = hle.modules.createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint', this, function (pspUmdState, timeout) {
                    console.warn('Not implemented sceUmdWaitDriveStatCB');
                    return 0;
                });
                this.sceUmdActivate = hle.modules.createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, function (mode, drive) {
                    console.warn('Not implemented sceUmdActivate');
                    return 0;
                });
                this.sceUmdGetDriveStat = hle.modules.createNativeFunction(0x6B4A146C, 150, 'uint', '', this, function () {
                    return 2 /* PSP_UMD_PRESENT */ | 16 /* PSP_UMD_READY */ | 32 /* PSP_UMD_READABLE */;
                });
                this.sceUmdWaitDriveStatWithTimer = hle.modules.createNativeFunction(0x56202973, 150, 'uint', 'uint/uint', this, function (state, timeout) {
                    return Promise.resolve(0);
                });
            }
            return sceUmdUser;
        })();
        modules.sceUmdUser = sceUmdUser;

        var PspUmdState;
        (function (PspUmdState) {
            PspUmdState[PspUmdState["PSP_UMD_INIT"] = 0x00] = "PSP_UMD_INIT";
            PspUmdState[PspUmdState["PSP_UMD_NOT_PRESENT"] = 0x01] = "PSP_UMD_NOT_PRESENT";
            PspUmdState[PspUmdState["PSP_UMD_PRESENT"] = 0x02] = "PSP_UMD_PRESENT";
            PspUmdState[PspUmdState["PSP_UMD_CHANGED"] = 0x04] = "PSP_UMD_CHANGED";
            PspUmdState[PspUmdState["PSP_UMD_NOT_READY"] = 0x08] = "PSP_UMD_NOT_READY";
            PspUmdState[PspUmdState["PSP_UMD_READY"] = 0x10] = "PSP_UMD_READY";
            PspUmdState[PspUmdState["PSP_UMD_READABLE"] = 0x20] = "PSP_UMD_READABLE";
        })(PspUmdState || (PspUmdState = {}));
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceUtility = (function () {
            function sceUtility(context) {
                var _this = this;
                this.context = context;
                this.currentStep = 0 /* NONE */;
                this.sceUtilitySavedataInitStart = hle.modules.createNativeFunction(0x50C4CD57, 150, 'uint', 'void*', this, function (paramsPtr) {
                    _this.currentStep = 3 /* SUCCESS */;
                    return 0;
                });
                this.sceUtilitySavedataShutdownStart = hle.modules.createNativeFunction(0x9790B33C, 150, 'uint', '', this, function () {
                    _this.currentStep = 4 /* SHUTDOWN */;
                    return 0;
                });
                this.sceUtilitySavedataGetStatus = hle.modules.createNativeFunction(0x8874DBE0, 150, 'uint', '', this, function () {
                    try  {
                        return _this.currentStep;
                    } finally {
                        if (_this.currentStep == 4 /* SHUTDOWN */)
                            _this.currentStep = 0 /* NONE */;
                    }
                });
            }
            return sceUtility;
        })();
        modules.sceUtility = sceUtility;

        var DialogStepEnum;
        (function (DialogStepEnum) {
            DialogStepEnum[DialogStepEnum["NONE"] = 0] = "NONE";
            DialogStepEnum[DialogStepEnum["INIT"] = 1] = "INIT";
            DialogStepEnum[DialogStepEnum["PROCESSING"] = 2] = "PROCESSING";
            DialogStepEnum[DialogStepEnum["SUCCESS"] = 3] = "SUCCESS";
            DialogStepEnum[DialogStepEnum["SHUTDOWN"] = 4] = "SHUTDOWN";
        })(DialogStepEnum || (DialogStepEnum = {}));
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var sceWlanDrv = (function () {
            function sceWlanDrv(context) {
                this.context = context;
            }
            return sceWlanDrv;
        })();
        modules.sceWlanDrv = sceWlanDrv;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var StdioForUser = (function () {
            function StdioForUser(context) {
                this.context = context;
                this.sceKernelStdin = hle.modules.createNativeFunction(0x172D316E, 150, 'int', '', this, function () {
                    return 10000001;
                });
                this.sceKernelStdout = hle.modules.createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, function () {
                    return 10000002;
                });
                this.sceKernelStderr = hle.modules.createNativeFunction(0xF78BA90A, 150, 'int', '', this, function () {
                    return 10000003;
                });
            }
            return StdioForUser;
        })();
        modules.StdioForUser = StdioForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var SysMemUserForUser = (function () {
            function SysMemUserForUser(context) {
                var _this = this;
                this.context = context;
                this.blockUids = new UidCollection(1);
                this.sceKernelAllocPartitionMemory = hle.modules.createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, function (partitionId, name, anchor, size, address) {
                    var parentPartition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
                    var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
                    console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:%s, type:%d, size:%d, address:%08X)", partitionId, name, anchor, size, address));
                    return _this.blockUids.allocate(allocatedPartition);
                });
                this.sceKernelFreePartitionMemory = hle.modules.createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, function (blockId) {
                    var partition = _this.blockUids.get(blockId);
                    partition.deallocate();
                    _this.blockUids.remove(blockId);
                    return 0;
                });
                this.sceKernelGetBlockHeadAddr = hle.modules.createNativeFunction(0x9D9A5BA1, 150, 'int', 'int', this, function (blockId) {
                    var block = _this.blockUids.get(blockId);
                    return block.low;
                });
                /**
                * Get the size of the largest free memory block.
                */
                this.sceKernelMaxFreeMemSize = hle.modules.createNativeFunction(0xA291F107, 150, 'int', '', this, function () {
                    return _this.context.memoryManager.userPartition.nonAllocatedPartitions.max(function (partition) {
                        return partition.size;
                    });
                });
                this.sceKernelSetCompiledSdkVersion = hle.modules.createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, function (sdkVersion) {
                    console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
                });
                this.sceKernelSetCompilerVersion = hle.modules.createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, function (version) {
                    console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
                });
                this.sceKernelPrintf = hle.modules.createNativeFunction(0x13A5ABEF, 150, 'void', 'string', this, function (format) {
                    console.info('sceKernelPrintf: ' + format);
                });
            }
            return SysMemUserForUser;
        })();
        modules.SysMemUserForUser = SysMemUserForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var ThreadManForUser = (function () {
            function ThreadManForUser(context) {
                var _this = this;
                this.context = context;
                this.threadUids = new UidCollection(1);
                this.sceKernelCreateThread = hle.modules.createNativeFunction(0x446D8DE6, 150, 'uint', 'string/uint/int/int/int/int', this, function (name, entryPoint, initPriority, stackSize, attribute, optionPtr) {
                    var stackPartition = _this.context.memoryManager.stackPartition;
                    var newThread = _this.context.threadManager.create(name, entryPoint, initPriority, stackSize);
                    newThread.id = _this.threadUids.allocate(newThread);
                    return newThread.id;
                });
                this.sceKernelDelayThread = hle.modules.createNativeFunction(0xCEADEB47, 150, 'uint', 'uint', this, function (delayInMicroseconds) {
                    return PromiseUtils.delayAsync(delayInMicroseconds / 1000);
                });
                this.sceKernelDelayThreadCB = hle.modules.createNativeFunction(0x68DA9E36, 150, 'uint', 'uint', this, function (delayInMicroseconds) {
                    return PromiseUtils.delayAsync(delayInMicroseconds / 1000);
                });
                this.sceKernelGetThreadCurrentPriority = hle.modules.createNativeFunction(0x94AA61EE, 150, 'int', 'HleThread', this, function (currentThread) {
                    return currentThread.priority;
                });
                this.sceKernelStartThread = hle.modules.createNativeFunction(0xF475845D, 150, 'uint', 'HleThread/int/int/int', this, function (currentThread, threadId, userDataLength, userDataPointer) {
                    var newThread = _this.threadUids.get(threadId);

                    console.info(sprintf('sceKernelStartThread: %d:"%s"', threadId, newThread.name));

                    var newState = newThread.state;
                    newState.GP = currentThread.state.GP;
                    newState.RA = 268435455 /* EXIT_THREAD */;
                    if (userDataPointer != null) {
                        newState.SP -= userDataLength;
                        newState.memory.copy(userDataPointer, newState.SP, userDataLength);
                        newState.gpr[4] = userDataLength;
                        newState.gpr[5] = newState.SP;
                    }
                    newThread.start();
                    return Promise.resolve(0);
                });
                this.sceKernelDeleteThread = hle.modules.createNativeFunction(0x9FA03CD3, 150, 'int', 'int', this, function (threadId) {
                    var newThread = _this.threadUids.get(threadId);
                    _this.threadUids.remove(threadId);
                    return 0;
                });
                this.sceKernelExitThread = hle.modules.createNativeFunction(0xAA73C935, 150, 'int', 'HleThread/int', this, function (currentThread, exitStatus) {
                    console.info(sprintf('sceKernelExitThread: %d', exitStatus));

                    currentThread.exitStatus = exitStatus;
                    currentThread.stop();
                    throw (new CpuBreakException());
                });
                this.sceKernelTerminateThread = hle.modules.createNativeFunction(0x616403BA, 150, 'int', 'int', this, function (threadId) {
                    console.info(sprintf('sceKernelTerminateThread: %d', threadId));

                    var newThread = _this.threadUids.get(threadId);
                    newThread.stop();
                    newThread.exitStatus = 0x800201ac;
                    return 0;
                });
                this.sceKernelExitDeleteThread = hle.modules.createNativeFunction(0x809CE29B, 150, 'uint', 'CpuState/int', this, function (state, exitStatus) {
                    var currentThread = state.thread;
                    currentThread.exitStatus = exitStatus;
                    currentThread.stop();
                    throw (new CpuBreakException());
                });
                this.sceKernelCreateCallback = hle.modules.createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, function (name, functionCallbackAddr, argument) {
                    console.warn('Not implemented ThreadManForUser.sceKernelCreateCallback');
                    return 0;
                });
                this.sceKernelSleepThreadCB = hle.modules.createNativeFunction(0x82826F70, 150, 'uint', 'HleThread/CpuState', this, function (currentThread, state) {
                    currentThread.suspend();
                    return Promise.resolve(0);
                });
                this.sceKernelSleepThread = hle.modules.createNativeFunction(0x9ACE131E, 150, 'uint', 'CpuState', this, function (state) {
                    var currentThread = state.thread;
                    currentThread.suspend();
                    return Promise.resolve(0);
                });
                this.eventFlagUids = new UidCollection(1);
                this.sceKernelCreateEventFlag = hle.modules.createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, function (name, attributes, bitPattern, optionsPtr) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
                    var eventFlag = new EventFlag();
                    eventFlag.name = name;
                    eventFlag.attributes = attributes;
                    eventFlag.bitPattern = bitPattern;
                    return _this.eventFlagUids.allocate(eventFlag);
                });
                this.sceKernelSetEventFlag = hle.modules.createNativeFunction(0x1FB15A32, 150, 'uint', 'int/uint', this, function (id, bitPattern) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSetEventFlag(%d, %08X)', id, bitPattern));
                    return 0;
                });
                this.sceKernelWaitEventFlag = hle.modules.createNativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*', this, function (id, bits, waitType, outBits, timeout) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelWaitEventFlag(%d, %08X, %d)', id, bits, waitType));
                    return 0;
                });
                //[HlePspFunction(NID = 0x402FCF22, FirmwareVersion = 150)]
                //public int sceKernelWaitEventFlag(HleEventFlag EventFlag, uint Bits, EventFlagWaitTypeSet WaitType, uint * OutBits, uint * Timeout)
                //{
                this.sceKernelGetSystemTimeLow = hle.modules.createNativeFunction(0x369ED59D, 150, 'uint', '', this, function () {
                    //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
                    return new Date().getTime() * 1000;
                });
                this.sceKernelGetSystemTimeWide = hle.modules.createNativeFunction(0x82BC5777, 150, 'long', '', this, function () {
                    //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
                    return new Date().getTime() * 1000;
                });
                this.sceKernelGetThreadId = hle.modules.createNativeFunction(0x293B45B8, 150, 'int', 'HleThread', this, function (currentThread) {
                    return currentThread.id;
                });
                this.sceKernelReferThreadStatus = hle.modules.createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, function (threadId, sceKernelThreadInfoPtr) {
                    var thread = _this.threadUids.get(threadId);
                    var sceKernelThreadInfo = new SceKernelThreadInfo();
                    sceKernelThreadInfo.size = SceKernelThreadInfo.struct.length;
                    sceKernelThreadInfo.name = thread.name;

                    //console.log(thread.state.GP);
                    sceKernelThreadInfo.GP = thread.state.GP;
                    sceKernelThreadInfo.priorityInit = thread.initialPriority;
                    sceKernelThreadInfo.priority = thread.priority;
                    SceKernelThreadInfo.struct.write(sceKernelThreadInfoPtr, sceKernelThreadInfo);
                    return 0;
                });
                this.semaporesUid = new UidCollection(1);
                this.sceKernelCreateSema = hle.modules.createNativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*', this, function (name, attribute, initialCount, maxCount, options) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d)', name, attribute, initialCount, maxCount));
                    return _this.semaporesUid.allocate(new Semaphore(name, attribute, initialCount, maxCount));
                });
                this.sceKernelDeleteSema = hle.modules.createNativeFunction(0x28B6489C, 150, 'int', 'int', this, function (id) {
                    var semaphore = _this.semaporesUid.get(id);
                    semaphore.delete();
                    _this.semaporesUid.remove(id);
                    return 0;
                });
                this.sceKernelCancelSema = hle.modules.createNativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*', this, function (id, count, numWaitingThreadsPtr) {
                    var semaphore = _this.semaporesUid.get(id);
                    if (numWaitingThreadsPtr)
                        numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
                    semaphore.cancel();
                    return 0;
                });
                this.sceKernelWaitSema = hle.modules.createNativeFunction(0x4E3A1105, 150, 'int', 'int/int/void*', this, function (id, signal, timeout) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelWaitSema(%d, %d)', id, signal));
                    return _this.semaporesUid.get(id).waitAsync(signal);
                });
                this.sceKernelReferSemaStatus = hle.modules.createNativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*', this, function (id, infoStream) {
                    var semaphore = _this.semaporesUid.get(id);
                    var semaphoreInfo = new SceKernelSemaInfo();
                    semaphoreInfo.size = SceKernelSemaInfo.struct.length;
                    semaphoreInfo.attributes = semaphore.attributes;
                    semaphoreInfo.currentCount = semaphore.currentCount;
                    semaphoreInfo.initialCount = semaphore.initialCount;
                    semaphoreInfo.maximumCount = semaphore.maximumCount;
                    semaphoreInfo.name = semaphore.name;
                    semaphoreInfo.numberOfWaitingThreads = semaphore.numberOfWaitingThreads;
                    SceKernelSemaInfo.struct.write(infoStream, semaphoreInfo);
                });
                this.sceKernelSignalSema = hle.modules.createNativeFunction(0x3F53E640, 150, 'int', 'int/int', this, function (id, signal) {
                    console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d)', id, signal));
                    _this.semaporesUid.get(id).incrementCount(signal);
                    return 0;
                });
            }
            return ThreadManForUser;
        })();
        modules.ThreadManForUser = ThreadManForUser;

        var WaitingSemaphoreThread = (function () {
            function WaitingSemaphoreThread(expectedCount, wakeUp) {
                this.expectedCount = expectedCount;
                this.wakeUp = wakeUp;
            }
            return WaitingSemaphoreThread;
        })();

        var Semaphore = (function () {
            function Semaphore(name, attributes, initialCount, maximumCount) {
                this.name = name;
                this.attributes = attributes;
                this.initialCount = initialCount;
                this.maximumCount = maximumCount;
                this.waitingSemaphoreThreadList = new SortedSet();
                this.currentCount = initialCount;
            }
            Object.defineProperty(Semaphore.prototype, "numberOfWaitingThreads", {
                get: function () {
                    return this.waitingSemaphoreThreadList.length;
                },
                enumerable: true,
                configurable: true
            });

            Semaphore.prototype.incrementCount = function (count) {
                this.currentCount = Math.min(this.currentCount + count, this.maximumCount);
                this.updatedCount();
            };

            Semaphore.prototype.cancel = function () {
                this.waitingSemaphoreThreadList.forEach(function (item) {
                    item.wakeUp();
                });
            };

            Semaphore.prototype.updatedCount = function () {
                var _this = this;
                this.waitingSemaphoreThreadList.forEach(function (item) {
                    if (_this.currentCount >= item.expectedCount) {
                        _this.currentCount -= item.expectedCount;
                        item.wakeUp();
                    }
                });
            };

            Semaphore.prototype.waitAsync = function (expectedCount) {
                var _this = this;
                var promise = new Promise(function (resolve, reject) {
                    var waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, function () {
                        _this.waitingSemaphoreThreadList.delete(waitingSemaphoreThread);
                        resolve();
                    });
                    _this.waitingSemaphoreThreadList.add(waitingSemaphoreThread);
                });
                this.updatedCount();
                return promise;
            };

            Semaphore.prototype.delete = function () {
            };
            return Semaphore;
        })();

        var SemaphoreAttribute;
        (function (SemaphoreAttribute) {
            SemaphoreAttribute[SemaphoreAttribute["FirstInFirstOut"] = 0x000] = "FirstInFirstOut";
            SemaphoreAttribute[SemaphoreAttribute["Priority"] = 0x100] = "Priority";
        })(SemaphoreAttribute || (SemaphoreAttribute = {}));

        var EventFlag = (function () {
            function EventFlag() {
            }
            return EventFlag;
        })();

        var SceKernelSemaInfo = (function () {
            function SceKernelSemaInfo() {
            }
            SceKernelSemaInfo.struct = StructClass.create(SceKernelSemaInfo, [
                { type: Int32, name: 'size' },
                { type: Stringz(32), name: 'name' },
                { type: Int32, name: 'attributes' },
                { type: Int32, name: 'initialCount' },
                { type: Int32, name: 'currentCount' },
                { type: Int32, name: 'maximumCount' },
                { type: Int32, name: 'numberOfWaitingThreads' }
            ]);
            return SceKernelSemaInfo;
        })();

        var SceKernelThreadInfo = (function () {
            function SceKernelThreadInfo() {
            }
            SceKernelThreadInfo.struct = StructClass.create(SceKernelThreadInfo, [
                { type: Int32, name: 'size' },
                { type: Stringz(32), name: 'name' },
                { type: UInt32, name: 'attributes' },
                { type: UInt32, name: 'status' },
                { type: UInt32, name: 'entryPoint' },
                { type: UInt32, name: 'stackPointer' },
                { type: Int32, name: 'stackSize' },
                { type: UInt32, name: 'GP' },
                { type: Int32, name: 'priorityInit' },
                { type: Int32, name: 'priority' },
                { type: UInt32, name: 'waitType' },
                { type: Int32, name: 'waitId' },
                { type: Int32, name: 'wakeupCount' },
                { type: Int32, name: 'exitStatus' },
                { type: Int32, name: 'runClocksLow' },
                { type: Int32, name: 'runClocksHigh' },
                { type: Int32, name: 'interruptPreemptionCount' },
                { type: Int32, name: 'threadPreemptionCount' },
                { type: Int32, name: 'releaseCount' }
            ]);
            return SceKernelThreadInfo;
        })();
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var UtilsForKernel = (function () {
            function UtilsForKernel(context) {
                var _this = this;
                this.context = context;
                this.sceKernelIcacheInvalidateRange = hle.modules.createNativeFunction(0xC2DF770E, 150, 'void', 'uint/uint', this, function (address, size) {
                    _this.context.instructionCache.invalidateRange(address, address + size);
                });
            }
            return UtilsForKernel;
        })();
        modules.UtilsForKernel = UtilsForKernel;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        var UtilsForUser = (function () {
            function UtilsForUser(context) {
                this.context = context;
                this.sceKernelLibcTime = hle.modules.createNativeFunction(0x27CC57F0, 150, 'uint', '', this, function () {
                    //console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
                    return new Date().getTime() / 1000;
                });
                this.sceKernelUtilsMt19937Init = hle.modules.createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, function (memory, contextPtr, seed) {
                    console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
                    return 0;
                });
                this.sceKernelUtilsMt19937UInt = hle.modules.createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, function (memory, contextPtr) {
                    return Math.round(Math.random() * 0xFFFFFFFF);
                });
                this.sceKernelLibcGettimeofday = hle.modules.createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, function (timevalPtr, timezonePtr) {
                    if (timevalPtr) {
                        var seconds = new Date().getSeconds();
                        var microseconds = new Date().getMilliseconds() * 1000;
                        timevalPtr.writeInt32(seconds);
                        timevalPtr.writeInt32(microseconds);
                    }

                    if (timezonePtr) {
                        var minutesWest = 0;
                        var dstTime = 0;
                        timevalPtr.writeInt32(minutesWest);
                        timevalPtr.writeInt32(dstTime);
                    }

                    return 0;
                });
                this.sceKernelDcacheWritebackInvalidateRange = hle.modules.createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/int', this, function (pointer, size) {
                    return 0;
                });
                this.sceKernelDcacheWritebackAll = hle.modules.createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, function () {
                    return 0;
                });
            }
            return UtilsForUser;
        })();
        modules.UtilsForUser = UtilsForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
var hle;
(function (hle) {
    var Thread = (function () {
        function Thread(manager, state, instructionCache) {
            this.manager = manager;
            this.state = state;
            this.instructionCache = instructionCache;
            this.id = 0;
            this.initialPriority = 10;
            this.priority = 10;
            this.exitStatus = 0;
            this.running = false;
            this.state.thread = this;
            this.programExecutor = new ProgramExecutor(state, instructionCache);
        }
        Thread.prototype.suspend = function () {
            //console.log('suspended ' + this.name);
            this.running = false;
            this.manager.eventOcurred();
        };

        Thread.prototype.suspendUntilPromiseDone = function (promise) {
            var _this = this;
            this.suspend();

            //console.log(promise);
            promise.then(function (result) {
                if (result !== undefined)
                    _this.state.V0 = result;

                //console.log('resumed ' + this.name);
                _this.resume();
            });
        };

        Thread.prototype.resume = function () {
            this.running = true;
            this.manager.eventOcurred();
        };

        Thread.prototype.start = function () {
            this.running = true;
            this.manager.threads.add(this);
            this.manager.eventOcurred();
        };

        Thread.prototype.stop = function () {
            this.running = false;
            this.manager.threads.delete(this);
            this.manager.eventOcurred();
        };

        Thread.prototype.runStep = function () {
            try  {
                this.programExecutor.execute(10000);
            } catch (e) {
                this.stop();
                throw (e);
            }
            //this.programExecutor.execute(200000);
        };
        return Thread;
    })();
    hle.Thread = Thread;

    var ThreadManager = (function () {
        function ThreadManager(memory, memoryManager, display, syscallManager, instructionCache) {
            this.memory = memory;
            this.memoryManager = memoryManager;
            this.display = display;
            this.syscallManager = syscallManager;
            this.instructionCache = instructionCache;
            this.threads = new DSet();
            this.interval = -1;
            this.enqueued = false;
            this.running = false;
        }
        ThreadManager.prototype.create = function (name, entryPoint, initialPriority, stackSize) {
            if (typeof stackSize === "undefined") { stackSize = 0x1000; }
            var thread = new Thread(this, new core.cpu.CpuState(this.memory, this.syscallManager), this.instructionCache);
            thread.name = name;
            thread.state.PC = entryPoint;
            thread.state.RA = 268435455 /* EXIT_THREAD */;
            thread.state.SP = this.memoryManager.stackPartition.allocateHigh(stackSize).high;
            thread.initialPriority = initialPriority;
            thread.priority = initialPriority;
            return thread;
        };

        ThreadManager.prototype.eventOcurred = function () {
            var _this = this;
            if (!this.running)
                return;
            if (this.enqueued)
                return;
            this.enqueued = true;
            setImmediate(function () {
                return _this.eventOcurredCallback();
            });
        };

        //get runningThreads() { return this.threads.filter(thread => thread.running); }
        ThreadManager.getHighestPriority = function (threads) {
            var priority = -9999;
            threads.forEach(function (thread) {
                priority = Math.max(priority, thread.priority);
            });
            return priority;
        };

        ThreadManager.prototype.eventOcurredCallback = function () {
            var _this = this;
            if (!this.running)
                return;

            this.enqueued = false;
            var start = window.performance.now();

            while (true) {
                /*
                var runningThreads = this.runningThreads;
                if (runningThreads.length == 0) break;
                
                //var priority = HleThreadManager.getHighestPriority(runningThreads);
                //runningThreads.filter(thread => thread.priority == priority).forEach((thread) => thread.runStep());
                runningThreads.forEach((thread) => thread.runStep());
                */
                var threadCount = 0;
                var priority = 2147483648;

                this.threads.forEach(function (thread) {
                    if (thread.running) {
                        threadCount++;
                        priority = Math.min(priority, thread.priority);
                    }
                });

                if (threadCount == 0)
                    break;

                this.threads.forEach(function (thread) {
                    if (thread.running) {
                        if (thread.priority == priority)
                            thread.runStep();
                    }
                });

                var current = window.performance.now();
                if (current - start >= 100) {
                    setTimeout(function () {
                        return _this.eventOcurred();
                    }, 100);
                    return;
                }
            }
        };

        ThreadManager.prototype.debugThreads = function () {
            var html = '';
            this.threads.forEach(function (thread) {
                html += sprintf("%08X:%s:%s", thread.state.PC, thread.name, thread.running);
            });
            document.getElementById('thread_list').innerHTML = html;
        };

        ThreadManager.prototype.startAsync = function () {
            this.running = true;
            this.eventOcurred();
            return Promise.resolve();
        };

        ThreadManager.prototype.stopAsync = function () {
            this.running = false;
            clearInterval(this.interval);
            this.interval = -1;
            return Promise.resolve();
        };
        return ThreadManager;
    })();
    hle.ThreadManager = ThreadManager;
})(hle || (hle = {}));
var hle;
(function (hle) {
    (function (modules) {
        function createNativeFunction(exportId, firmwareVersion, retval, arguments, _this, internalFunc) {
            var code = '';

            var args = [];
            var argindex = 4;

            function readGpr32() {
                return 'state.' + core.cpu.CpuState.getGprAccessName(argindex++);
            }

            function readGpr64() {
                argindex = MathUtils.nextAligned(argindex, 2);
                var gprLow = readGpr32();
                var gprHigh = readGpr32();
                return sprintf('%s + %s * Math.pow(2, 32)', gprLow, gprHigh);
            }

            arguments.split('/').forEach(function (item) {
                switch (item) {
                    case 'EmulatorContext':
                        args.push('context');
                        break;
                    case 'HleThread':
                        args.push('state.thread');
                        break;
                    case 'CpuState':
                        args.push('state');
                        break;
                    case 'Memory':
                        args.push('state.memory');
                        break;
                    case 'string':
                        args.push('state.memory.readStringz(' + readGpr32() + ')');
                        break;
                    case 'uint':
                    case 'int':
                        args.push(readGpr32());
                        break;
                    case 'ulong':
                    case 'long':
                        args.push(readGpr64());
                        break;
                    case 'void*':
                        args.push('state.getPointerStream(' + readGpr32() + ')');
                        break;
                    case '':
                        break;
                    default:
                        throw ('Invalid argument "' + item + '"');
                }
            });

            code += 'var result = internalFunc.apply(_this, [' + args.join(', ') + ']);';

            code += 'if (typeof result == "object") { state.thread.suspendUntilPromiseDone(result); throw (new CpuBreakException()); } ';

            switch (retval) {
                case 'void':
                    break;

                case 'uint':
                case 'int':
                    code += 'state.V0 = result | 0;';
                    break;
                case 'long':
                    code += 'state.V0 = (result >>> 0) & 0xFFFFFFFF; state.V1 = (result >>> 32) & 0xFFFFFFFF;';
                    break;
                    break;
                default:
                    throw ('Invalid return value "' + retval + '"');
            }

            var out = new core.NativeFunction();
            out.name = 'unknown';
            out.nid = exportId;
            out.firmwareVersion = firmwareVersion;

            //console.log(code);
            var func = new Function('_this', 'internalFunc', 'context', 'state', code);
            out.call = function (context, state) {
                func(_this, internalFunc, context, state);
            };

            //console.log(out);
            return out;
        }
        modules.createNativeFunction = createNativeFunction;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));

function downloadFileAsync(url) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();

        request.open("GET", url, true);
        request.overrideMimeType("text/plain; charset=x-user-defined");
        request.responseType = "arraybuffer";
        request.onload = function (e) {
            var arraybuffer = request.response;

            //var data = new Uint8Array(arraybuffer);
            resolve(arraybuffer);
            //console.log(data);
            //console.log(data.length);
        };
        request.onerror = function (e) {
            reject(e.error);
        };
        request.send();
    });
}
var hle;
(function (hle) {
    (function (vfs) {
        var VfsEntry = (function () {
            function VfsEntry() {
            }
            Object.defineProperty(VfsEntry.prototype, "isDirectory", {
                get: function () {
                    throw (new Error("Must override isDirectory"));
                },
                enumerable: true,
                configurable: true
            });
            VfsEntry.prototype.enumerateAsync = function () {
                throw (new Error("Must override enumerateAsync"));
            };
            Object.defineProperty(VfsEntry.prototype, "size", {
                get: function () {
                    throw (new Error("Must override size"));
                },
                enumerable: true,
                configurable: true
            });
            VfsEntry.prototype.readAllAsync = function () {
                return this.readChunkAsync(0, this.size);
            };
            VfsEntry.prototype.readChunkAsync = function (offset, length) {
                throw (new Error("Must override readChunkAsync"));
            };
            VfsEntry.prototype.close = function () {
            };
            return VfsEntry;
        })();
        vfs.VfsEntry = VfsEntry;

        (function (FileOpenFlags) {
            FileOpenFlags[FileOpenFlags["Read"] = 0x0001] = "Read";
            FileOpenFlags[FileOpenFlags["Write"] = 0x0002] = "Write";
            FileOpenFlags[FileOpenFlags["ReadWrite"] = FileOpenFlags.Read | FileOpenFlags.Write] = "ReadWrite";
            FileOpenFlags[FileOpenFlags["NoBlock"] = 0x0004] = "NoBlock";
            FileOpenFlags[FileOpenFlags["_InternalDirOpen"] = 0x0008] = "_InternalDirOpen";
            FileOpenFlags[FileOpenFlags["Append"] = 0x0100] = "Append";
            FileOpenFlags[FileOpenFlags["Create"] = 0x0200] = "Create";
            FileOpenFlags[FileOpenFlags["Truncate"] = 0x0400] = "Truncate";
            FileOpenFlags[FileOpenFlags["Excl"] = 0x0800] = "Excl";
            FileOpenFlags[FileOpenFlags["Unknown1"] = 0x4000] = "Unknown1";
            FileOpenFlags[FileOpenFlags["NoWait"] = 0x8000] = "NoWait";
            FileOpenFlags[FileOpenFlags["Unknown2"] = 0xf0000] = "Unknown2";
            FileOpenFlags[FileOpenFlags["Unknown3"] = 0x2000000] = "Unknown3";
        })(vfs.FileOpenFlags || (vfs.FileOpenFlags = {}));
        var FileOpenFlags = vfs.FileOpenFlags;

        (function (FileMode) {
        })(vfs.FileMode || (vfs.FileMode = {}));
        var FileMode = vfs.FileMode;

        var Vfs = (function () {
            function Vfs() {
            }
            Vfs.prototype.open = function (path, flags, mode) {
                throw (new Error("Must override open"));
            };
            return Vfs;
        })();
        vfs.Vfs = Vfs;

        var IsoVfsFile = (function (_super) {
            __extends(IsoVfsFile, _super);
            function IsoVfsFile(node) {
                _super.call(this);
                this.node = node;
            }
            Object.defineProperty(IsoVfsFile.prototype, "isDirectory", {
                get: function () {
                    return this.node.isDirectory;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoVfsFile.prototype, "size", {
                get: function () {
                    return this.node.size;
                },
                enumerable: true,
                configurable: true
            });
            IsoVfsFile.prototype.readChunkAsync = function (offset, length) {
                return this.node.readChunkAsync(offset, length);
            };
            IsoVfsFile.prototype.close = function () {
            };
            return IsoVfsFile;
        })(VfsEntry);

        var IsoVfs = (function (_super) {
            __extends(IsoVfs, _super);
            function IsoVfs(iso) {
                _super.call(this);
                this.iso = iso;
            }
            IsoVfs.prototype.open = function (path, flags, mode) {
                return new IsoVfsFile(this.iso.get(path));
            };
            return IsoVfs;
        })(Vfs);
        vfs.IsoVfs = IsoVfs;

        var MemoryVfsEntry = (function (_super) {
            __extends(MemoryVfsEntry, _super);
            function MemoryVfsEntry(data) {
                _super.call(this);
                this.data = data;
            }
            Object.defineProperty(MemoryVfsEntry.prototype, "isDirectory", {
                get: function () {
                    return false;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MemoryVfsEntry.prototype, "size", {
                get: function () {
                    return this.data.byteLength;
                },
                enumerable: true,
                configurable: true
            });
            MemoryVfsEntry.prototype.readChunkAsync = function (offset, length) {
                return Promise.resolve(this.data.slice(offset, offset + length));
            };
            MemoryVfsEntry.prototype.close = function () {
            };
            return MemoryVfsEntry;
        })(VfsEntry);
        vfs.MemoryVfsEntry = MemoryVfsEntry;

        var MemoryVfs = (function (_super) {
            __extends(MemoryVfs, _super);
            function MemoryVfs() {
                _super.apply(this, arguments);
                this.files = {};
            }
            MemoryVfs.prototype.addFile = function (name, data) {
                this.files[name] = data;
            };

            MemoryVfs.prototype.open = function (path, flags, mode) {
                if (flags & 2 /* Write */) {
                    this.files[path] = new ArrayBuffer(0);
                }
                var file = this.files[path];
                if (!file)
                    throw (new Error(sprintf("MemoryVfs: Can't find '%s'", path)));
                return new MemoryVfsEntry(file);
            };
            return MemoryVfs;
        })(Vfs);
        vfs.MemoryVfs = MemoryVfs;
    })(hle.vfs || (hle.vfs = {}));
    var vfs = hle.vfs;
})(hle || (hle = {}));
describe('cso', function () {
    var testCsoArrayBuffer;

    before(function (done) {
        downloadFileAsync('samples/test.cso').then(function (data) {
            testCsoArrayBuffer = data;
            done();
        });
    });

    it('should load fine', function (done) {
        format.cso.Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer)).then(function (cso) {
            //cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(data => {
            return cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(function (data) {
                var stream = Stream.fromArrayBuffer(data);
                stream.skip(10);
                var CD0001 = stream.readStringz(6);
                assert.equal(CD0001, '\u0001CD001');
                done();
            });
            //console.log(cso);
        }).catch(function (e) {
            //console.error(e);
            setImmediate(function () {
                throw (e);
            });
        });
    });

    it('should work with iso', function (done) {
        format.cso.Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer)).then(function (cso) {
            return format.iso.Iso.fromStreamAsync(cso).then(function (iso) {
                assert.equal(JSON.stringify(iso.children.slice(0, 4).map(function (node) {
                    return node.path;
                })), JSON.stringify(["path", "path/0", "path/1", "path/2"]));
                done();
            });
        }).catch(function (e) {
            //console.error(e);
            setImmediate(function () {
                throw (e);
            });
        });
    });
});
describe('iso', function () {
    var isoData;

    before(function (done) {
        downloadFileAsync('samples/cube.iso').then(function (data) {
            isoData = new Uint8Array(data);
            done();
        });
    });

    it('should load fine', function (done) {
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        format.iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            assert.equal(JSON.stringify(iso.children.map(function (item) {
                return item.path;
            })), JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"]));

            done();
        }).catch(function (e) {
            throw (e);
        });
    });
});
describe('pbp', function () {
    var rtctestPbpArrayBuffer;

    before(function (done) {
        downloadFileAsync('samples/rtctest.pbp').then(function (data) {
            rtctestPbpArrayBuffer = data;
            done();
        });
    });

    it('should load fine', function () {
        var pbp = new format.pbp.Pbp();
        pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
        var pspData = pbp.get('psp.data');
        assert.equal(pspData.length, 77550);
    });
});
describe('psf', function () {
    var rtctestPsfArrayBuffer;

    before(function (done) {
        downloadFileAsync('samples/rtctest.psf').then(function (data) {
            rtctestPsfArrayBuffer = data;
            done();
        });
    });

    it('should load fine', function () {
        var psf = new format.psf.Psf();
        psf.load(Stream.fromArrayBuffer(rtctestPsfArrayBuffer));
        assert.equal(psf.entriesByName['BOOTABLE'], 1);
        assert.equal(psf.entriesByName['CATEGORY'], 'MG');
        assert.equal(psf.entriesByName['DISC_ID'], 'UCJS10041');
        assert.equal(psf.entriesByName['DISC_VERSION'], '1.00');
        assert.equal(psf.entriesByName['PARENTAL_LEVEL'], 1);
        assert.equal(psf.entriesByName['PSP_SYSTEM_VER'], '1.00');
        assert.equal(psf.entriesByName['REGION'], 32768);
        assert.equal(psf.entriesByName['TITLE'], 'rtctest');
    });
});
describe('gpu', function () {
    describe('vertex reading', function () {
        it('should work', function () {
            var vertexState = new core.gpu.VertexState();
            vertexState.size = 10;

            vertexState.texture = 0 /* Void */;
            vertexState.color = 0 /* Void */;
            vertexState.normal = 0 /* Void */;
            vertexState.position = 2 /* Short */;
            vertexState.weight = 0 /* Void */;
            vertexState.index = 0 /* Void */;
            vertexState.weightCount = 1;
            vertexState.morphingVertexCount = 1;
            vertexState.transform2D = true;
            vertexState.textureComponentCount = 2;

            var vertexReader = core.gpu.VertexReaderFactory.get(vertexState);

            var vertexInput = new DataView(new ArrayBuffer(128));
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

            var vertex1 = new core.gpu.Vertex();
            var vertex2 = new core.gpu.Vertex();

            //console.log(vertexReader.readCode);
            vertexReader.readCount([vertex1, vertex2], vertexInput, 2);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
        });
    });
});
describe('elf', function () {
    var stream;

    before(function (done) {
        downloadFileAsync('samples/counter.elf').then(function (data) {
            stream = Stream.fromArrayBuffer(data);
            done();
        });
    });

    it('load', function () {
        //var stream = Stream.fromBase64(minifireElfBase64);
        var memory = new core.Memory();
        var memoryManager = new hle.MemoryManager();
        var display = new core.DummyPspDisplay();
        var syscallManager = new core.SyscallManager(context);
        var context = new EmulatorContext();
        var moduleManager = new hle.ModuleManager(context);

        context.init(display, null, null, memoryManager, null, null, memory, null, null);

        var elf = new hle.elf.PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
        console.log(elf);
    });
});
describe("memory manager", function () {
    it("should work", function () {
        var partition = new hle.MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        var p1 = partition.allocate(25, 0 /* Low */);
        var p2 = partition.allocate(25, 0 /* Low */);
        var p3 = partition.allocate(25, 0 /* Low */);

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 25);

        p2.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 50);

        p3.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 75);
        assert.equal(partition.getTotalFreeMemory(), 75);
    });
});
describe('vfs', function () {
    var isoData;

    before(function (done) {
        downloadFileAsync('samples/cube.iso').then(function (data) {
            isoData = new Uint8Array(data);
            done();
        });
    });

    it('should work', function (done) {
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        format.iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            var vfs = new hle.vfs.IsoVfs(iso);
            return vfs.open("PSP_GAME/PARAM.SFO", 1 /* Read */, parseInt('777', 8)).readAllAsync().then(function (content) {
                var psf = format.psf.Psf.fromStream(Stream.fromArrayBuffer(content));
                assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041");
                done();
            });
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
        });
    });
});
describe('instruction lookup', function () {
    var instructions = core.cpu.Instructions.instance;

    it('should accept locate instruction by name', function () {
        assert.equal(instructions.findByName('addi').name, 'addi');
        assert.equal(instructions.findByName('lui').name, 'lui');
        assert.equal(instructions.findByName('syscall').name, 'syscall');
        assert.equal(instructions.findByName('mflo').name, 'mflo');
        assert.equal(instructions.findByName('sb').name, 'sb');
    });

    it('should accept locate instruction by data', function () {
        assert.equal(instructions.findByData(0x0C000000).name, 'jal');
        assert.equal(instructions.findByData(0x3C100890).name, 'lui');
        assert.equal(instructions.findByData(0x00081C4C).name, 'syscall');
        assert.equal(instructions.findByData(0x00001012).name, 'mflo');
        assert.equal(instructions.findByData(0xA0410004).name, 'sb');
    });
});
///<reference path="../typings/chai/chai.d.ts" />
///<reference path="../typings/mocha/mocha.d.ts" />
///<reference path="../typings/jquery/jquery.d.ts" />

var assembler = new core.cpu.MipsAssembler();
var disassembler = new core.cpu.MipsDisassembler();
var memory = new core.Memory();

var TestSyscallManager = (function () {
    function TestSyscallManager() {
    }
    TestSyscallManager.prototype.call = function (state, id) {
    };
    return TestSyscallManager;
})();

function executeProgram(gprInitial, program) {
    program = program.slice();
    program.push('dbreak');
    assembler.assembleToMemory(memory, 4, program);
    var state = new core.cpu.CpuState(memory, new TestSyscallManager());
    var instructionCache = new InstructionCache(memory);
    var programExecuter = new ProgramExecutor(state, instructionCache);

    for (var key in gprInitial) {
        if (key.substr(0, 1) == '$') {
            state.gpr[parseInt(key.substr(1))] = gprInitial[key];
        } else {
            state[key] = gprInitial[key];
        }
    }

    state.PC = 4;
    state.SP = 0x10000;
    programExecuter.execute(1000);
    return state;
}

function generateGpr3Matrix(op, vector) {
    var gprInitial = {};
    var outputMatrix = [];
    for (var n = 0; n < vector.length; n++)
        gprInitial['$' + (15 + n)] = vector[n];

    for (var n = 0; n < vector.length; n++) {
        var program = [];
        for (var m = 0; m < vector.length; m++) {
            program.push(sprintf('%s $%d, $%d, $%d', op, 1 + m, 15 + n, 15 + m));
        }
        var state = executeProgram(gprInitial, program);
        var outputVector = [];
        for (var m = 0; m < vector.length; m++)
            outputVector.push(sprintf('%08X', state.gpr[1 + m]));
        outputMatrix.push(outputVector);
        //console.log(state);
    }
    return outputMatrix;
}

function assertProgram(description, gprInitial, program, gprAssertions) {
    var state = executeProgram(gprInitial, program);

    for (var key in gprAssertions) {
        var value = 0;
        if (key.substr(0, 1) == '$') {
            value = state.gpr[parseInt(key.substr(1))];
        } else {
            value = state[key];
        }
        assert.equal(sprintf('%08X', value), sprintf('%08X', gprAssertions[key]), description + ': ' + key + ' == ' + sprintf('%08X', gprAssertions[key]));
    }
}

describe('cpu running', function () {
    it('simple', function () {
        assertProgram("subtract 1", {}, ["li r1, 100", "addiu r1, r1, -1"], { $1: 99 });
        assertProgram("xor", { "$1": 0xFF00FF00, "$2": 0x00FFFF00 }, ["xor r3, r1, r2"], { $3: 0xFFFF0000 });

        assertProgram("some arithmetic", { $1: -1, $2: -1, $3: -1, $4: -1, $11: 11, $12: 12 }, [
            "add  r1, r0, r11",
            "add  r2, r0, r12",
            "sub  r3, r2, r1",
            "addi r4, r0, 1234"
        ], { $1: 11, $2: 12, $3: 1, $4: 1234 });
    });
    it('set less than', function () {
        assertProgram("set less than", { "$1": 0x77777777, "$10": 0, "$11": -100, "$12": +100, "$20": 0, "$21": 7, "$22": -200 }, [
            "sltu r1, r10, r20",
            "sltu r2, r10, r21",
            "sltu r3, r11, r22",
            "slt  r4, r11, r22"
        ], { "$1": 0, "$2": 1, "$3": 0, "$4": 0 });
    });
    it('divide', function () {
        assertProgram("divide", {}, ["li r10, 100", "li r11, 12", "div r10, r11"], { HI: 4, LO: 8 });
    });
    it('branch', function () {
    });

    it('shift', function () {
    });

    it('load/write', function () {
        assertProgram("loadwrite", { "$1": 0x7F, "$2": 0x100 }, [
            "sb r1, 4(r2)",
            "sb r1, 5(r2)",
            "sb r1, 6(r2)",
            "sb r1, 7(r2)",
            "lw r3, 4(r2)",
            "sw r3, 8(r2)",
            "lw r5, 8(r2)",
            "addi r5, r5, 1"
        ], { "$3": 0x7F7F7F7F, "$5": 0x7F7F7F80 });
    });

    it('opcode add/addu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "00000001", "00000309", "80000000", "7FFFFFFF", "FFFFFFFF"],
            ["00000001", "00000002", "0000030A", "80000001", "80000000", "00000000"],
            ["00000309", "0000030A", "00000612", "80000309", "80000308", "00000308"],
            ["80000000", "80000001", "80000309", "00000000", "FFFFFFFF", "7FFFFFFF"],
            ["7FFFFFFF", "80000000", "80000308", "FFFFFFFF", "FFFFFFFE", "7FFFFFFE"],
            ["FFFFFFFF", "00000000", "00000308", "7FFFFFFF", "7FFFFFFE", "FFFFFFFE"]
        ];
        var matrix_add = generateGpr3Matrix('add', combineValues);
        var matrix_addu = generateGpr3Matrix('addu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_add));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_addu));
    });

    it('opcode sub/subu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "FFFFFFFF", "FFFFFCF7", "80000000", "80000001", "00000001"],
            ["00000001", "00000000", "FFFFFCF8", "80000001", "80000002", "00000002"],
            ["00000309", "00000308", "00000000", "80000309", "8000030A", "0000030A"],
            ["80000000", "7FFFFFFF", "7FFFFCF7", "00000000", "00000001", "80000001"],
            ["7FFFFFFF", "7FFFFFFE", "7FFFFCF6", "FFFFFFFF", "00000000", "80000000"],
            ["FFFFFFFF", "FFFFFFFE", "FFFFFCF6", "7FFFFFFF", "80000000", "00000000"]
        ];
        var matrix_sub = generateGpr3Matrix('sub', combineValues);
        var matrix_subu = generateGpr3Matrix('subu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_sub));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_subu));
    });

    it('opcode sll', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000002, 0x0000000A, 0x0000001F, 0x00000020, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [];
        var matrix = generateGpr3Matrix('sll', combineValues);
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix));
    });

    it('opcode mult', function () {
        assertProgram("mult", { "$1": 7, "$2": 9 }, ["mult $1, $2"], { "LO": 7 * 9, "HI": 0 });
        assertProgram("mult", { "$1": -1, "$2": 9 }, ["mult $1, $2"], { "LO": -1 * 9, "HI": 0 });
    });
});
describe('utils', function () {
    describe('string repeat', function () {
        it('simple', function () {
            assert.equal('', String_repeat('a', 0));
            assert.equal('a', String_repeat('a', 1));
            assert.equal('aaaa', String_repeat('a', 4));
        });
    });

    describe('Binary layouts', function () {
        it('should read int32', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int32.read(stream), 0x04030201);
        });

        it('should read int16', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int16.read(stream), 0x0201);
            assert.equal(Int16.read(stream), 0x0403);
        });

        it('should read simple struct', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            var MyStruct = Struct.create([
                { name: 'item1', type: Int16 },
                { name: 'item2', type: Int16 }
            ]);
            assert.equal(JSON.stringify(MyStruct.read(stream)), JSON.stringify({ item1: 0x0201, item2: 0x0403 }));
        });
    });
});
//# sourceMappingURL=pspemu.js.map
