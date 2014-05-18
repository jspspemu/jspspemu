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
	recheckTimestamp = undefined;
	valid = true;
	validHint = true;
	swizzled = false;
	hash1: number;
	hash2: number;

	address_start: number;
	address_end: number

	clut_start: number;
	clut_end: number

	pixelFormat: PixelFormat;
	clutFormat: PixelFormat;
	width: number;
	height: number;

	constructor(private gl: WebGLRenderingContext) {
		this.texture = gl.createTexture();
	}

	setInfo(state: _state.GpuState) {
		var texture = state.texture;
		var mipmap = texture.mipmaps[0];
		var clut = texture.clut;

		this.swizzled = texture.swizzled;
		this.address_start = mipmap.address;
		this.address_end = mipmap.address + PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.bufferWidth * mipmap.textureHeight);
		this.pixelFormat = texture.pixelFormat;
		this.clutFormat = clut.pixelFormat;
		this.clut_start = clut.adress;
		this.clut_end = clut.adress + PixelConverter.getSizeInBytes(texture.clut.pixelFormat, clut.numberOfColors);
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

		this.width = width;
		this.height = height;
		this._create(() => {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, <any>data);
			//gl.generateMipmap(gl.TEXTURE_2D);
		});
	}

	fromCanvas(canvas: HTMLCanvasElement) {
		var gl = this.gl;

		this.width = canvas.width;
		this.height = canvas.height;
		this._create(() => {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, <any>canvas);
			//gl.generateMipmap(gl.TEXTURE_2D);
		});
	}

	bind(textureUnit: number, min: number, mag: number, wraps: number, wrapt: number) {
		var gl = this.gl;

		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
		if (!MathUtils.isPowerOfTwo(this.width) || !MathUtils.isPowerOfTwo(this.height)) wraps = wrapt = gl.CLAMP_TO_EDGE;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
	}

	static hashFast(state: _state.GpuState) {
		var result = state.texture.mipmaps[0].address;
		if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
			result += state.texture.clut.adress * Math.pow(2, 23);
		}
		result += (state.texture.swizzled ? 1 : 0) * Math.pow(2, 13);
		return result;
	}

	static hashSlow(memory: Memory, state: _state.GpuState) {
		var texture = state.texture;
		var mipmap = texture.mipmaps[0];
		var clut = texture.clut;

		var hash_number = 0;

		hash_number += (texture.swizzled ? 1 : 0) * Math.pow(2, 0);
		hash_number += (texture.pixelFormat) * Math.pow(2, 1);
		hash_number += (mipmap.bufferWidth) * Math.pow(2, 3);
		hash_number += (mipmap.textureWidth) * Math.pow(2, 6);
		hash_number += (mipmap.textureHeight) * Math.pow(2, 8);
		hash_number += memory.hash(mipmap.address, PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)) * Math.pow(2, 12);

		if (PixelFormatUtils.hasClut(texture.pixelFormat)) {
			hash_number += memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)) * Math.pow(2, 30);
			hash_number += clut.info * Math.pow(2, 26);
		}
		return hash_number;
	}

	toString() {
		var out = '';
		out += 'Texture(address = ' + this.address_start + ', hash1 = ' + this.hash1 + ', hash2 = ' + this.hash2 + ', pixelFormat = ' + this.pixelFormat + ', swizzled = ' + this.swizzled;
		if (PixelFormatUtils.hasClut(this.pixelFormat)) {
			out += ', clutFormat=' + this.clutFormat;
		}
		out += ')';
		return out;
	}
}

export class TextureHandler {
	constructor(private memory: Memory, private gl: WebGLRenderingContext) {
		memory.invalidateDataRange.add((range) => this.invalidatedMemoryRange(range));
		memory.invalidateDataAll.add(() => this.invalidatedMemoryAll());
	}

	private texturesByHash2: StringDictionary<Texture> = {};
	private texturesByHash1: StringDictionary<Texture> = {};
	private texturesByAddress: NumberDictionary<Texture> = {};
	private textures = <Texture[]>[];
	private recheckTimestamp: number = 0;
	private lastTexture: Texture;
	//private updatedTextures = new SortedSet<Texture>();

	flush() {
		for (var n = 0; n < this.textures.length; n++) {
			var texture = this.textures[n];
			if (!texture.validHint) {
				texture.valid = false;
				texture.validHint = true;
			}
		}
	}

	sync() {
	}

	private invalidatedMemoryAll() {
		for (var n = 0; n < this.textures.length; n++) {
			var texture = this.textures[n];
			//texture.validHint = false;
		}
	}

	private invalidatedMemoryRange(range: NumericRange) {
		for (var n = 0; n < this.textures.length; n++) {
			var texture = this.textures[n];
			if (texture.address_start >= range.start && texture.address_end <= range.end) {
				//debugger;
				//console.info('invalidated texture', range);
				texture.validHint = false;
			}
			if (texture.clut_start >= range.start && texture.clut_end <= range.end) {
				//debugger;
				//console.info('invalidated texture', range);
				texture.validHint = false;
			}
		}
	}

	private mustRecheckSlowHash(texture: Texture) {
		//return !texture || !texture.valid || this.recheckTimestamp >= texture.recheckTimestamp;
		return !texture || !texture.valid;
		//return !texture;
	}

	bindTexture(prog: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;

		var mipmap = state.texture.mipmaps[0];

		if (mipmap.bufferWidth == 0) return;
		if (mipmap.textureWidth == 0) return;
		if (mipmap.textureHeight == 0) return;

		var hash1 = Texture.hashFast(state);
		var texture = this.texturesByHash1[hash1];
		//if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
		if (this.mustRecheckSlowHash(texture)) {
			var hash2 = Texture.hashSlow(this.memory, state);

			//console.log(hash);

			texture = this.texturesByHash2[hash2];

			//if (!texture || !texture.valid) {
			if (!texture) {
				if (!this.texturesByAddress[mipmap.address]) {
					this.texturesByAddress[mipmap.address] = texture = new Texture(gl);
					this.textures.push(texture);
					console.warn('New texture allocated!', mipmap, state.texture);
				}

				texture = this.texturesByHash2[hash2] = this.texturesByHash1[hash1] = this.texturesByAddress[mipmap.address];

				texture.setInfo(state);
				texture.hash1 = hash1;
				texture.hash2 = hash2;
				texture.valid = true;

				//this.updatedTextures.add(texture);

				texture.recheckTimestamp = this.recheckTimestamp;

				var mipmap = state.texture.mipmaps[0];

				var h = mipmap.textureHeight;
				var w = mipmap.textureWidth;
				var w2 = mipmap.bufferWidth;

				var data2 = new Uint8Array(w2 * h * 4);

				var clut = state.texture.clut;

				if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
					clut.numberOfColors = Math.max(clut.numberOfColors, clut.mask + 1);
					//debugger;
				}

				var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
				var paletteU8 = new Uint8Array(paletteBuffer);
				var palette = new Uint32Array(paletteBuffer);

				if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
					//if (clut.pixelFormat == PixelFormat.RGBA_5551) debugger;
					PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
				}

				//console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);

				var dataBuffer = new ArrayBuffer(PixelConverter.getSizeInBytes(state.texture.pixelFormat, w2 * h));
				var data = new Uint8Array(dataBuffer);
				data.set(new Uint8Array(this.memory.buffer, mipmap.address, data.length));

				if (state.texture.swizzled) {
					PixelConverter.unswizzleInline(state.texture.pixelFormat, dataBuffer, 0, w2, h);
				}
				PixelConverter.decode(state.texture.pixelFormat, dataBuffer, 0, data2, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

				if (true) {
				//if (false) {
					texture.fromBytes(data2, w2, h);
				} else {
					var canvas = document.createElement('canvas');
					canvas.style.border = '1px solid white';
					canvas.width = w2;
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
							.append(texture.toString() + 'w=' + w + ',w2=' + w2 + ',' + h)
						);
					texture.fromCanvas(canvas);
				}
			}
		}

		this.lastTexture = texture;

		texture.bind(
			0,
			(state.texture.filterMinification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			(state.texture.filterMagnification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			//gl.NEAREST, gl.NEAREST,
			(state.texture.wrapU == _state.WrapMode.Clamp) ? gl.CLAMP_TO_EDGE : gl.REPEAT,
			(state.texture.wrapV == _state.WrapMode.Clamp) ? gl.CLAMP_TO_EDGE : gl.REPEAT
		);
		prog.getUniform('uSampler').set1i(0);

		prog.getUniform('samplerClut').set1i(1);
	}

	unbindTexture(program: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}
