import "../emu/global"
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

const sizes = new Float32Array(16);
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
    static getSizeInBits(format: PixelFormat) {
        return sizes[format] * 8;
    }

	static getSizeInBytes(format: PixelFormat, count: number) {
		return sizes[format] * count;
	}

	static unswizzleInline(format: PixelFormat, from: Uint8Array, width: number, height: number) {
        const rowWidth = PixelConverter.getSizeInBytes(format, width);
        const textureHeight = height;
        const size = rowWidth * textureHeight;
        const temp = new Uint8Array(size);
        PixelConverter.unswizzle(from, temp, rowWidth, textureHeight);
		ArrayBufferUtils.copy(temp, 0, from, 0, size);
	}

	private static unswizzle(input: Uint8Array, output: Uint8Array, rowWidth: number, textureHeight: number) {
        const pitch = ToInt32((rowWidth - 16) / 4);
        const bxc = ToInt32(rowWidth / 16);
        const byc = ToInt32(textureHeight / 8);
        const pitch4 = ToInt32(pitch * 4);

        let src = 0;
        let ydest = 0;
        for (let by = 0; by < byc; by++) {
            let xdest = ydest;
            for (let bx = 0; bx < bxc; bx++) {
                let dest = xdest;
                for (let n = 0; n < 8; n++, dest += pitch4) {
					//ArrayBufferUtils.copy(input, src, output, dest, 16);
					for (let m = 0; m < 16; m++) output[dest++] = input[src++];
				}
				xdest += 16;
			}
			ydest += rowWidth * 8;
		}
	}
	
	static decodeIndex(format: PixelFormat, from: Uint8Array, to: Uint8Array):Uint8Array {
		switch (format) {
			case PixelFormat.PALETTE_T4:
                let m = 0;
                for (let n = 0; n < from.length; n++) {
                    const value = from[n];
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
	
	static decode(format: PixelFormat, from: Uint8Array, to: Uint32Array, useAlpha: boolean = true, palette: Uint32Array|null = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0):Uint32Array {
		//static decode(format: PixelFormat, from: ArrayBuffer, fromIndex:number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
		//console.log(`${format}:${PixelFormat[format]}`);
		switch (format) {
			case PixelFormat.RGBA_8888: return PixelConverter.decode8888(from, to, useAlpha);
			case PixelFormat.RGBA_5551: return PixelConverter.update5551(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
			case PixelFormat.RGBA_5650: return PixelConverter.update5650(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
			case PixelFormat.RGBA_4444: return PixelConverter.update4444(ArrayBufferUtils.uint8ToUint16(from), to, useAlpha);
            case PixelFormat.PALETTE_T4: return PixelConverter.updateT4(from, to, useAlpha, palette!, clutStart, clutShift, clutMask);
			case PixelFormat.PALETTE_T8: return PixelConverter.updateT8(from, to, useAlpha, palette!, clutStart, clutShift, clutMask);
			default: throw new Error(`Unsupported pixel format ${format} [${PixelFormat[format]}]`);
		}
	}

	private static updateTranslate = new Uint32Array(256);
	private static updateT4(from: Uint8Array, to: Uint32Array, useAlpha: boolean, palette: Uint32Array, clutStart: number, clutShift: number, clutMask: number) {
        const orValue = useAlpha ? 0 : 0xFF000000;
        const count = to.length;
        clutStart |= 0;
		clutShift |= 0;
		clutMask &= 0xF;

		const updateT4Translate = PixelConverter.updateTranslate;
		for (let m = 0; m < 16; m++) updateT4Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];

		for (let n = 0, m = 0; n < count; n++) {
			const char = from[n];
			to[m++] = updateT4Translate[(char >>> 0) & 0xF] | orValue;
			to[m++] = updateT4Translate[(char >>> 4) & 0xF] | orValue;
		}
		return to;
	}

	private static updateT8(from: Uint8Array, to: Uint32Array, useAlpha: boolean, palette: Uint32Array, clutStart: number, clutShift: number, clutMask: number) {
        const orValue = useAlpha ? 0 : 0xFF000000;
        const count = to.length;
        clutMask &= 0xFF;
		// Big enough to be worth the translate construction
		if (count > 1024) {
            const updateT8Translate = PixelConverter.updateTranslate;
            for (let m = 0; m < 256; m++) updateT8Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];
			for (let m = 0; m < count; m++) to[m] = updateT8Translate[from[m]] | orValue;
		} else {
			for (let m = 0; m < count; m++) to[m] = palette[clutStart + ((from[m] & clutMask) << clutShift)] | orValue;
		}
		return to;
	}

	private static decode8888(from8: Uint8Array, to: Uint32Array, useAlpha: boolean = true) {
		const from = ArrayBufferUtils.uint8ToUint32(from8);
		for (let n = 0; n < to.length; n++) to[n] = this._decode8888(from[n])
		return to;
	}

	private static update5551(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true) {
		for (let n = 0; n < to.length; n++) {
			to[n] = this.decode5551(from[n], useAlpha);
		}
		return to;
	}

	private static update5650(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true) {
		for (let n = 0; n < to.length; n++) {
			to[n] = this.decode5650(from[n], useAlpha)
		}
		return to;
	}

	private static update4444(from: Uint16Array, to: Uint32Array, useAlpha: boolean = true): Uint32Array {
		for (let n = 0; n < to.length; n++) {
			to[n] = this.decode4444(from[n], useAlpha)
		}
		return to;
	}

    private static _decode8888(it: number, useAlpha: boolean = true): number {
        const orValue = useAlpha ? 0 : 0xFF000000;
        return it | orValue
    }

	private static decode5551(it: number, useAlpha: boolean = true): number {
        let value = 0;
        value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
        value |= BitUtils.extractScalei(it, 5, 5, 0xFF) << 8;
        value |= BitUtils.extractScalei(it, 10, 5, 0xFF) << 16;
        value |= BitUtils.extractScalei(it, 15, 1, 0xFF) << 24;
        value |= useAlpha ? 0 : 0xFF000000;
        return value
    }

    private static decode5650(it: number, useAlpha: boolean = true): number {
        let value = 0;
        value |= BitUtils.extractScalei(it, 0, 5, 0xFF) << 0;
        value |= BitUtils.extractScalei(it, 5, 6, 0xFF) << 8;
        value |= BitUtils.extractScalei(it, 11, 5, 0xFF) << 16;
        value |= 0xFF000000;
        return value
    }

	private static decode4444(it: number, useAlpha: boolean = true): number {
        let value = 0;
        value |= BitUtils.extractScalei(it, 0, 4, 0xFF) << 0;
        value |= BitUtils.extractScalei(it, 4, 4, 0xFF) << 8;
        value |= BitUtils.extractScalei(it, 8, 4, 0xFF) << 16;
        value |= (useAlpha ? BitUtils.extractScalei(it, 12, 4, 0xFF) : 0xFF) << 24;
        return value
    }

    static unpackToRGBA(pixelFormat: PixelFormat, rawColor: number, useAlpha: boolean = true): number {
	    switch (pixelFormat) {
            case PixelFormat.RGBA_8888: return this._decode8888(rawColor, useAlpha)
            case PixelFormat.RGBA_5551: return this.decode5551(rawColor, useAlpha)
            case PixelFormat.RGBA_5650: return this.decode5650(rawColor, useAlpha)
            case PixelFormat.RGBA_4444: return this.decode4444(rawColor, useAlpha)
            default: throw new Error(`Unsupported pixelFormat ${pixelFormat}`)
        }
    }
}

export default { PixelFormat };