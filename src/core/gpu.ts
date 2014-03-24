///<reference path="./memory.ts" />
///<reference path="../util/utils.ts" />

declare var vec4: {
    create(): number[];
    fromValues(x: number, y: number, z: number, w: number): number[];
    transformMat4(out: number[], a: number[], m: number[]): number[]
}

declare var mat4: {
	create(): number[];
	clone(a: number[]): number[];
	copy(out: number[], a: number[]): number[];
	identity(a: number[]): number[];
	multiply(out: number[], a: number[], b: number[]): number[];
	ortho(out: number[], left: number, right: number, bottom: number, top: number, near: number, far: number): number[];
};

module core.gpu {
    export enum SyncType {
        ListDone = 0,
        ListQueued = 1,
        ListDrawingDone = 2,
        ListStallReached = 3,
        ListCancelDone = 4,
    }

    export interface IPspGpu {
        startAsync();
        stopAsync();

        listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream);
        listSync(displayListId: number, syncType: SyncType);
        updateStallAddr(displayListId: number, stall: number);
        drawSync(syncType: SyncType);
    }

    class GpuFrameBufferState {
        lowAddress = 0;
        highAddress = 0;
        width = 0;
    }

    export enum IndexEnum {
        Void = 0,
        Byte = 1,
        Short = 2,
    }

    export enum NumericEnum {
        Void = 0,
        Byte = 1,
        Short = 2,
        Float = 3,
    }

    export enum ColorEnum {
        Void = 0,
        Invalid1 = 1,
        Invalid2 = 2,
        Invalid3 = 3,
        Color5650 = 4,
        Color5551 = 5,
        Color4444 = 6,
        Color8888 = 7,
    }

    function IndexEnumGetSize(item: IndexEnum) {
        switch (item) {
            case IndexEnum.Void: return 0;
            case IndexEnum.Byte: return 1;
            case IndexEnum.Short: return 2;
            default: throw ("Invalid enum");
        }
    }

    function NumericEnumGetSize(item: NumericEnum) {
        switch (item) {
            case NumericEnum.Void: return 0;
            case NumericEnum.Byte: return 1;
            case NumericEnum.Short: return 2;
            case NumericEnum.Float: return 4;
            default: throw("Invalid enum");
        }
    }

    function ColorEnumGetSize(item: ColorEnum) {
        switch (item) {
            case ColorEnum.Void: return 0;
            case ColorEnum.Color5650: return 2;
            case ColorEnum.Color5551: return 2;
            case ColorEnum.Color4444: return 2;
            case ColorEnum.Color8888: return 4;
            default: throw ("Invalid enum");
        }
    }

    export class Vertex {
        px = 0.0; py = 0.0; pz = 0.0;
        nx = 0.0; ny = 0.0; nz = 0.0;
        tx = 0.0; ty = 0.0; tz = 0.0;
        r = 0.0; g = 0.0; b = 0.0; a = 1.0;
        w0 = 0.0; w1 = 0.0; w2 = 0.0; w3 = 0.0;
        w4 = 0.0; w5 = 0.0; w6 = 0.0; w7 = 0.0;
    }

    class VertexBuffer {
        vertices: Vertex[] = [];

        constructor() {
            for (var n = 0; n < 1024; n++) this.vertices[n] = new Vertex();
        }
    }

    export class VertexReaderFactory {
        private static cache: NumberDictionary<VertexReader> = {};

        static get(vertexSize: number, texture: NumericEnum, color: ColorEnum, normal: NumericEnum, position: NumericEnum, weight: NumericEnum, index: IndexEnum, weightCount: number, morphingVertexCount: number, transform2D: boolean, textureIndexCount: number = 2): VertexReader {
            var cacheId = [vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount].join('_');
            var vertexReader = this.cache[cacheId];
            if (vertexReader !== undefined) return vertexReader;
            return this.cache[cacheId] = new VertexReader(vertexSize, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount);
        }
    }

    export class VertexReader {
        private readOneFunc: (output: Vertex, input: DataView, inputOffset: number) => void;
        private readOffset: number = 0;
        public readCode: string;

        constructor(private vertexSize:number, private texture: NumericEnum, private color: ColorEnum, private normal: NumericEnum, private position: NumericEnum, private weight: NumericEnum, private index: IndexEnum, private weightCount: number, private morphingVertexCount: number, private transform2D: boolean, private textureIndexCount: number = 2) {
            this.readCode = this.createJs();
            this.readOneFunc = <any>(new Function('output', 'input', 'inputOffset', this.readCode));
        }

        readCount(output: Vertex[], input: DataView, count: number) {
            var inputOffset = 0;
            for (var n = 0; n < count; n++) {
                this.readOneFunc(output[n], input, inputOffset);
                inputOffset += this.vertexSize;
            }
        }

        read(output: Vertex, input: DataView, inputOffset: number) {
            this.readOneFunc(output, input, inputOffset);
        }

        private createJs() {
            var indentStringGenerator = new IndentStringGenerator();

            this.readOffset = 0;

            this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.weightCount), this.weight, !this.transform2D);
            this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.textureIndexCount), this.texture, !this.transform2D);
            this.createColorJs(indentStringGenerator, this.color);
            this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.normal, !this.transform2D);
            this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.position, !this.transform2D);

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

    export class VertexState {
        address = 0;
        private _value = 0;
        reversedNormal = false;
        textureComponentCount = 2;
        size: number;

        get value() { return this._value; }

        set value(value: number) {
            this._value = value;
            this.size = this.getVertexSize();
        }

        getReader() {
            return VertexReaderFactory.get(this.size, this.texture, this.color,this.normal, this.position, this.weight,this.index,this.realWeightCount,this.realMorphingVertexCount,this.transform2D,this.textureComponentCount);
        }

        get hasTexture() { return this.texture != NumericEnum.Void; }
        get hasColor() { return this.color != ColorEnum.Void; }
        get hasNormal() { return this.normal != NumericEnum.Void; }
        get hasPosition() { return this.position != NumericEnum.Void; }
        get hasWeight() { return this.weight != NumericEnum.Void; }
        get hasIndex() { return this.index != IndexEnum.Void; }

        get texture() { return BitUtils.extractEnum<NumericEnum>(this.value, 0, 2); }
        get color() { return BitUtils.extractEnum<ColorEnum>(this.value, 2, 3); }
        get normal() { return BitUtils.extractEnum<NumericEnum>(this.value, 5, 2); }
        get position() { return BitUtils.extractEnum<NumericEnum>(this.value, 7, 2); }
        get weight() { return BitUtils.extractEnum<NumericEnum>(this.value, 9, 2); }
        get index() { return BitUtils.extractEnum<IndexEnum>(this.value, 11, 2); }
        get skinningWeightCount() { return BitUtils.extract(this.value, 14, 3); }
        get morphingVertexCount() { return BitUtils.extract(this.value, 18, 2); }
        get transform2D() { return BitUtils.extractEnum<boolean>(this.value, 23, 1); }

        get weightSize() { return NumericEnumGetSize(this.weight); }
        get colorSize() { return ColorEnumGetSize(this.color); }
        get textureSize() { return NumericEnumGetSize(this.texture); }
        get positionSize() { return NumericEnumGetSize(this.position); }
        get normalSize() { return NumericEnumGetSize(this.normal); }

        private GetMaxAlignment() {
            return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
        }

        get realWeightCount() {
            return this.skinningWeightCount + 1;
        }

        get realMorphingVertexCount() {
            return this.morphingVertexCount + 1;
        }

        getVertexSize() {
            var size = 0;
            size = MathUtils.nextAligned(size, this.weightSize); size += this.realWeightCount * this.weightSize;
            size = MathUtils.nextAligned(size, this.textureSize); size += this.textureComponentCount * this.textureSize;
            size = MathUtils.nextAligned(size, this.colorSize); size += 1 * this.colorSize;
            size = MathUtils.nextAligned(size, this.normalSize); size += 3 * this.normalSize;
            size = MathUtils.nextAligned(size, this.positionSize); size += 3 * this.positionSize;

            var alignmentSize = this.GetMaxAlignment();
            size = MathUtils.nextAligned(size, alignmentSize);

            //Console.WriteLine("Size:" + Size);
            return size;
        }

        read(memory: Memory, count: number) {
            //console.log('read vertices ' + count);
            var vertices = [];
            for (var n = 0; n < count; n++) vertices.push(this.readOne(memory));
            return vertices;
        }

        private readOne(memory: Memory) {
            var address = this.address;
            var vertex: any = {};

            //console.log(vertex);
            this.address += this.size;

            return vertex;
        }
    }

    export class Matrix4x4 {
        index = 0;
        values = mat4.create();

        put(value: number) {
            this.values[this.index++] = value;
        }

        reset(startIndex: number) {
            this.index = startIndex;
        }
    }

    export class Matrix4x3 {
        index = 0;
        values = mat4.create();
        static indices = [ 0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14 ];

        put(value: number) {
            this.values[Matrix4x3.indices[this.index++]] = value;
        }

        reset(startIndex: number) {
            this.index = startIndex;
        }
	}

	class ViewPort {
		x1 = 0;
		y1 = 0;
		x2 = 0;
		y2 = 0;
	}

	class Light {
		enabled = false;
	}

	class Lightning {
		enabled = false;
		lights = [new Light(), new Light(), new Light(), new Light()];
	}

	class TextureState {
		swizzled = false;
		mipmapShareClut = false;
		mipmapMaxLevel = 0;
	}

	class CullingState {
		enabled: boolean;
		direction: CullingDirection;
	}

    class GpuState {
        clearing = false;
        clearFlags = 0;
		baseAddress = 0;
		baseOffset = 0;
		indexAddress = 0;
        frameBuffer = new GpuFrameBufferState();
        vertex = new VertexState();
        projectionMatrix = new Matrix4x4();
        viewMatrix = new Matrix4x3();
		worldMatrix = new Matrix4x3();
		viewPort = new ViewPort();
		lightning = new Lightning();
		texture = new TextureState();
		culling = new CullingState();
    }

    export interface IDrawDriver {
		//clear();
		//prim(primitiveType:GuPrimitiveType, vertexCount: number, );
		setClearMode(clearing: boolean, clearFlags: number);
		setState(state: any);
		setMatrices(projectionMatrix: Matrix4x4, viewMatrix: Matrix4x3, worldMatrix: Matrix4x3);
		//drawSprites(vertices: Vertex[], vertexCount: number, transform2d: boolean);
		//drawTriangles(vertices: Vertex[], vertexCount: number, transform2d: boolean);
		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState);
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
                    var primitiveType = BitUtils.extractEnum<PrimitiveType>(params24, 16, 3);
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

                case GpuOpCodes.FINISH:
                    break;

                case GpuOpCodes.END:
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

	enum CullingDirection {
		CounterClockWise = 0,
		ClockWise = 1
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

	class Context2dPspDrawDriver implements IDrawDriver {
		private context: CanvasRenderingContext2D;

		constructor(private memory: Memory, private canvas: HTMLCanvasElement) {
			//this.gl = this.canvas.getContext('webgl');
			this.context = this.canvas.getContext('2d');
		}

		private clearing: boolean;

		setClearMode(clearing: boolean, flags: number) {
			this.clearing = clearing;
		}

		projectionMatrix: Matrix4x4;
		viewMatrix: Matrix4x3;
		worldMatrix: Matrix4x3;
		transformMatrix = mat4.create();

		setMatrices(projectionMatrix: Matrix4x4, viewMatrix: Matrix4x3, worldMatrix: Matrix4x3) {
			this.projectionMatrix = projectionMatrix;
			this.viewMatrix = viewMatrix;
			this.worldMatrix = worldMatrix;
			//mat4.copy(this.transformMatrix, this.projectionMatrix.values);
			mat4.identity(this.transformMatrix);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
		}

		setState(state: GpuState) {
		}

		test11: boolean = false;

		transformVertex(vertex: Vertex, vertexState: VertexState) {
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
		}

		drawSprites(vertices: Vertex[], count: number, vertexState: VertexState) {
			this.context.fillStyle = this.clearing ? 'black' : 'red';
			for (var n = 0; n < count; n += 2) {
				var a = this.transformVertex(vertices[n + 0], vertexState);
				var b = this.transformVertex(vertices[n + 1], vertexState);
				this.context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
			}
		}

		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			switch (primitiveType) {
				case PrimitiveType.Sprites:
					this.drawSprites(vertices, count, vertexState);
					break;
				case PrimitiveType.Triangles:
					this.drawTriangles(vertices, count, vertexState);
					break;
			}
		}

		drawTriangles(vertices: Vertex[], count: number, vertexState: VertexState) {
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
		}
	}

	class WebGlPspDrawDriver implements IDrawDriver {
		private gl: WebGLRenderingContext;
		private program: WebGLProgram;

		constructor(private memory: Memory, private canvas: HTMLCanvasElement) {
			this.gl = this.canvas.getContext('experimental-webgl');
			if (!this.gl) {
				this.canvas.getContext('webgl');
			}
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);

			this.program = WebGlPspDrawDriver.shaderProgram(this.gl,
				[
					"uniform mat4 u_modelViewProjMatrix;",
					"attribute vec3 vPosition;",
					"attribute vec4 vColor;",
					"varying vec4 v_Color;",
					"void main() {",
					"   v_Color = vColor;",
					"	gl_Position = u_modelViewProjMatrix * vec4(vPosition, 1.0);",
					"}"
				].join("\n"),
				[
					"precision mediump float;",
					"varying vec4 v_Color;",
					"void main() {",
					//"	gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);",
					"	gl_FragColor = v_Color;",
					"}"
				].join("\n")
			);

			this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, -1000, +1000);
		}

		private clearing: boolean;

		setClearMode(clearing: boolean, flags: number) {
			this.clearing = clearing;
		}

		projectionMatrix: Matrix4x4;
		viewMatrix: Matrix4x3;
		worldMatrix: Matrix4x3;
		transformMatrix = mat4.create();
		transformMatrix2d = mat4.create();

		setMatrices(projectionMatrix: Matrix4x4, viewMatrix: Matrix4x3, worldMatrix: Matrix4x3) {
			this.projectionMatrix = projectionMatrix;
			this.viewMatrix = viewMatrix;
			this.worldMatrix = worldMatrix;
			//mat4.copy(this.transformMatrix, this.projectionMatrix.values);
			mat4.identity(this.transformMatrix);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
		}

		private enableDisable(type: number, enable: boolean) {
			if (enable) this.gl.enable(type); else this.gl.disable(type);
			return enable;
		}

		setState(state: GpuState) {
			if (this.enableDisable(this.gl.CULL_FACE, state.culling.enabled)) {
				this.gl.cullFace((state.culling.direction == CullingDirection.ClockWise) ? this.gl.FRONT : this.gl.BACK);
			}
		}

		private drawSprites(vertices: Vertex[], count: number, vertexState: VertexState) {
		}

		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			if (primitiveType == PrimitiveType.Sprites) {
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
				case PrimitiveType.Points: gl.drawArrays(gl.POINTS, 0, count); break;
				case PrimitiveType.Lines: gl.drawArrays(gl.LINES, 0, count); break;
				case PrimitiveType.LineStrip: gl.drawArrays(gl.LINE_STRIP, 0, count); break;
				case PrimitiveType.Triangles: gl.drawArrays(gl.TRIANGLES, 0, count); break;
				case PrimitiveType.TriangleStrip: gl.drawArrays(gl.TRIANGLE_STRIP, 0, count); break;
				case PrimitiveType.TriangleFan: gl.drawArrays(gl.TRIANGLE_FAN, 0, count); break;
			}

			gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vPosition'));
			gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vColor'));
		}

		static uniformSetMat4(gl: WebGLRenderingContext, prog: WebGLProgram, uniform_name: string, arr: number[]) {
			var loc = gl.getUniformLocation(prog, uniform_name);
			gl.uniformMatrix4fv(loc, false, new Float32Array(arr));
		}

		static attributeSetFloats(gl: WebGLRenderingContext, prog: WebGLProgram, attr_name: string, rsize: number, arr: number[]) {
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			var varr = new Float32Array(arr);
			(<any>gl.bufferData)(gl.ARRAY_BUFFER, varr, gl.STATIC_DRAW);
			var attr = gl.getAttribLocation(prog, attr_name);
			gl.enableVertexAttribArray(attr);
			gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
		}

		static shaderProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
			var prog = gl.createProgram();
			var addshader = function (type, source) {
				var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
				gl.shaderSource(s, source);
				gl.compileShader(s);
				if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw(new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s)));
				gl.attachShader(prog, s);
			};
			addshader('vertex', vs);
			addshader('fragment', fs);
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw (new Error("Could not link the shader program!"));
			return prog;
		}
	}

    export class PspGpu implements IPspGpu {
        //private gl: WebGLRenderingContext;
		private listRunner: PspGpuListRunner;
		driver: IDrawDriver;

        constructor(private memory: Memory, private canvas: HTMLCanvasElement) {
			this.driver = new WebGlPspDrawDriver(memory, canvas);
			//this.driver = new Context2dPspDrawDriver(memory, canvas);
            this.listRunner = new PspGpuListRunner(memory, this.driver);
        }

		startAsync() {
			return Promise.resolve();
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
            return this.listRunner.waitAsync();
        }
    }

    export enum PrimitiveType
    {
        Points = 0,
        Lines = 1,
        LineStrip = 2,
        Triangles = 3,
        TriangleStrip = 4,
        TriangleFan = 5,
        Sprites = 6,
        ContinuePreviousPrim = 7,
    }


    enum GpuOpCodes {
        NOP = 0x00, VADDR = 0x01, IADDR = 0x02, Unknown0x03 = 0x03,
        PRIM = 0x04, BEZIER = 0x05, SPLINE = 0x06, BBOX = 0x07,
        JUMP = 0x08, BJUMP = 0x09, CALL = 0x0A, RET = 0x0B,
        END = 0x0C, Unknown0x0D = 0x0D, SIGNAL = 0x0E, FINISH = 0x0F,
        BASE = 0x10, Unknown0x11 = 0x11, VTYPE = 0x12, OFFSET_ADDR = 0x13,
        ORIGIN_ADDR = 0x14, REGION1 = 0x15, REGION2 = 0x16, LTE = 0x17,
        LTE0 = 0x18, LTE1 = 0x19, LTE2 = 0x1A, LTE3 = 0x1B,
        CPE = 0x1C, BCE = 0x1D, TME = 0x1E, FGE = 0x1F,
        DTE = 0x20, ABE = 0x21, ATE = 0x22, ZTE = 0x23,
        STE = 0x24, AAE = 0x25, PCE = 0x26, CTE = 0x27,
        LOE = 0x28, Unknown0x29 = 0x29, BOFS = 0x2A, BONE = 0x2B,
        MW0 = 0x2C, MW1 = 0x2D, MW2 = 0x2E, MW3 = 0x2F,
        MW4 = 0x30, MW5 = 0x31, MW6 = 0x32, MW7 = 0x33,
        Unknown0x34 = 0x34, Unknown0x35 = 0x35, PSUB = 0x36, PPRIM = 0x37,
        PFACE = 0x38, Unknown0x39 = 0x39, WORLD_START = 0x3A, WORLD_PUT = 0x3B,
        VIEW_START = 0x3C, VIEW_PUT = 0x3D, PROJ_START = 0x3E, PROJ_PUT = 0x3F,
        TMS = 0x40, TMATRIX = 0x41, XSCALE = 0x42, YSCALE = 0x43,
        ZSCALE = 0x44, XPOS = 0x45, YPOS = 0x46, ZPOS = 0x47,
        USCALE = 0x48, VSCALE = 0x49, UOFFSET = 0x4A, VOFFSET = 0x4B,
        OFFSETX = 0x4C, OFFSETY = 0x4D, Unknown0x4E = 0x4E, Unknown0x4F = 0x4F,
        SHADE = 0x50, RNORM = 0x51, Unknown0x52 = 0x52, CMAT = 0x53,
        EMC = 0x54, AMC = 0x55, DMC = 0x56, SMC = 0x57,
        AMA = 0x58, Unknown0x59 = 0x59, Unknown0x5A = 0x5A, SPOW = 0x5B,
        ALC = 0x5C, ALA = 0x5D, LMODE = 0x5E, LT0 = 0x5F,
        LT1 = 0x60, LT2 = 0x61, LT3 = 0x62, LXP0 = 0x63,
        LYP0 = 0x64, LZP0 = 0x65, LXP1 = 0x66, LYP1 = 0x67,
        LZP1 = 0x68, LXP2 = 0x69, LYP2 = 0x6A, LZP2 = 0x6B,
        LXP3 = 0x6C, LYP3 = 0x6D, LZP3 = 0x6E, LXD0 = 0x6F,
        LYD0, LZD0, LXD1, LYD1,
        LZD1, LXD2, LYD2, LZD2,
        LXD3, LYD3, LZD3, LCA0,
        LLA0, LQA0, LCA1, LLA1,
        LQA1, LCA2, LLA2, LQA2,
        LCA3, LLA3, LQA3, SPOTEXP0,
        SPOTEXP1, SPOTEXP2, SPOTEXP3, SPOTCUT0,
        SPOTCUT1, SPOTCUT2, SPOTCUT3, ALC0,
        DLC0, SLC0, ALC1, DLC1,
        SLC1, ALC2, DLC2, SLC2,
        ALC3, DLC3, SLC3, FFACE,
        FBP, FBW, ZBP, ZBW,
        TBP0, TBP1, TBP2, TBP3,
        TBP4, TBP5, TBP6, TBP7,
        TBW0, TBW1, TBW2, TBW3,
        TBW4, TBW5, TBW6, TBW7,
        CBP, CBPH, TRXSBP, TRXSBW,
        TRXDBP, TRXDBW, Unknown0xB6, Unknown0xB7,
        TSIZE0, TSIZE1, TSIZE2, TSIZE3,
        TSIZE4, TSIZE5, TSIZE6, TSIZE7,
        TMAP, TEXTURE_ENV_MAP_MATRIX, TMODE, TPSM,
        CLOAD, CMODE, TFLT, TWRAP,
        TBIAS, TFUNC, TEC, TFLUSH,
        TSYNC, FFAR, FDIST, FCOL,
        TSLOPE, Unknown0xD1, PSM, CLEAR,
        SCISSOR1, SCISSOR2, NEARZ, FARZ,
        CTST, CREF, CMSK, ATST,
        STST, SOP, ZTST, ALPHA,
        SFIX, DFIX, DTH0, DTH1,
        DTH2, DTH3, LOP, ZMSK,
        PMSKC, PMSKA, TRXKICK, TRXSPOS,
        TRXDPOS, Unknown0xED, TRXSIZE, Unknown0xEF,
        Unknown0xF0, Unknown0xF1, Unknown0xF2, Unknown0xF3,
        Unknown0xF4, Unknown0xF5, Unknown0xF6, Unknown0xF7,
        Unknown0xF8, Unknown0xF9, Unknown0xFA, Unknown0xFB,
        Unknown0xFC, Unknown0xFD, Unknown0xFE, Dummy,
    }
}
