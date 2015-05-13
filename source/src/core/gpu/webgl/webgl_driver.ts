///<reference path="../../../global.d.ts" />
///<reference path="./webgl_enums.d.ts" />

import {
GpuState, Color, ColorEnum, VertexInfo, PrimitiveType,
CullingDirection, GuBlendingEquation, TextureMapMode,
GuBlendingFactor
} from '../gpu_state';
import _vertex = require('../gpu_vertex');
import _pixelformat = require('../../pixelformat');
import { ShaderCache } from './webgl_shader';
import { Texture, TextureHandler } from './webgl_texture';
import { FastFloat32Buffer, WrappedWebGLProgram, WrappedWebGLAttrib } from './webgl_utils';

var globalDriver: WebGlPspDrawDriver = null;
export class WebGlPspDrawDriver {
	private gl: WebGLRenderingContext;
	
	private cache: ShaderCache;
	private textureHandler: TextureHandler;
	private glAntialiasing:boolean;

	constructor(private canvas: HTMLCanvasElement) {
		globalDriver = this;
		this.createCanvas(false);
		this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, 0, -0xFFFF);
	}
	
	set antialiasing(value:boolean) {
		if (this.glAntialiasing == value) return;
		this.glAntialiasing = value;
		this.createCanvas(value);
	}
	
	get antialiasing() {
		return this.glAntialiasing;
	}

	private createCanvas(glAntialiasing:boolean) {
		this.glAntialiasing = glAntialiasing;
		var webglOptions = {
			alpha: false,
			depth: true,
			stencil: true,
			antialias: glAntialiasing,
			//premultipliedAlpha: false,
			preserveDrawingBuffer: false,
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

		if (this.cache) this.cache.invalidateWithGl(this.gl);
		if (this.textureHandler) this.textureHandler.invalidateWithGl(this.gl);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	private baseShaderFragString = '';
	private baseShaderVertString = '';

	invalidatedMemoryAll() {
		this.textureHandler.invalidatedMemoryAll();
	}

	invalidatedMemoryRange(low: number, high: number) {
		this.textureHandler.invalidatedMemoryRange(low, high);
	}
	
	initAsync() {
		return downloadFileAsync('data/shader.vert').then((shaderVert) => {
			return downloadFileAsync('data/shader.frag').then((shaderFrag) => {
				var shaderVertString = Stream.fromArrayBuffer(shaderVert).readUtf8String(shaderVert.byteLength);
				var shaderFragString = Stream.fromArrayBuffer(shaderFrag).readUtf8String(shaderFrag.byteLength);

				this.cache = new ShaderCache(this.gl, shaderVertString, shaderFragString);
				this.textureHandler = new TextureHandler(this.gl);
				this.textureHandler.rehashSignal.pipeTo(this.rehashSignal);
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

	projectionMatrix = mat4.create();
	viewMatrix = mat4.create();
	worldMatrix = mat4.create();
	transformMatrix = mat4.create();
	transformMatrix2d = mat4.create();

	setMatrices(projectionMatrix: Float32Array, viewMatrix: Float32Array, worldMatrix: Float32Array) {
		mat4.from4x4(this.projectionMatrix, projectionMatrix);
		mat4.from4x3(this.viewMatrix, viewMatrix);
		mat4.from4x3(this.worldMatrix, worldMatrix);

		mat4.identity(this.transformMatrix);
		mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix);
		mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix);
		mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix);
	}

	private enableDisable(type: number, enable: boolean) {
		if (enable) this.gl.enable(type); else this.gl.disable(type);
		return enable;
	}

	private equationTranslate: number[] = [GL.FUNC_ADD, GL.FUNC_SUBTRACT, GL.FUNC_REVERSE_SUBTRACT, GL.FUNC_ADD, GL.FUNC_ADD, GL.FUNC_ADD]; // Add, Subtract, ReverseSubtract, Min, Max, Abs
	private opsConvertTable: number[] = [GL.KEEP, GL.ZERO, GL.REPLACE, GL.INVERT, GL.INCR, GL.DECR];
	private testConvertTable: number[] = [GL.NEVER, GL.ALWAYS, GL.EQUAL, GL.NOTEQUAL, GL.LESS, GL.LEQUAL, GL.GREATER, GL.GEQUAL];
	private testConvertTable_inv: number[] = [GL.NEVER, GL.ALWAYS, GL.EQUAL, GL.NOTEQUAL, GL.GREATER, GL.GEQUAL, GL.LESS, GL.LEQUAL];
	private updateNormalState(program: WrappedWebGLProgram, vertexInfo: VertexInfo, primitiveType: PrimitiveType) {
		var state = this.state;
		var gl = this.gl;

		if (this.enableDisable(gl.CULL_FACE, state.culling.enabled && (primitiveType != PrimitiveType.Sprites))) {
			gl.cullFace((state.culling.direction == CullingDirection.ClockWise) ? gl.FRONT : gl.BACK);
		}

		if (this.enableDisable(gl.SCISSOR_TEST, state.clipPlane.enabled)) {
			var rect = state.clipPlane.scissor;
			var ratio = this.getScaleRatio();
			gl.scissor(rect.left * ratio, rect.top * ratio, rect.width * ratio, rect.height * ratio);
		}

		var blending = state.blending;
		if (this.enableDisable(gl.BLEND, blending.enabled)) {
			var getBlendFix = (color: Color) => {
				if (color.equals(0, 0, 0, 1)) return gl.ZERO;
				if (color.equals(1, 1, 1, 1)) return gl.ONE;
				return gl.CONSTANT_COLOR;
			};

			var sfactor = gl.SRC_COLOR + blending.functionSource;
			var dfactor = gl.SRC_COLOR + blending.functionDestination;

			if (blending.functionSource == GuBlendingFactor.GU_FIX) {
				sfactor = getBlendFix(blending.fixColorSource);
			}

			if (blending.functionDestination == GuBlendingFactor.GU_FIX) {
				if ((sfactor == gl.CONSTANT_COLOR) && ((Color.add(blending.fixColorSource, blending.fixColorDestination).equals(1, 1, 1, 1)))) {
					dfactor = gl.ONE_MINUS_CONSTANT_COLOR;
				} else {
					dfactor = getBlendFix(blending.fixColorDestination);
				}
			}


			gl.blendEquation(this.equationTranslate[blending.equation]);
			gl.blendFunc(sfactor, dfactor);
			switch (blending.equation) {
				case GuBlendingEquation.Abs:
				case GuBlendingEquation.Max:
				case GuBlendingEquation.Min:
				case GuBlendingEquation.Add: gl.blendEquation(gl.FUNC_ADD); break;
				case GuBlendingEquation.Substract: gl.blendEquation(gl.FUNC_SUBTRACT); break;
				case GuBlendingEquation.ReverseSubstract: gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); break;
			}

			var blendColor = blending.fixColorDestination;
			gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendColor.a);
		}

		var stencil = state.stencil;
		if (this.enableDisable(gl.STENCIL_TEST, stencil.enabled)) {
			gl.stencilFunc(this.testConvertTable[stencil.func], stencil.funcRef, stencil.funcMask);
			gl.stencilOp(this.opsConvertTable[stencil.fail], this.opsConvertTable[stencil.zfail], this.opsConvertTable[stencil.zpass]);
		}

		gl.depthRange(state.depthTest.rangeFar, state.depthTest.rangeNear);
		//gl.depthRange(0, 1);
		gl.depthMask(state.depthTest.mask == 0);
		if (this.enableDisable(gl.DEPTH_TEST, state.depthTest.enabled && !state.vertex.transform2D)) {
			gl.depthFunc(this.testConvertTable_inv[state.depthTest.func]);
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

	private updateClearStateEnd(program: WrappedWebGLProgram, vertexInfo: VertexInfo, primitiveType: PrimitiveType) {
		var gl = this.gl;
		gl.colorMask(true, true, true, true);
	}

	private updateClearStateStart(program: WrappedWebGLProgram, vertexInfo: VertexInfo, primitiveType: PrimitiveType) {
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

	private updateCommonState(program: WrappedWebGLProgram, vertexInfo: VertexInfo, primitiveType: PrimitiveType) {
		var viewport = this.state.viewport;
		//var region = this.state.region;

		var x = 2048 - viewport.x;
		var y = 2048 - viewport.y;
		var width = Math.abs(viewport.width * 2);
		var height = Math.abs(-viewport.height * 2);

		//debugger;

		var ratio = this.getScaleRatio();
		this.gl.viewport(x * ratio, y * ratio, width * ratio, height * ratio);
		//this.gl.viewport(0, 0, 1440, 816);
	}

	private updateState(program: WrappedWebGLProgram, vertexInfo: VertexInfo, primitiveType: PrimitiveType) {
		program.getUniform('u_enableColors').set1i(this.enableColors ? 1 : 0);
		program.getUniform('u_enableTextures').set1i(this.enableTextures ? 1 : 0);
		program.getUniform('u_enableSkinning').set1i(this.enableSkinning ? 1 : 0);
		program.getUniform('u_enableBilinear').set1i(this.enableBilinear ? 1 : 0);
		
		if (this.state.clearing) {
			this.updateClearStateStart(program, vertexInfo, primitiveType);
		} else {
			this.updateNormalState(program, vertexInfo, primitiveType);
		}
		this.updateCommonState(program, vertexInfo, primitiveType);
	}

	getScaleRatio() {
		return this.canvas.width / 480;
	}

	private beforeDraw(state: GpuState) {
		this.state.copyFrom(state);
		this.setClearMode(state.clearing, state.clearFlags);
		this.setMatrices(state.projectionMatrix, state.viewMatrix, state.worldMatrix);
		//this.display.setEnabledDisplay(false);
	}
	
	private setAttribute(databuffer:WebGLBuffer, attribPosition:WrappedWebGLAttrib, componentCount:number, componentType:number, vertexSize:number, offset:number) {
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
	
	rehashSignal = new Signal1<number>();
	enableColors: boolean = true;
	enableTextures: boolean = true;
	enableSkinning: boolean = true;
	enableBilinear: boolean = true;
	
	private frameBufferWidth = 480;
	private frameBufferHeight = 272;
	protected state = new GpuState();
	
	setFramebufferSize(width:number, height:number) {
		this.canvas.setAttribute('width', `${width}`);
		this.canvas.setAttribute('height', `${height}`);
	}

	getFramebufferSize() {
		return { width: +this.canvas.getAttribute('width'), height: +this.canvas.getAttribute('height') }
	}
	
	public drawRatio: number = 1.0;
	private lastTransfer: _vertex.BatchesTransfer = null;
	
	redrawLastTransfer(): void {
		if (this.lastTransfer != null) this.drawBatchesTransfer(this.lastTransfer);
	}
	
	drawBatchesTransfer(transfer: _vertex.BatchesTransfer) {
		this.lastTransfer = transfer;
		var buffer = transfer.buffer;
		var verticesData = new Uint8Array(buffer, transfer.data.data, transfer.data.datasize);
		var indicesData = new Uint16Array(buffer, transfer.data.indices, transfer.data.indicesCount);
		let gl = this.gl;
		if (!this.optimizedDataBuffer) this.optimizedDataBuffer = gl.createBuffer();
		if (!this.optimizedIndexBuffer) this.optimizedIndexBuffer = gl.createBuffer();
		let databuffer = this.optimizedDataBuffer;
		let indexbuffer = this.optimizedIndexBuffer;
		gl.bindBuffer(gl.ARRAY_BUFFER, databuffer);
		gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexbuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.DYNAMIC_DRAW);
		
		this.textureHandler.startFrame();
		for (let batch of transfer.batches.slice(0, this.drawRatio * transfer.batches.length)) {
			this.drawOptimized(buffer, batch);
		}
		this.textureHandler.endFrame();
	}

	private vs = new VertexInfo();	
	drawOptimized(data: ArrayBuffer, batch: _vertex.OptimizedBatchTransfer): void {
		this.state.writeData(new Uint32Array(data, batch.stateOffset, 512));
		this.beforeDraw(this.state);
		var state = this.state;
		let gl = this.gl;
		
		
		if (!this.optimizedDataBuffer) this.optimizedDataBuffer = gl.createBuffer();
		if (!this.optimizedIndexBuffer) this.optimizedIndexBuffer = gl.createBuffer();
		let databuffer = this.optimizedDataBuffer;
		let indexbuffer = this.optimizedIndexBuffer;
		let vs = this.vs; // required after serializing
		vs.setState(this.state);
		let primType = batch.primType;

		var globalVertexOffset = batch.dataLow; let indexStart = batch.indexLow * 2; 
		
		gl.bindBuffer(gl.ARRAY_BUFFER, databuffer);
		var program = this.cache.getProgram(vs, state, true);
		program.use();
		program.getUniform('time').set1f(performance.now() / 1000.0);
		program.getUniform('u_modelViewProjMatrix').setMat4(vs.transform2D ? this.transformMatrix2d : this.transformMatrix);
		if (vs.hasPosition) {
			this.setAttribute(databuffer, program.vPosition, vs.positionComponents, convertVertexNumericEnum[vs.position], vs.size, vs.positionOffset + globalVertexOffset);	
		}
		if (vs.hasTexture) {
			this.setAttribute(databuffer, program.vTexcoord, vs.textureComponents, convertVertexNumericUnsignedEnum[vs.texture], vs.size, vs.textureOffset + globalVertexOffset);
		}

		if (vs.hasColor) {
			if (vs.color == ColorEnum.Color8888) {
				this.setAttribute(databuffer, program.vColor, 4, GL.UNSIGNED_BYTE, vs.size, vs.colorOffset + globalVertexOffset);
			} else {
				this.setAttribute(databuffer, program.vColor, 1, GL.UNSIGNED_SHORT, vs.size, vs.colorOffset + globalVertexOffset);
			}
		}

		if (vs.hasNormal) {
			this.setAttribute(databuffer, program.vNormal, vs.normalComponents, convertVertexNumericEnum[vs.normal], vs.size, vs.normalOffset + globalVertexOffset);
		}
		
		if (vs.realWeightCount > 0) {
			this.setAttribute(databuffer, program.vertexWeight1, Math.min(4, vs.realWeightCount), convertVertexNumericEnum[vs.weight], vs.size, vs.oneWeightOffset(0) + globalVertexOffset);
			if (vs.realWeightCount > 4) {
				this.setAttribute(databuffer, program.vertexWeight2, Math.min(4, vs.realWeightCount - 4), convertVertexNumericEnum[vs.weight], vs.size, vs.oneWeightOffset(4) + globalVertexOffset);
			}
			for (var n = 0; n < vs.realWeightCount; n++) {
				program.getUniform("matrixBone" + n).setMat4x3(this.state.skinning.boneMatrices[n]);
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

		this.updateState(program, vs, batch.primType);
		//this.setProgramParameters(gl, program, vs);

		// vertex: VertexState({"address":5833460,"texture":2,"color":7,"normal":0,"position":3,"weight":0,"index":0,"realWeightCount":0,"morphingVertexCount":0,"transform2D":true})
		// jspspemu.js:14054 [0, 1, 2, 3, 4, 5, 6, 7, 6, 7]
		if (this.clearing) {
			this.textureHandler.unbindTexture(program, state);
		} else {
			this.prepareTexture(gl, program, vs, data, batch);
		}
		
		if (vs.hasTexture) {
			this.calcTexMatrix(vs);
			program.getUniform('u_texMatrix').setMat4(this.texMat);
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexbuffer);
		gl.drawElements(convertPrimitiveType[primType], batch.indexCount, gl.UNSIGNED_SHORT, indexStart);
		
		if (vs.hasPosition) program.vPosition.disable();
		if (vs.hasColor) program.vColor.disable();
		if (vs.hasTexture) program.vTexcoord.disable();
		if (vs.hasNormal) program.vNormal.disable();
		
		if (vs.realWeightCount > 0) {
			program.vertexWeight1.disable();
			if (vs.realWeightCount > 4) {
				program.vertexWeight2.disable();
			}
		}
	}

	private testCount = 20;
	private positionData = new FastFloat32Buffer();
	private colorData = new FastFloat32Buffer();
	private textureData = new FastFloat32Buffer();
	private normalData = new FastFloat32Buffer();
	private vertexWeightData1 = new FastFloat32Buffer();
	private vertexWeightData2 = new FastFloat32Buffer();

	private lastBaseAddress = 0;

	tempVec = new Float32Array([0, 0, 0])
	texMat = mat4.create();

	private prepareTexture(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexInfo: VertexInfo, buffer:ArrayBuffer, batch: _vertex.OptimizedBatchTransfer) {
		if (vertexInfo.hasTexture && this.enableTextures) {
			this.textureHandler.bindTexture(program, this.state, this.enableBilinear, buffer, batch);
		} else {
			this.textureHandler.unbindTexture(program, this.state);
		}
	}

	private calcTexMatrix(vertexInfo: VertexInfo) {
		var texture = this.state.texture;
		var mipmap = texture.mipmaps[0];
		mat4.identity(this.texMat);
		var t = this.tempVec;
		if (vertexInfo.transform2D) {
			t[0] = 1.0 / (mipmap.bufferWidth); t[1] = 1.0 / (mipmap.textureHeight); t[2] = 1.0; mat4.scale(this.texMat, this.texMat, t);
		} else {
			switch (texture.textureMapMode) {
				case TextureMapMode.GU_TEXTURE_COORDS:
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

	private setProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexInfo: VertexInfo) {
		program.getUniform('u_modelViewProjMatrix').setMat4(vertexInfo.transform2D ? this.transformMatrix2d : this.transformMatrix);

		program.getAttrib("vPosition").setFloats(3, this.positionData.slice());
		if (vertexInfo.hasTexture) {
			program.getUniform('tfx').set1i(this.state.texture.effect);
			program.getUniform('tcc').set1i(this.state.texture.colorComponent);
			program.getAttrib("vTexcoord").setFloats(3, this.textureData.slice());
		}

		if (vertexInfo.hasNormal) {
			program.getAttrib("vNormal").setFloats(3, this.normalData.slice());
		}

		if (vertexInfo.realWeightCount > 0) {
			//debugger;
			program.getAttrib('vertexWeight1').setFloats(4, this.vertexWeightData1.slice());
			if (vertexInfo.realWeightCount > 4) {
				program.getAttrib('vertexWeight2').setFloats(4, this.vertexWeightData2.slice());
			}
			for (var n = 0; n < vertexInfo.realWeightCount; n++) {
				program.getUniform("matrixBone" + n).setMat4x3(this.state.skinning.boneMatrices[n]);
				//program.getUniform("matrixBone" + n).setMat4x3(this.state.skinning.linear, 12 * n);
			}
		}

		if (vertexInfo.hasColor) {
			program.getAttrib("vColor").setFloats(4, this.colorData.slice());
		} else {
			var ac = this.state.ambientModelColor;
			//console.log(ac.r, ac.g, ac.b, ac.a);
			program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
		}

		if (vertexInfo.hasTexture) {
			this.calcTexMatrix(vertexInfo);
			program.getUniform('u_texMatrix').setMat4(this.texMat);
		}
	}

	private unsetProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexInfo: VertexInfo) {
		program.getAttrib("vPosition").disable();
		if (vertexInfo.hasTexture) program.getAttrib("vTexcoord").disable();
		if (vertexInfo.hasNormal) program.getAttrib("vNormal").disable();
		if (vertexInfo.hasColor) program.getAttrib("vColor").disable();
		if (vertexInfo.realWeightCount >= 1) program.getAttrib('vertexWeight1').disable();
		if (vertexInfo.realWeightCount >= 4) program.getAttrib('vertexWeight2').disable();
	}
}

var convertPrimitiveType = new Int32Array([GL.POINTS, GL.LINES, GL.LINE_STRIP, GL.TRIANGLES, GL.TRIANGLE_STRIP, GL.TRIANGLE_FAN, GL.TRIANGLES /*sprites*/]);
var convertVertexNumericEnum = new Int32Array([0, GL.BYTE, GL.SHORT, GL.FLOAT]);
var convertVertexNumericUnsignedEnum = new Int32Array([0, GL.UNSIGNED_BYTE, GL.UNSIGNED_SHORT, GL.FLOAT]);
