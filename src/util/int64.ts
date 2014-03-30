// Code from: http://docs.closure-library.googlecode.com/git/closure_goog_math_long.js.source.html
class Integer64 {
	private _low: number;
	private _high: number;

	static ZERO = Integer64.fromInt(0);
	static ONE = Integer64.fromInt(1);
	static MIN_VALUE = Integer64.fromBits(0, 0x80000000 | 0);

	constructor(low: number, high: number) {
		this._low = low | 0;
		this._high = high | 0;
	}

	static fromInt(value: number): Integer64 {
		return new Integer64(value | 0, value < 0 ? -1 : 0);
	}

	static fromUnsignedInt(value: number): Integer64 {
		return new Integer64(value | 0, 0);
	}

	static fromBits(low: number, high: number): Integer64 {
		return new Integer64(low, high);
	}

	get low() { return this._low; }
	get high() { return this._high; }

	equals(other: Integer64) {
		return (this._high == other._high) && (this._low == other._low);
	}

	negate(): Integer64 {
		if (this.equals(Integer64.MIN_VALUE)) return Integer64.MIN_VALUE;
		return this.not().add(Integer64.ONE);
	}

	not(): Integer64 {
		return Integer64.fromBits(~this._low, ~this._high);
	}

	get isZero() {
		return this._high == 0 && this._low == 0;
	}

	get isNegative() {
		return this._high < 0;
	}

	get isOdd() {
		return (this._low & 1) == 1;
	}

	sub(other: Integer64): Integer64 {
		return this.add(other.negate());
	}

	add(other: Integer64): Integer64 {
		var a48 = this._high >>> 16;
		var a32 = this._high & 0xFFFF;
		var a16 = this._low >>> 16;
		var a00 = this._low & 0xFFFF;

		var b48 = other._high >>> 16;
		var b32 = other._high & 0xFFFF;
		var b16 = other._low >>> 16;
		var b00 = other._low & 0xFFFF;

		var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
		c00 += a00 + b00;
		c16 += c00 >>> 16;
		c00 &= 0xFFFF;
		c16 += a16 + b16;
		c32 += c16 >>> 16;
		c16 &= 0xFFFF;
		c32 += a32 + b32;
		c48 += c32 >>> 16;
		c32 &= 0xFFFF;
		c48 += a48 + b48;
		c48 &= 0xFFFF;
		return Integer64.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
	}

	multiply(other: Integer64):Integer64 {
		if (this.isZero) return Integer64.ZERO;
		if (other.isZero) return Integer64.ZERO;

		if (this.equals(Integer64.MIN_VALUE)) return other.isOdd ? Integer64.MIN_VALUE : Integer64.ZERO;
		if (other.equals(Integer64.MIN_VALUE)) return this.isOdd ? Integer64.MIN_VALUE : Integer64.ZERO;

		if (this.isNegative) {
			if (other.isNegative) return this.negate().multiply(other.negate());
			return this.negate().multiply(other).negate();
		}
		if (other.isNegative) return this.multiply(other.negate()).negate();

		var a48 = this._high >>> 16;
		var a32 = this._high & 0xFFFF;
		var a16 = this._low >>> 16;
		var a00 = this._low & 0xFFFF;

		var b48 = other._high >>> 16;
		var b32 = other._high & 0xFFFF;
		var b16 = other._low >>> 16;
		var b00 = other._low & 0xFFFF;

		var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
		c00 += a00 * b00;
		c16 += c00 >>> 16;
		c00 &= 0xFFFF;
		c16 += a16 * b00;
		c32 += c16 >>> 16;
		c16 &= 0xFFFF;
		c16 += a00 * b16;
		c32 += c16 >>> 16;
		c16 &= 0xFFFF;
		c32 += a32 * b00;
		c48 += c32 >>> 16;
		c32 &= 0xFFFF;
		c32 += a16 * b16;
		c48 += c32 >>> 16;
		c32 &= 0xFFFF;
		c32 += a00 * b32;
		c48 += c32 >>> 16;
		c32 &= 0xFFFF;
		c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
		c48 &= 0xFFFF;
		return Integer64.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
	}
}
