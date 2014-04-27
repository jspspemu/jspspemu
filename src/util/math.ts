
interface Math {
	clz32(value: number): number;
}

if (!Math.clz32) {
	Math.clz32 = (x: number) => {
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
		return Math.clz32(~x);
	}

	static clz(x: number) {
		return Math.clz32(x);
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
		return (data >>> offset) & BitUtils.mask(length);
	}

	static extractScalef(data: number, offset: number, length: number, scale: number) {
		var mask = BitUtils.mask(length);
		return (((data >>> offset) & mask) * scale / mask);
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

interface Math {
	trunc(value: number): number;
}

if (!Math.trunc) {
	Math.trunc = function (x: number) {
		return x < 0 ? Math.ceil(x) : Math.floor(x);
	}
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

	static trunc(value: number) {
		if (!isFinite(value)) return 2147483647;
		return Math.trunc(value);
	}

	static round(value: number) {
		return Math.round(value);
	}

	static rint(value: number) {
		//return ((value % 1) <= 0.4999999999999999) ? Math.floor(value) : Math.ceil(value);
		return Math.round(value);
	}

	static cast(value: number) {
		return (value < 0) ? Math.ceil(value) : Math.floor(value);
	}

	static floor(value: number) {
		return Math.floor(value);
	}

	static ceil(value: number) {
		return Math.ceil(value);
	}
}

function compare<T>(a: T, b: T): number {
	if (a < b) return -1;
	if (a > b) return +1;
	return 0;
}

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
