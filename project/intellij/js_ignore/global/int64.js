// Code from: http://docs.closure-library.googlecode.com/git/local_closure_goog_math_long.js.source.html
var Integer64 = (function () {
    function Integer64(low, high) {
        this._low = low | 0;
        this._high = high | 0;
    }
    Integer64.fromInt = function (value) {
        return new Integer64(value | 0, value < 0 ? -1 : 0);
    };
    Integer64.fromUnsignedInt = function (value) {
        return new Integer64(value | 0, 0);
    };
    Integer64.fromBits = function (low, high) {
        return new Integer64(low, high);
    };
    Integer64.fromNumber = function (value) {
        if (isNaN(value) || !isFinite(value)) {
            return Integer64.ZERO;
        }
        else if (value <= -Integer64._TWO_PWR_63_DBL) {
            return Integer64.MIN_VALUE;
        }
        else if (value + 1 >= Integer64._TWO_PWR_63_DBL) {
            return Integer64.MAX_VALUE;
        }
        else if (value < 0) {
            return Integer64.fromNumber(-value).negate();
        }
        else {
            return new Integer64((value % Integer64._TWO_PWR_32_DBL) | 0, (value / Integer64._TWO_PWR_32_DBL) | 0);
        }
    };
    Object.defineProperty(Integer64.prototype, "low", {
        get: function () {
            return this._low;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Integer64.prototype, "lowUnsigned", {
        get: function () {
            return (this._low >= 0) ? (this._low) : (Integer64._TWO_PWR_32_DBL + this._low);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Integer64.prototype, "high", {
        get: function () {
            return this._high;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Integer64.prototype, "number", {
        get: function () {
            return this._high * Integer64._TWO_PWR_32_DBL + this.lowUnsigned;
        },
        enumerable: true,
        configurable: true
    });
    Integer64.prototype.getNumber = function () {
        return this._high * Integer64._TWO_PWR_32_DBL + this.lowUnsigned;
    };
    Integer64.prototype.equals = function (other) {
        return (this._high == other._high) && (this._low == other._low);
    };
    Integer64.prototype.negate = function () {
        if (this.equals(Integer64.MIN_VALUE))
            return Integer64.MIN_VALUE;
        return this.not().add(Integer64.ONE);
    };
    Integer64.prototype.not = function () {
        return Integer64.fromBits(~this._low, ~this._high);
    };
    Integer64.prototype.isZero = function () {
        return this._high == 0 && this._low == 0;
    };
    Integer64.prototype.isNegative = function () {
        return this._high < 0;
    };
    Integer64.prototype.isOdd = function () {
        return (this._low & 1) == 1;
    };
    Integer64.prototype.sub = function (other) {
        return this.add(other.negate());
    };
    Integer64.prototype.add = function (other) {
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
    };
    Integer64.prototype.lessThan = function (other) {
        return this.compare(other) < 0;
    };
    Integer64.prototype.compare = function (other) {
        if (this.equals(other)) {
            return 0;
        }
        var thisNeg = this.isNegative();
        var otherNeg = other.isNegative();
        if (thisNeg && !otherNeg) {
            return -1;
        }
        if (!thisNeg && otherNeg) {
            return 1;
        }
        // at this point, the signs are the same, so subtraction will not overflow
        if (this.sub(other).isNegative()) {
            return -1;
        }
        else {
            return 1;
        }
    };
    Integer64.prototype.isLowEnoughForMul = function () {
        if (this._high == 0 && (this._low >>> 0) < Integer64._TWO_PWR_23_DBL)
            return true;
        if (this._high == -1 && ((-this._low) >>> 0) < Integer64._TWO_PWR_23_DBL)
            return true;
        return false;
    };
    Integer64.prototype.multiply = function (other) {
        if (this.isZero())
            return Integer64.ZERO;
        if (other.isZero())
            return Integer64.ZERO;
        if (this.isLowEnoughForMul() && other.isLowEnoughForMul()) {
            return Integer64.fromNumber(this.getNumber() * other.getNumber());
        }
        if (this.equals(Integer64.MIN_VALUE))
            return other.isOdd() ? Integer64.MIN_VALUE : Integer64.ZERO;
        if (other.equals(Integer64.MIN_VALUE))
            return this.isOdd() ? Integer64.MIN_VALUE : Integer64.ZERO;
        if (this.isNegative()) {
            if (other.isNegative())
                return this.negate().multiply(other.negate());
            return this.negate().multiply(other).negate();
        }
        if (other.isNegative())
            return this.multiply(other.negate()).negate();
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
    };
    Integer64.ZERO = Integer64.fromInt(0);
    Integer64.ONE = Integer64.fromInt(1);
    Integer64.MIN_VALUE = Integer64.fromBits(0, 0x80000000 | 0);
    Integer64.MAX_VALUE = Integer64.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
    Integer64._TWO_PWR_16_DBL = Math.pow(2, 16);
    Integer64._TWO_PWR_23_DBL = Math.pow(2, 23);
    Integer64._TWO_PWR_24_DBL = Math.pow(2, 24);
    Integer64._TWO_PWR_32_DBL = Math.pow(2, 32);
    Integer64._TWO_PWR_63_DBL = Math.pow(2, 63);
    Integer64._TWO_PWR_24 = Integer64.fromInt(1 << 24);
    return Integer64;
})();
//# sourceMappingURL=int64.js.map