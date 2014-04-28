import _state = require('../state');
import _utils = require('./utils');
import _pixelformat = require('../../pixelformat');
import _memory = require('../../memory');

import PixelFormat = _pixelformat.PixelFormat;
import PixelFormatUtils = _pixelformat.PixelFormatUtils;
import PixelConverter = _pixelformat.PixelConverter;
import WrappedWebGLProgram = _utils.WrappedWebGLProgram;
import Memory = _memory.Memory;

export class Texture {
	private texture: WebGLTexture;
	recheckTimestamp: number;
	valid: boolean = true;
	hash1: number;
	hash2: number;
	private address: number;
	private pixelFormat: PixelFormat;
	private clutFormat: PixelFormat;

	constructor(private gl: WebGLRenderingContext) {
		this.texture = gl.createTexture();
		console.warn('New texture allocated!', this.texture);
	}

	setInfo(state: _state.GpuState) {
		var texture = state.texture;
		var mipmap = texture.mipmaps[0];

		this.address = mipmap.address;
		this.pixelFormat = texture.pixelFormat;
		this.clutFormat = texture.clut.pixelFormat;
	}

	private _create(callbackTex2D: () => void) {
		var gl = this.gl;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		callbackTex2D();
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	fromBytes(data: ArrayBufferView, width: number, height: number) {
		var gl = this.gl;

		this._create(() => {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, <any>data);
		});
	}

	fromCanvas(canvas: HTMLCanvasElement) {
		var gl = this.gl;

		this._create(() => {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, <any>canvas);
		});

	}

	bind(textureUnit: number) {
		var gl = this.gl;

		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	static hashFast(state: _state.GpuState) {
		if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
			return state.texture.clut.adress + (state.texture.mipmaps[0].address * Math.pow(2, 24));
		} else {
			return state.texture.mipmaps[0].address;
		}
	}

	static hashSlow(memory: Memory, state: _state.GpuState) {
		var texture = state.texture;
		var mipmap = texture.mipmaps[0];
		var clut = texture.clut;

		var hash_number = 0;

		hash_number += (texture.swizzled ? 1 : 0) << 0;
		hash_number += (texture.pixelFormat) << 1;
		hash_number += (mipmap.bufferWidth) << 3;
		hash_number += (mipmap.textureWidth) << 6;
		hash_number += (mipmap.textureHeight) << 8;
		hash_number += memory.hash(mipmap.address, PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)) * Math.pow(2, 16);

		if (PixelFormatUtils.hasClut(texture.pixelFormat)) {
			hash_number += memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)) * Math.pow(2, 28);
			hash_number += clut.info << 17;
		}
		return hash_number;
	}

	toString() {
		var out = '';
		out += 'Texture(address = ' + this.address + ', hash1 = ' + this.hash1 + ', hash2 = ' + this.hash2 + ', pixelFormat = ' + this.pixelFormat + '';
		if (PixelFormatUtils.hasClut(this.pixelFormat)) {
			out += ', clutFormat=' + this.clutFormat;
		}
		out += ')';
		return out;
	}
}

export class TextureHandler {
	constructor(private memory: Memory, private gl: WebGLRenderingContext) {
		memory.invalidateDataRange.add((range) => this.invalidatedMemory(range));
	}

	private texturesByHash2: StringDictionary<Texture> = {};
	private texturesByHash1: StringDictionary<Texture> = {};
	private texturesByAddress: NumberDictionary<Texture> = {};
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
		if (this.invalidatedMemoryFlag) {
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

	bindTexture(prog: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;

		var mipmap = state.texture.mipmaps[0];

		var hash1 = Texture.hashFast(state);
		var texture = this.texturesByHash1[hash1];
		//if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
		if (this.mustRecheckSlowHash(texture)) {
			var hash2 = Texture.hashSlow(this.memory, state);

			//console.log(hash);

			texture = this.texturesByHash2[hash2];

			if (!texture) {
				if (!this.texturesByAddress[mipmap.address]) {
					this.texturesByAddress[mipmap.address] = new Texture(gl);
				}

				texture = this.texturesByHash2[hash2] = this.texturesByHash1[hash1] = this.texturesByAddress[mipmap.address];

				texture.setInfo(state);
				texture.hash1 = hash1;
				texture.hash2 = hash2;

				//this.updatedTextures.add(texture);

				texture.recheckTimestamp = this.recheckTimestamp;

				var mipmap = state.texture.mipmaps[0];

				var h = mipmap.textureHeight;
				var w = mipmap.textureWidth;
				var w2 = mipmap.bufferWidth;

				var data2 = new Uint8Array(w2 * h * 4);

				var clut = state.texture.clut;
				var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
				var paletteU8 = new Uint8Array(paletteBuffer);
				var palette = new Uint32Array(paletteBuffer);

				if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
					PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
				}

				//console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);

				if (state.texture.swizzled) {
					PixelConverter.unswizzleInline(state.texture.pixelFormat, this.memory.buffer, mipmap.address, w2, h);
				}
				PixelConverter.decode(state.texture.pixelFormat, this.memory.buffer, mipmap.address, data2, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

				if (true) {
					texture.fromBytes(data2, w2, h);
				} else {
					var canvas = document.createElement('canvas');
					canvas.width = w;
					canvas.height = h;
					var ctx = canvas.getContext('2d');
					var imageData = ctx.createImageData(w2, h);
					var u8 = imageData.data;

					ctx.clearRect(0, 0, w, h);
					for (var n = 0; n < w2 * h * 4; n++) u8[n] = data2[n];
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
		}

		this.lastTexture = texture;

		texture.bind(0);
		prog.getUniform('uSampler').set1i(0);

		prog.getUniform('samplerClut').set1i(1);
	}

	unbindTexture(program: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}
