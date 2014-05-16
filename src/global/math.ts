interface Math {
	clz32(value: number): number;
	trunc(value: number): number;
	imul(a: number, b: number): number;
	imul32_64(a: number, b: number, result?: number[]): number[];
	umul32_64(a: number, b: number, result?: number[]): number[];
	fround(x: number): number;
	sign(x: number): number;
	rint(x: number): number;
	log2(x: number): number;
	log10(x: number): number;
}

if (!Math.log2) { Math.log2 = (x: number) => { return Math.log(x) / Math.LN2; }; }
if (!Math.log10) { Math.log10 = (x: number) => { return Math.log(x) / Math.LN10; }; }

declare var vec4: {
	create(): Float32Array;
	fromValues(x: number, y: number, z: number, w: number): Float32Array;
	transformMat4(out: Float32Array, a: Float32Array, m: Float32Array): Float32Array;
};

declare var mat4: {
	create(): Float32Array;
	clone(a: Float32Array): Float32Array;
	copy(out: Float32Array, a: Float32Array): Float32Array;
	identity(a: Float32Array): Float32Array;
	multiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array;
	ortho(out: Float32Array, left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array;
};

if (!Math['sign']) {
	Math['sign'] = (x: number) => {
		if (x < 0) return -1;
		if (x > 0) return +1;
		return 0;
	};
}

if (!Math['rint']) {
	Math['rint'] = (value: number) => {
		var twoToThe52 = Math.pow(2, 52); // 2^52
		var sign = Math.sign(value); // preserve sign info
		value = Math.abs(value);
		if (value < twoToThe52) value = ((twoToThe52 + value) - twoToThe52);
		return sign * value; // restore original sign
	};
}

if (!Math['clz32']) {
	Math['clz32'] = (x: number) => {
		x >>>= 0;
		if (x == 0) return 32;
		var result = 0;
		// Binary search.
		if ((x & 0xFFFF0000) === 0) { x <<= 16; result += 16; };
		if ((x & 0xFF000000) === 0) { x <<= 8; result += 8; };
		if ((x & 0xF0000000) === 0) { x <<= 4; result += 4; };
		if ((x & 0xC0000000) === 0) { x <<= 2; result += 2; };
		if ((x & 0x80000000) === 0) { x <<= 1; result += 1; };
		return result;
	};
}

if (!Math['trunc']) {
	Math['trunc'] = function (x: number) {
		return x < 0 ? Math.ceil(x) : Math.floor(x);
	}
}

if (!Math['imul']) {
	Math['imul'] = function (a: number, b: number) {
		var ah = (a >>> 16) & 0xffff;
		var al = a & 0xffff;
		var bh = (b >>> 16) & 0xffff;
		var bl = b & 0xffff;
		// the shift by 0 fixes the sign on the high part
		// the final |0 converts the unsigned value into a signed value
		return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
	}
}

function testMultiply64_Base(a: number, b: number) {
	var result = Integer64.fromInt(a).multiply(Integer64.fromInt(b));
	var result2 = Math.imul32_64(a, b, [1, 1]);
	return {
		int64: result,
		fast: result2,
		compare: (result.low == result2[0]) && (result.high == result2[1]),
	};
}

function testMultiply64_Base_u(a: number, b: number) {
	var result = Integer64.fromUnsignedInt(a).multiply(Integer64.fromUnsignedInt(b));
	var result2 = Math.umul32_64(a, b, [1, 1]);
	return {
		int64: result,
		fast: result2,
		compare: (result.low == result2[0]) && (result.high == result2[1]),
	};
}

function testMultiply64() {
	var values = [0, -1, -2147483648, 2147483647, 777, 1234567, -999999, 99999, 65536, -65536, 65535, -65535, -32768, 32768, -32767, 32767];
	values.forEach((v1) => {
		values.forEach((v2) => {
			var result = testMultiply64_Base(v1, v2);
			if (!result.compare) console.log('signed', v1, v2, [result.int64.low, result.int64.high], result.fast);

			var result = testMultiply64_Base_u(v1, v2);
			if (!result.compare) console.log('unsigned', v1, v2, [result.int64.low, result.int64.high], result.fast);
		});
	});
}

if (!Math.umul32_64) {
	Math.umul32_64 = function (a: number, b: number, result?: number[]) {
		if (result === undefined) result = [0, 0];

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

if (!Math.imul32_64) {
	Math.imul32_64 = function (a: number, b: number, result?: number[]) {
		if (result === undefined) result = [0, 0];

		if (a == 0) return result[0] = result[1] = 0, result;
		if (b == 0) return result[0] = result[1] = 0, result;

		a |= 0, b |= 0;

		if ((a >= -32768 && a <= 32767) && (b >= -32768 && b <= 32767)) {
			result[0] = a * b;
			result[1] = (result[0] < 0) ? -1 : 0;
			return result;
		}

		var doNegate = <any>(a < 0) ^ <any>(b < 0);

		Math.umul32_64(Math.abs(a), Math.abs(b), result);

		if (doNegate) {
			result[0] = ~result[0];
			result[1] = ~result[1];
			result[0] = (result[0] + 1) | 0;
			if (result[0] == 0) result[1] = (result[1] + 1) | 0;
		}

		return result;
	}
}

if (!Math['fround']) {
	Math['fround'] = function (x: number) {
		var f32 = new Float32Array(1);
		return f32[0] = x, f32[0];
	}
}

class BitUtils {
	static mask(value: number) {
		return (1 << value) - 1;
	}

	static bitrev32(v: number) {
		v = ((v >>> 1) & 0x55555555) | ((v & 0x55555555) << 1); // swap odd and even bits
		v = ((v >>> 2) & 0x33333333) | ((v & 0x33333333) << 2); // swap consecutive pairs
		v = ((v >>> 4) & 0x0F0F0F0F) | ((v & 0x0F0F0F0F) << 4); // swap nibbles ... 
		v = ((v >>> 8) & 0x00FF00FF) | ((v & 0x00FF00FF) << 8); // swap bytes
		v = ((v >>> 16) & 0x0000FFFF) | ((v & 0x0000FFFF) << 16); // swap 2-byte long pairs
		return v;
	}

	static rotr(value: number, offset: number) {
		return (value >>> offset) | (value << (32 - offset));
	}

	static clo(x: number) {
		return Math['clz32'](~x);
	}

	static clz(x: number) {
		return Math['clz32'](x);
	}

	static seb(x: number) {
		x = x & 0xFF;
		if (x & 0x80) x = 0xFFFFFF00 | x;
		return x;
	}

	static seh(x: number) {
		x = x & 0xFFFF;
		if (x & 0x8000) x = 0xFFFF0000 | x;
		return x;
	}

	static wsbh(v: number) {
		return ((v & 0xFF00FF00) >>> 8) | ((v & 0x00FF00FF) << 8);
	}

	static wsbw(v: number) {
		return (
			((v & 0xFF000000) >>> 24) |
			((v & 0x00FF0000) >>> 8) |
			((v & 0x0000FF00) << 8) |
			((v & 0x000000FF) << 24)
			);
	}

	static extract(data: number, offset: number, length: number) {
		return (data >> offset) & ((1 << length) - 1);
	}

	static extractBool(data: number, offset: number) {
		return (this.extract(data, offset, 1) != 0);
	}

	static extractSigned(data: number, offset: number, length: number) {
		var mask = this.mask(length);
		var value = this.extract(data, offset, length);
		var signBit = (1 << (offset + (length - 1)));
		if (value & signBit) value |= ~mask;
		return value;
	}

	static extractScale1f(data: number, offset: number, length) {
		var mask = (1 << length) - 1;
		return (((data >>> offset) & mask) / mask)
	}

	static extractScalef(data: number, offset: number, length: number, scale: number) {
		return BitUtils.extractScale1f(data, offset, length) * scale;
	}

	static extractScalei(data: number, offset: number, length: number, scale: number) {
		return this.extractScalef(data, offset, length, scale) | 0;
	}

	static extractEnum<T>(data: number, offset: number, length: number): T {
		return <any>this.extract(data, offset, length);
	}

	static clear(data: number, offset: number, length: number) {
		data &= ~(BitUtils.mask(length) << offset);
		return data;
	}

	static insert(data: number, offset: number, length: number, value: number) {
		value &= BitUtils.mask(length);
		data = BitUtils.clear(data, offset, length);
		data |= value << offset;
		return data;
	}
}

class MathVfpu {
	static vqmul0(s0, s1, s2, s3, t0, t1, t2, t3) { return +(s0 * t3) + (s1 * t2) - (s2 * t1) + (s3 * t0); }
	static vqmul1(s0, s1, s2, s3, t0, t1, t2, t3) { return -(s0 * t2) + (s1 * t3) + (s2 * t0) + (s3 * t1); }
	static vqmul2(s0, s1, s2, s3, t0, t1, t2, t3) { return +(s0 * t1) - (s1 * t0) + (s2 * t3) + (s3 * t2); }
	static vqmul3(s0, s1, s2, s3, t0, t1, t2, t3) { return -(s0 * t0) - (s1 * t1) - (s2 * t2) + (s3 * t3); }

	static vc2i(index: number, value: number) {
		return (value << ((3 - index) * 8)) & 0xFF000000;
	}
	static vuc2i(index: number, value: number) {
		return ((((value >>> (index * 8)) & 0xFF) * 0x01010101) >> 1) & ~0x80000000;
	}

	// @TODO
	static vs2i(index: number, value: number) {
		if ((index % 2) == 0) value <<= 16;
		return value & 0xFFFF0000;
	}
	static vi2f() { return 0; }
	static vi2uc() { return 0; }

	static vf2id() { return 0; }
	static vf2in() { return 0; }
	static vf2iz() { return 0; }
	static vf2iu() { return 0; }
	static vf2h() { return 0; }
	static vh2f() { return 0; }
}

class MathFloat {
	private static floatArray = new Float32Array(1);
	private static intArray = new Int32Array(MathFloat.floatArray.buffer);

	static reinterpretFloatAsInt(floatValue: number) {
		MathFloat.floatArray[0] = floatValue;
		return MathFloat.intArray[0];
	}

	static reinterpretIntAsFloat(integerValue: number) {
		MathFloat.intArray[0] = integerValue;
		return MathFloat.floatArray[0];
	}

	static min(a: number, b: number) { return (a < b) ? a : b; }
	static max(a: number, b: number) { return (a > b) ? a : b; }

	static isnan(n: number) { return isNaN(n); }
	static isinf(n: number) { return n === n / 0; }
	static isnanorinf(n: number) { return MathFloat.isnan(n) || MathFloat.isinf(n); }

	static abs(value: number) { return Math.abs(value); }
	static neg(value: number) { return -value; }
	static ocp(value: number) { return 1 - value; }
	static nrcp(value: number) { return -(1 / value); }
	static sat0(value: number) { return MathUtils.clamp(value, 0, 1); }
	static sat1(value: number) { return MathUtils.clamp(value, -1, 1); }
	static rsq(value: number) { return 1 / Math.sqrt(value); }
	static sqrt(value: number) { return Math.sqrt(value); }

	static rint(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return Math.rint(value);
	}

	static cast(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return (value < 0) ? Math.ceil(value) : Math.floor(value);
	}

	static trunc(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return Math.trunc(value);
	}

	static round(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return Math.round(value);
	}

	static floor(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return Math.floor(value);
	}

	static ceil(value: number) {
		if (!isFinite(value)) return handleCastInfinite(value);
		return Math.ceil(value);
	}

	static cosv1(value: number) { return Math.cos(value * Math.PI * 0.5); }
	static sinv1(value: number) { return Math.sin(value * Math.PI * 0.5); }
	static asinv1(value: number) { return Math.asin(value) / (Math.PI * 0.5); }
	static nsinv1(value: number) { return -Math.sin(0.5 * Math.PI * value); }
	static exp2(value: number) { return Math.pow(2.0, value); }
	static rexp2(value: number) { return 1 / Math.pow(2.0, value); }
	static log2(value: number) { return Math.log2(value); }
	static sign(value: number) { return value ? ((value < 0) ? -1 : 1) : 0; }

	static sign2(left: number, right: number) { var a = left - right; return (((0.0 < a) ? 1 : 0) - ((a < 0.0) ? 1 : 0)); }

	static vslt(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a < b) ? 1 : 0; }
	static vsle(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a <= b) ? 1 : 0; }
	static vsgt(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a > b) ? 1 : 0; }
	static vsge(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a >= b) ? 1 : 0; }
}

function handleCastInfinite(value: number) {
	return (value < 0) ? -2147483648 : 2147483647;
}

function compare<T>(a: T, b: T): number {
	if (a < b) return -1;
	if (a > b) return +1;
	return 0;
}

function parseIntFormat(str: string) {
	str = str.replace(/_/g, '');
	if (str.substr(0, 2) == '0b') return parseInt(str.substr(2), 2);
	if (str.substr(0, 2) == '0x') return parseInt(str.substr(2), 16);
	return parseInt(str, 10);
}

class MathUtils {
	static prevAligned(value: number, alignment: number) {
		return Math.floor(value / alignment) * alignment;
	}

	static isAlignedTo(value: number, alignment: number) {
		return (value % alignment) == 0;
	}

	static requiredBlocks(size: number, blockSize: number) {
		if ((size % blockSize) != 0) {
			return (size / blockSize) + 1;
		}
		else {
			return size / blockSize;
		}
	}

	static isPowerOfTwo(x: number) {
		return (x != 0) && ((x & (x - 1)) == 0);
	}

	static nextAligned(value: number, alignment: number) {
		if (alignment <= 1) return value;
		if ((value % alignment) == 0) return value;
		return value + (alignment - (value % alignment));
	}

	static clamp(v: number, min: number, max: number) {
		if (v < min) return min;
		if (v > max) return max;
		return v;
	}
}

function ToUint32(x) {
	return x >>> 0;
}

function ToInt32(x) {
	return x | 0;
}

class ArrayUtils {
	static create2D<T>(w: number, h: number, generator?: (x, y) => T) {
		if (!generator) generator = (x, y) => null;
		var matrix = <T[][]>[];
		for (var y = 0; y < h; y++) {
			var row = [];
			for (var x = 0; x < w; x++) {
				row.push(generator(x, y));
			}
			matrix.push(row);
		}
		return matrix;
	}

	static range(start: number, end: number) {
		var array = [];
		for (var n = start; n < end; n++) array.push(n);
		return array;
	}
}

function xrange(start: number, end: number) {
	return ArrayUtils.range(start, end);
}