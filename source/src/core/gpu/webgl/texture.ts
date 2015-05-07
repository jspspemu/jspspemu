///<reference path="../../../global.d.ts" />

import _state = require('../state');
import _utils = require('./utils');
import _pixelformat = require('../../pixelformat');
import _memory = require('../../memory');

import PixelFormat = _pixelformat.PixelFormat;
import PixelFormatUtils = _pixelformat.PixelFormatUtils;
import PixelConverter = _pixelformat.PixelConverter;
import WrappedWebGLProgram = _utils.WrappedWebGLProgram;
import Memory = _memory.Memory;

export class Clut {
	private texture: WebGLTexture;
	numberOfColors: number;
	clut_start: number;
	clut_end: number
	clutFormat: PixelFormat;
	valid: boolean = true;
	validHint: boolean = true;
	hash1: number;
	hash2: number;

	constructor(private gl: WebGLRenderingContext) {
		this.texture = gl.createTexture();
	}

	setInfo(clut: _state.ClutState) {
		this.clutFormat = clut.pixelFormat;
		this.clut_start = clut.address;
		this.clut_end = clut.address + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors);
	}

	private _create(callbackTex2D: () => void) {
		var gl = this.gl;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		callbackTex2D();
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	fromBytesRGBA(data: Uint32Array, numberOfColors: number) {
		var gl = this.gl;

		this.numberOfColors = numberOfColors;
		this._create(() => {
			// @TODO: not detected signature
			(<any>gl).texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, numberOfColors, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, ArrayBufferUtils.uint32ToUint8(data));
			//gl.generateMipmap(gl.TEXTURE_2D);
		});
	}

	bind(textureUnit: number) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	static hashFast(state: _state.GpuState) {
		return state.texture.clut.address;
	}

	static hashSlow(memory: Memory, state: _state.GpuState) {
		var clut = state.texture.clut;

		var hash_number = 0;
		hash_number += memory.hash(
			clut.address + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors),
			PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)
		) * Math.pow(2, 30);
		hash_number += clut.info * Math.pow(2, 26);

		return hash_number;
	}
}

export class Texture {
	private texture: WebGLTexture;
	recheckTimestamp: number = 0;
	valid = true;
	validHint = true;
	swizzled = false;
	hash1: number;
	hash2: number;

	address_start: number;
	address_end: number

	pixelFormat: PixelFormat;
	width: number;
	height: number;

	recheckCount = 0;
	framesEqual = 0;

	constructor(private gl: WebGLRenderingContext) {
		this.texture = gl.createTexture();
	}

	setInfo(state: _state.GpuState) {
		var texture = state.texture;
		var mipmap = texture.mipmaps[0];

		this.swizzled = texture.swizzled;
		this.address_start = mipmap.address;
		this.address_end = mipmap.address + PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.bufferWidth * mipmap.textureHeight);
		this.pixelFormat = texture.pixelFormat;
	}

	private _create(callbackTex2D: () => void) {
		var gl = this.gl;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		callbackTex2D();
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	fromBytesRGBA(data: Uint32Array, width: number, height: number) {
		var gl = this.gl;
		this.width = width;
		this.height = height;
		this._create(() => {
			// @TODO: not detected signature
			(<any>gl).texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, ArrayBufferUtils.uint32ToUint8(data));
			//gl.generateMipmap(gl.TEXTURE_2D);
		});
	}

	fromBytesIndex(data: Uint8Array, width: number, height: number) {
		var gl = this.gl;
		this.width = width;
		this.height = height;
		this._create(() => {
			//(<any>gl).texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, width, height, 0, gl.ALPHA, gl.UNSIGNED_BYTE, data);
			(<any>gl).texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
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
		if (!MathUtils.isPowerOfTwo(this.width) || !MathUtils.isPowerOfTwo(this.height)) {
			wraps = wrapt = gl.CLAMP_TO_EDGE;
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
	}

	static hashFast(state: _state.GpuState) {
		var result = state.texture.mipmaps[0].address;
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
		hash_number += memory.hash(
			mipmap.address,
			PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)
		) * Math.pow(2, 12);

		return hash_number;
	}

	static createCanvas() {
		/*
		var canvas:HTMLCanvasElement = document.createElement('canvas');
		canvas.style.border = '1px solid white';
		canvas.width = w2;
		canvas.height = h;
		var ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
		var imageData = ctx.createImageData(w2, h);
		var u8 = imageData.data;

		ctx.clearRect(0, 0, w, h);
		for (var n = 0; n < w2 * h * 4; n++) u8[n] = data2[n];
		ctx.putImageData(imageData, 0, 0);

		console.error('generated texture!' + texture.toString());
		var div = document.createElement('div');
		var textdiv = document.createElement('div');
		textdiv.innerText = texture.toString() + 'w=' + w + ',w2=' + w2 + ',' + h; 
		div.appendChild(canvas);
		div.appendChild(textdiv);
		
		document.body.appendChild(div);
		*/
	}

	toString() {
		return `Texture(address = ${this.address_start}, hash1 = ${this.hash1}, hash2 = ${this.hash2}, pixelFormat = ${this.pixelFormat}, swizzled = ${this.swizzled}`;
	}
}

export class TextureHandler {
	constructor(private memory: Memory, private gl: WebGLRenderingContext) {
		memory.invalidateDataRange.add((range) => this.invalidatedMemoryRange(range));
		memory.invalidateDataAll.add(() => this.invalidatedMemoryAll());
	}

	private texturesByHash2: NumberDictionary<Texture> = {};
	private texturesByHash1: NumberDictionary<Texture> = {};
	private texturesByAddress: NumberDictionary<Texture> = {};
	private textures = <Texture[]>[];
	
	private clutsByHash2: NumberDictionary<Clut> = {};
	private clutsByHash1: NumberDictionary<Clut> = {};
	private clutsByAddress: NumberDictionary<Clut> = {};
	private cluts = <Clut[]>[];
	
	private recheckTimestamp: number = 0;
	private lastTexture: Texture;
	//private updatedTextures = new SortedSet<Texture>();
	private invalidatedAll = false;


	flush() {
		//console.log('flush!');
		for (let texture of this.textures) {
			if (!texture.validHint) {
				texture.valid = false;
				texture.validHint = true;
			}
		}
		for (let clut of this.cluts) {
			if (!clut.validHint) {
				clut.valid = false;
				clut.validHint = true;
			}
		}
	}

	sync() {
	}

	end() {
		if (!this.invalidatedAll) return;
		this.invalidatedAll = false;
		for (let texture of this.textures) texture.validHint = false;
		for (let clut of this.cluts) clut.validHint = false;
	}

	private invalidatedMemoryAll() {
		this.invalidatedAll = true;
	}

	private invalidatedMemoryRange(range: NumericRange) {
		for (let texture of this.textures) {
			if (texture.address_start >= range.start && texture.address_end <= range.end) texture.validHint = false;
		}
		for (let clut of this.cluts) {
			if (clut.clut_start >= range.start && clut.clut_end <= range.end) clut.validHint = false;
		}
	}

	private mustRecheckSlowHashTexture(texture: Texture) {
		//return !texture || !texture.valid || this.recheckTimestamp >= texture.recheckTimestamp;
		if (!texture) return true;
		if (texture.recheckCount++ >= texture.framesEqual) {
			return !texture.valid;
			//return false;
		} else {
			texture.recheckCount = 0;
			return false;
		}
		//return !texture;
	}

	private mustRecheckSlowHashClut(clut: Clut) {
		return !clut || !clut.valid;
	}
	
	bindTexture(prog: WrappedWebGLProgram, state: _state.GpuState) {
		this._bindClut(prog, state);
		this._bindTexture(prog, state);
		this.gl.activeTexture(this.gl.TEXTURE0);
	}

	_bindTexture(prog: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;

		var mipmap = state.texture.mipmaps[0];

		if (mipmap.bufferWidth == 0) return;
		if (mipmap.textureWidth == 0) return;
		if (mipmap.textureHeight == 0) return;

		let hasClut = PixelFormatUtils.hasClut(state.texture.pixelFormat);

		var hash1 = Texture.hashFast(state);
		var texture = this.texturesByHash1[hash1];
		var texture1 = texture;
		//if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
		if (this.mustRecheckSlowHashTexture(texture)) {
			var hash2 = Texture.hashSlow(this.memory, state);
			//var hash2 = hash1;

			//console.log(hash);

			texture = this.texturesByHash2[hash2];

			if (texture) {
				if (texture1 == texture) {
					texture.framesEqual++;
				} else {
					texture.framesEqual = 0;
				}
			}

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
				texture.validHint = true;

				//this.updatedTextures.add(texture);

				texture.recheckTimestamp = this.recheckTimestamp;

				var mipmap = state.texture.mipmaps[0];

				var h = mipmap.textureHeight, w = mipmap.textureWidth, w2 = mipmap.bufferWidth;

				var data = new Uint8Array(PixelConverter.getSizeInBytes(state.texture.pixelFormat, w2 * h));
				data.set(this.memory.getPointerU8Array(mipmap.address, data.length));
				//data.set(new Uint8Array(this.memory.buffer, mipmap.address, data.length));

				if (state.texture.swizzled) PixelConverter.unswizzleInline(state.texture.pixelFormat, data, w2, h);

				if (hasClut) {
					//console.log('clut start, shift, mask', state.texture.clut.start, state.texture.clut.shift, state.texture.clut.mask);
					texture.fromBytesIndex(PixelConverter.decodeIndex(state.texture.pixelFormat, data, new Uint8Array(w2 * h)), w2, h);
					//texture.fromBytesRGBA(ArrayBufferUtils.copyUint8ToUint32_rep(PixelConverter.decodeIndex(state.texture.pixelFormat, data, new Uint8Array(w2 * h))), w2, h);
				} else {
					texture.fromBytesRGBA(PixelConverter.decode(state.texture.pixelFormat, data, new Uint32Array(w2 * h), true), w2, h);
				}
			}
		}

		this.lastTexture = texture;

		texture.bind(
			0,
			(!hasClut && state.texture.filterMinification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			(!hasClut && state.texture.filterMagnification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			convertWrapMode[state.texture.wrapU],
			convertWrapMode[state.texture.wrapV]
		);
		//texture.bind(0, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

		prog.getUniform('textureSize').set2f(texture.width, texture.height);
		prog.getUniform('pixelSize').set2f(1.0 / texture.width, 1.0 / texture.height);
		prog.getUniform('uSampler').set1i(0);
	}
	
	_bindClut(prog: WrappedWebGLProgram, state: _state.GpuState) {
		let gl = this.gl;
		let hasClut = PixelFormatUtils.hasClut(state.texture.pixelFormat);
		if (!hasClut) return;
		var _clut: Clut;
		var clutState = state.texture.clut;
		var hash1 = Clut.hashFast(state);
		_clut = this.clutsByHash1[hash1];
		
		if (this.mustRecheckSlowHashClut(_clut)) {
			var hash2 = Clut.hashSlow(this.memory, state);
			
			_clut = this.clutsByHash2[hash2];
			
			if (!_clut) {
				if (!this.clutsByAddress[clutState.address]) {
					this.clutsByAddress[clutState.address] = _clut = new Clut(gl);
					this.cluts.push(_clut);
					console.warn('New clut allocated!', clutState);
				}

				_clut = this.clutsByHash2[hash2] = this.clutsByHash1[hash1] = this.clutsByAddress[clutState.address];

				_clut.setInfo(clutState);
				_clut.hash1 = hash1;
				_clut.hash2 = hash2;
				_clut.valid = true;
				_clut.validHint = true;
	
				_clut.numberOfColors = Math.max(clutState.numberOfColors, clutState.mask + 1);
				var palette = new Uint32Array(256);
				PixelConverter.decode(clutState.pixelFormat, this.memory.getPointerU8Array(clutState.address), palette.subarray(0, _clut.numberOfColors), true);
				_clut.fromBytesRGBA(palette, 256);
			}
		}
		
		_clut.bind(1)
		prog.getUniform('samplerClut').set1i(1);
		prog.getUniform('samplerClutStart').set1f(clutState.start);
		prog.getUniform('samplerClutShift').set1f(clutState.shift);
		prog.getUniform('samplerClutMask').set1f(clutState.mask);
		
		//console.log(clutState.start, clutState.shift, clutState.mask);
		//((clutStart + m) >>> clutShift) & clutMask
	}

	unbindTexture(program: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}

const enum GL {
	REPEAT = 0x2901,
    CLAMP_TO_EDGE = 0x812F,
    MIRRORED_REPEAT = 0x8370,
}

var convertWrapMode = [GL.REPEAT, GL.CLAMP_TO_EDGE];

//var convertTextureFilter = [GL.NEAREST, GL.LINEAR, GL.NEAREST, GL.LINEAR];
//var convertTextureMimapFilter = [GL.NEAREST, GL.LINEAR, GL.NEAREST, GL.LINEAR, GL.NEAREST, GL.LINEAR, GL.NEAREST, GL.LINEAR];
/*
export const enum TextureFilter {
	Nearest = 0,
	Linear = 1,
	NearestMipmapNearest = 4,
	LinearMipmapNearest = 5,
	NearestMipmapLinear = 6,
	LinearMipmapLinear = 7,
}
*/
