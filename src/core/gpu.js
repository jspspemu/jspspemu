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
                        mipMap.bufferWidth = BitUtils.extract(params24, 0, 24);
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
                            console.error(sprintf('Not implemented gpu opcode 0x%02X : %s', op, GpuOpCodes[op]));
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
                return Promise.resolve();
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

        var GpuOpCodes;
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
        })(GpuOpCodes || (GpuOpCodes = {}));
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
//# sourceMappingURL=gpu.js.map
