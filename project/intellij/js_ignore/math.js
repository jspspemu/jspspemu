self['polyfills'] = self['polyfills'] || {};
self['polyfills']['log2'] = !Math['log2'];
if (!Math.log2) {
    Math.log2 = function (x) {
        return Math.log(x) / Math.LN2;
    };
}
self['polyfills']['log10'] = !Math['log10'];
if (!Math.log10) {
    Math.log10 = function (x) {
        return Math.log(x) / Math.LN10;
    };
}
self['polyfills']['sign'] = !Math['sign'];
if (!Math['sign']) {
    Math['sign'] = function (x) {
        if (x < 0)
            return -1;
        if (x > 0)
            return +1;
        return 0;
    };
}
self['polyfills']['rint'] = !Math['rint'];
if (!Math['rint']) {
    Math['rint'] = function (value) {
        var twoToThe52 = Math.pow(2, 52); // 2^52
        var sign = Math.sign(value); // preserve sign info
        value = Math.abs(value);
        if (value < twoToThe52)
            value = ((twoToThe52 + value) - twoToThe52);
        return sign * value; // restore original sign
    };
}
self['polyfills']['clz32'] = !Math['clz32'];
if (!Math['clz32']) {
    Math['clz32'] = function (x) {
        x >>>= 0;
        if (x == 0)
            return 32;
        var result = 0;
        // Binary search.
        if ((x & 0xFFFF0000) === 0) {
            x <<= 16;
            result += 16;
        }
        ;
        if ((x & 0xFF000000) === 0) {
            x <<= 8;
            result += 8;
        }
        ;
        if ((x & 0xF0000000) === 0) {
            x <<= 4;
            result += 4;
        }
        ;
        if ((x & 0xC0000000) === 0) {
            x <<= 2;
            result += 2;
        }
        ;
        if ((x & 0x80000000) === 0) {
            x <<= 1;
            result += 1;
        }
        ;
        return result;
    };
}
self['polyfills']['trunc'] = !Math['trunc'];
if (!Math['trunc']) {
    Math['trunc'] = function (x) {
        if (x < 0) {
            return Math.ceil(x) | 0;
        }
        else {
            return Math.floor(x) | 0;
        }
    };
}
self['polyfills']['imul'] = !Math['imul'];
if (!Math['imul']) {
    Math['imul'] = function (a, b) {
        var ah = (a >>> 16) & 0xffff;
        var al = a & 0xffff;
        var bh = (b >>> 16) & 0xffff;
        var bl = b & 0xffff;
        // the shift by 0 fixes the sign on the high part
        // the final |0 converts the unsigned value into a signed value
        return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
    };
}
//function testMultiply64_Base(a: number, b: number) {
//	var result = Integer64.fromInt(a).multiply(Integer64.fromInt(b));
//	var result2 = Math.imul32_64(a, b, [1, 1]);
//	return {
//		int64: result,
//		fast: result2,
//		compare: (result.low == result2[0]) && (result.high == result2[1]),
//	};
//}
//
//function testMultiply64_Base_u(a: number, b: number) {
//	var result = Integer64.fromUnsignedInt(a).multiply(Integer64.fromUnsignedInt(b));
//	var result2 = Math.umul32_64(a, b, [1, 1]);
//	return {
//		int64: result,
//		fast: result2,
//		compare: (result.low == result2[0]) && (result.high == result2[1]),
//	};
//}
//
//function testMultiply64() {
//	var values = [0, -1, -2147483648, 2147483647, 777, 1234567, -999999, 99999, 65536, -65536, 65535, -65535, -32768, 32768, -32767, 32767];
//	values.forEach((v1) => {
//		values.forEach((v2) => {
//			var result = testMultiply64_Base(v1, v2);
//			if (!result.compare) console.log('signed', v1, v2, [result.int64.low, result.int64.high], result.fast);
//
//			var result = testMultiply64_Base_u(v1, v2);
//			if (!result.compare) console.log('unsigned', v1, v2, [result.int64.low, result.int64.high], result.fast);
//		});
//	});
//}
self['polyfills']['umul32_64'] = !Math['umul32_64'];
if (!Math.umul32_64) {
    Math.umul32_64 = function (a, b, result) {
        if (result === undefined)
            result = [0, 0];
        a >>>= 0;
        b >>>= 0;
        if (a < 32767 && b < 65536) {
            result[0] = a * b;
            result[1] = (result[0] < 0) ? -1 : 0;
            return result;
        }
        var a00 = a & 0xFFFF, a16 = a >>> 16;
        var b00 = b & 0xFFFF, b16 = b >>> 16;
        var c00 = a00 * b00;
        var c16 = (c00 >>> 16) + (a16 * b00);
        var c32 = c16 >>> 16;
        c16 = (c16 & 0xFFFF) + (a00 * b16);
        c32 += c16 >>> 16;
        var c48 = c32 >>> 16;
        c32 = (c32 & 0xFFFF) + (a16 * b16);
        c48 += c32 >>> 16;
        result[0] = ((c16 & 0xFFFF) << 16) | (c00 & 0xFFFF);
        result[1] = ((c48 & 0xFFFF) << 16) | (c32 & 0xFFFF);
        return result;
    };
}
self['polyfills']['imul32_64'] = !Math['imul32_64'];
if (!Math.imul32_64) {
    Math.imul32_64 = function (a, b, result) {
        if (result === undefined)
            result = [0, 0];
        if (a == 0)
            return result[0] = result[1] = 0, result;
        if (b == 0)
            return result[0] = result[1] = 0, result;
        a |= 0, b |= 0;
        if ((a >= -32768 && a <= 32767) && (b >= -32768 && b <= 32767)) {
            result[0] = a * b;
            result[1] = (result[0] < 0) ? -1 : 0;
            return result;
        }
        var doNegate = (a < 0) ^ (b < 0);
        Math.umul32_64(Math.abs(a), Math.abs(b), result);
        if (doNegate) {
            result[0] = ~result[0];
            result[1] = ~result[1];
            result[0] = (result[0] + 1) | 0;
            if (result[0] == 0)
                result[1] = (result[1] + 1) | 0;
        }
        return result;
    };
}
self['polyfills']['fround'] = !Math['fround'];
if (!Math['fround']) {
    Math['fround'] = function (x) {
        var f32 = new Float32Array(1);
        return f32[0] = x, f32[0];
    };
}
var BitUtils = (function () {
    function BitUtils() {
    }
    BitUtils.mask = function (value) {
        return (1 << value) - 1;
    };
    BitUtils.bitrev32 = function (v) {
        v = ((v >>> 1) & 0x55555555) | ((v & 0x55555555) << 1); // swap odd and even bits
        v = ((v >>> 2) & 0x33333333) | ((v & 0x33333333) << 2); // swap consecutive pairs
        v = ((v >>> 4) & 0x0F0F0F0F) | ((v & 0x0F0F0F0F) << 4); // swap nibbles ... 
        v = ((v >>> 8) & 0x00FF00FF) | ((v & 0x00FF00FF) << 8); // swap bytes
        v = ((v >>> 16) & 0x0000FFFF) | ((v & 0x0000FFFF) << 16); // swap 2-byte long pairs
        return v;
    };
    BitUtils.rotr = function (value, offset) {
        return (value >>> offset) | (value << (32 - offset));
    };
    BitUtils.clo = function (x) {
        return Math['clz32'](~x);
    };
    BitUtils.clz = function (x) {
        return Math['clz32'](x);
    };
    BitUtils.seb = function (x) {
        x = x & 0xFF;
        if (x & 0x80)
            x = 0xFFFFFF00 | x;
        return x;
    };
    BitUtils.seh = function (x) {
        //x = x & 0xFFFF;
        //if (x & 0x8000) x = 0xFFFF0000 | x;
        //return x;
        return (((x & 0xFFFF) << 16) >> 16);
    };
    BitUtils.wsbh = function (v) {
        return ((v & 0xFF00FF00) >>> 8) | ((v & 0x00FF00FF) << 8);
    };
    BitUtils.wsbw = function (v) {
        return (((v & 0xFF000000) >>> 24) | ((v & 0x00FF0000) >>> 8) | ((v & 0x0000FF00) << 8) | ((v & 0x000000FF) << 24));
    };
    BitUtils.extract = function (data, offset, length) {
        return (data >> offset) & ((1 << length) - 1);
    };
    BitUtils.extractBool = function (data, offset) {
        return (this.extract(data, offset, 1) != 0);
    };
    BitUtils.extractSigned = function (data, offset, length) {
        var mask = this.mask(length);
        var value = this.extract(data, offset, length);
        var signBit = (1 << (offset + (length - 1)));
        if (value & signBit)
            value |= ~mask;
        return value;
    };
    BitUtils.extractScale1f = function (data, offset, length) {
        var mask = (1 << length) - 1;
        return (((data >>> offset) & mask) / mask);
    };
    BitUtils.extractScalef = function (data, offset, length, scale) {
        return BitUtils.extractScale1f(data, offset, length) * scale;
    };
    BitUtils.extractScalei = function (data, offset, length, scale) {
        return this.extractScalef(data, offset, length, scale) | 0;
    };
    BitUtils.extractEnum = function (data, offset, length) {
        return this.extract(data, offset, length);
    };
    BitUtils.clear = function (data, offset, length) {
        data &= ~(BitUtils.mask(length) << offset);
        return data;
    };
    BitUtils.insert = function (data, offset, length, value) {
        value &= BitUtils.mask(length);
        data = BitUtils.clear(data, offset, length);
        data |= value << offset;
        return data;
    };
    return BitUtils;
})();
var MathVfpu = (function () {
    function MathVfpu() {
    }
    MathVfpu.vqmul0 = function (s0, s1, s2, s3, t0, t1, t2, t3) {
        return +(s0 * t3) + (s1 * t2) - (s2 * t1) + (s3 * t0);
    };
    MathVfpu.vqmul1 = function (s0, s1, s2, s3, t0, t1, t2, t3) {
        return -(s0 * t2) + (s1 * t3) + (s2 * t0) + (s3 * t1);
    };
    MathVfpu.vqmul2 = function (s0, s1, s2, s3, t0, t1, t2, t3) {
        return +(s0 * t1) - (s1 * t0) + (s2 * t3) + (s3 * t2);
    };
    MathVfpu.vqmul3 = function (s0, s1, s2, s3, t0, t1, t2, t3) {
        return -(s0 * t0) - (s1 * t1) - (s2 * t2) + (s3 * t3);
    };
    MathVfpu.vc2i = function (index, value) {
        return (value << ((3 - index) * 8)) & 0xFF000000;
    };
    MathVfpu.vuc2i = function (index, value) {
        return ((((value >>> (index * 8)) & 0xFF) * 0x01010101) >> 1) & ~0x80000000;
    };
    // @TODO
    MathVfpu.vs2i = function (index, value) {
        if ((index % 2) == 0)
            value <<= 16;
        return value & 0xFFFF0000;
    };
    MathVfpu.vi2f = function (value, count) {
        return MathFloat.scalb(value, count);
    };
    MathVfpu.vi2uc = function (x, y, z, w) {
        return (0 | ((x < 0) ? 0 : ((x >>> 23) << 0)) | ((y < 0) ? 0 : ((y >>> 23) << 8)) | ((z < 0) ? 0 : ((z >>> 23) << 16)) | ((w < 0) ? 0 : ((w >>> 23) << 24)));
    };
    MathVfpu.vf2id = function (value, count) {
        return MathFloat.floor(MathFloat.scalb(value, count));
    };
    MathVfpu.vf2in = function (value, count) {
        return MathFloat.rint(MathFloat.scalb(value, count));
    };
    MathVfpu.vf2iu = function (value, count) {
        return MathFloat.ceil(MathFloat.scalb(value, count));
    };
    MathVfpu.vf2iz = function (Value, count) {
        var ScalabValue = MathFloat.scalb(Value, count);
        var DoubleValue = (Value >= 0) ? MathFloat.floor(ScalabValue) : MathFloat.ceil(ScalabValue);
        return isNaN(DoubleValue) ? 0x7FFFFFFF : DoubleValue;
    };
    MathVfpu.vf2h = function () {
        //debugger;
        return 0;
    };
    MathVfpu.vh2f = function () {
        //debugger;
        return 0;
    };
    return MathVfpu;
})();
var MathFloat = (function () {
    function MathFloat() {
    }
    MathFloat.reinterpretFloatAsInt = function (floatValue) {
        MathFloat.floatArray[0] = floatValue;
        return MathFloat.intArray[0];
    };
    MathFloat.reinterpretIntAsFloat = function (integerValue) {
        MathFloat.intArray[0] = integerValue;
        return MathFloat.floatArray[0];
    };
    MathFloat.scalb = function (value, count) {
        return value * Math.pow(2, count);
    };
    MathFloat.min = function (a, b) {
        return (a < b) ? a : b;
    };
    MathFloat.max = function (a, b) {
        return (a > b) ? a : b;
    };
    MathFloat.isnan = function (n) {
        return isNaN(n);
    };
    MathFloat.isinf = function (n) {
        return n === n / 0;
    };
    MathFloat.isnanorinf = function (n) {
        return MathFloat.isnan(n) || MathFloat.isinf(n);
    };
    MathFloat.abs = function (value) {
        return Math.abs(value);
    };
    MathFloat.neg = function (value) {
        //return MathFloat.reinterpretIntAsFloat(MathFloat.reinterpretFloatAsInt(value) ^ 0x80000000);
        return -value;
    };
    MathFloat.ocp = function (value) {
        return 1 - value;
    };
    MathFloat.nrcp = function (value) {
        return -(1 / value);
    };
    MathFloat.sat0 = function (value) {
        return MathUtils.clamp(value, 0, +1);
    };
    MathFloat.sat1 = function (value) {
        return MathUtils.clamp(value, -1, +1);
    };
    MathFloat.rsq = function (value) {
        return 1 / Math.sqrt(value);
    };
    MathFloat.sqrt = function (value) {
        return Math.sqrt(value);
    };
    MathFloat.rint = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return Math.rint(value);
    };
    MathFloat.cast = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return (value < 0) ? Math.ceil(value) : Math.floor(value);
    };
    MathFloat.trunc = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return Math.trunc(value);
    };
    MathFloat.round = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return Math.round(value);
    };
    MathFloat.floor = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return Math.floor(value);
    };
    MathFloat.ceil = function (value) {
        if (!isFinite(value))
            return handleCastInfinite(value);
        return Math.ceil(value);
    };
    MathFloat.cosv1 = function (value) {
        return Math.cos(value * Math.PI * 0.5);
    };
    MathFloat.sinv1 = function (value) {
        return Math.sin(value * Math.PI * 0.5);
    };
    MathFloat.nsinv1 = function (value) {
        return -Math.sin(value * Math.PI * 0.5);
    };
    MathFloat.asinv1 = function (value) {
        return Math.asin(value) / (Math.PI * 0.5);
    };
    MathFloat.exp2 = function (value) {
        return Math.pow(2.0, value);
    };
    MathFloat.rexp2 = function (value) {
        return 1 / Math.pow(2.0, value);
    };
    MathFloat.log2 = function (value) {
        return Math.log2(value);
    };
    MathFloat.sign = function (value) {
        return Math.sign(value);
    };
    MathFloat.sign2 = function (left, right) {
        var a = left - right;
        return (((0.0 < a) ? 1 : 0) - ((a < 0.0) ? 1 : 0));
    };
    MathFloat.vslt = function (a, b) {
        if (isNaN(a) || isNaN(b))
            return 0;
        return (a < b) ? 1 : 0;
    };
    MathFloat.vsle = function (a, b) {
        if (isNaN(a) || isNaN(b))
            return 0;
        return (a <= b) ? 1 : 0;
    };
    MathFloat.vsgt = function (a, b) {
        if (isNaN(a) || isNaN(b))
            return 0;
        return (a > b) ? 1 : 0;
    };
    MathFloat.vsge = function (a, b) {
        if (isNaN(a) || isNaN(b))
            return 0;
        return (a >= b) ? 1 : 0;
    };
    MathFloat.clamp = function (v, min, max) {
        if (v < min)
            return min;
        if (v > max)
            return max;
        return v;
    };
    MathFloat.reinterpretBuffer = new ArrayBuffer(4);
    MathFloat.floatArray = new Float32Array(MathFloat.reinterpretBuffer);
    MathFloat.intArray = new Int32Array(MathFloat.reinterpretBuffer);
    return MathFloat;
})();
function handleCastInfinite(value) {
    return (value < 0) ? -2147483648 : 2147483647;
}
function compare(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return +1;
    return 0;
}
function parseIntFormat(str) {
    str = str.replace(/_/g, '');
    if (str.substr(0, 2) == '0b')
        return parseInt(str.substr(2), 2);
    if (str.substr(0, 2) == '0x')
        return parseInt(str.substr(2), 16);
    return parseInt(str, 10);
}
var MathUtils = (function () {
    function MathUtils() {
    }
    MathUtils.sextend16 = function (value) {
        return (((value & 0xFFFF) << 16) >> 16);
        //value >>= 0; if (value & 0x8000) return value | 0xFFFF0000; else return value;
    };
    MathUtils.prevAligned = function (value, alignment) {
        return Math.floor(value / alignment) * alignment;
    };
    MathUtils.isAlignedTo = function (value, alignment) {
        return (value % alignment) == 0;
    };
    MathUtils.requiredBlocks = function (size, blockSize) {
        if ((size % blockSize) != 0) {
            return (size / blockSize) + 1;
        }
        else {
            return size / blockSize;
        }
    };
    MathUtils.isPowerOfTwo = function (x) {
        return (x != 0) && ((x & (x - 1)) == 0);
    };
    MathUtils.nextAligned = function (value, alignment) {
        if (alignment <= 1)
            return value;
        if ((value % alignment) == 0)
            return value;
        return value + (alignment - (value % alignment));
    };
    MathUtils.clamp = function (v, min, max) {
        if (v < min)
            return min;
        if (v > max)
            return max;
        return v;
    };
    return MathUtils;
})();
var IntUtils = (function () {
    function IntUtils() {
    }
    IntUtils.toHexString = function (value, padCount) {
        var str = (value >>> 0).toString(16);
        while (str.length < padCount)
            str = '0' + str;
        return str;
    };
    return IntUtils;
})();
var StringUtils = (function () {
    function StringUtils() {
    }
    StringUtils.padLeft = function (text, padchar, length) {
        while (text.length < length)
            text = padchar + text;
        return text;
    };
    return StringUtils;
})();
function ToUint32(x) {
    return x >>> 0;
}
function ToInt32(x) {
    return x | 0;
}
var ArrayUtils = (function () {
    function ArrayUtils() {
    }
    ArrayUtils.create2D = function (w, h, generator) {
        if (!generator)
            generator = function (x, y) { return null; };
        var matrix = [];
        for (var y = 0; y < h; y++) {
            var row = [];
            for (var x = 0; x < w; x++) {
                row.push(generator(x, y));
            }
            matrix.push(row);
        }
        return matrix;
    };
    ArrayUtils.range = function (start, end) {
        var array = [];
        for (var n = start; n < end; n++)
            array.push(n);
        return array;
    };
    return ArrayUtils;
})();
function xrange(start, end) {
    return ArrayUtils.range(start, end);
}
//# sourceMappingURL=math.js.map