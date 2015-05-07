///<reference path="../../global.d.ts" />

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
import DummyDrawDriver = require('./webgl/driver_dummy');

export interface CpuExecutor {
	execute(state: CpuState, address: number, gprArray: number[]):void;
}

export interface IPspGpu {
    startAsync():Promise2<void>;
    stopAsync():Promise2<void>;

    listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream):void;
	listSync(displayListId: number, syncType: _state.SyncType):void;
    updateStallAddr(displayListId: number, stall: number):void;
	drawSync(syncType: _state.SyncType):void;
}

var vertexBuffer = new _vertex.VertexBuffer();
var optimizedDrawBuffer = new _vertex.OptimizedDrawBuffer();
var singleCallTest = false;

function bool1(p: number) { return p != 0; }
function param1(p: number, offset: number) { return (p >> offset) & 0x1; }
function param2(p: number, offset: number) { return (p >> offset) & 0x3; }
function param3(p: number, offset: number) { return (p >> offset) & 0x7; }
function param4(p: number, offset: number) { return (p >> offset) & 0xF; }
function param5(p: number, offset: number) { return (p >> offset) & 0x1F; }
function param8(p: number, offset: number) { return (p >> offset) & 0xFF; }
function param10(p: number, offset: number) { return (p >> offset) & 0x3FF; }
function param16(p: number, offset: number) { return (p >> offset) & 0xFFFF; }
function float1(p: number) { return MathFloat.reinterpretIntAsFloat(p << 8); }

class OverlaySection<T> {
	public value:T;
	constructor(public name:string, private resetValue:T, private representer?: (v:T) => any) {
		this.reset();
	}
	get representedValue() {
		return this.representer ? this.representer(this.value) : this.value;
	}
	reset() {
		this.value = this.resetValue;
	}
}

class Overlay {
	private element:HTMLDivElement;
	private sections:OverlaySection<any>[] = [];
	
	constructor() {
		var element = this.element = (typeof document != 'undefined') ? document.createElement('div') : null;
		if (element) {
			element.style.position = 'absolute';
			element.style.zIndex = '10000';
			element.style.top = '0';
			element.style.right = '0';
			element.style.background = 'rgba(0, 0, 0, 0.3)';
			element.style.font = '12px Arial';
			element.style.width = '200px';
			element.style.height = '200px';
			element.style.padding = '4px';
			element.style.color = 'white';
			element.style.whiteSpace = 'pre';
			element.innerText = 'hello world!';
			document.body.appendChild(element);
		}
	}
	
	createSection<T>(name:string, resetValue:T, representer?: (v:T) => any):OverlaySection<T> {
		var section = new OverlaySection(name, resetValue, representer);
		this.sections.push(section);
		return section;
	}
	
	update() {
		if (this.element) this.element.innerText = this.sections.map(s => `${s.name}: ${s.representedValue}`).join('\n');
	}
	
	private reset() {
		for (let s of this.sections) s.reset();
	}
	
	updateAndReset() {
		this.update();
		this.reset();
	}
}

var overlay = new Overlay();
var overlayIndexCount = overlay.createSection('indexCount', 0);
var overlayNonIndexCount = overlay.createSection('nonIndexCount', 0);
var overlayVertexCount = overlay.createSection('vertexCount', 0);
var trianglePrimCount = overlay.createSection('trianglePrimCount', 0);
var triangleStripPrimCount = overlay.createSection('triangleStripPrimCount', 0);
var spritePrimCount = overlay.createSection('spritePrimCount', 0);
var otherPrimCount = overlay.createSection('otherPrimCount', 0);
var optimizedCount = overlay.createSection('optimizedCount', 0);
var nonOptimizedCount = overlay.createSection('nonOptimizedCount', 0);
var hashMemoryCount = overlay.createSection('hashMemoryCount', 0);
var totalCommands = overlay.createSection('totalCommands', 0);
var totalStalls = overlay.createSection('totalStalls', 0);
var hashMemorySize = overlay.createSection('hashMemorySize', 0, numberToFileSize);
var timePerFrame = overlay.createSection('time', 0, (v) => `${v.toFixed(0)} ms`);

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
			var func = (<any>this)[GpuOpCodes[n]];
			this.table[n] = func ? func.bind(this) : this.UNKNOWN.bind(this);
		}
	}

	NOP(p: number) { }
	DUMMY(p: number) { }
	IADDR(p: number) { this.state.indexAddress = p; }
	OFFSETADDR(p: number) { this.state.baseOffset = (p << 8); }
	FRAMEBUFPTR(p: number) { this.state.frameBuffer.lowAddress = p; }
	BASE(p: number) { this.state.baseAddress = ((p << 8) & 0xff000000); }
	JUMP(p: number) {
		this.list.jumpRelativeOffset(p & ~3);
	}
	CALL(p: number, current: number) {
		this.list.callstack[this.list.callstackIndex++] = ((current << 2) + 4);
		this.list.callstack[this.list.callstackIndex++] = (((this.state.baseOffset >>> 2) & Memory.MASK));
		this.list.jumpRelativeOffset(p & ~3);
	}
	RET(p: number) {
		if (this.list.callstackIndex > 0 && this.list.callstackIndex < 1024) {
			this.list.state.baseOffset = this.list.callstack[--this.list.callstackIndex];
			this.list.jumpAbsolute(this.list.callstack[--this.list.callstackIndex]);
		} else {
			console.info('gpu callstack empty or overflow');
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

	PROJMATRIXNUMBER(p: number) {
		this.state.projectionMatrix.reset(p);
	}
	PROJMATRIXDATA(p: number) {
		var v = float1(p);
		if (this.state.projectionMatrix.check(v)) return;
		this.invalidatePrim();
		this.state.projectionMatrix.put(v);
	}

	VIEWMATRIXNUMBER(p: number) {
		this.state.viewMatrix.reset(p);
	}
	VIEWMATRIXDATA(p: number) {
		var v = float1(p);
		if (this.state.viewMatrix.check(v)) return;
		this.invalidatePrim();
		this.state.viewMatrix.put(v);
	}

	WORLDMATRIXNUMBER(p: number) {
		this.state.worldMatrix.reset(p);
	}
	WORLDMATRIXDATA(p: number) {
		var v = float1(p);
		if (this.state.worldMatrix.check(v)) return;
		this.invalidatePrim();
		this.state.worldMatrix.put(v);
	}

	BONEMATRIXNUMBER(p: number) {
		this.state.skinning.setCurrentBoneIndex(p);
	}
	BONEMATRIXDATA(p: number) {
		var v = float1(p);
		if (this.state.skinning.check(v)) return;
		this.invalidatePrim();
		this.state.skinning.write(v);
	}

	TGENMATRIXNUMBER(p: number) {
		this.state.texture.matrix.reset(p);
	}
	TGENMATRIXDATA(p: number) {
		var v = float1(p);
		if (this.state.texture.matrix.check(v)) return;
		this.invalidatePrim();
		this.state.texture.matrix.put(v);
	}

	TEXOFFSETU(p: number) {
		var v = float1(p);
		if (this.state.texture.offsetU == v) return;
		this.invalidatePrim();
		this.state.texture.offsetU = v;
	}
	TEXOFFSETV(p: number) {
		var v = float1(p);
		if (this.state.texture.offsetV == v) return;
		this.invalidatePrim();
		this.state.texture.offsetV = float1(p);
	}

	TEXSCALEU(p: number) {
		var v = float1(p);
		if (this.state.texture.scaleU == v) return;
		this.invalidatePrim();
		this.state.texture.scaleU = float1(p);
	}
	TEXSCALEV(p: number) {
		var v = float1(p);
		if (this.state.texture.scaleV == v) return;
		this.invalidatePrim();
		this.state.texture.scaleV = float1(p);
	}

	TBIAS(p: number) {
		if (this.state.texture._tbias == p) return;
		this.invalidatePrim();
		this.state.texture._tbias = p;
		this.state.texture.levelMode = <_state.TextureLevelMode>param8(p, 0)
		this.state.texture.mipmapBias = param8(p, 16) / 16;
	}

	TSLOPE(p: number) {
		var v = float1(p);
		if (this.state.texture.slopeLevel == v) return;
		this.invalidatePrim();
		this.state.texture.slopeLevel = v;
	}

	FCOL(p: number) {
		if (this.state.fog._color == p) return;
		this.invalidatePrim();
		this.state.fog._color = p;
		this.state.fog.color.setRGB(p);
	}

	FFAR(p: number) {
		var v = float1(p);
		if (this.state.fog.far == v) return;
		this.invalidatePrim();
		this.state.fog.far = v;
	}

	FDIST(p: number) {
		var v = float1(p);
		if (this.state.fog.dist == v) return;
		this.invalidatePrim();
		this.state.fog.dist = v;
	}

	private invalidatePrim() {
		this.list.finishPrimBatch();
	}

	FOGENABLE(p: number) { if (this.state.fog.enabled != bool1(p)) { this.invalidatePrim(); this.state.fog.enabled = bool1(p); } }

	VIEWPORTX1(p: number) { if (this.state.viewport.width != float1(p)) { this.invalidatePrim(); this.state.viewport.width = float1(p); } }
	VIEWPORTY1(p: number) { if (this.state.viewport.height != float1(p)) { this.invalidatePrim(); this.state.viewport.height = float1(p); } }
	VIEWPORTZ1(p: number) { if (this.state.viewport.depth != float1(p)) { this.invalidatePrim(); this.state.viewport.depth = float1(p); } }

	VIEWPORTX2(p: number) { if (this.state.viewport.x == float1(p)) return; this.invalidatePrim(); this.state.viewport.x = float1(p); }
	VIEWPORTY2(p: number) { if (this.state.viewport.y == float1(p)) return; this.invalidatePrim(); this.state.viewport.y = float1(p); }
	VIEWPORTZ2(p: number) { if (this.state.viewport.z == float1(p)) return; this.invalidatePrim(); this.state.viewport.z = float1(p); }

	OFFSETX(p: number) { if (this.state.offset.x == param4(p, 0)) return; this.invalidatePrim(); this.state.offset.x = param4(p, 0); }
	OFFSETY(p: number) { if (this.state.offset.y == param4(p, 0)) return; this.invalidatePrim(); this.state.offset.y = param4(p, 0); }
	REGION1(p: number) {
		if (this.state.region._xy1 == p) return;
		this.invalidatePrim();
		this.state.region._xy1 = p;
		this.state.region.x1 = param10(p, 0);
		this.state.region.y1 = param10(p, 10);
	}
	REGION2(p: number) {
		if (this.state.region._xy2 == p) return;
		this.invalidatePrim();
		this.state.region._xy2 = p;
		this.state.region.x2 = param10(p, 0);
		this.state.region.y2 = param10(p, 10);
	}
	CLIPENABLE(p: number) {
		if (this.state.clipPlane.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.clipPlane.enabled = bool1(p);
		this.state.clipPlane.updated = false;
	}
	SCISSOR1(p: number) {
		if (this.state.clipPlane._scissorLeftTop == p) return;
		this.invalidatePrim();
		this.state.clipPlane._scissorLeftTop = p;
		this.state.clipPlane.scissor.left = param10(p, 0);
		this.state.clipPlane.scissor.top = param10(p, 10);
		this.state.clipPlane.updated = false;
	}

	SCISSOR2(p: number) {
		if (this.state.clipPlane._scissorRightBottom == p) return;
		this.invalidatePrim();
		this.state.clipPlane._scissorRightBottom = p;
		this.state.clipPlane.scissor.right = param10(p, 0);
		this.state.clipPlane.scissor.bottom = param10(p, 10);
		this.state.clipPlane.updated = false;
	}

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
		var widthExp = param4(p, 0);
		var heightExp = param4(p, 8);
		var unknownFlag = param1(p, 15);
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
		var bufferWidth = param16(p, 0);
		var address = (mipMap.address & 0x00FFFFFF) | ((param8(p, 16) << 24) & 0xFF000000);
		if ((mipMap.bufferWidth == bufferWidth) && (mipMap.address == address)) return;
		this.invalidatePrim();
		mipMap.bufferWidth = bufferWidth;
		mipMap.address = address;
	}

	SOP(p: number) {
		if (this.state.stencil.sop == p) return;
		this.invalidatePrim();
		this.state.stencil.sop = p;
		this.state.stencil.fail = <_state.StencilOperationEnum>param8(p, 0);
		this.state.stencil.zfail = <_state.StencilOperationEnum>param8(p, 8);
		this.state.stencil.zpass = <_state.StencilOperationEnum>param8(p, 16);
	}


	STST(p: number) {
		if (this.state.stencil.stst == p) return;
		this.invalidatePrim();
		this.state.stencil.stst = p;
		this.state.stencil.func = <_state.TestFunctionEnum>param8(p, 0);
		this.state.stencil.funcRef = param8(p, 8);
		this.state.stencil.funcMask = param8(p, 16);
	}

	ZTST(p: number) {
		var v = <_state.TestFunctionEnum>param8(p, 0);
		if (this.state.depthTest.func == v) return;
		this.invalidatePrim();
		this.state.depthTest.func = v;
		this.state.depthTest.updated = false;
	}

	ZTESTENABLE(p: number) {
		var v = bool1(p);
		if (this.state.depthTest.enabled == v) return;
		this.invalidatePrim();
		this.state.depthTest.enabled = v;
		this.state.depthTest.updated = false;
	}

	ZMSK(p: number) {
		var v = param16(p, 0);
		if (this.state.depthTest.mask == v) return;
		this.invalidatePrim();
		this.state.depthTest.mask = v;
		this.state.depthTest.updated = false;
	}

	MINZ(p: number) {
		var v = (p & 0xFFFF) / 65536;
		if (this.state.depthTest.rangeFar == v) return;
		this.invalidatePrim();
		this.state.depthTest.rangeFar = v;
		this.state.depthTest.updated = false;
	}

	MAXZ(p: number) {
		var v = (p & 0xFFFF) / 65536;
		if (this.state.depthTest.rangeNear == v) return;
		this.invalidatePrim();
		this.state.depthTest.rangeNear = v;
		this.state.depthTest.updated = false;
	}

	FRAMEBUFWIDTH(p: number) {
		if (this.state.frameBuffer._widthHighAddress == p) return;
		this.invalidatePrim();
		this.state.frameBuffer._widthHighAddress = p;
		this.state.frameBuffer.width = param16(p, 0);
		this.state.frameBuffer.highAddress = param8(p, 16);
	}
	SHADEMODE(p: number) {
		if (this.state.shadeModel == <_state.ShadingModelEnum>param16(p, 0)) return;
		this.invalidatePrim();
		this.state.shadeModel = <_state.ShadingModelEnum>param16(p, 0);
	}

	LIGHTINGENABLE(p: number) {
		if (this.state.lightning.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.lightning.enabled = bool1(p);
	}

	ALPHATESTENABLE(p: number) {
		if (this.state.alphaTest.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.alphaTest.enabled = bool1(p);
	}

	ATST(p: number) {
		if (this.state.alphaTest._atst == p) return;
		this.invalidatePrim();
		this.state.alphaTest._atst = p;
		this.state.alphaTest.func = <_state.TestFunctionEnum>param8(p, 0);
		this.state.alphaTest.value = param8(p, 8);
		this.state.alphaTest.mask = param8(p, 16);
	}

	ALPHABLENDENABLE(p: number) {
		if (this.state.blending.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.blending.enabled = bool1(p);
		this.state.blending.updated = false;
	}

	ALPHA(p: number) {
		if (this.state.blending._alpha == p) return;
		this.invalidatePrim();
		this.state.blending._alpha = p;
		this.state.blending.functionSource = <_state.GuBlendingFactor>param4(p, 0);
		this.state.blending.functionDestination = < _state.GuBlendingFactor > param4(p, 4);
		this.state.blending.equation = <_state.GuBlendingEquation > param4(p, 8);
		this.state.blending.updated = false;
	}

	REVERSENORMAL(p: number) {
		if (this.state.vertex.reversedNormal == bool1(p)) return;
		this.invalidatePrim();
		this.state.vertex.reversedNormal = bool1(p);
	}

	PATCHCULLENABLE(p: number) {
		if (this.state.patchCullingState.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.patchCullingState.enabled = bool1(p);
	}
	PATCHFACING(p: number) {
		if (this.state.patchCullingState.faceFlag == bool1(p)) return;
		this.invalidatePrim();
		this.state.patchCullingState.faceFlag = bool1(p);
	}

	ANTIALIASENABLE(p: number) {
		if (this.state.lineSmoothState.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.lineSmoothState.enabled = bool1(p);
	}

	TEXTURE_ENV_MAP_MATRIX(p: number) {
		if (this.state.texture._shadeUV == p) return;
		this.invalidatePrim();
		this.state.texture._shadeUV = p;
		this.state.texture.shadeU = param2(p, 0);
		this.state.texture.shadeV = param2(p, 8);
	}

	TEC(p: number) {
		if (this.state.texture._envColor == p) return;
		this.invalidatePrim();
		this.state.texture._envColor = p;
		this.state.texture.envColor.r = BitUtils.extractScalei(p, 0, 8, 1);
		this.state.texture.envColor.g = BitUtils.extractScalei(p, 8, 8, 1);
		this.state.texture.envColor.b = BitUtils.extractScalei(p, 16, 8, 1);
	}

	TFUNC(p: number) {
		if (this.state.texture._tfunc == p) return;
		this.invalidatePrim();
		this.state.texture._tfunc = p;
		this.state.texture.effect = <_state.TextureEffect>param8(p, 0);
		this.state.texture.colorComponent = <_state.TextureColorComponent>param8(p, 8);
		this.state.texture.fragment2X = (param8(p, 16) != 0);
	}

	TFLUSH(p: number) {
		this.invalidatePrim();
		this.list.drawDriver.textureFlush(this.state);
	}
	TSYNC(p: number) {
		//this.invalidatePrim();
		this.list.drawDriver.textureSync(this.state);
	}
	TPSM(p: number) {
		if (this.state.texture.pixelFormat == <PixelFormat>param4(p, 0)) return;
		this.invalidatePrim();
		this.state.texture.pixelFormat = <PixelFormat>param4(p, 0);
	}
	PSM(p: number) {
		if (this.state.drawPixelFormat == <PixelFormat>param4(p, 0)) return;
		this.invalidatePrim();
		this.state.drawPixelFormat = <PixelFormat>param4(p, 0);
	}

	PMSKC(p: number) {
		if (this.state.blending._colorMask == p) return;
		this.invalidatePrim();
		this.state.blending._colorMask = p;
		this.state.blending.colorMask.r = param8(p, 0);
		this.state.blending.colorMask.g = param8(p, 8);
		this.state.blending.colorMask.b = param8(p, 16);
		this.state.blending.updated = false;
	}

	PMSKA(p: number) {
		if (this.state.blending._colorMaskA == p) return;
		this.invalidatePrim();
		this.state.blending._colorMaskA = p;
		this.state.blending.colorMask.a = param8(p, 0);
		this.state.blending.updated = false;
	}

	MATERIALSPECULARCOEF(p: number) {
		var v = float1(p);
		if (this.state.lightning.specularPower == v) return;
		this.invalidatePrim();
		this.state.lightning.specularPower = v;
	}

	MATERIALAMBIENT(p: number) {
		if (this.state._ambientModelColor == p) return;
		this.invalidatePrim();
		this.state._ambientModelColor = p;
		this.state.ambientModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
		this.state.ambientModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
		this.state.ambientModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
		this.state.ambientModelColor.a = 1;
	}

	MATERIALALPHA(p: number) {
		if (this.state._ambientModelColorAlpha == p) return;
		this.invalidatePrim();
		this.state._ambientModelColorAlpha = p;
		this.state.ambientModelColor.a = BitUtils.extractScalef(p, 0, 8, 1);
	}

	AMBIENTCOLOR(p: number) {
		if (this.state.lightning._ambientLightColor == p) return;
		this.invalidatePrim();
		this.state.lightning._ambientLightColor = p;
		this.state.lightning.ambientLightColor.r = BitUtils.extractScalef(p, 0, 8, 1);
		this.state.lightning.ambientLightColor.g = BitUtils.extractScalef(p, 8, 8, 1);
		this.state.lightning.ambientLightColor.b = BitUtils.extractScalef(p, 16, 8, 1);
		this.state.lightning.ambientLightColor.a = 1;
	}

	AMBIENTALPHA(p: number) {
		if (this.state.lightning._ambientLightColorAlpha == p) return;
		this.invalidatePrim();
		this.state.lightning._ambientLightColorAlpha = p;
		this.state.lightning.ambientLightColor.a = BitUtils.extractScalef(p, 0, 8, 1);
	}

	LOGICOPENABLE(p: number) {
		if (this.state.logicOp.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.logicOp.enabled = bool1(p);
	}

	MATERIALDIFFUSE(p: number) {
		if (this.state._diffuseModelColor == p) return;
		this.invalidatePrim();
		this.state._diffuseModelColor = p;
		this.state.diffuseModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
		this.state.diffuseModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
		this.state.diffuseModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
		this.state.diffuseModelColor.a = 1;
	}

	MATERIALSPECULAR(p: number) {
		if (this.state._specularModelColor == p) return;
		this.invalidatePrim();
		this.state._specularModelColor = p;

		this.state.specularModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
		this.state.specularModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
		this.state.specularModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
		this.state.specularModelColor.a = 1;
	}

	CLUTADDR(p: number) {
		var v = (this.state.texture.clut.address & 0xFF000000) | ((p << 0) & 0x00FFFFFF);
		if (this.state.texture.clut.address == v) return;
		this.invalidatePrim();
		this.state.texture.clut.address = v;
	}

	CLUTADDRUPPER(p: number) {
		var v = (this.state.texture.clut.address & 0x00FFFFFF) | ((p << 8) & 0xFF000000);
		if (this.state.texture.clut.address == v) return;
		this.invalidatePrim();
		this.state.texture.clut.address = v;
	}

	CLOAD(p: number) {
		var v = param8(p, 0) * 8;
		if (this.state.texture.clut.numberOfColors == v) return;
		this.invalidatePrim();
		this.state.texture.clut.numberOfColors = v;
	}

	CMODE(p: number) {
		if (this.state.texture.clut.info == p) return;
		this.invalidatePrim();
		this.state.texture.clut.info = p;
		this.state.texture.clut.pixelFormat = <PixelFormat>param2(p, 0);
		this.state.texture.clut.shift = param5(p, 2);
		this.state.texture.clut.mask = param8(p, 8);
		this.state.texture.clut.start = param5(p, 16);
	}

	STENCILTESTENABLE(p: number) {
		if (this.state.stencil.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.stencil.enabled = bool1(p);
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

	CLEAR(p: number) {
		if (this.state._clearingWord == p) return;
		this.invalidatePrim();
		this.state._clearingWord = p;
		this.state.clearing = (param1(p, 0) != 0);
		this.state.clearFlags = param8(p, 8);
	}

	COLORTESTENABLE(p: number) {
		if (this.state.colorTest.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.colorTest.enabled = bool1(p);
	}

	DITHERENABLE(p: number) {
		if (this.state.dithering.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.dithering.enabled = bool1(p);
	}

	CULLFACEENABLE(p: number) {
		if (this.state.culling.enabled == bool1(p)) return;
		this.invalidatePrim();
		this.state.culling.enabled = bool1(p);
	}

	CULL(p: number) {
		if (this.state.culling.direction == <_state.CullingDirection>p) return;
		this.invalidatePrim();
		this.state.culling.direction = <_state.CullingDirection>p;
	}

	SFIX(p: number) {
		if (this.state.blending._fixColorSourceWord == p) return;
		this.invalidatePrim();
		this.state.blending._fixColorSourceWord = p;
		this.state.blending.fixColorSource.setRGB(p);
		this.state.blending.updated = false;
	}

	DFIX(p: number) {
		if (this.state.blending._fixColorDestinationWord == p) return;
		this.invalidatePrim();
		this.state.blending._fixColorDestinationWord = p;
		this.state.blending.fixColorDestination.setRGB(p);
		this.state.blending.updated = false;
	}

	UNKNOWN(p: number, current: number, op: number) {
		this.invalidatePrim();
		this.list.errorCount++;
		if (this.list.errorCount >= 400) {
			if (this.list.errorCount == 400) {
				console.error(sprintf('Stop showing gpu errors'));
			}
		} else {
			//console.error(sprintf('Not implemented gpu opcode 0x%02X : %s', op, GpuOpCodes[op]));
		}

	}

	PRIM(p: number) {
		var primitiveType = <_state.PrimitiveType>param3(p, 16);
		var vertexCount = param16(p, 0);
		var list = this.list;

		if (list.primBatchPrimitiveType != primitiveType) list.finishPrimBatch();
		if (vertexCount <= 0) return false;

		list.primBatchPrimitiveType = primitiveType;

		list.primCount++;

		var vertexState = this.state.vertex;
		var vertexSize = vertexState.size;
		var vertexAddress = this.state.getAddressRelativeToBaseOffset(vertexState.address);
		var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);

		var indices: any = null;
		switch (vertexState.index) {
			case _state.IndexEnum.Byte: indices = list.memory.getU8Array(indicesAddress, vertexCount); break;
			case _state.IndexEnum.Short: indices = list.memory.getU16Array(indicesAddress, vertexCount * 2); break;
		}
		
		if (vertexState.index == _state.IndexEnum.Void) {
			overlayNonIndexCount.value += 1;
		} else {
			overlayIndexCount.value += 1;
		}
		
		overlayVertexCount.value += vertexCount;

		//if (vertexState.realWeightCount > 0) debugger;

		var vertexInput:Uint8Array = list.memory.getPointerU8Array(vertexAddress, indices ? undefined : (vertexSize * vertexCount));
		if (vertexState.address && !vertexState.hasIndex) vertexState.address += vertexState.size * vertexCount;

		var drawType = PrimDrawType.SINGLE_DRAW;
		
		switch (primitiveType) {
			case _state.PrimitiveType.Triangles:
				trianglePrimCount.value++;
				break;
			case _state.PrimitiveType.TriangleStrip:
				triangleStripPrimCount.value++;
				break;
			case _state.PrimitiveType.Sprites:
				spritePrimCount.value++;
				break;
			default:
				otherPrimCount.value++;
				break;
		}

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
		
		var optimized = false;
		if ((vertexState.index == _state.IndexEnum.Void) && (primitiveType != _state.PrimitiveType.Sprites) && (vertexState.realMorphingVertexCount == 1)) {
			optimized = true;	
		}
		
		if (optimized) optimizedCount.value++; else nonOptimizedCount.value++; 
		
		var mustDegenerate = (list.batchPrimCount > 0) && (drawType == PrimDrawType.BATCH_DRAW_DEGENERATE); 
		
		if (optimized) {
			optimizedDrawBuffer.primType = primitiveType;
			optimizedDrawBuffer.vertexState = vertexState;
			if (mustDegenerate) optimizedDrawBuffer.join(vertexState.size);
			optimizedDrawBuffer.addVertices(vertexInput, vertexCount, vertexState.size);
		} else {
			if (mustDegenerate) vertexBuffer.startDegenerateTriangleStrip();
			var verticesOffset = vertexBuffer.ensureAndTake(vertexCount);
			var vertexReader = _vertex.VertexReaderFactory.get(vertexState);
			vertexReader.readCount(vertexBuffer.vertices, verticesOffset, vertexInput, <number[]><any>indices, vertexCount, vertexState.hasIndex);
			if (mustDegenerate) vertexBuffer.endDegenerateTriangleStrip();
		}

		if (drawType == PrimDrawType.SINGLE_DRAW) {
			list.finishPrimBatch();
		} else {
			list.batchPrimCount++;
		}
	}

	PATCHDIVISION(p: number) {
		if (this.state.patch._divst == p) return;
		this.invalidatePrim();
		this.state.patch._divst = p;
		this.state.patch.divs = param8(p, 0);
		this.state.patch.divt = param8(p, 8);
	}

	BEZIER(p: number) {
		this.invalidatePrim();

		var ucount = param8(p, 0);
		var vcount = param8(p, 8);
		var divs = this.state.patch.divs;
		var divt = this.state.patch.divt;
		var vertexState = this.state.vertex;
		var vertexReader = _vertex.VertexReaderFactory.get(vertexState);
		var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
		var vertexInput = this.list.memory.getPointerU8Array(vertexAddress);

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
		var vertices2:_state.Vertex[] = [];
		vertices2.push(controlPoints[0][0]);
		vertices2.push(controlPoints[ucount - 1][0]);
		vertices2.push(controlPoints[0][vcount - 1]);

		vertices2.push(controlPoints[ucount - 1][0]);
		vertices2.push(controlPoints[ucount - 1][vcount - 1]);
		vertices2.push(controlPoints[0][vcount - 1]);

		this.list.drawDriver.drawElements(this.state, _state.PrimitiveType.Triangles, vertices2, vertices2.length, vertexState2);
	}

	light(index: number) {
		return this.state.lightning.lights[index];
	}

	LIGHTENABLE_(p: number, index: number) {
		if (this.light(index).enabled == bool1(p)) return;
		this.invalidatePrim();
		this.light(index).enabled = bool1(p);
	}

	LIGHTMODE(p: number) {
		if (this.state.lightning.lightModel != <_state.LightModelEnum>param8(p, 0)) return;
		this.invalidatePrim();
		this.state.lightning.lightModel = <_state.LightModelEnum>param8(p, 0);
	}

	LIGHTTYPE_(p: number, index: number) {
		var light = this.light(index);
		if (light._type == p) return;
		this.invalidatePrim();
		light._type = p;
		var kind = param8(p, 0);
		var type = param8(p, 0);
		light.kind = kind;
		light.type = type;
		switch (light.type) {
			case _state.LightTypeEnum.Directional: light.pw = 0; break;
			case _state.LightTypeEnum.PointLight: light.pw = 1; light.cutoff = 180; break;
			case _state.LightTypeEnum.SpotLight: light.pw = 1; break;
		}
	}

	LCA_(p: number, index: number) {
		var v = float1(p);
		if (this.light(index).constantAttenuation == v) return;
		this.invalidatePrim();
		this.light(index).constantAttenuation = v;
	}

	LLA_(p: number, index: number) {
		var v = float1(p);
		if (this.light(index).linearAttenuation == v) return;
		this.invalidatePrim();
		this.light(index).linearAttenuation = v;
	}

	LQA_(p: number, index: number) {
		var v = float1(p);
		if (this.light(index).quadraticAttenuation == v) return;
		this.invalidatePrim();
		this.light(index).quadraticAttenuation = v;
	}

	SPOTEXP_(p: number, index: number) {
		var v = float1(p);
		if (this.light(index).spotExponent == v) return;
		this.invalidatePrim();
		this.light(index).spotExponent = v;
	}
	SPOTCUT_(p: number, index: number) {
		var v = float1(p);
		if (this.light(index).spotCutoff == v) return;
		this.invalidatePrim();
		this.light(index).spotCutoff = v;
	}

	LXP_(p: number, index: number) { var v = float1(p); if (this.light(index).px == float1(p)) return; this.invalidatePrim(); this.light(index).px = float1(p); }
	LYP_(p: number, index: number) { var v = float1(p); if (this.light(index).py == float1(p)) return; this.invalidatePrim(); this.light(index).py = float1(p); }
	LZP_(p: number, index: number) { var v = float1(p); if (this.light(index).pz == float1(p)) return; this.invalidatePrim(); this.light(index).pz = float1(p); }

	LXD_(p: number, index: number) { var v = float1(p); if (this.light(index).dx == float1(p)) return; this.invalidatePrim(); this.light(index).dx = float1(p); }
	LYD_(p: number, index: number) { var v = float1(p); if (this.light(index).dy == float1(p)) return; this.invalidatePrim(); this.light(index).dy = float1(p); }
	LZD_(p: number, index: number) { var v = float1(p); if (this.light(index).dz == float1(p)) return; this.invalidatePrim(); this.light(index).dz = float1(p); }

	LIGHTENABLE0(p: number) { this.LIGHTENABLE_(p, 0); }
	LIGHTENABLE1(p: number) { this.LIGHTENABLE_(p, 1); }
	LIGHTENABLE2(p: number) { this.LIGHTENABLE_(p, 2); }
	LIGHTENABLE3(p: number) { this.LIGHTENABLE_(p, 3); }

	LIGHTTYPE0(p: number) { this.LIGHTTYPE_(p, 0); }
	LIGHTTYPE1(p: number) { this.LIGHTTYPE_(p, 1); }
	LIGHTTYPE2(p: number) { this.LIGHTTYPE_(p, 2); }
	LIGHTTYPE3(p: number) { this.LIGHTTYPE_(p, 3); }

	LCA0(p: number) { this.LCA_(p, 0); }
	LCA1(p: number) { this.LCA_(p, 1); }
	LCA2(p: number) { this.LCA_(p, 2); }
	LCA3(p: number) { this.LCA_(p, 3); }

	LLA0(p: number) { this.LLA_(p, 0); }
	LLA1(p: number) { this.LLA_(p, 1); }
	LLA2(p: number) { this.LLA_(p, 2); }
	LLA3(p: number) { this.LLA_(p, 3); }

	LQA0(p: number) { this.LQA_(p, 0); }
	LQA1(p: number) { this.LQA_(p, 1); }
	LQA2(p: number) { this.LQA_(p, 2); }
	LQA3(p: number) { this.LQA_(p, 3); }

	SPOTEXP0(p: number) { this.SPOTEXP_(p, 0); }
	SPOTEXP1(p: number) { this.SPOTEXP_(p, 1); }
	SPOTEXP2(p: number) { this.SPOTEXP_(p, 2); }
	SPOTEXP3(p: number) { this.SPOTEXP_(p, 3); }

	SPOTCUT0(p: number) { this.SPOTCUT_(p, 0); }
	SPOTCUT1(p: number) { this.SPOTCUT_(p, 1); }
	SPOTCUT2(p: number) { this.SPOTCUT_(p, 2); }
	SPOTCUT3(p: number) { this.SPOTCUT_(p, 3); }

	LXP0(p: number) { this.LXP_(p, 0); }
	LXP1(p: number) { this.LXP_(p, 1); }
	LXP2(p: number) { this.LXP_(p, 2); }
	LXP3(p: number) { this.LXP_(p, 3); }

	LYP0(p: number) { this.LYP_(p, 0); }
	LYP1(p: number) { this.LYP_(p, 1); }
	LYP2(p: number) { this.LYP_(p, 2); }
	LYP3(p: number) { this.LYP_(p, 3); }

	LZP0(p: number) { this.LZP_(p, 0); }
	LZP1(p: number) { this.LZP_(p, 1); }
	LZP2(p: number) { this.LZP_(p, 2); }
	LZP3(p: number) { this.LZP_(p, 3); }

	LXD0(p: number) { this.LXD_(p, 0); }
	LXD1(p: number) { this.LXD_(p, 1); }
	LXD2(p: number) { this.LXD_(p, 2); }
	LXD3(p: number) { this.LXD_(p, 3); }

	LYD0(p: number) { this.LYD_(p, 0); }
	LYD1(p: number) { this.LYD_(p, 1); }
	LYD2(p: number) { this.LYD_(p, 2); }
	LYD3(p: number) { this.LYD_(p, 3); }

	LZD0(p: number) { this.LZD_(p, 0); }
	LZD1(p: number) { this.LZD_(p, 1); }
	LZD2(p: number) { this.LZD_(p, 2); }
	LZD3(p: number) { this.LZD_(p, 3); }

	ALC_(p: number, index: number) {
		if (this.light(index)._ambientColor == p) return;
		this.invalidatePrim();
		this.light(index)._ambientColor = p;
		this.light(index).ambientColor.setRGB(p);
	}

	DLC_(p: number, index: number) {
		if (this.light(index)._diffuseColor == p) return;
		this.invalidatePrim();
		this.light(index)._diffuseColor = p;
		this.light(index).diffuseColor.setRGB(p);
	}

	SLC_(p: number, index: number) {
		if (this.light(index)._specularColor == p) return;
		this.invalidatePrim();
		this.light(index)._specularColor = p;
		this.light(index).specularColor.setRGB(p);
	}

	ALC0(p: number) { this.ALC_(p, 0); }
	ALC1(p: number) { this.ALC_(p, 1); }
	ALC2(p: number) { this.ALC_(p, 2); }
	ALC3(p: number) { this.ALC_(p, 3); }
														
	DLC0(p: number) { this.DLC_(p, 0); }
	DLC1(p: number) { this.DLC_(p, 1); }
	DLC2(p: number) { this.DLC_(p, 2); }
	DLC3(p: number) { this.DLC_(p, 3); }
	
	SLC0(p: number) { this.SLC_(p, 0); }
	SLC1(p: number) { this.SLC_(p, 1); }
	SLC2(p: number) { this.SLC_(p, 2); }
	SLC3(p: number) { this.SLC_(p, 3); }
}

class PspGpuList {
    current4: number;
    stall4: number;
	callbackId: number;
	argsPtr: Stream;
    completed: boolean = false;
	status = DisplayListStatus.Paused;
	private promise: Promise2<any>;
	private promiseResolve: Function;
	private promiseReject: Function;
	errorCount: number = 0;

	constructor(public id: number, public memory: Memory, public drawDriver: IDrawDriver, private executor: PspGpuExecutor, private runner: PspGpuListRunner, public gpu: PspGpu, public cpuExecutor: CpuExecutor, public state: _state.GpuState) {
    }

    complete() {
        this.completed = true;
		this.runner.deallocate(this);
		this.promiseResolve(0);
    }

    jumpRelativeOffset(offset:number) {
		this.current4 = (((this.state.baseAddress + offset) >> 2) & Memory.MASK);
	}

	jumpAbsolute(address: number) {
		this.current4 = ((address >>> 2) & Memory.MASK);
	}

	callstack = new Int32Array(1024);
	callstackIndex = 0;

	primBatchPrimitiveType:number = -1;

	finishPrimBatch() {
		if (optimizedDrawBuffer.dataOffset > 0) {
			this.batchPrimCount = 0;
			this.drawDriver.drawOptimized(this.state, optimizedDrawBuffer);
			optimizedDrawBuffer.reset();
			this.primBatchPrimitiveType = -1;
		}
		if (vertexBuffer.offsetLength > 0) {
			this.batchPrimCount = 0;
			this.drawDriver.drawElements(this.state, this.primBatchPrimitiveType, vertexBuffer.vertices, vertexBuffer.offsetLength, this.state.vertex);
			vertexBuffer.reset();
			this.primBatchPrimitiveType = -1;
		}
	}

	batchPrimCount = 0;
	primCount = 0;
	//private showOpcodes = true;
	private showOpcodes = false;
	private opcodes:string[] = [];
	finish() {
		if (this.showOpcodes) {
			document.getElementById('output').innerText = 'finish:' + this.primCount + ';' + this.opcodes.join(",");
			if (this.opcodes.length) this.opcodes = [];
		}
		this.primCount = 0;
	}

	private get isStalled() {
		return ((this.stall4 != 0) && (this.current4 >= this.stall4));
	}


    private get hasMoreInstructions() {
		return !this.completed && !this.isStalled;
		//return !this.completed && ((this.stall == 0) || (this.current < this.stall));
	}

	private runUntilStallInner() {
		var mem = this.memory;
		//var showOpcodes = this.showOpcodes;
		var table = this.executor.table;
		var stall4 = this.stall4;
		
		var totalCommandsLocal = 0;

		//while (this.hasMoreInstructions) {
		while (!this.completed && ((stall4 == 0) || (this.current4 < stall4))) {
			totalCommandsLocal++;
			var instructionPC4 = this.current4++;
			var instruction = mem.readUInt32_2(instructionPC4);
			//console.log(instruction);

			var op = (instruction >> 24) & 0xFF;
			var params24 = ((instruction >> 0) & 0x00FFFFFF);

			//if (showOpcodes) this.opcodes.push(GpuOpCodes[op]);
			if (table[op](params24, instructionPC4, op)) {
				totalCommands.value += totalCommandsLocal;
				totalStalls.value++; 
				return;
			}
		}
		totalStalls.value++;
		totalCommands.value += totalCommandsLocal; 
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
        Microtask.queue(() => {
            this.runUntilStall();
        });
    }

    updateStall(stall: number) {
        this.stall4 =(( stall >>> 2) & Memory.MASK);
        this.enqueueRunUntilStall();
    }

	start() {
		this.status = DisplayListStatus.Queued;

		this.promise = new Promise2((resolve, reject) => {
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
        if (!this.freeLists.length) throw new Error('Out of gpu free lists');
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
		return Promise2.all(this.runningLists.map(list => list.waitAsync())).then(() => _state.DisplayListStatus.Completed);
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
		try {
			this.driver = new WebGlPspDrawDriver(memory, display, canvas);
		} catch (e) {
			this.driver = new DummyDrawDriver();
		}
		this.driver.rehashSignal.add(size => {
			hashMemoryCount.value++;
			hashMemorySize.value += size;
		});
		//this.driver = new Context2dPspDrawDriver(memory, canvas);
		this.listRunner = new PspGpuListRunner(memory, this.driver, this, this.cpuExecutor);
    }

	startAsync() {
		return this.driver.initAsync();
    }

	stopAsync() {
		return Promise2.resolve();
    }
        
	listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream) {
        var list = this.listRunner.allocate();
        list.current4 = ((start >>> 2) & Memory.MASK);
        list.stall4 = stall;
		list.callbackId = callbackId;
		list.argsPtr = argsPtr;
        list.start();
        return list.id;
    }

    listSync(displayListId: number, syncType: _state.SyncType) {
        //console.log('listSync');
		//overlay.update();
        return this.listRunner.getById(displayListId).waitAsync();
    }

    updateStallAddr(displayListId: number, stall: number) {
        this.listRunner.getById(displayListId).updateStall(stall);
        return 0;
    }

	private lastTime = 0;
	drawSync(syncType: _state.SyncType): any {
		//console.log('drawSync');
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		return this.listRunner.waitAsync().then(() => {
			var end = performance.now();
			timePerFrame.value = MathUtils.interpolate(timePerFrame.value, end - this.lastTime, 0.5);
			MathUtils.prevAligned
			this.lastTime = end;
			overlay.updateAndReset();
		});

		switch (syncType) {
			case _state.SyncType.Peek: return this.listRunner.peek();
			case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
			default: throw (new Error("Not implemented SyncType." + syncType));
		}
    }
}

overlay.update();
