// Code from: http://docs.closure-library.googlecode.com/git/local_closure_goog_math_long.js.source.html
import {BitUtils} from "./math";
import "./window"

export class Integer64 {
	private _low: number;
	private _high: number;

	static ZERO = Integer64.fromInt(0);
	static ONE = Integer64.fromInt(1);
	static MIN_VALUE = Integer64.fromBits(0, 0x80000000 | 0);
	static MAX_VALUE = Integer64.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
	private static _TWO_PWR_16_DBL = Math.pow(2, 16);
	private static _TWO_PWR_23_DBL = Math.pow(2, 23);
	private static _TWO_PWR_24_DBL = Math.pow(2, 24);
	private static _TWO_PWR_32_DBL = Math.pow(2, 32);
	private static _TWO_PWR_63_DBL = Math.pow(2, 63);

	private static _TWO_PWR_24 = Integer64.fromInt(1 << 24);

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

	static fromNumber(value: number): Integer64 {
		if (isNaN(value) || !isFinite(value)) {
			return Integer64.ZERO;
		} else if (value <= -Integer64._TWO_PWR_63_DBL) {
			return Integer64.MIN_VALUE;
		} else if (value + 1 >= Integer64._TWO_PWR_63_DBL) {
			return Integer64.MAX_VALUE;
		} else if (value < 0) {
			return Integer64.fromNumber(-value).negate();
		} else {
			return new Integer64((value % Integer64._TWO_PWR_32_DBL) | 0, (value / Integer64._TWO_PWR_32_DBL) | 0);
		}
	}

	get low() { return this._low; }
	get lowUnsigned() { return (this._low >= 0) ? (this._low) : (Integer64._TWO_PWR_32_DBL + this._low); }
	get high() { return this._high; }

	get number() {
		return this._high * Integer64._TWO_PWR_32_DBL + this.lowUnsigned;
	}

	getNumber() {
		return this._high * Integer64._TWO_PWR_32_DBL + this.lowUnsigned;
	}

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

	isZero() {
		return this._high == 0 && this._low == 0;
	}

	isNegative() {
		return this._high < 0;
	}

	isOdd() {
		return (this._low & 1) == 1;
	}

	sub(other: Integer64): Integer64 {
		return this.add(other.negate());
	}

	add(other: Integer64): Integer64 {
        const a48 = this._high >>> 16;
        const a32 = this._high & 0xFFFF;
        const a16 = this._low >>> 16;
        const a00 = this._low & 0xFFFF;

        const b48 = other._high >>> 16;
        const b32 = other._high & 0xFFFF;
        const b16 = other._low >>> 16;
        const b00 = other._low & 0xFFFF;

        let c48 = 0, c32 = 0, c16 = 0, c00 = 0;
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

	lessThan(other: Integer64) {
		return this.compare(other) < 0;
	}

	compare(other:Integer64) {
		if (this.equals(other)) {
			return 0;
		}

        const thisNeg = this.isNegative();
        const otherNeg = other.isNegative();
        if (thisNeg && !otherNeg) {
			return -1;
		}
		if (!thisNeg && otherNeg) {
			return 1;
		}

		// at this point, the signs are the same, so subtraction will not overflow
		if (this.sub(other).isNegative()) {
			return -1;
		} else {
			return 1;
		}
	}

	isLowEnoughForMul() {
		if (this._high == 0 && (this._low >>> 0) < Integer64._TWO_PWR_23_DBL) return true;
		if (this._high == -1 && ((-this._low) >>> 0) < Integer64._TWO_PWR_23_DBL) return true;
		return false;
	}

	multiply(other: Integer64):Integer64 {
		if (this.isZero()) return Integer64.ZERO;
		if (other.isZero()) return Integer64.ZERO;

		if (this.isLowEnoughForMul() && other.isLowEnoughForMul()) {
			return Integer64.fromNumber(this.getNumber() * other.getNumber());
		}

		if (this.equals(Integer64.MIN_VALUE)) return other.isOdd() ? Integer64.MIN_VALUE : Integer64.ZERO;
		if (other.equals(Integer64.MIN_VALUE)) return this.isOdd() ? Integer64.MIN_VALUE : Integer64.ZERO;

		if (this.isNegative()) {
			if (other.isNegative()) return this.negate().multiply(other.negate());
			return this.negate().multiply(other).negate();
		}
		if (other.isNegative()) return this.multiply(other.negate()).negate();

        const a48 = this._high >>> 16;
        const a32 = this._high & 0xFFFF;
        const a16 = this._low >>> 16;
        const a00 = this._low & 0xFFFF;

        const b48 = other._high >>> 16;
        const b32 = other._high & 0xFFFF;
        const b16 = other._low >>> 16;
        const b00 = other._low & 0xFFFF;

        let c48 = 0, c32 = 0, c16 = 0, c00 = 0;
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

// @TODO: This is required for the CPU dynamic recompilation
(window as any).Integer64 = Integer64;
