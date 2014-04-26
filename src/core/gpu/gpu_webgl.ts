﻿module core.gpu.impl {
	class WrappedWebGLUniform {
		private location: WebGLUniformLocation;

		constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, private name: string) {
			this.location = gl.getUniformLocation(program, name);
		}

		setMat4(data: Float32Array) {
			this.gl.uniformMatrix4fv(this.location, false, data);
		}

		set1i(value: number) {
			this.gl.uniform1i(this.location, value);
		}

		set4f(x: number, y: number, z: number, w: number) {
			this.gl.uniform4f(this.location, x, y, z, w);
		}
	}

	class WrappedWebGLAttrib {
		private location: number;
		private buffer: WebGLBuffer;

		constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, private name: string) {
			this.location = gl.getAttribLocation(program, name);
		}

		enable() {
			if (this.location < 0) return;
			this.gl.enableVertexAttribArray(this.location);
		}

		disable() {
			if (this.location < 0) return;
			this.gl.disableVertexAttribArray(this.location);
		}

		setFloats(rsize: number, arr: FastFloat32Buffer) {
			if (this.location < 0) return;

			var gl = this.gl;
			if (!this.buffer) this.buffer = this.gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
			(<any>gl.bufferData)(gl.ARRAY_BUFFER, arr.slice(), gl.STATIC_DRAW);
			this.enable();
			gl.vertexAttribPointer(this.location, rsize, gl.FLOAT, false, 0, 0);
		}
	}

	class WrappedWebGLProgram {
		private uniforms: StringDictionary<WrappedWebGLUniform> = {};
		private attribs: StringDictionary<WrappedWebGLAttrib> = {};

		constructor(private gl: WebGLRenderingContext, private program: WebGLProgram) {
		}

		use() {
			this.gl.useProgram(this.program);
		}

		getUniform(name: string) {
			var uniform = this.uniforms[name];
			if (!uniform) uniform = this.uniforms[name] = new WrappedWebGLUniform(this.gl, this.program, name);
			return uniform;
		}

		getAttrib(name: string) {
			var attrib = this.attribs[name];
			if (!attrib) attrib = this.attribs[name] = new WrappedWebGLAttrib(this.gl, this.program, name);
			return attrib;
		}
	}

	class ShaderCache {
		private programs: NumberDictionary<WrappedWebGLProgram> = {};

		constructor(private gl: WebGLRenderingContext, private shaderVertString: string, private shaderFragString: string) {
		}

		getProgram(vertex: VertexState, state: GpuState) {
			var hash = vertex.hash;
			hash += Math.pow(2, 32) * (state.alphaTest.enabled ? 1 : 0);
			if (this.programs[hash]) return this.programs[hash];
			return this.programs[hash] = this.createProgram(vertex, state);
		}

		createProgram(vertex: VertexState, state: GpuState) {
			var defines = [];
			if (vertex.hasColor) defines.push('VERTEX_COLOR');
			if (vertex.hasTexture) defines.push('VERTEX_TEXTURE');
			if (state.alphaTest.enabled) defines.push('ALPHATEST');

			var preppend = defines.map(item => '#define ' + item + ' 1').join("\n");

			return ShaderCache.shaderProgram(
				this.gl,
				preppend + "\n" + this.shaderVertString,
				preppend + "\n" + this.shaderFragString
			);
		}

		static shaderProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
			var prog = gl.createProgram();
			var addshader = function (type, source) {
				var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
				gl.shaderSource(s, source);
				gl.compileShader(s);
				if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s) + "\n\n" + source));
				gl.attachShader(prog, s);
			};
			addshader('vertex', vs);
			addshader('fragment', fs);
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw (new Error("Could not link the shader program!"));
			return new WrappedWebGLProgram(gl, prog);
		}
	}

	class Texture {
		private texture: WebGLTexture;
		recheckTimestamp: number;
		valid: boolean = true;
		hash1: number;
		hash2: number;
		address: number;

		constructor(private gl: WebGLRenderingContext) {
			this.texture = gl.createTexture();
		}

		fromCanvas(canvas: HTMLCanvasElement) {
			var gl = this.gl;

			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, <any>canvas);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);

		}

		bind() {
			var gl = this.gl;

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}

		static hashFast(state: GpuState) {
			if (state.texture.isPixelFormatWithClut()) {
				return state.texture.clut.adress + (state.texture.mipmaps[0].address * Math.pow(2, 24));
			} else {
				return state.texture.mipmaps[0].address;
			}
		}

		static hashSlow(memory: Memory, state: GpuState) {
			var texture = state.texture;
			var mipmap = texture.mipmaps[0];
			var clut = texture.clut;

			var hash_number = 0;

			hash_number += (texture.swizzled ? 1 : 0) << 0;
			hash_number += (texture.pixelFormat) << 1;
			hash_number += (mipmap.bufferWidth) << 3;
			hash_number += (mipmap.textureWidth) << 6;
			hash_number += (mipmap.textureHeight) << 8;
			hash_number += memory.hash(mipmap.address, PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)) * Math.pow(2, 24);

			if (texture.isPixelFormatWithClut()) {
				hash_number += memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)) * Math.pow(2, 28);
				hash_number += clut.info << 17;
			}
			return hash_number;
		}

		toString() {
			return 'Texture(address:' + this.address + ' : hash1: ' + this.hash1 + ' : hash2: ' + this.hash2 + ')';
		}
	}

	class TextureHandler {
		constructor(private memory: Memory, private gl: WebGLRenderingContext) {
			memory.invalidateDataRange.add((range) => this.invalidatedMemory(range));
		}

		private texturesByHash2: StringDictionary<Texture> = {};
		private texturesByHash1: StringDictionary<Texture> = {};
		private recheckTimestamp: number = 0;
		private lastTexture: Texture;
		//private updatedTextures = new SortedSet<Texture>();

		private invalidatedMemoryFlag: boolean = true;

		flush() {
			if (this.lastTexture) {
				//this.lastTexture.valid = false;
			}
			//this.invalidatedMemory({ start: 0, end : 0xFFFFFFFF });
			//this.recheckTimestamp = performance.now();

			/*
			this.updatedTextures.forEach((texture) => {
				texture.valid = false;
			});
			this.updatedTextures = new SortedSet<Texture>(); 
			*/
			if (this.invalidatedMemoryFlag)
			{
				this.invalidatedMemoryFlag = false;
				this._invalidatedMemory();
			}
		}

		sync() {
			// sceGuCopyImage

			//this.recheckTimestamp = performance.now();
		}

		private _invalidatedMemory() {
			// should invalidate just  the right textures
			for (var hash1 in this.texturesByHash1) {
				var texture = this.texturesByHash1[hash1];
				texture.valid = false;
			}

			for (var hash2 in this.texturesByHash2) {
				var texture = this.texturesByHash2[hash2];
				texture.valid = false;
			}
		}

		private invalidatedMemory(range: NumericRange) {
			this.invalidatedMemoryFlag = true;

			//this._invalidatedMemory();

			//this.recheckTimestamp = performance.now();
			//console.warn('invalidatedMemory: ' + JSON.stringify(range));
		}

		private mustRecheckSlowHash(texture: Texture) {
			//return !texture || !texture.valid || this.recheckTimestamp >= texture.recheckTimestamp;
			return !texture || !texture.valid;
		}

		bindTexture(prog: WrappedWebGLProgram, state: GpuState) {
			var gl = this.gl;

			var hash1 = Texture.hashFast(state);
			var texture = this.texturesByHash1[hash1];
			//if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
			if (this.mustRecheckSlowHash(texture)) {
				var hash2 = Texture.hashSlow(this.memory, state);

				//console.log(hash);

				if (!this.texturesByHash2[hash2]) {
					var texture = this.texturesByHash2[hash2] = this.texturesByHash1[hash1] = new Texture(gl);

					texture.address = state.texture.mipmaps[0].address;
					texture.hash1 = hash1;
					texture.hash2 = hash2;

					//this.updatedTextures.add(texture);

					texture.recheckTimestamp = this.recheckTimestamp;

					var mipmap = state.texture.mipmaps[0];

					var h = mipmap.textureHeight;
					var w = mipmap.textureWidth;
					var w2 = mipmap.bufferWidth;

					var canvas = document.createElement('canvas');

					//$(document.body).append(canvas);

					canvas.width = w;
					canvas.height = h;
					var ctx = canvas.getContext('2d');
					var imageData = ctx.createImageData(w2, h);
					var u8 = imageData.data;

					var clut = state.texture.clut;
					var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
					var paletteU8 = new Uint8Array(paletteBuffer);
					var palette = new Uint32Array(paletteBuffer);

					if (state.texture.isPixelFormatWithClut()) {
						PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
					}

					//console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);

					if (state.texture.swizzled) {
						PixelConverter.unswizzleInline(state.texture.pixelFormat, this.memory.buffer, mipmap.address, w2, h);
					}
					PixelConverter.decode(state.texture.pixelFormat, this.memory.buffer, mipmap.address, u8, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

					ctx.clearRect(0, 0, w, h);
					ctx.putImageData(imageData, 0, 0);

					console.error('generated texture!' + texture.toString());
					$(document.body).append(
						$('<div style="color:white;" />')
							.append(canvas)
							.append(texture.toString())
					);

					texture.fromCanvas(canvas);
				}
			}

			this.lastTexture = texture;
			texture.bind();
			prog.getUniform('uSampler').set1i(0);
		}

		unbindTexture(program: WrappedWebGLProgram, state: GpuState) {
			var gl = this.gl;
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	class FastFloat32Buffer {
		private arrayBuffer = new ArrayBuffer(4 * 64 * 1024);
		private float32Array = new Float32Array(this.arrayBuffer);
		private index = 0;

		restart() {
			this.index = 0;
		}

		push(value: number) {
			this.float32Array[this.index++] = value;
		}

		push2(x: number, y: number) {
			this.float32Array[this.index++] = x;
			this.float32Array[this.index++] = y;
		}

		push3(x: number, y: number, z:number) {
			this.float32Array[this.index++] = x;
			this.float32Array[this.index++] = y;
			this.float32Array[this.index++] = z;
		}

		push4(x: number, y: number, z: number, w:number) {
			this.float32Array[this.index++] = x;
			this.float32Array[this.index++] = y;
			this.float32Array[this.index++] = z;
			this.float32Array[this.index++] = w;
		}

		slice() {
			return new Float32Array(this.arrayBuffer, 0, this.index * 4);
		}
	}

	export class WebGlPspDrawDriver implements IDrawDriver {
		private gl: WebGLRenderingContext;
		private cache: ShaderCache;
		private textureHandler: TextureHandler;

		constructor(private memory: Memory, private display: IPspDisplay, private canvas: HTMLCanvasElement) {
			this.gl = this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
			if (!this.gl) this.canvas.getContext('webgl', { preserveDrawingBuffer: true });

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

		setClearMode(clearing: boolean, flags: number) {
			this.clearing = clearing;
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

		private updateState(program: WrappedWebGLProgram) {
			var state = this.state;
			var gl = this.gl;
			if (this.enableDisable(gl.CULL_FACE, state.culling.enabled)) {
				gl.cullFace((state.culling.direction == CullingDirection.ClockWise) ? gl.FRONT : gl.BACK);
			}

			var blending = state.blending;
			if (this.enableDisable(gl.BLEND, state.blending.enabled)) {

				gl.blendFunc(gl.SRC_COLOR + state.blending.functionSource, gl.SRC_COLOR + state.blending.functionDestination);
				switch (state.blending.equation) {
					case GuBlendingEquation.Abs:
					case GuBlendingEquation.Max:
					case GuBlendingEquation.Min:
					case GuBlendingEquation.Add: gl.blendEquation(gl.FUNC_ADD); break;
					case GuBlendingEquation.Substract: gl.blendEquation(gl.FUNC_SUBTRACT); break;
					case GuBlendingEquation.ReverseSubstract: gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); break;
				}
			}

			var alphaTest = state.alphaTest;
			if (alphaTest.enabled) {
				//console.log(TestFunctionEnum[alphaTest.func] + '; ' + alphaTest.value + '; ' + alphaTest.mask);
				program.getUniform('alphaTestFunc').set1i(alphaTest.func);
				program.getUniform('alphaTestReference').set1i(alphaTest.value);
				program.getUniform('alphaTestMask').set1i(alphaTest.mask);
			}

			var ratio = this.getScaleRatio();

			this.gl.viewport(this.state.viewPort.x1, this.state.viewPort.y1, this.state.viewPort.width * ratio, this.state.viewPort.height * ratio);
		}

		getScaleRatio() {
			return this.canvas.width / 480;
		}

		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			this.display.setEnabledDisplay(false);

			if (primitiveType == PrimitiveType.Sprites) {
				return this.drawSprites(vertices, count, vertexState);
			} else {
				return this.drawElementsInternal(primitiveType, vertices, count, vertexState);
			}
		}

		textureFlush(state: GpuState) {
			this.textureHandler.flush();
		}

		textureSync(state: GpuState) {
			this.textureHandler.sync();
		}

		private drawSprites(vertices: Vertex[], count: number, vertexState: VertexState) {
			var vertices2 = [];

			for (var n = 0; n < count; n += 2) {
				var v0 = vertices[n + 0];
				var v1 = vertices[n + 1];

				//console.log(sprintf('%f, %f : %f, %f', v1.px, v1.py, v1.tx, v1.ty));

				v0.r = v1.r;
				v0.g = v1.g;
				v0.b = v1.b;
				v0.a = v1.a;
				var vtl = v0.clone();
				var vtr = v0.clone();
				var vbl = v1.clone();
				var vbr = v1.clone();

				vtr.px = v1.px;
				vbl.px = v0.px;

				vtr.tx = v1.tx;
				vbl.tx = v0.tx;

				vertices2.push(vtl, vtr, vbl);
				vertices2.push(vtr, vbr, vbl);
			}
			this.drawElementsInternal(PrimitiveType.Triangles, vertices2, vertices2.length, vertexState);
		}

		private testCount = 20;
		private positionData = new FastFloat32Buffer();
		private colorData = new FastFloat32Buffer();
		private textureData = new FastFloat32Buffer();
		private lastBaseAddress = 0;

		private demuxVertices(vertices: Vertex[], count: number, vertexState: VertexState) {
			var textureState = this.state.texture;

			this.positionData.restart();
			this.colorData.restart();
			this.textureData.restart();

			for (var n = 0; n < count; n++) {
				var v = vertices[n];
				this.positionData.push3(v.px, v.py, v.pz);

				if (vertexState.hasColor) {
					this.colorData.push4(v.r, v.g, v.b, v.a);
				}
				if (vertexState.hasTexture) {
					if (vertexState.transform2D) {
						this.textureData.push3(
							v.tx / this.state.texture.mipmaps[0].bufferWidth,
							v.ty / this.state.texture.mipmaps[0].textureHeight,
							1.0
							);
					} else {
						this.textureData.push3(
							v.tx * textureState.scaleU,
							v.ty * textureState.scaleV,
							v.tz
							);
					}
				}
			}
		}

		private setProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: VertexState) {
			program.getUniform('u_modelViewProjMatrix').setMat4(vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

			program.getAttrib("vPosition").setFloats(3, this.positionData);
			if (vertexState.hasTexture) {
				program.getUniform('tfx').set1i(this.state.texture.effect);
				program.getUniform('tcc').set1i(this.state.texture.colorComponent);
				program.getAttrib("vTexcoord").setFloats(3, this.textureData);
			}
			if (vertexState.hasColor) {
				program.getAttrib("vColor").setFloats(4, this.colorData);
			} else {
				var ac = this.state.ambientModelColor;
				//console.log(ac.r, ac.g, ac.b, ac.a);

				program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
			}
		}

		private unsetProgramParameters(gl: WebGLRenderingContext, program: WrappedWebGLProgram, vertexState: VertexState) {
			program.getAttrib("vPosition").disable();
			if (vertexState.hasTexture) program.getAttrib("vTexcoord").disable();
			if (vertexState.hasColor) program.getAttrib("vColor").disable();
		}

		private drawArraysActual(gl: WebGLRenderingContext, primitiveType: PrimitiveType, count:number) {
			switch (primitiveType) {
				case PrimitiveType.Points: gl.drawArrays(gl.POINTS, 0, count); break;
				case PrimitiveType.Lines:
				case PrimitiveType.LineStrip:
					gl.lineWidth(this.getScaleRatio());
					if (primitiveType == PrimitiveType.Lines) {
						gl.drawArrays(gl.LINES, 0, count);
					} else {
						gl.drawArrays(gl.LINE_STRIP, 0, count);
					}
					break;
				case PrimitiveType.Triangles: gl.drawArrays(gl.TRIANGLES, 0, count); break;
				case PrimitiveType.TriangleStrip: gl.drawArrays(gl.TRIANGLE_STRIP, 0, count); break;
				case PrimitiveType.TriangleFan: gl.drawArrays(gl.TRIANGLE_FAN, 0, count); break;
			}
		}

		drawElementsInternal(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			//console.log(primitiveType);

			var gl = this.gl;

			var program = this.cache.getProgram(vertexState, this.state);
			program.use();
			this.updateState(program);

			if (this.clearing) {
				this.textureHandler.unbindTexture(program, this.state);
				gl.clearColor(0, 0, 0, 1);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				return;
			}

			if (vertexState.hasTexture) {
				this.textureHandler.bindTexture(program, this.state);
			} else {
				this.textureHandler.unbindTexture(program, this.state);
			}

			this.demuxVertices(vertices, count, vertexState);
			this.setProgramParameters(gl, program, vertexState);
			this.drawArraysActual(gl, primitiveType, count);
			this.unsetProgramParameters(gl, program, vertexState);
		}
	}
}
