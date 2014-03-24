///<reference path="./memory.ts" />
///<reference path="../util/utils.ts" />

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

        function IndexEnumGetSize(item) {
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
        }

        function NumericEnumGetSize(item) {
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
        }

        function ColorEnumGetSize(item) {
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
        }

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
            return Vertex;
        })();
        gpu.Vertex = Vertex;

        var VertexBuffer = (function () {
            function VertexBuffer() {
                this.vertices = [];
                for (var n = 0; n < 1024; n++)
                    this.vertices[n] = new Vertex();
            }
            return VertexBuffer;
        })();

        var VertexReaderFactory = (function () {
            function VertexReaderFactory() {
            }
            VertexReaderFactory.get = function (vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount) {
                if (typeof textureIndexCount === "undefined") { textureIndexCount = 2; }
                var cacheId = [vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount].join('_');
                var vertexReader = this.cache[cacheId];
                if (vertexReader !== undefined)
                    return vertexReader;
                return this.cache[cacheId] = new VertexReader(vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount);
            };
            VertexReaderFactory.cache = {};
            return VertexReaderFactory;
        })();
        gpu.VertexReaderFactory = VertexReaderFactory;

        var VertexReader = (function () {
            function VertexReader(vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount) {
                if (typeof textureIndexCount === "undefined") { textureIndexCount = 2; }
                this.vertexSize = vertexSize;
                this.texture = texture;
                this.color = color;
                this.normal = normal;
                this.position = position;
                this.weight = weight;
                this.index = index;
                this.weightCount = weightCount;
                this.morphingVertexCount = morphingVertexCount;
                this.transform2D = transform2D;
                this.textureIndexCount = textureIndexCount;
                this.readOffset = 0;
                this.readCode = this.createJs();
                this.readOneFunc = (new Function('output', 'input', 'inputOffset', this.readCode));
            }
            VertexReader.prototype.readCount = function (output, input, count) {
                var inputOffset = 0;
                for (var n = 0; n < count; n++) {
                    this.readOneFunc(output[n], input, inputOffset);
                    inputOffset += this.vertexSize;
                }
            };

            VertexReader.prototype.read = function (output, input, inputOffset) {
                this.readOneFunc(output, input, inputOffset);
            };

            VertexReader.prototype.createJs = function () {
                var indentStringGenerator = new IndentStringGenerator();

                this.readOffset = 0;

                this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.weightCount), this.weight, !this.transform2D);
                this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.textureIndexCount), this.texture, !this.transform2D);
                this.createColorJs(indentStringGenerator, this.color);
                this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.normal, !this.transform2D);
                this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.position, !this.transform2D);

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


            VertexState.prototype.getReader = function () {
                return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount);
            };

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
            Object.defineProperty(VertexState.prototype, "skinningWeightCount", {
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
                    return NumericEnumGetSize(this.weight);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "colorSize", {
                get: function () {
                    return ColorEnumGetSize(this.color);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "textureSize", {
                get: function () {
                    return NumericEnumGetSize(this.texture);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "positionSize", {
                get: function () {
                    return NumericEnumGetSize(this.position);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VertexState.prototype, "normalSize", {
                get: function () {
                    return NumericEnumGetSize(this.normal);
                },
                enumerable: true,
                configurable: true
            });

            VertexState.prototype.GetMaxAlignment = function () {
                return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
            };

            Object.defineProperty(VertexState.prototype, "realWeightCount", {
                get: function () {
                    return this.skinningWeightCount + 1;
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

        var Light = (function () {
            function Light() {
                this.enabled = false;
            }
            return Light;
        })();

        var Lightning = (function () {
            function Lightning() {
                this.enabled = false;
                this.lights = [new Light(), new Light(), new Light(), new Light()];
            }
            return Lightning;
        })();

        var TextureState = (function () {
            function TextureState() {
                this.swizzled = false;
                this.mipmapShareClut = false;
                this.mipmapMaxLevel = 0;
            }
            return TextureState;
        })();

        var CullingState = (function () {
            function CullingState() {
            }
            return CullingState;
        })();

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

        var vertexBuffer = new VertexBuffer();
        var singleCallTest = false;

        var PspGpuList = (function () {
            function PspGpuList(id, memory, drawDriver, runner) {
                this.id = id;
                this.memory = memory;
                this.drawDriver = drawDriver;
                this.runner = runner;
                this.completed = false;
                this.state = new GpuState();
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
                        var primitiveType = BitUtils.extractEnum(params24, 16, 3);
                        var vertexCount = BitUtils.extract(params24, 0, 16);
                        var vertexState = this.state.vertex;
                        var vertexSize = this.state.vertex.size;
                        var vertexAddress = this.state.baseAddress + this.state.vertex.address;
                        var vertexReader = vertexState.getReader();
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

        var CullingDirection;
        (function (CullingDirection) {
            CullingDirection[CullingDirection["CounterClockWise"] = 0] = "CounterClockWise";
            CullingDirection[CullingDirection["ClockWise"] = 1] = "ClockWise";
        })(CullingDirection || (CullingDirection = {}));

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

        var Context2dPspDrawDriver = (function () {
            function Context2dPspDrawDriver(memory, canvas) {
                this.memory = memory;
                this.canvas = canvas;
                this.transformMatrix = mat4.create();
                this.test11 = false;
                //this.gl = this.canvas.getContext('webgl');
                this.context = this.canvas.getContext('2d');
            }
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

        var WebGlPspDrawDriver = (function () {
            function WebGlPspDrawDriver(memory, canvas) {
                this.memory = memory;
                this.canvas = canvas;
                this.transformMatrix = mat4.create();
                this.transformMatrix2d = mat4.create();
                this.gl = this.canvas.getContext('experimental-webgl');
                if (!this.gl) {
                    this.canvas.getContext('webgl');
                }
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                this.program = WebGlPspDrawDriver.shaderProgram(this.gl, [
                    "uniform mat4 u_modelViewProjMatrix;",
                    "attribute vec3 vPosition;",
                    "attribute vec4 vColor;",
                    "varying vec4 v_Color;",
                    "void main() {",
                    "   v_Color = vColor;",
                    "	gl_Position = u_modelViewProjMatrix * vec4(vPosition, 1.0);",
                    "}"
                ].join("\n"), [
                    "precision mediump float;",
                    "varying vec4 v_Color;",
                    "void main() {",
                    "	gl_FragColor = v_Color;",
                    "}"
                ].join("\n"));

                this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, -1000, +1000);
            }
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
                mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
                mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
            };

            WebGlPspDrawDriver.prototype.enableDisable = function (type, enable) {
                if (enable)
                    this.gl.enable(type);
                else
                    this.gl.disable(type);
                return enable;
            };

            WebGlPspDrawDriver.prototype.setState = function (state) {
                if (this.enableDisable(this.gl.CULL_FACE, state.culling.enabled)) {
                    this.gl.cullFace((state.culling.direction == 1 /* ClockWise */) ? this.gl.FRONT : this.gl.BACK);
                }
            };

            WebGlPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
            };

            WebGlPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
                if (primitiveType == 6 /* Sprites */) {
                    return this.drawSprites(vertices, count, vertexState);
                }

                //console.log(primitiveType);
                var gl = this.gl;

                gl.useProgram(this.program);

                var positionData = [];
                var colorData = [];
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
                    } else {
                        colorData.push(1);
                        colorData.push(1);
                        colorData.push(1);
                        colorData.push(1);
                    }
                }

                WebGlPspDrawDriver.attributeSetFloats(gl, this.program, "vColor", 4, colorData);
                WebGlPspDrawDriver.attributeSetFloats(gl, this.program, "vPosition", 3, positionData);
                WebGlPspDrawDriver.uniformSetMat4(gl, this.program, 'u_modelViewProjMatrix', vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

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

                gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vPosition'));
                gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vColor'));
            };

            WebGlPspDrawDriver.uniformSetMat4 = function (gl, prog, uniform_name, arr) {
                var loc = gl.getUniformLocation(prog, uniform_name);
                gl.uniformMatrix4fv(loc, false, new Float32Array(arr));
            };

            WebGlPspDrawDriver.attributeSetFloats = function (gl, prog, attr_name, rsize, arr) {
                gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
                var varr = new Float32Array(arr);
                gl.bufferData(gl.ARRAY_BUFFER, varr, gl.STATIC_DRAW);
                var attr = gl.getAttribLocation(prog, attr_name);
                gl.enableVertexAttribArray(attr);
                gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
            };

            WebGlPspDrawDriver.shaderProgram = function (gl, vs, fs) {
                var prog = gl.createProgram();
                var addshader = function (type, source) {
                    var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
                    gl.shaderSource(s, source);
                    gl.compileShader(s);
                    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                        throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s)));
                    gl.attachShader(prog, s);
                };
                addshader('vertex', vs);
                addshader('fragment', fs);
                gl.linkProgram(prog);
                if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
                    throw (new Error("Could not link the shader program!"));
                return prog;
            };
            return WebGlPspDrawDriver;
        })();

        var PspGpu = (function () {
            function PspGpu(memory, canvas) {
                this.memory = memory;
                this.canvas = canvas;
                this.driver = new WebGlPspDrawDriver(memory, canvas);

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
