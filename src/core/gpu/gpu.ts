import _memory = require('../memory');
import _display = require('../display');
import _pixelformat = require('../pixelformat');
import _instructions = require('./instructions');
import _state = require('./state');
import _driver = require('./driver');
import _cpu = require('../cpu'); _cpu.CpuState;
import _IndentStringGenerator = require('../../util/IndentStringGenerator');

import DisplayListStatus = _state.DisplayListStatus;
import CpuState = _cpu.CpuState;
import PixelFormat = _pixelformat.PixelFormat;
import IPspDisplay = _display.IPspDisplay;
import Memory = _memory.Memory;
import IDrawDriver = _driver.IDrawDriver;
import ColorEnum = _state.ColorEnum;
import GpuOpCodes = _instructions.GpuOpCodes;
import WebGlPspDrawDriver = require('./webgl/driver');

export interface CpuExecutor {
	execute(state: CpuState, address: number, gprArray: number[]);
}

export interface IPspGpu {
    startAsync();
    stopAsync();

    listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream);
	listSync(displayListId: number, syncType: _state.SyncType);
    updateStallAddr(displayListId: number, stall: number);
	drawSync(syncType: _state.SyncType);
}
 
class VertexBuffer {
	vertices: _state.Vertex[] = [];

    constructor() {
		for (var n = 0; n < 32768; n++) this.vertices[n] = new _state.Vertex();
	}
}

export class VertexReaderFactory {
    private static cache: NumberDictionary<VertexReader> = {};

	static get(vertexState: _state.VertexState): VertexReader {
		var cacheId = vertexState.hash;
        var vertexReader = this.cache[cacheId];
		if (vertexReader === undefined) vertexReader = this.cache[cacheId] = new VertexReader(vertexState);
		return vertexReader;
    }
}

export class VertexReader {
	private readOneFunc: (output: _state.Vertex, inputOffset: number, input: DataView, f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array) => void;
    private readOffset: number = 0;
    public readCode: string;

	constructor(private vertexState: _state.VertexState) {
        this.readCode = this.createJs();
		this.readOneFunc = <any>(new Function('output', 'inputOffset', 'input', 'f32', 's8', 's16', 's32', this.readCode));
	}

	readOne(input:DataView, index: number) {
		var s8 = new Int8Array(input.buffer, input.byteOffset, input.byteLength);
		var s16 = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2);
		var s32 = new Int32Array(input.buffer, input.byteOffset, input.byteLength / 4);
		var f32 = new Float32Array(input.buffer, input.byteOffset, input.byteLength / 4);

		var inputOffset = this.vertexState.size * index;
		var vertex = new _state.Vertex();
		this.readOneFunc(vertex, inputOffset, input, f32, s8, s16, s32);
		return vertex;
	}

	readCount(output: _state.Vertex[], input: DataView, indices: number[], count: number) {
		var s8 = new Int8Array(input.buffer, input.byteOffset, input.byteLength);
		var s16 = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2);
		var s32 = new Int32Array(input.buffer, input.byteOffset, input.byteLength / 4);
		var f32 = new Float32Array(input.buffer, input.byteOffset, input.byteLength / 4);

		if (this.vertexState.hasIndex) {
			for (var n = 0; n < count; n++) {
				var index = indices[n];
				this.readOneFunc(output[n], index * this.vertexState.size, input, f32, s8, s16, s32);
			}
		} else {
			var inputOffset = 0;
			for (var n = 0; n < count; n++) {
				this.readOneFunc(output[n], inputOffset, input, f32, s8, s16, s32);
				inputOffset += this.vertexState.size;
			}
		}
    }

    private createJs() {
        var indentStringGenerator = new _IndentStringGenerator();

        this.readOffset = 0;

		this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, !this.vertexState.transform2D);
		this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, !this.vertexState.transform2D);
		this.createColorJs(indentStringGenerator, this.vertexState.color);
		this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, !this.vertexState.transform2D);
		this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, !this.vertexState.transform2D);

        return indentStringGenerator.output;
	}

	private readInt8() { return '(s8[inputOffset + ' + this.getOffsetAlignAndIncrement(1) + '])'; }
	private readInt16() { return '(s16[(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ') >> 1])'; }
	private readInt32() { return '(s32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }
	private readFloat32() { return '(f32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }

	private readUInt8() { return '((' + this.readInt8() + ' & 0xFF) >>> 0)'; }
	private readUInt16() { return '((' + this.readInt16() + ' & 0xFFFF) >>> 0)'; }
	private readUInt32() { return '((' + this.readInt16() + ' & 0xFFFFFFFF) >>> 0)'; }

    private createColorJs(indentStringGenerator:_IndentStringGenerator, type: ColorEnum) {
        if (type == ColorEnum.Void) return;

        switch (type) {
            case ColorEnum.Color8888:
                this.align(4);
				indentStringGenerator.write('output.r = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.g = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.b = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.a = ((' + this.readUInt8() + ') / 255.0);\n');
                break;
			case ColorEnum.Color5551:
				this.align(2);
				indentStringGenerator.write('var temp = (' + this.readUInt16() + ');\n');
				indentStringGenerator.write('output.r = BitUtils.extractScale1f(temp, 0, 5);\n');
				indentStringGenerator.write('output.g = BitUtils.extractScale1f(temp, 5, 5);\n');
				indentStringGenerator.write('output.b = BitUtils.extractScale1f(temp, 10, 5);\n');
				indentStringGenerator.write('output.a = BitUtils.extractScale1f(temp, 15, 1);\n');
				break;
            default:
				throw (new Error("Not implemented color format '" + type + "'"));
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

	private createNumberJs(indentStringGenerator: _IndentStringGenerator, components: string[], type: _state.NumericEnum, normalize: boolean) {
		if (type == _state.NumericEnum.Void) return;

        components.forEach((component) => {
            switch (type) {
				case _state.NumericEnum.Byte:
					indentStringGenerator.write('output.' + component + ' = ' + this.readInt8());
                    if (normalize) indentStringGenerator.write(' / 127.0');
                    break;
				case _state.NumericEnum.Short:
					indentStringGenerator.write('output.' + component + ' = ' + this.readInt16());
                    if (normalize) indentStringGenerator.write(' / 32767.0');
                    break;
				case _state.NumericEnum.Float:
					indentStringGenerator.write('output.' + component + ' = ' + this.readFloat32());
                    break;
            }
            indentStringGenerator.write(';\n');
        });
    }
}

var vertexBuffer = new VertexBuffer();
var singleCallTest = false;

class PspGpuList {
    current: number;
    stall: number;
	callbackId: number;
	argsPtr: Stream;
    completed: boolean = false;
	state: _state.GpuState = new _state.GpuState();
	status = DisplayListStatus.Paused;
	private promise: Promise<any>;
	private promiseResolve: Function;
	private promiseReject: Function;
	private errorCount: number = 0;

	constructor(public id: number, private memory: Memory, private drawDriver: IDrawDriver, private runner: PspGpuListRunner, private gpu:PspGpu, private cpuExecutor: CpuExecutor) {
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

		function bool1() { return params24 != 0; }
		function float1() { return MathFloat.reinterpretIntAsFloat(params24 << 8); }

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
			case GpuOpCodes.CPE:
				this.state.clipPlane.enabled = (params24 != 0);
				break;
			case GpuOpCodes.SCISSOR1:
				this.state.clipPlane.scissor.left = BitUtils.extract(params24, 0, 10);
				this.state.clipPlane.scissor.top = BitUtils.extract(params24, 10, 10);
				break;
			case GpuOpCodes.SCISSOR2:
				this.state.clipPlane.scissor.right = BitUtils.extract(params24, 0, 10);
				this.state.clipPlane.scissor.bottom = BitUtils.extract(params24, 10, 10);
				break;

            case GpuOpCodes.FBW:
                this.state.frameBuffer.highAddress = BitUtils.extract(params24, 16, 8);
                this.state.frameBuffer.width = BitUtils.extract(params24, 0, 16);
				break;
			case GpuOpCodes.SHADE:
				this.state.shadeModel = BitUtils.extractEnum<_state.ShadingModelEnum>(params24, 0, 16)
				break;

			case GpuOpCodes.LTE:
				this.state.lightning.enabled = (params24 != 0);
				break;

			case GpuOpCodes.ATE:
				this.state.alphaTest.enabled = (params24 != 0);
				break;

			case GpuOpCodes.ATST:
				this.state.alphaTest.func = BitUtils.extractEnum<_state.TestFunctionEnum>(params24, 0, 8);
				this.state.alphaTest.value = BitUtils.extract(params24, 8, 8);
				this.state.alphaTest.mask = BitUtils.extract(params24, 16, 8);
				break;

			case GpuOpCodes.ABE:
				this.state.blending.enabled = (params24 != 0);
				break;
			case GpuOpCodes.ALPHA:
				this.state.blending.functionSource = BitUtils.extractEnum<_state.GuBlendingFactor>(params24, 0, 4);
				this.state.blending.functionDestination = BitUtils.extractEnum<_state.GuBlendingFactor>(params24, 4, 4);
				this.state.blending.equation = BitUtils.extractEnum<_state.GuBlendingEquation>(params24, 8, 4);
				break;

			case GpuOpCodes.LTE0: 
			case GpuOpCodes.LTE1: 
			case GpuOpCodes.LTE2: 
			case GpuOpCodes.LTE3:
				this.state.lightning.lights[op - GpuOpCodes.LTE0].enabled = params24 != 0;
				break;
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
				this.state.texture.filterMinification = BitUtils.extractEnum<_state.TextureFilter>(params24, 0, 8);
				this.state.texture.filterMagnification = BitUtils.extractEnum<_state.TextureFilter>(params24, 8, 8);
				break;
			case GpuOpCodes.TWRAP:
				this.state.texture.wrapU = BitUtils.extractEnum<_state.WrapMode>(params24, 0, 8);
				this.state.texture.wrapV = BitUtils.extractEnum<_state.WrapMode>(params24, 8, 8);
				break;

			case GpuOpCodes.TME:
				this.state.texture.enabled = (params24 != 0);
				break;

			case GpuOpCodes.TMAP:
				this.state.texture.textureMapMode = BitUtils.extractEnum<_state.TextureMapMode>(params24, 0, 8);
				this.state.texture.textureProjectionMapMode = BitUtils.extractEnum<_state.TextureProjectionMapMode>(params24, 8, 8);
				this.state.vertex.normalCount = this.state.texture.getTextureComponentsCount();
				break;

			case GpuOpCodes.TEXTURE_ENV_MAP_MATRIX:
				this.state.texture.shadeU = BitUtils.extract(params24, 0, 2);
				this.state.texture.shadeV = BitUtils.extract(params24, 8, 2);
				break;

			case GpuOpCodes.TEC:
				this.state.texture.envColor.r = BitUtils.extractScalei(params24, 0, 8, 1);
				this.state.texture.envColor.g = BitUtils.extractScalei(params24, 8, 8, 1);
				this.state.texture.envColor.b = BitUtils.extractScalei(params24, 16, 8, 1);
				break;

			case GpuOpCodes.TFUNC:
				this.state.texture.effect = <_state.TextureEffect>BitUtils.extract(params24, 0, 8);
				this.state.texture.colorComponent = <_state.TextureColorComponent>BitUtils.extract(params24, 8, 8);
				this.state.texture.fragment2X = (BitUtils.extract(params24, 16, 8) != 0);
				break;
			case GpuOpCodes.UOFFSET: this.state.texture.offsetU = float1(); break;
			case GpuOpCodes.VOFFSET: this.state.texture.offsetV = float1(); break;

			case GpuOpCodes.USCALE: this.state.texture.scaleU = float1(); break;
			case GpuOpCodes.VSCALE: this.state.texture.scaleV = float1(); break;

			case GpuOpCodes.TFLUSH: this.drawDriver.textureFlush(this.state); break;
			case GpuOpCodes.TSYNC: this.drawDriver.textureSync(this.state); break;
			case GpuOpCodes.TPSM: this.state.texture.pixelFormat = <PixelFormat>BitUtils.extract(params24, 0, 4); break;
			case GpuOpCodes.PSM:
				this.state.drawPixelFormat = <PixelFormat>BitUtils.extract(params24, 0, 4);
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
				//printf("GpuOpCodes.AMC: Params24: %08X", params24);
				this.state.ambientModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.ambientModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.ambientModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.ambientModelColor.a = 1;
				break;

			case GpuOpCodes.AMA:
				//printf("GpuOpCodes.AMA: Params24: %08X", params24);
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
				this.state.depthTest.func = BitUtils.extractEnum<_state.TestFunctionEnum>(params24, 0, 8);
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
			case GpuOpCodes.PROJ_PUT: this.state.projectionMatrix.put(float1()); break;

            case GpuOpCodes.VIEW_START: this.state.viewMatrix.reset(params24); break;
			case GpuOpCodes.VIEW_PUT: this.state.viewMatrix.put(float1()); break;

            case GpuOpCodes.WORLD_START: this.state.worldMatrix.reset(params24); break;
			case GpuOpCodes.WORLD_PUT: this.state.worldMatrix.put(float1()); break;

			case GpuOpCodes.BONE_START: this.state.skinning.currentBoneIndex = params24; break;
			case GpuOpCodes.BONE_PUT: this.state.skinning.write(float1()); break;

			case GpuOpCodes.STE:
				this.state.stencil.enabled = bool1();
				break;

			case GpuOpCodes.SOP:
				this.state.stencil.fail = BitUtils.extractEnum<_state.StencilOperationEnum>(params24, 0, 8);
				this.state.stencil.zfail = BitUtils.extractEnum<_state.StencilOperationEnum>(params24, 8, 8);
				this.state.stencil.zpass = BitUtils.extractEnum<_state.StencilOperationEnum>(params24, 16, 8);
				break;
			case GpuOpCodes.STST:
				this.state.stencil.func = BitUtils.extractEnum<_state.TestFunctionEnum>(params24, 0, 8);
				this.state.stencil.funcRef = BitUtils.extract(params24, 8, 8);
				this.state.stencil.funcMask = BitUtils.extract(params24, 16, 8);
				break;

			case GpuOpCodes.ZMSK:
				this.state.depthTest.mask = BitUtils.extract(params24, 0, 16);
				break;


			case GpuOpCodes.MW0:
			case GpuOpCodes.MW1:
			case GpuOpCodes.MW2:
			case GpuOpCodes.MW3:
			case GpuOpCodes.MW4:
			case GpuOpCodes.MW5:
			case GpuOpCodes.MW6:
			case GpuOpCodes.MW7:
				this.state.morphWeights[op - GpuOpCodes.MW0] = MathFloat.reinterpretIntAsFloat(params24 << 8);
				break;

            case GpuOpCodes.CLEAR:
                this.state.clearing = (BitUtils.extract(params24, 0, 1) != 0);
                this.state.clearFlags = BitUtils.extract(params24, 8, 8);
                this.drawDriver.setClearMode(this.state.clearing, this.state.clearFlags);
				break;

			case GpuOpCodes.BCE:
				this.state.culling.enabled = (params24 != 0);
				break;
			case GpuOpCodes.FFACE:
				this.state.culling.direction = <_state.CullingDirection>params24;
				break;

			case GpuOpCodes.SFIX: this.state.blending.fixColorSourceRGB = params24; break;
			case GpuOpCodes.DFIX: this.state.blending.fixColorDestinationRGB = params24; break;

			case GpuOpCodes.PSUB:
				this.state.patch.divs = BitUtils.extract(params24, 0, 8);
				this.state.patch.divt = BitUtils.extract(params24, 8, 8);
				break;

			case GpuOpCodes.BEZIER:
				var ucount = BitUtils.extract(params24, 0, 8);
				var vcount = BitUtils.extract(params24, 8, 8);
				var divs = this.state.patch.divs;
				var divt = this.state.patch.divt;
				var vertexState = this.state.vertex;
				var vertexReader = VertexReaderFactory.get(vertexState);
				var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
				var vertexInput = this.memory.getPointerDataView(vertexAddress);

				var vertexState2 = vertexState.clone();
				vertexState2.texture = _state.NumericEnum.Float;

				var getBezierControlPoints = (ucount: number, vcount: number) => {
					var controlPoints = ArrayUtils.create2D<_state.Vertex>(ucount, vcount);

					var mipmap = this.state.texture.mipmaps[0];
					var scale = mipmap.textureWidth / mipmap.bufferWidth;
					for (var u = 0; u < ucount; u++) {
						for (var v = 0; v < vcount; v++) {
							var vertex = vertexReader.readOne(vertexInput, v * ucount + u);;
							controlPoints[u][v] = vertex;
							vertex.tx = (u / (ucount - 1)) * scale;
							vertex.ty = (v / (vcount - 1));
							//Console.WriteLine("getControlPoints({0}, {1}) : {2}", u, v, controlPoints[u, v]);
						}
					}
					return controlPoints;
				};

				var controlPoints = getBezierControlPoints(ucount, vcount);
				var vertices2 = [];
				vertices2.push(controlPoints[0][0]);
				vertices2.push(controlPoints[ucount - 1][0]);
				vertices2.push(controlPoints[0][vcount - 1]);

				vertices2.push(controlPoints[ucount - 1][0]);
				vertices2.push(controlPoints[ucount - 1][vcount - 1]);
				vertices2.push(controlPoints[0][vcount - 1]);

				if (vertexState2.hasTexture) {
					//debugger;
				}
				//debugger;
				this.drawDriver.drawElements(_state.PrimitiveType.Triangles, vertices2, vertices2.length, vertexState2);
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

                var primitiveType = BitUtils.extractEnum<_state.PrimitiveType>(params24, 16, 3);
                var vertexCount = BitUtils.extract(params24, 0, 16);
                var vertexState = this.state.vertex;
				var vertexSize = this.state.vertex.size;
				var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
				var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);

				var vertexReader = VertexReaderFactory.get(vertexState);

				var indices: any = null;
				switch (vertexState.index) {
					case _state.IndexEnum.Byte: indices = this.memory.getU8Array(indicesAddress); break;
					case _state.IndexEnum.Short: indices = this.memory.getU16Array(indicesAddress); break;
				}
				
				var vertexInput = this.memory.getPointerDataView(vertexAddress);

				var vertices = vertexBuffer.vertices;
				vertexReader.readCount(vertices, vertexInput, <number[]><any>indices, vertexCount);

                this.drawDriver.setMatrices(this.state.projectionMatrix, this.state.viewMatrix, this.state.worldMatrix);
				this.drawDriver.setState(this.state);

				if (this.errorCount < 400) {
					//console.log('PRIM:' + primitiveType + ' : ' + vertexCount + ':' + vertexState.hasIndex);
				}

				this.drawDriver.drawElements(primitiveType, vertices, vertexCount, vertexState);

                break;

			case GpuOpCodes.FINISH:
				var callback = this.gpu.callbacks.get(this.callbackId);
				this.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [params24, callback.finishArgument]);
                break;
			case GpuOpCodes.SIGNAL:
				console.warn('Not implemented: GPU SIGNAL');
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

	private get isStalled() {
		return ((this.stall != 0) && (this.current >= this.stall));
	}


    private get hasMoreInstructions() {
		return !this.completed && !this.isStalled;
		//return !this.completed && ((this.stall == 0) || (this.current < this.stall));
    }

	private runUntilStall() {
		this.status = DisplayListStatus.Drawing;
		while (this.hasMoreInstructions) {
			try {
				while (this.hasMoreInstructions) {
					var instruction = this.memory.readUInt32(this.current);
					this.current += 4
					if (this.runInstruction(this.current - 4, instruction)) return;
				}
				this.status = (this.isStalled) ? DisplayListStatus.Stalling : DisplayListStatus.Completed;
			} catch (e) {
				console.log(e);
				console.log(e['stack']);
			}
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
		this.status = DisplayListStatus.Queued;

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

	constructor(private memory: Memory, private drawDriver: IDrawDriver, private gpu: PspGpu, private callbackManager: CpuExecutor) {
        for (var n = 0; n < 32; n++) {
            var list = new PspGpuList(n, memory, drawDriver, this, gpu, callbackManager);
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

	peek() {
		var _peek = (() => {
			for (var n = 0; n < this.runningLists.length; n++) {
				var list = this.runningLists[n];
				if (list.status != DisplayListStatus.Completed) return list.status;
			}
			return DisplayListStatus.Completed;
		});
		var result = _peek();
		console.warn('not implemented gpu list peeking -> ' + result);
		return result;
	}

	waitAsync() {
		return Promise.all(this.runningLists.map(list => list.waitAsync())).then(() => _state.DisplayListStatus.Completed);
    }
}

export class PspGpuCallback {
	constructor(public cpuState: CpuState, public signalFunction: number, public signalArgument: number, public finishFunction: number, public finishArgument: number) {
	}
}

export class PspGpu implements IPspGpu {
    //private gl: WebGLRenderingContext;
	private listRunner: PspGpuListRunner;
	driver: IDrawDriver;
	callbacks = new UidCollection<PspGpuCallback>(1);

	constructor(private memory: Memory, private display: IPspDisplay, private canvas: HTMLCanvasElement, private cpuExecutor: CpuExecutor) {
		this.driver = new WebGlPspDrawDriver(memory, display, canvas);
		//this.driver = new Context2dPspDrawDriver(memory, canvas);
		this.listRunner = new PspGpuListRunner(memory, this.driver, this, this.cpuExecutor);
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
		list.argsPtr = argsPtr;
        list.start();
        return list.id;
    }

    listSync(displayListId: number, syncType: _state.SyncType) {
        //console.log('listSync');
        return this.listRunner.getById(displayListId).waitAsync();
    }

    updateStallAddr(displayListId: number, stall: number) {
        this.listRunner.getById(displayListId).updateStall(stall);
        return 0;
    }

	drawSync(syncType: _state.SyncType): any {
		//console.log('drawSync');
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		switch (syncType) {
			case _state.SyncType.Peek: return this.listRunner.peek();
			case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
			default: throw (new Error("Not implemented SyncType." + syncType));
		}
    }
}
