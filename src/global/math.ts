declare global {
    interface Math {
        clz32(value: number): number;
        trunc(value: number): number;
        imul(a: number, b: number): number;
        imul32_64(a: number, b: number, result?: Int32Array): Int32Array;
        umul32_64(a: number, b: number, result?: Int32Array): Int32Array;
        fround(x: number): number;
        sign(x: number): number;
        rint(x: number): number;
        log2(x: number): number;
        log10(x: number): number;
    }
}

export const MAT4_3_IDX = new Uint32Array([
	0, 1, 2,
	4, 5, 6,
	8, 9, 10,
	12, 13, 14
]);
export class mat4x3 {
	static create() {
		return new Float32Array([
			1,0,0,
			0,1,0,
			0,0,1,
			0,0,0,
		]);
	}
	static identity(data:Float32Array) {
		data[0] = 1; data[1] = 0; data[2] = 0;
		data[3] = 0; data[4] = 1; data[5] = 0;
		data[6] = 0; data[7] = 0; data[8] = 1;
		data[9] = 0; data[10] = 0; data[11] = 0;
	}
}
export class mat4 {
	static create() {
		return new Float32Array([
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1
		]);
	}
	static from4x3(out:Float32Array, mat4x3:Float32Array) {
		for (let n = 0; n < 12; n++) out[MAT4_3_IDX[n]] = mat4x3[n];
		out[3] = 0.0;
		out[7] = 0.0;
		out[11] = 0.0;
		out[15] = 1.0;
	}
	static from4x4(out:Float32Array, mat4x4:Float32Array) {
		out.set(mat4x4);
	}
	
	static identity(data:Float32Array) {
		data[0] = 1; data[1] = 0; data[2] = 0; data[3] = 0;
		data[4] = 0; data[5] = 1; data[6] = 0; data[7] = 0;
		data[8] = 0; data[9] = 0; data[10] = 1; data[11] = 0;
		data[12] = 0; data[13] = 0; data[14] = 0; data[15] = 1;
	}
	static ortho(out:Float32Array, left:number, right:number, bottom:number, top:number, near:number, far:number) {
        const lr = 1 / (left - right),
			bt = 1 / (bottom - top),
			nf = 1 / (near - far);
		out[0] = -2 * lr;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
		out[4] = 0;
		out[5] = -2 * bt;
		out[6] = 0;
		out[7] = 0;
		out[8] = 0;
		out[9] = 0;
		out[10] = 2 * nf;
		out[11] = 0;
		out[12] = (left + right) * lr;
		out[13] = (top + bottom) * bt;
		out[14] = (far + near) * nf;
		out[15] = 1;
		return out;
	}
	static multiply(out:Float32Array, a:Float32Array, b:Float32Array) {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
			a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
			a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
			a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

		// Cache only the current line of the second matrix
        let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
		out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
		out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
		out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
		out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

		b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
		out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
		out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
		out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
		out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

		b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
		out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
		out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
		out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
		out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

		b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
		out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
		out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
		out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
		out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
		return out;
	}
	static scale(out:Float32Array, a:Float32Array, v:Float32Array) {
        const x = v[0], y = v[1], z = v[2];

        out[0] = a[0] * x;
		out[1] = a[1] * x;
		out[2] = a[2] * x;
		out[3] = a[3] * x;
		out[4] = a[4] * y;
		out[5] = a[5] * y;
		out[6] = a[6] * y;
		out[7] = a[7] * y;
		out[8] = a[8] * z;
		out[9] = a[9] * z;
		out[10] = a[10] * z;
		out[11] = a[11] * z;
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
		return out;
	}
	static translate(out:Float32Array, a:Float32Array, v:Float32Array) {
		let x = v[0], y = v[1], z = v[2],
			a00:number, a01:number, a02:number, a03:number,
			a10:number, a11:number, a12:number, a13:number,
			a20:number, a21:number, a22:number, a23:number;

		if (a === out) {
			out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
			out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
			out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
			out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
		} else {
			a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
			a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
			a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

			out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
			out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
			out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

			out[12] = a00 * x + a10 * y + a20 * z + a[12];
			out[13] = a01 * x + a11 * y + a21 * z + a[13];
			out[14] = a02 * x + a12 * y + a22 * z + a[14];
			out[15] = a03 * x + a13 * y + a23 * z + a[15];
		}

		return out;
	}
}

//declare const global:any;
//if (typeof self == 'undefined') window = self = global;

const _self = window as any

_self['polyfills'] = _self['polyfills'] || {};

_self['polyfills']['log2'] = !Math['log2'];
if (!Math.log2) {
	Math.log2 = (x: number) => { return Math.log(x) / Math.LN2; };
}

_self['polyfills']['log10'] = !Math['log10'];
if (!Math.log10) {
	Math.log10 = (x: number) => { return Math.log(x) / Math.LN10; };
}

_self['polyfills']['sign'] = !Math['sign'];
if (!Math['sign']) {
	Math['sign'] = (x: number) => {
		if (x < 0) return -1;
		if (x > 0) return +1;
		return 0;
	};
}

_self['polyfills']['rint'] = !Math['rint'];
if (!Math['rint']) {
	Math['rint'] = (value: number) => {
        const twoToThe52 = Math.pow(2, 52); // 2^52
        const sign = Math.sign(value); // preserve sign info
		value = Math.abs(value);
		if (value < twoToThe52) value = ((twoToThe52 + value) - twoToThe52);
		return sign * value; // restore original sign
	};
}

_self['polyfills']['clz32'] = !Math['clz32'];
if (!Math['clz32']) {
	Math['clz32'] = (x: number) => {
		x >>>= 0;
		if (x == 0) return 32;
        let result = 0;
        // Binary search.
		if ((x & 0xFFFF0000) === 0) { x <<= 16; result += 16; }
		if ((x & 0xFF000000) === 0) { x <<= 8; result += 8; }
		if ((x & 0xF0000000) === 0) { x <<= 4; result += 4; }
		if ((x & 0xC0000000) === 0) { x <<= 2; result += 2; }
		if ((x & 0x80000000) === 0) { x <<= 1; result += 1; }
		return result;
	};
}

_self['polyfills']['trunc'] = !Math['trunc'];
if (!Math['trunc']) {
	Math['trunc'] = function (x: number) {
		if (x < 0) {
			return Math.ceil(x) | 0;
		} else {
			return Math.floor(x) | 0;
		}
	}
}

_self['polyfills']['imul'] = !Math['imul'];
if (!Math['imul']) {
	Math['imul'] = function (a: number, b: number) {
        const ah = (a >>> 16) & 0xffff;
        const al = a & 0xffff;
        const bh = (b >>> 16) & 0xffff;
        const bl = b & 0xffff;
        // the shift by 0 fixes the sign on the high part
		// the final |0 converts the unsigned value into a signed value
		return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
	}
}

//function testMultiply64_Base(a: number, b: number) {
//	const result = Integer64.fromInt(a).multiply(Integer64.fromInt(b));
//	const result2 = Math.imul32_64(a, b, [1, 1]);
//	return {
//		int64: result,
//		fast: result2,
//		compare: (result.low == result2[0]) && (result.high == result2[1]),
//	};
//}
//
//function testMultiply64_Base_u(a: number, b: number) {
//	const result = Integer64.fromUnsignedInt(a).multiply(Integer64.fromUnsignedInt(b));
//	const result2 = Math.umul32_64(a, b, [1, 1]);
//	return {
//		int64: result,
//		fast: result2,
//		compare: (result.low == result2[0]) && (result.high == result2[1]),
//	};
//}
//
//function testMultiply64() {
//	const values = [0, -1, -2147483648, 2147483647, 777, 1234567, -999999, 99999, 65536, -65536, 65535, -65535, -32768, 32768, -32767, 32767];
//	values.forEach((v1) => {
//		values.forEach((v2) => {
//			const result = testMultiply64_Base(v1, v2);
//			if (!result.compare) console.log('signed', v1, v2, [result.int64.low, result.int64.high], result.fast);
//
//			const result = testMultiply64_Base_u(v1, v2);
//			if (!result.compare) console.log('unsigned', v1, v2, [result.int64.low, result.int64.high], result.fast);
//		});
//	});
//}

_self['polyfills']['umul32_64'] = !Math['umul32_64'];
if (!Math.umul32_64) {
	Math.umul32_64 = function (a: number, b: number, result?: Int32Array) {
		if (result === undefined) result = new Int32Array(2);

		a >>>= 0;
		b >>>= 0;

		if (a < 32767 && b < 65536) {
			result[0] = a * b;
			result[1] = (result[0] < 0) ? -1 : 0;
			return result;
		}

        const a00 = a & 0xFFFF, a16 = a >>> 16;
        const b00 = b & 0xFFFF, b16 = b >>> 16;

        const c00 = a00 * b00;
        let c16 = (c00 >>> 16) + (a16 * b00);
        let c32 = c16 >>> 16;
        c16 = (c16 & 0xFFFF) + (a00 * b16);
		c32 += c16 >>> 16;
        let c48 = c32 >>> 16;
        c32 = (c32 & 0xFFFF) + (a16 * b16);
		c48 += c32 >>> 16;

		result[0] = ((c16 & 0xFFFF) << 16) | (c00 & 0xFFFF);
		result[1] = ((c48 & 0xFFFF) << 16) | (c32 & 0xFFFF);
		return result;
	};
}

_self['polyfills']['imul32_64'] = !Math['imul32_64'];
if (!Math.imul32_64) {
	Math.imul32_64 = function (a: number, b: number, result?: Int32Array) {
		if (result === undefined) result = new Int32Array(2);

		if (a == 0) {
			result[0] = result[1] = 0;
			return result;
		}
		if (b == 0) {
			result[0] = result[1] = 0;
			return result;
		}

		a |= 0;
		b |= 0;

		if ((a >= -32768 && a <= 32767) && (b >= -32768 && b <= 32767)) {
			result[0] = a * b;
			result[1] = (result[0] < 0) ? -1 : 0;
			return result;
		}

        const doNegate = <any>(a < 0) ^ <any>(b < 0);

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

_self['polyfills']['fround'] = !Math['fround'];
if (!Math['fround']) {
	Math['fround'] = function (x: number) {
        const f32 = new Float32Array(1);
        f32[0] = x;
		return f32[0];
	}
}

export class BitUtils {
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

	static rotr(value: number, offset: number) { return (value >>> offset) | (value << (32 - offset)); }
	static clo(x: number) { return Math.clz32(~x) }
	static clz(x: number) { return Math.clz32(x) }
	static seb(x: number) { return (x << 24) >> 24 }
	static seh(x: number) { return (x << 16) >> 16 }
	static wsbh(v: number) { return ((v & 0xFF00FF00) >>> 8) | ((v & 0x00FF00FF) << 8) }
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
        const mask = this.mask(length);
        const signBit = (1 << (offset + (length - 1)));
        let value = this.extract(data, offset, length);
        if ((value & signBit) != 0) value |= ~mask;
		return value;
	}

	static extractScale1f(data: number, offset: number, length: number) {
        const mask = (1 << length) - 1;
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

    static withBit(initial: number, bit: number, set: boolean): number {
	    return this.withMask(initial, 1 << bit, set)
    }

    static withMask(initial: number, mask: number, set: boolean): number {
        return set ? (initial | mask) : (initial & ~mask)
    }
}

export class MathVfpu {
	static vqmul0(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return +(s0 * t3) + (s1 * t2) - (s2 * t1) + (s3 * t0); }
	static vqmul1(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return -(s0 * t2) + (s1 * t3) + (s2 * t0) + (s3 * t1); }
	static vqmul2(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return +(s0 * t1) - (s1 * t0) + (s2 * t3) + (s3 * t2); }
	static vqmul3(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return -(s0 * t0) - (s1 * t1) - (s2 * t2) + (s3 * t3); }

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
	static vi2f(value: number, count: number) {
		return MathFloat.scalb(value, count);
	}
	static vi2uc(x: number, y: number, z: number, w: number) {
		return (0
			| ((x < 0) ? 0 : ((x >>> 23) << 0))
			| ((y < 0) ? 0 : ((y >>> 23) << 8))
			| ((z < 0) ? 0 : ((z >>> 23) << 16))
			| ((w < 0) ? 0 : ((w >>> 23) << 24))
		);
	}

	static vf2id(value: number, count: number) {
		return MathFloat.floor(MathFloat.scalb(value, count));
	}
	static vf2in(value: number, count: number) {
		return MathFloat.rint(MathFloat.scalb(value, count));
	}
	static vf2iu(value: number, count: number) {
		return MathFloat.ceil(MathFloat.scalb(value, count));
	}
	static vf2iz(Value: number, count: number) {
        const ScalabValue = MathFloat.scalb(Value, count);
        const DoubleValue = (Value >= 0) ? MathFloat.floor(ScalabValue) : MathFloat.ceil(ScalabValue);
        return isNaN(DoubleValue) ? 0x7FFFFFFF : DoubleValue;
	}
	static vf2h() {
		debugger;
		return 0;
	}
	static vh2f() {
		debugger;
		return 0;
	}
}

export class MathFloat {
	private static reinterpretBuffer = new ArrayBuffer(4);
	private static floatArray = new Float32Array(MathFloat.reinterpretBuffer);
	private static intArray = new Int32Array(MathFloat.reinterpretBuffer);

	static reinterpretFloatAsInt(floatValue: number) {
		MathFloat.floatArray[0] = floatValue;
		return MathFloat.intArray[0];
	}

	static reinterpretIntAsFloat(integerValue: number) {
		MathFloat.intArray[0] = integerValue;
		return MathFloat.floatArray[0];
	}

	static scalb(value: number, count: number) {
		return value * Math.pow(2, count);
	}

	static min(a: number, b: number) { return (a < b) ? a : b; }
	static max(a: number, b: number) { return (a > b) ? a : b; }

	static isnan(n: number) { return isNaN(n); }
	static isinf(n: number) { return n === n / 0; }
	static isnanorinf(n: number) { return MathFloat.isnan(n) || MathFloat.isinf(n); }

	static abs(value: number) { return Math.abs(value); }
	static neg(value: number) {
		//return MathFloat.reinterpretIntAsFloat(MathFloat.reinterpretFloatAsInt(value) ^ 0x80000000);
		return -value;
	}
	static ocp(value: number) { return 1 - value; }
	static nrcp(value: number) { return -(1 / value); }
	static sat0(value: number) { return MathUtils.clamp(value, 0, +1); }
	static sat1(value: number) { return MathUtils.clamp(value, -1, +1); }
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
	static nsinv1(value: number) { return -Math.sin(value * Math.PI * 0.5); }
	static asinv1(value: number) { return Math.asin(value) / (Math.PI * 0.5); }
	static exp2(value: number) { return Math.pow(2.0, value); }
	static rexp2(value: number) { return 1 / Math.pow(2.0, value); }
	static log2(value: number) { return Math.log2(value); }
	static sign(value: number) { return Math.sign(value); }

	static sign2(left: number, right: number) {
        const a = left - right;
        return (((0.0 < a) ? 1 : 0) - ((a < 0.0) ? 1 : 0)); }

	static vslt(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a < b) ? 1 : 0; }
	static vsle(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a <= b) ? 1 : 0; }
	static vsgt(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a > b) ? 1 : 0; }
	static vsge(a: number, b: number) { if (isNaN(a) || isNaN(b)) return 0; return (a >= b) ? 1 : 0; }

	static clamp(v: number, min: number, max: number) {
		if (v < min) return min;
		if (v > max) return max;
		return v;
	}
}

export function handleCastInfinite(value: number) {
	return (value < 0) ? -2147483648 : 2147483647
}

export function compare<T>(a: T, b: T): number {
	if (a < b) return -1
	if (a > b) return +1
	return 0
}

export function parseIntFormat(str: string) {
	str = str.replace(/_/g, '')
	if (str.substr(0, 2) == '0b') return parseInt(str.substr(2), 2)
	if (str.substr(0, 2) == '0x') return parseInt(str.substr(2), 16)
	return parseInt(str, 10)
}

export class MathUtils {
	static sextend16(value: number) {
		return (((value & 0xFFFF) << 16) >> 16)
		//value >>= 0; if (value & 0x8000) return value | 0xFFFF0000; else return value;
	}
	
	static interpolate(a:number, b:number, ratio:number) {
		return a * (1 - ratio) + b * ratio
	}

	static prevAligned(value: number, alignment: number) {
		return Math.floor(value / alignment) * alignment
	}

	static isAlignedTo(value: number, alignment: number) {
		return (value % alignment) == 0
	}

	static requiredBlocks(size: number, blockSize: number) {
		if ((size % blockSize) != 0) {
			return (size / blockSize) + 1
		}
		else {
			return size / blockSize
		}
	}

	static isPowerOfTwo(x: number) {
		return (x != 0) && ((x & (x - 1)) == 0)
	}

	static nextAligned(value: number, alignment: number) {
		if (alignment <= 1) return value
		return value + ((alignment - (value % alignment)) % alignment)
	}
	
	static clamp01(v: number) {
		if (v < 0.0) return 0.0
		if (v > 1.0) return 1.0
		return v
	}

	static clamp(v: number, min: number, max: number) {
		if (v < min) return min;
		if (v > max) return max;
		return v;
	}

    static clampM1_1(v: number) {
	    return this.clamp(v, -1, +1)
    }

    static clamp0_255(v: number) {
	    return this.clamp(v, 0, 255)
    }

    static transformRange(value: number, srcMin: number, srcMax: number, dstMin: number, dstMax: number): number {
        return this.transformRange01((value - srcMin) / (srcMax - srcMin), dstMin, dstMax)
    }

    static transformRange01(ratio: number, dstMin: number, dstMax: number): number {
        return ratio * (dstMax - dstMin) + dstMin
    }
}

export class IntUtils {
	static toHexString(value: number, padCount: number) {
        let str = (value >>> 0).toString(16);
        while (str.length < padCount) str = '0' + str;
		return str;
	}
}

export class StringUtils {
	static padLeft(text: string, padchar: string, length: number) {
		while (text.length < length) text = padchar + text;
		return text;
	}
}

export function ToUint32(x:number) { return x >>> 0; }
export function ToInt32(x:number) { return x | 0; }

export class ArrayUtils {
	static create2D<T>(w: number, h: number, generator?: (x:number, y:number) => T) {
		if (!generator) generator = (x, y) => null as any as T;
        const matrix = <T[][]>[];
        for (let y = 0; y < h; y++) {
            const row: T[] = [];
            for (let x = 0; x < w; x++) {
				row.push(generator!(x, y));
			}
			matrix.push(row);
		}
		return matrix;
	}

	static range(start: number, end: number) {
        const array: number[] = [];
        for (let n = start; n < end; n++) array.push(n);
		return array;
	}
	
	static keys(object:any):string[] {
        const keys: string[] = [];
        for (let key in object) keys.push(key);
		return keys;
	}
}

export function xrange(start: number, end: number) {
	return ArrayUtils.range(start, end);
}

// @TODO: This is required for the CPU dynamic recompilation
(window as any).MathFloat = MathFloat;
(window as any).BitUtils = BitUtils;
