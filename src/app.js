///<reference path="./cpu.ts" />
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

                        return isoFs.open('PSP_GAME/SYSDIR/BOOT.BIN').readAllAsync().then(function (data) {
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

    Emulator.prototype.downloadFileAsync = function (url) {
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
    };

    Emulator.prototype.downloadAndExecuteAsync = function (url) {
        var _this = this;
        return this.downloadFileAsync(url).then(function (data) {
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

var emulator = new Emulator();

function main() {
    var sampleDemo = '';

    if (document.location.hash) {
        sampleDemo = document.location.hash.substr(1);
    }

    if (sampleDemo) {
        emulator.downloadAndExecuteAsync(sampleDemo);
    }
}

main();
//# sourceMappingURL=app.js.map
