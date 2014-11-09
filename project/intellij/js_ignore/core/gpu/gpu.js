///<reference path="../../global.d.ts" />
var _memory = require('../memory');
var _pixelformat = require('../pixelformat');
var _instructions = require('./instructions');
var _state = require('./state');
var _vertex = require('./vertex');
var _cpu = require('../cpu');
_cpu.CpuState;
var DisplayListStatus = _state.DisplayListStatus;
var Memory = _memory.Memory;
var GpuOpCodes = _instructions.GpuOpCodes;
var WebGlPspDrawDriver = require('./webgl/driver');
var DummyDrawDriver = require('./webgl/driver_dummy');
var vertexBuffer = new _vertex.VertexBuffer();
var singleCallTest = false;
function bool1(p) {
    return p != 0;
}
function param1(p, offset) {
    return (p >> offset) & 0x1;
}
function param2(p, offset) {
    return (p >> offset) & 0x3;
}
function param3(p, offset) {
    return (p >> offset) & 0x7;
}
function param4(p, offset) {
    return (p >> offset) & 0xF;
}
function param5(p, offset) {
    return (p >> offset) & 0x1F;
}
function param8(p, offset) {
    return (p >> offset) & 0xFF;
}
function param10(p, offset) {
    return (p >> offset) & 0x3FF;
}
function param16(p, offset) {
    return (p >> offset) & 0xFFFF;
}
function float1(p) {
    return MathFloat.reinterpretIntAsFloat(p << 8);
}
var PspGpuExecutor = (function () {
    function PspGpuExecutor() {
        this.table = new Array(0x100);
        for (var n = 0; n < 0x100; n++) {
            this.table[n] = null;
            var func = this[GpuOpCodes[n]];
            this.table[n] = func ? func.bind(this) : this.UNKNOWN.bind(this);
        }
    }
    PspGpuExecutor.prototype.setList = function (list) {
        this.list = list;
        this.state = list.state;
    };
    PspGpuExecutor.prototype.NOP = function (p) {
    };
    PspGpuExecutor.prototype.DUMMY = function (p) {
    };
    PspGpuExecutor.prototype.IADDR = function (p) {
        this.state.indexAddress = p;
    };
    PspGpuExecutor.prototype.OFFSETADDR = function (p) {
        this.state.baseOffset = (p << 8);
    };
    PspGpuExecutor.prototype.FRAMEBUFPTR = function (p) {
        this.state.frameBuffer.lowAddress = p;
    };
    PspGpuExecutor.prototype.BASE = function (p) {
        this.state.baseAddress = ((p << 8) & 0xff000000);
    };
    PspGpuExecutor.prototype.JUMP = function (p) {
        this.list.jumpRelativeOffset(p & ~3);
    };
    PspGpuExecutor.prototype.CALL = function (p, current) {
        this.list.callstack[this.list.callstackIndex++] = ((current << 2) + 4);
        this.list.callstack[this.list.callstackIndex++] = (((this.state.baseOffset >>> 2) & Memory.MASK));
        this.list.jumpRelativeOffset(p & ~3);
    };
    PspGpuExecutor.prototype.RET = function (p) {
        if (this.list.callstackIndex > 0 && this.list.callstackIndex < 1024) {
            this.list.state.baseOffset = this.list.callstack[--this.list.callstackIndex];
            this.list.jumpAbsolute(this.list.callstack[--this.list.callstackIndex]);
        }
        else {
            console.info('gpu callstack empty or overflow');
        }
    };
    PspGpuExecutor.prototype.VERTEXTYPE = function (p) {
        if (this.list.state.vertex.getValue() == p)
            return;
        this.list.finishPrimBatch();
        this.list.state.vertex.setValue(p);
    };
    PspGpuExecutor.prototype.VADDR = function (p) {
        this.list.state.vertex.address = p;
    };
    PspGpuExecutor.prototype.FINISH = function (p) {
        this.list.finish();
        var callback = this.list.gpu.callbacks.get(this.list.callbackId);
        if (callback && callback.cpuState && callback.finishFunction) {
            this.list.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [p, callback.finishArgument]);
        }
    };
    PspGpuExecutor.prototype.SIGNAL = function (p) {
        console.warn('Not implemented: GPU SIGNAL');
    };
    PspGpuExecutor.prototype.END = function (p) {
        this.invalidatePrim();
        this.list.gpu.driver.end();
        this.list.complete();
        return true;
    };
    PspGpuExecutor.prototype.PROJMATRIXNUMBER = function (p) {
        this.state.projectionMatrix.reset(p);
    };
    PspGpuExecutor.prototype.PROJMATRIXDATA = function (p) {
        var v = float1(p);
        if (this.state.projectionMatrix.check(v))
            return;
        this.invalidatePrim();
        this.state.projectionMatrix.put(v);
    };
    PspGpuExecutor.prototype.VIEWMATRIXNUMBER = function (p) {
        this.state.viewMatrix.reset(p);
    };
    PspGpuExecutor.prototype.VIEWMATRIXDATA = function (p) {
        var v = float1(p);
        if (this.state.viewMatrix.check(v))
            return;
        this.invalidatePrim();
        this.state.viewMatrix.put(v);
    };
    PspGpuExecutor.prototype.WORLDMATRIXNUMBER = function (p) {
        this.state.worldMatrix.reset(p);
    };
    PspGpuExecutor.prototype.WORLDMATRIXDATA = function (p) {
        var v = float1(p);
        if (this.state.worldMatrix.check(v))
            return;
        this.invalidatePrim();
        this.state.worldMatrix.put(v);
    };
    PspGpuExecutor.prototype.BONEMATRIXNUMBER = function (p) {
        this.state.skinning.setCurrentBoneIndex(p);
    };
    PspGpuExecutor.prototype.BONEMATRIXDATA = function (p) {
        var v = float1(p);
        if (this.state.skinning.check(v))
            return;
        this.invalidatePrim();
        this.state.skinning.write(v);
    };
    PspGpuExecutor.prototype.TGENMATRIXNUMBER = function (p) {
        this.state.texture.matrix.reset(p);
    };
    PspGpuExecutor.prototype.TGENMATRIXDATA = function (p) {
        var v = float1(p);
        if (this.state.texture.matrix.check(v))
            return;
        this.invalidatePrim();
        this.state.texture.matrix.put(v);
    };
    PspGpuExecutor.prototype.TEXOFFSETU = function (p) {
        var v = float1(p);
        if (this.state.texture.offsetU == v)
            return;
        this.invalidatePrim();
        this.state.texture.offsetU = v;
    };
    PspGpuExecutor.prototype.TEXOFFSETV = function (p) {
        var v = float1(p);
        if (this.state.texture.offsetV == v)
            return;
        this.invalidatePrim();
        this.state.texture.offsetV = float1(p);
    };
    PspGpuExecutor.prototype.TEXSCALEU = function (p) {
        var v = float1(p);
        if (this.state.texture.scaleU == v)
            return;
        this.invalidatePrim();
        this.state.texture.scaleU = float1(p);
    };
    PspGpuExecutor.prototype.TEXSCALEV = function (p) {
        var v = float1(p);
        if (this.state.texture.scaleV == v)
            return;
        this.invalidatePrim();
        this.state.texture.scaleV = float1(p);
    };
    PspGpuExecutor.prototype.TBIAS = function (p) {
        if (this.state.texture._tbias == p)
            return;
        this.invalidatePrim();
        this.state.texture._tbias = p;
        this.state.texture.levelMode = param8(p, 0);
        this.state.texture.mipmapBias = param8(p, 16) / 16;
    };
    PspGpuExecutor.prototype.TSLOPE = function (p) {
        var v = float1(p);
        if (this.state.texture.slopeLevel == v)
            return;
        this.invalidatePrim();
        this.state.texture.slopeLevel = v;
    };
    PspGpuExecutor.prototype.FCOL = function (p) {
        if (this.state.fog._color == p)
            return;
        this.invalidatePrim();
        this.state.fog._color = p;
        this.state.fog.color.setRGB(p);
    };
    PspGpuExecutor.prototype.FFAR = function (p) {
        var v = float1(p);
        if (this.state.fog.far == v)
            return;
        this.invalidatePrim();
        this.state.fog.far = v;
    };
    PspGpuExecutor.prototype.FDIST = function (p) {
        var v = float1(p);
        if (this.state.fog.dist == v)
            return;
        this.invalidatePrim();
        this.state.fog.dist = v;
    };
    PspGpuExecutor.prototype.invalidatePrim = function () {
        this.list.finishPrimBatch();
    };
    PspGpuExecutor.prototype.FOGENABLE = function (p) {
        if (this.state.fog.enabled != bool1(p)) {
            this.invalidatePrim();
            this.state.fog.enabled = bool1(p);
        }
    };
    PspGpuExecutor.prototype.VIEWPORTX1 = function (p) {
        if (this.state.viewport.width != float1(p)) {
            this.invalidatePrim();
            this.state.viewport.width = float1(p);
        }
    };
    PspGpuExecutor.prototype.VIEWPORTY1 = function (p) {
        if (this.state.viewport.height != float1(p)) {
            this.invalidatePrim();
            this.state.viewport.height = float1(p);
        }
    };
    PspGpuExecutor.prototype.VIEWPORTZ1 = function (p) {
        if (this.state.viewport.depth != float1(p)) {
            this.invalidatePrim();
            this.state.viewport.depth = float1(p);
        }
    };
    PspGpuExecutor.prototype.VIEWPORTX2 = function (p) {
        if (this.state.viewport.x == float1(p))
            return;
        this.invalidatePrim();
        this.state.viewport.x = float1(p);
    };
    PspGpuExecutor.prototype.VIEWPORTY2 = function (p) {
        if (this.state.viewport.y == float1(p))
            return;
        this.invalidatePrim();
        this.state.viewport.y = float1(p);
    };
    PspGpuExecutor.prototype.VIEWPORTZ2 = function (p) {
        if (this.state.viewport.z == float1(p))
            return;
        this.invalidatePrim();
        this.state.viewport.z = float1(p);
    };
    PspGpuExecutor.prototype.OFFSETX = function (p) {
        if (this.state.offset.x == param4(p, 0))
            return;
        this.invalidatePrim();
        this.state.offset.x = param4(p, 0);
    };
    PspGpuExecutor.prototype.OFFSETY = function (p) {
        if (this.state.offset.y == param4(p, 0))
            return;
        this.invalidatePrim();
        this.state.offset.y = param4(p, 0);
    };
    PspGpuExecutor.prototype.REGION1 = function (p) {
        if (this.state.region._xy1 == p)
            return;
        this.invalidatePrim();
        this.state.region._xy1 = p;
        this.state.region.x1 = param10(p, 0);
        this.state.region.y1 = param10(p, 10);
    };
    PspGpuExecutor.prototype.REGION2 = function (p) {
        if (this.state.region._xy2 == p)
            return;
        this.invalidatePrim();
        this.state.region._xy2 = p;
        this.state.region.x2 = param10(p, 0);
        this.state.region.y2 = param10(p, 10);
    };
    PspGpuExecutor.prototype.CLIPENABLE = function (p) {
        if (this.state.clipPlane.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.clipPlane.enabled = bool1(p);
        this.state.clipPlane.updated = false;
    };
    PspGpuExecutor.prototype.SCISSOR1 = function (p) {
        if (this.state.clipPlane._scissorLeftTop == p)
            return;
        this.invalidatePrim();
        this.state.clipPlane._scissorLeftTop = p;
        this.state.clipPlane.scissor.left = param10(p, 0);
        this.state.clipPlane.scissor.top = param10(p, 10);
        this.state.clipPlane.updated = false;
    };
    PspGpuExecutor.prototype.SCISSOR2 = function (p) {
        if (this.state.clipPlane._scissorRightBottom == p)
            return;
        this.invalidatePrim();
        this.state.clipPlane._scissorRightBottom = p;
        this.state.clipPlane.scissor.right = param10(p, 0);
        this.state.clipPlane.scissor.bottom = param10(p, 10);
        this.state.clipPlane.updated = false;
    };
    PspGpuExecutor.prototype.TMODE = function (p) {
        if (this.state.texture.tmode == p)
            return;
        this.invalidatePrim();
        this.state.texture.tmode = p;
        this.state.texture.swizzled = param8(p, 0) != 0;
        this.state.texture.mipmapShareClut = param8(p, 8) != 0;
        this.state.texture.mipmapMaxLevel = param8(p, 16);
    };
    PspGpuExecutor.prototype.TFLT = function (p) {
        if (this.state.texture.tflt == p)
            return;
        this.invalidatePrim();
        this.state.texture.tflt = p;
        this.state.texture.filterMinification = param8(p, 0);
        this.state.texture.filterMagnification = param8(p, 8);
    };
    PspGpuExecutor.prototype.TWRAP = function (p) {
        if (this.state.texture.twrap == p)
            return;
        this.invalidatePrim();
        this.state.texture.twrap = p;
        this.state.texture.wrapU = param8(p, 0);
        this.state.texture.wrapV = param8(p, 8);
    };
    PspGpuExecutor.prototype.TEXTUREMAPENABLE = function (p) {
        var v = bool1(p);
        if (this.state.texture.enabled == v)
            return;
        this.invalidatePrim();
        this.state.texture.enabled = v;
    };
    PspGpuExecutor.prototype.TMAP = function (p) {
        if (this.state.texture.tmap == p)
            return;
        this.invalidatePrim();
        this.state.texture.tmap = p;
        this.state.texture.textureMapMode = param8(p, 0);
        this.state.texture.textureProjectionMapMode = param8(p, 8);
        this.state.vertex.textureComponentCount = this.state.texture.getTextureComponentsCount();
    };
    PspGpuExecutor.prototype.TSIZE_ = function (p, index) {
        var mipMap = this.state.texture.mipmaps[index];
        if (mipMap.tsizeValue == p)
            return;
        this.invalidatePrim();
        var widthExp = param4(p, 0);
        var heightExp = param4(p, 8);
        var unknownFlag = param1(p, 15);
        widthExp = Math.min(widthExp, 9);
        heightExp = Math.min(heightExp, 9);
        mipMap.tsizeValue = p;
        mipMap.textureWidth = 1 << widthExp;
        mipMap.textureHeight = 1 << heightExp;
    };
    PspGpuExecutor.prototype.TEXADDR_ = function (p, index) {
        var mipMap = this.state.texture.mipmaps[index];
        var address = (mipMap.address & 0xFF000000) | (p & 0x00FFFFFF);
        if (mipMap.address == address)
            return;
        this.invalidatePrim();
        mipMap.address = address;
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH_ = function (p, index) {
        var mipMap = this.state.texture.mipmaps[index];
        var bufferWidth = param16(p, 0);
        var address = (mipMap.address & 0x00FFFFFF) | ((param8(p, 16) << 24) & 0xFF000000);
        if ((mipMap.bufferWidth == bufferWidth) && (mipMap.address == address))
            return;
        this.invalidatePrim();
        mipMap.bufferWidth = bufferWidth;
        mipMap.address = address;
    };
    PspGpuExecutor.prototype.SOP = function (p) {
        if (this.state.stencil.sop == p)
            return;
        this.invalidatePrim();
        this.state.stencil.sop = p;
        this.state.stencil.fail = param8(p, 0);
        this.state.stencil.zfail = param8(p, 8);
        this.state.stencil.zpass = param8(p, 16);
    };
    PspGpuExecutor.prototype.STST = function (p) {
        if (this.state.stencil.stst == p)
            return;
        this.invalidatePrim();
        this.state.stencil.stst = p;
        this.state.stencil.func = param8(p, 0);
        this.state.stencil.funcRef = param8(p, 8);
        this.state.stencil.funcMask = param8(p, 16);
    };
    PspGpuExecutor.prototype.ZTST = function (p) {
        var v = param8(p, 0);
        if (this.state.depthTest.func == v)
            return;
        this.invalidatePrim();
        this.state.depthTest.func = v;
        this.state.depthTest.updated = false;
    };
    PspGpuExecutor.prototype.ZTESTENABLE = function (p) {
        var v = bool1(p);
        if (this.state.depthTest.enabled == v)
            return;
        this.invalidatePrim();
        this.state.depthTest.enabled = v;
        this.state.depthTest.updated = false;
    };
    PspGpuExecutor.prototype.ZMSK = function (p) {
        var v = param16(p, 0);
        if (this.state.depthTest.mask == v)
            return;
        this.invalidatePrim();
        this.state.depthTest.mask = v;
        this.state.depthTest.updated = false;
    };
    PspGpuExecutor.prototype.MINZ = function (p) {
        var v = (p & 0xFFFF) / 65536;
        if (this.state.depthTest.rangeFar == v)
            return;
        this.invalidatePrim();
        this.state.depthTest.rangeFar = v;
        this.state.depthTest.updated = false;
    };
    PspGpuExecutor.prototype.MAXZ = function (p) {
        var v = (p & 0xFFFF) / 65536;
        if (this.state.depthTest.rangeNear == v)
            return;
        this.invalidatePrim();
        this.state.depthTest.rangeNear = v;
        this.state.depthTest.updated = false;
    };
    PspGpuExecutor.prototype.FRAMEBUFWIDTH = function (p) {
        if (this.state.frameBuffer._widthHighAddress == p)
            return;
        this.invalidatePrim();
        this.state.frameBuffer._widthHighAddress = p;
        this.state.frameBuffer.width = param16(p, 0);
        this.state.frameBuffer.highAddress = param8(p, 16);
    };
    PspGpuExecutor.prototype.SHADEMODE = function (p) {
        if (this.state.shadeModel == param16(p, 0))
            return;
        this.invalidatePrim();
        this.state.shadeModel = param16(p, 0);
    };
    PspGpuExecutor.prototype.LIGHTINGENABLE = function (p) {
        if (this.state.lightning.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.lightning.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.ALPHATESTENABLE = function (p) {
        if (this.state.alphaTest.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.alphaTest.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.ATST = function (p) {
        if (this.state.alphaTest._atst == p)
            return;
        this.invalidatePrim();
        this.state.alphaTest._atst = p;
        this.state.alphaTest.func = param8(p, 0);
        this.state.alphaTest.value = param8(p, 8);
        this.state.alphaTest.mask = param8(p, 16);
    };
    PspGpuExecutor.prototype.ALPHABLENDENABLE = function (p) {
        if (this.state.blending.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.blending.enabled = bool1(p);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.ALPHA = function (p) {
        if (this.state.blending._alpha == p)
            return;
        this.invalidatePrim();
        this.state.blending._alpha = p;
        this.state.blending.functionSource = param4(p, 0);
        this.state.blending.functionDestination = param4(p, 4);
        this.state.blending.equation = param4(p, 8);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.REVERSENORMAL = function (p) {
        if (this.state.vertex.reversedNormal == bool1(p))
            return;
        this.invalidatePrim();
        this.state.vertex.reversedNormal = bool1(p);
    };
    PspGpuExecutor.prototype.PATCHCULLENABLE = function (p) {
        if (this.state.patchCullingState.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.patchCullingState.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.PATCHFACING = function (p) {
        if (this.state.patchCullingState.faceFlag == bool1(p))
            return;
        this.invalidatePrim();
        this.state.patchCullingState.faceFlag = bool1(p);
    };
    PspGpuExecutor.prototype.ANTIALIASENABLE = function (p) {
        if (this.state.lineSmoothState.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.lineSmoothState.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.TEXTURE_ENV_MAP_MATRIX = function (p) {
        if (this.state.texture._shadeUV == p)
            return;
        this.invalidatePrim();
        this.state.texture._shadeUV = p;
        this.state.texture.shadeU = param2(p, 0);
        this.state.texture.shadeV = param2(p, 8);
    };
    PspGpuExecutor.prototype.TEC = function (p) {
        if (this.state.texture._envColor == p)
            return;
        this.invalidatePrim();
        this.state.texture._envColor = p;
        this.state.texture.envColor.r = BitUtils.extractScalei(p, 0, 8, 1);
        this.state.texture.envColor.g = BitUtils.extractScalei(p, 8, 8, 1);
        this.state.texture.envColor.b = BitUtils.extractScalei(p, 16, 8, 1);
    };
    PspGpuExecutor.prototype.TFUNC = function (p) {
        if (this.state.texture._tfunc == p)
            return;
        this.invalidatePrim();
        this.state.texture._tfunc = p;
        this.state.texture.effect = param8(p, 0);
        this.state.texture.colorComponent = param8(p, 8);
        this.state.texture.fragment2X = (param8(p, 16) != 0);
    };
    PspGpuExecutor.prototype.TFLUSH = function (p) {
        this.invalidatePrim();
        this.list.drawDriver.textureFlush(this.state);
    };
    PspGpuExecutor.prototype.TSYNC = function (p) {
        //this.invalidatePrim();
        this.list.drawDriver.textureSync(this.state);
    };
    PspGpuExecutor.prototype.TPSM = function (p) {
        if (this.state.texture.pixelFormat == param4(p, 0))
            return;
        this.invalidatePrim();
        this.state.texture.pixelFormat = param4(p, 0);
    };
    PspGpuExecutor.prototype.PSM = function (p) {
        if (this.state.drawPixelFormat == param4(p, 0))
            return;
        this.invalidatePrim();
        this.state.drawPixelFormat = param4(p, 0);
    };
    PspGpuExecutor.prototype.PMSKC = function (p) {
        if (this.state.blending._colorMask == p)
            return;
        this.invalidatePrim();
        this.state.blending._colorMask = p;
        this.state.blending.colorMask.r = param8(p, 0);
        this.state.blending.colorMask.g = param8(p, 8);
        this.state.blending.colorMask.b = param8(p, 16);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.PMSKA = function (p) {
        if (this.state.blending._colorMaskA == p)
            return;
        this.invalidatePrim();
        this.state.blending._colorMaskA = p;
        this.state.blending.colorMask.a = param8(p, 0);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.MATERIALSPECULARCOEF = function (p) {
        var v = float1(p);
        if (this.state.lightning.specularPower == v)
            return;
        this.invalidatePrim();
        this.state.lightning.specularPower = v;
    };
    PspGpuExecutor.prototype.MATERIALAMBIENT = function (p) {
        if (this.state._ambientModelColor == p)
            return;
        this.invalidatePrim();
        this.state._ambientModelColor = p;
        this.state.ambientModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
        this.state.ambientModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
        this.state.ambientModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
        this.state.ambientModelColor.a = 1;
    };
    PspGpuExecutor.prototype.MATERIALALPHA = function (p) {
        if (this.state._ambientModelColorAlpha == p)
            return;
        this.invalidatePrim();
        this.state._ambientModelColorAlpha = p;
        this.state.ambientModelColor.a = BitUtils.extractScalef(p, 0, 8, 1);
    };
    PspGpuExecutor.prototype.AMBIENTCOLOR = function (p) {
        if (this.state.lightning._ambientLightColor == p)
            return;
        this.invalidatePrim();
        this.state.lightning._ambientLightColor = p;
        this.state.lightning.ambientLightColor.r = BitUtils.extractScalef(p, 0, 8, 1);
        this.state.lightning.ambientLightColor.g = BitUtils.extractScalef(p, 8, 8, 1);
        this.state.lightning.ambientLightColor.b = BitUtils.extractScalef(p, 16, 8, 1);
        this.state.lightning.ambientLightColor.a = 1;
    };
    PspGpuExecutor.prototype.AMBIENTALPHA = function (p) {
        if (this.state.lightning._ambientLightColorAlpha == p)
            return;
        this.invalidatePrim();
        this.state.lightning._ambientLightColorAlpha = p;
        this.state.lightning.ambientLightColor.a = BitUtils.extractScalef(p, 0, 8, 1);
    };
    PspGpuExecutor.prototype.LOGICOPENABLE = function (p) {
        if (this.state.logicOp.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.logicOp.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.MATERIALDIFFUSE = function (p) {
        if (this.state._diffuseModelColor == p)
            return;
        this.invalidatePrim();
        this.state._diffuseModelColor = p;
        this.state.diffuseModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
        this.state.diffuseModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
        this.state.diffuseModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
        this.state.diffuseModelColor.a = 1;
    };
    PspGpuExecutor.prototype.MATERIALSPECULAR = function (p) {
        if (this.state._specularModelColor == p)
            return;
        this.invalidatePrim();
        this.state._specularModelColor = p;
        this.state.specularModelColor.r = BitUtils.extractScalef(p, 0, 8, 1);
        this.state.specularModelColor.g = BitUtils.extractScalef(p, 8, 8, 1);
        this.state.specularModelColor.b = BitUtils.extractScalef(p, 16, 8, 1);
        this.state.specularModelColor.a = 1;
    };
    PspGpuExecutor.prototype.CLUTADDR = function (p) {
        var v = (this.state.texture.clut.adress & 0xFF000000) | ((p << 0) & 0x00FFFFFF);
        if (this.state.texture.clut.adress == v)
            return;
        this.invalidatePrim();
        this.state.texture.clut.adress = v;
    };
    PspGpuExecutor.prototype.CLUTADDRUPPER = function (p) {
        var v = (this.state.texture.clut.adress & 0x00FFFFFF) | ((p << 8) & 0xFF000000);
        if (this.state.texture.clut.adress == v)
            return;
        this.invalidatePrim();
        this.state.texture.clut.adress = v;
    };
    PspGpuExecutor.prototype.CLOAD = function (p) {
        var v = param8(p, 0) * 8;
        if (this.state.texture.clut.numberOfColors == v)
            return;
        this.invalidatePrim();
        this.state.texture.clut.numberOfColors = v;
    };
    PspGpuExecutor.prototype.CMODE = function (p) {
        if (this.state.texture.clut.info == p)
            return;
        this.invalidatePrim();
        this.state.texture.clut.info = p;
        this.state.texture.clut.pixelFormat = param2(p, 0);
        this.state.texture.clut.shift = param5(p, 2);
        this.state.texture.clut.mask = param8(p, 8);
        this.state.texture.clut.start = param5(p, 16);
    };
    PspGpuExecutor.prototype.STENCILTESTENABLE = function (p) {
        if (this.state.stencil.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.stencil.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.TSIZE0 = function (p) {
        this.TSIZE_(p, 0);
    };
    PspGpuExecutor.prototype.TSIZE1 = function (p) {
        this.TSIZE_(p, 1);
    };
    PspGpuExecutor.prototype.TSIZE2 = function (p) {
        this.TSIZE_(p, 2);
    };
    PspGpuExecutor.prototype.TSIZE3 = function (p) {
        this.TSIZE_(p, 3);
    };
    PspGpuExecutor.prototype.TSIZE4 = function (p) {
        this.TSIZE_(p, 4);
    };
    PspGpuExecutor.prototype.TSIZE5 = function (p) {
        this.TSIZE_(p, 5);
    };
    PspGpuExecutor.prototype.TSIZE6 = function (p) {
        this.TSIZE_(p, 6);
    };
    PspGpuExecutor.prototype.TSIZE7 = function (p) {
        this.TSIZE_(p, 7);
    };
    PspGpuExecutor.prototype.TEXADDR0 = function (p) {
        this.TEXADDR_(p, 0);
    };
    PspGpuExecutor.prototype.TEXADDR1 = function (p) {
        this.TEXADDR_(p, 1);
    };
    PspGpuExecutor.prototype.TEXADDR2 = function (p) {
        this.TEXADDR_(p, 2);
    };
    PspGpuExecutor.prototype.TEXADDR3 = function (p) {
        this.TEXADDR_(p, 3);
    };
    PspGpuExecutor.prototype.TEXADDR4 = function (p) {
        this.TEXADDR_(p, 4);
    };
    PspGpuExecutor.prototype.TEXADDR5 = function (p) {
        this.TEXADDR_(p, 5);
    };
    PspGpuExecutor.prototype.TEXADDR6 = function (p) {
        this.TEXADDR_(p, 6);
    };
    PspGpuExecutor.prototype.TEXADDR7 = function (p) {
        this.TEXADDR_(p, 7);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH0 = function (p) {
        return this.TEXBUFWIDTH_(p, 0);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH1 = function (p) {
        return this.TEXBUFWIDTH_(p, 1);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH2 = function (p) {
        return this.TEXBUFWIDTH_(p, 2);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH3 = function (p) {
        return this.TEXBUFWIDTH_(p, 3);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH4 = function (p) {
        return this.TEXBUFWIDTH_(p, 4);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH5 = function (p) {
        return this.TEXBUFWIDTH_(p, 5);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH6 = function (p) {
        return this.TEXBUFWIDTH_(p, 6);
    };
    PspGpuExecutor.prototype.TEXBUFWIDTH7 = function (p) {
        return this.TEXBUFWIDTH_(p, 7);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT_ = function (p, index) {
        var morphWeight = float1(p);
        if (this.state.morphWeights[index] == morphWeight)
            return;
        this.invalidatePrim();
        this.state.morphWeights[index] = morphWeight;
    };
    PspGpuExecutor.prototype.MORPHWEIGHT0 = function (p) {
        return this.MORPHWEIGHT_(p, 0);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT1 = function (p) {
        return this.MORPHWEIGHT_(p, 1);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT2 = function (p) {
        return this.MORPHWEIGHT_(p, 2);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT3 = function (p) {
        return this.MORPHWEIGHT_(p, 3);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT4 = function (p) {
        return this.MORPHWEIGHT_(p, 4);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT5 = function (p) {
        return this.MORPHWEIGHT_(p, 5);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT6 = function (p) {
        return this.MORPHWEIGHT_(p, 6);
    };
    PspGpuExecutor.prototype.MORPHWEIGHT7 = function (p) {
        return this.MORPHWEIGHT_(p, 7);
    };
    PspGpuExecutor.prototype.CLEAR = function (p) {
        if (this.state._clearingWord == p)
            return;
        this.invalidatePrim();
        this.state._clearingWord = p;
        this.state.clearing = (param1(p, 0) != 0);
        this.state.clearFlags = param8(p, 8);
    };
    PspGpuExecutor.prototype.COLORTESTENABLE = function (p) {
        if (this.state.colorTest.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.colorTest.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.DITHERENABLE = function (p) {
        if (this.state.dithering.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.dithering.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.CULLFACEENABLE = function (p) {
        if (this.state.culling.enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.state.culling.enabled = bool1(p);
    };
    PspGpuExecutor.prototype.CULL = function (p) {
        if (this.state.culling.direction == p)
            return;
        this.invalidatePrim();
        this.state.culling.direction = p;
    };
    PspGpuExecutor.prototype.SFIX = function (p) {
        if (this.state.blending._fixColorSourceWord == p)
            return;
        this.invalidatePrim();
        this.state.blending._fixColorSourceWord = p;
        this.state.blending.fixColorSource.setRGB(p);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.DFIX = function (p) {
        if (this.state.blending._fixColorDestinationWord == p)
            return;
        this.invalidatePrim();
        this.state.blending._fixColorDestinationWord = p;
        this.state.blending.fixColorDestination.setRGB(p);
        this.state.blending.updated = false;
    };
    PspGpuExecutor.prototype.UNKNOWN = function (p, current, op) {
        this.invalidatePrim();
        this.list.errorCount++;
        if (this.list.errorCount >= 400) {
            if (this.list.errorCount == 400) {
                console.error(sprintf('Stop showing gpu errors'));
            }
        }
        else {
            console.error(sprintf('Not implemented gpu opcode 0x%02X : %s', op, GpuOpCodes[op]));
        }
    };
    PspGpuExecutor.prototype.PRIM = function (p) {
        var primitiveType = param3(p, 16);
        var vertexCount = param16(p, 0);
        var list = this.list;
        if (list.primBatchPrimitiveType != primitiveType)
            list.finishPrimBatch();
        if (vertexCount <= 0)
            return false;
        list.primBatchPrimitiveType = primitiveType;
        list.primCount++;
        var vertexState = this.state.vertex;
        var vertexSize = vertexState.size;
        var vertexAddress = this.state.getAddressRelativeToBaseOffset(vertexState.address);
        var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);
        var vertexReader = _vertex.VertexReaderFactory.get(vertexState);
        var indices = null;
        switch (vertexState.index) {
            case 1 /* Byte */:
                indices = list.memory.getU8Array(indicesAddress);
                break;
            case 2 /* Short */:
                indices = list.memory.getU16Array(indicesAddress);
                break;
        }
        //if (vertexState.realWeightCount > 0) debugger;
        var vertexInput = list.memory.getPointerDataView(vertexAddress);
        if (vertexState.address) {
            if (!vertexState.hasIndex) {
                vertexState.address += vertexState.size * vertexCount;
            }
        }
        var drawType = 0 /* SINGLE_DRAW */;
        switch (primitiveType) {
            case 1 /* Lines */:
            case 0 /* Points */:
            case 3 /* Triangles */:
            case 6 /* Sprites */:
                drawType = 1 /* BATCH_DRAW */;
                break;
            case 4 /* TriangleStrip */:
            case 2 /* LineStrip */:
                drawType = 2 /* BATCH_DRAW_DEGENERATE */;
                break;
        }
        if ((list.batchPrimCount > 0) && (drawType == 2 /* BATCH_DRAW_DEGENERATE */))
            vertexBuffer.startDegenerateTriangleStrip();
        {
            var verticesOffset = vertexBuffer.ensureAndTake(vertexCount);
            vertexReader.readCount(vertexBuffer.vertices, verticesOffset, vertexInput, indices, vertexCount, vertexState.hasIndex);
        }
        if ((list.batchPrimCount > 0) && (drawType == 2 /* BATCH_DRAW_DEGENERATE */))
            vertexBuffer.endDegenerateTriangleStrip();
        if (drawType == 0 /* SINGLE_DRAW */) {
            list.finishPrimBatch();
        }
        else {
            list.batchPrimCount++;
        }
    };
    PspGpuExecutor.prototype.PATCHDIVISION = function (p) {
        if (this.state.patch._divst == p)
            return;
        this.invalidatePrim();
        this.state.patch._divst = p;
        this.state.patch.divs = param8(p, 0);
        this.state.patch.divt = param8(p, 8);
    };
    PspGpuExecutor.prototype.BEZIER = function (p) {
        var _this = this;
        this.invalidatePrim();
        var ucount = param8(p, 0);
        var vcount = param8(p, 8);
        var divs = this.state.patch.divs;
        var divt = this.state.patch.divt;
        var vertexState = this.state.vertex;
        var vertexReader = _vertex.VertexReaderFactory.get(vertexState);
        var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
        var vertexInput = this.list.memory.getPointerDataView(vertexAddress);
        var vertexState2 = vertexState.clone();
        vertexState2.texture = 3 /* Float */;
        var getBezierControlPoints = function (ucount, vcount) {
            var controlPoints = ArrayUtils.create2D(ucount, vcount);
            var mipmap = _this.state.texture.mipmaps[0];
            var scale = mipmap.textureWidth / mipmap.bufferWidth;
            for (var u = 0; u < ucount; u++) {
                for (var v = 0; v < vcount; v++) {
                    var vertex = vertexReader.readOne(vertexInput, v * ucount + u);
                    ;
                    controlPoints[u][v] = vertex;
                    vertex.tx = (u / (ucount - 1)) * scale;
                    vertex.ty = (v / (vcount - 1));
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
        this.list.drawDriver.drawElements(_state, 3 /* Triangles */, vertices2, vertices2.length, vertexState2);
    };
    PspGpuExecutor.prototype.light = function (index) {
        return this.state.lightning.lights[index];
    };
    PspGpuExecutor.prototype.LIGHTENABLE_ = function (p, index) {
        if (this.light(index).enabled == bool1(p))
            return;
        this.invalidatePrim();
        this.light(index).enabled = bool1(p);
    };
    PspGpuExecutor.prototype.LIGHTMODE = function (p) {
        if (this.state.lightning.lightModel != param8(p, 0))
            return;
        this.invalidatePrim();
        this.state.lightning.lightModel = param8(p, 0);
    };
    PspGpuExecutor.prototype.LIGHTTYPE_ = function (p, index) {
        var light = this.light(index);
        if (light._type == p)
            return;
        this.invalidatePrim();
        light._type = p;
        var kind = param8(p, 0);
        var type = param8(p, 0);
        light.kind = kind;
        light.type = type;
        switch (light.type) {
            case 0 /* Directional */:
                light.pw = 0;
                break;
            case 1 /* PointLight */:
                light.pw = 1;
                light.cutoff = 180;
                break;
            case 2 /* SpotLight */:
                light.pw = 1;
                break;
        }
    };
    PspGpuExecutor.prototype.LCA_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).constantAttenuation == v)
            return;
        this.invalidatePrim();
        this.light(index).constantAttenuation = v;
    };
    PspGpuExecutor.prototype.LLA_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).linearAttenuation == v)
            return;
        this.invalidatePrim();
        this.light(index).linearAttenuation = v;
    };
    PspGpuExecutor.prototype.LQA_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).quadraticAttenuation == v)
            return;
        this.invalidatePrim();
        this.light(index).quadraticAttenuation = v;
    };
    PspGpuExecutor.prototype.SPOTEXP_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).spotExponent == v)
            return;
        this.invalidatePrim();
        this.light(index).spotExponent = v;
    };
    PspGpuExecutor.prototype.SPOTCUT_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).spotCutoff == v)
            return;
        this.invalidatePrim();
        this.light(index).spotCutoff = v;
    };
    PspGpuExecutor.prototype.LXP_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).px == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).px = float1(p);
    };
    PspGpuExecutor.prototype.LYP_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).py == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).py = float1(p);
    };
    PspGpuExecutor.prototype.LZP_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).pz == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).pz = float1(p);
    };
    PspGpuExecutor.prototype.LXD_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).dx == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).dx = float1(p);
    };
    PspGpuExecutor.prototype.LYD_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).dy == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).dy = float1(p);
    };
    PspGpuExecutor.prototype.LZD_ = function (p, index) {
        var v = float1(p);
        if (this.light(index).dz == float1(p))
            return;
        this.invalidatePrim();
        this.light(index).dz = float1(p);
    };
    PspGpuExecutor.prototype.LIGHTENABLE0 = function (p) {
        this.LIGHTENABLE_(p, 0);
    };
    PspGpuExecutor.prototype.LIGHTENABLE1 = function (p) {
        this.LIGHTENABLE_(p, 1);
    };
    PspGpuExecutor.prototype.LIGHTENABLE2 = function (p) {
        this.LIGHTENABLE_(p, 2);
    };
    PspGpuExecutor.prototype.LIGHTENABLE3 = function (p) {
        this.LIGHTENABLE_(p, 3);
    };
    PspGpuExecutor.prototype.LIGHTTYPE0 = function (p) {
        this.LIGHTTYPE_(p, 0);
    };
    PspGpuExecutor.prototype.LIGHTTYPE1 = function (p) {
        this.LIGHTTYPE_(p, 1);
    };
    PspGpuExecutor.prototype.LIGHTTYPE2 = function (p) {
        this.LIGHTTYPE_(p, 2);
    };
    PspGpuExecutor.prototype.LIGHTTYPE3 = function (p) {
        this.LIGHTTYPE_(p, 3);
    };
    PspGpuExecutor.prototype.LCA0 = function (p) {
        this.LCA_(p, 0);
    };
    PspGpuExecutor.prototype.LCA1 = function (p) {
        this.LCA_(p, 1);
    };
    PspGpuExecutor.prototype.LCA2 = function (p) {
        this.LCA_(p, 2);
    };
    PspGpuExecutor.prototype.LCA3 = function (p) {
        this.LCA_(p, 3);
    };
    PspGpuExecutor.prototype.LLA0 = function (p) {
        this.LLA_(p, 0);
    };
    PspGpuExecutor.prototype.LLA1 = function (p) {
        this.LLA_(p, 1);
    };
    PspGpuExecutor.prototype.LLA2 = function (p) {
        this.LLA_(p, 2);
    };
    PspGpuExecutor.prototype.LLA3 = function (p) {
        this.LLA_(p, 3);
    };
    PspGpuExecutor.prototype.LQA0 = function (p) {
        this.LQA_(p, 0);
    };
    PspGpuExecutor.prototype.LQA1 = function (p) {
        this.LQA_(p, 1);
    };
    PspGpuExecutor.prototype.LQA2 = function (p) {
        this.LQA_(p, 2);
    };
    PspGpuExecutor.prototype.LQA3 = function (p) {
        this.LQA_(p, 3);
    };
    PspGpuExecutor.prototype.SPOTEXP0 = function (p) {
        this.SPOTEXP_(p, 0);
    };
    PspGpuExecutor.prototype.SPOTEXP1 = function (p) {
        this.SPOTEXP_(p, 1);
    };
    PspGpuExecutor.prototype.SPOTEXP2 = function (p) {
        this.SPOTEXP_(p, 2);
    };
    PspGpuExecutor.prototype.SPOTEXP3 = function (p) {
        this.SPOTEXP_(p, 3);
    };
    PspGpuExecutor.prototype.SPOTCUT0 = function (p) {
        this.SPOTCUT_(p, 0);
    };
    PspGpuExecutor.prototype.SPOTCUT1 = function (p) {
        this.SPOTCUT_(p, 1);
    };
    PspGpuExecutor.prototype.SPOTCUT2 = function (p) {
        this.SPOTCUT_(p, 2);
    };
    PspGpuExecutor.prototype.SPOTCUT3 = function (p) {
        this.SPOTCUT_(p, 3);
    };
    PspGpuExecutor.prototype.LXP0 = function (p) {
        this.LXP_(p, 0);
    };
    PspGpuExecutor.prototype.LXP1 = function (p) {
        this.LXP_(p, 1);
    };
    PspGpuExecutor.prototype.LXP2 = function (p) {
        this.LXP_(p, 2);
    };
    PspGpuExecutor.prototype.LXP3 = function (p) {
        this.LXP_(p, 3);
    };
    PspGpuExecutor.prototype.LYP0 = function (p) {
        this.LYP_(p, 0);
    };
    PspGpuExecutor.prototype.LYP1 = function (p) {
        this.LYP_(p, 1);
    };
    PspGpuExecutor.prototype.LYP2 = function (p) {
        this.LYP_(p, 2);
    };
    PspGpuExecutor.prototype.LYP3 = function (p) {
        this.LYP_(p, 3);
    };
    PspGpuExecutor.prototype.LZP0 = function (p) {
        this.LZP_(p, 0);
    };
    PspGpuExecutor.prototype.LZP1 = function (p) {
        this.LZP_(p, 1);
    };
    PspGpuExecutor.prototype.LZP2 = function (p) {
        this.LZP_(p, 2);
    };
    PspGpuExecutor.prototype.LZP3 = function (p) {
        this.LZP_(p, 3);
    };
    PspGpuExecutor.prototype.LXD0 = function (p) {
        this.LXD_(p, 0);
    };
    PspGpuExecutor.prototype.LXD1 = function (p) {
        this.LXD_(p, 1);
    };
    PspGpuExecutor.prototype.LXD2 = function (p) {
        this.LXD_(p, 2);
    };
    PspGpuExecutor.prototype.LXD3 = function (p) {
        this.LXD_(p, 3);
    };
    PspGpuExecutor.prototype.LYD0 = function (p) {
        this.LYD_(p, 0);
    };
    PspGpuExecutor.prototype.LYD1 = function (p) {
        this.LYD_(p, 1);
    };
    PspGpuExecutor.prototype.LYD2 = function (p) {
        this.LYD_(p, 2);
    };
    PspGpuExecutor.prototype.LYD3 = function (p) {
        this.LYD_(p, 3);
    };
    PspGpuExecutor.prototype.LZD0 = function (p) {
        this.LZD_(p, 0);
    };
    PspGpuExecutor.prototype.LZD1 = function (p) {
        this.LZD_(p, 1);
    };
    PspGpuExecutor.prototype.LZD2 = function (p) {
        this.LZD_(p, 2);
    };
    PspGpuExecutor.prototype.LZD3 = function (p) {
        this.LZD_(p, 3);
    };
    PspGpuExecutor.prototype.ALC_ = function (p, index) {
        if (this.light(index)._ambientColor == p)
            return;
        this.invalidatePrim();
        this.light(index)._ambientColor = p;
        this.light(index).ambientColor.setRGB(p);
    };
    PspGpuExecutor.prototype.DLC_ = function (p, index) {
        if (this.light(index)._diffuseColor == p)
            return;
        this.invalidatePrim();
        this.light(index)._diffuseColor = p;
        this.light(index).diffuseColor.setRGB(p);
    };
    PspGpuExecutor.prototype.SLC_ = function (p, index) {
        if (this.light(index)._specularColor == p)
            return;
        this.invalidatePrim();
        this.light(index)._specularColor = p;
        this.light(index).specularColor.setRGB(p);
    };
    PspGpuExecutor.prototype.ALC0 = function (p) {
        this.ALC_(p, 0);
    };
    PspGpuExecutor.prototype.ALC1 = function (p) {
        this.ALC_(p, 1);
    };
    PspGpuExecutor.prototype.ALC2 = function (p) {
        this.ALC_(p, 2);
    };
    PspGpuExecutor.prototype.ALC3 = function (p) {
        this.ALC_(p, 3);
    };
    PspGpuExecutor.prototype.DLC0 = function (p) {
        this.DLC_(p, 0);
    };
    PspGpuExecutor.prototype.DLC1 = function (p) {
        this.DLC_(p, 1);
    };
    PspGpuExecutor.prototype.DLC2 = function (p) {
        this.DLC_(p, 2);
    };
    PspGpuExecutor.prototype.DLC3 = function (p) {
        this.DLC_(p, 3);
    };
    PspGpuExecutor.prototype.SLC0 = function (p) {
        this.SLC_(p, 0);
    };
    PspGpuExecutor.prototype.SLC1 = function (p) {
        this.SLC_(p, 1);
    };
    PspGpuExecutor.prototype.SLC2 = function (p) {
        this.SLC_(p, 2);
    };
    PspGpuExecutor.prototype.SLC3 = function (p) {
        this.SLC_(p, 3);
    };
    return PspGpuExecutor;
})();
var PspGpuList = (function () {
    function PspGpuList(id, memory, drawDriver, executor, runner, gpu, cpuExecutor, state) {
        this.id = id;
        this.memory = memory;
        this.drawDriver = drawDriver;
        this.executor = executor;
        this.runner = runner;
        this.gpu = gpu;
        this.cpuExecutor = cpuExecutor;
        this.state = state;
        this.completed = false;
        this.status = 4 /* Paused */;
        this.errorCount = 0;
        this.callstack = new Int32Array(1024);
        this.callstackIndex = 0;
        this.primBatchPrimitiveType = -1;
        this.batchPrimCount = 0;
        this.primCount = 0;
        //private showOpcodes = true;
        this.showOpcodes = false;
        this.opcodes = [];
    }
    PspGpuList.prototype.complete = function () {
        this.completed = true;
        this.runner.deallocate(this);
        this.promiseResolve(0);
    };
    PspGpuList.prototype.jumpRelativeOffset = function (offset) {
        this.current4 = (((this.state.baseAddress + offset) >> 2) & Memory.MASK);
    };
    PspGpuList.prototype.jumpAbsolute = function (address) {
        this.current4 = ((address >>> 2) & Memory.MASK);
    };
    PspGpuList.prototype.finishPrimBatch = function () {
        if (vertexBuffer.offsetLength == 0)
            return;
        this.batchPrimCount = 0;
        this.drawDriver.drawElements(this.state, this.primBatchPrimitiveType, vertexBuffer.vertices, vertexBuffer.offsetLength, this.state.vertex);
        vertexBuffer.reset();
        this.primBatchPrimitiveType = -1;
    };
    PspGpuList.prototype.finish = function () {
        if (this.showOpcodes) {
            $('#output').text('finish:' + this.primCount + ';' + this.opcodes.join(","));
            if (this.opcodes.length)
                this.opcodes = [];
        }
        this.primCount = 0;
    };
    Object.defineProperty(PspGpuList.prototype, "isStalled", {
        get: function () {
            return ((this.stall4 != 0) && (this.current4 >= this.stall4));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PspGpuList.prototype, "hasMoreInstructions", {
        get: function () {
            return !this.completed && !this.isStalled;
            //return !this.completed && ((this.stall == 0) || (this.current < this.stall));
        },
        enumerable: true,
        configurable: true
    });
    PspGpuList.prototype.runUntilStallInner = function () {
        var u32 = this.memory.u32;
        var showOpcodes = this.showOpcodes;
        var table = this.executor.table;
        var stall4 = this.stall4;
        while (!this.completed && ((stall4 == 0) || (this.current4 < stall4))) {
            var instructionPC4 = this.current4++;
            var instruction = u32[instructionPC4];
            var op = (instruction >>> 24);
            var params24 = (instruction & 0x00FFFFFF);
            if (showOpcodes)
                this.opcodes.push(GpuOpCodes[op]);
            if (table[op](params24, instructionPC4, op))
                return;
        }
        this.status = (this.isStalled) ? 3 /* Stalling */ : 0 /* Completed */;
    };
    PspGpuList.prototype.runUntilStall = function () {
        this.status = 2 /* Drawing */;
        this.executor.setList(this);
        while (this.hasMoreInstructions) {
            try {
                this.runUntilStallInner();
            }
            catch (e) {
                console.log(e);
                console.log(e['stack']);
            }
        }
    };
    PspGpuList.prototype.enqueueRunUntilStall = function () {
        var _this = this;
        setImmediate(function () {
            _this.runUntilStall();
        });
    };
    PspGpuList.prototype.updateStall = function (stall) {
        this.stall4 = ((stall >>> 2) & Memory.MASK);
        this.enqueueRunUntilStall();
    };
    PspGpuList.prototype.start = function () {
        var _this = this;
        this.status = 1 /* Queued */;
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
var PrimDrawType;
(function (PrimDrawType) {
    PrimDrawType[PrimDrawType["SINGLE_DRAW"] = 0] = "SINGLE_DRAW";
    PrimDrawType[PrimDrawType["BATCH_DRAW"] = 1] = "BATCH_DRAW";
    PrimDrawType[PrimDrawType["BATCH_DRAW_DEGENERATE"] = 2] = "BATCH_DRAW_DEGENERATE";
})(PrimDrawType || (PrimDrawType = {}));
var PspGpuListRunner = (function () {
    function PspGpuListRunner(memory, drawDriver, gpu, callbackManager) {
        this.memory = memory;
        this.drawDriver = drawDriver;
        this.gpu = gpu;
        this.callbackManager = callbackManager;
        this.lists = [];
        this.freeLists = [];
        this.runningLists = [];
        this.state = new _state.GpuState();
        this.executor = new PspGpuExecutor();
        for (var n = 0; n < 32; n++) {
            var list = new PspGpuList(n, memory, drawDriver, this.executor, this, gpu, callbackManager, this.state);
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
    PspGpuListRunner.prototype.peek = function () {
        var _this = this;
        var _peek = (function () {
            for (var n = 0; n < _this.runningLists.length; n++) {
                var list = _this.runningLists[n];
                if (list.status != 0 /* Completed */)
                    return list.status;
            }
            return 0 /* Completed */;
        });
        var result = _peek();
        //result = Math.floor(Math.random() * 4);
        console.warn('not implemented gpu list peeking -> ' + result);
        return result;
    };
    PspGpuListRunner.prototype.waitAsync = function () {
        return Promise.all(this.runningLists.map(function (list) { return list.waitAsync(); })).then(function () { return 0 /* Completed */; });
    };
    return PspGpuListRunner;
})();
var PspGpuCallback = (function () {
    function PspGpuCallback(cpuState, signalFunction, signalArgument, finishFunction, finishArgument) {
        this.cpuState = cpuState;
        this.signalFunction = signalFunction;
        this.signalArgument = signalArgument;
        this.finishFunction = finishFunction;
        this.finishArgument = finishArgument;
    }
    return PspGpuCallback;
})();
exports.PspGpuCallback = PspGpuCallback;
var PspGpu = (function () {
    function PspGpu(memory, display, canvas, cpuExecutor) {
        this.memory = memory;
        this.display = display;
        this.canvas = canvas;
        this.cpuExecutor = cpuExecutor;
        this.callbacks = new UidCollection(1);
        try {
            this.driver = new WebGlPspDrawDriver(memory, display, canvas);
        }
        catch (e) {
            this.driver = new DummyDrawDriver();
        }
        //this.driver = new Context2dPspDrawDriver(memory, canvas);
        this.listRunner = new PspGpuListRunner(memory, this.driver, this, this.cpuExecutor);
    }
    PspGpu.prototype.startAsync = function () {
        return this.driver.initAsync();
    };
    PspGpu.prototype.stopAsync = function () {
        return Promise.resolve();
    };
    PspGpu.prototype.listEnqueue = function (start, stall, callbackId, argsPtr) {
        var list = this.listRunner.allocate();
        list.current4 = ((start >>> 2) & Memory.MASK);
        list.stall4 = stall;
        list.callbackId = callbackId;
        list.argsPtr = argsPtr;
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
        //console.warn('Not implemented sceGe_user.sceGeDrawSync');
        return this.listRunner.waitAsync();
        switch (syncType) {
            case 1 /* Peek */:
                return this.listRunner.peek();
            case 0 /* WaitForCompletion */:
                return this.listRunner.waitAsync();
            default:
                throw (new Error("Not implemented SyncType." + syncType));
        }
    };
    return PspGpu;
})();
exports.PspGpu = PspGpu;
//# sourceMappingURL=gpu.js.map