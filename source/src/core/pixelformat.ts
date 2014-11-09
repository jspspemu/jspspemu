///<reference path="../global.d.ts" />

import _memory = require('./memory');
import Memory = _memory.Memory;

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

var sizes = {};
sizes[PixelFormat.COMPRESSED_DXT1] = 0.5;
sizes[PixelFormat.COMPRESSED_DXT3] = 1;
sizes[PixelFormat.COMPRESSED_DXT5] = 1;
sizes[PixelFormat.NONE] = 0;
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

	static unswizzleInline(format: PixelFormat, from: ArrayBuffer, fromIndex: number, width: number, height: number) {
		var rowWidth = PixelConverter.getSizeInBytes(format, width);
		var textureHeight = height;
		var size = rowWidth * textureHeight;
		var temp = new Uint8Array(size);
		PixelConverter.unswizzle(new Uint8Array(from, fromIndex), new Uint8Array(temp.buffer), rowWidth, textureHeight);
		new Uint8Array(from, fromIndex, size).set(temp);
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

	static decode(format: PixelFormat, from: ArrayBuffer, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		//console.log(format + ':' + PixelFormat[format]);
		switch (format) {
			case PixelFormat.RGBA_8888:
				PixelConverter.decode8888(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha);
				break;
			case PixelFormat.RGBA_5551:
				PixelConverter.update5551(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
				break;
			case PixelFormat.RGBA_5650:
				PixelConverter.update5650(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
				break;
			case PixelFormat.RGBA_4444:
				PixelConverter.update4444(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
				break;
			case PixelFormat.PALETTE_T8:
				PixelConverter.updateT8(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
				break;
			case PixelFormat.PALETTE_T4:
				PixelConverter.updateT4(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
				break;
			default: throw (new Error(sprintf("Unsupported pixel format %d", format)));
		}
	}

	private static updateT4Translate = new Uint32Array(16);
	private static updateT4(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
		var orValue = useAlpha ? 0 : 0xFF000000;
		count |= 0;
		clutStart |= 0;
		clutShift |= 0;
		clutMask &= 0xF;

		var updateT4Translate = PixelConverter.updateT4Translate;
		//var updateT4Translate2 = [];
		for (var m = 0; m < 16; m++) {
			updateT4Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];
		}

		//console.log('updateT4', clutStart, clutShift, clutMask, updateT4Translate, updateT4Translate2.map(item => sprintf('%08X', item)));

		for (var n = 0, m = 0; n < count; n++) {
			var char = from[fromIndex + n];
			to32[m++] = updateT4Translate[(char >>> 0) & 0xF] | orValue;
			to32[m++] = updateT4Translate[(char >>> 4) & 0xF] | orValue;
		}
		//var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
		//var orValue = useAlpha ? 0 : 0xFF000000;
		//count |= 0;
		//clutStart |= 0;
		//clutShift |= 0;
		//clutMask &= 0xF;
		//
		//for (var n = 0, m = 0; n < count; n++) {
		//	var char = from[fromIndex + n];
		//	to32[m++] = palette[((clutStart + (char >>> 0) & 0xF) >>> clutShift) & clutMask]
		//	to32[m++] = palette[((clutStart + (char >>> 4) & 0xF) >>> clutShift) & clutMask]
		//}
	}

	private static updateT8(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
		var orValue = useAlpha ? 0 : 0xFF000000;
		clutMask &= 0xFF;
		for (var m = 0; m < count; m++) to32[m] = palette[clutStart + ((from[fromIndex + m] & clutMask) << clutShift)] | orValue;
	}

	private static decode8888(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
		var from32 = ArrayBufferUtils.uint8ToUint32(from, fromIndex);
		var orValue = useAlpha ? 0 : 0xFF000000;
		for (var n = 0; n < count; n++) to32[n] = from32[n] | orValue;
	}

	private static update5551(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);

		var orValue = useAlpha ? 0 : 0xFF000000;

		for (var n = 0; n < count; n++) {
			var it = from[fromIndex++];
			var value = 0;
			value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 5, 5, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 10, 5, 0xFF) << 16;
			value |= BitUtils.extractScalei(it, 15, 1, 0xFF) << 24;
			value |= orValue;
			to32[n] = value;
		}
	}

	private static update5650(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);

		for (var n = 0; n < count; n++) {
			var it = from[fromIndex++];
			var value = 0;
			value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 5, 6, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 11, 5, 0xFF) << 16;
			value |= 0xFF000000;
			to32[n] = value;
		}
	}

	private static update4444(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);

		for (var n = 0; n < count; n++) {
			var it = from[fromIndex++];
			var value = 0;
			value |= BitUtils.extractScalei(it, 0, 4, 0xFF) << 0;
			value |= BitUtils.extractScalei(it, 4, 4, 0xFF) << 8;
			value |= BitUtils.extractScalei(it, 8, 4, 0xFF) << 16;
			value |= (useAlpha ? BitUtils.extractScalei(it, 12, 4, 0xFF) : 0xFF) << 24;
			to32[n] = value;
		}
	}
}
