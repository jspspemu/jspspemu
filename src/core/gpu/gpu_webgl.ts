module core.gpu.impl {
	class ShaderCache {
		private programs: StringDictionary<WebGLProgram> = {};

		constructor(private gl: WebGLRenderingContext, private shaderVertString: string, private shaderFragString: string) {
		}

		getProgram(vertex: VertexState) {
			var hash = vertex.hash;
			if (this.programs[hash]) return this.programs[hash];
			return this.programs[hash] = this.createProgram(vertex);
		}

		createProgram(vertex: VertexState) {
			var defines = [];
			if (vertex.hasColor) defines.push('VERTEX_COLOR');
			if (vertex.hasTexture) defines.push('VERTEX_TEXTURE');

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
			return prog;
		}
	}

	class Texture {
		private texture: WebGLTexture;

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

		static hash(memory: Memory, state: GpuState) {
			var mipmap = state.texture.mipmaps[0];
			var clut = state.texture.clut;

			var hash = '';

			hash += '_' + state.texture.pixelFormat;
			hash += '_' + mipmap.bufferWidth;
			hash += '_' + mipmap.textureWidth;
			hash += '_' + mipmap.textureHeight;
			hash += '_' + memory.hash(mipmap.address, PixelConverter.getSizeInBytes(state.texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth));
			if (state.texture.isPixelFormatWithClut) {
				hash += '_' + memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors));
				hash += '_' + clut.mask;
				hash += '_' + clut.numberOfColors;
				hash += '_' + clut.pixelFormat;
				hash += '_' + clut.shift;
				hash += '_' + clut.start;
			}
			return hash;
		}
	}

	class TextureHandler {
		constructor(private memory: Memory, private gl: WebGLRenderingContext) {
		}

		private textures: StringDictionary<Texture> = {};

		bindTexture(program: WebGLProgram, state: GpuState) {
			var gl = this.gl;
			var hash = Texture.hash(this.memory, state);

			//console.log(hash);

			if (!this.textures[hash])
			{
				var texture = this.textures[hash] = new Texture(gl);

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

				if (state.texture.isPixelFormatWithClut) {
					PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
				}

				//console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);
				
				PixelConverter.decode(state.texture.pixelFormat, this.memory.buffer, mipmap.address, u8, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

				ctx.clearRect(0, 0, w, h);
				ctx.putImageData(imageData, 0, 0);

				texture.fromCanvas(canvas);
			}
			
			this.textures[hash].bind();
			gl.uniform1i(gl.getUniformLocation(program, "uSampler"), 0);

		}

		unbindTexture(program: WebGLProgram, state: GpuState) {
			var gl = this.gl;
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, null);
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
			if (this.enableDisable(this.gl.CULL_FACE, state.culling.enabled)) {
				this.gl.cullFace((state.culling.direction == CullingDirection.ClockWise) ? this.gl.FRONT : this.gl.BACK);
			}

			this.gl.enable(this.gl.BLEND);
			this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

			this.gl.viewport(this.state.viewPort.x1, this.state.viewPort.y1, this.state.viewPort.width * 2, this.state.viewPort.height * 2);

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

		drawElementsInternal(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			//console.log(primitiveType);

			var gl = this.gl;

			if (this.clearing) {
				gl.clearColor(0, 0, 0, 1);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			}

			var program = this.cache.getProgram(vertexState);

			gl.useProgram(program);

			var textureState = this.state.texture;

			var positionData = [];
			var colorData = [];
			var textureData = [];
			for (var n = 0; n < count; n++) {
				var v = vertices[n];
				positionData.push(v.px); positionData.push(v.py); positionData.push(v.pz);

				if (vertexState.hasColor) { colorData.push(v.r); colorData.push(v.g); colorData.push(v.b); colorData.push(v.a); }
				if (vertexState.hasTexture) {
					if (vertexState.transform2D) {
						textureData.push(v.tx / this.state.texture.mipmaps[0].bufferWidth);
						textureData.push(v.ty / this.state.texture.mipmaps[0].textureHeight);
						textureData.push(1.0);
					} else {
						textureData.push(v.tx * textureState.scaleU);
						textureData.push(v.ty * textureState.scaleV);
						textureData.push(v.tz);
					}
				}
			}

			if (vertexState.hasTexture) {
				this.textureHandler.bindTexture(program, this.state);
			} else {
				this.textureHandler.unbindTexture(program, this.state);
			}

			if (this.testCount-- >= 0) {
				//console.log(textureData);
				//console.log(this.state.texture);
			}

			this.uniformSetMat4(gl, program, 'u_modelViewProjMatrix', vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

			this.attributeSetFloats(gl, program, "vPosition", 3, positionData);
			if (vertexState.hasTexture) {
				gl.uniform1i(gl.getUniformLocation(program, 'tfx'), this.state.texture.effect);
				gl.uniform1i(gl.getUniformLocation(program, 'tcc'), this.state.texture.colorComponent);
				this.attributeSetFloats(gl, program, "vTexcoord", 3, textureData);
			}
			if (vertexState.hasColor) {
				this.attributeSetFloats(gl, program, "vColor", 4, colorData);
			} else {
				var ac = this.state.ambientModelColor;
				//console.log(ac.r, ac.g, ac.b, ac.a);
				gl.uniform4f(gl.getUniformLocation(program, 'uniformColor'), ac.r, ac.g, ac.b, ac.a);
			}

			switch (primitiveType) {
				case PrimitiveType.Points: gl.drawArrays(gl.POINTS, 0, count); break;
				case PrimitiveType.Lines: gl.drawArrays(gl.LINES, 0, count); break;
				case PrimitiveType.LineStrip: gl.drawArrays(gl.LINE_STRIP, 0, count); break;
				case PrimitiveType.Triangles: gl.drawArrays(gl.TRIANGLES, 0, count); break;
				case PrimitiveType.TriangleStrip: gl.drawArrays(gl.TRIANGLE_STRIP, 0, count); break;
				case PrimitiveType.TriangleFan: gl.drawArrays(gl.TRIANGLE_FAN, 0, count); break;
			}

			this.attributeDisable(gl, program, 'vPosition');
			if (vertexState.hasTexture) this.attributeDisable(gl, program, 'vTexcoord');
			if (vertexState.hasColor) this.attributeDisable(gl, program, 'vColor');
		}

		uniformSetMat4(gl: WebGLRenderingContext, prog: WebGLProgram, uniform_name: string, arr: number[]) {
			var uniform = gl.getUniformLocation(prog, uniform_name);
			if (uniform) gl.uniformMatrix4fv(uniform, false, new Float32Array(arr));
		}

		attributeDisable(gl: WebGLRenderingContext, prog: WebGLProgram, attr_name: string) {
			var attr = gl.getAttribLocation(prog, attr_name);
			if (attr >= 0) {
				gl.disableVertexAttribArray(attr);
			}
		}

		private buffers: StringDictionary<WebGLBuffer> = {};

		attributeSetFloats(gl: WebGLRenderingContext, prog: WebGLProgram, attr_name: string, rsize: number, arr: number[]) {
			if (!this.buffers[attr_name]) this.buffers[attr_name] = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[attr_name]);
			var varr = new Float32Array(arr);
			(<any>gl.bufferData)(gl.ARRAY_BUFFER, varr, gl.STATIC_DRAW);
			var attr = gl.getAttribLocation(prog, attr_name);
			if (attr >= 0) {
				gl.enableVertexAttribArray(attr);
				gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
			}
		}
	}
}
