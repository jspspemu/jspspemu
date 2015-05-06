///<reference path="../../../global.d.ts" />

import _driver = require('../driver');
import _state = require('../state');
import _vertex = require('../vertex');
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
			//antialias: false,
			//premultipliedAlpha: false,
			preserveDrawingBuffer: true,
			//preserveDrawingBuffer: false,
			//preferLowPowerToHighPerformance: false,
			//failIfMajorPerformanceCaveat: false,
		};

		this.gl = <WebGLRenderingContext>this.canvas.getContext('webgl', webglOptions);
		if (!this.gl) this.gl = <WebGLRenderingContext>this.canvas.getContext('experimental-webgl', webglOptions);

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
		return downloadFileAsync('data/shader.vert').then((shaderVert) => {
			return downloadFileAsync('data/shader.frag').then((shaderFrag) => {
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

	end() {
		this.textureHandler.end();
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

	private equationTranslate: number[] = [GL.FUNC_ADD, GL.FUNC_SUBTRACT, GL.FUNC_REVERSE_SUBTRACT, GL.FUNC_ADD, GL.FUNC_ADD, GL.FUNC_ADD]; // Add, Subtract, ReverseSubtract, Min, Max, Abs
	private opsConvertTable: number[] = [GL.KEEP, GL.ZERO, GL.REPLACE, GL.INVERT, GL.INCR, GL.DECR];
	private testConvertTable: number[] = [GL.NEVER, GL.ALWAYS, GL.EQUAL, GL.NOTEQUAL, GL.LESS, GL.LEQUAL, GL.GREATER, GL.GEQUAL];
	private testConvertTable_inv: number[] = [GL.NEVER, GL.ALWAYS, GL.EQUAL, GL.NOTEQUAL, GL.GREATER, GL.GEQUAL, GL.LESS, GL.LEQUAL];
	private updateNormalState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var state = this.state;
		var gl = this.gl;

		if (this.enableDisable(gl.CULL_FACE, state.culling.enabled && (primitiveType != _state.PrimitiveType.Sprites))) {
			gl.cullFace((state.culling.direction == _state.CullingDirection.ClockWise) ? gl.FRONT : gl.BACK);
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


				gl.blendEquation(this.equationTranslate[blending.equation]);
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
		} else {
			//console.warn("alphaTest.enabled = false");
		}
	}

	private updateClearStateEnd(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var gl = this.gl;
		gl.colorMask(true, true, true, true);
	}

	private updateClearStateStart(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var state = this.state;
		var gl = this.gl;
		var ccolorMask = false, calphaMask = false;
		var clearingFlags = this.clearingFlags;
		//gl.disable(gl.TEXTURE_2D);
		gl.disable(gl.SCISSOR_TEST); state.clipPlane.updated = false;
		gl.disable(gl.BLEND); this.state.blending.updated = false;
		gl.disable(gl.DEPTH_TEST); this.state.depthTest.updated = false;
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.CULL_FACE);
		gl.depthMask(false);

		if (clearingFlags & ClearBufferSet.ColorBuffer) {
			ccolorMask = true;
		}

		//calphaMask = false;
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
			gl.depthRange(state.depthTest.rangeNear, state.depthTest.rangeNear);
			//debugger;
		}

		gl.colorMask(ccolorMask, ccolorMask, ccolorMask, calphaMask);
	}

	private updateCommonState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		var viewport = this.state.viewport;
		//var region = this.state.region;

		var x = 2048 - viewport.x;
		var y = 2048 - viewport.y;
		var width = Math.abs(viewport.width * 2);
		var height = Math.abs(-viewport.height * 2);

		//debugger;

		var ratio = this.getScaleRatio();
		this.gl.viewport(x * ratio, y * ratio, width * ratio, height * ratio);
	}

	private updateState(program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType) {
		if (this.state.clearing) {
			this.updateClearStateStart(program, vertexState, primitiveType);
		} else {
			this.updateNormalState(program, vertexState, primitiveType);
		}
		this.updateCommonState(program, vertexState, primitiveType);
	}

	getScaleRatio() {
		return this.canvas.width / 480;
	}

	drawElements(state: GpuState, primitiveType: _state.PrimitiveType, vertices: _state.Vertex[], count: number, vertexState: _state.VertexState) {
		if (count == 0) return;
		
		this.beforeDraw(state);

		if (primitiveType == _state.PrimitiveType.Sprites) {
			return this.drawSprites(vertices, count, vertexState);
		} else {
			return this.drawElementsInternal(primitiveType, primitiveType, vertices, count, vertexState);
		}
	}
	
	private beforeDraw(state: GpuState) {
		this.setState(state);
		this.setClearMode(state.clearing, state.clearFlags);
		this.setMatrices(state.projectionMatrix, state.viewMatrix, state.worldMatrix);
		this.display.setEnabledDisplay(false);
	}
	
	private setAttribute(databuffer:WebGLBuffer, attribPosition:_utils.WrappedWebGLAttrib, componentCount:number, componentType:number, vertexSize:number, offset:number) {
		if (attribPosition.location < 0) return;
		var gl = this.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, databuffer);
		gl.enableVertexAttribArray(attribPosition.location);
		// vertexAttribPointer(this.texCoordLocation2, 2, gl.FLOAT, false, 0, 0);
		gl.vertexAttribPointer(attribPosition.location, componentCount, componentType, false, vertexSize, offset);
		//console.log(`${enabled}, ${name}, ${componentCount}, ${componentType}, ${vertexSize}, ${offset}`);
	}
	
	private optimizedDataBuffer:WebGLBuffer = null;
	private optimizedIndexBuffer:WebGLBuffer = null;
	drawOptimized(state: GpuState, buffer:_vertex.OptimizedDrawBuffer):void {
		this.beforeDraw(state);
		var state = this.state;
		let gl = this.gl;
		
		if (!this.optimizedDataBuffer) this.optimizedDataBuffer = gl.createBuffer();
		if (!this.optimizedIndexBuffer) this.optimizedIndexBuffer = gl.createBuffer();
		
		let databuffer = this.optimizedDataBuffer;
		let indexbuffer = this.optimizedIndexBuffer;
		let vs = buffer.vertexState;
		let primType = buffer.primType;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, databuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buffer.data.buffer, 0, buffer.dataOffset + 120), gl.DYNAMIC_DRAW);

		//private setAttribute(enabled:boolean, attribPosition:number, componentCount:number, componentType:number, offset:number, vertexSize:number) {
		
		var program = this.cache.getProgram(vs, state, true);
		program.use();
		program.getUniform('u_modelViewProjMatrix').setMat4(vs.transform2D ? this.transformMatrix2d : this.transformMatrix);
		if (vs.hasPosition) {
			this.setAttribute(databuffer, program.vPosition, vs.positionComponents, convertVertexNumericEnum[vs.position], vs.size, vs.positionOffset);	
		}
		if (vs.hasTexture) {
			this.setAttribute(databuffer, program.vTexcoord, vs.textureComponents, convertVertexNumericUnsignedEnum[vs.texture], vs.size, vs.textureOffset);
		}
		// @TODO: Just working for RGBA8888
		if (vs.hasColor) {
			if (vs.color == 7) {
				this.setAttribute(databuffer, program.vColor, vs.colorComponents, GL.UNSIGNED_BYTE, vs.size, vs.colorOffset);
			} else {
				this.setAttribute(databuffer, program.vColor, 4, GL.UNSIGNED_SHORT, vs.size, vs.colorOffset);
			}
		}
		if (vs.hasNormal) {
			this.setAttribute(databuffer, program.vNormal, vs.normalComponents, convertVertexNumericEnum[vs.normal], vs.size, vs.normalOffset);
		}
		
		if (vs.realWeightCount >= 1) {
			this.setAttribute(databuffer, program.vertexWeight1, Math.min(4, vs.realWeightCount), convertVertexNumericEnum[vs.weight], vs.size, vs.oneWeightOffset(0));
			if (vs.realWeightCount >= 4) {
				this.setAttribute(databuffer, program.vertexWeight2, Math.min(4, vs.realWeightCount - 4), convertVertexNumericEnum[vs.weight], vs.size, vs.oneWeightOffset(4));
			}
			for (var n = 0; n < vs.realWeightCount; n++) {
				program.getUniform("matrixBone" + n).setMat4(this.state.skinning.boneMatrices[n].values);
				//program.getUniform("matrixBone" + n).setMat4x3(this.state.skinning.linear, 12 * n);
			}
		}

		if (!vs.hasColor) {
			var ac = this.state.ambientModelColor;
			//console.log(ac.r, ac.g, ac.b, ac.a);
			program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
		}
		//console.log(vs.hasPosition, vs.hasColor, vs.hasTexture, vs.hasNormal, vs.hasWeight, vs.position, vs.color, vs.texture);
		
		if (vs.hasTexture) {
			program.getUniform('tfx').set1i(state.texture.effect);
			program.getUniform('tcc').set1i(state.texture.colorComponent);
		}

		this.updateState(program, vs, buffer.primType);
		//this.setProgramParameters(gl, program, vs);

		// vertex: VertexState({"address":5833460,"texture":2,"color":7,"normal":0,"position":3,"weight":0,"index":0,"realWeightCount":0,"morphingVertexCount":0,"transform2D":true})
		// jspspemu.js:14054 [0, 1, 2, 3, 4, 5, 6, 7, 6, 7]
		if (this.clearing) {
			this.textureHandler.unbindTexture(program, state);
		} else {
			this.prepareTexture(gl, program, vs);
		}
		
		if (vs.hasTexture) {
			this.calcTexMatrix(vs);
			program.getUniform('u_texMatrix').setMat4(this.texMat);
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexbuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buffer.indices.buffer, 0, buffer.indexOffset), gl.DYNAMIC_DRAW);
		//console.log('vertex.size:', vs.size, ',buffer:', buffer.dataOffset, vs.positionOffset, vs.textureOffset, vs.size);
		//console.log('vertex:', vs.toString());
		//console.log(new Uint16Array(buffer.indices.buffer, 0, buffer.indexOffset));
		gl.drawElements(convertPrimitiveType[primType], buffer.indexOffset, gl.UNSIGNED_SHORT, 0);
		//drawElements(mode: number, count: number, type: number, offset: number): void;
		
		if (vs.hasPosition) program.vPosition.disable();
		if (vs.hasColor) program.vColor.disable();
		if (vs.hasTexture) program.vTexcoord.disable();
		if (vs.hasNormal) program.vNormal.disable();
		
		if (vs.realWeightCount >= 1) {
			program.vertexWeight1.disable();
			if (vs.realWeightCount >= 4) {
				program.vertexWeight2.disable();
			}
		}
	}

	textureFlush(state: GpuState) {
		this.textureHandler.flush();
	}

	textureSync(state: GpuState) {
		this.textureHandler.sync();
	}

	private vertexPool = <_state.Vertex[]>[];
	private vertexPool2 = <_state.Vertex[]>[];

	private drawSprites(vertices: _state.Vertex[], count: number, vertexState: _state.VertexState) {
		var vertexPool = this.vertexPool;

		while (vertexPool.length < count * 2) vertexPool.push(new _state.Vertex());

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

			vtr.px = br.px; vtr.py = tl.py;
			vtr.tx = br.tx; vtr.ty = tl.ty;

			vbl.px = tl.px; vbl.py = br.py;
			vbl.tx = tl.tx; vbl.ty = br.ty;

			this.vertexPool2[outCount++] = tl;
			this.vertexPool2[outCount++] = vtr;
			this.vertexPool2[outCount++] = vbl;

			this.vertexPool2[outCount++] = vtr;
			this.vertexPool2[outCount++] = br;
			this.vertexPool2[outCount++] = vbl;
		}
		this.drawElementsInternal(_state.PrimitiveType.Sprites, _state.PrimitiveType.Triangles, this.vertexPool2, outCount, vertexState);
	}

	private testCount = 20;
	private positionData = new FastFloat32Buffer();
	private colorData = new FastFloat32Buffer();
	private textureData = new FastFloat32Buffer();
	private normalData = new FastFloat32Buffer();
	private vertexWeightData1 = new FastFloat32Buffer();
	private vertexWeightData2 = new FastFloat32Buffer();

	private lastBaseAddress = 0;

	private demuxVertices(vertices: _state.Vertex[], count: number, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType, originalPrimitiveType: _state.PrimitiveType) {
		var textureState = this.state.texture;
		var weightCount = vertexState.realWeightCount;

		this.positionData.restart();
		this.colorData.restart();
		this.textureData.restart();
		this.normalData.restart();

		this.vertexWeightData1.restart();
		this.vertexWeightData2.restart();

		var mipmap = this.state.texture.mipmaps[0];

		//debugger;

		//console.log('demuxVertices: ' + vertices.length + ', ' + count + ', ' + vertexState + ', PrimitiveType=' + primitiveType);
		for (var n = 0; n < count; n++) {
			var v = vertices[n];

			this.positionData.push3(v.px, v.py, vertexState.transform2D ? 0.0 :  v.pz);

			if (vertexState.hasColor) this.colorData.push4(v.r, v.g, v.b, v.a);
			if (vertexState.hasTexture) this.textureData.push3(v.tx, v.ty, v.tz);
			if (vertexState.hasNormal) this.normalData.push3(v.nx, v.ny, v.nz);

			if (weightCount >= 1) {
				this.vertexWeightData1.push4(v.w0, v.w1, v.w2, v.w3);
				if (weightCount >= 4) {
					this.vertexWeightData2.push4(v.w4, v.w5, v.w6, v.w7);
				}
			}
		}
	}

	tempVec = new Float32Array([0, 0, 0])
	texMat = mat4.create();

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
		var program = this.cache.getProgram(vertexState, this.state, false);
		program.use();

		this.demuxVertices(vertices, count, vertexState, primitiveType, originalPrimitiveType);
		this.updateState(program, vertexState, originalPrimitiveType);
		this.setProgramParameters(gl, program, vertexState);

		if (this.clearing) {
			this.textureHandler.unbindTexture(program, this.state);
			//debugger;
		} else {
			this.prepareTexture(gl, program, vertexState);
		}

		this.drawArraysActual(gl, program, vertexState, primitiveType, count, vertices);
		this.unsetProgramParameters(gl, program, vertexState);

		if (this.state.clearing) {
			this.updateClearStateEnd(program, vertexState, primitiveType);
		}
	}
	
	private calcTexMatrix(vertexState: _state.VertexState) {
		var texture = this.state.texture;
		var mipmap = texture.mipmaps[0];
		mat4.identity(this.texMat);
		var t = this.tempVec;
		if (vertexState.transform2D) {
			t[0] = 1.0 / (mipmap.bufferWidth); t[1] = 1.0 / (mipmap.textureHeight); t[2] = 1.0; mat4.scale(this.texMat, this.texMat, t);
		} else {
			switch (texture.textureMapMode) {
				case _state.TextureMapMode.GU_TEXTURE_COORDS:
					t[0] = texture.offsetU; t[1] = texture.offsetV; t[2] = 0.0; mat4.translate(this.texMat, this.texMat, t);
					t[0] = texture.scaleU; t[1] = texture.scaleV; t[2] = 1.0; mat4.scale(this.texMat, this.texMat, t);

					//switch (vertexState.textureSize) {
					//	case 1: t[0] = 0x80; t[1] = 0x80; t[2] = 1.0; mat4.scale(this.texMat, this.texMat, t); break;
					//	case 2: t[0] = 0x8000; t[1] = 0x8000; t[2] = 1.0; mat4.scale(this.texMat, this.texMat, t); break;
					//}
					break;
				default:
					break;
			}
		}
	}

	private setProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState) {
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
				//program.getUniform("matrixBone" + n).setMat4x3(this.state.skinning.linear, 12 * n);
			}
		}

		if (vertexState.hasColor) {
			program.getAttrib("vColor").setFloats(4, this.colorData.slice());
		} else {
			var ac = this.state.ambientModelColor;
			//console.log(ac.r, ac.g, ac.b, ac.a);
			program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
		}

		if (vertexState.hasTexture) {
			this.calcTexMatrix(vertexState);
			program.getUniform('u_texMatrix').setMat4(this.texMat);
		}
	}

	private unsetProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState) {
		program.getAttrib("vPosition").disable();
		if (vertexState.hasTexture) program.getAttrib("vTexcoord").disable();
		if (vertexState.hasNormal) program.getAttrib("vNormal").disable();
		if (vertexState.hasColor) program.getAttrib("vColor").disable();
		if (vertexState.realWeightCount >= 1) program.getAttrib('vertexWeight1').disable();
		if (vertexState.realWeightCount >= 4) program.getAttrib('vertexWeight2').disable();
	}

	private drawArraysActual(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: _state.VertexState, primitiveType: _state.PrimitiveType, count: number, vertices: _state.Vertex[]) {
		gl.drawArrays(convertPrimitiveType[primitiveType], 0, count);
		//if (gl.getError() != gl.NO_ERROR) debugger;
	}
}

var convertPrimitiveType = new Int32Array([GL.POINTS, GL.LINES, GL.LINE_STRIP, GL.TRIANGLES, GL.TRIANGLE_STRIP, GL.TRIANGLE_FAN]);
var convertVertexNumericEnum = new Int32Array([0, GL.BYTE, GL.SHORT, GL.FLOAT]);
var convertVertexNumericUnsignedEnum = new Int32Array([0, GL.UNSIGNED_BYTE, GL.UNSIGNED_SHORT, GL.FLOAT]);

const enum GL {
    DEPTH_BUFFER_BIT               = 0x00000100,
    STENCIL_BUFFER_BIT             = 0x00000400,
    COLOR_BUFFER_BIT               = 0x00004000,
	
    POINTS                         = 0x0000,
    LINES                          = 0x0001,
    LINE_LOOP                      = 0x0002,
    LINE_STRIP                     = 0x0003,
    TRIANGLES                      = 0x0004,
    TRIANGLE_STRIP                 = 0x0005,
    TRIANGLE_FAN                   = 0x0006,
	
	// BlendingFactorDest 
    ZERO                           = 0,
    ONE                            = 1,
    SRC_COLOR                      = 0x0300,
    ONE_MINUS_SRC_COLOR            = 0x0301,
    SRC_ALPHA                      = 0x0302,
    ONE_MINUS_SRC_ALPHA            = 0x0303,
    DST_ALPHA                      = 0x0304,
    ONE_MINUS_DST_ALPHA            = 0x0305,
	
	// BlendingFactorSrc 
	DST_COLOR                      = 0x0306,
    ONE_MINUS_DST_COLOR            = 0x0307,
    SRC_ALPHA_SATURATE             = 0x0308,
	
    // DataType
    BYTE                           = 0x1400, // 5120
    UNSIGNED_BYTE                  = 0x1401, // 5121
    SHORT                          = 0x1402, // 5122
    UNSIGNED_SHORT                 = 0x1403, // 5123
    INT                            = 0x1404, // 5124
    UNSIGNED_INT                   = 0x1405, // 5125
    FLOAT                          = 0x1406, // 5126
	
    NEVER                          = 0x0200,
    LESS                           = 0x0201,
    EQUAL                          = 0x0202,
    LEQUAL                         = 0x0203,
    GREATER                        = 0x0204,
    NOTEQUAL                       = 0x0205,
    GEQUAL                         = 0x0206,
    ALWAYS                         = 0x0207,
	
	KEEP                           = 0x1E00,
    REPLACE                        = 0x1E01,
    INCR                           = 0x1E02,
    DECR                           = 0x1E03,
    INVERT                         = 0x150A,
    INCR_WRAP                      = 0x8507,
    DECR_WRAP                      = 0x8508,
	
	FUNC_ADD                       = 0x8006,
    BLEND_EQUATION                 = 0x8009,
    BLEND_EQUATION_RGB             = 0x8009,   /* same as BLEND_EQUATION */
    BLEND_EQUATION_ALPHA           = 0x883D,
	
	FUNC_SUBTRACT                  = 0x800A,
    FUNC_REVERSE_SUBTRACT          = 0x800B,
}

enum ClearBufferSet {
	ColorBuffer = 1,
	StencilBuffer = 2,
	DepthBuffer = 4,
	FastClear = 16
}

export = WebGlPspDrawDriver;

