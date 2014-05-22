import _memory = require('../memory');
import _display = require('../display');
import _pixelformat = require('../pixelformat');
import _instructions = require('./instructions');
import _state = require('./state');
import _driver = require('./driver');
import _vertex = require('./vertex');
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
 
var vertexBuffer = new _vertex.VertexBuffer();
var singleCallTest = false;

function bool1(p: number) { return p != 0; }
function param8(p: number, offset: number) { return (p >> offset) & 0xFF; }
function float1(p: number) { return MathFloat.reinterpretIntAsFloat(p << 8); }

class PspGpuExecutor {
	private list: PspGpuList;
	private state: _state.GpuState;
	table: Function[];

	setList(list: PspGpuList) {
		this.list = list;
		this.state = list.state;
	}

	constructor() {
		this.table = new Array(0x100);
		for (var n = 0; n < 0x100; n++) {
			this.table[n] = null;
			var func = this[GpuOpCodes[n]];
			if (func) this.table[n] = func.bind(this);
		}
	}

	NOP(p: number) { }
	IADDR(p: number) { this.state.indexAddress = p; }
	OFFSETADDR(p: number) { this.state.baseOffset = (p << 8); }
	FRAMEBUFPTR(p: number) { this.state.frameBuffer.lowAddress = p; }
	BASE(p: number) { this.state.baseAddress = ((p << 8) & 0xff000000); }
	JUMP(p: number) {
		this.list.jumpRelativeOffset(p & ~3);
	}
	CALL(p: number, current: number) {
		this.list.callstack.push(current + 4);
		this.list.callstack.push(this.state.baseOffset);
		this.list.jumpRelativeOffset(p & ~3);
	}
	RET(p: number) {
		if (this.list.callstack.length > 0) {
			this.list.state.baseOffset = this.list.callstack.pop();
			this.list.jumpAbsolute(this.list.callstack.pop());
		} else {
			console.info('gpu callstack empty');
		}
	}
	VERTEXTYPE(p: number) {
		if (this.list.state.vertex.getValue() == p) return;
		this.list.finishPrimBatch();
		this.list.state.vertex.setValue(p);
	}
	VADDR(p: number) {
		this.list.state.vertex.address = p;
	}
	FINISH(p: number) {
		this.list.finish();
		var callback = this.list.gpu.callbacks.get(this.list.callbackId);
		if (callback && callback.cpuState && callback.finishFunction) {
			this.list.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [p, callback.finishArgument]);
		}
	}
	SIGNAL(p: number) {
		console.warn('Not implemented: GPU SIGNAL');
	}
	END(p: number) {
		this.invalidatePrim();
		this.list.gpu.driver.end();
		this.list.complete();
		return true;
	}

	private invalidatePrim() {
		this.list.finishPrimBatch();
	}

	FOGENABLE(p: number) { if (this.state.fog.enabled != bool1(p)) { this.invalidatePrim(); this.state.fog.enabled = bool1(p); } }

	VIEWPORTX1(p: number) { if (this.state.viewport.width != float1(p)) { this.invalidatePrim(); this.state.viewport.width = float1(p); } }
	VIEWPORTY1(p: number) { if (this.state.viewport.height != float1(p)) { this.invalidatePrim(); this.state.viewport.height = float1(p); } }
	VIEWPORTZ1(p: number) { if (this.state.viewport.depth != float1(p)) { this.invalidatePrim(); this.state.viewport.depth = float1(p); } }

	VIEWPORTX2(p: number) { if (this.state.viewport.x != float1(p)) { this.invalidatePrim(); this.state.viewport.x = float1(p); } }
	VIEWPORTY2(p: number) { if (this.state.viewport.y != float1(p)) { this.invalidatePrim(); this.state.viewport.y = float1(p); } }
	VIEWPORTZ2(p: number) { if (this.state.viewport.z != float1(p)) { this.invalidatePrim(); this.state.viewport.z = float1(p); } }

	TMODE(p: number) {
		if (this.state.texture.tmode == p) return;
		this.invalidatePrim();
		this.state.texture.tmode = p;
		this.state.texture.swizzled = param8(p, 0) != 0;
		this.state.texture.mipmapShareClut = param8(p, 8) != 0;
		this.state.texture.mipmapMaxLevel = param8(p, 16);
	}
	TFLT(p: number) {
		if (this.state.texture.tflt == p) return;
		this.invalidatePrim();
		this.state.texture.tflt = p;
		this.state.texture.filterMinification = <_state.TextureFilter>param8(p, 0);
		this.state.texture.filterMagnification = <_state.TextureFilter>param8(p, 8);
	}
	TWRAP(p: number) {
		if (this.state.texture.twrap == p) return;
		this.invalidatePrim();
		this.state.texture.twrap = p;
		this.state.texture.wrapU = <_state.WrapMode>param8(p, 0);
		this.state.texture.wrapV = <_state.WrapMode>param8(p, 8);
	}
	TEXTUREMAPENABLE(p: number) {
		var v = bool1(p)
		if (this.state.texture.enabled == v) return;
		this.invalidatePrim();
		this.state.texture.enabled = v;
	}
	TMAP(p: number) {
		if (this.state.texture.tmap == p) return;
		this.invalidatePrim();
		this.state.texture.tmap = p;
		this.state.texture.textureMapMode = <_state.TextureMapMode>param8(p, 0);
		this.state.texture.textureProjectionMapMode = <_state.TextureProjectionMapMode>param8(p, 8);
		this.state.vertex.textureComponentCount = this.state.texture.getTextureComponentsCount();
	}

	TSIZE_(p: number, index: number) {
		var mipMap = this.state.texture.mipmaps[index];
		if (mipMap.tsizeValue == p) return;
		this.invalidatePrim();
		var widthExp = BitUtils.extract(p, 0, 4);
		var heightExp = BitUtils.extract(p, 8, 4);
		var unknownFlag = (BitUtils.extract(p, 15, 1) != 0);
		widthExp = Math.min(widthExp, 9);
		heightExp = Math.min(heightExp, 9);
		mipMap.tsizeValue = p;
		mipMap.textureWidth = 1 << widthExp;
		mipMap.textureHeight = 1 << heightExp;
	}

	TEXADDR_(p: number, index: number) {
		var mipMap = this.state.texture.mipmaps[index];
		var address = (mipMap.address & 0xFF000000) | (p & 0x00FFFFFF);
		if (mipMap.address == address) return;
		this.invalidatePrim();
		mipMap.address = address;
	}

	TEXBUFWIDTH_(p: number, index: number) {
		var mipMap = this.state.texture.mipmaps[index];
		var bufferWidth = BitUtils.extract(p, 0, 16);
		var address = (mipMap.address & 0x00FFFFFF) | ((BitUtils.extract(p, 16, 8) << 24) & 0xFF000000);
		if ((mipMap.bufferWidth == bufferWidth) && (mipMap.address == address)) return;
		this.invalidatePrim();
		mipMap.bufferWidth = bufferWidth;
		mipMap.address = address;
	}

	TSIZE0(p: number) { this.TSIZE_(p, 0); }
	TSIZE1(p: number) { this.TSIZE_(p, 1); }
	TSIZE2(p: number) { this.TSIZE_(p, 2); }
	TSIZE3(p: number) { this.TSIZE_(p, 3); }
	TSIZE4(p: number) { this.TSIZE_(p, 4); }
	TSIZE5(p: number) { this.TSIZE_(p, 5); }
	TSIZE6(p: number) { this.TSIZE_(p, 6); }
	TSIZE7(p: number) { this.TSIZE_(p, 7); }

	TEXADDR0(p: number) { this.TEXADDR_(p, 0); }
	TEXADDR1(p: number) { this.TEXADDR_(p, 1); }
	TEXADDR2(p: number) { this.TEXADDR_(p, 2); }
	TEXADDR3(p: number) { this.TEXADDR_(p, 3); }
	TEXADDR4(p: number) { this.TEXADDR_(p, 4); }
	TEXADDR5(p: number) { this.TEXADDR_(p, 5); }
	TEXADDR6(p: number) { this.TEXADDR_(p, 6); }
	TEXADDR7(p: number) { this.TEXADDR_(p, 7); }

	TEXBUFWIDTH0(p: number) { return this.TEXBUFWIDTH_(p, 0); }
	TEXBUFWIDTH1(p: number) { return this.TEXBUFWIDTH_(p, 1); }
	TEXBUFWIDTH2(p: number) { return this.TEXBUFWIDTH_(p, 2); }
	TEXBUFWIDTH3(p: number) { return this.TEXBUFWIDTH_(p, 3); }
	TEXBUFWIDTH4(p: number) { return this.TEXBUFWIDTH_(p, 4); }
	TEXBUFWIDTH5(p: number) { return this.TEXBUFWIDTH_(p, 5); }
	TEXBUFWIDTH6(p: number) { return this.TEXBUFWIDTH_(p, 6); }
	TEXBUFWIDTH7(p: number) { return this.TEXBUFWIDTH_(p, 7); }

	MORPHWEIGHT_(p: number, index: number) {
		var morphWeight = float1(p);
		if (this.state.morphWeights[index] == morphWeight) return;
		this.invalidatePrim();
		this.state.morphWeights[index] = morphWeight;
	}

	MORPHWEIGHT0(p: number) { return this.MORPHWEIGHT_(p, 0); }
	MORPHWEIGHT1(p: number) { return this.MORPHWEIGHT_(p, 1); }
	MORPHWEIGHT2(p: number) { return this.MORPHWEIGHT_(p, 2); }
	MORPHWEIGHT3(p: number) { return this.MORPHWEIGHT_(p, 3); }
	MORPHWEIGHT4(p: number) { return this.MORPHWEIGHT_(p, 4); }
	MORPHWEIGHT5(p: number) { return this.MORPHWEIGHT_(p, 5); }
	MORPHWEIGHT6(p: number) { return this.MORPHWEIGHT_(p, 6); }
	MORPHWEIGHT7(p: number) { return this.MORPHWEIGHT_(p, 7); }

	PRIM(p: number) {
		var primitiveType = BitUtils.extractEnum<_state.PrimitiveType>(p, 16, 3);
		var vertexCount = BitUtils.extract(p, 0, 16);
		var list = this.list;

		if (list.primBatchPrimitiveType != primitiveType) list.finishPrimBatch();
		if (vertexCount <= 0) return false;

		list.primBatchPrimitiveType = primitiveType;

		list.primCount++;

		var vertexState = this.state.vertex;
		var vertexSize = vertexState.size;
		var vertexAddress = this.state.getAddressRelativeToBaseOffset(vertexState.address);
		var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);

		var vertexReader = _vertex.VertexReaderFactory.get(vertexState);

		var indices: any = null;
		switch (vertexState.index) {
			case _state.IndexEnum.Byte: indices = list.memory.getU8Array(indicesAddress); break;
			case _state.IndexEnum.Short: indices = list.memory.getU16Array(indicesAddress); break;
		}

		//if (vertexState.realWeightCount > 0) debugger;

		var vertexInput = list.memory.getPointerDataView(vertexAddress);

		if (vertexState.address) {
			if (!vertexState.hasIndex) {
				vertexState.address += vertexState.size * vertexCount;
			}
		}

		var drawType = PrimDrawType.SINGLE_DRAW;

		switch (primitiveType) {
			case _state.PrimitiveType.Lines:
			case _state.PrimitiveType.Points:
			case _state.PrimitiveType.Triangles:
			case _state.PrimitiveType.Sprites:
				drawType = PrimDrawType.BATCH_DRAW;
				break;
			case _state.PrimitiveType.TriangleStrip:
			case _state.PrimitiveType.LineStrip:
				drawType = PrimDrawType.BATCH_DRAW_DEGENERATE;
				break;
		}

		if ((list.batchPrimCount > 0) && (drawType == PrimDrawType.BATCH_DRAW_DEGENERATE)) vertexBuffer.startDegenerateTriangleStrip();
		{
			var verticesOffset = vertexBuffer.ensureAndTake(vertexCount);
			vertexReader.readCount(vertexBuffer.vertices, verticesOffset, vertexInput, <number[]><any>indices, vertexCount, vertexState.hasIndex);
		}
		if ((list.batchPrimCount > 0) && (drawType == PrimDrawType.BATCH_DRAW_DEGENERATE)) vertexBuffer.endDegenerateTriangleStrip();

		if (drawType == PrimDrawType.SINGLE_DRAW) {
			list.finishPrimBatch();
		} else {
			list.batchPrimCount++;
		}
	}

}

class PspGpuList {
    current: number;
    stall: number;
	callbackId: number;
	argsPtr: Stream;
    completed: boolean = false;
	status = DisplayListStatus.Paused;
	private promise: Promise<any>;
	private promiseResolve: Function;
	private promiseReject: Function;
	private errorCount: number = 0;

	constructor(public id: number, public memory: Memory, private drawDriver: IDrawDriver, private executor: PspGpuExecutor, private runner: PspGpuListRunner, public gpu: PspGpu, public cpuExecutor: CpuExecutor, public state: _state.GpuState) {
    }

    complete() {
        this.completed = true;
		this.runner.deallocate(this);
		this.promiseResolve(0);
    }

    jumpRelativeOffset(offset:number) {
        this.current = this.state.baseAddress + offset;
	}

	jumpAbsolute(address: number) {
		this.current = address;
	}

	callstack = <number[]>[];

    private runInstruction(current: number, instruction: number, op: number, params24: number) {
		function bool1() { return params24 != 0; }
		function float1() { return MathFloat.reinterpretIntAsFloat(params24 << 8); }

		if (op != GpuOpCodes.PRIM) this.finishPrimBatch();

		//console.info('op:', op, GpuOpCodes[op]);
		switch (op) {
			case GpuOpCodes.OFFSETX: this.state.offset.x = params24 & 0xF; break;
			case GpuOpCodes.OFFSETY: this.state.offset.y = params24 & 0xF; break;

			case GpuOpCodes.REGION1:
				this.state.region.x1 = BitUtils.extract(params24, 0, 10);
				this.state.region.y1 = BitUtils.extract(params24, 10, 10);
				break;
			case GpuOpCodes.REGION2:
				this.state.region.x2 = BitUtils.extract(params24, 0, 10);
				this.state.region.y2 = BitUtils.extract(params24, 10, 10);
				break;
			case GpuOpCodes.CLIPENABLE:
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

            case GpuOpCodes.FRAMEBUFWIDTH:
                this.state.frameBuffer.highAddress = BitUtils.extract(params24, 16, 8);
                this.state.frameBuffer.width = BitUtils.extract(params24, 0, 16);
				break;
			case GpuOpCodes.SHADEMODE:
				this.state.shadeModel = BitUtils.extractEnum<_state.ShadingModelEnum>(params24, 0, 16)
				break;

			case GpuOpCodes.LIGHTINGENABLE:
				this.state.lightning.enabled = (params24 != 0);
				break;

			case GpuOpCodes.ALPHATESTENABLE:
				this.state.alphaTest.enabled = (params24 != 0);
				break;

			case GpuOpCodes.ATST:
				this.state.alphaTest.func = BitUtils.extractEnum<_state.TestFunctionEnum>(params24, 0, 8);
				this.state.alphaTest.value = BitUtils.extract(params24, 8, 8);
				this.state.alphaTest.mask = BitUtils.extract(params24, 16, 8);
				break;

			case GpuOpCodes.ALPHABLENDENABLE:
				this.state.blending.enabled = (params24 != 0);
				break;
			case GpuOpCodes.ALPHA:
				this.state.blending.functionSource = BitUtils.extractEnum<_state.GuBlendingFactor>(params24, 0, 4);
				this.state.blending.functionDestination = BitUtils.extractEnum<_state.GuBlendingFactor>(params24, 4, 4);
				this.state.blending.equation = BitUtils.extractEnum<_state.GuBlendingEquation>(params24, 8, 4);
				break;

			case GpuOpCodes.REVERSENORMAL: this.state.vertex.reversedNormal = bool1(); break;
			case GpuOpCodes.PATCHCULLENABLE: this.state.patchCullingState.enabled = bool1(); break;
			case GpuOpCodes.PATCHFACING: this.state.patchCullingState.faceFlag = bool1(); break;
			case GpuOpCodes.ANTIALIASENABLE: this.state.lineSmoothState.enabled = bool1(); break;
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

			case GpuOpCodes.TGENMATRIXNUMBER: this.state.texture.matrix.reset(params24); break;
			case GpuOpCodes.TGENMATRIXDATA: this.state.texture.matrix.put(float1()); break;

			case GpuOpCodes.TEXOFFSETU: this.state.texture.offsetU = float1(); break;
			case GpuOpCodes.TEXOFFSETV: this.state.texture.offsetV = float1(); break;

			case GpuOpCodes.TEXSCALEU: this.state.texture.scaleU = float1(); break;
			case GpuOpCodes.TEXSCALEV: this.state.texture.scaleV = float1(); break;

			case GpuOpCodes.TFLUSH: this.drawDriver.textureFlush(this.state); break;
			case GpuOpCodes.TSYNC: this.drawDriver.textureSync(this.state); break;
			case GpuOpCodes.TPSM: this.state.texture.pixelFormat = <PixelFormat>BitUtils.extract(params24, 0, 4); break;
			case GpuOpCodes.PSM:
				this.state.drawPixelFormat = <PixelFormat>BitUtils.extract(params24, 0, 4);
				break;

		
			case GpuOpCodes.MATERIALSPECULARCOEF:
				this.state.lightning.specularPower = float1();
				break;

			case GpuOpCodes.MATERIALAMBIENT:
				//printf("%08X: %08X", current, instruction);
				//printf("GpuOpCodes.AMC: Params24: %08X", params24);
				this.state.ambientModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.ambientModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.ambientModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.ambientModelColor.a = 1;
				break;

			case GpuOpCodes.MATERIALALPHA:
				//printf("GpuOpCodes.AMA: Params24: %08X", params24);
				this.state.ambientModelColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
				break;

			case GpuOpCodes.AMBIENTCOLOR:
				//printf("%08X: %08X", current, instruction);
				this.state.lightning.ambientLightColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.lightning.ambientLightColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.lightning.ambientLightColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.lightning.ambientLightColor.a = 1;
				break;
			case GpuOpCodes.AMBIENTALPHA:
				this.state.lightning.ambientLightColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
				break;
			case GpuOpCodes.LOGICOPENABLE:
				this.state.logicOp.enabled = bool1();
				break;
			case GpuOpCodes.MATERIALDIFFUSE:
				//printf("AMC:%08X", params24);

				this.state.diffuseModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.diffuseModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.diffuseModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.diffuseModelColor.a = 1;
				break;

			case GpuOpCodes.MATERIALSPECULAR:
				this.state.specularModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.specularModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.specularModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.specularModelColor.a = 1;
				break;
			

			case GpuOpCodes.CLUTADDR:
				this.state.texture.clut.adress = (this.state.texture.clut.adress & 0xFF000000) | ((params24 << 0) & 0x00FFFFFF);
				break;

			case GpuOpCodes.CLUTADDRUPPER:
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

            case GpuOpCodes.PROJMATRIXNUMBER: this.state.projectionMatrix.reset(params24); break;
			case GpuOpCodes.PROJMATRIXDATA: this.state.projectionMatrix.put(float1()); break;

            case GpuOpCodes.VIEWMATRIXNUMBER: this.state.viewMatrix.reset(params24); break;
			case GpuOpCodes.VIEWMATRIXDATA: this.state.viewMatrix.put(float1()); break;

            case GpuOpCodes.WORLDMATRIXNUMBER: this.state.worldMatrix.reset(params24); break;
			case GpuOpCodes.WORLDMATRIXDATA: this.state.worldMatrix.put(float1()); break;

			case GpuOpCodes.BONEMATRIXNUMBER: this.state.skinning.currentBoneIndex = params24; break;
			case GpuOpCodes.BONEMATRIXDATA: this.state.skinning.write(float1()); break;

			case GpuOpCodes.STENCILTESTENABLE:
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

			case GpuOpCodes.ZTST: this.state.depthTest.func = BitUtils.extractEnum<_state.TestFunctionEnum>(params24, 0, 8); break;
			case GpuOpCodes.ZTESTENABLE: this.state.depthTest.enabled = (params24 != 0); break;
			case GpuOpCodes.ZMSK: this.state.depthTest.mask = BitUtils.extract(params24, 0, 16); break;
			case GpuOpCodes.MINZ: this.state.depthTest.rangeFar = (params24 & 0xFFFF) / 65536; break;
			case GpuOpCodes.MAXZ: this.state.depthTest.rangeNear = (params24 & 0xFFFF) / 65536; break;

			/*
			case GpuOpCodes.LIGHTENABLE0: this.state.lightning.lights[0].enabled = bool1(); break;
			case GpuOpCodes.LIGHTENABLE1: this.state.lightning.lights[1].enabled = bool1(); break;
			case GpuOpCodes.LIGHTENABLE2: this.state.lightning.lights[2].enabled = bool1(); break;
			case GpuOpCodes.LIGHTENABLE3: this.state.lightning.lights[3].enabled = bool1(); break;

			case GpuOpCodes.LIGHTTYPE0:
			case GpuOpCodes.LIGHTTYPE1:
			case GpuOpCodes.LIGHTTYPE2:
			case GpuOpCodes.LIGHTTYPE3:
				var light = this.state.lightning.lights[op - GpuOpCodes.LIGHTTYPE0];
				var kind = BitUtils.extract(params24, 0, 8);
				var type = BitUtils.extract(params24, 0, 8);
				light.kind = kind;
				light.type = type;
				switch (light.type) {
					case _state.LightTypeEnum.Directional: light.pw = 0; break;
					case _state.LightTypeEnum.PointLight: light.pw = 1; light.cutoff = 180; break;
					case _state.LightTypeEnum.SpotLight: light.pw = 1; break;
				}
				
				break;

			case GpuOpCodes.LCA0: this.state.lightning.lights[0].constantAttenuation = float1(); break;
			case GpuOpCodes.LCA1: this.state.lightning.lights[1].constantAttenuation = float1(); break;
			case GpuOpCodes.LCA2: this.state.lightning.lights[2].constantAttenuation = float1(); break;
			case GpuOpCodes.LCA3: this.state.lightning.lights[3].constantAttenuation = float1(); break;

			case GpuOpCodes.LLA0: this.state.lightning.lights[0].linearAttenuation = float1(); break;
			case GpuOpCodes.LLA1: this.state.lightning.lights[1].linearAttenuation = float1(); break;
			case GpuOpCodes.LLA2: this.state.lightning.lights[2].linearAttenuation = float1(); break;
			case GpuOpCodes.LLA3: this.state.lightning.lights[3].linearAttenuation = float1(); break;

			case GpuOpCodes.LQA0: this.state.lightning.lights[0].quadraticAttenuation = float1(); break;
			case GpuOpCodes.LQA1: this.state.lightning.lights[1].quadraticAttenuation = float1(); break;
			case GpuOpCodes.LQA2: this.state.lightning.lights[2].quadraticAttenuation = float1(); break;
			case GpuOpCodes.LQA3: this.state.lightning.lights[3].quadraticAttenuation = float1(); break;

			case GpuOpCodes.ALC0: this.state.lightning.lights[0].ambientColor.setRGB(params24); break;
			case GpuOpCodes.ALC1: this.state.lightning.lights[1].ambientColor.setRGB(params24); break;
			case GpuOpCodes.ALC2: this.state.lightning.lights[2].ambientColor.setRGB(params24); break;
			case GpuOpCodes.ALC3: this.state.lightning.lights[3].ambientColor.setRGB(params24); break;
																			  		
			case GpuOpCodes.DLC0: this.state.lightning.lights[0].diffuseColor.setRGB(params24); break;
			case GpuOpCodes.DLC1: this.state.lightning.lights[1].diffuseColor.setRGB(params24); break;
			case GpuOpCodes.DLC2: this.state.lightning.lights[2].diffuseColor.setRGB(params24); break;
			case GpuOpCodes.DLC3: this.state.lightning.lights[3].diffuseColor.setRGB(params24); break;
																			  		
			case GpuOpCodes.SLC0: this.state.lightning.lights[0].specularColor.setRGB(params24); break;
			case GpuOpCodes.SLC1: this.state.lightning.lights[1].specularColor.setRGB(params24); break;
			case GpuOpCodes.SLC2: this.state.lightning.lights[2].specularColor.setRGB(params24); break;
			case GpuOpCodes.SLC3: this.state.lightning.lights[3].specularColor.setRGB(params24); break;

			case GpuOpCodes.SPOTEXP0: this.state.lightning.lights[0].spotExponent = float1(); break;
			case GpuOpCodes.SPOTEXP1: this.state.lightning.lights[1].spotExponent = float1(); break;
			case GpuOpCodes.SPOTEXP2: this.state.lightning.lights[2].spotExponent = float1(); break;
			case GpuOpCodes.SPOTEXP3: this.state.lightning.lights[3].spotExponent = float1(); break;

			case GpuOpCodes.SPOTCUT0: this.state.lightning.lights[0].spotCutoff = float1(); break;
			case GpuOpCodes.SPOTCUT1: this.state.lightning.lights[1].spotCutoff = float1(); break;
			case GpuOpCodes.SPOTCUT2: this.state.lightning.lights[2].spotCutoff = float1(); break;
			case GpuOpCodes.SPOTCUT3: this.state.lightning.lights[3].spotCutoff = float1(); break;

			case GpuOpCodes.LXP0: this.state.lightning.lights[0].px = float1(); break;
			case GpuOpCodes.LYP0: this.state.lightning.lights[0].py = float1(); break;
			case GpuOpCodes.LZP0: this.state.lightning.lights[0].pz = float1(); break; 

			case GpuOpCodes.LXP1: this.state.lightning.lights[1].px = float1(); break;
			case GpuOpCodes.LYP1: this.state.lightning.lights[1].py = float1(); break;
			case GpuOpCodes.LZP1: this.state.lightning.lights[1].pz = float1(); break; 

			case GpuOpCodes.LXP2: this.state.lightning.lights[2].px = float1(); break;
			case GpuOpCodes.LYP2: this.state.lightning.lights[2].py = float1(); break;
			case GpuOpCodes.LZP2: this.state.lightning.lights[2].pz = float1(); break; 

			case GpuOpCodes.LXP3: this.state.lightning.lights[3].px = float1(); break;
			case GpuOpCodes.LYP3: this.state.lightning.lights[3].py = float1(); break;
			case GpuOpCodes.LZP3: this.state.lightning.lights[3].pz = float1(); break; 

			case GpuOpCodes.LXD0: this.state.lightning.lights[0].dx = float1(); break;
			case GpuOpCodes.LYD0: this.state.lightning.lights[0].dy = float1(); break;
			case GpuOpCodes.LZD0: this.state.lightning.lights[0].dz = float1(); break;
							  									 
			case GpuOpCodes.LXD1: this.state.lightning.lights[1].dx = float1(); break;
			case GpuOpCodes.LYD1: this.state.lightning.lights[1].dy = float1(); break;
			case GpuOpCodes.LZD1: this.state.lightning.lights[1].dz = float1(); break;
							  									 
			case GpuOpCodes.LXD2: this.state.lightning.lights[2].dx = float1(); break;
			case GpuOpCodes.LYD2: this.state.lightning.lights[2].dy = float1(); break;
			case GpuOpCodes.LZD2: this.state.lightning.lights[2].dz = float1(); break;
							  									 
			case GpuOpCodes.LXD3: this.state.lightning.lights[3].dx = float1(); break;
			case GpuOpCodes.LYD3: this.state.lightning.lights[3].dy = float1(); break;
			case GpuOpCodes.LZD3: this.state.lightning.lights[3].dz = float1(); break; 
			*/

            case GpuOpCodes.CLEAR:
                this.state.clearing = (BitUtils.extract(params24, 0, 1) != 0);
                this.state.clearFlags = BitUtils.extract(params24, 8, 8);
				break;

			case GpuOpCodes.COLORTESTENABLE: this.state.colorTest.enabled = bool1(); break;
			case GpuOpCodes.DITHERENABLE: this.state.dithering.enabled = bool1(); break;

			case GpuOpCodes.CULLFACEENABLE: this.state.culling.enabled = bool1(); break;
			case GpuOpCodes.CULL: this.state.culling.direction = <_state.CullingDirection>params24; break;

			case GpuOpCodes.SFIX: this.state.blending.fixColorSource.setRGB(params24); break;
			case GpuOpCodes.DFIX: this.state.blending.fixColorDestination.setRGB(params24); break;

			case GpuOpCodes.PATCHDIVISION:
				this.state.patch.divs = BitUtils.extract(params24, 0, 8);
				this.state.patch.divt = BitUtils.extract(params24, 8, 8);
				break;

			case GpuOpCodes.BEZIER:
				var ucount = BitUtils.extract(params24, 0, 8);
				var vcount = BitUtils.extract(params24, 8, 8);
				var divs = this.state.patch.divs;
				var divt = this.state.patch.divt;
				var vertexState = this.state.vertex;
				var vertexReader = _vertex.VertexReaderFactory.get(vertexState);
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

				this.drawDriver.drawElements(_state, _state.PrimitiveType.Triangles, vertices2, vertices2.length, vertexState2);
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

	primBatchPrimitiveType:number = -1;

	finishPrimBatch() {
		if (vertexBuffer.offsetLength == 0) return;
		this.batchPrimCount = 0;
		this.drawDriver.drawElements(this.state, this.primBatchPrimitiveType, vertexBuffer.vertices, vertexBuffer.offsetLength, this.state.vertex);
		vertexBuffer.reset();
		this.primBatchPrimitiveType = -1;
	}

	batchPrimCount = 0;
	primCount = 0;
	//private showOpcodes = true;
	private showOpcodes = false;
	private opcodes = [];
	finish() {
		if (this.showOpcodes) {
			$('#output').text('finish:' + this.primCount + ';' + this.opcodes.join(","));
			if (this.opcodes.length) this.opcodes = [];
		}
		this.primCount = 0;
	}

	private get isStalled() {
		return ((this.stall != 0) && (this.current >= this.stall));
	}


    private get hasMoreInstructions() {
		return !this.completed && !this.isStalled;
		//return !this.completed && ((this.stall == 0) || (this.current < this.stall));
	}

	private runUntilStallInner() {
		while (this.hasMoreInstructions) {
			var instructionPC = this.current;
			var instruction = this.memory.readUInt32(instructionPC);
			this.current += 4;
			if (this.showOpcodes) this.opcodes.push(GpuOpCodes[((instruction >> 24) & 0xFF)]);

			var op = (instruction >>> 24);
			var params24 = (instruction & 0x00FFFFFF);

			var func1 = this.executor.table[op];
			if (func1) {
				if (func1(params24, instructionPC)) return;
			} else {
				if (this.runInstruction(instructionPC, instruction, op, params24)) return;
			}
		}
		this.status = (this.isStalled) ? DisplayListStatus.Stalling : DisplayListStatus.Completed;
	}

	private runUntilStall() {
		this.status = DisplayListStatus.Drawing;
		this.executor.setList(this);
		while (this.hasMoreInstructions) {
			try {
				this.runUntilStallInner();
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

enum PrimDrawType {
	SINGLE_DRAW = 0,
	BATCH_DRAW = 1,
	BATCH_DRAW_DEGENERATE = 2,
}

class PspGpuListRunner {
    private lists: PspGpuList[] = [];
    private freeLists: PspGpuList[] = [];
	private runningLists: PspGpuList[] = [];
	private state = new _state.GpuState()
	private executor = new PspGpuExecutor()

	constructor(private memory: Memory, private drawDriver: IDrawDriver, private gpu: PspGpu, private callbackManager: CpuExecutor) {
        for (var n = 0; n < 32; n++) {
			var list = new PspGpuList(n, memory, drawDriver, this.executor, this, gpu, callbackManager, this.state);
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
		//result = Math.floor(Math.random() * 4);
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
		return this.listRunner.waitAsync();

		switch (syncType) {
			case _state.SyncType.Peek: return this.listRunner.peek();
			case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
			default: throw (new Error("Not implemented SyncType." + syncType));
		}
    }
}
