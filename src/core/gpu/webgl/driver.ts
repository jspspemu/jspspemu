import _driver = require('../driver');
import _state = require('../state');
import _memory = require('../../memory');
import _display = require('../../display');
import _shader = require('./shader');
import _texture = require('./texture');
import _utils = require('./utils');

import FastFloat32Buffer = _utils.FastFloat32Buffer;
import IDrawDriver = _driver.IDrawDriver;
import ShaderCache = _shader.ShaderCache;
import Texture = _texture.Texture;
import TextureHandler = _texture.TextureHandler;
import Memory = _memory.Memory;
import Matrix4x3 = _state.Matrix4x3;
import Matrix4x4 = _state.Matrix4x4;
import GpuState = _state.GpuState;
import IPspDisplay = _display.IPspDisplay;
import WrappedWebGLProgram = _utils.WrappedWebGLProgram;

class WebGlPspDrawDriver implements IDrawDriver {
	private gl: WebGLRenderingContext;
	private cache: ShaderCache;
	private textureHandler: TextureHandler;

	constructor(private memory: Memory, private display: IPspDisplay, private canvas: HTMLCanvasElement) {
		var webglOptions = {
			alpha: false,
			depth: true,
			stencil: true,
			antialias: false,
			premultipliedAlpha: false,
			preserveDrawingBuffer: true,
			preferLowPowerToHighPerformance: false,
			failIfMajorPerformanceCaveat: false,
		};

		this.gl = this.canvas.getContext('experimental-webgl', webglOptions);
		if (!this.gl) this.canvas.getContext('webgl', webglOptions);

		if (!this.gl) {
			alert("Can't initialize WebGL!");
			throw (new Error("Can't initialize WebGL!"));
		}

		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, 0, -0xFFFF);
	}

	private baseShaderFragString = '';
	private baseShaderVertString = '';

	initAsync() {
		return downloadFileAsync('shader.vert').then((shaderVert) => {
			return downloadFileAsync('shader.frag').then((shaderFrag) => {
				var shaderVertString = Stream.fromArrayBuffer(shaderVert).readUtf8String(shaderVert.byteLength);
				var shaderFragString = Stream.fromArrayBuffer(shaderFrag).readUtf8String(shaderFrag.byteLength);

				this.cache = new ShaderCache(this.gl, shaderVertString, shaderFragString);
				this.textureHandler = new TextureHandler(this.memory, this.gl);
			});
		});
	}

	private clearing: boolean;
	private clearingFlags: ClearBufferSet;

	setClearMode(clearing: boolean, flags: number) {
		this.clearing = clearing;
		this.clearingFlags = <ClearBufferSet>flags;
		//console.log('clearing: ' + clearing + '; ' + flags);
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
		mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
		mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
	}

	private enableDisable(type: number, enable: boolean) {
		if (enable) this.gl.enable(type); else this.gl.disable(type);
		return enable;
	}

	private state: GpuState;

	setState(state: GpuState) {
		this.state = state;
	}

	private updateNormalState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var state = this.state;
		var gl = this.gl;

		if (this.enableDisable(gl.CULL_FACE, state.culling.enabled && (primitiveType != _state.PrimitiveType.Sprites))) {
			gl.cullFace((state.culling.direction == _state.CullingDirection.ClockWise) ? gl.FRONT : gl.BACK);
		}

		if (this.enableDisable(gl.SCISSOR_TEST, state.clipPlane.enabled)) {
			var rect = state.clipPlane.scissor;
			var ratio = this.getScaleRatio();
			gl.scissor(rect.left * ratio, rect.top * ratio, rect.width * ratio, rect.height * ratio);
		}

		var blending = state.blending;
		if (this.enableDisable(gl.BLEND, blending.enabled)) {
			var getBlendFix = (color: _state.Color) => {
				if (color.equals(0, 0, 0, 1)) return gl.ZERO;
				if (color.equals(1, 1, 1, 1)) return gl.ONE;
				return gl.CONSTANT_COLOR;
			};

			var sfactor = gl.SRC_COLOR + blending.functionSource;
			var dfactor = gl.SRC_COLOR + blending.functionDestination;

			if (blending.functionSource == _state.GuBlendingFactor.GU_FIX) {
				sfactor = getBlendFix(blending.fixColorSource);
			}

			if (blending.functionDestination == _state.GuBlendingFactor.GU_FIX) {
				if ((sfactor == gl.CONSTANT_COLOR) && ((_state.Color.add(blending.fixColorSource, blending.fixColorDestination).equals(1, 1, 1, 1)))) {
					dfactor = gl.ONE_MINUS_CONSTANT_COLOR;
				} else {
					dfactor = getBlendFix(blending.fixColorDestination);
				}
			}

			var equationTranslate = [gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD, gl.FUNC_ADD, gl.FUNC_ADD]; // Add, Subtract, ReverseSubtract, Min, Max, Abs

			gl.blendEquation(equationTranslate[blending.equation]);
			gl.blendFunc(sfactor, dfactor);
			switch (blending.equation) {
				case _state.GuBlendingEquation.Abs:
				case _state.GuBlendingEquation.Max:
				case _state.GuBlendingEquation.Min:
				case _state.GuBlendingEquation.Add: gl.blendEquation(gl.FUNC_ADD); break;
				case _state.GuBlendingEquation.Substract: gl.blendEquation(gl.FUNC_SUBTRACT); break;
				case _state.GuBlendingEquation.ReverseSubstract: gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); break;
			}

			var blendColor = blending.fixColorDestination;
			gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendColor.a);
		}

		var stencil = state.stencil;
		if (this.enableDisable(gl.STENCIL_TEST, stencil.enabled)) {
			var opsConvert = [gl.KEEP, gl.ZERO, gl.REPLACE, gl.INVERT, gl.INCR, gl.DECR];
			var funcConvert = [gl.NEVER, gl.ALWAYS, gl.EQUAL, gl.NOTEQUAL, gl.LESS, gl.LEQUAL, gl.GREATER, gl.GEQUAL];
			gl.stencilFunc(funcConvert[stencil.func], stencil.funcRef, stencil.funcMask);
			gl.stencilOp(opsConvert[stencil.fail], opsConvert[stencil.zfail], opsConvert[stencil.zpass]);
		}

		gl.disable(gl.DEPTH_TEST);

		var alphaTest = state.alphaTest;
		if (alphaTest.enabled) {
			//console.log(alphaTest.value);
			//console.log(TestFunctionEnum[alphaTest.func] + '; ' + alphaTest.value + '; ' + alphaTest.mask);
			program.getUniform('alphaTestFunc').set1i(alphaTest.func);
			program.getUniform('alphaTestReference').set1i(alphaTest.value);
			program.getUniform('alphaTestMask').set1i(alphaTest.mask);
		} else {
			//console.warn("alphaTest.enabled = false");
		}

		gl.colorMask(true, true, true, true);

	}

	private updateClearState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var state = this.state;
		var gl = this.gl;
		var ccolorMask = false, calphaMask = false;
		var clearingFlags = this.clearingFlags;
		//gl.disable(gl.TEXTURE_2D);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.CULL_FACE);
		gl.depthMask(false);

		if (clearingFlags & ClearBufferSet.ColorBuffer) {
			ccolorMask = true;
		}

		if (clearingFlags & ClearBufferSet.StencilBuffer) {
			calphaMask = true;
			gl.enable(gl.STENCIL_TEST);
			gl.stencilFunc(gl.ALWAYS, 0x00, 0xFF);
			gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
		}

		if (clearingFlags & ClearBufferSet.DepthBuffer) {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.ALWAYS);
			gl.depthMask(true);
			gl.depthRange(0, 0);
		}

		gl.colorMask(ccolorMask, ccolorMask, ccolorMask, calphaMask);
	}

	private updateCommonState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var viewport = this.state.viewport;

		var x = 2048 - viewport.x;
		var y = 2048 - viewport.y;
		var width = viewport.width * 2;
		var height = -viewport.height * 2;

		//debugger;

		var ratio = this.getScaleRatio();
		this.gl.viewport(x * ratio, y * ratio, width * ratio, height * ratio);
	}

	private updateState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		if (this.state.clearing) {
			this.updateClearState(program, vertexState, primitiveType);
		} else {
			this.updateNormalState(program, vertexState, primitiveType);
		}
		this.updateCommonState(program, vertexState, primitiveType);
	}

	getScaleRatio() {
		return this.canvas.width / 480;
	}

	drawElements(primitiveType: _state.PrimitiveType, vertices: _state.Vertex[], count: number, vertexState: _state.VertexState) {
		this.display.setEnabledDisplay(false);

		if (primitiveType == _state.PrimitiveType.Sprites) {
			return this.drawSprites(vertices, count, vertexState);
		} else {
			return this.drawElementsInternal(primitiveType, primitiveType, vertices, count, vertexState);
		}
	}

	textureFlush(state: GpuState) {
		this.textureHandler.flush();
	}

	textureSync(state: GpuState) {
		this.textureHandler.sync();
	}

	private vertexPool = <_state.Vertex[]>[];

	private drawSprites(vertices: _state.Vertex[], count: number, vertexState: _state.VertexState) {
		var vertexPool = this.vertexPool;

		while (vertexPool.length < count * 2) vertexPool.push(new _state.Vertex());

		var vertexCount = 0;
		var vertices2 = [];

		for (var n = 0; n < count; n += 2) {
			var tl = vertexPool[vertexCount++].copyFrom(vertices[n + 0]);
			var br = vertexPool[vertexCount++].copyFrom(vertices[n + 1]);

			tl.r = br.r;
			tl.g = br.g;
			tl.b = br.b;
			tl.a = br.a;

			var vtr = vertexPool[vertexCount++].copyFrom(tl);
			var vbl = vertexPool[vertexCount++].copyFrom(br);

			vtr.px = br.px; vtr.py = tl.py;
			vtr.tx = br.tx; vtr.ty = tl.ty;

			vbl.px = tl.px; vbl.py = br.py;
			vbl.tx = tl.tx; vbl.ty = br.ty;

			vertices2.push(tl, vtr, vbl);
			vertices2.push(vtr, br, vbl);
		}
		this.drawElementsInternal(_state.PrimitiveType.Sprites, _state.PrimitiveType.Triangles, vertices2, vertices2.length, vertexState);
	}

	private testCount = 20;
	private positionData = new FastFloat32Buffer();
	private colorData = new FastFloat32Buffer();
	private textureData = new FastFloat32Buffer();
	private vertexWeightData1 = new FastFloat32Buffer();
	private vertexWeightData2 = new FastFloat32Buffer();

	private lastBaseAddress = 0;

	private demuxVertices(vertices: _state.Vertex[], count: number, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var textureState = this.state.texture;
		var weightCount = vertexState.weightCount;

		this.positionData.restart();
		this.colorData.restart();
		this.textureData.restart();

		this.vertexWeightData1.restart();
		this.vertexWeightData2.restart();

		var mipmap = this.state.texture.mipmaps[0];
		//console.log('demuxVertices: ' + vertices.length + ', ' + count + ', ' + vertexState + ', PrimitiveType=' + primitiveType);
		for (var n = 0; n < count; n++) {
			var v = vertices[n];

			this.positionData.push3(v.px, v.py, v.pz);

			if (vertexState.hasColor) {
				this.colorData.push4(v.r, v.g, v.b, v.a);
			}

			if (vertexState.hasTexture) {
				var tx = v.tx, ty = v.ty, tz = v.tz;
				if (vertexState.transform2D) {
					//this.textureData.push3((tx + 0.5) / (mipmap.bufferWidth), (ty + 0.5) / (mipmap.textureHeight), 0.0);
					this.textureData.push3(tx / (mipmap.bufferWidth), ty / (mipmap.textureHeight), 0.0);
				} else {
					this.textureData.push3(tx * textureState.scaleU, ty * textureState.scaleV, tz);
				}
			}

			if (weightCount > 0) {
				this.vertexWeightData1.push4(v.w0, v.w1, v.w2, v.w3);
				if (weightCount > 4) {
					this.vertexWeightData2.push4(v.w4, v.w5, v.w6, v.w7);
				}
			}
		}
	}

	private usedMatrix: Float32Array;

	private setProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState) {
		this.usedMatrix = vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix;
		program.getUniform('u_modelViewProjMatrix').setMat4(this.usedMatrix);

		program.getAttrib("vPosition").setFloats(3, this.positionData.slice());
		if (vertexState.hasTexture) {
			program.getUniform('tfx').set1i(this.state.texture.effect);
			program.getUniform('tcc').set1i(this.state.texture.colorComponent);
			program.getAttrib("vTexcoord").setFloats(3, this.textureData.slice());
		}

		if (vertexState.weightCount > 0) {
			program.getAttrib('vertexWeight1').setFloats(4, this.vertexWeightData1.slice());
			if (vertexState.weightCount > 4) {
				program.getAttrib('vertexWeight2').setFloats(4, this.vertexWeightData2.slice());
			}
			for (var n = 0; n < vertexState.weightCount; n++) {
				program.getUniform("matrixBone" + n).setMat4(this.state.skinning.boneMatrices[n].values);
			}
		}

		if (vertexState.hasColor) {
			program.getAttrib("vColor").setFloats(4, this.colorData.slice());
		} else {
			var ac = this.state.ambientModelColor;
			//console.log(ac.r, ac.g, ac.b, ac.a);

			program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
		}
	}

	private unsetProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState) {
		program.getAttrib("vPosition").disable();
		if (vertexState.hasTexture) program.getAttrib("vTexcoord").disable();
		if (vertexState.hasColor) program.getAttrib("vColor").disable();
	}

	private drawArraysActual(gl: WebGLRenderingContext, primitiveType: _state.PrimitiveType, count: number) {
		switch (primitiveType) {
			case _state.PrimitiveType.Points: gl.drawArrays(gl.POINTS, 0, count); break;
			case _state.PrimitiveType.Lines:
			case _state.PrimitiveType.LineStrip:
				gl.lineWidth(this.getScaleRatio());
				if (primitiveType == _state.PrimitiveType.Lines) {
					gl.drawArrays(gl.LINES, 0, count);
				} else {
					gl.drawArrays(gl.LINE_STRIP, 0, count);
				}
				break;
			case _state.PrimitiveType.Triangles: gl.drawArrays(gl.TRIANGLES, 0, count); break;
			case _state.PrimitiveType.TriangleStrip: gl.drawArrays(gl.TRIANGLE_STRIP, 0, count); break;
			case _state.PrimitiveType.TriangleFan: gl.drawArrays(gl.TRIANGLE_FAN, 0, count); break;
		}
	}

	private prepareTexture(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState) {
		if (vertexState.hasTexture) {
			this.textureHandler.bindTexture(program, this.state);
		} else {
			this.textureHandler.unbindTexture(program, this.state);
		}
	}

	drawElementsInternal(originalPrimitiveType: _state.PrimitiveType, primitiveType: _state.PrimitiveType, vertices: _state.Vertex[], count: number, vertexState: _state.VertexState) {
		var gl = this.gl;

		//console.log(primitiveType);
		var program = this.cache.getProgram(vertexState, this.state);
		program.use();
		this.demuxVertices(vertices, count, vertexState, primitiveType);

		this.updateState(program, vertexState, originalPrimitiveType);
		this.setProgramParameters(gl, program, vertexState);

		if (this.clearing) {
			this.textureHandler.unbindTexture(program, this.state);
			/*
			gl.clearColor(0.5, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			return;
			*/
		} else {
			this.prepareTexture(gl, program, vertexState);
		}

		this.drawArraysActual(gl, primitiveType, count);
		this.unsetProgramParameters(gl, program, vertexState);
	}
}

enum ClearBufferSet {
	ColorBuffer = 1,
	StencilBuffer = 2,
	DepthBuffer = 4,
	FastClear = 16
}

export = WebGlPspDrawDriver;

