﻿import _memory = require('./memory');
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
		return PixelConverter.unswizzleInline2(from, fromIndex, PixelConverter.getSizeInBytes(format, width), height);
	}

	private static unswizzleInline2(from: ArrayBuffer, fromIndex: number, rowWidth: number, textureHeight: number) {
		var size = rowWidth * textureHeight;
		var temp = new Uint8Array(size);
		PixelConverter.unswizzle(new DataView(from, fromIndex), new DataView(temp.buffer), rowWidth, textureHeight);
		new Uint8Array(from, fromIndex, size).set(temp);
	}

	private static unswizzle(input: DataView, output: DataView, rowWidth: number, textureHeight: number) {
		var pitch = (rowWidth - 16) / 4;
		var bxc = rowWidth / 16;
		var byc = textureHeight / 8;

		var src = 0;
		var ydest = 0;
		for (var by = 0; by < byc; by++) {
			var xdest = ydest;
			for (var bx = 0; bx < bxc; bx++) {
				var dest = xdest;
				for (var n = 0; n < 8; n++, dest += pitch * 4) {
					for (var m = 0; m < 4; m++) {
						output.setInt32(dest, input.getInt32(src));
						dest += 4;
						src += 4;
					}
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

	private static updateT4(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		for (var n = 0, m = 0; n < count * 8; n += 8, m++) {
			var color1 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 0, 4) & clutMask) << clutShift)];
			var color2 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 4, 4) & clutMask) << clutShift)];
			to[toIndex + n + 0] = BitUtils.extract(color1, 0, 8);
			to[toIndex + n + 1] = BitUtils.extract(color1, 8, 8);
			to[toIndex + n + 2] = BitUtils.extract(color1, 16, 8);
			to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color1, 24, 8) : 0xFF;

			to[toIndex + n + 4] = BitUtils.extract(color2, 0, 8);
			to[toIndex + n + 5] = BitUtils.extract(color2, 8, 8);
			to[toIndex + n + 6] = BitUtils.extract(color2, 16, 8);
			to[toIndex + n + 7] = useAlpha ? BitUtils.extract(color2, 24, 8) : 0xFF;
		}
	}

	private static updateT8(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		for (var n = 0, m = 0; n < count * 4; n += 4, m++) {
			var colorIndex = clutStart + ((from[fromIndex + m] & clutMask) << clutShift);
			var color = palette[colorIndex];
			to[toIndex + n + 0] = BitUtils.extract(color, 0, 8);
			to[toIndex + n + 1] = BitUtils.extract(color, 8, 8);
			to[toIndex + n + 2] = BitUtils.extract(color, 16, 8);
			to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color, 24, 8) : 0xFF;
		}
	}

	private static decode8888(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		var count4 = count * 4;
		for (var n = 0; n < count4; n += 4) {
			to[toIndex + n + 0] = from[fromIndex + n + 0];
			to[toIndex + n + 1] = from[fromIndex + n + 1];
			to[toIndex + n + 2] = from[fromIndex + n + 2];
			to[toIndex + n + 3] = useAlpha ? from[fromIndex + n + 3] : 0xFF;
		}
	}

	private static update5551(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		for (var n = 0; n < count * 4; n += 4) {
			var it = from[fromIndex++];
			to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 5, 0xFF);
			to[toIndex + n + 1] = BitUtils.extractScalei(it, 5, 5, 0xFF);
			to[toIndex + n + 2] = BitUtils.extractScalei(it, 10, 5, 0xFF);
			to[toIndex + n + 3] = useAlpha ? BitUtils.extractScalei(it, 15, 1, 0xFF) : 0xFF;
		}
	}

	private static update5650(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		for (var n = 0; n < count * 4; n += 4) {
			var it = from[fromIndex++];
			to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 5, 0xFF);
			to[toIndex + n + 1] = BitUtils.extractScalei(it, 5, 6, 0xFF);
			to[toIndex + n + 2] = BitUtils.extractScalei(it, 11, 5, 0xFF);
			to[toIndex + n + 3] = 0xFF;
		}
	}

	private static update4444(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
		for (var n = 0; n < count * 4; n += 4) {
			var it = from[fromIndex++];
			to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 4, 0xFF);
			to[toIndex + n + 1] = BitUtils.extractScalei(it, 4, 4, 0xFF);
			to[toIndex + n + 2] = BitUtils.extractScalei(it, 8, 4, 0xFF);
			to[toIndex + n + 3] = useAlpha ? BitUtils.extractScalei(it, 12, 4, 0xFF) : 0xFF;
		}
	}
}