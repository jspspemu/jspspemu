///<reference path="../../../global.d.ts" />
///<reference path="./webgl_enums.d.ts" />

import _state = require('../gpu_state');
import { GpuStats } from '../gpu_stats';
import _vertex = require('../gpu_vertex');
import _utils = require('./webgl_utils');
import _pixelformat = require('../../pixelformat');

import PixelFormat = _pixelformat.PixelFormat;
import PixelFormatUtils = _pixelformat.PixelFormatUtils;
import PixelConverter = _pixelformat.PixelConverter;
import WrappedWebGLProgram = _utils.WrappedWebGLProgram;

export class Texture {
	private texture: WebGLTexture;
	valid = false;
	hash: string = '';

	recheckCount = 0;
	framesEqual = 0;

	_width?: number = null;
	_height?: number = null;
	
	private state: _state.GpuState;

	constructor(private gl: WebGLRenderingContext) {
		this.texture = gl.createTexture();
		this.state = new _state.GpuState();
	}
	
	get textureState() { return this.state.texture; }
	get mipmap() { return this.textureState.mipmaps[0]; }

	get width() { return this._width || this.mipmap.textureWidth; }
	get height() { return this._height || this.mipmap.textureHeight; }
	get swizzled() { return this.textureState.swizzled; }
	get addressStart() { return this.mipmap.address; }
	get addressEnd() { return this.mipmap.addressEnd; }
	get pixelFormat() { return this.textureState.pixelFormat; }

	updateFromState(state: _state.GpuState, textureData:Uint8Array, clutData:Uint8Array) {
		this.state.copyFrom(state);
		
		//this.updatedTextures.add(texture);

		var textureState = state.texture;
		var clutState = state.texture.clut;
		var mipmap = textureState.mipmaps[0];

		var h = mipmap.textureHeight, w = mipmap.textureWidth, w2 = mipmap.bufferWidth;

		var data = new Uint8Array(PixelConverter.getSizeInBytes(state.texture.pixelFormat, w2 * h));
		data.set(textureData);
		//data.set(new Uint8Array(this.memory.buffer, mipmap.address, data.length));

		if (state.texture.swizzled) PixelConverter.unswizzleInline(state.texture.pixelFormat, data, w2, h);
		
		var clut: Uint32Array = null;
		if (textureState.hasClut) {
			clut = PixelConverter.decode(
				clutState.pixelFormat,
				clutData,
				new Uint32Array(256), textureState.hasAlpha, null
			);
		}
		
		this.fromBytesRGBA(PixelConverter.decode(
			textureState.pixelFormat, data, new Uint32Array(w2 * h),
			textureState.hasAlpha,
			clut, clutState.start, clutState.shift, clutState.mask 
		), w2, h);
		
		//console.log('texture updated!');
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
		this._width = width;
		this._height = height;
		this._create(() => {
			(<any>gl).texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, ArrayBufferUtils.uint32ToUint8(data));
		});
	}

	fromCanvas(canvas: HTMLCanvasElement) {
		var gl = this.gl;

		this._width = canvas.width;
		this._height = canvas.height;
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
		return `Texture(address = ${this.addressStart}, hash = ${this.hash}, pixelFormat = ${this.pixelFormat}, swizzled = ${this.swizzled}`;
	}
}

export class TextureHandler {
	constructor(private gl: WebGLRenderingContext, public stats: GpuStats) {
		this.invalidateWithGl(gl);
	}

	private texturesByHash:Map<string, Texture>;
	private texturesByAddress:Map<number, Texture>;
	private textures:Texture[];
	
	rehashSignal = new Signal1<number>();
	
	invalidateWithGl(gl: WebGLRenderingContext) {
		this.gl = gl;
		
		this.texturesByHash = new Map<string, Texture>();
		this.texturesByAddress = new Map<number, Texture>();
		this.textures = [];
	}

	invalidatedMemoryAll() {
		for (let texture of this.textures) texture.valid = false;
	}

	invalidatedMemoryRange(low: number, high: number) {
		//console.log('texture: invalidatedMemoryRange', low, high)
		for (let texture of this.textures) {
			if (texture.addressStart >= low && texture.addressEnd <= high) texture.valid = false;
		}
	}
	
	startFrame() {
	}
	
	endFrame() {
	}

	bindTexture(prog: WrappedWebGLProgram, state: _state.GpuState, enableBilinear:boolean, buffer:ArrayBuffer, batch: _vertex.OptimizedBatchTransfer) {
		var gl = this.gl;
		
		var textureId = batch.textureLow + batch.clutLow * Math.pow(2, 24);
		
		var textureData = (batch.textureLow > 0) ? new Uint8Array(buffer, batch.textureLow, batch.textureHigh - batch.textureLow) : null;
		var clutData = (batch.clutLow > 0) ? new Uint8Array(buffer, batch.clutLow, batch.clutHigh - batch.clutLow) : null;

		var mipmap = state.texture.mipmaps[0];

		if (mipmap.bufferWidth == 0) return;
		if (mipmap.textureWidth == 0) return;
		if (mipmap.textureHeight == 0) return;

		let hasClut = PixelFormatUtils.hasClut(state.texture.pixelFormat);
		let clutState = state.texture.clut;
		let textureState = state.texture;
		let clutAddress = hasClut ? clutState.address : 0;

		var texture: Texture;
		
		var fastHash = mipmap.address + clutAddress * Math.pow(2, 24) + textureState.colorComponent * Math.pow(2, 18);
		
		if (!this.texturesByAddress.get(fastHash)) {
			texture = new Texture(gl);
			this.texturesByAddress.set(fastHash, texture);
			this.textures.push(texture);
			//console.warn('New texture allocated!', mipmap, state.texture);
		}

		texture = this.texturesByAddress.get(fastHash);
		
		//if (true) {
		if (!texture.valid) {
			var hash = textureState.getHashSlow(textureData, clutData);
			this.stats.hashMemoryCount++;
			this.stats.hashMemorySize += mipmap.sizeInBytes;
			this.rehashSignal.dispatch(mipmap.sizeInBytes);
			
			if (this.texturesByHash.has(hash)) {
				texture = this.texturesByHash.get(hash);
			} else if (texture.hash != hash) {
				this.texturesByHash.delete(texture.hash);

				texture.hash = hash;
				texture.valid = true;

				this.texturesByHash.set(hash, texture);

				texture.updateFromState(state, textureData, clutData);
			}
		}

		texture.bind(
			0,
			(enableBilinear && state.texture.filterMinification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			(enableBilinear && state.texture.filterMagnification == _state.TextureFilter.Linear) ? gl.LINEAR : gl.NEAREST,
			convertWrapMode[state.texture.wrapU],
			convertWrapMode[state.texture.wrapV]
		);
		//texture.bind(0, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

		prog.getUniform('textureSize').set2f(texture.width, texture.height);
		prog.getUniform('pixelSize').set2f(1.0 / texture.width, 1.0 / texture.height);
		prog.getUniform('uSampler').set1i(0);
	}
	
	unbindTexture(program: WrappedWebGLProgram, state: _state.GpuState) {
		var gl = this.gl;
		//gl.activeTexture(gl.TEXTURE1);
		//gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
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
