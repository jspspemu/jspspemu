///<reference path="./memory.ts" />
///<reference path="../util/utils.ts" />
///<reference path="gpu/state.ts" />

module core.gpu {
    export interface IPspGpu {
        startAsync();
        stopAsync();

        listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream);
        listSync(displayListId: number, syncType: SyncType);
        updateStallAddr(displayListId: number, stall: number);
        drawSync(syncType: SyncType);
    }

	export interface IDrawDriver {
		//clear();
		//prim(primitiveType:GuPrimitiveType, vertexCount: number, );
		setClearMode(clearing: boolean, clearFlags: number);
		setState(state: any);
		setMatrices(projectionMatrix: Matrix4x4, viewMatrix: Matrix4x3, worldMatrix: Matrix4x3);
		//drawSprites(vertices: Vertex[], vertexCount: number, transform2d: boolean);
		//drawTriangles(vertices: Vertex[], vertexCount: number, transform2d: boolean);
		textureFlush(state: any);
		textureSync(state: any);
		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState);
		initAsync();
	}
   
    class VertexBuffer {
        vertices: Vertex[] = [];

        constructor() {
            for (var n = 0; n < 1024; n++) this.vertices[n] = new Vertex();
        }
    }

    export class VertexReaderFactory {
        private static cache: NumberDictionary<VertexReader> = {};

        static get(vertexState: VertexState): VertexReader {
			var cacheId = vertexState.hash;
            var vertexReader = this.cache[cacheId];
            if (vertexReader !== undefined) return vertexReader;
			return this.cache[cacheId] = new VertexReader(vertexState);
        }
    }

    export class VertexReader {
        private readOneFunc: (output: Vertex, input: DataView, inputOffset: number) => void;
        private readOffset: number = 0;
        public readCode: string;

		constructor(private vertexState: VertexState) {
            this.readCode = this.createJs();
            this.readOneFunc = <any>(new Function('output', 'input', 'inputOffset', this.readCode));
        }

        readCount(output: Vertex[], input: DataView, count: number) {
            var inputOffset = 0;
            for (var n = 0; n < count; n++) {
                this.readOneFunc(output[n], input, inputOffset);
                inputOffset += this.vertexState.size;
            }
        }

        read(output: Vertex, input: DataView, inputOffset: number) {
            this.readOneFunc(output, input, inputOffset);
        }

        private createJs() {
            var indentStringGenerator = new IndentStringGenerator();

            this.readOffset = 0;

			this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, !this.vertexState.transform2D);
			this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, !this.vertexState.transform2D);
			this.createColorJs(indentStringGenerator, this.vertexState.color);
			this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, !this.vertexState.transform2D);
			this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, !this.vertexState.transform2D);

            return indentStringGenerator.output;
        }

        private createColorJs(indentStringGenerator:IndentStringGenerator, type: ColorEnum) {
            if (type == ColorEnum.Void) return;

            switch (type) {
                case ColorEnum.Color8888:
                    this.align(4);
                    indentStringGenerator.write('output.r = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
					indentStringGenerator.write('output.g = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
					indentStringGenerator.write('output.b = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
					indentStringGenerator.write('output.a = (input.getUint8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') / 255.0);\n');
                    break;
                default:
                    throw("Not implemented color format");
            }
        }

        private align(count: number) {
            this.readOffset = MathUtils.nextAligned(this.readOffset, count);
        }

        private getOffsetAlignAndIncrement(size: number) {
            this.align(size);
            var offset = this.readOffset;
            this.readOffset += size;
            return offset;
        }

        private createNumberJs(indentStringGenerator: IndentStringGenerator, components: string[], type: NumericEnum, normalize: boolean) {
            if (type == NumericEnum.Void) return;

            components.forEach((component) => {
                switch (type) {
                    case NumericEnum.Byte:
                        indentStringGenerator.write('output.' + component + ' = (input.getInt8(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ')');
                        if (normalize) indentStringGenerator.write(' / 127.0');
                        break;
                    case NumericEnum.Short:
                        indentStringGenerator.write('output.' + component + ' = (input.getInt16(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ', true)');
                        if (normalize) indentStringGenerator.write(' / 32767.0');
                        break;
                    case NumericEnum.Float:
                        indentStringGenerator.write('output.' + component + ' = (input.getFloat32(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ', true)');
                        break;
                }
                indentStringGenerator.write(');\n');
            });
        }
    }

    var vertexBuffer = new VertexBuffer();
    var singleCallTest = false;

    class PspGpuList {
        current: number;
        stall: number;
        callbackId: number;
        completed: boolean = false;
		state: GpuState = new GpuState();
		private promise: Promise<any>;
		private promiseResolve: Function;
		private promiseReject: Function;
		private errorCount: number = 0;

        constructor(public id: number, private memory: Memory, private drawDriver:IDrawDriver, private runner: PspGpuListRunner) {
        }

        private complete() {
            this.completed = true;
			this.runner.deallocate(this);
			this.promiseResolve(0);
        }

        private jumpRelativeOffset(offset:number) {
            this.current = this.state.baseAddress + offset;
		}

        private runInstruction(current: number, instruction: number) {
            var op: GpuOpCodes = instruction >>> 24;
            var params24: number = instruction & 0xFFFFFF;

			switch (op) {
				case GpuOpCodes.IADDR:
					this.state.indexAddress = params24;
					break;
				case GpuOpCodes.OFFSET_ADDR:
					this.state.baseOffset = (params24 << 8);
					break;
                case GpuOpCodes.FBP:
                    this.state.frameBuffer.lowAddress = params24;
					break;
				case GpuOpCodes.REGION1:
					this.state.viewPort.x1 = BitUtils.extract(params24, 0, 10);
					this.state.viewPort.y1 = BitUtils.extract(params24, 10, 10);
					break;
				case GpuOpCodes.REGION2:
					this.state.viewPort.x2 = BitUtils.extract(params24, 0, 10);
					this.state.viewPort.y2 = BitUtils.extract(params24, 10, 10);
					break;			
                case GpuOpCodes.FBW:
                    this.state.frameBuffer.highAddress = BitUtils.extract(params24, 16, 8);
                    this.state.frameBuffer.width = BitUtils.extract(params24, 0, 16);
					break;
				case GpuOpCodes.LTE:
					this.state.lightning.enabled = params24 != 0;
					break;
				case GpuOpCodes.LTE0: this.state.lightning.lights[0].enabled = params24 != 0; break;
				case GpuOpCodes.LTE1: this.state.lightning.lights[1].enabled = params24 != 0; break;
				case GpuOpCodes.LTE2: this.state.lightning.lights[2].enabled = params24 != 0; break;
				case GpuOpCodes.LTE3: this.state.lightning.lights[3].enabled = params24 != 0; break;
                case GpuOpCodes.BASE: this.state.baseAddress = ((params24 << 8) & 0xff000000); break;
                case GpuOpCodes.JUMP: this.jumpRelativeOffset(params24 & ~3); break;
                case GpuOpCodes.NOP: break;
                case GpuOpCodes.VTYPE: this.state.vertex.value = params24; break;
				case GpuOpCodes.VADDR: this.state.vertex.address = params24; break;
				case GpuOpCodes.TMODE:
					this.state.texture.swizzled = BitUtils.extract(params24, 0, 8) != 0;
					this.state.texture.mipmapShareClut = BitUtils.extract(params24, 8, 8) != 0;
					this.state.texture.mipmapMaxLevel = BitUtils.extract(params24, 16, 8);
					break;
				case GpuOpCodes.TFLT:
					this.state.texture.filterMinification = <TextureFilter>BitUtils.extract(params24, 0, 8);
					this.state.texture.filterMagnification = <TextureFilter>BitUtils.extract(params24, 8, 8);
					break;
				case GpuOpCodes.TWRAP:
					this.state.texture.wrapU = <WrapMode>BitUtils.extract(params24, 0, 8);
					this.state.texture.wrapV = <WrapMode>BitUtils.extract(params24, 8, 8);
					break;

				case GpuOpCodes.TME: this.state.texture.enabled = (params24 != 0); break;

				case GpuOpCodes.TEC:
					this.state.texture.envColor.r = BitUtils.extractScalei(params24, 0, 8, 1);
					this.state.texture.envColor.g = BitUtils.extractScalei(params24, 8, 8, 1);
					this.state.texture.envColor.b = BitUtils.extractScalei(params24, 16, 8, 1);
					break;

				case GpuOpCodes.TFUNC:
					this.state.texture.effect = <TextureEffect>BitUtils.extract(params24, 0, 8);
					this.state.texture.colorComponent = <TextureColorComponent>BitUtils.extract(params24, 8, 8);
					this.state.texture.fragment2X = (BitUtils.extract(params24, 16, 8) != 0);
					break;
				case GpuOpCodes.UOFFSET: this.state.texture.offsetU = MathFloat.reinterpretIntAsFloat(params24 << 8); break;
				case GpuOpCodes.VOFFSET: this.state.texture.offsetV = MathFloat.reinterpretIntAsFloat(params24 << 8); break;

				case GpuOpCodes.USCALE: this.state.texture.scaleU = MathFloat.reinterpretIntAsFloat(params24 << 8); break;
				case GpuOpCodes.VSCALE: this.state.texture.scaleV = MathFloat.reinterpretIntAsFloat(params24 << 8); break;

				case GpuOpCodes.TFLUSH: this.drawDriver.textureFlush(this.state); break;
				case GpuOpCodes.TSYNC: this.drawDriver.textureSync(this.state); break;
				case GpuOpCodes.TPSM: this.state.texture.pixelFormat = <core.PixelFormat>BitUtils.extract(params24, 0, 4); break;
				case GpuOpCodes.PSM:
					this.state.drawPixelFormat = <core.PixelFormat>BitUtils.extract(params24, 0, 4);
					break;

				case GpuOpCodes.TSIZE0:
				case GpuOpCodes.TSIZE1:
				case GpuOpCodes.TSIZE2:
				case GpuOpCodes.TSIZE3:
				case GpuOpCodes.TSIZE4:
				case GpuOpCodes.TSIZE5:
				case GpuOpCodes.TSIZE6:
				case GpuOpCodes.TSIZE7:
					var mipMap = this.state.texture.mipmaps[op - GpuOpCodes.TSIZE0];
					var WidthExp = BitUtils.extract(params24, 0, 4);
					var HeightExp = BitUtils.extract(params24, 8, 4);
					var UnknownFlag = (BitUtils.extract(params24, 15, 1) != 0);
					WidthExp = Math.min(WidthExp, 9);
					HeightExp = Math.min(HeightExp, 9);
					mipMap.textureWidth = 1 << WidthExp;
					mipMap.textureHeight = 1 << HeightExp;

					break;

				case GpuOpCodes.TBP0:
				case GpuOpCodes.TBP1:
				case GpuOpCodes.TBP2:
				case GpuOpCodes.TBP3:
				case GpuOpCodes.TBP4:
				case GpuOpCodes.TBP5:
				case GpuOpCodes.TBP6:
				case GpuOpCodes.TBP7:
					var mipMap = this.state.texture.mipmaps[op - GpuOpCodes.TBP0];
					mipMap.address = (mipMap.address & 0xFF000000) | (params24 & 0x00FFFFFF);
					break;

				case GpuOpCodes.TBW0:
				case GpuOpCodes.TBW1:
				case GpuOpCodes.TBW2:
				case GpuOpCodes.TBW3:
				case GpuOpCodes.TBW4:
				case GpuOpCodes.TBW5:
				case GpuOpCodes.TBW6:
				case GpuOpCodes.TBW7:
					var mipMap = this.state.texture.mipmaps[op - GpuOpCodes.TBW0];
					mipMap.bufferWidth = BitUtils.extract(params24, 0, 16);
					mipMap.address = (mipMap.address & 0x00FFFFFF) | ((BitUtils.extract(params24, 16, 8) << 24) & 0xFF000000);
					break;

				case GpuOpCodes.AMC:
					//printf("%08X: %08X", current, instruction);
					this.state.ambientModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
					this.state.ambientModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
					this.state.ambientModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
					this.state.ambientModelColor.a = 1;
					break;

				case GpuOpCodes.AMA:
					this.state.ambientModelColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
					break;

				case GpuOpCodes.ALC:
					//printf("%08X: %08X", current, instruction);
					this.state.lighting.ambientLightColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
					this.state.lighting.ambientLightColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
					this.state.lighting.ambientLightColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
					this.state.lighting.ambientLightColor.a = 1;
					break;

				case GpuOpCodes.ZTST:
					this.state.depthTest.func = BitUtils.extractEnum<TestFunctionEnum>(params24, 0, 8);
					break;

				case GpuOpCodes.ZTE:
					this.state.depthTest.enabled = (params24 != 0);
					break;

				case GpuOpCodes.ALA:
					this.state.lighting.ambientLightColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
					break;

				case GpuOpCodes.DMC:
					//printf("AMC:%08X", params24);

					this.state.diffuseModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
					this.state.diffuseModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
					this.state.diffuseModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
					this.state.diffuseModelColor.a = 1;
					break;

				case GpuOpCodes.SMC:
					this.state.specularModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
					this.state.specularModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
					this.state.specularModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
					this.state.specularModelColor.a = 1;
					break;

				case GpuOpCodes.CBP:
					this.state.texture.clut.adress = (this.state.texture.clut.adress & 0xFF000000) | ((params24 << 0) & 0x00FFFFFF);
					break;

				case GpuOpCodes.CBPH:
					this.state.texture.clut.adress = (this.state.texture.clut.adress & 0x00FFFFFF) | ((params24 << 8) & 0xFF000000);
					break;

				case GpuOpCodes.CLOAD:
					this.state.texture.clut.numberOfColors = BitUtils.extract(params24, 0, 8) * 8;
					break;

				case GpuOpCodes.CMODE:
					this.state.texture.clut.info = params24;
					this.state.texture.clut.pixelFormat = <PixelFormat>BitUtils.extract(params24, 0, 2);
					this.state.texture.clut.shift = BitUtils.extract(params24, 2, 5);
					this.state.texture.clut.mask = BitUtils.extract(params24, 8, 8);
					this.state.texture.clut.start = BitUtils.extract(params24, 16, 5);
					break;

                case GpuOpCodes.PROJ_START: this.state.projectionMatrix.reset(params24); break;
                case GpuOpCodes.PROJ_PUT: this.state.projectionMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8)); break;

                case GpuOpCodes.VIEW_START: this.state.viewMatrix.reset(params24); break;
                case GpuOpCodes.VIEW_PUT: this.state.viewMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8)); break;

                case GpuOpCodes.WORLD_START: this.state.worldMatrix.reset(params24); break;
                case GpuOpCodes.WORLD_PUT: this.state.worldMatrix.put(MathFloat.reinterpretIntAsFloat(params24 << 8)); break;

                case GpuOpCodes.CLEAR:
                    this.state.clearing = (BitUtils.extract(params24, 0, 1) != 0);
                    this.state.clearFlags = BitUtils.extract(params24, 8, 8);
                    this.drawDriver.setClearMode(this.state.clearing, this.state.clearFlags);
					break;

				case GpuOpCodes.BCE: this.state.culling.enabled = (params24 != 0);
				case GpuOpCodes.FFACE:
					this.state.culling.direction = <CullingDirection>params24; // FrontFaceDirectionEnum
					break;

				case GpuOpCodes.PRIM:
					//if (this.current < this.stall) {
					//	var nextOp: GpuOpCodes = (this.memory.readUInt32(this.current) >>> 24);
					//
					//	if (nextOp == GpuOpCodes.PRIM) {
					//		console.log('PRIM_BATCH!');
					//	}
					//}

					//console.log('GPU PRIM');

                    var primitiveType = BitUtils.extractEnum<PrimitiveType>(params24, 16, 3);
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

                case GpuOpCodes.FINISH:
                    break;

				case GpuOpCodes.END:
					
                    this.complete();
                    return true;
                    break;

                default:
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
        }

        private get hasMoreInstructions() {
            return !this.completed && ((this.stall == 0) || (this.current < this.stall));
        }

        private runUntilStall() {
            while (this.hasMoreInstructions) {
                var instruction = this.memory.readUInt32(this.current);
                this.current += 4
                if (this.runInstruction(this.current - 4, instruction)) return;
            }
        }

        private enqueueRunUntilStall() {
            setImmediate(() => {
                this.runUntilStall();
            });
        }

        updateStall(stall: number) {
            this.stall = stall;
            this.enqueueRunUntilStall();
        }

		start() {
			this.promise = new Promise((resolve, reject) => {
				this.promiseResolve = resolve;
				this.promiseReject = reject;
			});
            this.completed = false;

            this.enqueueRunUntilStall();
        }

        waitAsync() {
            return this.promise;
        }
	}

    class PspGpuListRunner {
        private lists: PspGpuList[] = [];
        private freeLists: PspGpuList[] = [];
        private runningLists: PspGpuList[] = [];

        constructor(private memory: Memory, private drawDriver: IDrawDriver) {
            for (var n = 0; n < 32; n++) {
                var list = new PspGpuList(n, memory, drawDriver, this);
                this.lists.push(list);
                this.freeLists.push(list);
            }
        }

        allocate() {
            if (!this.freeLists.length) throw('Out of gpu free lists');
            var list = this.freeLists.pop();
            this.runningLists.push(list);
            return list;
        }

        getById(id: number) {
            return this.lists[id];
        }

        deallocate(list: PspGpuList) {
            this.freeLists.push(list);
            this.runningLists.remove(list);
        }

		waitAsync() {
			return Promise.all(this.runningLists.map(list => list.waitAsync())).then(() => 0);
        }
	}

    export class PspGpu implements IPspGpu {
        //private gl: WebGLRenderingContext;
		private listRunner: PspGpuListRunner;
		driver: IDrawDriver;

		constructor(private memory: Memory, private display: IPspDisplay, private canvas: HTMLCanvasElement) {
			this.driver = new core.gpu.impl.WebGlPspDrawDriver(memory, display, canvas);
			//this.driver = new Context2dPspDrawDriver(memory, canvas);
            this.listRunner = new PspGpuListRunner(memory, this.driver);
        }

		startAsync() {
			return this.driver.initAsync();
        }

		stopAsync() {
			return Promise.resolve();
        }

        
        listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream) {
            var list = this.listRunner.allocate();
            list.current = start;
            list.stall = stall;
            list.callbackId = callbackId;
            list.start();
            return list.id;
        }

        listSync(displayListId: number, syncType: SyncType) {
            //console.log('listSync');
            return this.listRunner.getById(displayListId).waitAsync();
        }

        updateStallAddr(displayListId: number, stall: number) {
            this.listRunner.getById(displayListId).updateStall(stall);
            return 0;
        }

		drawSync(syncType: SyncType) {
			//console.log('drawSync');
            return this.listRunner.waitAsync();
        }
    }
}
