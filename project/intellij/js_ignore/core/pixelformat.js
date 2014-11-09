///<reference path="../global.d.ts" />
var _memory = require('./memory');
var Memory = _memory.Memory;
var PixelFormatUtils = (function () {
    function PixelFormatUtils() {
    }
    PixelFormatUtils.hasClut = function (pixelFormat) {
        return ((pixelFormat >= 4 /* PALETTE_T4 */) && (pixelFormat <= 7 /* PALETTE_T32 */));
    };
    return PixelFormatUtils;
})();
exports.PixelFormatUtils = PixelFormatUtils;
(function (PixelFormat) {
    PixelFormat[PixelFormat["NONE"] = -1] = "NONE";
    PixelFormat[PixelFormat["RGBA_5650"] = 0] = "RGBA_5650";
    PixelFormat[PixelFormat["RGBA_5551"] = 1] = "RGBA_5551";
    PixelFormat[PixelFormat["RGBA_4444"] = 2] = "RGBA_4444";
    PixelFormat[PixelFormat["RGBA_8888"] = 3] = "RGBA_8888";
    PixelFormat[PixelFormat["PALETTE_T4"] = 4] = "PALETTE_T4";
    PixelFormat[PixelFormat["PALETTE_T8"] = 5] = "PALETTE_T8";
    PixelFormat[PixelFormat["PALETTE_T16"] = 6] = "PALETTE_T16";
    PixelFormat[PixelFormat["PALETTE_T32"] = 7] = "PALETTE_T32";
    PixelFormat[PixelFormat["COMPRESSED_DXT1"] = 8] = "COMPRESSED_DXT1";
    PixelFormat[PixelFormat["COMPRESSED_DXT3"] = 9] = "COMPRESSED_DXT3";
    PixelFormat[PixelFormat["COMPRESSED_DXT5"] = 10] = "COMPRESSED_DXT5";
})(exports.PixelFormat || (exports.PixelFormat = {}));
var PixelFormat = exports.PixelFormat;
var sizes = {};
sizes[8 /* COMPRESSED_DXT1 */] = 0.5;
sizes[9 /* COMPRESSED_DXT3 */] = 1;
sizes[10 /* COMPRESSED_DXT5 */] = 1;
sizes[-1 /* NONE */] = 0;
sizes[6 /* PALETTE_T16 */] = 2;
sizes[7 /* PALETTE_T32 */] = 4;
sizes[5 /* PALETTE_T8 */] = 1;
sizes[4 /* PALETTE_T4 */] = 0.5;
sizes[2 /* RGBA_4444 */] = 2;
sizes[1 /* RGBA_5551 */] = 2;
sizes[0 /* RGBA_5650 */] = 2;
sizes[3 /* RGBA_8888 */] = 4;
var PixelConverter = (function () {
    function PixelConverter() {
    }
    PixelConverter.getSizeInBytes = function (format, count) {
        return sizes[format] * count;
    };
    PixelConverter.unswizzleInline = function (format, from, fromIndex, width, height) {
        var rowWidth = PixelConverter.getSizeInBytes(format, width);
        var textureHeight = height;
        var size = rowWidth * textureHeight;
        var temp = new Uint8Array(size);
        PixelConverter.unswizzle(new Uint8Array(from, fromIndex), new Uint8Array(temp.buffer), rowWidth, textureHeight);
        new Uint8Array(from, fromIndex, size).set(temp);
    };
    PixelConverter.unswizzle = function (input, output, rowWidth, textureHeight) {
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
                    for (var m = 0; m < 16; m++)
                        output[dest++] = input[src++];
                }
                xdest += 16;
            }
            ydest += rowWidth * 8;
        }
    };
    PixelConverter.decode = function (format, from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
        if (useAlpha === void 0) { useAlpha = true; }
        if (palette === void 0) { palette = null; }
        if (clutStart === void 0) { clutStart = 0; }
        if (clutShift === void 0) { clutShift = 0; }
        if (clutMask === void 0) { clutMask = 0; }
        switch (format) {
            case 3 /* RGBA_8888 */:
                PixelConverter.decode8888(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha);
                break;
            case 1 /* RGBA_5551 */:
                PixelConverter.update5551(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
                break;
            case 0 /* RGBA_5650 */:
                PixelConverter.update5650(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
                break;
            case 2 /* RGBA_4444 */:
                PixelConverter.update4444(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
                break;
            case 5 /* PALETTE_T8 */:
                PixelConverter.updateT8(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
                break;
            case 4 /* PALETTE_T4 */:
                PixelConverter.updateT4(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
                break;
            default:
                throw (new Error(sprintf("Unsupported pixel format %d", format)));
        }
    };
    PixelConverter.updateT4 = function (from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
        if (useAlpha === void 0) { useAlpha = true; }
        if (palette === void 0) { palette = null; }
        if (clutStart === void 0) { clutStart = 0; }
        if (clutShift === void 0) { clutShift = 0; }
        if (clutMask === void 0) { clutMask = 0; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        count |= 0;
        clutStart |= 0;
        clutShift |= 0;
        clutMask &= 0xF;
        var updateT4Translate = PixelConverter.updateT4Translate;
        for (var m = 0; m < 16; m++) {
            updateT4Translate[m] = palette[((clutStart + m) >>> clutShift) & clutMask];
        }
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
    };
    PixelConverter.updateT8 = function (from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
        if (useAlpha === void 0) { useAlpha = true; }
        if (palette === void 0) { palette = null; }
        if (clutStart === void 0) { clutStart = 0; }
        if (clutShift === void 0) { clutShift = 0; }
        if (clutMask === void 0) { clutMask = 0; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        clutMask &= 0xFF;
        for (var m = 0; m < count; m++)
            to32[m] = palette[clutStart + ((from[fromIndex + m] & clutMask) << clutShift)] | orValue;
    };
    PixelConverter.decode8888 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (useAlpha === void 0) { useAlpha = true; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var from32 = ArrayBufferUtils.uint8ToUint32(from, fromIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        for (var n = 0; n < count; n++)
            to32[n] = from32[n] | orValue;
    };
    PixelConverter.update5551 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (useAlpha === void 0) { useAlpha = true; }
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
    };
    PixelConverter.update5650 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (useAlpha === void 0) { useAlpha = true; }
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
    };
    PixelConverter.update4444 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (useAlpha === void 0) { useAlpha = true; }
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
    };
    PixelConverter.updateT4Translate = new Uint32Array(16);
    return PixelConverter;
})();
exports.PixelConverter = PixelConverter;
//# sourceMappingURL=pixelformat.js.map