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

	constructor(public id: number, private memory: Memory, private drawDriver: IDrawDriver, private runner: PspGpuListRunner, private gpu: PspGpu, private cpuExecutor: CpuExecutor, public state: _state.GpuState) {
    }

    private complete() {
        this.completed = true;
		this.runner.deallocate(this);
		this.promiseResolve(0);
    }

    private jumpRelativeOffset(offset:number) {
        this.current = this.state.baseAddress + offset;
	}

	private jumpAbsolute(address: number) {
		this.current = address;
	}

	private callstack = <number[]>[];

    private runInstruction(current: number, instruction: number) {
        var op: GpuOpCodes = instruction >>> 24;
		var params24: number = instruction & 0xFFFFFF;

		function bool1() { return params24 != 0; }
		function float1() { return MathFloat.reinterpretIntAsFloat(params24 << 8); }

		//console.info('op:', op, GpuOpCodes[op]);
		switch (op) {
			case GpuOpCodes.IADDR: this.state.indexAddress = params24; break;
			case GpuOpCodes.OFFSETADDR: this.state.baseOffset = (params24 << 8); break;
            case GpuOpCodes.FRAMEBUFPTR: this.state.frameBuffer.lowAddress = params24; break;

			case GpuOpCodes.FOGENABLE: this.state.fog.enabled = bool1(); break;

			case GpuOpCodes.VIEWPORTX1: this.state.viewport.width = float1(); break;
			case GpuOpCodes.VIEWPORTY1: this.state.viewport.height = float1(); break;
			case GpuOpCodes.VIEWPORTZ1: this.state.viewport.depth = float1(); break;

			case GpuOpCodes.VIEWPORTX2: this.state.viewport.x = float1(); break;
			case GpuOpCodes.VIEWPORTY2: this.state.viewport.y = float1(); break;
			case GpuOpCodes.VIEWPORTZ2: this.state.viewport.z = float1(); break;

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

			case GpuOpCodes.LIGHTENABLE0: 
			case GpuOpCodes.LIGHTENABLE1: 
			case GpuOpCodes.LIGHTENABLE2: 
			case GpuOpCodes.LIGHTENABLE3:
				this.state.lightning.lights[op - GpuOpCodes.LIGHTENABLE0].enabled = params24 != 0;
				break;
            case GpuOpCodes.BASE: this.state.baseAddress = ((params24 << 8) & 0xff000000); break;
			case GpuOpCodes.JUMP: this.jumpRelativeOffset(params24 & ~3); break;
			case GpuOpCodes.CALL:
				this.callstack.push(current + 4);
				this.callstack.push(this.state.baseOffset);
				this.jumpRelativeOffset(params24 & ~3);

				break;
			case GpuOpCodes.RET:
				if (this.callstack.length > 0) {
					this.state.baseOffset = this.callstack.pop();
					this.jumpAbsolute(this.callstack.pop());
				} else {
					console.info('gpu callstack empty');
				}
				break;

            case GpuOpCodes.NOP: break;
			case GpuOpCodes.VERTEXTYPE: this.state.vertex.setValue(params24); break;
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

			case GpuOpCodes.TEXTUREMAPENABLE:
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

			case GpuOpCodes.TEXADDR0:
			case GpuOpCodes.TEXADDR1:
			case GpuOpCodes.TEXADDR2:
			case GpuOpCodes.TEXADDR3:
			case GpuOpCodes.TEXADDR4:
			case GpuOpCodes.TEXADDR5:
			case GpuOpCodes.TEXADDR6:
			case GpuOpCodes.TEXADDR7:
				var mipMap = this.state.texture.mipmaps[op - GpuOpCodes.TEXADDR0];
				mipMap.address = (mipMap.address & 0xFF000000) | (params24 & 0x00FFFFFF);
				break;

			case GpuOpCodes.TEXBUFWIDTH0:
			case GpuOpCodes.TEXBUFWIDTH1:
			case GpuOpCodes.TEXBUFWIDTH2:
			case GpuOpCodes.TEXBUFWIDTH3:
			case GpuOpCodes.TEXBUFWIDTH4:
			case GpuOpCodes.TEXBUFWIDTH5:
			case GpuOpCodes.TEXBUFWIDTH6:
			case GpuOpCodes.TEXBUFWIDTH7:
				var mipMap = this.state.texture.mipmaps[op - GpuOpCodes.TEXBUFWIDTH0];
				mipMap.bufferWidth = BitUtils.extract(params24, 0, 16);
				mipMap.address = (mipMap.address & 0x00FFFFFF) | ((BitUtils.extract(params24, 16, 8) << 24) & 0xFF000000);
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
				this.state.lighting.ambientLightColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
				this.state.lighting.ambientLightColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
				this.state.lighting.ambientLightColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
				this.state.lighting.ambientLightColor.a = 1;
				break;


			case GpuOpCodes.AMBIENTALPHA:
				this.state.lighting.ambientLightColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
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

			case GpuOpCodes.MORPHWEIGHT0:
			case GpuOpCodes.MORPHWEIGHT1:
			case GpuOpCodes.MORPHWEIGHT2:
			case GpuOpCodes.MORPHWEIGHT3:
			case GpuOpCodes.MORPHWEIGHT4:
			case GpuOpCodes.MORPHWEIGHT5:
			case GpuOpCodes.MORPHWEIGHT6:
			case GpuOpCodes.MORPHWEIGHT7:
				this.state.morphWeights[op - GpuOpCodes.MORPHWEIGHT0] = MathFloat.reinterpretIntAsFloat(params24 << 8);
				break;

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

			case GpuOpCodes.PRIM:
				var primitiveType = BitUtils.extractEnum<_state.PrimitiveType>(params24, 16, 3);
				var vertexCount = BitUtils.extract(params24, 0, 16);

				this.primCount++;

				//if (this.current < this.stall) {
				//	var nextOp: GpuOpCodes = (this.memory.readUInt32(this.current) >>> 24);
				//
				//	if (nextOp == GpuOpCodes.PRIM) {
				//		console.log('PRIM_BATCH!');
				//	}
				//}

				if (vertexCount > 0) {
					var vertexState = this.state.vertex;
					var vertexSize = vertexState.size;
					var vertexAddress = this.state.getAddressRelativeToBaseOffset(vertexState.address);
					var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);

					var vertexReader = _vertex.VertexReaderFactory.get(vertexState);

					var indices: any = null;
					switch (vertexState.index) {
						case _state.IndexEnum.Byte: indices = this.memory.getU8Array(indicesAddress); break;
						case _state.IndexEnum.Short: indices = this.memory.getU16Array(indicesAddress); break;
					}

					//if (vertexState.realWeightCount > 0) debugger;

					var vertexInput = this.memory.getPointerDataView(vertexAddress);

					if (vertexState.address) {
						if (!vertexState.hasIndex) {
							vertexState.address += vertexState.size * vertexCount;
						}
					}

					var doDegenerate = false;

					if (this.batchPrimCount > 0) {
						switch (primitiveType) {
							case _state.PrimitiveType.TriangleStrip:
							case _state.PrimitiveType.LineStrip:
							case _state.PrimitiveType.TriangleFan:
								vertexBuffer.startDegenerateTriangleStrip();
								doDegenerate = true;
								break;
						}
					}

					var verticesOffset = vertexBuffer.ensureAndTake(vertexCount);
					vertexReader.readCount(vertexBuffer.vertices, verticesOffset, vertexInput, <number[]><any>indices, vertexCount, vertexState.hasIndex);

					if (doDegenerate) vertexBuffer.endDegenerateTriangleStrip();
				}

				// Continuation
				var nextInstruction = this.memory.readUInt32(this.current);
				if (!vertexState.hasIndex && (this.hasMoreInstructions) && ((nextInstruction >>> 24) == GpuOpCodes.PRIM) && ((nextInstruction >>> 16) & 7) == primitiveType) {
					this.batchPrimCount++;
				} else {
					this.batchPrimCount = 0;
					this.drawDriver.drawElements(this.state, primitiveType, vertexBuffer.vertices, vertexBuffer.offset, vertexState); vertexBuffer.reset();
				}

				break;

			case GpuOpCodes.FINISH:
				this.finish();
				var callback = this.gpu.callbacks.get(this.callbackId);
				if (callback && callback.cpuState && callback.finishFunction) {
					this.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [params24, callback.finishArgument]);
				}
                break;
			case GpuOpCodes.SIGNAL:
				console.warn('Not implemented: GPU SIGNAL');
				break;

			case GpuOpCodes.END: this.complete(); return true; break;

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

	private batchPrimCount = 0;
	private primCount = 0;
	//private showOpcodes = true;
	private showOpcodes = false;
	private opcodes = [];
	private finish() {
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

	private runUntilStall() {
		this.status = DisplayListStatus.Drawing;
		while (this.hasMoreInstructions) {
			try {
				while (this.hasMoreInstructions) {
					var instruction = this.memory.readUInt32(this.current);
					this.current += 4
					if (this.showOpcodes) this.opcodes.push(GpuOpCodes[((instruction >> 24) & 0xFF)]);

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
	private state = new _state.GpuState()

	constructor(private memory: Memory, private drawDriver: IDrawDriver, private gpu: PspGpu, private callbackManager: CpuExecutor) {
        for (var n = 0; n < 32; n++) {
            var list = new PspGpuList(n, memory, drawDriver, this, gpu, callbackManager, this.state);
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
