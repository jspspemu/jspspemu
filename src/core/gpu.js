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
//# sourceMappingURL=gpu.js.map
