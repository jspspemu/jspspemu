import "../global"
import * as _memory from './memory';
import Memory = _memory.Memory;
import {ArrayBufferUtils} from "../global/utils";
import {BitUtils, ToInt32} from "../global/math";

export class PixelFormatUtils {
	static hasClut(pixelFormat: PixelFormat) {
		return ((pixelFormat >= PixelFormat.PALETTE_T4) && (pixelFormat <= PixelFormat.PALETTE_T32));
	}
}

export enum PixelFormat {
	NONE = -1,
	RGBA_5650 = 0,
	RGBA_5551 = 1,
	RGBA_4444 = 2,
	RGBA_8888 = 3,
	PALETTE_T4 = 4,
	PALETTE_T8 = 5,
	PALETTE_T16 = 6,
	PALETTE_T32 = 7,
	COMPRESSED_DXT1 = 8,
	COMPRESSED_DXT3 = 9,
	COMPRESSED_DXT5 = 10,
}

var sizes = new Float32Array(16);
sizes[PixelFormat.COMPRESSED_DXT1] = 0.5;
sizes[PixelFormat.COMPRESSED_DXT3] = 1;
sizes[PixelFormat.COMPRESSED_DXT5] = 1;
sizes[PixelFormat.PALETTE_T16] = 2;
sizes[PixelFormat.PALETTE_T32] = 4;
sizes[PixelFormat.PALETTE_T8] = 1;
sizes[PixelFormat.PALETTE_T4] = 0.5;
sizes[PixelFormat.RGBA_4444] = 2;
sizes[PixelFormat.RGBA_5551] = 2;
sizes[PixelFormat.RGBA_5650] = 2;
sizes[PixelFormat.RGBA_8888] = 4;

export class PixelConverter {
	static getSizeInBytes(format: PixelFormat, count: number) {
		return sizes[format] * count;
	}

	static unswizzleInline(format: PixelFormat, from: Uint8Array, width: number, height: number) {
		var rowWidth = PixelConverter.getSizeInBytes(format, width);
		var textureHeight = height;
		var size = rowWidth * textureHeight;
		var temp = new Uint8Array(size);
		PixelConverter.unswizzle(from, temp, rowWidth, textureHeight);
		ArrayBufferUtils.copy(temp, 0, from, 0, size);
	}

	private static unswizzle(input: Uint8Array, output: Uint8Array, rowWidth: number, textureHeight: number) {
		var pitch = ToInt32((rowWidth - 16) / 4);
		var bxc = ToInt32(rowWidth / 16);
		var byc = ToInt32(textureHeight / 8);
		var pitch4 = ToInt32(pitch * 4);

		var src = 0;
		var ydest = 0;
		for (var by = 0; by < byc; by++) {
			var xdest = ydest;
			for (var bx = 0; bx < bxc; bx++) {
				var dest = xdest;
				for (var n = 0; n < 8; n++, dest += pitch4) {
					//ArrayBufferUtils.copy(input, src, output, dest, 16);
					for (var m = 0; m < 16; m++) output[dest++] = input[src++];
				}
				xdest += 16;
			}
			ydest += rowWidth * 8;
		}
	}
	
	static decodeIndex(format: PixelFormat, from: Uint8Array, to: Uint8Array):Uint8Array {
		switch (format) {
			case PixelFormat.PALETTE_T4:
				var m = 0;
				for (var n = 0; n < from.length; n++) {
					var value = from[n]; 
					to[m++] = (value >> 0) & 0xF;
					to[m++] = (value >> 4) & 0xF; 
				}
				return to;
			case PixelFormat.PALETTE_T8: 
				to.set(from);
				return to;
			default: throw new Error(`Unsupported pixel format ${format}`);
		}
	}
	
	static decode(format: PixelFormat, from: Uint8Array, to: Uint32Array, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0):Uint32Array {
		//static decode(format: PixelFormat, from: ArrayBuffer, fromIndex:number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		//console.log(format + ':' + PixelFormat[format]);
		switch (format) {
			case PixelFormat.RGBA_8888: return PixelConverter.decode8888(from, to, useAlpha);
			case PixelFormat.RGBA_5551: return PixelConverter.update5551(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
			case PixelFormat.RGBA_5650: return PixelConverter.update5650(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
			case PixelFormat.RGBA_4444: return PixelConverter.update4444(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
			case PixelFormat.PALETTE_T8: return PixelConverter.updateT8(from, to, useAlpha, palette, clutStart, clutShift, clutMask);
			case PixelFormat.PALETTE_T4: return PixelConverter.updateT4(from, to, useAlpha, palette, clutStart, clutShift, clutMask);
			default: throw new Error(`Unsupported pixel format ${format}`);
		}
	}

	private static updateTranslate = new Uint32Array(256);
	private static updateT4(from: Uint8Array, to: Uint32Array, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		var orValue = useAlpha ? 0 : 0xFF000000;
		var count = to.length;
		clutStart |= 0;
		clutShift |= 0;
		clutMask &= 0xF;

		var updateT4Translate = PixelConverter.updateTranslate;
		for (var m = 0; m < 16; m++) updateT4Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];

		for (var n = 0, m = 0; n < count; n++) {
			var char = from[n];
			to[m++] = updateT4Translate[(char >>> 0) & 0xF] | orValue;
			to[m++] = updateT4Translate[(char >>> 4) & 0xF] | orValue;
		}
		return to;
	}

	private static updateT8(from: Uint8Array, to: Uint32Array, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		var orValue = useAlpha ? 0 : 0xFF000000;
		var count = to.length;
		clutMask &= 0xFF;
		// Big enough to be worth the translate construction
		if (count > 1024) {
			var updateT8Translate = PixelConverter.updateTranslate;
			for (var m = 0; m < 256; m++) updateT8Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];
			for (var m = 0; m < count; m++) to[m] = updateT8Translate[from[m]] | orValue;
		} else {
			for (var m = 0; m < count; m++) to[m] = palette[clutStart + ((from[m] & clutMask) << clutShift)] | orValue;
		}
		return to;
	}

	private static decode8888(from8: Uint8Array, to: Uint32Array, useAlpha: boolean = true) {
		const from = ArrayBufferUtils.uint8ToUint32(from8);
		const orValue = useAlpha ? 0 : 0xFF000000;
		for (let n = 0; n < to.length; n++) to[n] = from[n] | orValue;
		return to;
	}

	private static update5551(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true) {
		const orValue = useAlpha ? 0 : 0xFF000000;

		for (let n = 0; n < to.length; n++) {
			const it = from[n];
			let value = 0;
			value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 5, 5, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 10, 5, 0xFF) << 16;
			value |= BitUtils.extractScalei(it, 15, 1, 0xFF) << 24;
			value |= orValue;
			to[n] = value;
		}
		return to;
	}

	private static update5650(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true) {
		for (let n = 0; n < to.length; n++) {
			const it = from[n];
			let value = 0;
			value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 5, 6, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 11, 5, 0xFF) << 16;
			value |= 0xFF000000;
			to[n] = value;
		}
		return to;
	}

	private static update4444(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true): Uint32Array {
		for (let n = 0; n < to.length; n++) {
			const it = from[n];
			let value = 0;
			value |= BitUtils.extractScalei(it, 0, 4, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 4, 4, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 8, 4, 0xFF) << 16;
			value |= (useAlpha ? BitUtils.extractScalei(it, 12, 4, 0xFF) : 0xFF) << 24;
			to[n] = value;
		}
		return to;
	}
}

export default { PixelFormat };