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
			if (vertex.hasColor) defines.push('#define VERTEX_COLOR 1');
			if (vertex.hasTexture) defines.push('#define VERTEX_TEXTURE 1');

			return ShaderCache.shaderProgram(
				this.gl,
				defines.join("\n") + "\n" + this.shaderVertString,
				defines.join("\n") + "\n" + this.shaderFragString
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

	class TextureHandler {
		constructor(private memory: Memory, private gl: WebGLRenderingContext) {
		}

		bindTexture(program:WebGLProgram, state: GpuState) {
			var gl = this.gl;
			var texture = gl.createTexture();

			var mipmap = state.texture.mipmaps[0];

			var h = mipmap.textureHeight;
			//var w2 = mipmap.textureWidth;
			//var w = mipmap.textureWidth, w2 = mipmap.textureWidth;
			var w = mipmap.textureWidth, w2 = mipmap.bufferWidth;
			//var w = mipmap.bufferWidth, w2 = mipmap.textureWidth;

			//printf("%d, %d", w, h);

			var canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			var ctx = canvas.getContext('2d');
			var imageData = ctx.createImageData(w2, h);
			var u8 = imageData.data;

			//console.error('pixelFormat:' + state.texture.pixelFormat);

			var clut = state.texture.clut;
			var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
			var paletteU8 = new Uint8Array(paletteBuffer);
			var palette = new Uint32Array(paletteBuffer);

			//console.log(sprintf("%08X,%d", clut.adress, clut.pixelFormat));
			switch (state.texture.pixelFormat) {
				case PixelFormat.PALETTE_T16:
				case PixelFormat.PALETTE_T8:
				case PixelFormat.PALETTE_T4:
					//console.log(sprintf('%08X', clut.adress));
					//var items = [];
					//for (var n = 0; n < 10; n++) items.push(this.memory.readUInt32(clut.adress + n * 4));
					//console.log(items.join(','));
					PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
					//console.log(palette);
					break;
			}

			//console.log(palette);

			PixelConverter.decode(state.texture.pixelFormat, this.memory.buffer, mipmap.address, u8, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);
			
			ctx.clearRect(0, 0, w, h);
			ctx.putImageData(imageData, 0, 0);

			//ctx.fillStyle = 'red';
			//ctx.fillRect(0, 0, w, h);

			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, <any>canvas);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
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

		constructor(private memory: Memory, private canvas: HTMLCanvasElement) {
			this.gl = this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });
			if (!this.gl) this.canvas.getContext('webgl', { preserveDrawingBuffer: false });

			this.gl.clear(this.gl.COLOR_BUFFER_BIT);

			this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, -1000, +1000);
		}

		private baseShaderFragString = '';
		private baseShaderVertString = '';

		initAsync() {
			return downloadFileAsync('src/core/gpu/shader.vert').then((shaderVert) => {
				return downloadFileAsync('src/core/gpu/shader.frag').then((shaderFrag) => {
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
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
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
		}

		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
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

			WebGlPspDrawDriver.uniformSetMat4(gl, program, 'u_modelViewProjMatrix', vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

			WebGlPspDrawDriver.attributeSetFloats(gl, program, "vPosition", 3, positionData);
			if (vertexState.hasTexture) {
				gl.uniform1i(gl.getUniformLocation(program, 'tfx'), this.state.texture.effect);
				gl.uniform1i(gl.getUniformLocation(program, 'tcc'), this.state.texture.colorComponent);
				WebGlPspDrawDriver.attributeSetFloats(gl, program, "vTexcoord", 3, textureData);
			}
			if (vertexState.hasColor) {
				WebGlPspDrawDriver.attributeSetFloats(gl, program, "vColor", 4, colorData);
			}

			switch (primitiveType) {
				case PrimitiveType.Points: gl.drawArrays(gl.POINTS, 0, count); break;
				case PrimitiveType.Lines: gl.drawArrays(gl.LINES, 0, count); break;
				case PrimitiveType.LineStrip: gl.drawArrays(gl.LINE_STRIP, 0, count); break;
				case PrimitiveType.Triangles: gl.drawArrays(gl.TRIANGLES, 0, count); break;
				case PrimitiveType.TriangleStrip: gl.drawArrays(gl.TRIANGLE_STRIP, 0, count); break;
				case PrimitiveType.TriangleFan: gl.drawArrays(gl.TRIANGLE_FAN, 0, count); break;
			}

			WebGlPspDrawDriver.attributeDisable(gl, program, 'vPosition');
			if (vertexState.hasTexture) WebGlPspDrawDriver.attributeDisable(gl, program, 'vTexcoord');
			if (vertexState.hasColor) WebGlPspDrawDriver.attributeDisable(gl, program, 'vColor');
		}

		static uniformSetMat4(gl: WebGLRenderingContext, prog: WebGLProgram, uniform_name: string, arr: number[]) {
			var uniform = gl.getUniformLocation(prog, uniform_name);
			if (uniform) gl.uniformMatrix4fv(uniform, false, new Float32Array(arr));
		}

		static attributeDisable(gl: WebGLRenderingContext, prog: WebGLProgram, attr_name: string) {
			var attr = gl.getAttribLocation(prog, attr_name);
			if (attr >= 0) {
				gl.disableVertexAttribArray(attr);
			}
		}

		static attributeSetFloats(gl: WebGLRenderingContext, prog: WebGLProgram, attr_name: string, rsize: number, arr: number[]) {
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
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