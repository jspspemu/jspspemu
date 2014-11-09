///<reference path="../../../global.d.ts" />
var _state = require('../state');
var _memory = require('../../memory');
var _shader = require('./shader');
var _texture = require('./texture');
var _utils = require('./utils');
var FastFloat32Buffer = _utils.FastFloat32Buffer;
var ShaderCache = _shader.ShaderCache;
var TextureHandler = _texture.TextureHandler;
var WebGlPspDrawDriver = (function () {
    function WebGlPspDrawDriver(memory, display, canvas) {
        this.memory = memory;
        this.display = display;
        this.canvas = canvas;
        this.baseShaderFragString = '';
        this.baseShaderVertString = '';
        this.transformMatrix = mat4.create();
        this.transformMatrix2d = mat4.create();
        this.equationTranslate = null;
        this.opsConvertTable = null;
        this.testConvertTable = null;
        this.testConvertTable_inv = null;
        this.vertexPool = [];
        this.vertexPool2 = [];
        this.testCount = 20;
        this.positionData = new FastFloat32Buffer();
        this.colorData = new FastFloat32Buffer();
        this.textureData = new FastFloat32Buffer();
        this.normalData = new FastFloat32Buffer();
        this.vertexWeightData1 = new FastFloat32Buffer();
        this.vertexWeightData2 = new FastFloat32Buffer();
        this.lastBaseAddress = 0;
        this.tempVec = new Float32Array([0, 0, 0]);
        this.texMat = mat4.create();
        this.convertPrimitiveType = null;
        var webglOptions = {
            alpha: false,
            depth: true,
            stencil: true,
            //antialias: false,
            //premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        };
        this.gl = this.canvas.getContext('experimental-webgl', webglOptions);
        if (!this.gl)
            this.canvas.getContext('webgl', webglOptions);
        if (!this.gl) {
            alert("Can't initialize WebGL!");
            throw (new Error("Can't initialize WebGL!"));
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, 0, -0xFFFF);
    }
    WebGlPspDrawDriver.prototype.initAsync = function () {
        var _this = this;
        return downloadFileAsync('data/shader.vert').then(function (shaderVert) {
            return downloadFileAsync('data/shader.frag').then(function (shaderFrag) {
                var shaderVertString = Stream.fromArrayBuffer(shaderVert).readUtf8String(shaderVert.byteLength);
                var shaderFragString = Stream.fromArrayBuffer(shaderFrag).readUtf8String(shaderFrag.byteLength);
                _this.cache = new ShaderCache(_this.gl, shaderVertString, shaderFragString);
                _this.textureHandler = new TextureHandler(_this.memory, _this.gl);
            });
        });
    };
    WebGlPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
        this.clearing = clearing;
        this.clearingFlags = flags;
        //console.log('clearing: ' + clearing + '; ' + flags);
    };
    WebGlPspDrawDriver.prototype.end = function () {
        this.textureHandler.end();
    };
    WebGlPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
        this.projectionMatrix = projectionMatrix;
        this.viewMatrix = viewMatrix;
        this.worldMatrix = worldMatrix;
        //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
        mat4.identity(this.transformMatrix);
        mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
        mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
        mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
    };
    WebGlPspDrawDriver.prototype.enableDisable = function (type, enable) {
        if (enable)
            this.gl.enable(type);
        else
            this.gl.disable(type);
        return enable;
    };
    WebGlPspDrawDriver.prototype.setState = function (state) {
        this.state = state;
    };
    WebGlPspDrawDriver.prototype.updateNormalState = function (program, vertexState, primitiveType) {
        var state = this.state;
        var gl = this.gl;
        if (!this.equationTranslate)
            this.equationTranslate = [gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD, gl.FUNC_ADD, gl.FUNC_ADD]; // Add, Subtract, ReverseSubtract, Min, Max, Abs
        if (!this.opsConvertTable)
            this.opsConvertTable = [gl.KEEP, gl.ZERO, gl.REPLACE, gl.INVERT, gl.INCR, gl.DECR];
        if (!this.testConvertTable)
            this.testConvertTable = [gl.NEVER, gl.ALWAYS, gl.EQUAL, gl.NOTEQUAL, gl.LESS, gl.LEQUAL, gl.GREATER, gl.GEQUAL];
        if (!this.testConvertTable_inv)
            this.testConvertTable_inv = [gl.NEVER, gl.ALWAYS, gl.EQUAL, gl.NOTEQUAL, gl.GREATER, gl.GEQUAL, gl.LESS, gl.LEQUAL];
        if (this.enableDisable(gl.CULL_FACE, state.culling.enabled && (primitiveType != 6 /* Sprites */))) {
            gl.cullFace((state.culling.direction == 1 /* ClockWise */) ? gl.FRONT : gl.BACK);
        }
        if (!state.clipPlane.updated) {
            state.clipPlane.updated = true;
            if (this.enableDisable(gl.SCISSOR_TEST, state.clipPlane.enabled)) {
                var rect = state.clipPlane.scissor;
                var ratio = this.getScaleRatio();
                gl.scissor(rect.left * ratio, rect.top * ratio, rect.width * ratio, rect.height * ratio);
            }
        }
        if (!this.state.blending.updated) {
            this.state.blending.updated = true;
            var blending = state.blending;
            if (this.enableDisable(gl.BLEND, blending.enabled)) {
                var getBlendFix = function (color) {
                    if (color.equals(0, 0, 0, 1))
                        return gl.ZERO;
                    if (color.equals(1, 1, 1, 1))
                        return gl.ONE;
                    return gl.CONSTANT_COLOR;
                };
                var sfactor = gl.SRC_COLOR + blending.functionSource;
                var dfactor = gl.SRC_COLOR + blending.functionDestination;
                if (blending.functionSource == 10 /* GU_FIX */) {
                    sfactor = getBlendFix(blending.fixColorSource);
                }
                if (blending.functionDestination == 10 /* GU_FIX */) {
                    if ((sfactor == gl.CONSTANT_COLOR) && ((_state.Color.add(blending.fixColorSource, blending.fixColorDestination).equals(1, 1, 1, 1)))) {
                        dfactor = gl.ONE_MINUS_CONSTANT_COLOR;
                    }
                    else {
                        dfactor = getBlendFix(blending.fixColorDestination);
                    }
                }
                gl.blendEquation(this.equationTranslate[blending.equation]);
                gl.blendFunc(sfactor, dfactor);
                switch (blending.equation) {
                    case 5 /* Abs */:
                    case 4 /* Max */:
                    case 3 /* Min */:
                    case 0 /* Add */:
                        gl.blendEquation(gl.FUNC_ADD);
                        break;
                    case 1 /* Substract */:
                        gl.blendEquation(gl.FUNC_SUBTRACT);
                        break;
                    case 2 /* ReverseSubstract */:
                        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
                        break;
                }
                var blendColor = blending.fixColorDestination;
                gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendColor.a);
            }
        }
        var stencil = state.stencil;
        if (this.enableDisable(gl.STENCIL_TEST, stencil.enabled)) {
            gl.stencilFunc(this.testConvertTable[stencil.func], stencil.funcRef, stencil.funcMask);
            gl.stencilOp(this.opsConvertTable[stencil.fail], this.opsConvertTable[stencil.zfail], this.opsConvertTable[stencil.zpass]);
        }
        if (!this.state.depthTest.updated) {
            this.state.depthTest.updated = true;
            gl.depthRange(state.depthTest.rangeFar, state.depthTest.rangeNear);
            //gl.depthRange(0, 1);
            gl.depthMask(state.depthTest.mask == 0);
            if (this.enableDisable(gl.DEPTH_TEST, state.depthTest.enabled)) {
                gl.depthFunc(this.testConvertTable_inv[state.depthTest.func]);
            }
        }
        var alphaTest = state.alphaTest;
        if (alphaTest.enabled) {
            program.getUniform('alphaTestFunc').set1i(alphaTest.func);
            program.getUniform('alphaTestReference').set1i(alphaTest.value);
            program.getUniform('alphaTestMask').set1i(alphaTest.mask);
        }
        else {
        }
    };
    WebGlPspDrawDriver.prototype.updateClearStateEnd = function (program, vertexState, primitiveType) {
        var gl = this.gl;
        gl.colorMask(true, true, true, true);
    };
    WebGlPspDrawDriver.prototype.updateClearStateStart = function (program, vertexState, primitiveType) {
        var state = this.state;
        var gl = this.gl;
        var ccolorMask = false, calphaMask = false;
        var clearingFlags = this.clearingFlags;
        //gl.disable(gl.TEXTURE_2D);
        gl.disable(gl.SCISSOR_TEST);
        state.clipPlane.updated = false;
        gl.disable(gl.BLEND);
        this.state.blending.updated = false;
        gl.disable(gl.DEPTH_TEST);
        this.state.depthTest.updated = false;
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(false);
        if (clearingFlags & 1 /* ColorBuffer */) {
            ccolorMask = true;
        }
        if (clearingFlags & 2 /* StencilBuffer */) {
            calphaMask = true;
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.ALWAYS, 0x00, 0xFF);
            gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
        }
        if (clearingFlags & 4 /* DepthBuffer */) {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.ALWAYS);
            gl.depthMask(true);
            gl.depthRange(state.depthTest.rangeNear, state.depthTest.rangeNear);
        }
        gl.colorMask(ccolorMask, ccolorMask, ccolorMask, calphaMask);
    };
    WebGlPspDrawDriver.prototype.updateCommonState = function (program, vertexState, primitiveType) {
        var viewport = this.state.viewport;
        //var region = this.state.region;
        var x = 2048 - viewport.x;
        var y = 2048 - viewport.y;
        var width = Math.abs(viewport.width * 2);
        var height = Math.abs(-viewport.height * 2);
        //debugger;
        var ratio = this.getScaleRatio();
        this.gl.viewport(x * ratio, y * ratio, width * ratio, height * ratio);
    };
    WebGlPspDrawDriver.prototype.updateState = function (program, vertexState, primitiveType) {
        if (this.state.clearing) {
            this.updateClearStateStart(program, vertexState, primitiveType);
        }
        else {
            this.updateNormalState(program, vertexState, primitiveType);
        }
        this.updateCommonState(program, vertexState, primitiveType);
    };
    WebGlPspDrawDriver.prototype.getScaleRatio = function () {
        return this.canvas.width / 480;
    };
    WebGlPspDrawDriver.prototype.drawElements = function (state, primitiveType, vertices, count, vertexState) {
        if (count == 0)
            return;
        this.setState(state);
        this.setClearMode(state.clearing, state.clearFlags);
        this.setMatrices(state.projectionMatrix, state.viewMatrix, state.worldMatrix);
        this.display.setEnabledDisplay(false);
        if (primitiveType == 6 /* Sprites */) {
            return this.drawSprites(vertices, count, vertexState);
        }
        else {
            return this.drawElementsInternal(primitiveType, primitiveType, vertices, count, vertexState);
        }
    };
    WebGlPspDrawDriver.prototype.textureFlush = function (state) {
        this.textureHandler.flush();
    };
    WebGlPspDrawDriver.prototype.textureSync = function (state) {
        this.textureHandler.sync();
    };
    WebGlPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
        var vertexPool = this.vertexPool;
        while (vertexPool.length < count * 2)
            vertexPool.push(new _state.Vertex());
        var inCount = 0;
        //var vertices2 = [];
        this.vertexPool2.length = Math.max(this.vertexPool2.length, count * 3);
        var outCount = 0;
        for (var n = 0; n < count; n += 2) {
            var tl = vertexPool[inCount++].copyFromBasic(vertices[n + 0]);
            var br = vertexPool[inCount++].copyFromBasic(vertices[n + 1]);
            tl.r = br.r;
            tl.g = br.g;
            tl.b = br.b;
            tl.a = br.a;
            var vtr = vertexPool[inCount++].copyFromBasic(tl);
            var vbl = vertexPool[inCount++].copyFromBasic(br);
            vtr.px = br.px;
            vtr.py = tl.py;
            vtr.tx = br.tx;
            vtr.ty = tl.ty;
            vbl.px = tl.px;
            vbl.py = br.py;
            vbl.tx = tl.tx;
            vbl.ty = br.ty;
            this.vertexPool2[outCount++] = tl;
            this.vertexPool2[outCount++] = vtr;
            this.vertexPool2[outCount++] = vbl;
            this.vertexPool2[outCount++] = vtr;
            this.vertexPool2[outCount++] = br;
            this.vertexPool2[outCount++] = vbl;
        }
        this.drawElementsInternal(6 /* Sprites */, 3 /* Triangles */, this.vertexPool2, outCount, vertexState);
    };
    WebGlPspDrawDriver.prototype.demuxVertices = function (vertices, count, vertexState, primitiveType, originalPrimitiveType) {
        var textureState = this.state.texture;
        var weightCount = vertexState.realWeightCount;
        this.positionData.restart();
        this.colorData.restart();
        this.textureData.restart();
        this.normalData.restart();
        this.vertexWeightData1.restart();
        this.vertexWeightData2.restart();
        var mipmap = this.state.texture.mipmaps[0];
        for (var n = 0; n < count; n++) {
            var v = vertices[n];
            this.positionData.push3(v.px, v.py, vertexState.transform2D ? 0.0 : v.pz);
            if (vertexState.hasColor)
                this.colorData.push4(v.r, v.g, v.b, v.a);
            if (vertexState.hasTexture)
                this.textureData.push3(v.tx, v.ty, v.tz);
            if (vertexState.hasNormal)
                this.normalData.push3(v.nx, v.ny, v.nz);
            if (weightCount >= 1) {
                this.vertexWeightData1.push4(v.w0, v.w1, v.w2, v.w3);
                if (weightCount >= 4) {
                    this.vertexWeightData2.push4(v.w4, v.w5, v.w6, v.w7);
                }
            }
        }
    };
    WebGlPspDrawDriver.prototype.prepareTexture = function (gl, program, vertexState) {
        if (vertexState.hasTexture) {
            this.textureHandler.bindTexture(program, this.state);
        }
        else {
            this.textureHandler.unbindTexture(program, this.state);
        }
    };
    WebGlPspDrawDriver.prototype.drawElementsInternal = function (originalPrimitiveType, primitiveType, vertices, count, vertexState) {
        var gl = this.gl;
        //console.log(primitiveType);
        var program = this.cache.getProgram(vertexState, this.state);
        program.use();
        this.demuxVertices(vertices, count, vertexState, primitiveType, originalPrimitiveType);
        this.updateState(program, vertexState, originalPrimitiveType);
        this.setProgramParameters(gl, program, vertexState);
        if (this.clearing) {
            this.textureHandler.unbindTexture(program, this.state);
        }
        else {
            this.prepareTexture(gl, program, vertexState);
        }
        this.drawArraysActual(gl, program, vertexState, primitiveType, count, vertices);
        this.unsetProgramParameters(gl, program, vertexState);
        if (this.state.clearing) {
            this.updateClearStateEnd(program, vertexState, primitiveType);
        }
    };
    WebGlPspDrawDriver.prototype.setProgramParameters = function (gl, program, vertexState) {
        program.getUniform('u_modelViewProjMatrix').setMat4(vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);
        program.getAttrib("vPosition").setFloats(3, this.positionData.slice());
        if (vertexState.hasTexture) {
            program.getUniform('tfx').set1i(this.state.texture.effect);
            program.getUniform('tcc').set1i(this.state.texture.colorComponent);
            program.getAttrib("vTexcoord").setFloats(3, this.textureData.slice());
        }
        if (vertexState.hasNormal) {
            program.getAttrib("vNormal").setFloats(3, this.normalData.slice());
        }
        if (vertexState.realWeightCount >= 1) {
            //debugger;
            program.getAttrib('vertexWeight1').setFloats(4, this.vertexWeightData1.slice());
            if (vertexState.realWeightCount >= 4) {
                program.getAttrib('vertexWeight2').setFloats(4, this.vertexWeightData2.slice());
            }
            for (var n = 0; n < vertexState.realWeightCount; n++) {
                program.getUniform("matrixBone" + n).setMat4(this.state.skinning.boneMatrices[n].values);
            }
        }
        if (vertexState.hasColor) {
            program.getAttrib("vColor").setFloats(4, this.colorData.slice());
        }
        else {
            var ac = this.state.ambientModelColor;
            //console.log(ac.r, ac.g, ac.b, ac.a);
            program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
        }
        if (vertexState.hasTexture) {
            var texture = this.state.texture;
            var mipmap = texture.mipmaps[0];
            mat4.identity(this.texMat);
            var t = this.tempVec;
            if (vertexState.transform2D) {
                t[0] = 1.0 / (mipmap.bufferWidth);
                t[1] = 1.0 / (mipmap.textureHeight);
                t[2] = 1.0;
                mat4.scale(this.texMat, this.texMat, t);
            }
            else {
                switch (texture.textureMapMode) {
                    case 0 /* GU_TEXTURE_COORDS */:
                        t[0] = texture.offsetU;
                        t[1] = texture.offsetV;
                        t[2] = 0.0;
                        mat4.translate(this.texMat, this.texMat, t);
                        t[0] = texture.scaleU;
                        t[1] = texture.scaleV;
                        t[2] = 1.0;
                        mat4.scale(this.texMat, this.texMat, t);
                        break;
                    default:
                        break;
                }
            }
            program.getUniform('u_texMatrix').setMat4(this.texMat);
        }
    };
    WebGlPspDrawDriver.prototype.unsetProgramParameters = function (gl, program, vertexState) {
        program.getAttrib("vPosition").disable();
        if (vertexState.hasTexture)
            program.getAttrib("vTexcoord").disable();
        if (vertexState.hasNormal)
            program.getAttrib("vNormal").disable();
        if (vertexState.hasColor)
            program.getAttrib("vColor").disable();
        if (vertexState.realWeightCount >= 1)
            program.getAttrib('vertexWeight1').disable();
        if (vertexState.realWeightCount >= 4)
            program.getAttrib('vertexWeight2').disable();
    };
    WebGlPspDrawDriver.prototype.drawArraysActual = function (gl, program, vertexState, primitiveType, count, vertices) {
        if (!this.convertPrimitiveType)
            this.convertPrimitiveType = [gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN];
        gl.drawArrays(this.convertPrimitiveType[primitiveType], 0, count);
        //if (gl.getError() != gl.NO_ERROR) debugger;
    };
    return WebGlPspDrawDriver;
})();
var ClearBufferSet;
(function (ClearBufferSet) {
    ClearBufferSet[ClearBufferSet["ColorBuffer"] = 1] = "ColorBuffer";
    ClearBufferSet[ClearBufferSet["StencilBuffer"] = 2] = "StencilBuffer";
    ClearBufferSet[ClearBufferSet["DepthBuffer"] = 4] = "DepthBuffer";
    ClearBufferSet[ClearBufferSet["FastClear"] = 16] = "FastClear";
})(ClearBufferSet || (ClearBufferSet = {}));
module.exports = WebGlPspDrawDriver;
//# sourceMappingURL=driver.js.map