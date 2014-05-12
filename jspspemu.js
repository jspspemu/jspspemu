function identity(a) {
    return a;
}
function funcTrue(a) {
    return true;
}

function compareNumbers(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return +1;
    return 0;
}

Array.prototype.contains = function (item) {
    return this.indexOf(item) >= 0;
};

Array.prototype.binarySearchValue = function (selector) {
    var array = this;

    var index = array.binarySearchIndex(selector);
    if (index < 0)
        return null;
    return array[index];
};

Array.prototype.binarySearchIndex = function (selector) {
    var array = this;
    var min = 0;
    var max = array.length - 1;
    var step = 0;

    if (array.length == 0)
        return -1;

    while (true) {
        var current = Math.floor((min + max) / 2);

        var item = array[current];
        var result = selector(item);

        if (result == 0) {
            //console.log('->', current);
            return current;
        }

        //console.log(min, current, max);
        if (((current == min) || (current == max))) {
            if (min != max) {
                //console.log('*');
                min = max = current = (current != min) ? min : max;
                //console.log(min, current, max);
            } else {
                break;
            }
        } else {
            if (result < 0) {
                max = current;
            } else if (result > 0) {
                min = current;
            }
        }
        step++;
        if (step >= 64)
            throw (new Error("Too much steps"));
    }

    return -1;
};

Array.prototype.min = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    if (array.length == 0)
        return null;
    return array.reduce(function (previous, current) {
        return (selector(previous) < selector(current) ? previous : current);
    }, array[0]);
});

Array.prototype.max = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    if (array.length == 0)
        return null;
    return array.reduce(function (previous, current) {
        return (selector(previous) > selector(current) ? previous : current);
    }, array[0]);
});

Array.prototype.sortBy = function (selector) {
    return this.slice(0).sort(function (a, b) {
        return compare(selector(a), selector(b));
    });
};

Array.prototype.cast = (function () {
    return this;
});

Array.prototype.count = (function (selector) {
    var array = this;
    if (!selector)
        selector = funcTrue;
    var result = 0;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            result++;
    return result;
});

Array.prototype.any = (function (selector) {
    var array = this;
    if (!selector)
        selector = funcTrue;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            return true;
    return false;
});

Array.prototype.first = (function (selector) {
    var array = this;
    if (!selector)
        selector = identity;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            return array[n];
    return undefined;
});

Array.prototype.sum = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    return array.reduce(function (previous, current) {
        return previous + selector(current);
    }, 0);
});

Array.prototype.remove = function (item) {
    var array = this;
    var index = array.indexOf(item);
    if (index >= 0)
        array.splice(index, 1);
};

Array.prototype.toLookupMap = function () {
    var array = this;
    var lookup = {};
    for (var n = 0; n < array.length; n++) {
        lookup[array[n]] = n;
    }
    return lookup;
};

Object.defineProperty(Array.prototype, "contains", { enumerable: false });
Object.defineProperty(Array.prototype, "toLookupMap", { enumerable: false });
Object.defineProperty(Array.prototype, "cast", { enumerable: false });
Object.defineProperty(Array.prototype, "count", { enumerable: false });
Object.defineProperty(Array.prototype, "any", { enumerable: false });
Object.defineProperty(Array.prototype, "sum", { enumerable: false });
Object.defineProperty(Array.prototype, "min", { enumerable: false });
Object.defineProperty(Array.prototype, "max", { enumerable: false });
Object.defineProperty(Array.prototype, "sortBy", { enumerable: false });
Object.defineProperty(Array.prototype, "first", { enumerable: false });
Object.defineProperty(Array.prototype, "remove", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchValue", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchIndex", { enumerable: false });
//# sourceMappingURL=array.js.map

﻿function waitAsync(timems) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, timems);
    });
}

function _downloadFileAsync(method, url, headers) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();

        request.open(method, url, true);
        request.overrideMimeType("text/plain; charset=x-user-defined");
        if (headers) {
            for (var headerKey in headers) {
                request.setRequestHeader(headerKey, headers[headerKey]);
            }
        }
        request.responseType = "arraybuffer";
        request.onerror = function (e) {
            reject(e['error']);
        };
        request.onload = function (e) {
            if (request.status < 400) {
                resolve(request);
            } else {
                reject(new Error("HTTP " + request.status));
            }
        };
        request.send();
    });
}

function downloadFileAsync(url, headers) {
    return _downloadFileAsync('GET', url, headers).then(function (request) {
        var arraybuffer = request.response;
        return arraybuffer;
    });
}

function downloadFileChunkAsync(url, from, count) {
    var to = (from + count) - 1;
    return downloadFileAsync(url, {
        'Range': 'bytes=' + from + '-' + to
    });
}

function statFileAsync(url) {
    return _downloadFileAsync('HEAD', url).then(function (request) {
        //console.error('content-type', request.getResponseHeader('content-type'));
        //console.log(request.getAllResponseHeaders());
        var size = parseInt(request.getResponseHeader('content-length'));
        var date = new Date(Date.parse(request.getResponseHeader('last-modified')));

        return { size: size, date: date };
    });
}
/*
function storePersistentKeyAsync(name:string, value:any) {
}
*/
//# sourceMappingURL=async.js.map

﻿// Code from: http://docs.closure-library.googlecode.com/git/local_closure_goog_math_long.js.source.html
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
        } else if (value <= -Integer64._TWO_PWR_63_DBL) {
            return Integer64.MIN_VALUE;
        } else if (value + 1 >= Integer64._TWO_PWR_63_DBL) {
            return Integer64.MAX_VALUE;
        } else if (value < 0) {
            return Integer64.fromNumber(-value).negate();
        } else {
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
        } else {
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

﻿if (!Math['sign']) {
    Math['sign'] = function (x) {
        if (x < 0)
            return -1;
        if (x > 0)
            return +1;
        return 0;
    };
}

if (!Math['rint']) {
    Math['rint'] = function (value) {
        var twoToThe52 = Math.pow(2, 52);
        var sign = Math.sign(value);
        value = Math.abs(value);
        if (value < twoToThe52)
            value = ((twoToThe52 + value) - twoToThe52);
        return sign * value;
    };
}

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

if (!Math['trunc']) {
    Math['trunc'] = function (x) {
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    };
}

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

function testMultiply64_Base(a, b) {
    var result = Integer64.fromInt(a).multiply(Integer64.fromInt(b));
    var result2 = Math.imul32_64(a, b, [1, 1]);
    return {
        int64: result,
        fast: result2,
        compare: (result.low == result2[0]) && (result.high == result2[1])
    };
}

function testMultiply64_Base_u(a, b) {
    var result = Integer64.fromUnsignedInt(a).multiply(Integer64.fromUnsignedInt(b));
    var result2 = Math.umul32_64(a, b, [1, 1]);
    return {
        int64: result,
        fast: result2,
        compare: (result.low == result2[0]) && (result.high == result2[1])
    };
}

function testMultiply64() {
    var values = [0, -1, -2147483648, 2147483647, 777, 1234567, -999999, 99999, 65536, -65536, 65535, -65535, -32768, 32768, -32767, 32767];
    values.forEach(function (v1) {
        values.forEach(function (v2) {
            var result = testMultiply64_Base(v1, v2);
            if (!result.compare)
                console.log('signed', v1, v2, [result.int64.low, result.int64.high], result.fast);

            var result = testMultiply64_Base_u(v1, v2);
            if (!result.compare)
                console.log('unsigned', v1, v2, [result.int64.low, result.int64.high], result.fast);
        });
    });
}

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
        x = x & 0xFFFF;
        if (x & 0x8000)
            x = 0xFFFF0000 | x;
        return x;
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
    MathFloat.floatArray = new Float32Array(1);
    MathFloat.intArray = new Int32Array(MathFloat.floatArray.buffer);
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
    MathUtils.prevAligned = function (value, alignment) {
        return Math.floor(value / alignment) * alignment;
    };

    MathUtils.isAlignedTo = function (value, alignment) {
        return (value % alignment) == 0;
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
            generator = function (x, y) {
                return null;
            };
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
    return ArrayUtils;
})();
//# sourceMappingURL=math.js.map

﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ProxyAsyncStream = (function () {
    function ProxyAsyncStream(stream) {
        this.stream = stream;
    }
    Object.defineProperty(ProxyAsyncStream.prototype, "name", {
        get: function () {
            return this.stream.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ProxyAsyncStream.prototype, "date", {
        get: function () {
            return this.stream.date;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ProxyAsyncStream.prototype, "size", {
        get: function () {
            return this.stream.size;
        },
        enumerable: true,
        configurable: true
    });
    ProxyAsyncStream.prototype.readChunkAsync = function (offset, count) {
        return this.stream.readChunkAsync(offset, count);
    };
    return ProxyAsyncStream;
})();

var BufferedAsyncStream = (function (_super) {
    __extends(BufferedAsyncStream, _super);
    function BufferedAsyncStream(stream, bufferSize) {
        if (typeof bufferSize === "undefined") { bufferSize = 131072; }
        _super.call(this, stream);
        this.bufferSize = bufferSize;
        this.cache = {
            start: 0,
            end: 0,
            data: new ArrayBuffer(0)
        };
    }
    Object.defineProperty(BufferedAsyncStream.prototype, "name", {
        get: function () {
            return this.stream.name + '+buffered';
        },
        enumerable: true,
        configurable: true
    });

    BufferedAsyncStream.prototype.getCachedEntry = function (start, end) {
        if (start >= this.cache.start && end <= this.cache.end) {
            return this.cache;
        } else {
            return null;
        }
    };

    BufferedAsyncStream.prototype.putCacheEntry = function (start, data) {
        this.cache.start = start;
        this.cache.end = start + data.byteLength;
        this.cache.data = data;
    };

    BufferedAsyncStream.prototype.readChunkAsync = function (offset, count) {
        var _this = this;
        var availableFromOffset = this.size - offset;
        var start = offset;
        var end = offset + count;

        var cache = this.getCachedEntry(start, end);

        //return this.stream.readChunkAsync(start, count);
        if (cache) {
            return Promise.resolve(cache.data.slice(start - cache.start, end - cache.start));
        } else {
            var bigCount = Math.max(count, this.bufferSize);
            bigCount = Math.min(bigCount, availableFromOffset);

            end = start + bigCount;

            return this.stream.readChunkAsync(offset, bigCount).then(function (data) {
                _this.putCacheEntry(start, data);
                return _this.readChunkAsync(offset, count);
            });
        }
    };
    return BufferedAsyncStream;
})(ProxyAsyncStream);

var MemoryAsyncStream = (function () {
    function MemoryAsyncStream(data, name, date) {
        if (typeof name === "undefined") { name = 'memory'; }
        if (typeof date === "undefined") { date = new Date(); }
        this.data = data;
        this.name = name;
        this.date = date;
    }
    MemoryAsyncStream.fromArrayBuffer = function (data) {
        return new MemoryAsyncStream(data);
    };

    Object.defineProperty(MemoryAsyncStream.prototype, "size", {
        get: function () {
            return this.data.byteLength;
        },
        enumerable: true,
        configurable: true
    });

    MemoryAsyncStream.prototype.readChunkAsync = function (offset, count) {
        return Promise.resolve(this.data.slice(offset, offset + count));
    };
    return MemoryAsyncStream;
})();

var UrlAsyncStream = (function () {
    function UrlAsyncStream(url, stat) {
        this.url = url;
        this.stat = stat;
        this.name = url;
        this.date = stat.date;
    }
    UrlAsyncStream.fromUrlAsync = function (url) {
        console.info('open ', url);
        return statFileAsync(url).then(function (stat) {
            console.info('fromUrlAsync', stat);

            if (stat.size == 0) {
                console.error("Invalid file with size '" + stat.size + "'", stat);
                throw (new Error("Invalid file with size '" + stat.size + "'"));
            }

            // If file is less  than 5MB, then download it completely
            if (stat.size < 5 * 1024 * 1024) {
                return downloadFileAsync(url).then(function (data) {
                    return MemoryAsyncStream.fromArrayBuffer(data);
                });
            } else {
                return Promise.resolve(new BufferedAsyncStream(new UrlAsyncStream(url, stat)));
            }
        });
    };

    Object.defineProperty(UrlAsyncStream.prototype, "size", {
        get: function () {
            return this.stat.size;
        },
        enumerable: true,
        configurable: true
    });

    UrlAsyncStream.prototype.readChunkAsync = function (offset, count) {
        //console.error();
        console.info('download chunk', this.url, offset + '-' + (offset + count), '(' + count + ')');
        return downloadFileChunkAsync(this.url, offset, count);
    };
    return UrlAsyncStream;
})();

var FileAsyncStream = (function () {
    function FileAsyncStream(file) {
        this.file = file;
        this.date = file.lastModifiedDate;
    }
    Object.defineProperty(FileAsyncStream.prototype, "name", {
        get: function () {
            return this.file.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileAsyncStream.prototype, "size", {
        get: function () {
            return this.file.size;
        },
        enumerable: true,
        configurable: true
    });

    FileAsyncStream.prototype.readChunkAsync = function (offset, count) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                resolve(fileReader.result);
            };
            fileReader.onerror = function (e) {
                reject(e['error']);
            };
            fileReader.readAsArrayBuffer(_this.file.slice(offset, offset + count));
        });
    };
    return FileAsyncStream;
})();

var Stream = (function () {
    function Stream(data, offset) {
        if (typeof offset === "undefined") { offset = 0; }
        this.data = data;
        this.offset = offset;
    }
    Stream.fromArrayBuffer = function (data) {
        return new Stream(new DataView(data));
    };

    Stream.fromDataView = function (data, offset) {
        if (typeof offset === "undefined") { offset = 0; }
        return new Stream(data);
    };

    Stream.fromBase64 = function (data) {
        var outstr = atob(data);
        var out = new ArrayBuffer(outstr.length);
        var ia = new Uint8Array(out);
        for (var n = 0; n < outstr.length; n++)
            ia[n] = outstr.charCodeAt(n);
        return new Stream(new DataView(out));
    };

    Stream.fromUint8Array = function (array) {
        return Stream.fromArray(array);
    };

    Stream.fromArray = function (array) {
        var buffer = new ArrayBuffer(array.length);
        var w8 = new Uint8Array(buffer);
        for (var n = 0; n < array.length; n++)
            w8[n] = array[n];
        return new Stream(new DataView(buffer));
    };

    Stream.prototype.toImageUrl = function () {
        var urlCreator = window['URL'] || window['webkitURL'];
        if (urlCreator) {
            var blob = new Blob([this.toUInt8Array()], { type: "image/jpeg" });
            return urlCreator.createObjectURL(blob);
        } else {
            return 'data:image/png;base64,' + this.toBase64();
        }
    };

    Stream.prototype.toBase64 = function () {
        var out = '';
        var array = this.toUInt8Array();
        for (var n = 0; n < array.length; n++) {
            out += String.fromCharCode(array[n]);
        }
        return btoa(out);
    };

    Stream.prototype.toUInt8Array = function () {
        return new Uint8Array(this.toArrayBuffer());
    };

    Stream.prototype.toArrayBuffer = function () {
        return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
    };

    Stream.prototype.clone = function () {
        return this.sliceWithLowHigh(this.position, this.length);
    };

    Stream.prototype.sliceWithLength = function (low, count) {
        return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, count));
    };

    Stream.prototype.sliceWithLowHigh = function (low, high) {
        return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, high - low));
    };

    Object.defineProperty(Stream.prototype, "available", {
        get: function () {
            return this.length - this.offset;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Stream.prototype, "length", {
        get: function () {
            return this.data.byteLength;
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(Stream.prototype, "position", {
        get: function () {
            return this.offset;
        },
        set: function (value) {
            this.offset = value;
        },
        enumerable: true,
        configurable: true
    });

    Stream.prototype.skip = function (count, pass) {
        this.offset += count;
        return pass;
    };

    Stream.prototype.readInt8 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getInt8(this.offset));
    };
    Stream.prototype.readInt16 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getInt16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readInt32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getInt32(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readInt64 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        var items = [this.readUInt32(endian), this.readUInt32(endian)];
        var low = items[(endian == 0 /* LITTLE */) ? 0 : 1];
        var high = items[(endian == 0 /* LITTLE */) ? 1 : 0];
        return Integer64.fromBits(low, high);
    };
    Stream.prototype.readFloat32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getFloat32(this.offset, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.readUInt8 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getUint8(this.offset));
    };
    Stream.prototype.readUInt16 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getUint16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readUInt32 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getUint32(this.offset, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.readStruct = function (struct) {
        return struct.read(this);
    };

    Stream.prototype.writeInt8 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.setInt8(this.offset, value));
    };
    Stream.prototype.writeInt16 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.setInt16(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeInt32 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.setInt32(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeInt64 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this._writeUInt64(value, endian);
    };

    Stream.prototype.writeFloat32 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.setFloat32(this.offset, value, (endian == 0 /* LITTLE */)));
    };

    Stream.prototype.writeUInt8 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.setUint8(this.offset, value));
    };
    Stream.prototype.writeUInt16 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.setUint16(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeUInt32 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.setUint32(this.offset, value, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.writeUInt64 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this._writeUInt64(value, endian);
    };

    Stream.prototype._writeUInt64 = function (value, endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        this.writeUInt32((endian == 0 /* LITTLE */) ? value.low : value.high, endian);
        this.writeUInt32((endian == 0 /* LITTLE */) ? value.high : value.low, endian);
    };

    Stream.prototype.writeStruct = function (struct, value) {
        struct.write(this, value);
    };

    Stream.prototype.writeString = function (str) {
        var _this = this;
        try  {
            str.split('').forEach(function (char) {
                _this.writeUInt8(char.charCodeAt(0));
            });
        } catch (e) {
            console.log("Can't write string '" + str + "'");
            debugger;
            console.warn(this.data);
            console.error(e);
            throw (e);
        }
    };

    Stream.prototype.writeStringz = function (str) {
        return this.writeString(str + String.fromCharCode(0));
    };

    Stream.prototype.readBytes = function (count) {
        return this.skip(count, new Uint8Array(this.data.buffer, this.data.byteOffset + this.offset, count));
    };

    Stream.prototype.readInt16Array = function (count) {
        return this.skip(count, new Int16Array(this.data.buffer, this.data.byteOffset + this.offset, count));
    };

    Stream.prototype.readFloat32Array = function (count) {
        return new Float32Array(this.readBytes(count));
    };

    Stream.prototype.readStream = function (count) {
        return Stream.fromUint8Array(this.readBytes(count));
    };

    Stream.prototype.readUtf8String = function (count) {
        return Utf8.decode(this.readString(count));
    };

    Stream.prototype.readString = function (count) {
        if (count > 128 * 1024)
            throw (new Error("Trying to read a string larger than 128KB"));
        var str = '';
        for (var n = 0; n < count; n++) {
            str += String.fromCharCode(this.readUInt8());
        }
        return str;
    };

    Stream.prototype.readUtf8Stringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 131072; }
        return Utf8.decode(this.readStringz(maxCount));
    };

    Stream.prototype.readStringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 131072; }
        var str = '';
        for (var n = 0; n < maxCount; n++) {
            if (this.available <= 0)
                break;
            var char = this.readUInt8();
            if (char == 0)
                break;
            str += String.fromCharCode(char);
        }
        return str;
    };
    Stream.INVALID = Stream.fromArray([]);
    return Stream;
})();
//# sourceMappingURL=stream.js.map

﻿var Int64Type = (function () {
    function Int64Type(endian) {
        this.endian = endian;
    }
    Int64Type.prototype.read = function (stream) {
        if (this.endian == 0 /* LITTLE */) {
            var low = stream.readUInt32(this.endian);
            var high = stream.readUInt32(this.endian);
        } else {
            var high = stream.readUInt32(this.endian);
            var low = stream.readUInt32(this.endian);
        }
        return high * Math.pow(2, 32) + low;
    };
    Int64Type.prototype.write = function (stream, value) {
        var low = Math.floor(value % Math.pow(2, 32));
        var high = Math.floor(value / Math.pow(2, 32));
        if (this.endian == 0 /* LITTLE */) {
            stream.writeInt32(low, this.endian);
            stream.writeInt32(high, this.endian);
        } else {
            stream.writeInt32(high, this.endian);
            stream.writeInt32(low, this.endian);
        }
    };
    Object.defineProperty(Int64Type.prototype, "length", {
        get: function () {
            return 8;
        },
        enumerable: true,
        configurable: true
    });
    return Int64Type;
})();

var Int32Type = (function () {
    function Int32Type(endian) {
        this.endian = endian;
    }
    Int32Type.prototype.read = function (stream) {
        return stream.readInt32(this.endian);
    };
    Int32Type.prototype.write = function (stream, value) {
        stream.writeInt32(value, this.endian);
    };
    Object.defineProperty(Int32Type.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return Int32Type;
})();

var Int16Type = (function () {
    function Int16Type(endian) {
        this.endian = endian;
    }
    Int16Type.prototype.read = function (stream) {
        return stream.readInt16(this.endian);
    };
    Int16Type.prototype.write = function (stream, value) {
        stream.writeInt16(value, this.endian);
    };
    Object.defineProperty(Int16Type.prototype, "length", {
        get: function () {
            return 2;
        },
        enumerable: true,
        configurable: true
    });
    return Int16Type;
})();

var Int8Type = (function () {
    function Int8Type(endian) {
        this.endian = endian;
    }
    Int8Type.prototype.read = function (stream) {
        return stream.readInt8(this.endian);
    };
    Int8Type.prototype.write = function (stream, value) {
        stream.writeInt8(value, this.endian);
    };
    Object.defineProperty(Int8Type.prototype, "length", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return Int8Type;
})();

var UInt32Type = (function () {
    function UInt32Type(endian) {
        this.endian = endian;
    }
    UInt32Type.prototype.read = function (stream) {
        return stream.readUInt32(this.endian);
    };
    UInt32Type.prototype.write = function (stream, value) {
        stream.writeUInt32(value, this.endian);
    };
    Object.defineProperty(UInt32Type.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return UInt32Type;
})();

var UInt16Type = (function () {
    function UInt16Type(endian) {
        this.endian = endian;
    }
    UInt16Type.prototype.read = function (stream) {
        return stream.readUInt16(this.endian);
    };
    UInt16Type.prototype.write = function (stream, value) {
        stream.writeUInt16(value, this.endian);
    };
    Object.defineProperty(UInt16Type.prototype, "length", {
        get: function () {
            return 2;
        },
        enumerable: true,
        configurable: true
    });
    return UInt16Type;
})();

var UInt8Type = (function () {
    function UInt8Type(endian) {
        this.endian = endian;
    }
    UInt8Type.prototype.read = function (stream) {
        return stream.readUInt8(this.endian);
    };
    UInt8Type.prototype.write = function (stream, value) {
        stream.writeUInt8(value, this.endian);
    };
    Object.defineProperty(UInt8Type.prototype, "length", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return UInt8Type;
})();

var Struct = (function () {
    function Struct(items) {
        this.items = items;
        this.processedItems = [];
        this.processedItems = items.map(function (item) {
            for (var key in item)
                return { name: key, type: item[key] };
            throw (new Error("Entry must have one item"));
        });
    }
    Struct.create = function (items) {
        return new Struct(items);
    };

    Struct.prototype.read = function (stream) {
        var out = {};
        this.processedItems.forEach(function (item) {
            out[item.name] = item.type.read(stream, out);
        });
        return out;
    };
    Struct.prototype.write = function (stream, value) {
        this.processedItems.forEach(function (item) {
            item.type.write(stream, value[item.name], value);
        });
    };
    Object.defineProperty(Struct.prototype, "length", {
        get: function () {
            return this.processedItems.sum(function (item) {
                if (!item)
                    throw ("Invalid item!!");
                if (!item.type)
                    throw ("Invalid item type!!");
                return item.type.length;
            });
        },
        enumerable: true,
        configurable: true
    });
    return Struct;
})();

var StructClass = (function () {
    function StructClass(_class, items) {
        this._class = _class;
        this.items = items;
        this.processedItems = [];
        this.processedItems = items.map(function (item) {
            for (var key in item)
                return { name: key, type: item[key] };
            throw (new Error("Entry must have one item"));
        });
    }
    StructClass.create = function (_class, items) {
        return new StructClass(_class, items);
    };

    StructClass.prototype.read = function (stream) {
        var _class = this._class;
        var out = new _class();
        this.processedItems.forEach(function (item) {
            out[item.name] = item.type.read(stream, out);
        });
        return out;
    };
    StructClass.prototype.write = function (stream, value) {
        this.processedItems.forEach(function (item) {
            item.type.write(stream, value[item.name], value);
        });
    };
    Object.defineProperty(StructClass.prototype, "length", {
        get: function () {
            return this.processedItems.sum(function (item) {
                if (!item)
                    throw ("Invalid item!!");
                if (!item.type) {
                    console.log(item);
                    throw ("Invalid item type!!");
                }
                return item.type.length;
            });
        },
        enumerable: true,
        configurable: true
    });
    return StructClass;
})();

var StructArrayClass = (function () {
    function StructArrayClass(elementType, count) {
        this.elementType = elementType;
        this.count = count;
    }
    StructArrayClass.prototype.read = function (stream) {
        var out = [];
        for (var n = 0; n < this.count; n++) {
            out.push(this.elementType.read(stream, out));
        }
        return out;
    };
    StructArrayClass.prototype.write = function (stream, value) {
        for (var n = 0; n < this.count; n++)
            this.elementType.write(stream, value[n], value);
    };
    Object.defineProperty(StructArrayClass.prototype, "length", {
        get: function () {
            return this.elementType.length * this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructArrayClass;
})();

function StructArray(elementType, count) {
    return new StructArrayClass(elementType, count);
}

var StructStringn = (function () {
    function StructStringn(count) {
        this.count = count;
    }
    StructStringn.prototype.read = function (stream) {
        var out = '';
        for (var n = 0; n < this.count; n++) {
            out += String.fromCharCode(stream.readUInt8());
        }
        return out;
    };
    StructStringn.prototype.write = function (stream, value) {
        throw ("Not implemented StructStringn.write");
    };
    Object.defineProperty(StructStringn.prototype, "length", {
        get: function () {
            return this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringn;
})();

var StructStringz = (function () {
    function StructStringz(count) {
        this.count = count;
        this.stringn = new StructStringn(count);
    }
    StructStringz.prototype.read = function (stream) {
        return this.stringn.read(stream).split(String.fromCharCode(0))[0];
    };
    StructStringz.prototype.write = function (stream, value) {
        if (!value)
            value = '';
        var items = value.split('').map(function (char) {
            return char.charCodeAt(0);
        });
        while (items.length < this.count)
            items.push(0);
        for (var n = 0; n < items.length; n++)
            stream.writeUInt8(items[n]);
    };
    Object.defineProperty(StructStringz.prototype, "length", {
        get: function () {
            return this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringz;
})();

var StructStringzVariable = (function () {
    function StructStringzVariable() {
    }
    StructStringzVariable.prototype.read = function (stream) {
        return stream.readStringz();
    };
    StructStringzVariable.prototype.write = function (stream, value) {
        stream.writeString(value);
        stream.writeUInt8(0);
    };
    Object.defineProperty(StructStringzVariable.prototype, "length", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringzVariable;
})();

var UInt32_2lbStruct = (function () {
    function UInt32_2lbStruct() {
    }
    UInt32_2lbStruct.prototype.read = function (stream) {
        var l = stream.readUInt32(0 /* LITTLE */);
        var b = stream.readUInt32(1 /* BIG */);
        return l;
    };
    UInt32_2lbStruct.prototype.write = function (stream, value) {
        stream.writeUInt32(value, 0 /* LITTLE */);
        stream.writeUInt32(value, 1 /* BIG */);
    };
    Object.defineProperty(UInt32_2lbStruct.prototype, "length", {
        get: function () {
            return 8;
        },
        enumerable: true,
        configurable: true
    });
    return UInt32_2lbStruct;
})();

var UInt16_2lbStruct = (function () {
    function UInt16_2lbStruct() {
    }
    UInt16_2lbStruct.prototype.read = function (stream) {
        var l = stream.readUInt16(0 /* LITTLE */);
        var b = stream.readUInt16(1 /* BIG */);
        return l;
    };
    UInt16_2lbStruct.prototype.write = function (stream, value) {
        stream.writeUInt16(value, 0 /* LITTLE */);
        stream.writeUInt16(value, 1 /* BIG */);
    };
    Object.defineProperty(UInt16_2lbStruct.prototype, "length", {
        get: function () {
            return 4;
        },
        enumerable: true,
        configurable: true
    });
    return UInt16_2lbStruct;
})();

var StructStringWithSize = (function () {
    function StructStringWithSize(getStringSize) {
        this.getStringSize = getStringSize;
    }
    StructStringWithSize.prototype.read = function (stream, context) {
        return stream.readString(this.getStringSize(context));
    };
    StructStringWithSize.prototype.write = function (stream, value, context) {
        stream.writeString(value);
    };
    Object.defineProperty(StructStringWithSize.prototype, "length", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return StructStringWithSize;
})();

var Int16 = new Int16Type(0 /* LITTLE */);
var Int32 = new Int32Type(0 /* LITTLE */);
var Int64 = new Int64Type(0 /* LITTLE */);
var Int8 = new Int8Type(0 /* LITTLE */);

var UInt16 = new UInt16Type(0 /* LITTLE */);
var UInt32 = new UInt32Type(0 /* LITTLE */);
var UInt8 = new UInt8Type(0 /* LITTLE */);

var UInt16_b = new UInt16Type(1 /* BIG */);
var UInt32_b = new UInt32Type(1 /* BIG */);

var UInt32_2lb = new UInt32_2lbStruct();
var UInt16_2lb = new UInt16_2lbStruct();

var StringzVariable = new StructStringzVariable();

function Stringn(count) {
    return new StructStringn(count);
}
function Stringz(count) {
    return new StructStringz(count);
}
function StringWithSize(callback) {
    return new StructStringWithSize(callback);
}
//# sourceMappingURL=struct.js.map

///<reference path="../../typings/promise/promise.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

function String_repeat(str, num) {
    return new Array(num + 1).join(str);
}

var Endian;
(function (Endian) {
    Endian[Endian["LITTLE"] = 0] = "LITTLE";
    Endian[Endian["BIG"] = 1] = "BIG";
})(Endian || (Endian = {}));

var AsyncEntry = (function () {
    function AsyncEntry(id, size, usageCount, value, lastUsedTime) {
        this.id = id;
        this.size = size;
        this.usageCount = usageCount;
        this.value = value;
        this.lastUsedTime = lastUsedTime;
    }
    return AsyncEntry;
})();

var AsyncCache = (function () {
    function AsyncCache(maxSize, measure) {
        if (typeof maxSize === "undefined") { maxSize = 16; }
        this.maxSize = maxSize;
        this.measure = measure;
        this.itemsMap = {};
        if (!measure)
            measure = (function (item) {
                return 1;
            });
    }
    Object.defineProperty(AsyncCache.prototype, "items", {
        get: function () {
            var items = [];
            for (var key in this.itemsMap) {
                var item = this.itemsMap[key];
                if (item instanceof AsyncEntry)
                    items.push(item);
            }
            return items;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(AsyncCache.prototype, "usedSize", {
        get: function () {
            return this.items.sum(function (item) {
                return item.size;
            });
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(AsyncCache.prototype, "availableSize", {
        get: function () {
            return this.maxSize - this.usedSize;
        },
        enumerable: true,
        configurable: true
    });

    AsyncCache.prototype.freeUntilAvailable = function (size) {
        if (size > this.maxSize)
            throw (new Error("Element too big"));

        while (this.availableSize < size) {
            var itemToDelete = this.items.min(function (item) {
                return item.lastUsedTime;
            });
            delete this.itemsMap[itemToDelete.id];
        }
    };

    AsyncCache.prototype.getOrGenerateAsync = function (id, generator) {
        var _this = this;
        var item = this.itemsMap[id];
        if (item) {
            item.lastUsedTime = Date.now();
            return Promise.resolve(item.value);
        } else {
            return generator().then(function (value) {
                var size = _this.measure(value);
                _this.freeUntilAvailable(size);
                _this.itemsMap[id] = new AsyncEntry(id, size, 1, value, Date.now());
                return value;
            });
        }
    };
    return AsyncCache;
})();

var SortedSet = (function () {
    function SortedSet() {
        this.elements = [];
    }
    SortedSet.prototype.has = function (element) {
        return this.elements.indexOf(element) >= 0;
    };

    SortedSet.prototype.add = function (element) {
        if (!this.has(element))
            this.elements.push(element);
        return element;
    };

    Object.defineProperty(SortedSet.prototype, "length", {
        get: function () {
            return this.elements.length;
        },
        enumerable: true,
        configurable: true
    });

    SortedSet.prototype.delete = function (element) {
        this.elements.remove(element);
    };

    SortedSet.prototype.filter = function (callback) {
        return this.elements.filter(callback);
    };

    SortedSet.prototype.forEach = function (callback) {
        this.elements.forEach(callback);
    };
    return SortedSet;
})();

var DSet = (function (_super) {
    __extends(DSet, _super);
    function DSet() {
        _super.apply(this, arguments);
    }
    return DSet;
})(SortedSet);

var UidCollection = (function () {
    function UidCollection(lastId) {
        if (typeof lastId === "undefined") { lastId = 1; }
        this.lastId = lastId;
        this.items = {};
    }
    UidCollection.prototype.allocate = function (item) {
        var id = this.lastId++;
        this.items[id] = item;
        return id;
    };

    UidCollection.prototype.has = function (id) {
        return (this.items[id] !== undefined);
    };

    UidCollection.prototype.get = function (id) {
        return this.items[id];
    };

    UidCollection.prototype.remove = function (id) {
        delete this.items[id];
    };
    return UidCollection;
})();

String.prototype.startsWith = function (value) {
    var string = this;
    return string.substr(0, value.length) == value;
};

String.prototype.endsWith = function (value) {
    var string = this;
    return string.substr(-value.length) == value;
};

String.prototype.rstrip = function () {
    var string = this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function (value) {
    var string = this;
    return string.indexOf(value) >= 0;
};

var Microtask = (function () {
    function Microtask() {
    }
    Microtask.queue = function (callback) {
        Microtask.callbacks.push(callback);
        if (!Microtask.queued) {
            Microtask.queued = true;
            setTimeout(Microtask.execute, 0);
        }
    };

    Microtask.execute = function () {
        while (Microtask.callbacks.length > 0) {
            var callback = Microtask.callbacks.shift();
            callback();
        }
        Microtask.queued = false;
    };
    Microtask.queued = false;
    Microtask.callbacks = [];
    return Microtask;
})();

if (!window['setImmediate']) {
    window['setImmediate'] = function (callback) {
        Microtask.queue(callback);

        //return setTimeout(callback, 0);
        return -1;
    };
    window['clearImmediate'] = function (timer) {
        throw (new Error("Not implemented!"));
        //clearTimeout(timer);
    };
}

var Utf8 = (function () {
    function Utf8() {
    }
    Utf8.decode = function (input) {
        try  {
            return decodeURIComponent(escape(input));
        } catch (e) {
            console.error(e);
            return input;
        }
    };

    Utf8.encode = function (input) {
        return unescape(encodeURIComponent(input));
    };
    return Utf8;
})();

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (begin, end) {
        var that = new Uint8Array(this);
        if (end == undefined)
            end = that.length;
        var result = new ArrayBuffer(end - begin);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++)
            resultArray[i] = that[i + begin];
        return result;
    };
}

window['AudioContext'] = window['AudioContext'] || window['webkitAudioContext'];

navigator['getGamepads'] = navigator['getGamepads'] || navigator['webkitGetGamepads'];

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
        var start = Date.now();
        return setTimeout(function () {
            callback(Date.now());
        }, 20);
    };
    window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
    };
}

var ArrayBufferUtils = (function () {
    function ArrayBufferUtils() {
    }
    ArrayBufferUtils.fromUInt8Array = function (input) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    };

    ArrayBufferUtils.uint8ToUint32 = function (input, offset, length) {
        if (typeof offset === "undefined") { offset = 0; }
        if (length === undefined)
            length = ((input.length >>> 2) - (offset >>> 2));
        return new Uint32Array(input.buffer, input.byteOffset + offset, length);
    };

    ArrayBufferUtils.uint8ToUint8 = function (input, offset, length) {
        if (typeof offset === "undefined") { offset = 0; }
        if (length === undefined)
            length = (input.length - offset);
        return new Uint8Array(input.buffer, input.byteOffset + offset, length);
    };

    ArrayBufferUtils.copy = function (input, inputPosition, output, outputPosition, length) {
        output.subarray(outputPosition, outputPosition + length).set(input.subarray(inputPosition, inputPosition + length));
        //for (var n = 0; n < length; n++) output[outputPosition + n] = input[inputPosition + n];
    };

    ArrayBufferUtils.concat = function (chunks) {
        var tmp = new Uint8Array(chunks.sum(function (chunk) {
            return chunk.byteLength;
        }));
        var offset = 0;
        chunks.forEach(function (chunk) {
            tmp.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        });
        return tmp.buffer;
    };
    return ArrayBufferUtils;
})();

var PromiseUtils = (function () {
    function PromiseUtils() {
    }
    PromiseUtils.sequence = function (generators) {
        return new Promise(function (resolve, reject) {
            generators = generators.slice(0);
            function step() {
                if (generators.length > 0) {
                    var generator = generators.shift();
                    var promise = generator();
                    promise.then(step);
                } else {
                    resolve();
                }
            }
            step();
        });
    };

    PromiseUtils.delayAsync = function (ms) {
        if (ms <= 0)
            return Promise.resolve(null);
        return new Promise(function (resolve, reject) {
            return setTimeout(resolve, ms);
        });
    };

    PromiseUtils.delaySecondsAsync = function (seconds) {
        return PromiseUtils.delayAsync(seconds * 1000);
    };
    return PromiseUtils;
})();

window['requestFileSystem'] = window['requestFileSystem'] || window['webkitRequestFileSystem'];

function setToString(Enum, value) {
    var items = [];
    for (var key in Enum) {
        if (Enum[key] & value && (Enum[key] & value) == Enum[key]) {
            items.push(key);
        }
    }
    return items.join(' | ');
}

var AcceptCallbacks;
(function (AcceptCallbacks) {
    AcceptCallbacks[AcceptCallbacks["NO"] = 0] = "NO";
    AcceptCallbacks[AcceptCallbacks["YES"] = 1] = "YES";
})(AcceptCallbacks || (AcceptCallbacks = {}));

var WaitingThreadInfo = (function () {
    function WaitingThreadInfo(name, object, promise, callbacks) {
        this.name = name;
        this.object = object;
        this.promise = promise;
        this.callbacks = callbacks;
    }
    return WaitingThreadInfo;
})();

var CpuBreakException = (function () {
    function CpuBreakException(name, message) {
        if (typeof name === "undefined") { name = 'CpuBreakException'; }
        if (typeof message === "undefined") { message = 'CpuBreakException'; }
        this.name = name;
        this.message = message;
    }
    return CpuBreakException;
})();

var SceKernelException = (function () {
    function SceKernelException(id, name, message) {
        if (typeof name === "undefined") { name = 'SceKernelException'; }
        if (typeof message === "undefined") { message = 'SceKernelException'; }
        this.id = id;
        this.name = name;
        this.message = message;
    }
    return SceKernelException;
})();

var DebugOnceArray = {};
function DebugOnce(name, times) {
    if (typeof times === "undefined") { times = 1; }
    if (DebugOnceArray[name] >= times)
        return false;
    if (DebugOnceArray[name]) {
        DebugOnceArray[name]++;
    } else {
        DebugOnceArray[name] = 1;
    }
    return true;
}

function isTouchDevice() {
    return 'ontouchstart' in window;
}

var HalfFloat = (function () {
    function HalfFloat() {
    }
    HalfFloat.fromFloat = function (Float) {
        var i = MathFloat.reinterpretFloatAsInt(Float);
        var s = ((i >> 16) & 0x00008000);
        var e = ((i >> 23) & 0x000000ff) - (127 - 15);
        var f = ((i >> 0) & 0x007fffff);

        // need to handle NaNs and Inf?
        if (e <= 0) {
            if (e < -10) {
                if (s != 0) {
                    // handle -0.0
                    return 0x8000;
                }
                return 0;
            }
            f = (f | 0x00800000) >> (1 - e);
            return s | (f >> 13);
        } else if (e == 0xff - (127 - 15)) {
            if (f == 0) {
                // Inf
                return s | 0x7c00;
            }

            // NAN
            f >>= 13;
            return s | 0x7c00 | f | ((f == 0) ? 1 : 0);
        }
        if (e > 30) {
            // Overflow
            return s | 0x7c00;
        }
        return s | (e << 10) | (f >> 13);
    };

    HalfFloat.toFloat = function (imm16) {
        var s = (imm16 >> 15) & 0x00000001;
        var e = (imm16 >> 10) & 0x0000001f;
        var f = (imm16 >> 0) & 0x000003ff;

        // Need to handle 0x7C00 INF and 0xFC00 -INF?
        if (e == 0) {
            // Need to handle +-0 case f==0 or f=0x8000?
            if (f == 0) {
                // Plus or minus zero
                return MathFloat.reinterpretIntAsFloat(s << 31);
            }

            while ((f & 0x00000400) == 0) {
                f <<= 1;
                e -= 1;
            }
            e += 1;
            f &= ~0x00000400;
        } else if (e == 31) {
            if (f == 0) {
                // Inf
                return MathFloat.reinterpretIntAsFloat((s << 31) | 0x7f800000);
            }

            // NaN
            return MathFloat.reinterpretIntAsFloat((s << 31) | 0x7f800000 | (f << 13));
        }

        e = e + (127 - 15);
        f = f << 13;

        return MathFloat.reinterpretIntAsFloat((s << 31) | (e << 23) | f);
    };
    return HalfFloat;
})();
//# sourceMappingURL=utils.js.map

var require = (function() {
function requireModules(moduleFiles) {
	var modules = {};
	
	function normalizePath(path) {
		var components = [];
		path.split('/').forEach(function(item) {
			switch (item) {
				case '': case '.': break;
				case '..': if (components.length) components.pop(); break;
				default: components.push(item);
			}
		});
		//console.log('path: ' + path + ' -> ' + components.join('/'));
		return components.join('/');
	}
	
	function getParentPath(path) {
		var index = path.lastIndexOf('/');
		if (index >= 0) return path.substr(0, index);
		return '';
	}
	
	var getRequireForPath = function(path) {
		return function(relativeModuleName) {
			var absoluteModuleName = normalizePath(path + '/' + relativeModuleName);
			var absoluteModuleParent = getParentPath(absoluteModuleName);
			var module = modules[absoluteModuleName];
			if (!module) {
				modules[absoluteModuleName] = module = { exports : {} };
				var moduleFunction = moduleFiles[absoluteModuleName];
				if (!moduleFunction) throw(new Error("Can't find module '" + absoluteModuleName + "'"));
				moduleFunction(module, module.exports, getRequireForPath(absoluteModuleParent));
			}
			return module.exports;
		};
	};
	return getRequireForPath('');
}return requireModules({
"src/app": function(module, exports, require) {
var _controller = require('./core/controller');
var _emulator = require('./emulator');

var PspCtrlButtons = _controller.PspCtrlButtons;
var Emulator = _emulator.Emulator;

function controllerRegister() {
    function createButton(query, button) {
        var jq = $(query);
        function down() {
            jq.addClass('pressed');
            window['emulator'].controller.simulateButtonDown(button);
        }
        function up() {
            jq.removeClass('pressed');
            window['emulator'].controller.simulateButtonUp(button);
        }

        jq.mousedown(down).mouseup(up).on('touchstart', down).on('touchend', up);
    }

    createButton('#button_left', 128 /* left */);
    createButton('#button_up', 16 /* up */);
    createButton('#button_down', 64 /* down */);
    createButton('#button_right', 32 /* right */);

    createButton('#button_up_left', 16 /* up */ | 128 /* left */);
    createButton('#button_up_right', 16 /* up */ | 32 /* right */);
    createButton('#button_down_left', 64 /* down */ | 128 /* left */);
    createButton('#button_down_right', 64 /* down */ | 32 /* right */);

    createButton('#button_cross', 16384 /* cross */);
    createButton('#button_circle', 8192 /* circle */);
    createButton('#button_triangle', 4096 /* triangle */);
    createButton('#button_square', 32768 /* square */);

    createButton('#button_l', 256 /* leftTrigger */);
    createButton('#button_r', 512 /* rightTrigger */);

    createButton('#button_start', 8 /* start */);
    createButton('#button_select', 1 /* select */);
    //document['ontouchmove'] = (e) => { e.preventDefault(); };
    //document.onselectstart = () => { return false; };
}

var emulator = new Emulator();
window['emulator'] = emulator;
var sampleDemo = '';

if (document.location.hash) {
    sampleDemo = document.location.hash.substr(1);
}

if (sampleDemo) {
    emulator.downloadAndExecuteAsync(sampleDemo);
}
controllerRegister();
//# sourceMappingURL=app.js.map
},
"src/context": function(module, exports, require) {
var EmulatorContext = (function () {
    function EmulatorContext() {
    }
    EmulatorContext.prototype.init = function (interruptManager, display, controller, gpu, memoryManager, threadManager, audio, memory, instructionCache, fileManager, rtc, callbackManager, moduleManager) {
        this.interruptManager = interruptManager;
        this.display = display;
        this.controller = controller;
        this.gpu = gpu;
        this.memoryManager = memoryManager;
        this.threadManager = threadManager;
        this.audio = audio;
        this.memory = memory;
        this.instructionCache = instructionCache;
        this.fileManager = fileManager;
        this.rtc = rtc;
        this.callbackManager = callbackManager;
        this.moduleManager = moduleManager;
    };
    return EmulatorContext;
})();
exports.EmulatorContext = EmulatorContext;
//# sourceMappingURL=context.js.map
},
"src/core/audio": function(module, exports, require) {
var PspAudioBuffer = (function () {
    function PspAudioBuffer(readedCallback, data) {
        this.readedCallback = readedCallback;
        this.data = data;
        this.offset = 0;
    }
    PspAudioBuffer.prototype.resolve = function () {
        if (this.readedCallback)
            this.readedCallback();
        this.readedCallback = null;
    };

    Object.defineProperty(PspAudioBuffer.prototype, "hasMore", {
        get: function () {
            return this.offset < this.length;
        },
        enumerable: true,
        configurable: true
    });

    PspAudioBuffer.prototype.read = function () {
        return this.data[this.offset++];
    };

    Object.defineProperty(PspAudioBuffer.prototype, "available", {
        get: function () {
            return this.length - this.offset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PspAudioBuffer.prototype, "length", {
        get: function () {
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    return PspAudioBuffer;
})();
exports.PspAudioBuffer = PspAudioBuffer;

var PspAudioChannel = (function () {
    function PspAudioChannel(audio, context) {
        var _this = this;
        this.audio = audio;
        this.context = context;
        this.buffers = [];
        if (this.context) {
            this.node = this.context.createScriptProcessor(1024, 2, 2);
            this.node.onaudioprocess = function (e) {
                _this.process(e);
            };
        }
    }
    PspAudioChannel.prototype.start = function () {
        if (this.node)
            this.node.connect(this.context.destination);
        this.audio.playingChannels.add(this);
        //document.addEventListener("visibilitychange", this.onVisibilityChanged);
    };

    /*
    private onVisibilityChanged() {
    document.hidden;
    }
    */
    PspAudioChannel.prototype.stop = function () {
        if (this.node)
            this.node.disconnect();
        this.audio.playingChannels.delete(this);
        //document.removeEventListener("visibilitychange", this.onVisibilityChanged);
    };

    PspAudioChannel.prototype.process = function (e) {
        var left = e.outputBuffer.getChannelData(0);
        var right = e.outputBuffer.getChannelData(1);
        var sampleCount = left.length;
        var hidden = document.hidden;

        for (var n = 0; n < sampleCount; n++) {
            if (!this.currentBuffer) {
                if (this.buffers.length == 0)
                    break;

                //for (var n = 0; n < Math.min(3, this.buffers.length); n++) if (this.buffers[n]) this.buffers[n].resolve();
                this.buffers.slice(0, 3).forEach(function (buffer) {
                    return buffer.resolve();
                });

                this.currentBuffer = this.buffers.shift();
                this.currentBuffer.resolve();
            }

            if (this.currentBuffer.available >= 2) {
                left[n] = this.currentBuffer.read();
                right[n] = this.currentBuffer.read();
            } else {
                this.currentBuffer = null;
                n--;
            }

            if (hidden)
                left[n] = right[n] = 0;
        }
    };

    PspAudioChannel.prototype.playAsync = function (data) {
        var _this = this;
        if (!this.node)
            return waitAsync(16).then(function () {
                return 0;
            });

        if (this.buffers.length < 4) {
            //(data.length / 2)
            this.buffers.push(new PspAudioBuffer(null, data));

            //return 0;
            return Promise.resolve(0);
        } else {
            return new Promise(function (resolved, rejected) {
                _this.buffers.push(new PspAudioBuffer(resolved, data));
                return 0;
            });
        }
    };
    return PspAudioChannel;
})();
exports.PspAudioChannel = PspAudioChannel;

var PspAudio = (function () {
    function PspAudio() {
        this.playingChannels = new SortedSet();
        try  {
            this.context = new AudioContext();
        } catch (e) {
        }
    }
    PspAudio.prototype.createChannel = function () {
        return new PspAudioChannel(this, this.context);
    };

    PspAudio.convertS16ToF32 = function (channels, input) {
        var output = new Float32Array(input.length * 2 / channels);
        switch (channels) {
            case 2:
                for (var n = 0; n < output.length; n++)
                    output[n] = input[n] / 32767.0;
                break;
            case 1:
                for (var n = 0, m = 0; n < input.length; n++) {
                    output[m++] = output[m++] = (input[n] / 32767.0);
                }
                break;
        }
        return output;
    };

    PspAudio.prototype.startAsync = function () {
        return Promise.resolve();
    };

    PspAudio.prototype.stopAsync = function () {
        this.playingChannels.forEach(function (channel) {
            channel.stop();
        });
        return Promise.resolve();
    };
    return PspAudio;
})();
exports.PspAudio = PspAudio;
//# sourceMappingURL=audio.js.map
},
"src/core/controller": function(module, exports, require) {
var SceCtrlData = (function () {
    function SceCtrlData() {
        this.timeStamp = 0;
        this.buttons = 0 /* none */;
        this.lx = 0;
        this.ly = 0;
        this._rsrv = [0, 0, 0, 0, 0];
        this.x = 0;
        this.y = 0;
    }
    Object.defineProperty(SceCtrlData.prototype, "x", {
        get: function () {
            return ((this.lx / 255.0) - 0.5) * 2.0;
        },
        set: function (value) {
            this.lx = (((value / 2.0) + 0.5) * 255.0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SceCtrlData.prototype, "y", {
        get: function () {
            return ((this.ly / 255.0) - 0.5) * 2.0;
        },
        set: function (value) {
            this.ly = (((value / 2.0) + 0.5) * 255.0);
        },
        enumerable: true,
        configurable: true
    });


    SceCtrlData.struct = StructClass.create(SceCtrlData, [
        { timeStamp: UInt32 },
        { buttons: UInt32 },
        { lx: Int8 },
        { ly: Int8 },
        { _rsrv: StructArray(Int8, 6) }
    ]);
    return SceCtrlData;
})();
exports.SceCtrlData = SceCtrlData;

var PspController = (function () {
    function PspController() {
        this.data = new SceCtrlData();
        this.buttonMapping = {};
        this.fieldMapping = {};
        this.analogUp = false;
        this.analogDown = false;
        this.analogLeft = false;
        this.analogRight = false;
        this.analogAddX = 0;
        this.analogAddY = 0;
        this.latchSamplingCount = 0;
        this.animationTimeId = 0;
        this.gamepadsButtons = [];
        this.buttonMapping = {};
        this.buttonMapping[38 /* up */] = 16 /* up */;
        this.buttonMapping[37 /* left */] = 128 /* left */;
        this.buttonMapping[39 /* right */] = 32 /* right */;
        this.buttonMapping[40 /* down */] = 64 /* down */;
        this.buttonMapping[13 /* enter */] = 8 /* start */;
        this.buttonMapping[32 /* space */] = 1 /* select */;
        this.buttonMapping[81 /* q */] = 256 /* leftTrigger */;
        this.buttonMapping[69 /* e */] = 512 /* rightTrigger */;
        this.buttonMapping[87 /* w */] = 4096 /* triangle */;
        this.buttonMapping[83 /* s */] = 16384 /* cross */;
        this.buttonMapping[65 /* a */] = 32768 /* square */;
        this.buttonMapping[68 /* d */] = 8192 /* circle */;

        //this.buttonMapping[KeyCodes.Down] = PspCtrlButtons.Down;
        this.fieldMapping[73 /* i */] = 'analogUp';
        this.fieldMapping[75 /* k */] = 'analogDown';
        this.fieldMapping[74 /* j */] = 'analogLeft';
        this.fieldMapping[76 /* l */] = 'analogRight';
    }
    PspController.prototype.keyDown = function (e) {
        //console.log(e.keyCode);
        var button = this.buttonMapping[e.keyCode];
        if (button !== undefined)
            this.data.buttons |= button;

        var field = this.fieldMapping[e.keyCode];
        if (field !== undefined)
            this[field] = true;
    };

    PspController.prototype.keyUp = function (e) {
        var button = this.buttonMapping[e.keyCode];
        if (button !== undefined)
            this.data.buttons &= ~button;

        var field = this.fieldMapping[e.keyCode];
        if (field !== undefined)
            this[field] = false;
    };

    PspController.prototype.simulateButtonDown = function (button) {
        this.data.buttons |= button;
    };

    PspController.prototype.simulateButtonUp = function (button) {
        this.data.buttons &= ~button;
    };

    PspController.prototype.simulateButtonPress = function (button) {
        var _this = this;
        this.simulateButtonDown(button);
        setTimeout(function () {
            _this.simulateButtonUp(button);
        }, 60);
    };

    PspController.prototype.startAsync = function () {
        var _this = this;
        document.addEventListener('keydown', function (e) {
            return _this.keyDown(e);
        });
        document.addEventListener('keyup', function (e) {
            return _this.keyUp(e);
        });
        this.frame(0);
        return Promise.resolve();
    };

    PspController.prototype.frame = function (timestamp) {
        var _this = this;
        if (this.analogUp) {
            this.analogAddY -= 0.25;
        } else if (this.analogDown) {
            this.analogAddY += 0.25;
        } else {
            this.analogAddY *= 0.3;
        }

        if (this.analogLeft) {
            this.analogAddX -= 0.25;
        } else if (this.analogRight) {
            this.analogAddX += 0.25;
        } else {
            this.analogAddX *= 0.3;
        }

        this.analogAddX = MathUtils.clamp(this.analogAddX, -1, +1);
        this.analogAddY = MathUtils.clamp(this.analogAddY, -1, +1);

        this.data.x = this.analogAddX;
        this.data.y = this.analogAddY;

        //console.log('zzzzzzzzz');
        if (navigator['getGamepads']) {
            //console.log('bbbbbbbbb');
            var gamepads = (navigator['getGamepads'])();
            if (gamepads[0]) {
                //console.log('aaaaaaaa');
                var buttonMapping = [
                    16384 /* cross */,
                    8192 /* circle */,
                    32768 /* square */,
                    4096 /* triangle */,
                    256 /* leftTrigger */,
                    512 /* rightTrigger */,
                    1048576 /* volumeUp */,
                    2097152 /* volumeDown */,
                    1 /* select */,
                    8 /* start */,
                    65536 /* home */,
                    8388608 /* note */,
                    16 /* up */,
                    64 /* down */,
                    128 /* left */,
                    32 /* right */
                ];

                var gamepad = gamepads[0];
                var buttons = gamepad['buttons'];
                var axes = gamepad['axes'];
                this.data.x += axes[0];
                this.data.y += axes[1];

                function checkButton(button) {
                    if (typeof button == 'number') {
                        return button != 0;
                    } else {
                        return button ? !!(button.pressed) : false;
                    }
                }

                for (var n = 0; n < 16; n++) {
                    if (checkButton(buttons[n])) {
                        this.simulateButtonDown(buttonMapping[n]);
                    } else {
                        this.simulateButtonUp(buttonMapping[n]);
                    }
                }
            }
        }

        this.data.x = MathUtils.clamp(this.data.x, -1, +1);
        this.data.y = MathUtils.clamp(this.data.y, -1, +1);

        this.animationTimeId = requestAnimationFrame(function (timestamp) {
            return _this.frame(timestamp);
        });
    };

    PspController.prototype.stopAsync = function () {
        document.removeEventListener('keydown', this.keyDown);
        document.removeEventListener('keyup', this.keyUp);
        cancelAnimationFrame(this.animationTimeId);
        return Promise.resolve();
    };
    return PspController;
})();
exports.PspController = PspController;

(function (PspCtrlButtons) {
    PspCtrlButtons[PspCtrlButtons["none"] = 0x0000000] = "none";
    PspCtrlButtons[PspCtrlButtons["select"] = 0x0000001] = "select";
    PspCtrlButtons[PspCtrlButtons["start"] = 0x0000008] = "start";
    PspCtrlButtons[PspCtrlButtons["up"] = 0x0000010] = "up";
    PspCtrlButtons[PspCtrlButtons["right"] = 0x0000020] = "right";
    PspCtrlButtons[PspCtrlButtons["down"] = 0x0000040] = "down";
    PspCtrlButtons[PspCtrlButtons["left"] = 0x0000080] = "left";
    PspCtrlButtons[PspCtrlButtons["leftTrigger"] = 0x0000100] = "leftTrigger";
    PspCtrlButtons[PspCtrlButtons["rightTrigger"] = 0x0000200] = "rightTrigger";
    PspCtrlButtons[PspCtrlButtons["triangle"] = 0x0001000] = "triangle";
    PspCtrlButtons[PspCtrlButtons["circle"] = 0x0002000] = "circle";
    PspCtrlButtons[PspCtrlButtons["cross"] = 0x0004000] = "cross";
    PspCtrlButtons[PspCtrlButtons["square"] = 0x0008000] = "square";
    PspCtrlButtons[PspCtrlButtons["home"] = 0x0010000] = "home";
    PspCtrlButtons[PspCtrlButtons["hold"] = 0x0020000] = "hold";
    PspCtrlButtons[PspCtrlButtons["wirelessLanUp"] = 0x0040000] = "wirelessLanUp";
    PspCtrlButtons[PspCtrlButtons["remote"] = 0x0080000] = "remote";
    PspCtrlButtons[PspCtrlButtons["volumeUp"] = 0x0100000] = "volumeUp";
    PspCtrlButtons[PspCtrlButtons["volumeDown"] = 0x0200000] = "volumeDown";
    PspCtrlButtons[PspCtrlButtons["screen"] = 0x0400000] = "screen";
    PspCtrlButtons[PspCtrlButtons["note"] = 0x0800000] = "note";
    PspCtrlButtons[PspCtrlButtons["discPresent"] = 0x1000000] = "discPresent";
    PspCtrlButtons[PspCtrlButtons["memoryStickPresent"] = 0x2000000] = "memoryStickPresent";
})(exports.PspCtrlButtons || (exports.PspCtrlButtons = {}));
var PspCtrlButtons = exports.PspCtrlButtons;

(function (HtmlKeyCodes) {
    HtmlKeyCodes[HtmlKeyCodes["backspace"] = 8] = "backspace";
    HtmlKeyCodes[HtmlKeyCodes["tab"] = 9] = "tab";
    HtmlKeyCodes[HtmlKeyCodes["enter"] = 13] = "enter";
    HtmlKeyCodes[HtmlKeyCodes["shift"] = 16] = "shift";
    HtmlKeyCodes[HtmlKeyCodes["ctrl"] = 17] = "ctrl";
    HtmlKeyCodes[HtmlKeyCodes["alt"] = 18] = "alt";
    HtmlKeyCodes[HtmlKeyCodes["pause"] = 19] = "pause";
    HtmlKeyCodes[HtmlKeyCodes["caps_lock"] = 20] = "caps_lock";
    HtmlKeyCodes[HtmlKeyCodes["escape"] = 27] = "escape";
    HtmlKeyCodes[HtmlKeyCodes["space"] = 32] = "space";
    HtmlKeyCodes[HtmlKeyCodes["page_up"] = 33] = "page_up";
    HtmlKeyCodes[HtmlKeyCodes["page_down"] = 34] = "page_down";
    HtmlKeyCodes[HtmlKeyCodes["end"] = 35] = "end";
    HtmlKeyCodes[HtmlKeyCodes["home"] = 36] = "home";
    HtmlKeyCodes[HtmlKeyCodes["left"] = 37] = "left";
    HtmlKeyCodes[HtmlKeyCodes["up"] = 38] = "up";
    HtmlKeyCodes[HtmlKeyCodes["right"] = 39] = "right";
    HtmlKeyCodes[HtmlKeyCodes["down"] = 40] = "down";
    HtmlKeyCodes[HtmlKeyCodes["insert"] = 45] = "insert";
    HtmlKeyCodes[HtmlKeyCodes["delete"] = 46] = "delete";
    HtmlKeyCodes[HtmlKeyCodes["k0"] = 48] = "k0";
    HtmlKeyCodes[HtmlKeyCodes["k1"] = 49] = "k1";
    HtmlKeyCodes[HtmlKeyCodes["k2"] = 50] = "k2";
    HtmlKeyCodes[HtmlKeyCodes["k3"] = 51] = "k3";
    HtmlKeyCodes[HtmlKeyCodes["k4"] = 52] = "k4";
    HtmlKeyCodes[HtmlKeyCodes["k5"] = 53] = "k5";
    HtmlKeyCodes[HtmlKeyCodes["k6"] = 54] = "k6";
    HtmlKeyCodes[HtmlKeyCodes["k7"] = 55] = "k7";
    HtmlKeyCodes[HtmlKeyCodes["k8"] = 56] = "k8";
    HtmlKeyCodes[HtmlKeyCodes["k9"] = 57] = "k9";
    HtmlKeyCodes[HtmlKeyCodes["a"] = 65] = "a";
    HtmlKeyCodes[HtmlKeyCodes["b"] = 66] = "b";
    HtmlKeyCodes[HtmlKeyCodes["c"] = 67] = "c";
    HtmlKeyCodes[HtmlKeyCodes["d"] = 68] = "d";
    HtmlKeyCodes[HtmlKeyCodes["e"] = 69] = "e";
    HtmlKeyCodes[HtmlKeyCodes["f"] = 70] = "f";
    HtmlKeyCodes[HtmlKeyCodes["g"] = 71] = "g";
    HtmlKeyCodes[HtmlKeyCodes["h"] = 72] = "h";
    HtmlKeyCodes[HtmlKeyCodes["i"] = 73] = "i";
    HtmlKeyCodes[HtmlKeyCodes["j"] = 74] = "j";
    HtmlKeyCodes[HtmlKeyCodes["k"] = 75] = "k";
    HtmlKeyCodes[HtmlKeyCodes["l"] = 76] = "l";
    HtmlKeyCodes[HtmlKeyCodes["m"] = 77] = "m";
    HtmlKeyCodes[HtmlKeyCodes["n"] = 78] = "n";
    HtmlKeyCodes[HtmlKeyCodes["o"] = 79] = "o";
    HtmlKeyCodes[HtmlKeyCodes["p"] = 80] = "p";
    HtmlKeyCodes[HtmlKeyCodes["q"] = 81] = "q";
    HtmlKeyCodes[HtmlKeyCodes["r"] = 82] = "r";
    HtmlKeyCodes[HtmlKeyCodes["s"] = 83] = "s";
    HtmlKeyCodes[HtmlKeyCodes["t"] = 84] = "t";
    HtmlKeyCodes[HtmlKeyCodes["u"] = 85] = "u";
    HtmlKeyCodes[HtmlKeyCodes["v"] = 86] = "v";
    HtmlKeyCodes[HtmlKeyCodes["w"] = 87] = "w";
    HtmlKeyCodes[HtmlKeyCodes["x"] = 88] = "x";
    HtmlKeyCodes[HtmlKeyCodes["y"] = 89] = "y";
    HtmlKeyCodes[HtmlKeyCodes["z"] = 90] = "z";
    HtmlKeyCodes[HtmlKeyCodes["left_window_key"] = 91] = "left_window_key";
    HtmlKeyCodes[HtmlKeyCodes["right_window_key"] = 92] = "right_window_key";
    HtmlKeyCodes[HtmlKeyCodes["select_key"] = 93] = "select_key";
    HtmlKeyCodes[HtmlKeyCodes["numpad_0"] = 96] = "numpad_0";
    HtmlKeyCodes[HtmlKeyCodes["numpad_1"] = 97] = "numpad_1";
    HtmlKeyCodes[HtmlKeyCodes["numpad_2"] = 98] = "numpad_2";
    HtmlKeyCodes[HtmlKeyCodes["numpad_3"] = 99] = "numpad_3";
    HtmlKeyCodes[HtmlKeyCodes["numpad_4"] = 100] = "numpad_4";
    HtmlKeyCodes[HtmlKeyCodes["numpad_5"] = 101] = "numpad_5";
    HtmlKeyCodes[HtmlKeyCodes["numpad_6"] = 102] = "numpad_6";
    HtmlKeyCodes[HtmlKeyCodes["numpad_7"] = 103] = "numpad_7";
    HtmlKeyCodes[HtmlKeyCodes["numpad_8"] = 104] = "numpad_8";
    HtmlKeyCodes[HtmlKeyCodes["numpad_9"] = 105] = "numpad_9";
    HtmlKeyCodes[HtmlKeyCodes["multiply"] = 106] = "multiply";
    HtmlKeyCodes[HtmlKeyCodes["add"] = 107] = "add";
    HtmlKeyCodes[HtmlKeyCodes["subtract"] = 109] = "subtract";
    HtmlKeyCodes[HtmlKeyCodes["decimal_point"] = 110] = "decimal_point";
    HtmlKeyCodes[HtmlKeyCodes["divide"] = 111] = "divide";
    HtmlKeyCodes[HtmlKeyCodes["f1"] = 112] = "f1";
    HtmlKeyCodes[HtmlKeyCodes["f2"] = 113] = "f2";
    HtmlKeyCodes[HtmlKeyCodes["f3"] = 114] = "f3";
    HtmlKeyCodes[HtmlKeyCodes["f4"] = 115] = "f4";
    HtmlKeyCodes[HtmlKeyCodes["f5"] = 116] = "f5";
    HtmlKeyCodes[HtmlKeyCodes["f6"] = 117] = "f6";
    HtmlKeyCodes[HtmlKeyCodes["f7"] = 118] = "f7";
    HtmlKeyCodes[HtmlKeyCodes["f8"] = 119] = "f8";
    HtmlKeyCodes[HtmlKeyCodes["f9"] = 120] = "f9";
    HtmlKeyCodes[HtmlKeyCodes["f10"] = 121] = "f10";
    HtmlKeyCodes[HtmlKeyCodes["f11"] = 122] = "f11";
    HtmlKeyCodes[HtmlKeyCodes["f12"] = 123] = "f12";
    HtmlKeyCodes[HtmlKeyCodes["num_lock"] = 144] = "num_lock";
    HtmlKeyCodes[HtmlKeyCodes["scroll_lock"] = 145] = "scroll_lock";
    HtmlKeyCodes[HtmlKeyCodes["semi_colon"] = 186] = "semi_colon";
    HtmlKeyCodes[HtmlKeyCodes["equal_sign"] = 187] = "equal_sign";
    HtmlKeyCodes[HtmlKeyCodes["comma"] = 188] = "comma";
    HtmlKeyCodes[HtmlKeyCodes["dash"] = 189] = "dash";
    HtmlKeyCodes[HtmlKeyCodes["period"] = 190] = "period";
    HtmlKeyCodes[HtmlKeyCodes["forward_slash"] = 191] = "forward_slash";
    HtmlKeyCodes[HtmlKeyCodes["grave_accent"] = 192] = "grave_accent";
    HtmlKeyCodes[HtmlKeyCodes["open_bracket"] = 219] = "open_bracket";
    HtmlKeyCodes[HtmlKeyCodes["back_slash"] = 220] = "back_slash";
    HtmlKeyCodes[HtmlKeyCodes["close_braket"] = 221] = "close_braket";
    HtmlKeyCodes[HtmlKeyCodes["single_quote"] = 222] = "single_quote";
})(exports.HtmlKeyCodes || (exports.HtmlKeyCodes = {}));
var HtmlKeyCodes = exports.HtmlKeyCodes;
//# sourceMappingURL=controller.js.map
},
"src/core/cpu": function(module, exports, require) {
var _assembler = require('./cpu/assembler');
_assembler.MipsAssembler;
var _state = require('./cpu/state');
_state.CpuState;
var _executor = require('./cpu/executor');
_executor.ProgramExecutor;
var _icache = require('./cpu/icache');
_icache.InstructionCache;
var _syscall = require('./cpu/syscall');
_syscall.SyscallManager;
var _instructions = require('./cpu/instructions');
_instructions.Instructions;

var MipsAssembler = _assembler.MipsAssembler;
exports.MipsAssembler = MipsAssembler;
var MipsDisassembler = _assembler.MipsDisassembler;
exports.MipsDisassembler = MipsDisassembler;
var CpuState = _state.CpuState;
exports.CpuState = CpuState;
_state.CpuState;
var CpuSpecialAddresses = _state.CpuSpecialAddresses;
exports.CpuSpecialAddresses = CpuSpecialAddresses;
var ProgramExecutor = _executor.ProgramExecutor;
exports.ProgramExecutor = ProgramExecutor;
var InstructionCache = _icache.InstructionCache;
exports.InstructionCache = InstructionCache;
var SyscallManager = _syscall.SyscallManager;
exports.SyscallManager = SyscallManager;

var Instruction = _instructions.Instruction;
exports.Instruction = Instruction;
var Instructions = _instructions.Instructions;
exports.Instructions = Instructions;
var NativeFunction = _syscall.NativeFunction;
exports.NativeFunction = NativeFunction;
//# sourceMappingURL=cpu.js.map
},
"src/core/cpu/assembler": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
var instructions = require('./instructions');

var Instructions = instructions.Instructions;
var Instruction = instructions.Instruction;

var MipsAssembler = (function () {
    function MipsAssembler() {
        this.instructions = Instructions.instance;
    }
    MipsAssembler.prototype.assembleToMemory = function (memory, PC, lines) {
        for (var n = 0; n < lines.length; n++) {
            var instructions = this.assemble(PC, lines[n]);
            for (var m = 0; m < instructions.length; m++) {
                var instruction = instructions[m];
                memory.writeInt32(PC, instruction.data);
                PC += 4;
            }
        }
    };

    MipsAssembler.prototype.assemble = function (PC, line) {
        //console.log(line);
        var matches = line.match(/^\s*(\w+)(.*)$/);
        var instructionName = matches[1];
        var instructionArguments = matches[2].replace(/^\s+/, '').replace(/\s+$/, '');

        switch (instructionName) {
            case 'li':
                var parts = instructionArguments.split(',');

                //console.log(parts);
                return this.assemble(PC, 'addiu ' + parts[0] + ', r0, ' + parts[1]);
        }

        var instructionType = this.instructions.findByName(instructionName);
        var instruction = new Instruction(PC, instructionType.vm.value);
        var types = [];

        var formatPattern = instructionType.format.replace('(', '\\(').replace(')', '\\)').replace(/(%\w+)/g, function (type) {
            types.push(type);

            switch (type) {
                case '%J':
                case '%s':
                case '%d':
                case '%t':
                    return '([$r]\\d+)';
                case '%i':
                    return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                case '%C':
                    return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                case '%c':
                    return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                default:
                    throw (new Error("MipsAssembler.Transform: Unknown type '" + type + "'"));
            }
        }).replace(/\s+/g, '\\s*');

        //console.log(formatPattern);
        var regex = new RegExp('^' + formatPattern + '$', '');

        //console.log(line);
        //console.log(formatPattern);
        var matches = instructionArguments.match(regex);

        //console.log(matches);
        //console.log(types);
        if (matches === null) {
            throw ('Not matching ' + instructionArguments + ' : ' + regex + ' : ' + instructionType.format);
        }

        for (var n = 0; n < types.length; n++) {
            var type = types[n];
            var match = matches[n + 1];

            //console.log(type + ' = ' + match);
            this.update(instruction, type, match);
        }

        //console.log(instructionType);
        //console.log(matches);
        return [instruction];
    };

    MipsAssembler.prototype.decodeRegister = function (name) {
        //console.log(name);
        if (name.charAt(0) == '$')
            return parseInt(name.substr(1));
        if (name.charAt(0) == 'r')
            return parseInt(name.substr(1));
        throw ('Invalid register "' + name + '"');
    };

    MipsAssembler.prototype.decodeInteger = function (str) {
        str = str.replace(/_/g, '');
        if (str.substr(0, 2) == '0b')
            return parseInt(str.substr(2), 2);
        if (str.substr(0, 2) == '0x')
            return parseInt(str.substr(2), 16);
        return parseInt(str, 10);
    };

    MipsAssembler.prototype.update = function (instruction, type, value) {
        switch (type) {
            case '%J':
            case '%s':
                instruction.rs = this.decodeRegister(value);
                break;
            case '%d':
                instruction.rd = this.decodeRegister(value);
                break;
            case '%t':
                instruction.rt = this.decodeRegister(value);
                break;
            case '%i':
                instruction.imm16 = this.decodeInteger(value);
                break;
            case '%C':
                instruction.syscall = this.decodeInteger(value);
                break;
            case '%c':
                instruction.syscall = this.decodeInteger(value);
                break;
            default:
                throw ("MipsAssembler.Update: Unknown type '" + type + "'");
        }
    };
    return MipsAssembler;
})();
exports.MipsAssembler = MipsAssembler;

var MipsDisassembler = (function () {
    function MipsDisassembler() {
        this.instructions = Instructions.instance;
    }
    MipsDisassembler.prototype.encodeRegister = function (index) {
        return '$' + index;
    };

    MipsDisassembler.prototype.disassemble = function (instruction) {
        var _this = this;
        var instructionType = this.instructions.findByData(instruction.data);
        var arguments = instructionType.format.replace(/(\%\w+)/g, function (type) {
            switch (type) {
                case '%s':
                    return _this.encodeRegister(instruction.rs);
                    break;
                case '%d':
                    return _this.encodeRegister(instruction.rd);
                    break;
                case '%t':
                    return _this.encodeRegister(instruction.rt);
                    break;
                default:
                    throw ("MipsDisassembler.Disassemble: Unknown type '" + type + "'");
            }
        });
        return instructionType.name + ' ' + arguments;
    };
    return MipsDisassembler;
})();
exports.MipsDisassembler = MipsDisassembler;
//# sourceMappingURL=assembler.js.map
},
"src/core/cpu/ast": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
var _ast = require('./ast_builder');

var ast;

function assignGpr(index, expr) {
    return ast.assignGpr(index, expr);
}
function assignFpr(index, expr) {
    return ast.assignFpr(index, expr);
}
function assignFpr_I(index, expr) {
    return ast.assignFpr_I(index, expr);
}
function assignIC(expr) {
    return ast.assignIC(expr);
}

function fcr31_cc() {
    return ast.fcr31_cc();
}
function fpr(index) {
    return ast.fpr(index);
}
function fpr_i(index) {
    return ast.fpr_i(index);
}
function gpr(index) {
    return ast.gpr(index);
}
function immBool(value) {
    return ast.imm32(value ? 1 : 0);
}
function imm32(value) {
    return ast.imm32(value);
}
function imm_f(value) {
    return ast.imm_f(value);
}
function u_imm32(value) {
    return ast.u_imm32(value);
}
function unop(op, right) {
    return ast.unop(op, right);
}
function binop(left, op, right) {
    return ast.binop(left, op, right);
}
function binop_i(left, op, right) {
    return ast.binop_i(left, op, right);
}
function _if(cond, codeTrue, codeFalse) {
    return ast._if(cond, codeTrue, codeFalse);
}
function call(name, exprList) {
    return ast.call(name, exprList);
}
function stm(expr) {
    return ast.stm(expr);
}
function stms(stms) {
    return ast.stms(stms);
}
function pc() {
    return ast.pc();
}
function lo() {
    return ast.lo();
}
function hi() {
    return ast.hi();
}
function ic() {
    return ast.ic();
}
function branchflag() {
    return ast.branchflag();
}
function branchpc() {
    return ast.branchpc();
}
function assign(ref, value) {
    return ast.assign(ref, value);
}
function i_simm16(i) {
    return imm32(i.imm16);
}
function i_uimm16(i) {
    return u_imm32(i.u_imm16);
}
function rs_imm16(i) {
    return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0));
}
function cast_uint(expr) {
    return binop(expr, '>>>', ast.imm32(0));
}

function setMatrix(reg, generator) {
    // @TODO
    return stm(ast.call('state.vfpuSetMatrix', [
        generator(0, 0)
    ]));
}

var InstructionAst = (function () {
    function InstructionAst() {
        ast = new _ast.MipsAstBuilder();
    }
    InstructionAst.prototype.lui = function (i) {
        return assignGpr(i.rt, u_imm32(i.imm16 << 16));
    };

    InstructionAst.prototype.vmzero = function (i) {
        // @TODO
        return setMatrix(i.VD, function (c, r) {
            return imm32(0);
        });
    };

    InstructionAst.prototype.add = function (i) {
        return this.addu(i);
    };
    InstructionAst.prototype.addu = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt)));
    };
    InstructionAst.prototype.addi = function (i) {
        return this.addiu(i);
    };
    InstructionAst.prototype.addiu = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16)));
    };

    InstructionAst.prototype.sub = function (i) {
        return this.subu(i);
    };
    InstructionAst.prototype.subu = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt)));
    };

    InstructionAst.prototype.sll = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos)));
    };
    InstructionAst.prototype.sra = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos)));
    };
    InstructionAst.prototype.srl = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos)));
    };
    InstructionAst.prototype.rotr = function (i) {
        return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)]));
    };

    InstructionAst.prototype.sllv = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31))));
    };
    InstructionAst.prototype.srav = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31))));
    };
    InstructionAst.prototype.srlv = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31))));
    };

    //srlv(i: Instruction) { return assignGpr(i.rd, call('BitUtils.srl', [gpr(i.rt), gpr(i.rs)])); }
    InstructionAst.prototype.rotrv = function (i) {
        return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), gpr(i.rs)]));
    };

    InstructionAst.prototype.bitrev = function (i) {
        return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)]));
    };

    InstructionAst.prototype.and = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '&', gpr(i.rt)));
    };
    InstructionAst.prototype.or = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '|', gpr(i.rt)));
    };
    InstructionAst.prototype.xor = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '^', gpr(i.rt)));
    };
    InstructionAst.prototype.nor = function (i) {
        return assignGpr(i.rd, unop('~', binop(gpr(i.rs), '|', gpr(i.rt))));
    };

    InstructionAst.prototype.andi = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '&', u_imm32(i.u_imm16)));
    };
    InstructionAst.prototype.ori = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '|', u_imm32(i.u_imm16)));
    };
    InstructionAst.prototype.xori = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '^', u_imm32(i.u_imm16)));
    };

    InstructionAst.prototype.mflo = function (i) {
        return assignGpr(i.rd, lo());
    };
    InstructionAst.prototype.mfhi = function (i) {
        return assignGpr(i.rd, hi());
    };
    InstructionAst.prototype.mfic = function (i) {
        return assignGpr(i.rt, ic());
    };

    InstructionAst.prototype.mtlo = function (i) {
        return assign(lo(), gpr(i.rs));
    };
    InstructionAst.prototype.mthi = function (i) {
        return assign(hi(), gpr(i.rs));
    };
    InstructionAst.prototype.mtic = function (i) {
        return assignIC(gpr(i.rt));
    };

    InstructionAst.prototype.slt = function (i) {
        return assignGpr(i.rd, call('state.slt', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.sltu = function (i) {
        return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.slti = function (i) {
        return assignGpr(i.rt, call('state.slt', [gpr(i.rs), imm32(i.imm16)]));
    };
    InstructionAst.prototype.sltiu = function (i) {
        return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.imm16)]));
    };

    InstructionAst.prototype.movz = function (i) {
        return _if(binop(gpr(i.rt), '==', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
    };
    InstructionAst.prototype.movn = function (i) {
        return _if(binop(gpr(i.rt), '!=', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
    };

    InstructionAst.prototype.ext = function (i) {
        return assignGpr(i.rt, call('BitUtils.extract', [gpr(i.rs), imm32(i.pos), imm32(i.size_e)]));
    };
    InstructionAst.prototype.ins = function (i) {
        return assignGpr(i.rt, call('BitUtils.insert', [gpr(i.rt), imm32(i.pos), imm32(i.size_i), gpr(i.rs)]));
    };

    InstructionAst.prototype.clz = function (i) {
        return assignGpr(i.rd, call('BitUtils.clz', [gpr(i.rs)]));
    };
    InstructionAst.prototype.clo = function (i) {
        return assignGpr(i.rd, call('BitUtils.clo', [gpr(i.rs)]));
    };
    InstructionAst.prototype.seb = function (i) {
        return assignGpr(i.rd, call('BitUtils.seb', [gpr(i.rt)]));
    };
    InstructionAst.prototype.seh = function (i) {
        return assignGpr(i.rd, call('BitUtils.seh', [gpr(i.rt)]));
    };

    InstructionAst.prototype.wsbh = function (i) {
        return assignGpr(i.rd, call('BitUtils.wsbh', [gpr(i.rt)]));
    };
    InstructionAst.prototype.wsbw = function (i) {
        return assignGpr(i.rd, call('BitUtils.wsbw', [gpr(i.rt)]));
    };

    InstructionAst.prototype._trace_state = function () {
        return stm(ast.call('state._trace_state', []));
    };

    InstructionAst.prototype["mov.s"] = function (i) {
        return assignFpr(i.fd, fpr(i.fs));
    };
    InstructionAst.prototype["add.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '+', fpr(i.ft)));
    };
    InstructionAst.prototype["sub.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '-', fpr(i.ft)));
    };
    InstructionAst.prototype["mul.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '*', fpr(i.ft)));
    };
    InstructionAst.prototype["div.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '/', fpr(i.ft)));
    };
    InstructionAst.prototype["abs.s"] = function (i) {
        return assignFpr(i.fd, call('Math.abs', [fpr(i.fs)]));
    };
    InstructionAst.prototype["sqrt.s"] = function (i) {
        return assignFpr(i.fd, call('Math.sqrt', [fpr(i.fs)]));
    };
    InstructionAst.prototype["neg.s"] = function (i) {
        return assignFpr(i.fd, unop('-', fpr(i.fs)));
    };

    InstructionAst.prototype.min = function (i) {
        return assignGpr(i.rd, call('state.min', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.max = function (i) {
        return assignGpr(i.rd, call('state.max', [gpr(i.rs), gpr(i.rt)]));
    };

    InstructionAst.prototype.div = function (i) {
        return stm(call('state.div', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.divu = function (i) {
        return stm(call('state.divu', [gpr(i.rs), gpr(i.rt)]));
    };

    InstructionAst.prototype.mult = function (i) {
        return stm(call('state.mult', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.multu = function (i) {
        return stm(call('state.multu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.madd = function (i) {
        return stm(call('state.madd', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.maddu = function (i) {
        return stm(call('state.maddu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.msub = function (i) {
        return stm(call('state.msub', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.msubu = function (i) {
        return stm(call('state.msubu', [gpr(i.rs), gpr(i.rt)]));
    };

    InstructionAst.prototype.cache = function (i) {
        return stm(call('state.cache', [gpr(i.rs), imm32(i.rt), imm32(i.imm16)]));
    };

    InstructionAst.prototype.syscall = function (i) {
        return stm(call('state.syscall', [imm32(i.syscall)]));
    };
    InstructionAst.prototype["break"] = function (i) {
        return stm(call('state.break', []));
    };
    InstructionAst.prototype.dbreak = function (i) {
        return ast.debugger("dbreak");
    };

    InstructionAst.prototype._likely = function (isLikely, code) {
        return isLikely ? _if(branchflag(), code) : code;
    };

    InstructionAst.prototype._postBranch = function (nextPc) {
        return _if(branchflag(), stm(assign(pc(), branchpc())), stms([stm(assign(pc(), u_imm32(nextPc)))]));
    };

    InstructionAst.prototype._storePC = function (_pc) {
        return assign(pc(), u_imm32(_pc));
    };

    InstructionAst.prototype._branch = function (i, cond) {
        return stms([
            stm(assign(branchflag(), cond)),
            stm(assign(branchpc(), u_imm32(i.PC + i.imm16 * 4 + 4)))
        ]);
    };

    InstructionAst.prototype.beq = function (i) {
        return this._branch(i, binop(gpr(i.rs), "==", gpr(i.rt)));
    };
    InstructionAst.prototype.bne = function (i) {
        return this._branch(i, binop(gpr(i.rs), "!=", gpr(i.rt)));
    };
    InstructionAst.prototype.bltz = function (i) {
        return this._branch(i, binop(gpr(i.rs), "<", imm32(0)));
    };
    InstructionAst.prototype.blez = function (i) {
        return this._branch(i, binop(gpr(i.rs), "<=", imm32(0)));
    };
    InstructionAst.prototype.bgtz = function (i) {
        return this._branch(i, binop(gpr(i.rs), ">", imm32(0)));
    };
    InstructionAst.prototype.bgez = function (i) {
        return this._branch(i, binop(gpr(i.rs), ">=", imm32(0)));
    };

    InstructionAst.prototype.beql = function (i) {
        return this.beq(i);
    };
    InstructionAst.prototype.bnel = function (i) {
        return this.bne(i);
    };
    InstructionAst.prototype.bltzl = function (i) {
        return this.bltz(i);
    };
    InstructionAst.prototype.blezl = function (i) {
        return this.blez(i);
    };
    InstructionAst.prototype.bgtzl = function (i) {
        return this.bgtz(i);
    };
    InstructionAst.prototype.bgezl = function (i) {
        return this.bgez(i);
    };

    InstructionAst.prototype.bltzal = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltz(i)]);
    };
    InstructionAst.prototype.bltzall = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltzl(i)]);
    };

    InstructionAst.prototype.bgezal = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgez(i)]);
    };
    InstructionAst.prototype.bgezall = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgezl(i)]);
    };

    InstructionAst.prototype.bc1t = function (i) {
        return this._branch(i, fcr31_cc());
    };
    InstructionAst.prototype.bc1f = function (i) {
        return this._branch(i, unop("!", fcr31_cc()));
    };

    InstructionAst.prototype.bc1tl = function (i) {
        return this.bc1t(i);
    };
    InstructionAst.prototype.bc1fl = function (i) {
        return this.bc1f(i);
    };

    InstructionAst.prototype.sb = function (i) {
        return stm(call('state.sb', [gpr(i.rt), rs_imm16(i)]));
    };
    InstructionAst.prototype.sh = function (i) {
        return stm(call('state.sh', [gpr(i.rt), rs_imm16(i)]));
    };
    InstructionAst.prototype.sw = function (i) {
        return stm(call('state.sw', [gpr(i.rt), rs_imm16(i)]));
    };

    InstructionAst.prototype.swc1 = function (i) {
        return stm(call('state.swc1', [fpr(i.ft), rs_imm16(i)]));
    };
    InstructionAst.prototype.lwc1 = function (i) {
        return assignFpr_I(i.ft, call('state.lw', [rs_imm16(i)]));
    };

    InstructionAst.prototype.mfc1 = function (i) {
        return assignGpr(i.rt, ast.fpr_i(i.fs));
    };
    InstructionAst.prototype.mtc1 = function (i) {
        return assignFpr_I(i.fs, ast.gpr(i.rt));
    };
    InstructionAst.prototype.cfc1 = function (i) {
        return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)]));
    };
    InstructionAst.prototype.ctc1 = function (i) {
        return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)]));
    };

    InstructionAst.prototype["trunc.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.trunc', [fpr(i.fs)]));
    };
    InstructionAst.prototype["round.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.round', [fpr(i.fs)]));
    };
    InstructionAst.prototype["ceil.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.ceil', [fpr(i.fs)]));
    };
    InstructionAst.prototype["floor.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.floor', [fpr(i.fs)]));
    };

    InstructionAst.prototype["cvt.s.w"] = function (i) {
        return assignFpr(i.fd, fpr_i(i.fs));
    };
    InstructionAst.prototype["cvt.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)]));
    };

    InstructionAst.prototype.lb = function (i) {
        return assignGpr(i.rt, call('state.lb', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lbu = function (i) {
        return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lh = function (i) {
        return assignGpr(i.rt, call('state.lh', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lhu = function (i) {
        return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lw = function (i) {
        return assignGpr(i.rt, call('state.lw', [rs_imm16(i)]));
    };

    InstructionAst.prototype.lwl = function (i) {
        return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.lwr = function (i) {
        return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.swl = function (i) {
        return stm(call('state.swl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.swr = function (i) {
        return stm(call('state.swr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };

    InstructionAst.prototype._callstackPush = function (i) {
        return stm(call('state.callstackPush', [imm32(i.PC)]));
    };

    InstructionAst.prototype._callstackPop = function (i) {
        return stm(call('state.callstackPop', []));
    };

    InstructionAst.prototype.j = function (i) {
        return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]);
    };
    InstructionAst.prototype.jr = function (i) {
        var statements = [];
        statements.push(stm(assign(branchflag(), imm32(1))));
        statements.push(stm(assign(branchpc(), gpr(i.rs))));
        if (i.rs == 31) {
            statements.push(this._callstackPop(i));
        }
        return stms(statements);
    };
    InstructionAst.prototype.jal = function (i) {
        return stms([this.j(i), this._callstackPush(i), assignGpr(31, u_imm32(i.PC + 8))]);
    };
    InstructionAst.prototype.jalr = function (i) {
        return stms([this.jr(i), this._callstackPush(i), assignGpr(i.rd, u_imm32(i.PC + 8))]);
    };

    InstructionAst.prototype._comp = function (i, fc02, fc3) {
        var fc_unordererd = ((fc02 & 1) != 0);
        var fc_equal = ((fc02 & 2) != 0);
        var fc_less = ((fc02 & 4) != 0);
        var fc_inv_qnan = (fc3 != 0);

        return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));
    };

    InstructionAst.prototype["c.f.s"] = function (i) {
        return this._comp(i, 0, 0);
    };
    InstructionAst.prototype["c.un.s"] = function (i) {
        return this._comp(i, 1, 0);
    };
    InstructionAst.prototype["c.eq.s"] = function (i) {
        return this._comp(i, 2, 0);
    };
    InstructionAst.prototype["c.ueq.s"] = function (i) {
        return this._comp(i, 3, 0);
    };
    InstructionAst.prototype["c.olt.s"] = function (i) {
        return this._comp(i, 4, 0);
    };
    InstructionAst.prototype["c.ult.s"] = function (i) {
        return this._comp(i, 5, 0);
    };
    InstructionAst.prototype["c.ole.s"] = function (i) {
        return this._comp(i, 6, 0);
    };
    InstructionAst.prototype["c.ule.s"] = function (i) {
        return this._comp(i, 7, 0);
    };

    InstructionAst.prototype["c.sf.s"] = function (i) {
        return this._comp(i, 0, 1);
    };
    InstructionAst.prototype["c.ngle.s"] = function (i) {
        return this._comp(i, 1, 1);
    };
    InstructionAst.prototype["c.seq.s"] = function (i) {
        return this._comp(i, 2, 1);
    };
    InstructionAst.prototype["c.ngl.s"] = function (i) {
        return this._comp(i, 3, 1);
    };
    InstructionAst.prototype["c.lt.s"] = function (i) {
        return this._comp(i, 4, 1);
    };
    InstructionAst.prototype["c.nge.s"] = function (i) {
        return this._comp(i, 5, 1);
    };
    InstructionAst.prototype["c.le.s"] = function (i) {
        return this._comp(i, 6, 1);
    };
    InstructionAst.prototype["c.ngt.s"] = function (i) {
        return this._comp(i, 7, 1);
    };
    return InstructionAst;
})();
exports.InstructionAst = InstructionAst;
//# sourceMappingURL=ast.js.map
},
"src/core/cpu/ast_builder": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ANode = (function () {
    function ANode() {
    }
    ANode.prototype.toJs = function () {
        return '';
    };
    ANode.prototype.optimize = function () {
        return this;
    };
    return ANode;
})();
exports.ANode = ANode;

var ANodeStm = (function (_super) {
    __extends(ANodeStm, _super);
    function ANodeStm() {
        _super.apply(this, arguments);
    }
    return ANodeStm;
})(ANode);
exports.ANodeStm = ANodeStm;

var ANodeStmJump = (function (_super) {
    __extends(ANodeStmJump, _super);
    function ANodeStmJump(label) {
        _super.call(this);
        this.label = label;
    }
    return ANodeStmJump;
})(ANodeStm);
exports.ANodeStmJump = ANodeStmJump;

var ANodeStmReturn = (function (_super) {
    __extends(ANodeStmReturn, _super);
    function ANodeStmReturn() {
        _super.apply(this, arguments);
    }
    ANodeStmReturn.prototype.toJs = function () {
        return 'return;';
    };
    return ANodeStmReturn;
})(ANodeStm);
exports.ANodeStmReturn = ANodeStmReturn;

var ANodeStmList = (function (_super) {
    __extends(ANodeStmList, _super);
    function ANodeStmList(childs) {
        _super.call(this);
        this.childs = childs;
        this.labels = {};
    }
    ANodeStmList.prototype.createLabel = function (label) {
        this.labels[label] = this.childs.length;
        return this.childs.length;
    };

    ANodeStmList.prototype.add = function (node) {
        this.childs.push(node);
    };

    ANodeStmList.prototype.toJs = function () {
        var jumpCount = 0;
        var usedLabels = {};
        for (var n = 0; n < this.childs.length; n++) {
            var item = this.childs[n];
            if (item instanceof ANodeStmJump) {
                jumpCount++;
                usedLabels[item.label] = true;
            }
        }
        if (jumpCount > 1)
            throw (new Error("Not supported more than one jump at this point!"));

        var lines = [];
        for (var n = 0; n < this.childs.length; n++) {
            var child = this.childs[n];

            if (usedLabels[n] !== undefined) {
                lines.push('while(true) {');
            }

            //console.log(usedLabels);
            lines.push(child.toJs());

            if (child instanceof ANodeStmJump) {
                lines.push('}');
            }
        }
        return lines.join("\n");
    };
    return ANodeStmList;
})(ANodeStm);
exports.ANodeStmList = ANodeStmList;

var ANodeStmRaw = (function (_super) {
    __extends(ANodeStmRaw, _super);
    function ANodeStmRaw(content) {
        _super.call(this);
        this.content = content;
    }
    ANodeStmRaw.prototype.toJs = function () {
        return this.content;
    };
    return ANodeStmRaw;
})(ANodeStm);
exports.ANodeStmRaw = ANodeStmRaw;

var ANodeStmExpr = (function (_super) {
    __extends(ANodeStmExpr, _super);
    function ANodeStmExpr(expr) {
        _super.call(this);
        this.expr = expr;
    }
    ANodeStmExpr.prototype.toJs = function () {
        return this.expr.toJs() + ';';
    };
    return ANodeStmExpr;
})(ANodeStm);
exports.ANodeStmExpr = ANodeStmExpr;

var ANodeExpr = (function (_super) {
    __extends(ANodeExpr, _super);
    function ANodeExpr() {
        _super.apply(this, arguments);
    }
    return ANodeExpr;
})(ANode);
exports.ANodeExpr = ANodeExpr;

var ANodeExprLValue = (function (_super) {
    __extends(ANodeExprLValue, _super);
    function ANodeExprLValue() {
        _super.apply(this, arguments);
    }
    return ANodeExprLValue;
})(ANodeExpr);
exports.ANodeExprLValue = ANodeExprLValue;

var ANodeExprLValueVar = (function (_super) {
    __extends(ANodeExprLValueVar, _super);
    function ANodeExprLValueVar(name) {
        _super.call(this);
        this.name = name;
    }
    ANodeExprLValueVar.prototype.toJs = function () {
        return this.name;
    };
    return ANodeExprLValueVar;
})(ANodeExprLValue);
exports.ANodeExprLValueVar = ANodeExprLValueVar;

var ANodeExprI32 = (function (_super) {
    __extends(ANodeExprI32, _super);
    function ANodeExprI32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprI32.prototype.toJs = function () {
        return String(this.value);
    };
    return ANodeExprI32;
})(ANodeExpr);
exports.ANodeExprI32 = ANodeExprI32;

var ANodeExprFloat = (function (_super) {
    __extends(ANodeExprFloat, _super);
    function ANodeExprFloat(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprFloat.prototype.toJs = function () {
        return String(this.value);
    };
    return ANodeExprFloat;
})(ANodeExpr);
exports.ANodeExprFloat = ANodeExprFloat;

var ANodeExprU32 = (function (_super) {
    __extends(ANodeExprU32, _super);
    function ANodeExprU32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprU32.prototype.toJs = function () {
        return sprintf('0x%08X', this.value);
    };
    return ANodeExprU32;
})(ANodeExpr);
exports.ANodeExprU32 = ANodeExprU32;

var ANodeExprBinop = (function (_super) {
    __extends(ANodeExprBinop, _super);
    function ANodeExprBinop(left, op, right) {
        _super.call(this);
        this.left = left;
        this.op = op;
        this.right = right;
    }
    ANodeExprBinop.prototype.toJs = function () {
        return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')';
    };
    return ANodeExprBinop;
})(ANodeExpr);
exports.ANodeExprBinop = ANodeExprBinop;

var ANodeExprUnop = (function (_super) {
    __extends(ANodeExprUnop, _super);
    function ANodeExprUnop(op, right) {
        _super.call(this);
        this.op = op;
        this.right = right;
    }
    ANodeExprUnop.prototype.toJs = function () {
        return '(' + this.op + '(' + this.right.toJs() + '))';
    };
    return ANodeExprUnop;
})(ANodeExpr);
exports.ANodeExprUnop = ANodeExprUnop;

var ANodeExprAssign = (function (_super) {
    __extends(ANodeExprAssign, _super);
    function ANodeExprAssign(left, right) {
        _super.call(this);
        this.left = left;
        this.right = right;
    }
    ANodeExprAssign.prototype.toJs = function () {
        return this.left.toJs() + ' = ' + this.right.toJs();
    };
    return ANodeExprAssign;
})(ANodeExpr);
exports.ANodeExprAssign = ANodeExprAssign;

var ANodeExprCall = (function (_super) {
    __extends(ANodeExprCall, _super);
    function ANodeExprCall(name, _arguments) {
        _super.call(this);
        this.name = name;
        this._arguments = _arguments;
    }
    ANodeExprCall.prototype.toJs = function () {
        return this.name + '(' + this._arguments.map(function (argument) {
            return argument.toJs();
        }).join(',') + ')';
    };
    return ANodeExprCall;
})(ANodeExpr);
exports.ANodeExprCall = ANodeExprCall;

var ANodeStmIf = (function (_super) {
    __extends(ANodeStmIf, _super);
    function ANodeStmIf(cond, codeTrue, codeFalse) {
        _super.call(this);
        this.cond = cond;
        this.codeTrue = codeTrue;
        this.codeFalse = codeFalse;
    }
    ANodeStmIf.prototype.toJs = function () {
        var result = '';
        result += 'if (' + this.cond.toJs() + ')';
        result += ' { ' + this.codeTrue.toJs() + ' }';
        if (this.codeFalse)
            result += ' else { ' + this.codeFalse.toJs() + ' }';
        return result;
    };
    return ANodeStmIf;
})(ANodeStm);
exports.ANodeStmIf = ANodeStmIf;

var AstBuilder = (function () {
    function AstBuilder() {
    }
    AstBuilder.prototype.assign = function (ref, value) {
        return new ANodeExprAssign(ref, value);
    };
    AstBuilder.prototype._if = function (cond, codeTrue, codeFalse) {
        return new ANodeStmIf(cond, codeTrue, codeFalse);
    };
    AstBuilder.prototype.binop = function (left, op, right) {
        return new ANodeExprBinop(left, op, right);
    };
    AstBuilder.prototype.unop = function (op, right) {
        return new ANodeExprUnop(op, right);
    };
    AstBuilder.prototype.binop_i = function (left, op, right) {
        return this.binop(left, op, this.imm32(right));
    };
    AstBuilder.prototype.imm32 = function (value) {
        return new ANodeExprI32(value);
    };
    AstBuilder.prototype.imm_f = function (value) {
        return new ANodeExprFloat(value);
    };
    AstBuilder.prototype.u_imm32 = function (value) {
        return new ANodeExprU32(value);
    };
    AstBuilder.prototype.stm = function (expr) {
        return new ANodeStmExpr(expr);
    };
    AstBuilder.prototype.stmEmpty = function () {
        return new ANodeStm();
    };
    AstBuilder.prototype.stms = function (stms) {
        return new ANodeStmList(stms);
    };
    AstBuilder.prototype.call = function (name, exprList) {
        return new ANodeExprCall(name, exprList);
    };
    AstBuilder.prototype.jump = function (label) {
        return new ANodeStmJump(label);
    };
    AstBuilder.prototype._return = function () {
        return new ANodeStmReturn();
    };
    AstBuilder.prototype.raw = function (content) {
        return new ANodeStmRaw(content);
    };
    return AstBuilder;
})();
exports.AstBuilder = AstBuilder;

var MipsAstBuilder = (function (_super) {
    __extends(MipsAstBuilder, _super);
    function MipsAstBuilder() {
        _super.apply(this, arguments);
    }
    MipsAstBuilder.prototype.debugger = function (comment) {
        return new ANodeStmRaw("debugger; // " + comment + "\n");
    };

    MipsAstBuilder.prototype.functionPrefix = function () {
        return this.stmEmpty();
    };

    MipsAstBuilder.prototype.gpr = function (index) {
        if (index === 0)
            return new ANodeExprLValueVar('0');
        return new ANodeExprLValueVar('state.gpr[' + index + ']');
    };

    MipsAstBuilder.prototype.fpr = function (index) {
        return new ANodeExprLValueVar('state.fpr[' + index + ']');
    };

    MipsAstBuilder.prototype.fpr_i = function (index) {
        //return this.call('MathFloat.reinterpretFloatAsInt', [this.fpr(index)]);
        return new ANodeExprLValueVar('state.fpr_i[' + index + ']');
    };

    MipsAstBuilder.prototype.fcr31_cc = function () {
        return new ANodeExprLValueVar('state.fcr31_cc');
    };
    MipsAstBuilder.prototype.lo = function () {
        return new ANodeExprLValueVar('state.LO');
    };
    MipsAstBuilder.prototype.hi = function () {
        return new ANodeExprLValueVar('state.HI');
    };
    MipsAstBuilder.prototype.ic = function () {
        return new ANodeExprLValueVar('state.IC');
    };
    MipsAstBuilder.prototype.pc = function () {
        return new ANodeExprLValueVar('state.PC');
    };
    MipsAstBuilder.prototype.ra = function () {
        return new ANodeExprLValueVar('state.gpr[31]');
    };
    MipsAstBuilder.prototype.branchflag = function () {
        return new ANodeExprLValueVar('state.BRANCHFLAG');
    };
    MipsAstBuilder.prototype.branchpc = function () {
        return new ANodeExprLValueVar('state.BRANCHPC');
    };

    MipsAstBuilder.prototype.assignGpr = function (index, expr) {
        if (index == 0)
            return this.stmEmpty();
        return this.stm(this.assign(this.gpr(index), expr));
    };

    MipsAstBuilder.prototype.assignIC = function (expr) {
        return this.stm(this.assign(this.ic(), expr));
    };
    MipsAstBuilder.prototype.assignFpr = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), expr));
    };
    MipsAstBuilder.prototype.assignFpr_I = function (index, expr) {
        return this.stm(this.assign(this.fpr_i(index), expr));
    };
    return MipsAstBuilder;
})(AstBuilder);
exports.MipsAstBuilder = MipsAstBuilder;
//# sourceMappingURL=ast_builder.js.map
},
"src/core/cpu/executor": function(module, exports, require) {
var ProgramExecutor = (function () {
    function ProgramExecutor(state, instructionCache) {
        this.state = state;
        this.instructionCache = instructionCache;
        this.lastPC = 0;
        this.lastTime = 0;
        this.times = 0;
        this.state.executor = this;
    }
    ProgramExecutor.prototype._executeStep = function () {
        if (this.state.PC == 0)
            console.error(sprintf("Calling 0x%08X from 0x%08X", this.state.PC, this.lastPC));
        this.lastPC = this.state.PC;
        var func = this.instructionCache.getFunction(this.state.PC);
        func(this.state);
        //this.instructionCache.getFunction(this.state.PC)(this.state);
    };

    ProgramExecutor.prototype.executeUntilPCReachesWithoutCall = function (expectedPC) {
        while (this.state.PC != expectedPC) {
            this._executeStep();
            this.times++;
            if (this.times >= 100000) {
                this.times = 0;
                if ((performance.now() - this.lastTime) >= 100)
                    throw (new CpuBreakException());
                this.lastTime = performance.now();
            }
        }
    };

    ProgramExecutor.prototype.executeWithoutCatch = function (maxIterations) {
        if (typeof maxIterations === "undefined") { maxIterations = -1; }
        while (maxIterations != 0) {
            this._executeStep();
            if (maxIterations > 0)
                maxIterations--;
        }
    };

    ProgramExecutor.prototype.execute = function (maxIterations) {
        if (typeof maxIterations === "undefined") { maxIterations = -1; }
        try  {
            this.executeWithoutCatch(maxIterations);
        } catch (e) {
            if (!(e instanceof CpuBreakException)) {
                console.log(this.state);
                this.state.printCallstack();
                throw (e);
            }
        }
    };
    return ProgramExecutor;
})();
exports.ProgramExecutor = ProgramExecutor;
//# sourceMappingURL=executor.js.map
},
"src/core/cpu/generator": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ast = require('./ast');
var ast_builder = require('./ast_builder');
var instructions = require('./instructions');

var InstructionAst = ast.InstructionAst;

var Instructions = instructions.Instructions;
var Instruction = instructions.Instruction;
var DecodedInstruction = instructions.DecodedInstruction;

var MipsAstBuilder = ast_builder.MipsAstBuilder;

var PspInstructionStm = (function (_super) {
    __extends(PspInstructionStm, _super);
    function PspInstructionStm(PC, code) {
        _super.call(this);
        this.PC = PC;
        this.code = code;
    }
    PspInstructionStm.prototype.toJs = function () {
        return sprintf("/*%08X*/ %s", this.PC, this.code.toJs());
    };
    PspInstructionStm.prototype.optimize = function () {
        return new PspInstructionStm(this.PC, this.code.optimize());
    };
    return PspInstructionStm;
})(ast_builder.ANodeStm);

var FunctionGenerator = (function () {
    function FunctionGenerator(memory) {
        this.memory = memory;
        this.instructions = Instructions.instance;
        this.instructionAst = new InstructionAst();
        this.instructionUsageCount = {};
    }
    FunctionGenerator.prototype.getInstructionUsageCount = function () {
        var items = [];
        for (var key in this.instructionUsageCount) {
            var value = this.instructionUsageCount[key];
            items.push({ name: key, count: value });
        }
        items.sort(function (a, b) {
            return compareNumbers(a.count, b.count);
        }).reverse();
        return items;
    };

    FunctionGenerator.prototype.decodeInstruction = function (address) {
        var instruction = Instruction.fromMemoryAndPC(this.memory, address);
        var instructionType = this.getInstructionType(instruction);
        return new DecodedInstruction(instruction, instructionType);
    };

    FunctionGenerator.prototype.getInstructionType = function (i) {
        return this.instructions.findByData(i.data, i.PC);
    };

    FunctionGenerator.prototype.generateInstructionAstNode = function (di) {
        var instruction = di.instruction;
        var instructionType = di.type;
        var func = this.instructionAst[instructionType.name];
        if (func === undefined)
            throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
        return func.call(this.instructionAst, instruction);
    };

    FunctionGenerator.prototype.create = function (address) {
        var _this = this;
        //var enableOptimizations = false;
        var enableOptimizations = true;

        if (address == 0x00000000) {
            throw (new Error("Trying to execute 0x00000000"));
        }

        var ast = new MipsAstBuilder();

        var startPC = address;
        var PC = address;
        var stms = new ast_builder.ANodeStmList([ast.functionPrefix()]);
        var mustDumpFunction = false;
        var pcToLabel = {};

        var emitInstruction = function () {
            var result = new PspInstructionStm(PC, _this.generateInstructionAstNode(_this.decodeInstruction(PC)));
            PC += 4;
            return result;
        };

        stms.add(ast.raw('var expectedRA = state.getRA();'));

        function returnWithCheck() {
            stms.add(ast.raw('return;'));
        }

        for (var n = 0; n < 100000; n++) {
            var di = this.decodeInstruction(PC + 0);

            //console.log(di);
            pcToLabel[PC] = stms.createLabel(PC);

            if (this.instructionUsageCount[di.type.name] === undefined) {
                this.instructionUsageCount[di.type.name] = 0;
                //console.warn('**** NEW instruction: ', di.type.name);
            }
            this.instructionUsageCount[di.type.name]++;

            //if ([0x089162F8, 0x08916318].contains(PC)) stms.push(ast.debugger(sprintf('PC: %08X', PC)));
            if (di.type.isJumpOrBranch) {
                var di2 = this.decodeInstruction(PC + 4);
                var isBranch = di.type.isBranch;
                var isCall = di.type.isCall;
                var jumpAddress = 0;
                var jumpBack = false;
                var jumpAhead = false;

                if (isBranch) {
                    jumpAddress = PC + di.instruction.imm16 * 4 + 4;
                } else {
                    jumpAddress = di.instruction.u_imm26 * 4;
                }

                jumpAhead = jumpAddress > PC;
                jumpBack = !jumpAhead;

                // SIMPLE LOOP
                var isSimpleLoop = isBranch && jumpBack && (jumpAddress >= startPC);
                var isFunctionCall = isCall;

                stms.add(emitInstruction());

                var delayedSlotInstruction = emitInstruction();

                if (di2.type.isSyscall) {
                    stms.add(this.instructionAst._postBranch(PC));
                    stms.add(ast.raw('if (!state.BRANCHFLAG) {'));
                    returnWithCheck();
                    stms.add(ast.raw('}'));
                    stms.add(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                } else {
                    stms.add(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                    stms.add(this.instructionAst._postBranch(PC));
                    stms.add(ast.raw('if (!state.BRANCHFLAG) {'));
                    returnWithCheck();
                    stms.add(ast.raw('}'));
                }

                if (enableOptimizations) {
                    if (isSimpleLoop) {
                        stms.add(ast.jump(pcToLabel[jumpAddress]));
                        break;
                    } else if (isFunctionCall) {
                        stms.add(ast.call('state.callPC', [ast.pc()]));
                        //stms.add(ast.call('state.callUntilPCReaches', [ast.ra()]));
                        // no break
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            } else {
                if (di.type.isSyscall) {
                    stms.add(this.instructionAst._storePC(PC + 4));
                }
                stms.add(emitInstruction());
                if (di.type.isBreak) {
                    stms.add(this.instructionAst._storePC(PC));

                    break;
                }
            }
        }

        returnWithCheck();

        if (mustDumpFunction) {
            console.debug(sprintf("// function_%08X:\n%s", address, stms.toJs()));
        }

        if (n >= 100000)
            throw (new Error(sprintf("Too large function PC=%08X", address)));

        return new Function('state', stms.toJs());
    };
    return FunctionGenerator;
})();
exports.FunctionGenerator = FunctionGenerator;
//# sourceMappingURL=generator.js.map
},
"src/core/cpu/icache": function(module, exports, require) {
var generator = require('./generator');
var state = require('./state');

var FunctionGenerator = generator.FunctionGenerator;
var CpuSpecialAddresses = state.CpuSpecialAddresses;

var InstructionCache = (function () {
    function InstructionCache(memory) {
        this.memory = memory;
        this.cache = {};
        this.functionGenerator = new FunctionGenerator(memory);
    }
    InstructionCache.prototype.invalidateAll = function () {
        this.cache = {};
    };

    InstructionCache.prototype.invalidateRange = function (from, to) {
        for (var n = from; n < to; n += 4)
            delete this.cache[n];
    };

    InstructionCache.prototype.getFunction = function (address) {
        var item = this.cache[address];
        if (item)
            return item;

        if (address == 268435455 /* EXIT_THREAD */) {
            return this.cache[address] = function (state) {
                //console.log(state);
                //console.log(state.thread);
                //console.warn('Thread: CpuSpecialAddresses.EXIT_THREAD: ' + state.thread.name);
                state.thread.stop();
                throw (new CpuBreakException());
            };
        } else {
            return this.cache[address] = this.functionGenerator.create(address);
        }
    };
    return InstructionCache;
})();
exports.InstructionCache = InstructionCache;
//# sourceMappingURL=icache.js.map
},
"src/core/cpu/instructions": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
var IndentStringGenerator = require('../../util/IndentStringGenerator');

var ADDR_TYPE_NONE = 0;
var ADDR_TYPE_REG = 1;
var ADDR_TYPE_16 = 2;
var ADDR_TYPE_26 = 3;
var INSTR_TYPE_PSP = (1 << 0);
var INSTR_TYPE_SYSCALL = (1 << 1);
var INSTR_TYPE_B = (1 << 2);
var INSTR_TYPE_LIKELY = (1 << 3);
var INSTR_TYPE_JAL = (1 << 4);
var INSTR_TYPE_JUMP = (1 << 5);
var INSTR_TYPE_BREAK = (1 << 6);

function VM(format) {
    var counts = {
        "cstw": 1, "cstz": 1, "csty": 1, "cstx": 1,
        "absw": 1, "absz": 1, "absy": 1, "absx": 1,
        "mskw": 1, "mskz": 1, "msky": 1, "mskx": 1,
        "negw": 1, "negz": 1, "negy": 1, "negx": 1,
        "one": 1, "two": 1, "vt1": 1,
        "vt2": 2,
        "satw": 2, "satz": 2, "saty": 2, "satx": 2,
        "swzw": 2, "swzz": 2, "swzy": 2, "swzx": 2,
        "imm3": 3,
        "imm4": 4,
        "fcond": 4,
        "c0dr": 5, "c0cr": 5, "c1dr": 5, "c1cr": 5, "imm5": 5, "vt5": 5,
        "rs": 5, "rd": 5, "rt": 5, "sa": 5, "lsb": 5, "msb": 5, "fs": 5, "fd": 5, "ft": 5,
        "vs": 7, "vt": 7, "vd": 7, "imm7": 7,
        "imm8": 8,
        "imm14": 14,
        "imm16": 16,
        "imm20": 20,
        "imm26": 26
    };

    var value = 0;
    var mask = 0;

    format.split(':').forEach(function (item) {
        // normal chunk
        if (/^[01\-]+$/.test(item)) {
            for (var n = 0; n < item.length; n++) {
                value <<= 1;
                mask <<= 1;
                if (item[n] == '0') {
                    value |= 0;
                    mask |= 1;
                }
                if (item[n] == '1') {
                    value |= 1;
                    mask |= 1;
                }
                if (item[n] == '-') {
                    value |= 0;
                    mask |= 0;
                }
            }
        } else {
            var displacement = counts[item];
            if (displacement === undefined)
                throw ("Invalid item '" + item + "'");
            value <<= displacement;
            mask <<= displacement;
        }
    });

    return { value: value, mask: mask };
}

var InstructionType = (function () {
    function InstructionType(name, vm, format, addressType, instructionType) {
        this.name = name;
        this.vm = vm;
        this.format = format;
        this.addressType = addressType;
        this.instructionType = instructionType;
    }
    InstructionType.prototype.match = function (i32) {
        //printf("%08X | %08X | %08X", i32, this.vm.value, this.vm.mask);
        return (i32 & this.vm.mask) == (this.vm.value & this.vm.mask);
    };

    InstructionType.prototype.isInstructionType = function (mask) {
        return (this.instructionType & mask) != 0;
    };

    Object.defineProperty(InstructionType.prototype, "isSyscall", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_SYSCALL);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isBreak", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_BREAK);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isBranch", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_B);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isCall", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_JAL);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isJump", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_JAL) || this.isInstructionType(INSTR_TYPE_JUMP);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isJumpOrBranch", {
        get: function () {
            return this.isBranch || this.isJump;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(InstructionType.prototype, "isLikely", {
        get: function () {
            return this.isInstructionType(INSTR_TYPE_LIKELY);
        },
        enumerable: true,
        configurable: true
    });

    InstructionType.prototype.toString = function () {
        return sprintf("InstructionType('%s', %08X, %08X)", this.name, this.vm.value, this.vm.mask);
    };
    return InstructionType;
})();
exports.InstructionType = InstructionType;

var Instructions = (function () {
    function Instructions() {
        var _this = this;
        this.instructionTypeListByName = {};
        this.instructionTypeList = [];
        var ID = function (name, vm, format, addressType, instructionType) {
            _this.add(name, vm, format, addressType, instructionType);
        };

        // Arithmetic operations.
        ID("add", VM("000000:rs:rt:rd:00000:100000"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("addu", VM("000000:rs:rt:rd:00000:100001"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("addi", VM("001000:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
        ID("addiu", VM("001001:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
        ID("sub", VM("000000:rs:rt:rd:00000:100010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("subu", VM("000000:rs:rt:rd:00000:100011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);

        // Logical Operations.
        ID("and", VM("000000:rs:rt:rd:00000:100100"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("andi", VM("001100:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
        ID("nor", VM("000000:rs:rt:rd:00000:100111"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("or", VM("000000:rs:rt:rd:00000:100101"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("ori", VM("001101:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
        ID("xor", VM("000000:rs:rt:rd:00000:100110"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("xori", VM("001110:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);

        // Shift Left/Right Logical/Arithmethic (Variable).
        ID("sll", VM("000000:00000:rt:rd:sa:000000"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
        ID("sllv", VM("000000:rs:rt:rd:00000:000100"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
        ID("sra", VM("000000:00000:rt:rd:sa:000011"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
        ID("srav", VM("000000:rs:rt:rd:00000:000111"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
        ID("srl", VM("000000:00000:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
        ID("srlv", VM("000000:rs:rt:rd:00000:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
        ID("rotr", VM("000000:00001:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
        ID("rotrv", VM("000000:rs:rt:rd:00001:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);

        // Set Less Than (Immediate) (Unsigned).
        ID("slt", VM("000000:rs:rt:rd:00000:101010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("slti", VM("001010:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
        ID("sltu", VM("000000:rs:rt:rd:00000:101011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
        ID("sltiu", VM("001011:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);

        // Load Upper Immediate.
        ID("lui", VM("001111:00000:rt:imm16"), "%t, %I", ADDR_TYPE_NONE, 0);

        // Sign Extend Byte/Half word.
        ID("seb", VM("011111:00000:rt:rd:10000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);
        ID("seh", VM("011111:00000:rt:rd:11000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);

        // BIT REVerse.
        ID("bitrev", VM("011111:00000:rt:rd:10100:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // MAXimum/MINimum.
        ID("max", VM("000000:rs:rt:rd:00000:101100"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("min", VM("000000:rs:rt:rd:00000:101101"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // DIVide (Unsigned).
        ID("div", VM("000000:rs:rt:00000:00000:011010"), "%s, %t", ADDR_TYPE_NONE, 0);
        ID("divu", VM("000000:rs:rt:00000:00000:011011"), "%s, %t", ADDR_TYPE_NONE, 0);

        // MULTiply (Unsigned).
        ID("mult", VM("000000:rs:rt:00000:00000:011000"), "%s, %t", ADDR_TYPE_NONE, 0);
        ID("multu", VM("000000:rs:rt:00000:00000:011001"), "%s, %t", ADDR_TYPE_NONE, 0);

        // Multiply ADD/SUBstract (Unsigned).
        ID("madd", VM("000000:rs:rt:00000:00000:011100"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("maddu", VM("000000:rs:rt:00000:00000:011101"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("msub", VM("000000:rs:rt:00000:00000:101110"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("msubu", VM("000000:rs:rt:00000:00000:101111"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Move To/From HI/LO.
        ID("mfhi", VM("000000:00000:00000:rd:00000:010000"), "%d", ADDR_TYPE_NONE, 0);
        ID("mflo", VM("000000:00000:00000:rd:00000:010010"), "%d", ADDR_TYPE_NONE, 0);
        ID("mthi", VM("000000:rs:00000:00000:00000:010001"), "%s", ADDR_TYPE_NONE, 0);
        ID("mtlo", VM("000000:rs:00000:00000:00000:010011"), "%s", ADDR_TYPE_NONE, 0);

        // Move if Zero/Non zero.
        ID("movz", VM("000000:rs:rt:rd:00000:001010"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("movn", VM("000000:rs:rt:rd:00000:001011"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // EXTract/INSert.
        ID("ext", VM("011111:rs:rt:msb:lsb:000000"), "%t, %s, %a, %ne", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("ins", VM("011111:rs:rt:msb:lsb:000100"), "%t, %s, %a, %ni", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Count Leading Ones/Zeros in word.
        ID("clz", VM("000000:rs:00000:rd:00000:010110"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("clo", VM("000000:rs:00000:rd:00000:010111"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Word Swap Bytes Within Halfwords/Words.
        ID("wsbh", VM("011111:00000:rt:rd:00010:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("wsbw", VM("011111:00000:rt:rd:00011:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Branch Equal (Likely).
        ID("beq", VM("000100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("beql", VM("010100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

        // Branch on Greater Equal Zero (And Link) (Likely).
        ID("bgez", VM("000001:rs:00001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bgezl", VM("000001:rs:00011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
        ID("bgezal", VM("000001:rs:10001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
        ID("bgezall", VM("000001:rs:10011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

        // Branch on Less Than Zero (And Link) (Likely).
        ID("bltz", VM("000001:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bltzl", VM("000001:rs:00010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
        ID("bltzal", VM("000001:rs:10000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
        ID("bltzall", VM("000001:rs:10010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

        // Branch on Less Or Equals than Zero (Likely).
        ID("blez", VM("000110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("blezl", VM("010110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

        // Branch on Great Than Zero (Likely).
        ID("bgtz", VM("000111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bgtzl", VM("010111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

        // Branch on Not Equals (Likely).
        ID("bne", VM("000101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bnel", VM("010101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

        // Jump (And Link) (Register).
        ID("j", VM("000010:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JUMP);
        ID("jr", VM("000000:rs:00000:00000:00000:001000"), "%J", ADDR_TYPE_REG, INSTR_TYPE_JUMP);
        ID("jalr", VM("000000:rs:00000:rd:00000:001001"), "%J, %d", ADDR_TYPE_REG, INSTR_TYPE_JAL);
        ID("jal", VM("000011:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JAL);

        // Branch on C1 False/True (Likely).
        ID("bc1f", VM("010001:01000:00000:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bc1t", VM("010001:01000:00001:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
        ID("bc1fl", VM("010001:01000:00010:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
        ID("bc1tl", VM("010001:01000:00011:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

        ID("lb", VM("100000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lh", VM("100001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lw", VM("100011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lwl", VM("100010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lwr", VM("100110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lbu", VM("100100:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("lhu", VM("100101:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

        // Store Byte/Half word/Word (Left/Right).
        ID("sb", VM("101000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("sh", VM("101001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("sw", VM("101011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("swl", VM("101010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("swr", VM("101110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

        // Load Linked word.
        // Store Conditional word.
        ID("ll", VM("110000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);
        ID("sc", VM("111000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);

        // Load Word to Cop1 floating point.
        // Store Word from Cop1 floating point.
        ID("lwc1", VM("110001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);
        ID("swc1", VM("111001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);

        // Binary Floating Point Unit Operations
        ID("add.s", VM("010001:10000:ft:fs:fd:000000"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
        ID("sub.s", VM("010001:10000:ft:fs:fd:000001"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
        ID("mul.s", VM("010001:10000:ft:fs:fd:000010"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
        ID("div.s", VM("010001:10000:ft:fs:fd:000011"), "%D, %S, %T", ADDR_TYPE_NONE, 0);

        // Unary Floating Point Unit Operations
        ID("sqrt.s", VM("010001:10000:00000:fs:fd:000100"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("abs.s", VM("010001:10000:00000:fs:fd:000101"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("mov.s", VM("010001:10000:00000:fs:fd:000110"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("neg.s", VM("010001:10000:00000:fs:fd:000111"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("round.w.s", VM("010001:10000:00000:fs:fd:001100"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("trunc.w.s", VM("010001:10000:00000:fs:fd:001101"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("ceil.w.s", VM("010001:10000:00000:fs:fd:001110"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("floor.w.s", VM("010001:10000:00000:fs:fd:001111"), "%D, %S", ADDR_TYPE_NONE, 0);

        // Convert
        ID("cvt.s.w", VM("010001:10100:00000:fs:fd:100000"), "%D, %S", ADDR_TYPE_NONE, 0);
        ID("cvt.w.s", VM("010001:10000:00000:fs:fd:100100"), "%D, %S", ADDR_TYPE_NONE, 0);

        // Move float point registers
        ID("mfc1", VM("010001:00000:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);
        ID("mtc1", VM("010001:00100:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);

        // CFC1 -- move Control word from/to floating point (C1)
        ID("cfc1", VM("010001:00010:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);
        ID("ctc1", VM("010001:00110:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);

        // Compare <condition> Single.
        ID("c.f.s", VM("010001:10000:ft:fs:00000:11:0000"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.un.s", VM("010001:10000:ft:fs:00000:11:0001"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.eq.s", VM("010001:10000:ft:fs:00000:11:0010"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ueq.s", VM("010001:10000:ft:fs:00000:11:0011"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.olt.s", VM("010001:10000:ft:fs:00000:11:0100"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ult.s", VM("010001:10000:ft:fs:00000:11:0101"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ole.s", VM("010001:10000:ft:fs:00000:11:0110"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ule.s", VM("010001:10000:ft:fs:00000:11:0111"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.sf.s", VM("010001:10000:ft:fs:00000:11:1000"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ngle.s", VM("010001:10000:ft:fs:00000:11:1001"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.seq.s", VM("010001:10000:ft:fs:00000:11:1010"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ngl.s", VM("010001:10000:ft:fs:00000:11:1011"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.lt.s", VM("010001:10000:ft:fs:00000:11:1100"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.nge.s", VM("010001:10000:ft:fs:00000:11:1101"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.le.s", VM("010001:10000:ft:fs:00000:11:1110"), "%S, %T", ADDR_TYPE_NONE, 0);
        ID("c.ngt.s", VM("010001:10000:ft:fs:00000:11:1111"), "%S, %T", ADDR_TYPE_NONE, 0);

        // Syscall
        ID("syscall", VM("000000:imm20:001100"), "%C", ADDR_TYPE_NONE, INSTR_TYPE_SYSCALL);

        ID("cache", VM("101111:rs:-----:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);

        //ID("icache_index_invalidate", VM("101111:rs:00100:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("icache_index_unlock", VM("101111:rs:00110:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("icache_hit_invalidate", VM("101111:rs:01000:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("icache_fill", VM("101111:rs:01010:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("icache_fill_with_lock", VM("101111:rs:01011:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //
        //ID("dcache_index_writeback_invalidate", VM("101111:rs:10100:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_index_unlock", VM("101111:rs:10110:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_create_dirty_exclusive", VM("101111:rs:11000:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_hit_invalidate", VM("101111:rs:11001:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_hit_writeback", VM("101111:rs:11010:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_hit_writeback_invalidate", VM("101111:rs:11011:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_create_dirty_exclusive_with_lock", VM("101111:rs:11100:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_fill", VM("101111:rs:11110:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        //ID("dcache_fill_with_lock", VM("101111:rs:11111:imm16"), "%k, %o", ADDR_TYPE_NONE, 0);
        ID("sync", VM("000000:00000:00000:00000:00000:001111"), "", ADDR_TYPE_NONE, 0);

        ID("break", VM("000000:imm20:001101"), "%c", ADDR_TYPE_NONE, INSTR_TYPE_BREAK);
        ID("dbreak", VM("011100:00000:00000:00000:00000:111111"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP | INSTR_TYPE_BREAK);
        ID("halt", VM("011100:00000:00000:00000:00000:000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // (D?/Exception) RETurn
        ID("dret", VM("011100:00000:00000:00000:00000:111110"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("eret", VM("010000:10000:00000:00000:00000:011000"), "", ADDR_TYPE_NONE, 0);

        // Move (From/To) IC
        ID("mfic", VM("011100:rt:00000:00000:00000:100100"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("mtic", VM("011100:rt:00000:00000:00000:100110"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Move (From/To) DR
        ID("mfdr", VM("011100:00000:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("mtdr", VM("011100:00100:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // C? (From/To) Cop0
        ID("cfc0", VM("010000:00010:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CFC0(010000:00010:rt:c0cr:00000:000000)
        ID("ctc0", VM("010000:00110:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CTC0(010000:00110:rt:c0cr:00000:000000)

        // Move (From/To) Cop0
        ID("mfc0", VM("010000:00000:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MFC0(010000:00000:rt:c0dr:00000:000000)
        ID("mtc0", VM("010000:00100:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MTC0(010000:00100:rt:c0dr:00000:000000)

        // Move From/to Vfpu (C?).
        ID("mfv", VM("010010:00:011:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("mfvc", VM("010010:00:011:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("mtv", VM("010010:00:111:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("mtvc", VM("010010:00:111:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Load/Store Vfpu (Left/Right).
        ID("lv.s", VM("110010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("lv.q", VM("110110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("lvl.q", VM("110101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("lvr.q", VM("110101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("sv.q", VM("111110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu DOT product
        // Vfpu SCaLe/ROTate
        ID("vdot", VM("011001:001:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vscl", VM("011001:010:vt:two:vs:one:vd"), "%zp, %yp, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsge", VM("011011:110:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        //ID("vslt",        VM("011011:100:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vslt", VM("011011:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // FIXED 2013-07-14

        // ROTate
        ID("vrot", VM("111100:111:01:imm5:two:vs:one:vd"), "%zp, %ys, %vr", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu ZERO/ONE
        ID("vzero", VM("110100:00:000:0:0110:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vone", VM("110100:00:000:0:0111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu MOVe/SiGN/Reverse SQuare root/COSine/Arc SINe/LOG2
        ID("vmov", VM("110100:00:000:0:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vabs", VM("110100:00:000:0:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vneg", VM("110100:00:000:0:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vocp", VM("110100:00:010:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsgn", VM("110100:00:010:0:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrcp", VM("110100:00:000:1:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrsq", VM("110100:00:000:1:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsin", VM("110100:00:000:1:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vcos", VM("110100:00:000:1:0011:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vexp2", VM("110100:00:000:1:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vlog2", VM("110100:00:000:1:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsqrt", VM("110100:00:000:1:0110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vasin", VM("110100:00:000:1:0111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vnrcp", VM("110100:00:000:1:1000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vnsin", VM("110100:00:000:1:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrexp2", VM("110100:00:000:1:1100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vsat0", VM("110100:00:000:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsat1", VM("110100:00:000:0:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu ConSTant
        ID("vcst", VM("110100:00:011:imm5:two:0000000:one:vd"), "%zp, %vk", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu Matrix MULtiplication
        ID("vmmul", VM("111100:000:vt:two:vs:one:vd"), "%zm, %tym, %xm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // -
        ID("vhdp", VM("011001:100:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vcrs.t", VM("011001:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vcrsp.t", VM("111100:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu Integer to(2) Color
        ID("vi2c", VM("110100:00:001:11:101:two:vs:one:vd"), "%zs, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vi2uc", VM("110100:00:001:11:100:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // -
        ID("vtfm2", VM("111100:001:vt:0:vs:1:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vtfm3", VM("111100:010:vt:1:vs:0:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vtfm4", VM("111100:011:vt:1:vs:1:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vhtfm2", VM("111100:001:vt:0:vs:0:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vhtfm3", VM("111100:010:vt:0:vs:1:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vhtfm4", VM("111100:011:vt:1:vs:0:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vsrt3", VM("110100:00:010:01000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vfad", VM("110100:00:010:00110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu MINimum/MAXium/ADD/SUB/DIV/MUL
        ID("vmin", VM("011011:010:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmax", VM("011011:011:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vadd", VM("011000:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsub", VM("011000:001:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vdiv", VM("011000:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmul", VM("011001:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Vfpu (Matrix) IDenTity
        ID("vidt", VM("110100:00:000:0:0011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmidt", VM("111100:111:00:00011:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("viim", VM("110111:11:0:vd:imm16"), "%xs, %vi", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vmmov", VM("111100:111:00:00000:two:vs:one:vd"), "%zm, %ym", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmzero", VM("111100:111:00:00110:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmone", VM("111100:111:00:00111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vnop", VM("111111:1111111111:00000:00000000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsync", VM("111111:1111111111:00000:01100100000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vflush", VM("111111:1111111111:00000:10000001101"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vpfxd", VM("110111:10:------------:mskw:mskz:msky:mskx:satw:satz:saty:satx"), "[%vp4, %vp5, %vp6, %vp7]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vpfxs", VM("110111:00:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vpfxt", VM("110111:01:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vdet", VM("011001:110:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vrnds", VM("110100:00:001:00:000:two:vs:one:0000000"), "%ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrndi", VM("110100:00:001:00:001:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrndf1", VM("110100:00:001:00:010:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vrndf2", VM("110100:00:001:00:011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vcmp", VM("011011:000:vt:two:vs:one:000:imm4"), "%Zn, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vcmovf", VM("110100:10:101:01:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vcmovt", VM("110100:10:101:00:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vavg", VM("110100:00:010:00111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vf2id", VM("110100:10:011:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vf2in", VM("110100:10:000:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vf2iu", VM("110100:10:010:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vf2iz", VM("110100:10:001:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vi2f", VM("110100:10:100:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vscmp", VM("011011:101:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmscl", VM("111100:100:vt:two:vs:one:vd"), "%zm, %ym, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vt4444.q", VM("110100:00:010:11001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vt5551.q", VM("110100:00:010:11010:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vt5650.q", VM("110100:00:010:11011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vmfvc", VM("110100:00:010:10000:1:imm7:0:vd"), "%zs, %2s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vmtvc", VM("110100:00:010:10001:0:vs:1:imm7"), "%2d, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("mfvme", VM("011010--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);
        ID("mtvme", VM("101100--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);

        ID("sv.s", VM("111010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vfim", VM("110111:11:1:vt:imm16"), "%xs, %vh", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("svl.q", VM("111101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("svr.q", VM("111101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vbfy1", VM("110100:00:010:00010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vbfy2", VM("110100:00:010:00011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vf2h", VM("110100:00:001:10:010:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vh2f", VM("110100:00:001:10:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vi2s", VM("110100:00:001:11:111:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vi2us", VM("110100:00:001:11:110:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vlgb", VM("110100:00:001:10:111:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vqmul", VM("111100:101:vt:1:vs:1:vd"), "%zq, %yq, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vs2i", VM("110100:00:001:11:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        // Working on it.
        //"110100:00:001:11:000:1000000010000001"
        ID("vc2i", VM("110100:00:001:11:001:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vuc2i", VM("110100:00:001:11:000:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vsbn", VM("011000:010:vt:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vsbz", VM("110100:00:001:10110:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsocp", VM("110100:00:010:00101:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsrt1", VM("110100:00:010:00000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsrt2", VM("110100:00:010:00001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vsrt4", VM("110100:00:010:01001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        ID("vus2i", VM("110100:00:001:11010:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        ID("vwbn", VM("110100:11:imm8:two:vs:one:vd"), "%zs, %xs, %I", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

        //ID("vwb.q",       VM("111110------------------------1-"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
        // Branch Vfpu (True/False) (Likely)
        ID("bvf", VM("010010:01:000:imm3:00:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
        ID("bvt", VM("010010:01:000:imm3:01:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
        ID("bvfl", VM("010010:01:000:imm3:10:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
        ID("bvtl", VM("010010:01:000:imm3:11:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
    }
    Object.defineProperty(Instructions, "instance", {
        get: function () {
            if (!Instructions._instance)
                Instructions._instance = new Instructions();
            return Instructions._instance;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instructions.prototype, "instructions", {
        get: function () {
            return this.instructionTypeList.slice(0);
        },
        enumerable: true,
        configurable: true
    });

    Instructions.prototype.add = function (name, vm, format, addressType, instructionType) {
        var it = new InstructionType(name, vm, format, addressType, instructionType);
        this.instructionTypeListByName[name] = it;
        this.instructionTypeList.push(it);
    };

    Instructions.prototype.findByName = function (name) {
        var instructionType = this.instructionTypeListByName[name];
        if (!instructionType)
            throw ("Cannot find instruction " + sprintf("%s", name));
        return instructionType;
    };

    Instructions.prototype.findByData = function (i32, pc) {
        if (typeof pc === "undefined") { pc = 0; }
        //return this.slowFindByData(i32, pc);
        return this.fastFindByData(i32, pc);
    };

    Instructions.prototype.fastFindByData = function (i32, pc) {
        if (typeof pc === "undefined") { pc = 0; }
        if (!this.decoder) {
            var switchCode = DecodingTable.createSwitch(this.instructionTypeList);
            this.decoder = (new Function('instructionsByName', 'value', 'pc', switchCode));
        }
        return this.decoder(this.instructionTypeListByName, i32, pc);
        /*
        try {
        } catch (e) {
        console.log(this.decoder);
        console.log(this.instructionTypeListByName);
        console.log(this.instructionTypeList);
        throw (e);
        }
        */
    };

    Instructions.prototype.slowFindByData = function (i32, pc) {
        if (typeof pc === "undefined") { pc = 0; }
        for (var n = 0; n < this.instructionTypeList.length; n++) {
            var instructionType = this.instructionTypeList[n];
            if (instructionType.match(i32))
                return instructionType;
        }
        throw (sprintf("Cannot find instruction 0x%08X at 0x%08X", i32, pc));
    };
    return Instructions;
})();
exports.Instructions = Instructions;

var DecodingTable = (function () {
    function DecodingTable() {
        this.lastId = 0;
    }
    DecodingTable.prototype.getCommonMask = function (instructions, baseMask) {
        if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
        return instructions.reduce(function (left, item) {
            return left & item.vm.mask;
        }, baseMask);
    };

    DecodingTable.createSwitch = function (instructions) {
        var writer = new IndentStringGenerator();
        var decodingTable = new DecodingTable();
        decodingTable._createSwitch(writer, instructions);
        return writer.output;
    };

    DecodingTable.prototype._createSwitch = function (writer, instructions, baseMask, level) {
        var _this = this;
        if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
        if (typeof level === "undefined") { level = 0; }
        if (level >= 10)
            throw ('ERROR: Recursive detection');
        var commonMask = this.getCommonMask(instructions, baseMask);
        var groups = {};
        instructions.forEach(function (item) {
            var commonValue = item.vm.value & commonMask;
            if (!groups[commonValue])
                groups[commonValue] = [];
            groups[commonValue].push(item);
        });

        writer.write('switch ((value & ' + sprintf('0x%08X', commonMask) + ') >>> 0) {\n');
        writer.indent(function () {
            for (var groupKey in groups) {
                var group = groups[groupKey];
                writer.write('case ' + sprintf('0x%08X', groupKey) + ':');
                writer.indent(function () {
                    if (group.length == 1) {
                        writer.write(' return instructionsByName[' + JSON.stringify(group[0].name) + '];');
                    } else {
                        writer.write('\n');
                        _this._createSwitch(writer, group, ~commonMask, level + 1);
                        writer.write('break;\n');
                    }
                });
            }
            writer.write('default: throw(sprintf("Invalid instruction 0x%08X at 0x%08X (' + _this.lastId++ + ') failed mask 0x%08X", value, pc, ' + commonMask + '));\n');
        });
        writer.write('}\n');
    };
    return DecodingTable;
})();

var Instruction = (function () {
    function Instruction(PC, data) {
        this.PC = PC;
        this.data = data;
    }
    Instruction.fromMemoryAndPC = function (memory, PC) {
        return new Instruction(PC, memory.readInt32(PC));
    };

    Instruction.prototype.extract = function (offset, length) {
        return BitUtils.extract(this.data, offset, length);
    };
    Instruction.prototype.extract_s = function (offset, length) {
        return BitUtils.extractSigned(this.data, offset, length);
    };
    Instruction.prototype.insert = function (offset, length, value) {
        this.data = BitUtils.insert(this.data, offset, length, value);
    };

    Object.defineProperty(Instruction.prototype, "rd", {
        get: function () {
            return this.extract(11 + 5 * 0, 5);
        },
        set: function (value) {
            this.insert(11 + 5 * 0, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "rt", {
        get: function () {
            return this.extract(11 + 5 * 1, 5);
        },
        set: function (value) {
            this.insert(11 + 5 * 1, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "rs", {
        get: function () {
            return this.extract(11 + 5 * 2, 5);
        },
        set: function (value) {
            this.insert(11 + 5 * 2, 5, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "fd", {
        get: function () {
            return this.extract(6 + 5 * 0, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 0, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "fs", {
        get: function () {
            return this.extract(6 + 5 * 1, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 1, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "ft", {
        get: function () {
            return this.extract(6 + 5 * 2, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 2, 5, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "VD", {
        get: function () {
            return this.extract(0, 7);
        },
        set: function (value) {
            this.insert(0, 7, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VS", {
        get: function () {
            return this.extract(8, 7);
        },
        set: function (value) {
            this.insert(8, 7, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT", {
        get: function () {
            return this.extract(16, 7);
        },
        set: function (value) {
            this.insert(16, 7, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT5_1", {
        get: function () {
            return this.VT5 | (this.VT1 << 5);
        },
        set: function (value) {
            this.VT5 = value;
            this.VT1 = (value >>> 5);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "IMM14", {
        // @TODO: Signed or unsigned?
        get: function () {
            return this.extract_s(2, 14);
        },
        set: function (value) {
            this.insert(2, 14, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "IMM8", {
        get: function () {
            return this.extract(16, 8);
        },
        set: function (value) {
            this.insert(16, 8, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "IMM5", {
        get: function () {
            return this.extract(16, 5);
        },
        set: function (value) {
            this.insert(16, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "IMM3", {
        get: function () {
            return this.extract(16, 3);
        },
        set: function (value) {
            this.insert(16, 3, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "IMM7", {
        get: function () {
            return this.extract(0, 7);
        },
        set: function (value) {
            this.insert(0, 7, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "IMM4", {
        get: function () {
            return this.extract(0, 4);
        },
        set: function (value) {
            this.insert(0, 4, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT1", {
        get: function () {
            return this.extract(0, 1);
        },
        set: function (value) {
            this.insert(0, 1, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT2", {
        get: function () {
            return this.extract(0, 2);
        },
        set: function (value) {
            this.insert(0, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT5", {
        get: function () {
            return this.extract(16, 5);
        },
        set: function (value) {
            this.insert(16, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "VT5_2", {
        get: function () {
            return this.VT5 | (this.VT2 << 5);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "IMM_HF", {
        get: function () {
            return HalfFloat.toFloat(this.imm16);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "pos", {
        get: function () {
            return this.lsb;
        },
        set: function (value) {
            this.lsb = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "size_e", {
        get: function () {
            return this.msb + 1;
        },
        set: function (value) {
            this.msb = value - 1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "size_i", {
        get: function () {
            return this.msb - this.lsb + 1;
        },
        set: function (value) {
            this.msb = this.lsb + value - 1;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "lsb", {
        get: function () {
            return this.extract(6 + 5 * 0, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 0, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "msb", {
        get: function () {
            return this.extract(6 + 5 * 1, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 1, 5, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "c1cr", {
        get: function () {
            return this.extract(6 + 5 * 1, 5);
        },
        set: function (value) {
            this.insert(6 + 5 * 1, 5, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "syscall", {
        get: function () {
            return this.extract(6, 20);
        },
        set: function (value) {
            this.insert(6, 20, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "imm16", {
        get: function () {
            var res = this.u_imm16;
            if (res & 0x8000)
                res |= 0xFFFF0000;
            return res;
        },
        set: function (value) {
            this.insert(0, 16, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "u_imm16", {
        get: function () {
            return this.extract(0, 16);
        },
        set: function (value) {
            this.insert(0, 16, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "u_imm26", {
        get: function () {
            return this.extract(0, 26);
        },
        set: function (value) {
            this.insert(0, 26, value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Instruction.prototype, "jump_bits", {
        get: function () {
            return this.extract(0, 26);
        },
        set: function (value) {
            this.insert(0, 26, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "jump_real", {
        get: function () {
            return (this.jump_bits * 4) >>> 0;
        },
        set: function (value) {
            this.jump_bits = (value / 4) >>> 0;
        },
        enumerable: true,
        configurable: true
    });
    return Instruction;
})();
exports.Instruction = Instruction;

var DecodedInstruction = (function () {
    function DecodedInstruction(instruction, type) {
        this.instruction = instruction;
        this.type = type;
    }
    return DecodedInstruction;
})();
exports.DecodedInstruction = DecodedInstruction;
//# sourceMappingURL=instructions.js.map
},
"src/core/cpu/state": function(module, exports, require) {
///<reference path="../../typings.d.ts" />
(function (CpuSpecialAddresses) {
    CpuSpecialAddresses[CpuSpecialAddresses["EXIT_THREAD"] = 0x0FFFFFFF] = "EXIT_THREAD";
})(exports.CpuSpecialAddresses || (exports.CpuSpecialAddresses = {}));
var CpuSpecialAddresses = exports.CpuSpecialAddresses;

var CpuState = (function () {
    function CpuState(memory, syscallManager) {
        this.memory = memory;
        this.syscallManager = syscallManager;
        this.gpr = new Int32Array(32);
        this.fpr_Buffer = new ArrayBuffer(32 * 4);
        this.fpr = new Float32Array(this.fpr_Buffer);
        this.fpr_i = new Int32Array(this.fpr_Buffer);
        //fpr: Float32Array = new Float32Array(32);
        this.vfpr_Buffer = new ArrayBuffer(128 * 4);
        this.vfpr = new Float32Array(this.vfpr_Buffer);
        this.BRANCHFLAG = false;
        this.BRANCHPC = 0;
        this.PC = 0;
        this.IC = 0;
        this.LO = 0;
        this.HI = 0;
        this.thread = null;
        this.callstack = [];
        this.fcr31_rm = 0;
        this.fcr31_2_21 = 0;
        this.fcr31_25_7 = 0;
        this.fcr31_cc = false;
        this.fcr31_fs = false;
        this.fcr0 = 0x00003351;
        this.fcr0 = 0x00003351;
        this.fcr31 = 0x00000e00;
    }
    CpuState.prototype.vfpuSetMatrix = function (m, values) {
        // @TODO
        this.vfpr[0] = 0;
    };

    CpuState.prototype.preserveRegisters = function (callback) {
        var temp = new CpuState(this.memory, this.syscallManager);
        temp.copyRegistersFrom(this);
        try  {
            callback();
        } finally {
            this.copyRegistersFrom(temp);
        }
    };

    CpuState.prototype.copyRegistersFrom = function (other) {
        var _this = this;
        ['PC', 'IC', 'LO', 'HI'].forEach(function (item) {
            _this[item] = other[item];
        });
        for (var n = 0; n < 32; n++) {
            this.gpr[n] = other.gpr[n];
            this.fpr[n] = other.fpr[n];
        }
    };

    Object.defineProperty(CpuState.prototype, "V0", {
        get: function () {
            return this.gpr[2];
        },
        set: function (value) {
            this.gpr[2] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "V1", {
        get: function () {
            return this.gpr[3];
        },
        set: function (value) {
            this.gpr[3] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "K0", {
        get: function () {
            return this.gpr[26];
        },
        set: function (value) {
            this.gpr[26] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "GP", {
        get: function () {
            return this.gpr[28];
        },
        set: function (value) {
            this.gpr[28] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "SP", {
        get: function () {
            return this.gpr[29];
        },
        set: function (value) {
            this.gpr[29] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "FP", {
        get: function () {
            return this.gpr[30];
        },
        set: function (value) {
            this.gpr[30] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "RA", {
        get: function () {
            return this.gpr[31];
        },
        set: function (value) {
            this.gpr[31] = value;
        },
        enumerable: true,
        configurable: true
    });
    CpuState.prototype.getRA = function () {
        return this.gpr[31];
    };
    CpuState.prototype.setRA = function (value) {
        this.gpr[31] = value;
    };

    CpuState.prototype.callstackPush = function (PC) {
        this.callstack.push(PC);
    };

    CpuState.prototype.callstackPop = function () {
        this.callstack.pop();
    };

    CpuState.prototype.printCallstack = function (symbolLookup) {
        if (typeof symbolLookup === "undefined") { symbolLookup = null; }
        this.getCallstack().forEach(function (PC) {
            var line = sprintf("%08X", PC);
            if (symbolLookup) {
                line += sprintf(' : %s', symbolLookup.getSymbolAt(PC));
            }
            console.log(line);
        });
    };

    CpuState.prototype.getCallstack = function () {
        return this.callstack.slice(0);
    };

    CpuState.prototype.getPointerStream = function (address, size) {
        return this.memory.getPointerStream(address, size);
    };

    Object.defineProperty(CpuState.prototype, "REGS", {
        get: function () {
            return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
        },
        enumerable: true,
        configurable: true
    });

    CpuState.prototype._trace_state = function () {
        console.info(this);
        throw ('_trace_state');
    };

    Object.defineProperty(CpuState.prototype, "fcr31", {
        get: function () {
            var value = 0;
            value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
            value = BitUtils.insert(value, 2, 21, this.fcr31_2_21);
            value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
            value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
            value = BitUtils.insert(value, 25, 7, this.fcr31_25_7);
            return value;
        },
        set: function (value) {
            this.fcr31_rm = BitUtils.extract(value, 0, 2);
            this.fcr31_2_21 = BitUtils.extract(value, 2, 21);
            this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
            this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
            this.fcr31_25_7 = BitUtils.extract(value, 25, 7);
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(CpuState.prototype, "fcr0_rev", {
        get: function () {
            return BitUtils.extract(this.fcr0, 0, 8);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "fcr0_imp", {
        get: function () {
            return BitUtils.extract(this.fcr0, 8, 24);
        },
        enumerable: true,
        configurable: true
    });

    CpuState.prototype._cfc1_impl = function (d, t) {
        switch (d) {
            case 0:
                this.gpr[t] = this.fcr0;
                break;
            case 31:
                this.gpr[t] = this.fcr31;
                break;
            default:
                this.gpr[t] = 0;
                break;
        }
    };

    CpuState.prototype._ctc1_impl = function (d, t) {
        switch (d) {
            case 31:
                this.fcr31 = t;
                break;
        }
    };

    CpuState.prototype._comp_impl = function (s, t, fc_unordererd, fc_equal, fc_less, fc_inv_qnan) {
        if (isNaN(s) || isNaN(t)) {
            this.fcr31_cc = fc_unordererd;
        } else {
            //bool cc = false;
            //if (fc_equal) cc = cc || (s == t);
            //if (fc_less) cc = cc || (s < t);
            //return cc;
            var equal = (fc_equal) && (s == t);
            var less = (fc_less) && (s < t);

            this.fcr31_cc = (less || equal);
        }
    };

    CpuState.prototype._cvt_w_s_impl = function (FS) {
        switch (this.fcr31_rm) {
            case 0:
                return MathFloat.rint(FS);
            case 1:
                return MathFloat.cast(FS);
            case 2:
                return MathFloat.ceil(FS);
            case 3:
                return MathFloat.floor(FS);
        }

        throw ("RM has an invalid value!!");
    };

    CpuState.prototype.cache = function (rs, type, offset) {
        if (DebugOnce('state.cache', 200))
            console.warn(sprintf('cache opcode! %08X+%d, type: %d', rs, offset, type));
    };
    CpuState.prototype.syscall = function (id) {
        this.syscallManager.call(this, id);
    };
    CpuState.prototype.sb = function (value, address) {
        this.memory.writeInt8(address, value);
    };
    CpuState.prototype.sh = function (value, address) {
        this.memory.writeInt16(address, value);
    };
    CpuState.prototype.sw = function (value, address) {
        this.memory.writeInt32(address, value);
    };
    CpuState.prototype.swc1 = function (value, address) {
        this.memory.writeFloat32(address, value);
    };
    CpuState.prototype.lb = function (address) {
        return this.memory.readInt8(address);
    };
    CpuState.prototype.lbu = function (address) {
        return this.memory.readUInt8(address);
    };
    CpuState.prototype.lh = function (address) {
        return this.memory.readInt16(address);
    };
    CpuState.prototype.lhu = function (address) {
        return this.memory.readUInt16(address);
    };
    CpuState.prototype.lw = function (address) {
        return this.memory.readInt32(address);
    };

    CpuState.prototype.min = function (a, b) {
        return ((a | 0) < (b | 0)) ? a : b;
    };
    CpuState.prototype.max = function (a, b) {
        return ((a | 0) > (b | 0)) ? a : b;
    };

    CpuState.prototype.slt = function (a, b) {
        return ((a | 0) < (b | 0)) ? 1 : 0;
    };
    CpuState.prototype.sltu = function (a, b) {
        return ((a >>> 0) < (b >>> 0)) ? 1 : 0;
    };

    CpuState.prototype.lwl = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var Value = this.memory.readInt32(Address & ~3);
        return ((Value << CpuState.LwlShift[AddressAlign]) | (ValueToWrite & CpuState.LwlMask[AddressAlign]));
    };

    CpuState.prototype.lwr = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var Value = this.memory.readInt32(Address & ~3);
        return ((Value >>> CpuState.LwrShift[AddressAlign]) | (ValueToWrite & CpuState.LwrMask[AddressAlign]));
    };

    CpuState.prototype.swl = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var AddressPointer = Address & ~3;
        var WordToWrite = (ValueToWrite >>> CpuState.SwlShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwlMask[AddressAlign]);
        this.memory.writeInt32(AddressPointer, WordToWrite);
    };

    CpuState.prototype.swr = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var AddressPointer = Address & ~3;
        var WordToWrite = (ValueToWrite << CpuState.SwrShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwrMask[AddressAlign]);
        this.memory.writeInt32(AddressPointer, WordToWrite);
    };

    CpuState.prototype.div = function (rs, rt) {
        rs |= 0; // signed
        rt |= 0; // signed
        this.LO = (rs / rt) | 0;
        this.HI = (rs % rt) | 0;
    };

    CpuState.prototype.divu = function (rs, rt) {
        rs >>>= 0; // unsigned
        rt >>>= 0; // unsigned
        this.LO = (rs / rt) | 0;
        this.HI = (rs % rt) | 0;
    };

    CpuState.prototype.mult = function (rs, rt) {
        var result = Math.imul32_64(rs, rt, CpuState._mult_temp);
        this.LO = result[0];
        this.HI = result[1];
    };

    CpuState.prototype.madd = function (rs, rt) {
        var a64 = Integer64.fromInt(rs);
        var b64 = Integer64.fromInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };

    CpuState.prototype.msub = function (rs, rt) {
        var a64 = Integer64.fromInt(rs);
        var b64 = Integer64.fromInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };

    CpuState.prototype.multu = function (rs, rt) {
        var info = Math.umul32_64(rs, rt, CpuState._mult_temp);
        this.LO = info[0];
        this.HI = info[1];
    };

    CpuState.prototype.maddu = function (rs, rt) {
        var a64 = Integer64.fromUnsignedInt(rs);
        var b64 = Integer64.fromUnsignedInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };

    CpuState.prototype.msubu = function (rs, rt) {
        var a64 = Integer64.fromUnsignedInt(rs);
        var b64 = Integer64.fromUnsignedInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };

    CpuState.prototype.callPC = function (pc) {
        this.PC = pc;
        var ra = this.getRA();
        this.executor.executeUntilPCReachesWithoutCall(ra);
    };

    CpuState.prototype.callPCSafe = function (pc) {
        this.PC = pc;
        var ra = this.getRA();
        while (this.PC != ra) {
            try  {
                this.executor.executeUntilPCReachesWithoutCall(ra);
            } catch (e) {
                if (!(e instanceof CpuBreakException)) {
                    console.error(e);
                    console.error(e['stack']);
                    throw (e);
                }
            }
        }
    };

    CpuState.prototype.break = function () {
        throw (new CpuBreakException());
    };
    CpuState.LwrMask = [0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00];
    CpuState.LwrShift = [0, 8, 16, 24];

    CpuState.LwlMask = [0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000];
    CpuState.LwlShift = [24, 16, 8, 0];

    CpuState.SwlMask = [0xFFFFFF00, 0xFFFF0000, 0xFF000000, 0x00000000];
    CpuState.SwlShift = [24, 16, 8, 0];

    CpuState.SwrMask = [0x00000000, 0x000000FF, 0x0000FFFF, 0x00FFFFFF];
    CpuState.SwrShift = [0, 8, 16, 24];

    CpuState._mult_temp = [0, 0];
    return CpuState;
})();
exports.CpuState = CpuState;
//# sourceMappingURL=state.js.map
},
"src/core/cpu/syscall": function(module, exports, require) {
var NativeFunction = (function () {
    function NativeFunction() {
    }
    return NativeFunction;
})();
exports.NativeFunction = NativeFunction;

var SyscallManager = (function () {
    function SyscallManager(context) {
        this.context = context;
        this.calls = {};
        this.lastId = 1;
    }
    SyscallManager.prototype.register = function (nativeFunction) {
        return this.registerWithId(this.lastId++, nativeFunction);
    };

    SyscallManager.prototype.registerWithId = function (id, nativeFunction) {
        this.calls[id] = nativeFunction;
        return id;
    };

    SyscallManager.prototype.call = function (state, id) {
        var nativeFunction = this.calls[id];
        if (!nativeFunction)
            throw (sprintf("Can't call syscall %s: 0x%06X", id));

        //printf('calling syscall 0x%04X : %s', id, nativeFunction.name);
        nativeFunction.call(this.context, state);
    };
    return SyscallManager;
})();
exports.SyscallManager = SyscallManager;
//# sourceMappingURL=syscall.js.map
},
"src/core/display": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var memory = require('./memory');
var pixelformat = require('./pixelformat');
var _interrupt = require('./interrupt');
var Signal = require('../util/Signal');

var PspInterrupts = _interrupt.PspInterrupts;
var Memory = memory.Memory;
var PixelFormat = pixelformat.PixelFormat;
var PixelConverter = pixelformat.PixelConverter;

var BasePspDisplay = (function () {
    function BasePspDisplay() {
        this.address = Memory.DEFAULT_FRAME_ADDRESS;
        this.bufferWidth = 512;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.sync = 1;
    }
    return BasePspDisplay;
})();
exports.BasePspDisplay = BasePspDisplay;

var DummyPspDisplay = (function (_super) {
    __extends(DummyPspDisplay, _super);
    function DummyPspDisplay() {
        _super.call(this);
        this.vblankCount = 0;
        this.hcountTotal = 0;
        this.secondsLeftForVblank = 0.1;
        this.secondsLeftForVblankStart = 0.1;
        this.vblank = new Signal();
    }
    DummyPspDisplay.prototype.updateTime = function () {
    };

    DummyPspDisplay.prototype.waitVblankAsync = function (waiter) {
        return waiter.delayMicrosecondsAsync(20000);
    };

    DummyPspDisplay.prototype.waitVblankStartAsync = function (waiter) {
        return waiter.delayMicrosecondsAsync(20000);
    };

    DummyPspDisplay.prototype.setEnabledDisplay = function (enable) {
    };

    DummyPspDisplay.prototype.startAsync = function () {
        return Promise.resolve();
    };

    DummyPspDisplay.prototype.stopAsync = function () {
        return Promise.resolve();
    };
    return DummyPspDisplay;
})(BasePspDisplay);
exports.DummyPspDisplay = DummyPspDisplay;

var PspDisplay = (function (_super) {
    __extends(PspDisplay, _super);
    function PspDisplay(memory, interruptManager, canvas, webglcanvas) {
        _super.call(this);
        this.memory = memory;
        this.interruptManager = interruptManager;
        this.canvas = canvas;
        this.webglcanvas = webglcanvas;
        this.vblank = new Signal();
        this.interval = -1;
        this.enabled = true;
        this._hcount = 0;
        this.hcountTotal = 0;
        this.hcountCurrent = 0;
        this.vblankCount = 0;
        this.isInVblank = false;
        this.rowsLeftForVblank = 0;
        this.secondsLeftForVblank = 0;
        this.rowsLeftForVblankStart = 0;
        this.secondsLeftForVblankStart = 0;
        this.mustWaitVBlank = true;
        this.lastTimeVblank = 0;
        this.context = this.canvas.getContext('2d');
        this.imageData = this.context.createImageData(512, 272);
        this.setEnabledDisplay(true);
    }
    PspDisplay.prototype.getCurrentMs = function () {
        return performance.now();
    };

    PspDisplay.prototype.updateTime = function () {
        this.currentMs = this.getCurrentMs();
        this.elapsedSeconds = (this.currentMs - this.startTime) / 1000;
        this.hcountTotal = (this.elapsedSeconds * PspDisplay.HORIZONTAL_SYNC_HZ) | 0;
        this.hcountCurrent = (((this.elapsedSeconds % 1.00002) * PspDisplay.HORIZONTAL_SYNC_HZ) | 0) % PspDisplay.NUMBER_OF_ROWS;
        this.vblankCount = (this.elapsedSeconds * PspDisplay.VERTICAL_SYNC_HZ) | 0;

        //console.log(this.elapsedSeconds);
        if (this.hcountCurrent >= PspDisplay.VSYNC_ROW) {
            this.isInVblank = true;
            this.rowsLeftForVblank = 0;
            this.rowsLeftForVblankStart = (PspDisplay.NUMBER_OF_ROWS - this.hcountCurrent) + PspDisplay.VSYNC_ROW;
        } else {
            this.isInVblank = false;
            this.rowsLeftForVblank = PspDisplay.VSYNC_ROW - this.hcountCurrent;
            this.rowsLeftForVblankStart = this.rowsLeftForVblank;
        }
        this.secondsLeftForVblank = this.rowsLeftForVblank * PspDisplay.HORIZONTAL_SECONDS;
        this.secondsLeftForVblankStart = this.rowsLeftForVblankStart * PspDisplay.HORIZONTAL_SECONDS;
    };

    PspDisplay.prototype.update = function () {
        if (!this.context || !this.imageData)
            return;
        if (!this.enabled)
            return;

        var count = 512 * 272;
        var imageData = this.imageData;
        var w8 = imageData.data;
        var baseAddress = this.address & 0x0FFFFFFF;

        PixelConverter.decode(this.pixelFormat, this.memory.buffer, baseAddress, w8, 0, count, false);
        this.context.putImageData(imageData, 0, 0);
    };

    PspDisplay.prototype.setEnabledDisplay = function (enable) {
        this.enabled = enable;
        this.canvas.style.display = enable ? 'block' : 'none';
        this.webglcanvas.style.display = !enable ? 'block' : 'none';
    };

    PspDisplay.prototype.startAsync = function () {
        var _this = this;
        this.startTime = this.getCurrentMs();
        this.updateTime();

        //$(this.canvas).focus();
        this.interval = setInterval(function () {
            _this.updateTime();
            _this.vblankCount++;
            _this.update();
            _this.vblank.dispatch(_this.vblankCount);
            _this.interruptManager.interrupt(30 /* PSP_VBLANK_INT */);
        }, 1000 / PspDisplay.VERTICAL_SYNC_HZ);
        return Promise.resolve();
    };

    PspDisplay.prototype.stopAsync = function () {
        clearInterval(this.interval);
        this.interval = -1;
        return Promise.resolve();
    };

    //mustWaitVBlank = false;
    PspDisplay.prototype.checkVblankThrottle = function () {
        var currentTime = performance.now();
        if ((currentTime - this.lastTimeVblank) >= (PspDisplay.VERTICAL_SECONDS * 1000)) {
            this.lastTimeVblank = currentTime;
            return true;
        }
        return false;
    };

    PspDisplay.prototype.waitVblankAsync = function (waiter) {
        this.updateTime();
        if (!this.mustWaitVBlank)
            return Promise.resolve(0);
        if (this.checkVblankThrottle())
            return Promise.resolve(0);
        return waiter.delayMicrosecondsAsync(this.secondsLeftForVblank * 1000000);
    };

    PspDisplay.prototype.waitVblankStartAsync = function (waiter) {
        this.updateTime();
        if (!this.mustWaitVBlank)
            return Promise.resolve(0);
        if (this.checkVblankThrottle())
            return Promise.resolve(0);
        return waiter.delayMicrosecondsAsync(this.secondsLeftForVblankStart * 1000000);
    };
    PspDisplay.PROCESSED_PIXELS_PER_SECOND = 9000000;
    PspDisplay.CYCLES_PER_PIXEL = 1;
    PspDisplay.PIXELS_IN_A_ROW = 525;

    PspDisplay.VSYNC_ROW = 272;

    PspDisplay.NUMBER_OF_ROWS = 286;
    PspDisplay.HCOUNT_PER_VBLANK = 285.72;

    PspDisplay.HORIZONTAL_SYNC_HZ = (PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL) / PspDisplay.PIXELS_IN_A_ROW;
    PspDisplay.HORIZONTAL_SECONDS = 1 / PspDisplay.HORIZONTAL_SYNC_HZ;

    PspDisplay.VERTICAL_SYNC_HZ = PspDisplay.HORIZONTAL_SYNC_HZ / PspDisplay.HCOUNT_PER_VBLANK;
    PspDisplay.VERTICAL_SECONDS = 1 / PspDisplay.VERTICAL_SYNC_HZ;
    return PspDisplay;
})(BasePspDisplay);
exports.PspDisplay = PspDisplay;
//# sourceMappingURL=display.js.map
},
"src/core/gpu": function(module, exports, require) {
var _gpu = require('./gpu/gpu');
_gpu.PspGpu;
var _state = require('./gpu/state');
_state.AlphaTest;

var PspGpuCallback = _gpu.PspGpuCallback;
exports.PspGpuCallback = PspGpuCallback;
_gpu.PspGpuCallback;
var PspGpu = _gpu.PspGpu;
exports.PspGpu = PspGpu;
var SyncType = _state.SyncType;
exports.SyncType = SyncType;
var DisplayListStatus = _state.DisplayListStatus;
exports.DisplayListStatus = DisplayListStatus;
//# sourceMappingURL=gpu.js.map
},
"src/core/gpu/driver": function(module, exports, require) {
//# sourceMappingURL=driver.js.map
},
"src/core/gpu/gpu": function(module, exports, require) {
var _instructions = require('./instructions');
var _state = require('./state');

var _cpu = require('../cpu');
_cpu.CpuState;
var _IndentStringGenerator = require('../../util/IndentStringGenerator');

var DisplayListStatus = _state.DisplayListStatus;
var CpuState = _cpu.CpuState;

var ColorEnum = _state.ColorEnum;
var GpuOpCodes = _instructions.GpuOpCodes;
var WebGlPspDrawDriver = require('./webgl/driver');

var VertexBuffer = (function () {
    function VertexBuffer() {
        this.vertices = [];
        for (var n = 0; n < 32768; n++)
            this.vertices[n] = new _state.Vertex();
    }
    return VertexBuffer;
})();

var VertexReaderFactory = (function () {
    function VertexReaderFactory() {
    }
    VertexReaderFactory.get = function (vertexState) {
        var cacheId = vertexState.hash;
        var vertexReader = this.cache[cacheId];
        if (vertexReader === undefined)
            vertexReader = this.cache[cacheId] = new VertexReader(vertexState);
        return vertexReader;
    };
    VertexReaderFactory.cache = {};
    return VertexReaderFactory;
})();
exports.VertexReaderFactory = VertexReaderFactory;

var VertexReader = (function () {
    function VertexReader(vertexState) {
        this.vertexState = vertexState;
        this.readOffset = 0;
        this.readCode = this.createJs();
        this.readOneFunc = (new Function('output', 'inputOffset', 'input', 'f32', 's8', 's16', 's32', this.readCode));
    }
    VertexReader.prototype.readOne = function (input, index) {
        var s8 = new Int8Array(input.buffer, input.byteOffset, input.byteLength);
        var s16 = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2);
        var s32 = new Int32Array(input.buffer, input.byteOffset, input.byteLength / 4);
        var f32 = new Float32Array(input.buffer, input.byteOffset, input.byteLength / 4);

        var inputOffset = this.vertexState.size * index;
        var vertex = new _state.Vertex();
        this.readOneFunc(vertex, inputOffset, input, f32, s8, s16, s32);
        return vertex;
    };

    VertexReader.prototype.readCount = function (output, input, indices, count) {
        var s8 = new Int8Array(input.buffer, input.byteOffset, input.byteLength);
        var s16 = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2);
        var s32 = new Int32Array(input.buffer, input.byteOffset, input.byteLength / 4);
        var f32 = new Float32Array(input.buffer, input.byteOffset, input.byteLength / 4);

        if (this.vertexState.hasIndex) {
            for (var n = 0; n < count; n++) {
                var index = indices[n];
                this.readOneFunc(output[n], index * this.vertexState.size, input, f32, s8, s16, s32);
            }
        } else {
            var inputOffset = 0;
            for (var n = 0; n < count; n++) {
                this.readOneFunc(output[n], inputOffset, input, f32, s8, s16, s32);
                inputOffset += this.vertexState.size;
            }
        }
    };

    VertexReader.prototype.createJs = function () {
        var indentStringGenerator = new _IndentStringGenerator();

        this.readOffset = 0;

        this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, !this.vertexState.transform2D);
        this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, !this.vertexState.transform2D);
        this.createColorJs(indentStringGenerator, this.vertexState.color);
        this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, !this.vertexState.transform2D);
        this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, !this.vertexState.transform2D);

        return indentStringGenerator.output;
    };

    VertexReader.prototype.readInt8 = function () {
        return '(s8[inputOffset + ' + this.getOffsetAlignAndIncrement(1) + '])';
    };
    VertexReader.prototype.readInt16 = function () {
        return '(s16[(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ') >> 1])';
    };
    VertexReader.prototype.readInt32 = function () {
        return '(s32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])';
    };
    VertexReader.prototype.readFloat32 = function () {
        return '(f32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])';
    };

    VertexReader.prototype.readUInt8 = function () {
        return '((' + this.readInt8() + ' & 0xFF) >>> 0)';
    };
    VertexReader.prototype.readUInt16 = function () {
        return '((' + this.readInt16() + ' & 0xFFFF) >>> 0)';
    };
    VertexReader.prototype.readUInt32 = function () {
        return '((' + this.readInt16() + ' & 0xFFFFFFFF) >>> 0)';
    };

    VertexReader.prototype.createColorJs = function (indentStringGenerator, type) {
        if (type == 0 /* Void */)
            return;

        switch (type) {
            case 7 /* Color8888 */:
                this.align(4);
                indentStringGenerator.write('output.r = ((' + this.readUInt8() + ') / 255.0);\n');
                indentStringGenerator.write('output.g = ((' + this.readUInt8() + ') / 255.0);\n');
                indentStringGenerator.write('output.b = ((' + this.readUInt8() + ') / 255.0);\n');
                indentStringGenerator.write('output.a = ((' + this.readUInt8() + ') / 255.0);\n');
                break;
            case 5 /* Color5551 */:
                this.align(2);
                indentStringGenerator.write('var temp = (' + this.readUInt16() + ');\n');
                indentStringGenerator.write('output.r = BitUtils.extractScale1f(temp, 0, 5);\n');
                indentStringGenerator.write('output.g = BitUtils.extractScale1f(temp, 5, 5);\n');
                indentStringGenerator.write('output.b = BitUtils.extractScale1f(temp, 10, 5);\n');
                indentStringGenerator.write('output.a = BitUtils.extractScale1f(temp, 15, 1);\n');
                break;
            default:
                throw (new Error("Not implemented color format '" + type + "'"));
        }
    };

    VertexReader.prototype.align = function (count) {
        this.readOffset = MathUtils.nextAligned(this.readOffset, count);
    };

    VertexReader.prototype.getOffsetAlignAndIncrement = function (size) {
        this.align(size);
        var offset = this.readOffset;
        this.readOffset += size;
        return offset;
    };

    VertexReader.prototype.createNumberJs = function (indentStringGenerator, components, type, normalize) {
        var _this = this;
        if (type == 0 /* Void */)
            return;

        components.forEach(function (component) {
            switch (type) {
                case 1 /* Byte */:
                    indentStringGenerator.write('output.' + component + ' = ' + _this.readInt8());
                    if (normalize)
                        indentStringGenerator.write(' / 127.0');
                    break;
                case 2 /* Short */:
                    indentStringGenerator.write('output.' + component + ' = ' + _this.readInt16());
                    if (normalize)
                        indentStringGenerator.write(' / 32767.0');
                    break;
                case 3 /* Float */:
                    indentStringGenerator.write('output.' + component + ' = ' + _this.readFloat32());
                    break;
            }
            indentStringGenerator.write(';\n');
        });
    };
    return VertexReader;
})();
exports.VertexReader = VertexReader;

var vertexBuffer = new VertexBuffer();
var singleCallTest = false;

var PspGpuList = (function () {
    function PspGpuList(id, memory, drawDriver, runner, gpu, cpuExecutor) {
        this.id = id;
        this.memory = memory;
        this.drawDriver = drawDriver;
        this.runner = runner;
        this.gpu = gpu;
        this.cpuExecutor = cpuExecutor;
        this.completed = false;
        this.state = new _state.GpuState();
        this.status = 4 /* Paused */;
        this.errorCount = 0;
    }
    PspGpuList.prototype.complete = function () {
        this.completed = true;
        this.runner.deallocate(this);
        this.promiseResolve(0);
    };

    PspGpuList.prototype.jumpRelativeOffset = function (offset) {
        this.current = this.state.baseAddress + offset;
    };

    PspGpuList.prototype.runInstruction = function (current, instruction) {
        var _this = this;
        var op = instruction >>> 24;
        var params24 = instruction & 0xFFFFFF;

        function bool1() {
            return params24 != 0;
        }
        function float1() {
            return MathFloat.reinterpretIntAsFloat(params24 << 8);
        }

        switch (op) {
            case 2 /* IADDR */:
                this.state.indexAddress = params24;
                break;
            case 19 /* OFFSET_ADDR */:
                this.state.baseOffset = (params24 << 8);
                break;
            case 156 /* FBP */:
                this.state.frameBuffer.lowAddress = params24;
                break;
            case 21 /* REGION1 */:
                this.state.viewPort.x1 = BitUtils.extract(params24, 0, 10);
                this.state.viewPort.y1 = BitUtils.extract(params24, 10, 10);
                break;
            case 22 /* REGION2 */:
                this.state.viewPort.x2 = BitUtils.extract(params24, 0, 10);
                this.state.viewPort.y2 = BitUtils.extract(params24, 10, 10);
                break;
            case 28 /* CPE */:
                this.state.clipPlane.enabled = (params24 != 0);
                break;
            case 212 /* SCISSOR1 */:
                this.state.clipPlane.scissor.left = BitUtils.extract(params24, 0, 10);
                this.state.clipPlane.scissor.top = BitUtils.extract(params24, 10, 10);
                break;
            case 213 /* SCISSOR2 */:
                this.state.clipPlane.scissor.right = BitUtils.extract(params24, 0, 10);
                this.state.clipPlane.scissor.bottom = BitUtils.extract(params24, 10, 10);
                break;

            case 157 /* FBW */:
                this.state.frameBuffer.highAddress = BitUtils.extract(params24, 16, 8);
                this.state.frameBuffer.width = BitUtils.extract(params24, 0, 16);
                break;
            case 80 /* SHADE */:
                this.state.shadeModel = BitUtils.extractEnum(params24, 0, 16);
                break;

            case 23 /* LTE */:
                this.state.lightning.enabled = (params24 != 0);
                break;

            case 34 /* ATE */:
                this.state.alphaTest.enabled = (params24 != 0);
                break;

            case 219 /* ATST */:
                this.state.alphaTest.func = BitUtils.extractEnum(params24, 0, 8);
                this.state.alphaTest.value = BitUtils.extract(params24, 8, 8);
                this.state.alphaTest.mask = BitUtils.extract(params24, 16, 8);
                break;

            case 33 /* ABE */:
                this.state.blending.enabled = (params24 != 0);
                break;
            case 223 /* ALPHA */:
                this.state.blending.functionSource = BitUtils.extractEnum(params24, 0, 4);
                this.state.blending.functionDestination = BitUtils.extractEnum(params24, 4, 4);
                this.state.blending.equation = BitUtils.extractEnum(params24, 8, 4);
                break;

            case 24 /* LTE0 */:
            case 25 /* LTE1 */:
            case 26 /* LTE2 */:
            case 27 /* LTE3 */:
                this.state.lightning.lights[op - 24 /* LTE0 */].enabled = params24 != 0;
                break;
            case 16 /* BASE */:
                this.state.baseAddress = ((params24 << 8) & 0xff000000);
                break;
            case 8 /* JUMP */:
                this.jumpRelativeOffset(params24 & ~3);
                break;
            case 0 /* NOP */:
                break;
            case 18 /* VTYPE */:
                this.state.vertex.value = params24;
                break;
            case 1 /* VADDR */:
                this.state.vertex.address = params24;
                break;
            case 194 /* TMODE */:
                this.state.texture.swizzled = BitUtils.extract(params24, 0, 8) != 0;
                this.state.texture.mipmapShareClut = BitUtils.extract(params24, 8, 8) != 0;
                this.state.texture.mipmapMaxLevel = BitUtils.extract(params24, 16, 8);
                break;
            case 198 /* TFLT */:
                this.state.texture.filterMinification = BitUtils.extractEnum(params24, 0, 8);
                this.state.texture.filterMagnification = BitUtils.extractEnum(params24, 8, 8);
                break;
            case 199 /* TWRAP */:
                this.state.texture.wrapU = BitUtils.extractEnum(params24, 0, 8);
                this.state.texture.wrapV = BitUtils.extractEnum(params24, 8, 8);
                break;

            case 30 /* TME */:
                this.state.texture.enabled = (params24 != 0);
                break;

            case 192 /* TMAP */:
                this.state.texture.textureMapMode = BitUtils.extractEnum(params24, 0, 8);
                this.state.texture.textureProjectionMapMode = BitUtils.extractEnum(params24, 8, 8);
                this.state.vertex.normalCount = this.state.texture.getTextureComponentsCount();
                break;

            case 193 /* TEXTURE_ENV_MAP_MATRIX */:
                this.state.texture.shadeU = BitUtils.extract(params24, 0, 2);
                this.state.texture.shadeV = BitUtils.extract(params24, 8, 2);
                break;

            case 202 /* TEC */:
                this.state.texture.envColor.r = BitUtils.extractScalei(params24, 0, 8, 1);
                this.state.texture.envColor.g = BitUtils.extractScalei(params24, 8, 8, 1);
                this.state.texture.envColor.b = BitUtils.extractScalei(params24, 16, 8, 1);
                break;

            case 201 /* TFUNC */:
                this.state.texture.effect = BitUtils.extract(params24, 0, 8);
                this.state.texture.colorComponent = BitUtils.extract(params24, 8, 8);
                this.state.texture.fragment2X = (BitUtils.extract(params24, 16, 8) != 0);
                break;
            case 74 /* UOFFSET */:
                this.state.texture.offsetU = float1();
                break;
            case 75 /* VOFFSET */:
                this.state.texture.offsetV = float1();
                break;

            case 72 /* USCALE */:
                this.state.texture.scaleU = float1();
                break;
            case 73 /* VSCALE */:
                this.state.texture.scaleV = float1();
                break;

            case 203 /* TFLUSH */:
                this.drawDriver.textureFlush(this.state);
                break;
            case 204 /* TSYNC */:
                this.drawDriver.textureSync(this.state);
                break;
            case 195 /* TPSM */:
                this.state.texture.pixelFormat = BitUtils.extract(params24, 0, 4);
                break;
            case 210 /* PSM */:
                this.state.drawPixelFormat = BitUtils.extract(params24, 0, 4);
                break;

            case 184 /* TSIZE0 */:
            case 185 /* TSIZE1 */:
            case 186 /* TSIZE2 */:
            case 187 /* TSIZE3 */:
            case 188 /* TSIZE4 */:
            case 189 /* TSIZE5 */:
            case 190 /* TSIZE6 */:
            case 191 /* TSIZE7 */:
                var mipMap = this.state.texture.mipmaps[op - 184 /* TSIZE0 */];
                var WidthExp = BitUtils.extract(params24, 0, 4);
                var HeightExp = BitUtils.extract(params24, 8, 4);
                var UnknownFlag = (BitUtils.extract(params24, 15, 1) != 0);
                WidthExp = Math.min(WidthExp, 9);
                HeightExp = Math.min(HeightExp, 9);
                mipMap.textureWidth = 1 << WidthExp;
                mipMap.textureHeight = 1 << HeightExp;

                break;

            case 160 /* TBP0 */:
            case 161 /* TBP1 */:
            case 162 /* TBP2 */:
            case 163 /* TBP3 */:
            case 164 /* TBP4 */:
            case 165 /* TBP5 */:
            case 166 /* TBP6 */:
            case 167 /* TBP7 */:
                var mipMap = this.state.texture.mipmaps[op - 160 /* TBP0 */];
                mipMap.address = (mipMap.address & 0xFF000000) | (params24 & 0x00FFFFFF);
                break;

            case 168 /* TBW0 */:
            case 169 /* TBW1 */:
            case 170 /* TBW2 */:
            case 171 /* TBW3 */:
            case 172 /* TBW4 */:
            case 173 /* TBW5 */:
            case 174 /* TBW6 */:
            case 175 /* TBW7 */:
                var mipMap = this.state.texture.mipmaps[op - 168 /* TBW0 */];
                mipMap.bufferWidth = BitUtils.extract(params24, 0, 16);
                mipMap.address = (mipMap.address & 0x00FFFFFF) | ((BitUtils.extract(params24, 16, 8) << 24) & 0xFF000000);
                break;

            case 85 /* AMC */:
                //printf("%08X: %08X", current, instruction);
                //printf("GpuOpCodes.AMC: Params24: %08X", params24);
                this.state.ambientModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
                this.state.ambientModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
                this.state.ambientModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
                this.state.ambientModelColor.a = 1;
                break;

            case 88 /* AMA */:
                //printf("GpuOpCodes.AMA: Params24: %08X", params24);
                this.state.ambientModelColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
                break;

            case 92 /* ALC */:
                //printf("%08X: %08X", current, instruction);
                this.state.lighting.ambientLightColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
                this.state.lighting.ambientLightColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
                this.state.lighting.ambientLightColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
                this.state.lighting.ambientLightColor.a = 1;
                break;

            case 222 /* ZTST */:
                this.state.depthTest.func = BitUtils.extractEnum(params24, 0, 8);
                break;

            case 35 /* ZTE */:
                this.state.depthTest.enabled = (params24 != 0);
                break;

            case 93 /* ALA */:
                this.state.lighting.ambientLightColor.a = BitUtils.extractScalef(params24, 0, 8, 1);
                break;

            case 86 /* DMC */:
                //printf("AMC:%08X", params24);
                this.state.diffuseModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
                this.state.diffuseModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
                this.state.diffuseModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
                this.state.diffuseModelColor.a = 1;
                break;

            case 87 /* SMC */:
                this.state.specularModelColor.r = BitUtils.extractScalef(params24, 0, 8, 1);
                this.state.specularModelColor.g = BitUtils.extractScalef(params24, 8, 8, 1);
                this.state.specularModelColor.b = BitUtils.extractScalef(params24, 16, 8, 1);
                this.state.specularModelColor.a = 1;
                break;

            case 176 /* CBP */:
                this.state.texture.clut.adress = (this.state.texture.clut.adress & 0xFF000000) | ((params24 << 0) & 0x00FFFFFF);
                break;

            case 177 /* CBPH */:
                this.state.texture.clut.adress = (this.state.texture.clut.adress & 0x00FFFFFF) | ((params24 << 8) & 0xFF000000);
                break;

            case 196 /* CLOAD */:
                this.state.texture.clut.numberOfColors = BitUtils.extract(params24, 0, 8) * 8;
                break;

            case 197 /* CMODE */:
                this.state.texture.clut.info = params24;
                this.state.texture.clut.pixelFormat = BitUtils.extract(params24, 0, 2);
                this.state.texture.clut.shift = BitUtils.extract(params24, 2, 5);
                this.state.texture.clut.mask = BitUtils.extract(params24, 8, 8);
                this.state.texture.clut.start = BitUtils.extract(params24, 16, 5);
                break;

            case 62 /* PROJ_START */:
                this.state.projectionMatrix.reset(params24);
                break;
            case 63 /* PROJ_PUT */:
                this.state.projectionMatrix.put(float1());
                break;

            case 60 /* VIEW_START */:
                this.state.viewMatrix.reset(params24);
                break;
            case 61 /* VIEW_PUT */:
                this.state.viewMatrix.put(float1());
                break;

            case 58 /* WORLD_START */:
                this.state.worldMatrix.reset(params24);
                break;
            case 59 /* WORLD_PUT */:
                this.state.worldMatrix.put(float1());
                break;

            case 42 /* BONE_START */:
                this.state.skinning.currentBoneIndex = params24;
                break;
            case 43 /* BONE_PUT */:
                this.state.skinning.write(float1());
                break;

            case 36 /* STE */:
                this.state.stencil.enabled = bool1();
                break;

            case 221 /* SOP */:
                this.state.stencil.fail = BitUtils.extractEnum(params24, 0, 8);
                this.state.stencil.zfail = BitUtils.extractEnum(params24, 8, 8);
                this.state.stencil.zpass = BitUtils.extractEnum(params24, 16, 8);
                break;
            case 220 /* STST */:
                this.state.stencil.func = BitUtils.extractEnum(params24, 0, 8);
                this.state.stencil.funcRef = BitUtils.extract(params24, 8, 8);
                this.state.stencil.funcMask = BitUtils.extract(params24, 16, 8);
                break;

            case 231 /* ZMSK */:
                this.state.depthTest.mask = BitUtils.extract(params24, 0, 16);
                break;

            case 44 /* MW0 */:
            case 45 /* MW1 */:
            case 46 /* MW2 */:
            case 47 /* MW3 */:
            case 48 /* MW4 */:
            case 49 /* MW5 */:
            case 50 /* MW6 */:
            case 51 /* MW7 */:
                this.state.morphWeights[op - 44 /* MW0 */] = MathFloat.reinterpretIntAsFloat(params24 << 8);
                break;

            case 211 /* CLEAR */:
                this.state.clearing = (BitUtils.extract(params24, 0, 1) != 0);
                this.state.clearFlags = BitUtils.extract(params24, 8, 8);
                this.drawDriver.setClearMode(this.state.clearing, this.state.clearFlags);
                break;

            case 29 /* BCE */:
                this.state.culling.enabled = (params24 != 0);
                break;
            case 155 /* FFACE */:
                this.state.culling.direction = params24;
                break;

            case 224 /* SFIX */:
                this.state.blending.fixColorSource.setRGB(params24);
                break;
            case 225 /* DFIX */:
                this.state.blending.fixColorDestination.setRGB(params24);
                break;

            case 54 /* PSUB */:
                this.state.patch.divs = BitUtils.extract(params24, 0, 8);
                this.state.patch.divt = BitUtils.extract(params24, 8, 8);
                break;

            case 5 /* BEZIER */:
                var ucount = BitUtils.extract(params24, 0, 8);
                var vcount = BitUtils.extract(params24, 8, 8);
                var divs = this.state.patch.divs;
                var divt = this.state.patch.divt;
                var vertexState = this.state.vertex;
                var vertexReader = VertexReaderFactory.get(vertexState);
                var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
                var vertexInput = this.memory.getPointerDataView(vertexAddress);

                var vertexState2 = vertexState.clone();
                vertexState2.texture = 3 /* Float */;

                var getBezierControlPoints = function (ucount, vcount) {
                    var controlPoints = ArrayUtils.create2D(ucount, vcount);

                    var mipmap = _this.state.texture.mipmaps[0];
                    var scale = mipmap.textureWidth / mipmap.bufferWidth;
                    for (var u = 0; u < ucount; u++) {
                        for (var v = 0; v < vcount; v++) {
                            var vertex = vertexReader.readOne(vertexInput, v * ucount + u);
                            ;
                            controlPoints[u][v] = vertex;
                            vertex.tx = (u / (ucount - 1)) * scale;
                            vertex.ty = (v / (vcount - 1));
                            //Console.WriteLine("getControlPoints({0}, {1}) : {2}", u, v, controlPoints[u, v]);
                        }
                    }
                    return controlPoints;
                };

                var controlPoints = getBezierControlPoints(ucount, vcount);
                var vertices2 = [];
                vertices2.push(controlPoints[0][0]);
                vertices2.push(controlPoints[ucount - 1][0]);
                vertices2.push(controlPoints[0][vcount - 1]);

                vertices2.push(controlPoints[ucount - 1][0]);
                vertices2.push(controlPoints[ucount - 1][vcount - 1]);
                vertices2.push(controlPoints[0][vcount - 1]);

                if (vertexState2.hasTexture) {
                    //debugger;
                }

                //debugger;
                this.drawDriver.drawElements(3 /* Triangles */, vertices2, vertices2.length, vertexState2);
                break;

            case 4 /* PRIM */:
                //if (this.current < this.stall) {
                //	var nextOp: GpuOpCodes = (this.memory.readUInt32(this.current) >>> 24);
                //
                //	if (nextOp == GpuOpCodes.PRIM) {
                //		console.log('PRIM_BATCH!');
                //	}
                //}
                //console.log('GPU PRIM');
                var primitiveType = BitUtils.extractEnum(params24, 16, 3);
                var vertexCount = BitUtils.extract(params24, 0, 16);
                var vertexState = this.state.vertex;
                var vertexSize = this.state.vertex.size;
                var vertexAddress = this.state.getAddressRelativeToBaseOffset(this.state.vertex.address);
                var indicesAddress = this.state.getAddressRelativeToBaseOffset(this.state.indexAddress);

                var vertexReader = VertexReaderFactory.get(vertexState);

                var indices = null;
                switch (vertexState.index) {
                    case 1 /* Byte */:
                        indices = this.memory.getU8Array(indicesAddress);
                        break;
                    case 2 /* Short */:
                        indices = this.memory.getU16Array(indicesAddress);
                        break;
                }

                var vertexInput = this.memory.getPointerDataView(vertexAddress);

                var vertices = vertexBuffer.vertices;
                vertexReader.readCount(vertices, vertexInput, indices, vertexCount);

                this.drawDriver.setMatrices(this.state.projectionMatrix, this.state.viewMatrix, this.state.worldMatrix);
                this.drawDriver.setState(this.state);

                if (this.errorCount < 400) {
                    //console.log('PRIM:' + primitiveType + ' : ' + vertexCount + ':' + vertexState.hasIndex);
                }

                this.drawDriver.drawElements(primitiveType, vertices, vertexCount, vertexState);

                break;

            case 15 /* FINISH */:
                var callback = this.gpu.callbacks.get(this.callbackId);
                if (callback && callback.cpuState && callback.finishFunction) {
                    this.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [params24, callback.finishArgument]);
                }
                break;
            case 14 /* SIGNAL */:
                console.warn('Not implemented: GPU SIGNAL');
                break;

            case 12 /* END */:
                this.complete();
                return true;
                break;

            default:
                this.errorCount++;
                if (this.errorCount >= 400) {
                    if (this.errorCount == 400) {
                        console.error(sprintf('Stop showing gpu errors'));
                    }
                } else {
                    console.error(sprintf('Not implemented gpu opcode 0x%02X : %s', op, GpuOpCodes[op]));
                }
        }

        return false;
    };

    Object.defineProperty(PspGpuList.prototype, "isStalled", {
        get: function () {
            return ((this.stall != 0) && (this.current >= this.stall));
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(PspGpuList.prototype, "hasMoreInstructions", {
        get: function () {
            return !this.completed && !this.isStalled;
            //return !this.completed && ((this.stall == 0) || (this.current < this.stall));
        },
        enumerable: true,
        configurable: true
    });

    PspGpuList.prototype.runUntilStall = function () {
        this.status = 2 /* Drawing */;
        while (this.hasMoreInstructions) {
            try  {
                while (this.hasMoreInstructions) {
                    var instruction = this.memory.readUInt32(this.current);
                    this.current += 4;
                    if (this.runInstruction(this.current - 4, instruction))
                        return;
                }
                this.status = (this.isStalled) ? 3 /* Stalling */ : 0 /* Completed */;
            } catch (e) {
                console.log(e);
                console.log(e['stack']);
            }
        }
    };

    PspGpuList.prototype.enqueueRunUntilStall = function () {
        var _this = this;
        setImmediate(function () {
            _this.runUntilStall();
        });
    };

    PspGpuList.prototype.updateStall = function (stall) {
        this.stall = stall;
        this.enqueueRunUntilStall();
    };

    PspGpuList.prototype.start = function () {
        var _this = this;
        this.status = 1 /* Queued */;

        this.promise = new Promise(function (resolve, reject) {
            _this.promiseResolve = resolve;
            _this.promiseReject = reject;
        });
        this.completed = false;

        this.enqueueRunUntilStall();
    };

    PspGpuList.prototype.waitAsync = function () {
        return this.promise;
    };
    return PspGpuList;
})();

var PspGpuListRunner = (function () {
    function PspGpuListRunner(memory, drawDriver, gpu, callbackManager) {
        this.memory = memory;
        this.drawDriver = drawDriver;
        this.gpu = gpu;
        this.callbackManager = callbackManager;
        this.lists = [];
        this.freeLists = [];
        this.runningLists = [];
        for (var n = 0; n < 32; n++) {
            var list = new PspGpuList(n, memory, drawDriver, this, gpu, callbackManager);
            this.lists.push(list);
            this.freeLists.push(list);
        }
    }
    PspGpuListRunner.prototype.allocate = function () {
        if (!this.freeLists.length)
            throw ('Out of gpu free lists');
        var list = this.freeLists.pop();
        this.runningLists.push(list);
        return list;
    };

    PspGpuListRunner.prototype.getById = function (id) {
        return this.lists[id];
    };

    PspGpuListRunner.prototype.deallocate = function (list) {
        this.freeLists.push(list);
        this.runningLists.remove(list);
    };

    PspGpuListRunner.prototype.peek = function () {
        var _this = this;
        var _peek = (function () {
            for (var n = 0; n < _this.runningLists.length; n++) {
                var list = _this.runningLists[n];
                if (list.status != 0 /* Completed */)
                    return list.status;
            }
            return 0 /* Completed */;
        });
        var result = _peek();
        console.warn('not implemented gpu list peeking -> ' + result);
        return result;
    };

    PspGpuListRunner.prototype.waitAsync = function () {
        return Promise.all(this.runningLists.map(function (list) {
            return list.waitAsync();
        })).then(function () {
            return 0 /* Completed */;
        });
    };
    return PspGpuListRunner;
})();

var PspGpuCallback = (function () {
    function PspGpuCallback(cpuState, signalFunction, signalArgument, finishFunction, finishArgument) {
        this.cpuState = cpuState;
        this.signalFunction = signalFunction;
        this.signalArgument = signalArgument;
        this.finishFunction = finishFunction;
        this.finishArgument = finishArgument;
    }
    return PspGpuCallback;
})();
exports.PspGpuCallback = PspGpuCallback;

var PspGpu = (function () {
    function PspGpu(memory, display, canvas, cpuExecutor) {
        this.memory = memory;
        this.display = display;
        this.canvas = canvas;
        this.cpuExecutor = cpuExecutor;
        this.callbacks = new UidCollection(1);
        this.driver = new WebGlPspDrawDriver(memory, display, canvas);

        //this.driver = new Context2dPspDrawDriver(memory, canvas);
        this.listRunner = new PspGpuListRunner(memory, this.driver, this, this.cpuExecutor);
    }
    PspGpu.prototype.startAsync = function () {
        return this.driver.initAsync();
    };

    PspGpu.prototype.stopAsync = function () {
        return Promise.resolve();
    };

    PspGpu.prototype.listEnqueue = function (start, stall, callbackId, argsPtr) {
        var list = this.listRunner.allocate();
        list.current = start;
        list.stall = stall;
        list.callbackId = callbackId;
        list.argsPtr = argsPtr;
        list.start();
        return list.id;
    };

    PspGpu.prototype.listSync = function (displayListId, syncType) {
        //console.log('listSync');
        return this.listRunner.getById(displayListId).waitAsync();
    };

    PspGpu.prototype.updateStallAddr = function (displayListId, stall) {
        this.listRunner.getById(displayListId).updateStall(stall);
        return 0;
    };

    PspGpu.prototype.drawSync = function (syncType) {
        switch (syncType) {
            case 1 /* Peek */:
                return this.listRunner.peek();
            case 0 /* WaitForCompletion */:
                return this.listRunner.waitAsync();
            default:
                throw (new Error("Not implemented SyncType." + syncType));
        }
    };
    return PspGpu;
})();
exports.PspGpu = PspGpu;
//# sourceMappingURL=gpu.js.map
},
"src/core/gpu/instructions": function(module, exports, require) {
(function (GpuOpCodes) {
    GpuOpCodes[GpuOpCodes["NOP"] = 0x00] = "NOP";
    GpuOpCodes[GpuOpCodes["VADDR"] = 0x01] = "VADDR";
    GpuOpCodes[GpuOpCodes["IADDR"] = 0x02] = "IADDR";
    GpuOpCodes[GpuOpCodes["Unknown0x03"] = 0x03] = "Unknown0x03";
    GpuOpCodes[GpuOpCodes["PRIM"] = 0x04] = "PRIM";
    GpuOpCodes[GpuOpCodes["BEZIER"] = 0x05] = "BEZIER";
    GpuOpCodes[GpuOpCodes["SPLINE"] = 0x06] = "SPLINE";
    GpuOpCodes[GpuOpCodes["BBOX"] = 0x07] = "BBOX";
    GpuOpCodes[GpuOpCodes["JUMP"] = 0x08] = "JUMP";
    GpuOpCodes[GpuOpCodes["BJUMP"] = 0x09] = "BJUMP";
    GpuOpCodes[GpuOpCodes["CALL"] = 0x0A] = "CALL";
    GpuOpCodes[GpuOpCodes["RET"] = 0x0B] = "RET";
    GpuOpCodes[GpuOpCodes["END"] = 0x0C] = "END";
    GpuOpCodes[GpuOpCodes["Unknown0x0D"] = 0x0D] = "Unknown0x0D";
    GpuOpCodes[GpuOpCodes["SIGNAL"] = 0x0E] = "SIGNAL";
    GpuOpCodes[GpuOpCodes["FINISH"] = 0x0F] = "FINISH";
    GpuOpCodes[GpuOpCodes["BASE"] = 0x10] = "BASE";
    GpuOpCodes[GpuOpCodes["Unknown0x11"] = 0x11] = "Unknown0x11";
    GpuOpCodes[GpuOpCodes["VTYPE"] = 0x12] = "VTYPE";
    GpuOpCodes[GpuOpCodes["OFFSET_ADDR"] = 0x13] = "OFFSET_ADDR";
    GpuOpCodes[GpuOpCodes["ORIGIN_ADDR"] = 0x14] = "ORIGIN_ADDR";
    GpuOpCodes[GpuOpCodes["REGION1"] = 0x15] = "REGION1";
    GpuOpCodes[GpuOpCodes["REGION2"] = 0x16] = "REGION2";
    GpuOpCodes[GpuOpCodes["LTE"] = 0x17] = "LTE";
    GpuOpCodes[GpuOpCodes["LTE0"] = 0x18] = "LTE0";
    GpuOpCodes[GpuOpCodes["LTE1"] = 0x19] = "LTE1";
    GpuOpCodes[GpuOpCodes["LTE2"] = 0x1A] = "LTE2";
    GpuOpCodes[GpuOpCodes["LTE3"] = 0x1B] = "LTE3";
    GpuOpCodes[GpuOpCodes["CPE"] = 0x1C] = "CPE";
    GpuOpCodes[GpuOpCodes["BCE"] = 0x1D] = "BCE";
    GpuOpCodes[GpuOpCodes["TME"] = 0x1E] = "TME";
    GpuOpCodes[GpuOpCodes["FGE"] = 0x1F] = "FGE";
    GpuOpCodes[GpuOpCodes["DTE"] = 0x20] = "DTE";
    GpuOpCodes[GpuOpCodes["ABE"] = 0x21] = "ABE";
    GpuOpCodes[GpuOpCodes["ATE"] = 0x22] = "ATE";
    GpuOpCodes[GpuOpCodes["ZTE"] = 0x23] = "ZTE";
    GpuOpCodes[GpuOpCodes["STE"] = 0x24] = "STE";
    GpuOpCodes[GpuOpCodes["AAE"] = 0x25] = "AAE";
    GpuOpCodes[GpuOpCodes["PCE"] = 0x26] = "PCE";
    GpuOpCodes[GpuOpCodes["CTE"] = 0x27] = "CTE";
    GpuOpCodes[GpuOpCodes["LOE"] = 0x28] = "LOE";
    GpuOpCodes[GpuOpCodes["Unknown0x29"] = 0x29] = "Unknown0x29";
    GpuOpCodes[GpuOpCodes["BONE_START"] = 0x2A] = "BONE_START";
    GpuOpCodes[GpuOpCodes["BONE_PUT"] = 0x2B] = "BONE_PUT";
    GpuOpCodes[GpuOpCodes["MW0"] = 0x2C] = "MW0";
    GpuOpCodes[GpuOpCodes["MW1"] = 0x2D] = "MW1";
    GpuOpCodes[GpuOpCodes["MW2"] = 0x2E] = "MW2";
    GpuOpCodes[GpuOpCodes["MW3"] = 0x2F] = "MW3";
    GpuOpCodes[GpuOpCodes["MW4"] = 0x30] = "MW4";
    GpuOpCodes[GpuOpCodes["MW5"] = 0x31] = "MW5";
    GpuOpCodes[GpuOpCodes["MW6"] = 0x32] = "MW6";
    GpuOpCodes[GpuOpCodes["MW7"] = 0x33] = "MW7";
    GpuOpCodes[GpuOpCodes["Unknown0x34"] = 0x34] = "Unknown0x34";
    GpuOpCodes[GpuOpCodes["Unknown0x35"] = 0x35] = "Unknown0x35";
    GpuOpCodes[GpuOpCodes["PSUB"] = 0x36] = "PSUB";
    GpuOpCodes[GpuOpCodes["PPRIM"] = 0x37] = "PPRIM";
    GpuOpCodes[GpuOpCodes["PFACE"] = 0x38] = "PFACE";
    GpuOpCodes[GpuOpCodes["Unknown0x39"] = 0x39] = "Unknown0x39";
    GpuOpCodes[GpuOpCodes["WORLD_START"] = 0x3A] = "WORLD_START";
    GpuOpCodes[GpuOpCodes["WORLD_PUT"] = 0x3B] = "WORLD_PUT";
    GpuOpCodes[GpuOpCodes["VIEW_START"] = 0x3C] = "VIEW_START";
    GpuOpCodes[GpuOpCodes["VIEW_PUT"] = 0x3D] = "VIEW_PUT";
    GpuOpCodes[GpuOpCodes["PROJ_START"] = 0x3E] = "PROJ_START";
    GpuOpCodes[GpuOpCodes["PROJ_PUT"] = 0x3F] = "PROJ_PUT";
    GpuOpCodes[GpuOpCodes["TMS"] = 0x40] = "TMS";
    GpuOpCodes[GpuOpCodes["TMATRIX"] = 0x41] = "TMATRIX";
    GpuOpCodes[GpuOpCodes["XSCALE"] = 0x42] = "XSCALE";
    GpuOpCodes[GpuOpCodes["YSCALE"] = 0x43] = "YSCALE";
    GpuOpCodes[GpuOpCodes["ZSCALE"] = 0x44] = "ZSCALE";
    GpuOpCodes[GpuOpCodes["XPOS"] = 0x45] = "XPOS";
    GpuOpCodes[GpuOpCodes["YPOS"] = 0x46] = "YPOS";
    GpuOpCodes[GpuOpCodes["ZPOS"] = 0x47] = "ZPOS";
    GpuOpCodes[GpuOpCodes["USCALE"] = 0x48] = "USCALE";
    GpuOpCodes[GpuOpCodes["VSCALE"] = 0x49] = "VSCALE";
    GpuOpCodes[GpuOpCodes["UOFFSET"] = 0x4A] = "UOFFSET";
    GpuOpCodes[GpuOpCodes["VOFFSET"] = 0x4B] = "VOFFSET";
    GpuOpCodes[GpuOpCodes["OFFSETX"] = 0x4C] = "OFFSETX";
    GpuOpCodes[GpuOpCodes["OFFSETY"] = 0x4D] = "OFFSETY";
    GpuOpCodes[GpuOpCodes["Unknown0x4E"] = 0x4E] = "Unknown0x4E";
    GpuOpCodes[GpuOpCodes["Unknown0x4F"] = 0x4F] = "Unknown0x4F";
    GpuOpCodes[GpuOpCodes["SHADE"] = 0x50] = "SHADE";
    GpuOpCodes[GpuOpCodes["RNORM"] = 0x51] = "RNORM";
    GpuOpCodes[GpuOpCodes["Unknown0x52"] = 0x52] = "Unknown0x52";
    GpuOpCodes[GpuOpCodes["CMAT"] = 0x53] = "CMAT";
    GpuOpCodes[GpuOpCodes["EMC"] = 0x54] = "EMC";
    GpuOpCodes[GpuOpCodes["AMC"] = 0x55] = "AMC";
    GpuOpCodes[GpuOpCodes["DMC"] = 0x56] = "DMC";
    GpuOpCodes[GpuOpCodes["SMC"] = 0x57] = "SMC";
    GpuOpCodes[GpuOpCodes["AMA"] = 0x58] = "AMA";
    GpuOpCodes[GpuOpCodes["Unknown0x59"] = 0x59] = "Unknown0x59";
    GpuOpCodes[GpuOpCodes["Unknown0x5A"] = 0x5A] = "Unknown0x5A";
    GpuOpCodes[GpuOpCodes["SPOW"] = 0x5B] = "SPOW";
    GpuOpCodes[GpuOpCodes["ALC"] = 0x5C] = "ALC";
    GpuOpCodes[GpuOpCodes["ALA"] = 0x5D] = "ALA";
    GpuOpCodes[GpuOpCodes["LMODE"] = 0x5E] = "LMODE";
    GpuOpCodes[GpuOpCodes["LT0"] = 0x5F] = "LT0";
    GpuOpCodes[GpuOpCodes["LT1"] = 0x60] = "LT1";
    GpuOpCodes[GpuOpCodes["LT2"] = 0x61] = "LT2";
    GpuOpCodes[GpuOpCodes["LT3"] = 0x62] = "LT3";
    GpuOpCodes[GpuOpCodes["LXP0"] = 0x63] = "LXP0";
    GpuOpCodes[GpuOpCodes["LYP0"] = 0x64] = "LYP0";
    GpuOpCodes[GpuOpCodes["LZP0"] = 0x65] = "LZP0";
    GpuOpCodes[GpuOpCodes["LXP1"] = 0x66] = "LXP1";
    GpuOpCodes[GpuOpCodes["LYP1"] = 0x67] = "LYP1";
    GpuOpCodes[GpuOpCodes["LZP1"] = 0x68] = "LZP1";
    GpuOpCodes[GpuOpCodes["LXP2"] = 0x69] = "LXP2";
    GpuOpCodes[GpuOpCodes["LYP2"] = 0x6A] = "LYP2";
    GpuOpCodes[GpuOpCodes["LZP2"] = 0x6B] = "LZP2";
    GpuOpCodes[GpuOpCodes["LXP3"] = 0x6C] = "LXP3";
    GpuOpCodes[GpuOpCodes["LYP3"] = 0x6D] = "LYP3";
    GpuOpCodes[GpuOpCodes["LZP3"] = 0x6E] = "LZP3";
    GpuOpCodes[GpuOpCodes["LXD0"] = 0x6F] = "LXD0";
    GpuOpCodes[GpuOpCodes["LYD0"] = 112] = "LYD0";
    GpuOpCodes[GpuOpCodes["LZD0"] = 113] = "LZD0";
    GpuOpCodes[GpuOpCodes["LXD1"] = 114] = "LXD1";
    GpuOpCodes[GpuOpCodes["LYD1"] = 115] = "LYD1";
    GpuOpCodes[GpuOpCodes["LZD1"] = 116] = "LZD1";
    GpuOpCodes[GpuOpCodes["LXD2"] = 117] = "LXD2";
    GpuOpCodes[GpuOpCodes["LYD2"] = 118] = "LYD2";
    GpuOpCodes[GpuOpCodes["LZD2"] = 119] = "LZD2";
    GpuOpCodes[GpuOpCodes["LXD3"] = 120] = "LXD3";
    GpuOpCodes[GpuOpCodes["LYD3"] = 121] = "LYD3";
    GpuOpCodes[GpuOpCodes["LZD3"] = 122] = "LZD3";
    GpuOpCodes[GpuOpCodes["LCA0"] = 123] = "LCA0";
    GpuOpCodes[GpuOpCodes["LLA0"] = 124] = "LLA0";
    GpuOpCodes[GpuOpCodes["LQA0"] = 125] = "LQA0";
    GpuOpCodes[GpuOpCodes["LCA1"] = 126] = "LCA1";
    GpuOpCodes[GpuOpCodes["LLA1"] = 127] = "LLA1";
    GpuOpCodes[GpuOpCodes["LQA1"] = 128] = "LQA1";
    GpuOpCodes[GpuOpCodes["LCA2"] = 129] = "LCA2";
    GpuOpCodes[GpuOpCodes["LLA2"] = 130] = "LLA2";
    GpuOpCodes[GpuOpCodes["LQA2"] = 131] = "LQA2";
    GpuOpCodes[GpuOpCodes["LCA3"] = 132] = "LCA3";
    GpuOpCodes[GpuOpCodes["LLA3"] = 133] = "LLA3";
    GpuOpCodes[GpuOpCodes["LQA3"] = 134] = "LQA3";
    GpuOpCodes[GpuOpCodes["SPOTEXP0"] = 135] = "SPOTEXP0";
    GpuOpCodes[GpuOpCodes["SPOTEXP1"] = 136] = "SPOTEXP1";
    GpuOpCodes[GpuOpCodes["SPOTEXP2"] = 137] = "SPOTEXP2";
    GpuOpCodes[GpuOpCodes["SPOTEXP3"] = 138] = "SPOTEXP3";
    GpuOpCodes[GpuOpCodes["SPOTCUT0"] = 139] = "SPOTCUT0";
    GpuOpCodes[GpuOpCodes["SPOTCUT1"] = 140] = "SPOTCUT1";
    GpuOpCodes[GpuOpCodes["SPOTCUT2"] = 141] = "SPOTCUT2";
    GpuOpCodes[GpuOpCodes["SPOTCUT3"] = 142] = "SPOTCUT3";
    GpuOpCodes[GpuOpCodes["ALC0"] = 143] = "ALC0";
    GpuOpCodes[GpuOpCodes["DLC0"] = 144] = "DLC0";
    GpuOpCodes[GpuOpCodes["SLC0"] = 145] = "SLC0";
    GpuOpCodes[GpuOpCodes["ALC1"] = 146] = "ALC1";
    GpuOpCodes[GpuOpCodes["DLC1"] = 147] = "DLC1";
    GpuOpCodes[GpuOpCodes["SLC1"] = 148] = "SLC1";
    GpuOpCodes[GpuOpCodes["ALC2"] = 149] = "ALC2";
    GpuOpCodes[GpuOpCodes["DLC2"] = 150] = "DLC2";
    GpuOpCodes[GpuOpCodes["SLC2"] = 151] = "SLC2";
    GpuOpCodes[GpuOpCodes["ALC3"] = 152] = "ALC3";
    GpuOpCodes[GpuOpCodes["DLC3"] = 153] = "DLC3";
    GpuOpCodes[GpuOpCodes["SLC3"] = 154] = "SLC3";
    GpuOpCodes[GpuOpCodes["FFACE"] = 155] = "FFACE";
    GpuOpCodes[GpuOpCodes["FBP"] = 156] = "FBP";
    GpuOpCodes[GpuOpCodes["FBW"] = 157] = "FBW";
    GpuOpCodes[GpuOpCodes["ZBP"] = 158] = "ZBP";
    GpuOpCodes[GpuOpCodes["ZBW"] = 159] = "ZBW";
    GpuOpCodes[GpuOpCodes["TBP0"] = 160] = "TBP0";
    GpuOpCodes[GpuOpCodes["TBP1"] = 161] = "TBP1";
    GpuOpCodes[GpuOpCodes["TBP2"] = 162] = "TBP2";
    GpuOpCodes[GpuOpCodes["TBP3"] = 163] = "TBP3";
    GpuOpCodes[GpuOpCodes["TBP4"] = 164] = "TBP4";
    GpuOpCodes[GpuOpCodes["TBP5"] = 165] = "TBP5";
    GpuOpCodes[GpuOpCodes["TBP6"] = 166] = "TBP6";
    GpuOpCodes[GpuOpCodes["TBP7"] = 167] = "TBP7";
    GpuOpCodes[GpuOpCodes["TBW0"] = 168] = "TBW0";
    GpuOpCodes[GpuOpCodes["TBW1"] = 169] = "TBW1";
    GpuOpCodes[GpuOpCodes["TBW2"] = 170] = "TBW2";
    GpuOpCodes[GpuOpCodes["TBW3"] = 171] = "TBW3";
    GpuOpCodes[GpuOpCodes["TBW4"] = 172] = "TBW4";
    GpuOpCodes[GpuOpCodes["TBW5"] = 173] = "TBW5";
    GpuOpCodes[GpuOpCodes["TBW6"] = 174] = "TBW6";
    GpuOpCodes[GpuOpCodes["TBW7"] = 175] = "TBW7";
    GpuOpCodes[GpuOpCodes["CBP"] = 176] = "CBP";
    GpuOpCodes[GpuOpCodes["CBPH"] = 177] = "CBPH";
    GpuOpCodes[GpuOpCodes["TRXSBP"] = 178] = "TRXSBP";
    GpuOpCodes[GpuOpCodes["TRXSBW"] = 179] = "TRXSBW";
    GpuOpCodes[GpuOpCodes["TRXDBP"] = 180] = "TRXDBP";
    GpuOpCodes[GpuOpCodes["TRXDBW"] = 181] = "TRXDBW";
    GpuOpCodes[GpuOpCodes["Unknown0xB6"] = 182] = "Unknown0xB6";
    GpuOpCodes[GpuOpCodes["Unknown0xB7"] = 183] = "Unknown0xB7";
    GpuOpCodes[GpuOpCodes["TSIZE0"] = 184] = "TSIZE0";
    GpuOpCodes[GpuOpCodes["TSIZE1"] = 185] = "TSIZE1";
    GpuOpCodes[GpuOpCodes["TSIZE2"] = 186] = "TSIZE2";
    GpuOpCodes[GpuOpCodes["TSIZE3"] = 187] = "TSIZE3";
    GpuOpCodes[GpuOpCodes["TSIZE4"] = 188] = "TSIZE4";
    GpuOpCodes[GpuOpCodes["TSIZE5"] = 189] = "TSIZE5";
    GpuOpCodes[GpuOpCodes["TSIZE6"] = 190] = "TSIZE6";
    GpuOpCodes[GpuOpCodes["TSIZE7"] = 191] = "TSIZE7";
    GpuOpCodes[GpuOpCodes["TMAP"] = 192] = "TMAP";
    GpuOpCodes[GpuOpCodes["TEXTURE_ENV_MAP_MATRIX"] = 193] = "TEXTURE_ENV_MAP_MATRIX";
    GpuOpCodes[GpuOpCodes["TMODE"] = 194] = "TMODE";
    GpuOpCodes[GpuOpCodes["TPSM"] = 195] = "TPSM";
    GpuOpCodes[GpuOpCodes["CLOAD"] = 196] = "CLOAD";
    GpuOpCodes[GpuOpCodes["CMODE"] = 197] = "CMODE";
    GpuOpCodes[GpuOpCodes["TFLT"] = 198] = "TFLT";
    GpuOpCodes[GpuOpCodes["TWRAP"] = 199] = "TWRAP";
    GpuOpCodes[GpuOpCodes["TBIAS"] = 200] = "TBIAS";
    GpuOpCodes[GpuOpCodes["TFUNC"] = 201] = "TFUNC";
    GpuOpCodes[GpuOpCodes["TEC"] = 202] = "TEC";
    GpuOpCodes[GpuOpCodes["TFLUSH"] = 203] = "TFLUSH";
    GpuOpCodes[GpuOpCodes["TSYNC"] = 204] = "TSYNC";
    GpuOpCodes[GpuOpCodes["FFAR"] = 205] = "FFAR";
    GpuOpCodes[GpuOpCodes["FDIST"] = 206] = "FDIST";
    GpuOpCodes[GpuOpCodes["FCOL"] = 207] = "FCOL";
    GpuOpCodes[GpuOpCodes["TSLOPE"] = 208] = "TSLOPE";
    GpuOpCodes[GpuOpCodes["Unknown0xD1"] = 209] = "Unknown0xD1";
    GpuOpCodes[GpuOpCodes["PSM"] = 210] = "PSM";
    GpuOpCodes[GpuOpCodes["CLEAR"] = 211] = "CLEAR";
    GpuOpCodes[GpuOpCodes["SCISSOR1"] = 212] = "SCISSOR1";
    GpuOpCodes[GpuOpCodes["SCISSOR2"] = 213] = "SCISSOR2";
    GpuOpCodes[GpuOpCodes["NEARZ"] = 214] = "NEARZ";
    GpuOpCodes[GpuOpCodes["FARZ"] = 215] = "FARZ";
    GpuOpCodes[GpuOpCodes["CTST"] = 216] = "CTST";
    GpuOpCodes[GpuOpCodes["CREF"] = 217] = "CREF";
    GpuOpCodes[GpuOpCodes["CMSK"] = 218] = "CMSK";
    GpuOpCodes[GpuOpCodes["ATST"] = 219] = "ATST";
    GpuOpCodes[GpuOpCodes["STST"] = 220] = "STST";
    GpuOpCodes[GpuOpCodes["SOP"] = 221] = "SOP";
    GpuOpCodes[GpuOpCodes["ZTST"] = 222] = "ZTST";
    GpuOpCodes[GpuOpCodes["ALPHA"] = 223] = "ALPHA";
    GpuOpCodes[GpuOpCodes["SFIX"] = 224] = "SFIX";
    GpuOpCodes[GpuOpCodes["DFIX"] = 225] = "DFIX";
    GpuOpCodes[GpuOpCodes["DTH0"] = 226] = "DTH0";
    GpuOpCodes[GpuOpCodes["DTH1"] = 227] = "DTH1";
    GpuOpCodes[GpuOpCodes["DTH2"] = 228] = "DTH2";
    GpuOpCodes[GpuOpCodes["DTH3"] = 229] = "DTH3";
    GpuOpCodes[GpuOpCodes["LOP"] = 230] = "LOP";
    GpuOpCodes[GpuOpCodes["ZMSK"] = 231] = "ZMSK";
    GpuOpCodes[GpuOpCodes["PMSKC"] = 232] = "PMSKC";
    GpuOpCodes[GpuOpCodes["PMSKA"] = 233] = "PMSKA";
    GpuOpCodes[GpuOpCodes["TRXKICK"] = 234] = "TRXKICK";
    GpuOpCodes[GpuOpCodes["TRXSPOS"] = 235] = "TRXSPOS";
    GpuOpCodes[GpuOpCodes["TRXDPOS"] = 236] = "TRXDPOS";
    GpuOpCodes[GpuOpCodes["Unknown0xED"] = 237] = "Unknown0xED";
    GpuOpCodes[GpuOpCodes["TRXSIZE"] = 238] = "TRXSIZE";
    GpuOpCodes[GpuOpCodes["Unknown0xEF"] = 239] = "Unknown0xEF";
    GpuOpCodes[GpuOpCodes["Unknown0xF0"] = 240] = "Unknown0xF0";
    GpuOpCodes[GpuOpCodes["Unknown0xF1"] = 241] = "Unknown0xF1";
    GpuOpCodes[GpuOpCodes["Unknown0xF2"] = 242] = "Unknown0xF2";
    GpuOpCodes[GpuOpCodes["Unknown0xF3"] = 243] = "Unknown0xF3";
    GpuOpCodes[GpuOpCodes["Unknown0xF4"] = 244] = "Unknown0xF4";
    GpuOpCodes[GpuOpCodes["Unknown0xF5"] = 245] = "Unknown0xF5";
    GpuOpCodes[GpuOpCodes["Unknown0xF6"] = 246] = "Unknown0xF6";
    GpuOpCodes[GpuOpCodes["Unknown0xF7"] = 247] = "Unknown0xF7";
    GpuOpCodes[GpuOpCodes["Unknown0xF8"] = 248] = "Unknown0xF8";
    GpuOpCodes[GpuOpCodes["Unknown0xF9"] = 249] = "Unknown0xF9";
    GpuOpCodes[GpuOpCodes["Unknown0xFA"] = 250] = "Unknown0xFA";
    GpuOpCodes[GpuOpCodes["Unknown0xFB"] = 251] = "Unknown0xFB";
    GpuOpCodes[GpuOpCodes["Unknown0xFC"] = 252] = "Unknown0xFC";
    GpuOpCodes[GpuOpCodes["Unknown0xFD"] = 253] = "Unknown0xFD";
    GpuOpCodes[GpuOpCodes["Unknown0xFE"] = 254] = "Unknown0xFE";
    GpuOpCodes[GpuOpCodes["Dummy"] = 255] = "Dummy";
})(exports.GpuOpCodes || (exports.GpuOpCodes = {}));
var GpuOpCodes = exports.GpuOpCodes;
//# sourceMappingURL=instructions.js.map
},
"src/core/gpu/state": function(module, exports, require) {
var _pixelformat = require('../pixelformat');

var PixelFormat = _pixelformat.PixelFormat;

(function (CullingDirection) {
    CullingDirection[CullingDirection["CounterClockWise"] = 0] = "CounterClockWise";
    CullingDirection[CullingDirection["ClockWise"] = 1] = "ClockWise";
})(exports.CullingDirection || (exports.CullingDirection = {}));
var CullingDirection = exports.CullingDirection;

(function (SyncType) {
    SyncType[SyncType["WaitForCompletion"] = 0] = "WaitForCompletion";
    SyncType[SyncType["Peek"] = 1] = "Peek";
})(exports.SyncType || (exports.SyncType = {}));
var SyncType = exports.SyncType;

(function (DisplayListStatus) {
    DisplayListStatus[DisplayListStatus["Completed"] = 0] = "Completed";
    DisplayListStatus[DisplayListStatus["Queued"] = 1] = "Queued";
    DisplayListStatus[DisplayListStatus["Drawing"] = 2] = "Drawing";
    DisplayListStatus[DisplayListStatus["Stalling"] = 3] = "Stalling";
    DisplayListStatus[DisplayListStatus["Paused"] = 4] = "Paused";
})(exports.DisplayListStatus || (exports.DisplayListStatus = {}));
var DisplayListStatus = exports.DisplayListStatus;

var GpuFrameBufferState = (function () {
    function GpuFrameBufferState() {
        this.lowAddress = 0;
        this.highAddress = 0;
        this.width = 0;
    }
    return GpuFrameBufferState;
})();
exports.GpuFrameBufferState = GpuFrameBufferState;

(function (IndexEnum) {
    IndexEnum[IndexEnum["Void"] = 0] = "Void";
    IndexEnum[IndexEnum["Byte"] = 1] = "Byte";
    IndexEnum[IndexEnum["Short"] = 2] = "Short";
})(exports.IndexEnum || (exports.IndexEnum = {}));
var IndexEnum = exports.IndexEnum;

(function (NumericEnum) {
    NumericEnum[NumericEnum["Void"] = 0] = "Void";
    NumericEnum[NumericEnum["Byte"] = 1] = "Byte";
    NumericEnum[NumericEnum["Short"] = 2] = "Short";
    NumericEnum[NumericEnum["Float"] = 3] = "Float";
})(exports.NumericEnum || (exports.NumericEnum = {}));
var NumericEnum = exports.NumericEnum;

(function (ColorEnum) {
    ColorEnum[ColorEnum["Void"] = 0] = "Void";
    ColorEnum[ColorEnum["Invalid1"] = 1] = "Invalid1";
    ColorEnum[ColorEnum["Invalid2"] = 2] = "Invalid2";
    ColorEnum[ColorEnum["Invalid3"] = 3] = "Invalid3";
    ColorEnum[ColorEnum["Color5650"] = 4] = "Color5650";
    ColorEnum[ColorEnum["Color5551"] = 5] = "Color5551";
    ColorEnum[ColorEnum["Color4444"] = 6] = "Color4444";
    ColorEnum[ColorEnum["Color8888"] = 7] = "Color8888";
})(exports.ColorEnum || (exports.ColorEnum = {}));
var ColorEnum = exports.ColorEnum;

var Vertex = (function () {
    function Vertex() {
        this.px = 0.0;
        this.py = 0.0;
        this.pz = 0.0;
        this.nx = 0.0;
        this.ny = 0.0;
        this.nz = 0.0;
        this.tx = 0.0;
        this.ty = 0.0;
        this.tz = 0.0;
        this.r = 0.0;
        this.g = 0.0;
        this.b = 0.0;
        this.a = 1.0;
        this.w0 = 0.0;
        this.w1 = 0.0;
        this.w2 = 0.0;
        this.w3 = 0.0;
        this.w4 = 0.0;
        this.w5 = 0.0;
        this.w6 = 0.0;
        this.w7 = 0.0;
    }
    Vertex.prototype.copyFrom = function (that) {
        this.px = that.px;
        this.py = that.py;
        this.pz = that.pz;
        this.nx = that.nx;
        this.ny = that.ny;
        this.nz = that.nz;
        this.tx = that.tx;
        this.ty = that.ty;
        this.tz = that.tz;
        this.r = that.r;
        this.g = that.g;
        this.b = that.b;
        this.a = that.a;
        this.w0 = that.w0;
        this.w1 = that.w1;
        this.w2 = that.w2;
        this.w3 = that.w3;
        this.w4 = that.w4;
        this.w5 = that.w5;
        this.w6 = that.w6;
        this.w7 = that.w7;
        return this;
    };

    Vertex.prototype.clone = function () {
        var that = new Vertex();
        that.copyFrom(this);
        return that;
    };
    return Vertex;
})();
exports.Vertex = Vertex;

var VertexState = (function () {
    function VertexState() {
        this.address = 0;
        this._value = 0;
        this.reversedNormal = false;
        this.normalCount = 2;
        this.textureComponentCount = 2;
    }
    VertexState.prototype.clone = function () {
        var that = new VertexState();
        that.address = this.address;
        that._value = this._value;
        that.reversedNormal = this.reversedNormal;
        that.normalCount = this.normalCount;
        that.textureComponentCount = this.textureComponentCount;
        that.size = this.size;
        return that;
    };

    Object.defineProperty(VertexState.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (value) {
            this._value = value;
            this.size = this.getVertexSize();
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(VertexState.prototype, "hash", {
        //getReader() { return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount); }
        get: function () {
            return this.value + (this.textureComponentCount * Math.pow(2, 32));
        },
        enumerable: true,
        configurable: true
    });

    VertexState.prototype.toString = function () {
        return 'VertexState(' + JSON.stringify({
            address: this.address,
            texture: this.texture,
            color: this.color,
            normal: this.normal,
            position: this.position,
            weight: this.weight,
            index: this.index,
            weightCount: this.weightCount,
            morphingVertexCount: this.morphingVertexCount,
            transform2D: this.transform2D
        }) + ')';
    };

    Object.defineProperty(VertexState.prototype, "hasTexture", {
        get: function () {
            return this.texture != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasColor", {
        get: function () {
            return this.color != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasNormal", {
        get: function () {
            return this.normal != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasPosition", {
        get: function () {
            return this.position != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasWeight", {
        get: function () {
            return this.weight != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasIndex", {
        get: function () {
            return this.index != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(VertexState.prototype, "texture", {
        get: function () {
            return BitUtils.extractEnum(this.value, 0, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 0, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "color", {
        get: function () {
            return BitUtils.extractEnum(this.value, 2, 3);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 2, 3, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "normal", {
        get: function () {
            return BitUtils.extractEnum(this.value, 5, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 5, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "position", {
        get: function () {
            return BitUtils.extractEnum(this.value, 7, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 7, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "weight", {
        get: function () {
            return BitUtils.extractEnum(this.value, 9, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 9, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "index", {
        get: function () {
            return BitUtils.extractEnum(this.value, 11, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 11, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "weightCount", {
        get: function () {
            return BitUtils.extract(this.value, 14, 3);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 14, 3, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "morphingVertexCount", {
        get: function () {
            return BitUtils.extract(this.value, 18, 2);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 18, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "transform2D", {
        get: function () {
            return BitUtils.extractEnum(this.value, 23, 1);
        },
        set: function (value) {
            this.value = BitUtils.insert(this.value, 23, 1, value ? 1 : 0);
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(VertexState.prototype, "weightSize", {
        get: function () {
            return this.NumericEnumGetSize(this.weight);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "colorSize", {
        get: function () {
            return this.ColorEnumGetSize(this.color);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "textureSize", {
        get: function () {
            return this.NumericEnumGetSize(this.texture);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "positionSize", {
        get: function () {
            return this.NumericEnumGetSize(this.position);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "normalSize", {
        get: function () {
            return this.NumericEnumGetSize(this.normal);
        },
        enumerable: true,
        configurable: true
    });

    VertexState.prototype.IndexEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 1 /* Byte */:
                return 1;
            case 2 /* Short */:
                return 2;
            default:
                throw ("Invalid enum");
        }
    };

    VertexState.prototype.NumericEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 1 /* Byte */:
                return 1;
            case 2 /* Short */:
                return 2;
            case 3 /* Float */:
                return 4;
            default:
                throw ("Invalid enum");
        }
    };

    VertexState.prototype.ColorEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 4 /* Color5650 */:
                return 2;
            case 5 /* Color5551 */:
                return 2;
            case 6 /* Color4444 */:
                return 2;
            case 7 /* Color8888 */:
                return 4;
            default:
                throw ("Invalid enum");
        }
    };

    VertexState.prototype.GetMaxAlignment = function () {
        return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
    };

    Object.defineProperty(VertexState.prototype, "realWeightCount", {
        get: function () {
            return this.weightCount + 1;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(VertexState.prototype, "realMorphingVertexCount", {
        get: function () {
            return this.morphingVertexCount + 1;
        },
        enumerable: true,
        configurable: true
    });

    VertexState.prototype.getVertexSize = function () {
        var size = 0;
        size = MathUtils.nextAligned(size, this.weightSize);
        size += this.realWeightCount * this.weightSize;
        size = MathUtils.nextAligned(size, this.textureSize);
        size += this.textureComponentCount * this.textureSize;
        size = MathUtils.nextAligned(size, this.colorSize);
        size += 1 * this.colorSize;
        size = MathUtils.nextAligned(size, this.normalSize);
        size += 3 * this.normalSize;
        size = MathUtils.nextAligned(size, this.positionSize);
        size += 3 * this.positionSize;

        var alignmentSize = this.GetMaxAlignment();
        size = MathUtils.nextAligned(size, alignmentSize);

        //Console.WriteLine("Size:" + Size);
        return size;
    };

    VertexState.prototype.read = function (memory, count) {
        //console.log('read vertices ' + count);
        var vertices = [];
        for (var n = 0; n < count; n++)
            vertices.push(this.readOne(memory));
        return vertices;
    };

    VertexState.prototype.readOne = function (memory) {
        var address = this.address;
        var vertex = {};

        //console.log(vertex);
        this.address += this.size;

        return vertex;
    };
    return VertexState;
})();
exports.VertexState = VertexState;

var Matrix4x4 = (function () {
    function Matrix4x4() {
        this.index = 0;
        this.values = mat4.create();
    }
    Matrix4x4.prototype.put = function (value) {
        this.putAt(this.index++, value);
    };

    Matrix4x4.prototype.putAt = function (index, value) {
        this.values[index] = value;
    };

    Matrix4x4.prototype.reset = function (startIndex) {
        this.index = startIndex;
    };
    return Matrix4x4;
})();
exports.Matrix4x4 = Matrix4x4;

var Matrix4x3 = (function () {
    function Matrix4x3() {
        this.index = 0;
        this.values = mat4.create();
    }
    Matrix4x3.prototype.put = function (value) {
        this.putAt(this.index++, value);
    };

    Matrix4x3.prototype.putAt = function (index, value) {
        this.values[Matrix4x3.indices[index]] = value;
    };

    Matrix4x3.prototype.reset = function (startIndex) {
        this.index = startIndex;
    };
    Matrix4x3.indices = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];
    return Matrix4x3;
})();
exports.Matrix4x3 = Matrix4x3;

var ViewPort = (function () {
    function ViewPort() {
        this.x1 = 0;
        this.y1 = 0;
        this.x2 = 512;
        this.y2 = 272;
    }
    Object.defineProperty(ViewPort.prototype, "width", {
        get: function () {
            return this.x2 - this.x1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewPort.prototype, "height", {
        get: function () {
            return this.y2 - this.y1;
        },
        enumerable: true,
        configurable: true
    });
    return ViewPort;
})();
exports.ViewPort = ViewPort;

var Light = (function () {
    function Light() {
        this.enabled = false;
    }
    return Light;
})();
exports.Light = Light;

var Lightning = (function () {
    function Lightning() {
        this.enabled = false;
        this.lights = [new Light(), new Light(), new Light(), new Light()];
    }
    return Lightning;
})();
exports.Lightning = Lightning;

var MipmapState = (function () {
    function MipmapState() {
        this.address = 0;
        this.bufferWidth = 0;
        this.textureWidth = 0;
        this.textureHeight = 0;
    }
    return MipmapState;
})();
exports.MipmapState = MipmapState;

var ColorState = (function () {
    function ColorState() {
        this.r = 1;
        this.g = 1;
        this.b = 1;
        this.a = 1;
    }
    return ColorState;
})();
exports.ColorState = ColorState;

var ClutState = (function () {
    function ClutState() {
        this.adress = 0;
        this.numberOfColors = 0;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.shift = 0;
        this.mask = 0x00;
        this.start = 0;
    }
    return ClutState;
})();
exports.ClutState = ClutState;

(function (TextureProjectionMapMode) {
    TextureProjectionMapMode[TextureProjectionMapMode["GU_POSITION"] = 0] = "GU_POSITION";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_UV"] = 1] = "GU_UV";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_NORMALIZED_NORMAL"] = 2] = "GU_NORMALIZED_NORMAL";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_NORMAL"] = 3] = "GU_NORMAL";
})(exports.TextureProjectionMapMode || (exports.TextureProjectionMapMode = {}));
var TextureProjectionMapMode = exports.TextureProjectionMapMode;

(function (TextureMapMode) {
    TextureMapMode[TextureMapMode["GU_TEXTURE_COORDS"] = 0] = "GU_TEXTURE_COORDS";
    TextureMapMode[TextureMapMode["GU_TEXTURE_MATRIX"] = 1] = "GU_TEXTURE_MATRIX";
    TextureMapMode[TextureMapMode["GU_ENVIRONMENT_MAP"] = 2] = "GU_ENVIRONMENT_MAP";
})(exports.TextureMapMode || (exports.TextureMapMode = {}));
var TextureMapMode = exports.TextureMapMode;

var TextureState = (function () {
    function TextureState() {
        this.enabled = false;
        this.swizzled = false;
        this.mipmapShareClut = false;
        this.mipmapMaxLevel = 0;
        this.filterMinification = 0 /* Nearest */;
        this.filterMagnification = 0 /* Nearest */;
        this.wrapU = 0 /* Repeat */;
        this.offsetU = 0;
        this.offsetV = 0;
        this.scaleU = 1;
        this.scaleV = 1;
        this.shadeU = 0;
        this.shadeV = 0;
        this.wrapV = 0 /* Repeat */;
        this.effect = 0 /* Modulate */;
        this.colorComponent = 0 /* Rgb */;
        this.envColor = new ColorState();
        this.fragment2X = false;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.clut = new ClutState();
        this.mipmaps = [new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState()];
        this.textureProjectionMapMode = 3 /* GU_NORMAL */;
        this.textureMapMode = 0 /* GU_TEXTURE_COORDS */;
    }
    TextureState.prototype.getTextureComponentsCount = function () {
        switch (this.textureMapMode) {
            default:
            case 0 /* GU_TEXTURE_COORDS */:
                return 2;
            case 1 /* GU_TEXTURE_MATRIX */:
                switch (this.textureProjectionMapMode) {
                    case 3 /* GU_NORMAL */:
                        return 3;
                    case 2 /* GU_NORMALIZED_NORMAL */:
                        return 3;
                    case 0 /* GU_POSITION */:
                        return 3;
                    case 1 /* GU_UV */:
                        return 2;
                    default:
                        return 2;
                }
                break;
            case 2 /* GU_ENVIRONMENT_MAP */:
                return 2;
        }
    };
    return TextureState;
})();
exports.TextureState = TextureState;

var CullingState = (function () {
    function CullingState() {
        this.enabled = false;
        this.direction = 1 /* ClockWise */;
    }
    return CullingState;
})();
exports.CullingState = CullingState;

var LightingState = (function () {
    function LightingState() {
        this.ambientLightColor = new ColorState();
    }
    return LightingState;
})();
exports.LightingState = LightingState;

(function (TestFunctionEnum) {
    TestFunctionEnum[TestFunctionEnum["Never"] = 0] = "Never";
    TestFunctionEnum[TestFunctionEnum["Always"] = 1] = "Always";
    TestFunctionEnum[TestFunctionEnum["Equal"] = 2] = "Equal";
    TestFunctionEnum[TestFunctionEnum["NotEqual"] = 3] = "NotEqual";
    TestFunctionEnum[TestFunctionEnum["Less"] = 4] = "Less";
    TestFunctionEnum[TestFunctionEnum["LessOrEqual"] = 5] = "LessOrEqual";
    TestFunctionEnum[TestFunctionEnum["Greater"] = 6] = "Greater";
    TestFunctionEnum[TestFunctionEnum["GreaterOrEqual"] = 7] = "GreaterOrEqual";
})(exports.TestFunctionEnum || (exports.TestFunctionEnum = {}));
var TestFunctionEnum = exports.TestFunctionEnum;

var DepthTestState = (function () {
    function DepthTestState() {
        this.enabled = false;
        this.func = 1 /* Always */;
        this.mask = 0;
    }
    return DepthTestState;
})();
exports.DepthTestState = DepthTestState;

(function (ShadingModelEnum) {
    ShadingModelEnum[ShadingModelEnum["Flat"] = 0] = "Flat";
    ShadingModelEnum[ShadingModelEnum["Smooth"] = 1] = "Smooth";
})(exports.ShadingModelEnum || (exports.ShadingModelEnum = {}));
var ShadingModelEnum = exports.ShadingModelEnum;

(function (GuBlendingFactor) {
    GuBlendingFactor[GuBlendingFactor["GU_SRC_COLOR"] = 0] = "GU_SRC_COLOR";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_SRC_COLOR"] = 1] = "GU_ONE_MINUS_SRC_COLOR";
    GuBlendingFactor[GuBlendingFactor["GU_SRC_ALPHA"] = 2] = "GU_SRC_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_SRC_ALPHA"] = 3] = "GU_ONE_MINUS_SRC_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_DST_ALPHA"] = 4] = "GU_DST_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_DST_ALPHA"] = 5] = "GU_ONE_MINUS_DST_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_FIX"] = 10] = "GU_FIX";
})(exports.GuBlendingFactor || (exports.GuBlendingFactor = {}));
var GuBlendingFactor = exports.GuBlendingFactor;

(function (GuBlendingEquation) {
    GuBlendingEquation[GuBlendingEquation["Add"] = 0] = "Add";
    GuBlendingEquation[GuBlendingEquation["Substract"] = 1] = "Substract";
    GuBlendingEquation[GuBlendingEquation["ReverseSubstract"] = 2] = "ReverseSubstract";
    GuBlendingEquation[GuBlendingEquation["Min"] = 3] = "Min";
    GuBlendingEquation[GuBlendingEquation["Max"] = 4] = "Max";
    GuBlendingEquation[GuBlendingEquation["Abs"] = 5] = "Abs";
})(exports.GuBlendingEquation || (exports.GuBlendingEquation = {}));
var GuBlendingEquation = exports.GuBlendingEquation;

var Color = (function () {
    function Color(r, g, b, a) {
        if (typeof r === "undefined") { r = 0; }
        if (typeof g === "undefined") { g = 0; }
        if (typeof b === "undefined") { b = 0; }
        if (typeof a === "undefined") { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    Color.prototype.setRGB = function (rgb) {
        this.r = BitUtils.extractScale1f(rgb, 0, 8);
        this.g = BitUtils.extractScale1f(rgb, 8, 8);
        this.b = BitUtils.extractScale1f(rgb, 16, 8);
        this.a = 1;
    };

    Color.prototype.set = function (r, g, b, a) {
        if (typeof a === "undefined") { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    };

    Color.add = function (a, b, dest) {
        if (typeof dest === "undefined") { dest = null; }
        if (dest == null)
            dest = new Color();
        dest.r = a.r + b.r;
        dest.g = a.g + b.g;
        dest.b = a.b + b.b;
        dest.a = a.a * b.a;
        return dest;
    };

    Color.prototype.equals = function (r, g, b, a) {
        return (this.r == r) && (this.g == g) && (this.b == b) && (this.a == a);
    };
    return Color;
})();
exports.Color = Color;

var Blending = (function () {
    function Blending() {
        this.enabled = false;
        this.functionSource = 2 /* GU_SRC_ALPHA */;
        this.functionDestination = 5 /* GU_ONE_MINUS_DST_ALPHA */;
        this.equation = 0 /* Add */;
        this.fixColorSource = new Color();
        this.fixColorDestination = new Color();
    }
    return Blending;
})();
exports.Blending = Blending;

var AlphaTest = (function () {
    function AlphaTest() {
        this.enabled = false;
        this.value = 0;
        this.mask = 0xFF;
        this.func = 1 /* Always */;
    }
    return AlphaTest;
})();
exports.AlphaTest = AlphaTest;

var Rectangle = (function () {
    function Rectangle(top, left, right, bottom) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }
    Object.defineProperty(Rectangle.prototype, "width", {
        get: function () {
            return this.right - this.left;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "height", {
        get: function () {
            return this.bottom - this.top;
        },
        enumerable: true,
        configurable: true
    });
    return Rectangle;
})();
exports.Rectangle = Rectangle;

var ClipPlane = (function () {
    function ClipPlane() {
        this.enabled = true;
        this.scissor = new Rectangle(0, 0, 512, 272);
    }
    return ClipPlane;
})();
exports.ClipPlane = ClipPlane;

var SkinningState = (function () {
    function SkinningState() {
        this.currentBoneIndex = 0;
        this.boneMatrices = [new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3()];
    }
    SkinningState.prototype.write = function (value) {
        this.boneMatrices[ToInt32(this.currentBoneIndex / 12)].putAt(this.currentBoneIndex % 12, value);
        this.currentBoneIndex++;
    };
    return SkinningState;
})();
exports.SkinningState = SkinningState;

(function (StencilOperationEnum) {
    StencilOperationEnum[StencilOperationEnum["Keep"] = 0] = "Keep";
    StencilOperationEnum[StencilOperationEnum["Zero"] = 1] = "Zero";
    StencilOperationEnum[StencilOperationEnum["Replace"] = 2] = "Replace";
    StencilOperationEnum[StencilOperationEnum["Invert"] = 3] = "Invert";
    StencilOperationEnum[StencilOperationEnum["Increment"] = 4] = "Increment";
    StencilOperationEnum[StencilOperationEnum["Decrement"] = 5] = "Decrement";
})(exports.StencilOperationEnum || (exports.StencilOperationEnum = {}));
var StencilOperationEnum = exports.StencilOperationEnum;

var StencilState = (function () {
    function StencilState() {
        this.enabled = false;
        this.fail = 0 /* Keep */;
        this.zpass = 0 /* Keep */;
        this.zfail = 0 /* Keep */;
        this.func = 1 /* Always */;
        this.funcRef = 0;
        this.funcMask = 0;
    }
    return StencilState;
})();
exports.StencilState = StencilState;

var PatchState = (function () {
    function PatchState() {
        this.divs = 0;
        this.divt = 0;
    }
    return PatchState;
})();
exports.PatchState = PatchState;

var GpuState = (function () {
    function GpuState() {
        this.clearing = false;
        this.clearFlags = 0;
        this.baseAddress = 0;
        this.baseOffset = 0;
        this.indexAddress = 0;
        this.shadeModel = 0 /* Flat */;
        this.frameBuffer = new GpuFrameBufferState();
        this.vertex = new VertexState();
        this.stencil = new StencilState();
        this.skinning = new SkinningState();
        this.morphWeights = [1, 0, 0, 0, 0, 0, 0, 0];
        this.projectionMatrix = new Matrix4x4();
        this.viewMatrix = new Matrix4x3();
        this.worldMatrix = new Matrix4x3();
        this.viewPort = new ViewPort();
        this.clipPlane = new ClipPlane();
        this.lightning = new Lightning();
        this.alphaTest = new AlphaTest();
        this.blending = new Blending();
        this.patch = new PatchState();
        this.texture = new TextureState();
        this.ambientModelColor = new ColorState();
        this.lighting = new LightingState();
        this.diffuseModelColor = new ColorState();
        this.specularModelColor = new ColorState();
        this.culling = new CullingState();
        this.depthTest = new DepthTestState();
        this.drawPixelFormat = 3 /* RGBA_8888 */;
    }
    GpuState.prototype.getAddressRelativeToBase = function (relativeAddress) {
        return (this.baseAddress | relativeAddress);
    };
    GpuState.prototype.getAddressRelativeToBaseOffset = function (relativeAddress) {
        return ((this.baseAddress | relativeAddress) + this.baseOffset);
    };
    return GpuState;
})();
exports.GpuState = GpuState;

(function (WrapMode) {
    WrapMode[WrapMode["Repeat"] = 0] = "Repeat";
    WrapMode[WrapMode["Clamp"] = 1] = "Clamp";
})(exports.WrapMode || (exports.WrapMode = {}));
var WrapMode = exports.WrapMode;

(function (TextureEffect) {
    TextureEffect[TextureEffect["Modulate"] = 0] = "Modulate";
    TextureEffect[TextureEffect["Decal"] = 1] = "Decal";
    TextureEffect[TextureEffect["Blend"] = 2] = "Blend";
    TextureEffect[TextureEffect["Replace"] = 3] = "Replace";
    TextureEffect[TextureEffect["Add"] = 4] = "Add";
})(exports.TextureEffect || (exports.TextureEffect = {}));
var TextureEffect = exports.TextureEffect;

(function (TextureFilter) {
    TextureFilter[TextureFilter["Nearest"] = 0] = "Nearest";
    TextureFilter[TextureFilter["Linear"] = 1] = "Linear";
    TextureFilter[TextureFilter["NearestMipmapNearest"] = 4] = "NearestMipmapNearest";
    TextureFilter[TextureFilter["LinearMipmapNearest"] = 5] = "LinearMipmapNearest";
    TextureFilter[TextureFilter["NearestMipmapLinear"] = 6] = "NearestMipmapLinear";
    TextureFilter[TextureFilter["LinearMipmapLinear"] = 7] = "LinearMipmapLinear";
})(exports.TextureFilter || (exports.TextureFilter = {}));
var TextureFilter = exports.TextureFilter;

(function (TextureColorComponent) {
    TextureColorComponent[TextureColorComponent["Rgb"] = 0] = "Rgb";
    TextureColorComponent[TextureColorComponent["Rgba"] = 1] = "Rgba";
})(exports.TextureColorComponent || (exports.TextureColorComponent = {}));
var TextureColorComponent = exports.TextureColorComponent;

(function (PrimitiveType) {
    PrimitiveType[PrimitiveType["Points"] = 0] = "Points";
    PrimitiveType[PrimitiveType["Lines"] = 1] = "Lines";
    PrimitiveType[PrimitiveType["LineStrip"] = 2] = "LineStrip";
    PrimitiveType[PrimitiveType["Triangles"] = 3] = "Triangles";
    PrimitiveType[PrimitiveType["TriangleStrip"] = 4] = "TriangleStrip";
    PrimitiveType[PrimitiveType["TriangleFan"] = 5] = "TriangleFan";
    PrimitiveType[PrimitiveType["Sprites"] = 6] = "Sprites";
    PrimitiveType[PrimitiveType["ContinuePreviousPrim"] = 7] = "ContinuePreviousPrim";
})(exports.PrimitiveType || (exports.PrimitiveType = {}));
var PrimitiveType = exports.PrimitiveType;
//# sourceMappingURL=state.js.map
},
"src/core/gpu/webgl/driver": function(module, exports, require) {
var _state = require('../state');

var _shader = require('./shader');
var _texture = require('./texture');
var _utils = require('./utils');

var FastFloat32Buffer = _utils.FastFloat32Buffer;

var ShaderCache = _shader.ShaderCache;

var TextureHandler = _texture.TextureHandler;

var WebGlPspDrawDriver = (function () {
    function WebGlPspDrawDriver(memory, display, canvas) {
        this.memory = memory;
        this.display = display;
        this.canvas = canvas;
        this.baseShaderFragString = '';
        this.baseShaderVertString = '';
        this.transformMatrix = mat4.create();
        this.transformMatrix2d = mat4.create();
        this.vertexPool = [];
        this.testCount = 20;
        this.positionData = new FastFloat32Buffer();
        this.colorData = new FastFloat32Buffer();
        this.textureData = new FastFloat32Buffer();
        this.lastBaseAddress = 0;
        this.gl = this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
        if (!this.gl)
            this.canvas.getContext('webgl', { preserveDrawingBuffer: true });

        if (!this.gl) {
            alert("Can't initialize WebGL!");
            throw (new Error("Can't initialize WebGL!"));
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, 0, -0xFFFF);
    }
    WebGlPspDrawDriver.prototype.initAsync = function () {
        var _this = this;
        return downloadFileAsync('shader.vert').then(function (shaderVert) {
            return downloadFileAsync('shader.frag').then(function (shaderFrag) {
                var shaderVertString = Stream.fromArrayBuffer(shaderVert).readUtf8String(shaderVert.byteLength);
                var shaderFragString = Stream.fromArrayBuffer(shaderFrag).readUtf8String(shaderFrag.byteLength);

                _this.cache = new ShaderCache(_this.gl, shaderVertString, shaderFragString);
                _this.textureHandler = new TextureHandler(_this.memory, _this.gl);
            });
        });
    };

    WebGlPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
        this.clearing = clearing;
        this.clearingFlags = flags;
        //console.log('clearing: ' + clearing + '; ' + flags);
    };

    WebGlPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
        this.projectionMatrix = projectionMatrix;
        this.viewMatrix = viewMatrix;
        this.worldMatrix = worldMatrix;

        //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
        mat4.identity(this.transformMatrix);

        mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
        mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
        mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
    };

    WebGlPspDrawDriver.prototype.enableDisable = function (type, enable) {
        if (enable)
            this.gl.enable(type);
        else
            this.gl.disable(type);
        return enable;
    };

    WebGlPspDrawDriver.prototype.setState = function (state) {
        this.state = state;
    };

    WebGlPspDrawDriver.prototype.updateNormalState = function (program, vertexState, primitiveType) {
        var state = this.state;
        var gl = this.gl;

        if (this.enableDisable(gl.CULL_FACE, state.culling.enabled && (primitiveType != 6 /* Sprites */))) {
            gl.cullFace((state.culling.direction == 1 /* ClockWise */) ? gl.FRONT : gl.BACK);
        }

        if (this.enableDisable(gl.SCISSOR_TEST, state.clipPlane.enabled)) {
            var rect = state.clipPlane.scissor;
            var ratio = this.getScaleRatio();
            gl.scissor(rect.left * ratio, rect.top * ratio, rect.width * ratio, rect.height * ratio);
        }

        var blending = state.blending;
        if (this.enableDisable(gl.BLEND, blending.enabled)) {
            var getBlendFix = function (color) {
                if (color.equals(0, 0, 0, 1))
                    return gl.ZERO;
                if (color.equals(1, 1, 1, 1))
                    return gl.ONE;
                return gl.CONSTANT_COLOR;
            };

            var sfactor = gl.SRC_COLOR + blending.functionSource;
            var dfactor = gl.SRC_COLOR + blending.functionDestination;

            if (blending.functionSource == 10 /* GU_FIX */) {
                sfactor = getBlendFix(blending.fixColorSource);
            }

            if (blending.functionDestination == 10 /* GU_FIX */) {
                if ((sfactor == gl.CONSTANT_COLOR) && ((_state.Color.add(blending.fixColorSource, blending.fixColorDestination).equals(1, 1, 1, 1)))) {
                    dfactor = gl.ONE_MINUS_CONSTANT_COLOR;
                } else {
                    dfactor = getBlendFix(blending.fixColorDestination);
                }
            }

            var equationTranslate = [gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD, gl.FUNC_ADD, gl.FUNC_ADD];

            gl.blendEquation(equationTranslate[blending.equation]);
            gl.blendFunc(sfactor, dfactor);
            switch (blending.equation) {
                case 5 /* Abs */:
                case 4 /* Max */:
                case 3 /* Min */:
                case 0 /* Add */:
                    gl.blendEquation(gl.FUNC_ADD);
                    break;
                case 1 /* Substract */:
                    gl.blendEquation(gl.FUNC_SUBTRACT);
                    break;
                case 2 /* ReverseSubstract */:
                    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
                    break;
            }

            var blendColor = blending.fixColorDestination;
            gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendColor.a);
        }

        var stencil = state.stencil;
        if (this.enableDisable(gl.STENCIL_TEST, stencil.enabled)) {
            var opsConvert = [gl.KEEP, gl.ZERO, gl.REPLACE, gl.INVERT, gl.INCR, gl.DECR];
            var funcConvert = [gl.NEVER, gl.ALWAYS, gl.EQUAL, gl.NOTEQUAL, gl.LESS, gl.LEQUAL, gl.GREATER, gl.GEQUAL];
            gl.stencilFunc(funcConvert[stencil.func], stencil.funcRef, stencil.funcMask);
            gl.stencilOp(opsConvert[stencil.fail], opsConvert[stencil.zfail], opsConvert[stencil.zpass]);
        }

        gl.disable(gl.DEPTH_TEST);

        var alphaTest = state.alphaTest;
        if (alphaTest.enabled) {
            //console.log(alphaTest.value);
            //console.log(TestFunctionEnum[alphaTest.func] + '; ' + alphaTest.value + '; ' + alphaTest.mask);
            program.getUniform('alphaTestFunc').set1i(alphaTest.func);
            program.getUniform('alphaTestReference').set1i(alphaTest.value);
            program.getUniform('alphaTestMask').set1i(alphaTest.mask);
        } else {
            //console.warn("alphaTest.enabled = false");
        }

        gl.colorMask(true, true, true, true);
    };

    WebGlPspDrawDriver.prototype.updateClearState = function (program, vertexState, primitiveType) {
        var state = this.state;
        var gl = this.gl;
        var ccolorMask = false, calphaMask = false;
        var clearingFlags = this.clearingFlags;

        //gl.disable(gl.TEXTURE_2D);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(false);

        if (clearingFlags & 1 /* ColorBuffer */) {
            ccolorMask = true;
        }

        if (clearingFlags & 2 /* StencilBuffer */) {
            calphaMask = true;
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.ALWAYS, 0x00, 0xFF);
            gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
        }

        if (clearingFlags & 4 /* DepthBuffer */) {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.ALWAYS);
            gl.depthMask(true);
            gl.depthRange(0, 0);
        }

        gl.colorMask(ccolorMask, ccolorMask, ccolorMask, calphaMask);
    };

    WebGlPspDrawDriver.prototype.updateCommonState = function (program, vertexState, primitiveType) {
        var ratio = this.getScaleRatio();
        this.gl.viewport(this.state.viewPort.x1, this.state.viewPort.y1, this.state.viewPort.width * ratio, this.state.viewPort.height * ratio);
    };

    WebGlPspDrawDriver.prototype.updateState = function (program, vertexState, primitiveType) {
        if (this.state.clearing) {
            this.updateClearState(program, vertexState, primitiveType);
        } else {
            this.updateNormalState(program, vertexState, primitiveType);
        }
        this.updateCommonState(program, vertexState, primitiveType);
    };

    WebGlPspDrawDriver.prototype.getScaleRatio = function () {
        return this.canvas.width / 480;
    };

    WebGlPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
        this.display.setEnabledDisplay(false);

        if (primitiveType == 6 /* Sprites */) {
            return this.drawSprites(vertices, count, vertexState);
        } else {
            return this.drawElementsInternal(primitiveType, primitiveType, vertices, count, vertexState);
        }
    };

    WebGlPspDrawDriver.prototype.textureFlush = function (state) {
        this.textureHandler.flush();
    };

    WebGlPspDrawDriver.prototype.textureSync = function (state) {
        this.textureHandler.sync();
    };

    WebGlPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
        var vertexPool = this.vertexPool;

        while (vertexPool.length < count * 2)
            vertexPool.push(new _state.Vertex());

        var vertexCount = 0;
        var vertices2 = [];

        for (var n = 0; n < count; n += 2) {
            var tl = vertexPool[vertexCount++].copyFrom(vertices[n + 0]);
            var br = vertexPool[vertexCount++].copyFrom(vertices[n + 1]);

            tl.r = br.r;
            tl.g = br.g;
            tl.b = br.b;
            tl.a = br.a;

            var vtr = vertexPool[vertexCount++].copyFrom(tl);
            var vbl = vertexPool[vertexCount++].copyFrom(br);

            vtr.px = br.px;
            vtr.py = tl.py;
            vtr.tx = br.tx;
            vtr.ty = tl.ty;

            vbl.px = tl.px;
            vbl.py = br.py;
            vbl.tx = tl.tx;
            vbl.ty = br.ty;

            vertices2.push(tl, vtr, vbl);
            vertices2.push(vtr, br, vbl);
        }
        this.drawElementsInternal(6 /* Sprites */, 3 /* Triangles */, vertices2, vertices2.length, vertexState);
    };

    WebGlPspDrawDriver.prototype.demuxVertices = function (vertices, count, vertexState, primitiveType) {
        var textureState = this.state.texture;

        this.positionData.restart();
        this.colorData.restart();
        this.textureData.restart();

        var mipmap = this.state.texture.mipmaps[0];

        for (var n = 0; n < count; n++) {
            var v = vertices[n];

            this.positionData.push3(v.px, v.py, v.pz);

            if (vertexState.hasColor) {
                this.colorData.push4(v.r, v.g, v.b, v.a);
            }

            if (vertexState.hasTexture) {
                if (vertexState.transform2D) {
                    this.textureData.push3(v.tx / mipmap.bufferWidth, v.ty / mipmap.textureHeight, 1.0);
                } else {
                    this.textureData.push3(v.tx * textureState.scaleU, v.ty * textureState.scaleV, v.tz);
                }
            }
        }
    };

    WebGlPspDrawDriver.prototype.setProgramParameters = function (gl, program, vertexState) {
        this.usedMatrix = vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix;
        program.getUniform('u_modelViewProjMatrix').setMat4(this.usedMatrix);

        program.getAttrib("vPosition").setFloats(3, this.positionData.slice());
        if (vertexState.hasTexture) {
            program.getUniform('tfx').set1i(this.state.texture.effect);
            program.getUniform('tcc').set1i(this.state.texture.colorComponent);
            program.getAttrib("vTexcoord").setFloats(3, this.textureData.slice());
        }

        if (vertexState.hasColor) {
            program.getAttrib("vColor").setFloats(4, this.colorData.slice());
        } else {
            var ac = this.state.ambientModelColor;

            //console.log(ac.r, ac.g, ac.b, ac.a);
            program.getUniform('uniformColor').set4f(ac.r, ac.g, ac.b, ac.a);
        }
    };

    WebGlPspDrawDriver.prototype.unsetProgramParameters = function (gl, program, vertexState) {
        program.getAttrib("vPosition").disable();
        if (vertexState.hasTexture)
            program.getAttrib("vTexcoord").disable();
        if (vertexState.hasColor)
            program.getAttrib("vColor").disable();
    };

    WebGlPspDrawDriver.prototype.drawArraysActual = function (gl, primitiveType, count) {
        switch (primitiveType) {
            case 0 /* Points */:
                gl.drawArrays(gl.POINTS, 0, count);
                break;
            case 1 /* Lines */:
            case 2 /* LineStrip */:
                gl.lineWidth(this.getScaleRatio());
                if (primitiveType == 1 /* Lines */) {
                    gl.drawArrays(gl.LINES, 0, count);
                } else {
                    gl.drawArrays(gl.LINE_STRIP, 0, count);
                }
                break;
            case 3 /* Triangles */:
                gl.drawArrays(gl.TRIANGLES, 0, count);
                break;
            case 4 /* TriangleStrip */:
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
                break;
            case 5 /* TriangleFan */:
                gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
                break;
        }
    };

    WebGlPspDrawDriver.prototype.prepareTexture = function (gl, program, vertexState) {
        if (vertexState.hasTexture) {
            this.textureHandler.bindTexture(program, this.state);
        } else {
            this.textureHandler.unbindTexture(program, this.state);
        }
    };

    WebGlPspDrawDriver.prototype.drawElementsInternal = function (originalPrimitiveType, primitiveType, vertices, count, vertexState) {
        var gl = this.gl;

        //console.log(primitiveType);
        var program = this.cache.getProgram(vertexState, this.state);
        program.use();
        this.demuxVertices(vertices, count, vertexState, primitiveType);

        this.updateState(program, vertexState, originalPrimitiveType);
        this.setProgramParameters(gl, program, vertexState);

        if (this.clearing) {
            this.textureHandler.unbindTexture(program, this.state);
            /*
            gl.clearColor(0.5, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            return;
            */
        } else {
            this.prepareTexture(gl, program, vertexState);
        }

        this.drawArraysActual(gl, primitiveType, count);
        this.unsetProgramParameters(gl, program, vertexState);
    };
    return WebGlPspDrawDriver;
})();

var ClearBufferSet;
(function (ClearBufferSet) {
    ClearBufferSet[ClearBufferSet["ColorBuffer"] = 1] = "ColorBuffer";
    ClearBufferSet[ClearBufferSet["StencilBuffer"] = 2] = "StencilBuffer";
    ClearBufferSet[ClearBufferSet["DepthBuffer"] = 4] = "DepthBuffer";
    ClearBufferSet[ClearBufferSet["FastClear"] = 16] = "FastClear";
})(ClearBufferSet || (ClearBufferSet = {}));

module.exports = WebGlPspDrawDriver;
//# sourceMappingURL=driver.js.map
},
"src/core/gpu/webgl/shader": function(module, exports, require) {
var _utils = require('./utils');

var WrappedWebGLProgram = _utils.WrappedWebGLProgram;

var ShaderCache = (function () {
    function ShaderCache(gl, shaderVertString, shaderFragString) {
        this.gl = gl;
        this.shaderVertString = shaderVertString;
        this.shaderFragString = shaderFragString;
        this.programs = {};
    }
    ShaderCache.prototype.getProgram = function (vertex, state) {
        var hash = vertex.hash;
        hash += Math.pow(2, 32) * (state.alphaTest.enabled ? 1 : 0);
        hash += Math.pow(2, 33) * (state.clearing ? 1 : 0);
        if (this.programs[hash])
            return this.programs[hash];
        return this.programs[hash] = this.createProgram(vertex, state);
    };

    ShaderCache.prototype.createProgram = function (vertex, state) {
        var defines = [];
        if (vertex.hasColor)
            defines.push('VERTEX_COLOR');
        if (vertex.hasTexture)
            defines.push('VERTEX_TEXTURE');

        if (!state.clearing) {
            if (state.alphaTest.enabled)
                defines.push('ALPHATEST');
        }

        var preppend = defines.map(function (item) {
            return '#define ' + item + ' 1';
        }).join("\n");

        return ShaderCache.shaderProgram(this.gl, preppend + "\n" + this.shaderVertString, preppend + "\n" + this.shaderFragString);
    };

    ShaderCache.shaderProgram = function (gl, vs, fs) {
        var prog = gl.createProgram();
        var addshader = function (type, source) {
            var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s) + "\n\n" + source));
            gl.attachShader(prog, s);
        };
        addshader('vertex', vs);
        addshader('fragment', fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw (new Error("Could not link the shader program!"));
        return new WrappedWebGLProgram(gl, prog, vs, fs);
    };
    return ShaderCache;
})();
exports.ShaderCache = ShaderCache;
//# sourceMappingURL=shader.js.map
},
"src/core/gpu/webgl/texture": function(module, exports, require) {
var _pixelformat = require('../../pixelformat');

var PixelFormatUtils = _pixelformat.PixelFormatUtils;
var PixelConverter = _pixelformat.PixelConverter;

var Texture = (function () {
    function Texture(gl) {
        this.gl = gl;
        this.recheckTimestamp = undefined;
        this.valid = true;
        this.swizzled = false;
        this.texture = gl.createTexture();
    }
    Texture.prototype.setInfo = function (state) {
        var texture = state.texture;
        var mipmap = texture.mipmaps[0];

        this.swizzled = texture.swizzled;
        this.address = mipmap.address;
        this.pixelFormat = texture.pixelFormat;
        this.clutFormat = texture.clut.pixelFormat;
    };

    Texture.prototype._create = function (callbackTex2D) {
        var gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        callbackTex2D();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    Texture.prototype.fromBytes = function (data, width, height) {
        var gl = this.gl;

        this._create(function () {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        });
    };

    Texture.prototype.fromCanvas = function (canvas) {
        var gl = this.gl;

        this._create(function () {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        });
    };

    Texture.prototype.bind = function (textureUnit) {
        var gl = this.gl;

        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    Texture.hashFast = function (state) {
        var result = state.texture.mipmaps[0].address;
        if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
            result += state.texture.clut.adress * Math.pow(2, 23);
        }
        result += (state.texture.swizzled ? 1 : 0) * Math.pow(2, 13);
        return result;
    };

    Texture.hashSlow = function (memory, state) {
        var texture = state.texture;
        var mipmap = texture.mipmaps[0];
        var clut = texture.clut;

        var hash_number = 0;

        hash_number += (texture.swizzled ? 1 : 0) * Math.pow(2, 0);
        hash_number += (texture.pixelFormat) * Math.pow(2, 1);
        hash_number += (mipmap.bufferWidth) * Math.pow(2, 3);
        hash_number += (mipmap.textureWidth) * Math.pow(2, 6);
        hash_number += (mipmap.textureHeight) * Math.pow(2, 8);
        hash_number += memory.hash(mipmap.address, PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)) * Math.pow(2, 12);

        if (PixelFormatUtils.hasClut(texture.pixelFormat)) {
            hash_number += memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)) * Math.pow(2, 30);
            hash_number += clut.info * Math.pow(2, 26);
        }
        return hash_number;
    };

    Texture.prototype.toString = function () {
        var out = '';
        out += 'Texture(address = ' + this.address + ', hash1 = ' + this.hash1 + ', hash2 = ' + this.hash2 + ', pixelFormat = ' + this.pixelFormat + ', swizzled = ' + this.swizzled;
        if (PixelFormatUtils.hasClut(this.pixelFormat)) {
            out += ', clutFormat=' + this.clutFormat;
        }
        out += ')';
        return out;
    };
    return Texture;
})();
exports.Texture = Texture;

var TextureHandler = (function () {
    function TextureHandler(memory, gl) {
        var _this = this;
        this.memory = memory;
        this.gl = gl;
        this.texturesByHash2 = {};
        this.texturesByHash1 = {};
        this.texturesByAddress = {};
        this.recheckTimestamp = 0;
        //private updatedTextures = new SortedSet<Texture>();
        this.invalidatedMemoryFlag = true;
        memory.invalidateDataRange.add(function (range) {
            return _this.invalidatedMemory(range);
        });
    }
    TextureHandler.prototype.flush = function () {
        if (this.lastTexture) {
            //this.lastTexture.valid = false;
        }

        //this.invalidatedMemory({ start: 0, end : 0xFFFFFFFF });
        //this.recheckTimestamp = performance.now();
        /*
        this.updatedTextures.forEach((texture) => {
        texture.valid = false;
        });
        this.updatedTextures = new SortedSet<Texture>();
        */
        if (this.invalidatedMemoryFlag) {
            this.invalidatedMemoryFlag = false;
            this._invalidatedMemory();
        }
    };

    TextureHandler.prototype.sync = function () {
        // sceGuCopyImage
        //this.recheckTimestamp = performance.now();
    };

    TextureHandler.prototype._invalidatedMemory = function () {
        for (var hash1 in this.texturesByHash1) {
            var texture1 = this.texturesByHash1[hash1];
            texture1.valid = false;
        }

        for (var hash2 in this.texturesByHash2) {
            var texture2 = this.texturesByHash2[hash2];
            texture2.valid = false;
        }
    };

    TextureHandler.prototype.invalidatedMemory = function (range) {
        this.invalidatedMemoryFlag = true;
        //this._invalidatedMemory();
        //this._invalidatedMemory();
        //this.recheckTimestamp = performance.now();
        //console.warn('invalidatedMemory: ' + JSON.stringify(range));
    };

    TextureHandler.prototype.mustRecheckSlowHash = function (texture) {
        //return !texture || !texture.valid || this.recheckTimestamp >= texture.recheckTimestamp;
        return !texture || !texture.valid;
    };

    TextureHandler.prototype.bindTexture = function (prog, state) {
        var gl = this.gl;

        var mipmap = state.texture.mipmaps[0];

        var hash1 = Texture.hashFast(state);
        var texture = this.texturesByHash1[hash1];

        //if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
        if (this.mustRecheckSlowHash(texture)) {
            var hash2 = Texture.hashSlow(this.memory, state);

            //console.log(hash);
            texture = this.texturesByHash2[hash2];

            //if (!texture || !texture.valid) {
            if (!texture) {
                if (!this.texturesByAddress[mipmap.address]) {
                    this.texturesByAddress[mipmap.address] = new Texture(gl);
                    console.warn('New texture allocated!', mipmap, state.texture);
                }

                texture = this.texturesByHash2[hash2] = this.texturesByHash1[hash1] = this.texturesByAddress[mipmap.address];

                texture.setInfo(state);
                texture.hash1 = hash1;
                texture.hash2 = hash2;
                texture.valid = true;

                //this.updatedTextures.add(texture);
                texture.recheckTimestamp = this.recheckTimestamp;

                var mipmap = state.texture.mipmaps[0];

                var h = mipmap.textureHeight;
                var w = mipmap.textureWidth;
                var w2 = mipmap.bufferWidth;

                var data2 = new Uint8Array(w2 * h * 4);

                var clut = state.texture.clut;

                if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
                    clut.numberOfColors = Math.max(clut.numberOfColors, clut.mask + 1);
                    //debugger;
                }

                var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
                var paletteU8 = new Uint8Array(paletteBuffer);
                var palette = new Uint32Array(paletteBuffer);

                if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
                    //if (clut.pixelFormat == PixelFormat.RGBA_5551) debugger;
                    PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
                }

                //console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);
                var dataBuffer = new ArrayBuffer(PixelConverter.getSizeInBytes(state.texture.pixelFormat, w2 * h));
                var data = new Uint8Array(dataBuffer);
                data.set(new Uint8Array(this.memory.buffer, mipmap.address, data.length));

                if (state.texture.swizzled) {
                    PixelConverter.unswizzleInline(state.texture.pixelFormat, dataBuffer, 0, w2, h);
                }
                PixelConverter.decode(state.texture.pixelFormat, dataBuffer, 0, data2, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);

                if (true) {
                    texture.fromBytes(data2, w2, h);
                } else {
                    var canvas = document.createElement('canvas');
                    canvas.style.border = '1px solid white';
                    canvas.width = w2;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    var imageData = ctx.createImageData(w2, h);
                    var u8 = imageData.data;

                    ctx.clearRect(0, 0, w, h);
                    for (var n = 0; n < w2 * h * 4; n++)
                        u8[n] = data2[n];
                    ctx.putImageData(imageData, 0, 0);

                    console.error('generated texture!' + texture.toString());
                    $(document.body).append($('<div style="color:white;" />').append(canvas).append(texture.toString() + 'w=' + w + ',w2=' + w2 + ',' + h));
                    texture.fromCanvas(canvas);
                }
            }
        }

        this.lastTexture = texture;

        texture.bind(0);
        prog.getUniform('uSampler').set1i(0);

        prog.getUniform('samplerClut').set1i(1);
    };

    TextureHandler.prototype.unbindTexture = function (program, state) {
        var gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    return TextureHandler;
})();
exports.TextureHandler = TextureHandler;
//# sourceMappingURL=texture.js.map
},
"src/core/gpu/webgl/utils": function(module, exports, require) {
var WrappedWebGLUniform = (function () {
    function WrappedWebGLUniform(gl, program, name) {
        this.gl = gl;
        this.program = program;
        this.name = name;
        this.location = gl.getUniformLocation(program, name);
    }
    WrappedWebGLUniform.prototype.setMat4 = function (data) {
        this.gl.uniformMatrix4fv(this.location, false, data);
    };

    WrappedWebGLUniform.prototype.set1i = function (value) {
        this.gl.uniform1i(this.location, value);
    };

    WrappedWebGLUniform.prototype.set4f = function (x, y, z, w) {
        this.gl.uniform4f(this.location, x, y, z, w);
    };
    return WrappedWebGLUniform;
})();
exports.WrappedWebGLUniform = WrappedWebGLUniform;

var WrappedWebGLAttrib = (function () {
    function WrappedWebGLAttrib(gl, program, name) {
        this.gl = gl;
        this.program = program;
        this.name = name;
        this.location = gl.getAttribLocation(program, name);
    }
    WrappedWebGLAttrib.prototype.enable = function () {
        if (this.location < 0)
            return;
        this.gl.enableVertexAttribArray(this.location);
    };

    WrappedWebGLAttrib.prototype.disable = function () {
        if (this.location < 0)
            return;
        this.gl.disableVertexAttribArray(this.location);
    };

    WrappedWebGLAttrib.prototype.setFloats = function (rsize, arr) {
        if (this.location < 0)
            return;

        var gl = this.gl;
        if (!this.buffer)
            this.buffer = this.gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        this.enable();
        gl.vertexAttribPointer(this.location, rsize, gl.FLOAT, false, 0, 0);
    };
    return WrappedWebGLAttrib;
})();
exports.WrappedWebGLAttrib = WrappedWebGLAttrib;

var WrappedWebGLProgram = (function () {
    function WrappedWebGLProgram(gl, program, vs, fs) {
        this.gl = gl;
        this.program = program;
        this.vs = vs;
        this.fs = fs;
        this.uniforms = {};
        this.attribs = {};
    }
    WrappedWebGLProgram.prototype.use = function () {
        this.gl.useProgram(this.program);
    };

    WrappedWebGLProgram.prototype.getUniform = function (name) {
        var uniform = this.uniforms[name];
        if (!uniform)
            uniform = this.uniforms[name] = new WrappedWebGLUniform(this.gl, this.program, name);
        return uniform;
    };

    WrappedWebGLProgram.prototype.getAttrib = function (name) {
        var attrib = this.attribs[name];
        if (!attrib)
            attrib = this.attribs[name] = new WrappedWebGLAttrib(this.gl, this.program, name);
        return attrib;
    };
    return WrappedWebGLProgram;
})();
exports.WrappedWebGLProgram = WrappedWebGLProgram;

var FastFloat32Buffer = (function () {
    function FastFloat32Buffer() {
        this.arrayBuffer = new ArrayBuffer(32768 * 4 * 4 * 4);
        this.float32Array = new Float32Array(this.arrayBuffer);
        this.index = 0;
    }
    FastFloat32Buffer.prototype.restart = function () {
        this.index = 0;
    };

    FastFloat32Buffer.prototype.push = function (value) {
        this.float32Array[this.index++] = value;
    };

    FastFloat32Buffer.prototype.push2 = function (x, y) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
    };

    FastFloat32Buffer.prototype.push3 = function (x, y, z) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
        this.float32Array[this.index++] = z;
    };

    FastFloat32Buffer.prototype.push4 = function (x, y, z, w) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
        this.float32Array[this.index++] = z;
        this.float32Array[this.index++] = w;
    };

    FastFloat32Buffer.prototype.slice = function () {
        return new Float32Array(this.arrayBuffer, 0, this.index);
    };
    return FastFloat32Buffer;
})();
exports.FastFloat32Buffer = FastFloat32Buffer;
//# sourceMappingURL=utils.js.map
},
"src/core/interrupt": function(module, exports, require) {
var Signal = require('../util/Signal');

var InterruptHandler = (function () {
    function InterruptHandler(no) {
        this.no = no;
        this.enabled = false;
        this.address = 0;
        this.argument = 0;
        this.cpuState = null;
    }
    return InterruptHandler;
})();
exports.InterruptHandler = InterruptHandler;

var InterruptHandlers = (function () {
    function InterruptHandlers(pspInterrupt) {
        this.pspInterrupt = pspInterrupt;
        this.handlers = {};
    }
    InterruptHandlers.prototype.get = function (handlerIndex) {
        if (!this.handlers[handlerIndex])
            this.handlers[handlerIndex] = new InterruptHandler(handlerIndex);
        return this.handlers[handlerIndex];
    };

    InterruptHandlers.prototype.remove = function (handlerIndex) {
        delete this.handlers[handlerIndex];
    };

    InterruptHandlers.prototype.has = function (handlerIndex) {
        return (this.handlers[handlerIndex] !== undefined);
    };
    return InterruptHandlers;
})();
exports.InterruptHandlers = InterruptHandlers;

var InterruptManager = (function () {
    function InterruptManager() {
        this.enabled = true;
        this.flags = 0xFFFFFFFF;
        this.interruptHandlers = {};
        this.event = new Signal();
        this.queue = [];
    }
    InterruptManager.prototype.suspend = function () {
        var currentFlags = this.flags;
        this.flags = 0;
        this.enabled = false;
        return currentFlags;
    };

    InterruptManager.prototype.resume = function (value) {
        this.flags = value;
        this.enabled = true;
    };

    InterruptManager.prototype.get = function (pspInterrupt) {
        if (!this.interruptHandlers[pspInterrupt])
            this.interruptHandlers[pspInterrupt] = new InterruptHandlers(pspInterrupt);
        return this.interruptHandlers[pspInterrupt];
    };

    InterruptManager.prototype.interrupt = function (pspInterrupt) {
        var interrupt = this.get(pspInterrupt);
        var handlers = interrupt.handlers;
        for (var n in handlers) {
            var handler = handlers[n];
            if (handler.enabled) {
                this.queue.push(handler);
                this.execute(null);
            }
        }
    };

    InterruptManager.prototype.execute = function (_state) {
        while (this.queue.length > 0) {
            var item = this.queue.shift();
            var state = item.cpuState;
            state.preserveRegisters(function () {
                state.gpr[4] = item.no;
                state.gpr[5] = item.argument;
                state.callPCSafe(item.address);
            });
        }
        //state.callPCSafe();
    };
    return InterruptManager;
})();
exports.InterruptManager = InterruptManager;

(function (PspInterrupts) {
    PspInterrupts[PspInterrupts["PSP_GPIO_INT"] = 4] = "PSP_GPIO_INT";
    PspInterrupts[PspInterrupts["PSP_ATA_INT"] = 5] = "PSP_ATA_INT";
    PspInterrupts[PspInterrupts["PSP_UMD_INT"] = 6] = "PSP_UMD_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM0_INT"] = 7] = "PSP_MSCM0_INT";
    PspInterrupts[PspInterrupts["PSP_WLAN_INT"] = 8] = "PSP_WLAN_INT";
    PspInterrupts[PspInterrupts["PSP_AUDIO_INT"] = 10] = "PSP_AUDIO_INT";
    PspInterrupts[PspInterrupts["PSP_I2C_INT"] = 12] = "PSP_I2C_INT";
    PspInterrupts[PspInterrupts["PSP_SIRCS_INT"] = 14] = "PSP_SIRCS_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER0_INT"] = 15] = "PSP_SYSTIMER0_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER1_INT"] = 16] = "PSP_SYSTIMER1_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER2_INT"] = 17] = "PSP_SYSTIMER2_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER3_INT"] = 18] = "PSP_SYSTIMER3_INT";
    PspInterrupts[PspInterrupts["PSP_THREAD0_INT"] = 19] = "PSP_THREAD0_INT";
    PspInterrupts[PspInterrupts["PSP_NAND_INT"] = 20] = "PSP_NAND_INT";
    PspInterrupts[PspInterrupts["PSP_DMACPLUS_INT"] = 21] = "PSP_DMACPLUS_INT";
    PspInterrupts[PspInterrupts["PSP_DMA0_INT"] = 22] = "PSP_DMA0_INT";
    PspInterrupts[PspInterrupts["PSP_DMA1_INT"] = 23] = "PSP_DMA1_INT";
    PspInterrupts[PspInterrupts["PSP_MEMLMD_INT"] = 24] = "PSP_MEMLMD_INT";
    PspInterrupts[PspInterrupts["PSP_GE_INT"] = 25] = "PSP_GE_INT";
    PspInterrupts[PspInterrupts["PSP_VBLANK_INT"] = 30] = "PSP_VBLANK_INT";
    PspInterrupts[PspInterrupts["PSP_MECODEC_INT"] = 31] = "PSP_MECODEC_INT";
    PspInterrupts[PspInterrupts["PSP_HPREMOTE_INT"] = 36] = "PSP_HPREMOTE_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM1_INT"] = 60] = "PSP_MSCM1_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM2_INT"] = 61] = "PSP_MSCM2_INT";
    PspInterrupts[PspInterrupts["PSP_THREAD1_INT"] = 65] = "PSP_THREAD1_INT";
    PspInterrupts[PspInterrupts["PSP_INTERRUPT_INT"] = 66] = "PSP_INTERRUPT_INT";
    PspInterrupts[PspInterrupts["PSP_NUMBER_INTERRUPTS"] = 67] = "PSP_NUMBER_INTERRUPTS";
})(exports.PspInterrupts || (exports.PspInterrupts = {}));
var PspInterrupts = exports.PspInterrupts;
//# sourceMappingURL=interrupt.js.map
},
"src/core/kirk": function(module, exports, require) {
var _kirk = require('./kirk/kirk');
_kirk.CMD7;
var KIRK_AES128CBC_HEADER = _kirk.KIRK_AES128CBC_HEADER;
exports.KIRK_AES128CBC_HEADER = KIRK_AES128CBC_HEADER;
var KirkMode = _kirk.KirkMode;
exports.KirkMode = KirkMode;
var CMD7 = _kirk.CMD7;
exports.CMD7 = CMD7;
var decryptAes128CbcWithKey = _kirk.decryptAes128CbcWithKey;
exports.decryptAes128CbcWithKey = decryptAes128CbcWithKey;
//# sourceMappingURL=kirk.js.map
},
"src/core/kirk/crypto": function(module, exports, require) {
function cryptoToArray(info) {
    var words = info.words;
    var wordsLen = words.length;
    var data = new Uint8Array(wordsLen * 4);
    var m = 0;
    for (var n = 0; n < wordsLen; n++) {
        data[m++] = (words[n] >>> 24) & 0xFF;
        data[m++] = (words[n] >>> 16) & 0xFF;
        data[m++] = (words[n] >>> 8) & 0xFF;
        data[m++] = (words[n] >>> 0) & 0xFF;
    }
    return data;
}

function fromCryptoArray(uint8View) {
    return CryptoJS.lib.WordArray.create(uint8View);
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, buf);
}

function ab2hex(buf) {
    var parts = [];
    for (var n = 0; n < buf.length; n++) {
        var chunk = buf[n].toString(16);
        while (chunk.length < 2)
            chunk = '0' + chunk;
        parts.push(chunk);
    }
    return parts.join('');
}

function str2ab(str) {
    var bufView = new Uint8Array(str.length);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}

function md5(data) {
    return cryptoToArray(CryptoJS.MD5(fromCryptoArray(data)));
}
exports.md5 = md5;

function sha1(data) {
    return cryptoToArray(CryptoJS.SHA1(fromCryptoArray(data)));
}
exports.sha1 = sha1;

function aes_encrypt(data, key, iv) {
    var info = { mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.AnsiX923 };
    if (iv !== undefined)
        info['iv'] = fromCryptoArray(iv);
    return cryptoToArray(CryptoJS.AES.encrypt(fromCryptoArray(data), fromCryptoArray(key), info));
}
exports.aes_encrypt = aes_encrypt;

function aes_decrypt(data, key, iv) {
    var info = {};
    if (iv !== undefined)
        info['iv'] = fromCryptoArray(iv);
    return cryptoToArray(CryptoJS.AES.decrypt(fromCryptoArray(data), fromCryptoArray(key), info));
}
exports.aes_decrypt = aes_decrypt;

console.log(ab2hex(exports.md5(str2ab('hello'))));
console.log(ab2hex(exports.sha1(str2ab('hello'))));
//# sourceMappingURL=crypto.js.map
},
"src/core/kirk/kirk": function(module, exports, require) {
var crypto = require('./crypto');

var kirk1_key = new Uint8Array([0x98, 0xC9, 0x40, 0x97, 0x5C, 0x1D, 0x10, 0xE8, 0x7F, 0xE6, 0x0E, 0xA3, 0xFD, 0x03, 0xA8, 0xBA]);
var kirk7_key02 = new Uint8Array([0xB8, 0x13, 0xC3, 0x5E, 0xC6, 0x44, 0x41, 0xE3, 0xDC, 0x3C, 0x16, 0xF5, 0xB4, 0x5E, 0x64, 0x84]);
var kirk7_key03 = new Uint8Array([0x98, 0x02, 0xC4, 0xE6, 0xEC, 0x9E, 0x9E, 0x2F, 0xFC, 0x63, 0x4C, 0xE4, 0x2F, 0xBB, 0x46, 0x68]);
var kirk7_key04 = new Uint8Array([0x99, 0x24, 0x4C, 0xD2, 0x58, 0xF5, 0x1B, 0xCB, 0xB0, 0x61, 0x9C, 0xA7, 0x38, 0x30, 0x07, 0x5F]);
var kirk7_key05 = new Uint8Array([0x02, 0x25, 0xD7, 0xBA, 0x63, 0xEC, 0xB9, 0x4A, 0x9D, 0x23, 0x76, 0x01, 0xB3, 0xF6, 0xAC, 0x17]);
var kirk7_key07 = new Uint8Array([0x76, 0x36, 0x8B, 0x43, 0x8F, 0x77, 0xD8, 0x7E, 0xFE, 0x5F, 0xB6, 0x11, 0x59, 0x39, 0x88, 0x5C]);
var kirk7_key0C = new Uint8Array([0x84, 0x85, 0xC8, 0x48, 0x75, 0x08, 0x43, 0xBC, 0x9B, 0x9A, 0xEC, 0xA7, 0x9C, 0x7F, 0x60, 0x18]);
var kirk7_key0D = new Uint8Array([0xB5, 0xB1, 0x6E, 0xDE, 0x23, 0xA9, 0x7B, 0x0E, 0xA1, 0x7C, 0xDB, 0xA2, 0xDC, 0xDE, 0xC4, 0x6E]);
var kirk7_key0E = new Uint8Array([0xC8, 0x71, 0xFD, 0xB3, 0xBC, 0xC5, 0xD2, 0xF2, 0xE2, 0xD7, 0x72, 0x9D, 0xDF, 0x82, 0x68, 0x82]);
var kirk7_key0F = new Uint8Array([0x0A, 0xBB, 0x33, 0x6C, 0x96, 0xD4, 0xCD, 0xD8, 0xCB, 0x5F, 0x4B, 0xE0, 0xBA, 0xDB, 0x9E, 0x03]);
var kirk7_key10 = new Uint8Array([0x32, 0x29, 0x5B, 0xD5, 0xEA, 0xF7, 0xA3, 0x42, 0x16, 0xC8, 0x8E, 0x48, 0xFF, 0x50, 0xD3, 0x71]);
var kirk7_key11 = new Uint8Array([0x46, 0xF2, 0x5E, 0x8E, 0x4D, 0x2A, 0xA5, 0x40, 0x73, 0x0B, 0xC4, 0x6E, 0x47, 0xEE, 0x6F, 0x0A]);
var kirk7_key12 = new Uint8Array([0x5D, 0xC7, 0x11, 0x39, 0xD0, 0x19, 0x38, 0xBC, 0x02, 0x7F, 0xDD, 0xDC, 0xB0, 0x83, 0x7D, 0x9D]);
var kirk7_key38 = new Uint8Array([0x12, 0x46, 0x8D, 0x7E, 0x1C, 0x42, 0x20, 0x9B, 0xBA, 0x54, 0x26, 0x83, 0x5E, 0xB0, 0x33, 0x03]);
var kirk7_key39 = new Uint8Array([0xC4, 0x3B, 0xB6, 0xD6, 0x53, 0xEE, 0x67, 0x49, 0x3E, 0xA9, 0x5F, 0xBC, 0x0C, 0xED, 0x6F, 0x8A]);
var kirk7_key3A = new Uint8Array([0x2C, 0xC3, 0xCF, 0x8C, 0x28, 0x78, 0xA5, 0xA6, 0x63, 0xE2, 0xAF, 0x2D, 0x71, 0x5E, 0x86, 0xBA]);
var kirk7_key44 = new Uint8Array([0x7D, 0xF4, 0x92, 0x65, 0xE3, 0xFA, 0xD6, 0x78, 0xD6, 0xFE, 0x78, 0xAD, 0xBB, 0x3D, 0xFB, 0x63]);
var kirk7_key4B = new Uint8Array([0x0C, 0xFD, 0x67, 0x9A, 0xF9, 0xB4, 0x72, 0x4F, 0xD7, 0x8D, 0xD6, 0xE9, 0x96, 0x42, 0x28, 0x8B]);
var kirk7_key53 = new Uint8Array([0xAF, 0xFE, 0x8E, 0xB1, 0x3D, 0xD1, 0x7E, 0xD8, 0x0A, 0x61, 0x24, 0x1C, 0x95, 0x92, 0x56, 0xB6]);
var kirk7_key57 = new Uint8Array([0x1C, 0x9B, 0xC4, 0x90, 0xE3, 0x06, 0x64, 0x81, 0xFA, 0x59, 0xFD, 0xB6, 0x00, 0xBB, 0x28, 0x70]);
var kirk7_key5D = new Uint8Array([0x11, 0x5A, 0x5D, 0x20, 0xD5, 0x3A, 0x8D, 0xD3, 0x9C, 0xC5, 0xAF, 0x41, 0x0F, 0x0F, 0x18, 0x6F]);
var kirk7_key63 = new Uint8Array([0x9C, 0x9B, 0x13, 0x72, 0xF8, 0xC6, 0x40, 0xCF, 0x1C, 0x62, 0xF5, 0xD5, 0x92, 0xDD, 0xB5, 0x82]);
var kirk7_key64 = new Uint8Array([0x03, 0xB3, 0x02, 0xE8, 0x5F, 0xF3, 0x81, 0xB1, 0x3B, 0x8D, 0xAA, 0x2A, 0x90, 0xFF, 0x5E, 0x61]);

var kirk16_key = new Uint8Array([0x47, 0x5E, 0x09, 0xF4, 0xA2, 0x37, 0xDA, 0x9B, 0xEF, 0xFF, 0x3B, 0xC0, 0x77, 0x14, 0x3D, 0x8A]);

// ECC Curves for Kirk 1 and Kirk 0x11
// Common Curve paramters p and a
var ec_p = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
var ec_a = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFC]);

// Kirk 0xC,0xD,0x10,0x11,(likely 0x12)- Unique curve parameters for b, N, and base point G for Kirk 0xC,0xD,0x10,0x11,(likely 0x12) service
// Since public key is variable, it is not specified here
var ec_b2 = new Uint8Array([0xA6, 0x8B, 0xED, 0xC3, 0x34, 0x18, 0x02, 0x9C, 0x1D, 0x3C, 0xE3, 0x3B, 0x9A, 0x32, 0x1F, 0xCC, 0xBB, 0x9E, 0x0F, 0x0B]);
var ec_N2 = new Uint8Array([0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFE, 0xFF, 0xFF, 0xB5, 0xAE, 0x3C, 0x52, 0x3E, 0x63, 0x94, 0x4F, 0x21, 0x27]);
var Gx2 = new Uint8Array([0x12, 0x8E, 0xC4, 0x25, 0x64, 0x87, 0xFD, 0x8F, 0xDF, 0x64, 0xE2, 0x43, 0x7B, 0xC0, 0xA1, 0xF6, 0xD5, 0xAF, 0xDE, 0x2C]);
var Gy2 = new Uint8Array([0x59, 0x58, 0x55, 0x7E, 0xB1, 0xDB, 0x00, 0x12, 0x60, 0x42, 0x55, 0x24, 0xDB, 0xC3, 0x79, 0xD5, 0xAC, 0x5F, 0x4A, 0xDF]);

// KIRK 1 - Unique curve parameters for b, N, and base point G
// Since public key is hard coded, it is also included
var ec_b1 = new Uint8Array([0x65, 0xD1, 0x48, 0x8C, 0x03, 0x59, 0xE2, 0x34, 0xAD, 0xC9, 0x5B, 0xD3, 0x90, 0x80, 0x14, 0xBD, 0x91, 0xA5, 0x25, 0xF9]);
var ec_N1 = new Uint8Array([0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x01, 0xB5, 0xC6, 0x17, 0xF2, 0x90, 0xEA, 0xE1, 0xDB, 0xAD, 0x8F]);
var Gx1 = new Uint8Array([0x22, 0x59, 0xAC, 0xEE, 0x15, 0x48, 0x9C, 0xB0, 0x96, 0xA8, 0x82, 0xF0, 0xAE, 0x1C, 0xF9, 0xFD, 0x8E, 0xE5, 0xF8, 0xFA]);
var Gy1 = new Uint8Array([0x60, 0x43, 0x58, 0x45, 0x6D, 0x0A, 0x1C, 0xB2, 0x90, 0x8D, 0xE9, 0x0F, 0x27, 0xD7, 0x5C, 0x82, 0xBE, 0xC1, 0x08, 0xC0]);
var Px1 = new Uint8Array([0xED, 0x9C, 0xE5, 0x82, 0x34, 0xE6, 0x1A, 0x53, 0xC6, 0x85, 0xD6, 0x4D, 0x51, 0xD0, 0x23, 0x6B, 0xC3, 0xB5, 0xD4, 0xB9]);
var Py1 = new Uint8Array([0x04, 0x9D, 0xF1, 0xA0, 0x75, 0xC0, 0xE0, 0x4F, 0xB3, 0x44, 0x85, 0x8B, 0x61, 0xB7, 0x9B, 0x69, 0xA6, 0x3D, 0x2C, 0x39]);

// ------------------------- KEY VAULT END -------------------------
// ------------------------- INTERNAL STUFF -------------------------
(function (KirkMode) {
    KirkMode[KirkMode["Cmd1"] = 1] = "Cmd1";
    KirkMode[KirkMode["Cmd2"] = 2] = "Cmd2";
    KirkMode[KirkMode["Cmd3"] = 3] = "Cmd3";
    KirkMode[KirkMode["EncryptCbc"] = 4] = "EncryptCbc";
    KirkMode[KirkMode["DecryptCbc"] = 5] = "DecryptCbc";
})(exports.KirkMode || (exports.KirkMode = {}));
var KirkMode = exports.KirkMode;

var KIRK_AES128CBC_HEADER = (function () {
    function KIRK_AES128CBC_HEADER() {
        this.mode = 0;
        this.unk_4 = 0;
        this.unk_8 = 0;
        this.keyseed = 0;
        this.data_size = 0;
    }
    KIRK_AES128CBC_HEADER.struct = StructClass.create(KIRK_AES128CBC_HEADER, [
        { mode: Int32 },
        { unk_4: Int32 },
        { unk_8: Int32 },
        { keyseed: Int32 },
        { data_size: Int32 }
    ]);
    return KIRK_AES128CBC_HEADER;
})();
exports.KIRK_AES128CBC_HEADER = KIRK_AES128CBC_HEADER;

//interface KIRK_CMD1_HEADER
//{
//	/*
//	u8  AES_key[16];            //0
//	u8  CMAC_key[16];           //10
//	u8  CMAC_header_hash[16];   //20
//	u8  CMAC_data_hash[16];     //30
//	u8  unused[32];             //40
//	u32 mode;                   //60
//	u8  ecdsa_hash;             //64
//	u8  unk3[11];               //65
//	u32 data_size;              //70
//	u32 data_offset;            //74
//	u8  unk4[8];                //78
//	u8  unk5[16];               //80
//	//0x90
//	*/
//}
//
////typedef struct blah
////{
////  u8 fuseid[8]; //0
////  u8 mesh[0x40];  //0x8
////} kirk16_data; //0x48
////
////typedef struct header_keys
////{
////  u8 AES[16];
////  u8 CMAC[16];
////} header_keys;  //small struct for temporary keeping AES & CMAC key from CMD1 header
////
////
////u32 g_fuse90;  // This is to match FuseID HW at BC100090 and BC100094
////u32 g_fuse94;
////
////AES_ctx aes_kirk1; //global
//var PRNG_DATA = new Uint8Array(0x14);
//
//var is_kirk_initialized:number; //"init" emulation
//
///* ------------------------- INTERNAL STUFF END ------------------------- */
//
//
///* ------------------------- IMPLEMENTATION ------------------------- */
//
//function kirk_CMD0(outbuff: Uint8Array, inbuff: Uint8Array, size: number, generate_trash: number)
//{
//	KIRK_CMD1_HEADER * header = (KIRK_CMD1_HEADER*) outbuff;
//	header_keys * keys = (header_keys *) outbuff; //0-15 AES key, 16-31 CMAC key
//	var chk_size = 0;
//	AES_ctx k1;
//	AES_ctx cmac_key;
//	u8 cmac_header_hash[16];
//	u8 cmac_data_hash[16];
//
//	if (is_kirk_initialized == 0) return KIRK_NOT_INITIALIZED;
//
//	memcpy(outbuff, inbuff, size);
//
//	if (header- > mode != KIRK_MODE_CMD1) return KIRK_INVALID_MODE;
//
//	//FILL PREDATA WITH RANDOM DATA
//	if (generate_trash) kirk_CMD14(outbuff + sizeof(KIRK_CMD1_HEADER), header- > data_offset);
//
//	//Make sure data is 16 aligned
//	chk_size = header- > data_size;
//	if (chk_size % 16) chk_size += 16 - (chk_size % 16);
//
//	//ENCRYPT DATA
//	AES_set_key(&k1, keys- > AES, 128);
//	AES_cbc_encrypt(&k1, inbuff + sizeof(KIRK_CMD1_HEADER) + header- > data_offset, (u8*) outbuff + sizeof(KIRK_CMD1_HEADER) + header- > data_offset, chk_size);
//
//	//CMAC HASHES
//	AES_set_key(&cmac_key, keys- > CMAC, 128);
//	AES_CMAC(&cmac_key, outbuff + 0x60, 0x30, cmac_header_hash);
//	AES_CMAC(&cmac_key, outbuff + 0x60, 0x30 + chk_size + header- > data_offset, cmac_data_hash);
//
//	memcpy(header- > CMAC_header_hash, cmac_header_hash, 16);
//	memcpy(header- > CMAC_data_hash, cmac_data_hash, 16);
//
//	//ENCRYPT KEYS
//	AES_cbc_encrypt(&aes_kirk1, inbuff, outbuff, 16 * 2);
//	return KIRK_OPERATION_SUCCESS;
//}
//
//function kirk_CMD1(u8 * outbuff, u8 * inbuff, int size)
//{
//	KIRK_CMD1_HEADER * header = (KIRK_CMD1_HEADER*) inbuff;
//  header_keys keys; //0-15 AES key, 16-31 CMAC key
//  AES_ctx k1;
//
//	if (size < 0x90) return KIRK_INVALID_SIZE;
//	if (is_kirk_initialized == 0) return KIRK_NOT_INITIALIZED;
//	if (header- > mode != KIRK_MODE_CMD1) return KIRK_INVALID_MODE;
//
//	AES_cbc_decrypt(&aes_kirk1, inbuff, (u8*) & keys, 16 * 2); //decrypt AES & CMAC key to temp buffer
//
//	if (header- > ecdsa_hash == 1) {
//        SHA_CTX sha;
//		KIRK_CMD1_ECDSA_HEADER * eheader = (KIRK_CMD1_ECDSA_HEADER*) inbuff;
//        u8 kirk1_pub[40];
//        u8 header_hash[20];u8 data_hash[20];
//		ecdsa_set_curve(ec_p, ec_a, ec_b1, ec_N1, Gx1, Gy1);
//		memcpy(kirk1_pub, Px1, 20);
//		memcpy(kirk1_pub + 20, Py1, 20);
//		ecdsa_set_pub(kirk1_pub);
//		//Hash the Header
//		SHAInit(&sha);
//		SHAUpdate(&sha, (u8*) eheader + 0x60, 0x30);
//		SHAFinal(header_hash, &sha);
//
//		if (!ecdsa_verify(header_hash,eheader- > header_sig_r,eheader- > header_sig_s)) {
//			return KIRK_HEADER_HASH_INVALID;
//		}
//		SHAInit(&sha);
//		SHAUpdate(&sha, (u8*) eheader + 0x60, size - 0x60);
//		SHAFinal(data_hash, &sha);
//
//		if (!ecdsa_verify(data_hash,eheader- > data_sig_r,eheader- > data_sig_s)) {
//			return KIRK_DATA_HASH_INVALID;
//		}
//
//	} else {
//    int ret = kirk_CMD10(inbuff, size);
//		if (ret != KIRK_OPERATION_SUCCESS) return ret;
//	}
//
//	AES_set_key(&k1, keys.AES, 128);
//	AES_cbc_decrypt(&k1, inbuff + sizeof(KIRK_CMD1_HEADER) + header- > data_offset, outbuff, header- > data_size);
//
//	return KIRK_OPERATION_SUCCESS;
//}
//
//function kirk_CMD4(u8 * outbuff, u8 * inbuff, int size)
//{
//	KIRK_AES128CBC_HEADER * header = (KIRK_AES128CBC_HEADER*) inbuff;
//	u8 * key;
//  AES_ctx aesKey;
//
//	if (is_kirk_initialized == 0) return KIRK_NOT_INITIALIZED;
//	if (header- > mode != KIRK_MODE_ENCRYPT_CBC) return KIRK_INVALID_MODE;
//	if (header- > data_size == 0) return KIRK_DATA_SIZE_ZERO;
//
//	key = kirk_4_7_get_key(header- > keyseed);
//  if(key == (u8*)KIRK_INVALID_SIZE) return KIRK_INVALID_SIZE;
//
//	//Set the key
//	AES_set_key(&aesKey, key, 128);
//	AES_cbc_encrypt(&aesKey, inbuff + sizeof(KIRK_AES128CBC_HEADER), outbuff + sizeof(KIRK_AES128CBC_HEADER), size);
//
//	return KIRK_OPERATION_SUCCESS;
//}
//
function decryptAes128CbcWithKey(data, keyIndex) {
    return crypto.aes_decrypt(data, kirk_4_7_get_key(keyIndex));
}
exports.decryptAes128CbcWithKey = decryptAes128CbcWithKey;

function CMD7(inbuff) {
    var inbuffStream = Stream.fromUint8Array(inbuff);
    var header = KIRK_AES128CBC_HEADER.struct.read(inbuffStream);

    if (header.mode != 5 /* DecryptCbc */)
        throw (new Error("Kirk Invalid mode '" + header.mode + "'"));
    if (header.data_size == 0)
        throw (new Error("Kirk data size == 0"));

    return exports.decryptAes128CbcWithKey(inbuff.subarray(KIRK_AES128CBC_HEADER.length), header.keyseed);
}
exports.CMD7 = CMD7;

//
//function kirk_CMD10(u8 * inbuff, int insize)
//{
//	KIRK_CMD1_HEADER * header = (KIRK_CMD1_HEADER*) inbuff;
//  header_keys keys; //0-15 AES key, 16-31 CMAC key
//  u8 cmac_header_hash[16];
//  u8 cmac_data_hash[16];
//  AES_ctx cmac_key;
//  int chk_size;
//
//	if (is_kirk_initialized == 0) return KIRK_NOT_INITIALIZED;
//	if (!(header- > mode == KIRK_MODE_CMD1 || header- > mode == KIRK_MODE_CMD2 || header- > mode == KIRK_MODE_CMD3)) return KIRK_INVALID_MODE;
//	if (header- > data_size == 0) return KIRK_DATA_SIZE_ZERO;
//
//	if (header- > mode == KIRK_MODE_CMD1) {
//		AES_cbc_decrypt(&aes_kirk1, inbuff, (u8*) & keys, 32); //decrypt AES & CMAC key to temp buffer
//		AES_set_key(&cmac_key, keys.CMAC, 128);
//		AES_CMAC(&cmac_key, inbuff + 0x60, 0x30, cmac_header_hash);
//
//		//Make sure data is 16 aligned
//		chk_size = header- > data_size;
//		if (chk_size % 16) chk_size += 16 - (chk_size % 16);
//		AES_CMAC(&cmac_key, inbuff + 0x60, 0x30 + chk_size + header- > data_offset, cmac_data_hash);
//
//		if (memcmp(cmac_header_hash, header- > CMAC_header_hash, 16) != 0) return KIRK_HEADER_HASH_INVALID;
//		if (memcmp(cmac_data_hash, header- > CMAC_data_hash, 16) != 0) return KIRK_DATA_HASH_INVALID;
//
//		return KIRK_OPERATION_SUCCESS;
//	}
//	return KIRK_SIG_CHECK_INVALID; //Checks for cmd 2 & 3 not included right now
//}
//
//function kirk_CMD11(u8 * outbuff, u8 * inbuff, int size)
//{
//	KIRK_SHA1_HEADER * header = (KIRK_SHA1_HEADER *) inbuff;
//  SHA_CTX sha;
//	if (is_kirk_initialized == 0) return KIRK_NOT_INITIALIZED;
//	if (header- > data_size == 0 || size == 0) return KIRK_DATA_SIZE_ZERO;
//
//	SHAInit(&sha);
//	SHAUpdate(&sha, inbuff + sizeof(KIRK_SHA1_HEADER), header- > data_size);
//	SHAFinal(outbuff, &sha);
//	return KIRK_OPERATION_SUCCESS;
//}
//
//// Generate an ECDSA Key pair
//// offset 0 = private key (0x14 len)
//// offset 0x14 = public key point (0x28 len)
//function kirk_CMD12(u8 * outbuff, int outsize) {
//  u8 k[0x15];
//	KIRK_CMD12_BUFFER * keypair = (KIRK_CMD12_BUFFER *) outbuff;
//
//	if (outsize != 0x3C) return KIRK_INVALID_SIZE;
//	ecdsa_set_curve(ec_p, ec_a, ec_b2, ec_N2, Gx2, Gy2);
//	k[0] = 0;
//	kirk_CMD14(k + 1, 0x14);
//	ec_priv_to_pub(k, (u8*)keypair- > public_key.x);
//	memcpy(keypair- > private_key, k + 1, 0x14);
//
//	return KIRK_OPERATION_SUCCESS;
//}
//// Point multiplication
//// offset 0 = mulitplication value (0x14 len)
//// offset 0x14 = point to multiply (0x28 len)
//function kirk_CMD13(u8 * outbuff, int outsize, u8 * inbuff, int insize) {
//  u8 k[0x15];
//	KIRK_CMD13_BUFFER * pointmult = (KIRK_CMD13_BUFFER *) inbuff;
//	k[0] = 0;
//	if (outsize != 0x28) return KIRK_INVALID_SIZE;
//	if (insize != 0x3C) return KIRK_INVALID_SIZE;
//	ecdsa_set_curve(ec_p, ec_a, ec_b2, ec_N2, Gx2, Gy2);
//	ecdsa_set_pub((u8*)pointmult- > public_key.x);
//	memcpy(k + 1,pointmult- > multiplier, 0x14);
//	ec_pub_mult(k, outbuff);
//	return KIRK_OPERATION_SUCCESS;
//}
//
//function kirk_CMD14(u8 * outbuff, int outsize) {
//  u8 temp[0x104];
//	KIRK_SHA1_HEADER * header = (KIRK_SHA1_HEADER *) temp;
//
//  // Some randomly selected data for a "key" to add to each randomization
//  u8 key[0x10] = { 0xA7, 0x2E, 0x4C, 0xB6, 0xC3, 0x34, 0xDF, 0x85, 0x70, 0x01, 0x49, 0xFC, 0xC0, 0x87, 0xC4, 0x77 };
//  u32 curtime;
//	//if(outsize != 0x14) return KIRK_INVALID_SIZE; // Need real error code
//	if (outsize <= 0) return KIRK_OPERATION_SUCCESS;
//
//	memcpy(temp + 4, PRNG_DATA, 0x14);
//	// This uses the standard C time function for portability.
//	curtime = (u32) time(0);
//	temp[0x18] = curtime & 0xFF;
//	temp[0x19] = (curtime >> 8) & 0xFF;
//	temp[0x1A] = (curtime >> 16) & 0xFF;
//	temp[0x1B] = (curtime >> 24) & 0xFF;
//	memcpy(&temp[0x1C], key, 0x10);
//  //This leaves the remainder of the 0x100 bytes in temp to whatever remains on the stack
//  // in an uninitialized state. This should add unpredicableness to the results as well
//  header- > data_size = 0x100;
//	kirk_CMD11(PRNG_DATA, temp, 0x104);
//	while (outsize) {
//    int blockrem = outsize % 0x14;
//    int block = outsize / 0x14;
//
//		if (block) {
//			memcpy(outbuff, PRNG_DATA, 0x14);
//			outbuff += 0x14;
//			outsize -= 0x14;
//			kirk_CMD14(outbuff, outsize);
//		} else {
//			if (blockrem) {
//				memcpy(outbuff, PRNG_DATA, blockrem);
//				outsize -= blockrem;
//			}
//		}
//
//	}
//	return KIRK_OPERATION_SUCCESS;
//}
//
//function decrypt_kirk16_private(u8 * dA_out, u8 * dA_enc)
//{
//  int i, k;
//  kirk16_data keydata;
//  u8 subkey_1[0x10], subkey_2[0x10];
//  rijndael_ctx aes_ctx;
//
//	keydata.fuseid[7] = g_fuse90 & 0xFF;
//	keydata.fuseid[6] = (g_fuse90 >> 8) & 0xFF;
//	keydata.fuseid[5] = (g_fuse90 >> 16) & 0xFF;
//	keydata.fuseid[4] = (g_fuse90 >> 24) & 0xFF;
//	keydata.fuseid[3] = g_fuse94 & 0xFF;
//	keydata.fuseid[2] = (g_fuse94 >> 8) & 0xFF;
//	keydata.fuseid[1] = (g_fuse94 >> 16) & 0xFF;
//	keydata.fuseid[0] = (g_fuse94 >> 24) & 0xFF;
//
//	/* set encryption key */
//	rijndael_set_key(&aes_ctx, kirk16_key, 128);
//
//	/* set the subkeys */
//	for (i = 0; i < 0x10; i++) {
//		/* set to the fuseid */
//		subkey_2[i] = subkey_1[i] = keydata.fuseid[i % 8];
//	}
//
//	/* do aes crypto */
//	for (i = 0; i < 3; i++) {
//		/* encrypt + decrypt */
//		rijndael_encrypt(&aes_ctx, subkey_1, subkey_1);
//		rijndael_decrypt(&aes_ctx, subkey_2, subkey_2);
//	}
//
//	/* set new key */
//	rijndael_set_key(&aes_ctx, subkey_1, 128);
//
//	/* now lets make the key mesh */
//	for (i = 0; i < 3; i++) {
//		/* do encryption in group of 3 */
//		for (k = 0; k < 3; k++) {
//			/* crypto */
//			rijndael_encrypt(&aes_ctx, subkey_2, subkey_2);
//		}
//
//		/* copy to out block */
//		memcpy(&keydata.mesh[i * 0x10], subkey_2, 0x10);
//	}
//
//	/* set the key to the mesh */
//	rijndael_set_key(&aes_ctx, &keydata.mesh[0x20], 128);
//
//	/* do the encryption routines for the aes key */
//	for (i = 0; i < 2; i++) {
//		/* encrypt the data */
//		rijndael_encrypt(&aes_ctx, &keydata.mesh[0x10], &keydata.mesh[0x10]);
//	}
//
//	/* set the key to that mesh shit */
//	rijndael_set_key(&aes_ctx, &keydata.mesh[0x10], 128);
//
//	/* cbc decrypt the dA */
//	AES_cbc_decrypt((AES_ctx *) & aes_ctx, dA_enc, dA_out, 0x20);
//}
//
//function encrypt_kirk16_private(u8 * dA_out, u8 * dA_dec)
//{
//  int i, k;
//  kirk16_data keydata;
//  u8 subkey_1[0x10], subkey_2[0x10];
//  rijndael_ctx aes_ctx;
//
//
//	keydata.fuseid[7] = g_fuse90 & 0xFF;
//	keydata.fuseid[6] = (g_fuse90 >> 8) & 0xFF;
//	keydata.fuseid[5] = (g_fuse90 >> 16) & 0xFF;
//	keydata.fuseid[4] = (g_fuse90 >> 24) & 0xFF;
//	keydata.fuseid[3] = g_fuse94 & 0xFF;
//	keydata.fuseid[2] = (g_fuse94 >> 8) & 0xFF;
//	keydata.fuseid[1] = (g_fuse94 >> 16) & 0xFF;
//	keydata.fuseid[0] = (g_fuse94 >> 24) & 0xFF;
//	/* set encryption key */
//	rijndael_set_key(&aes_ctx, kirk16_key, 128);
//
//	/* set the subkeys */
//	for (i = 0; i < 0x10; i++) {
//		/* set to the fuseid */
//		subkey_2[i] = subkey_1[i] = keydata.fuseid[i % 8];
//	}
//
//	/* do aes crypto */
//	for (i = 0; i < 3; i++) {
//		/* encrypt + decrypt */
//		rijndael_encrypt(&aes_ctx, subkey_1, subkey_1);
//		rijndael_decrypt(&aes_ctx, subkey_2, subkey_2);
//	}
//
//	/* set new key */
//	rijndael_set_key(&aes_ctx, subkey_1, 128);
//
//	/* now lets make the key mesh */
//	for (i = 0; i < 3; i++) {
//		/* do encryption in group of 3 */
//		for (k = 0; k < 3; k++) {
//			/* crypto */
//			rijndael_encrypt(&aes_ctx, subkey_2, subkey_2);
//		}
//
//		/* copy to out block */
//		memcpy(&keydata.mesh[i * 0x10], subkey_2, 0x10);
//	}
//
//	/* set the key to the mesh */
//	rijndael_set_key(&aes_ctx, &keydata.mesh[0x20], 128);
//
//	/* do the encryption routines for the aes key */
//	for (i = 0; i < 2; i++) {
//		/* encrypt the data */
//		rijndael_encrypt(&aes_ctx, &keydata.mesh[0x10], &keydata.mesh[0x10]);
//	}
//
//	/* set the key to that mesh shit */
//	rijndael_set_key(&aes_ctx, &keydata.mesh[0x10], 128);
//
//	/* cbc encrypt the dA */
//	AES_cbc_encrypt((AES_ctx *) & aes_ctx, dA_dec, dA_out, 0x20);
//}
//
//function kirk_CMD16(u8 * outbuff, int outsize, u8 * inbuff, int insize) {
//        u8 dec_private[0x20];
//	KIRK_CMD16_BUFFER * signbuf = (KIRK_CMD16_BUFFER *) inbuff;
//	ECDSA_SIG * sig = (ECDSA_SIG *) outbuff;
//	if (insize != 0x34) return KIRK_INVALID_SIZE;
//	if (outsize != 0x28) return KIRK_INVALID_SIZE;
//	decrypt_kirk16_private(dec_private,signbuf- > enc_private);
//	// Clear out the padding for safety
//	memset(&dec_private[0x14], 0, 0xC);
//	ecdsa_set_curve(ec_p, ec_a, ec_b2, ec_N2, Gx2, Gy2);
//	ecdsa_set_priv(dec_private);
//	ecdsa_sign(signbuf- > message_hash,sig- > r, sig- > s);
//	return KIRK_OPERATION_SUCCESS;
//}
//
//// ECDSA Verify
//// inbuff structure:
//// 00 = public key (0x28 length)
//// 28 = message hash (0x14 length)
//// 3C = signature R (0x14 length)
//// 50 = signature S (0x14 length)
//function kirk_CMD17(u8 * inbuff, int insize) {
//	KIRK_CMD17_BUFFER * sig = (KIRK_CMD17_BUFFER *) inbuff;
//	if (insize != 0x64) return KIRK_INVALID_SIZE;
//	ecdsa_set_curve(ec_p, ec_a, ec_b2, ec_N2, Gx2, Gy2);
//	ecdsa_set_pub(sig- > public_key.x);
//	// ecdsa_verify(u8 *hash, u8 *R, u8 *S)
//	if (ecdsa_verify(sig- > message_hash,sig- > signature.r,sig- > signature.s)) {
//		return KIRK_OPERATION_SUCCESS;
//	} else {
//		return KIRK_SIG_CHECK_INVALID;
//	}
//}
//
//function kirk_init()
//{
//	return kirk_init2((u8*) "Lazy Dev should have initialized!", 33, 0xBABEF00D, 0xDEADBEEF);;
//}
//
//function kirk_init2(u8 * rnd_seed, u32 seed_size, u32 fuseid_90, u32 fuseid_94) {
//  u8 temp[0x104];
//
//	KIRK_SHA1_HEADER * header = (KIRK_SHA1_HEADER *) temp;
//  // Another randomly selected data for a "key" to add to each randomization
//  u8 key[0x10] = {0x07, 0xAB, 0xEF, 0xF8, 0x96, 0x8C, 0xF3, 0xD6, 0x14, 0xE0, 0xEB, 0xB2, 0x9D, 0x8B, 0x4E, 0x74 };
//  u32 curtime;
//
//	//Set PRNG_DATA initially, otherwise use what ever uninitialized data is in the buffer
//	if (seed_size > 0) {
//		u8 * seedbuf;
//		KIRK_SHA1_HEADER * seedheader;;
//		seedbuf = (u8*) malloc(seed_size + 4);
//		seedheader = (KIRK_SHA1_HEADER *) seedbuf;
//    seedheader- > data_size = seed_size;
//		kirk_CMD11(PRNG_DATA, seedbuf, seed_size + 4);
//		free(seedbuf);
//	}
//	memcpy(temp + 4, PRNG_DATA, 0x14);
//	// This uses the standard C time function for portability.
//	curtime = (u32) time(0);
//	temp[0x18] = curtime & 0xFF;
//	temp[0x19] = (curtime >> 8) & 0xFF;
//	temp[0x1A] = (curtime >> 16) & 0xFF;
//	temp[0x1B] = (curtime >> 24) & 0xFF;
//	memcpy(&temp[0x1C], key, 0x10);
//  //This leaves the remainder of the 0x100 bytes in temp to whatever remains on the stack
//  // in an uninitialized state. This should add unpredicableness to the results as well
//  header- > data_size = 0x100;
//	kirk_CMD11(PRNG_DATA, temp, 0x104);
//
//	//Set Fuse ID
//	g_fuse90 = fuseid_90;
//	g_fuse94 = fuseid_94;
//
//	//Set KIRK1 main key
//	AES_set_key(&aes_kirk1, kirk1_key, 128);
//
//
//	is_kirk_initialized = 1;
//	return 0;
//}
function kirk_4_7_get_key(key_type) {
    switch (key_type) {
        case (0x02):
            return kirk7_key02;
        case (0x03):
            return kirk7_key03;
        case (0x04):
            return kirk7_key04;
        case (0x05):
            return kirk7_key05;
        case (0x07):
            return kirk7_key07;
        case (0x0C):
            return kirk7_key0C;
        case (0x0D):
            return kirk7_key0D;
        case (0x0E):
            return kirk7_key0E;
        case (0x0F):
            return kirk7_key0F;
        case (0x10):
            return kirk7_key10;
        case (0x11):
            return kirk7_key11;
        case (0x12):
            return kirk7_key12;
        case (0x38):
            return kirk7_key38;
        case (0x39):
            return kirk7_key39;
        case (0x3A):
            return kirk7_key3A;
        case (0x44):
            return kirk7_key44;
        case (0x4B):
            return kirk7_key4B;
        case (0x53):
            return kirk7_key53;
        case (0x57):
            return kirk7_key57;
        case (0x5D):
            return kirk7_key5D;
        case (0x63):
            return kirk7_key63;
        case (0x64):
            return kirk7_key64;
        default:
            throw (new Error("Unsupported key '" + key_type + "'"));
    }
}
//function kirk_CMD1_ex(outbuff: Uint8Array, inbuff: Uint8Array, size: number, header: KIRK_CMD1_HEADER)
//{
//	var buffer = new Uint8Array(size);
//
//	memcpy(buffer, header, sizeof(KIRK_CMD1_HEADER));
//	memcpy(buffer + sizeof(KIRK_CMD1_HEADER), inbuff, header.data_size);
//
//	return kirk_CMD1(outbuff, buffer, size);
//}
//
//
//function sceUtilsBufferCopyWithRange(outbuff: Uint8Array, outsize: number, inbuff: Uint8Array, insize:number, cmd:number)
//{
//	switch (cmd) {
//		case KIRK_CMD_DECRYPT_PRIVATE: return kirk_CMD1(outbuff, inbuff, insize); break;
//		case KIRK_CMD_ENCRYPT_IV_0: return kirk_CMD4(outbuff, inbuff, insize); break;
//		case KIRK_CMD_DECRYPT_IV_0: return kirk_CMD7(outbuff, inbuff, insize); break;
//		case KIRK_CMD_PRIV_SIGN_CHECK: return kirk_CMD10(inbuff, insize); break;
//		case KIRK_CMD_SHA1_HASH: return kirk_CMD11(outbuff, inbuff, insize); break;
//		case KIRK_CMD_ECDSA_GEN_KEYS: return kirk_CMD12(outbuff, outsize); break;
//		case KIRK_CMD_ECDSA_MULTIPLY_POINT: return kirk_CMD13(outbuff, outsize, inbuff, insize); break;
//		case KIRK_CMD_PRNG: return kirk_CMD14(outbuff, outsize); break;
//		case KIRK_CMD_ECDSA_SIGN: return kirk_CMD16(outbuff, outsize, inbuff, insize); break;
//		case KIRK_CMD_ECDSA_VERIFY: return kirk_CMD17(inbuff, insize); break;
//	}
//	return -1;
//}
//# sourceMappingURL=kirk.js.map
},
"src/core/memory": function(module, exports, require) {
var Signal = require('../util/Signal');

var Memory = (function () {
    function Memory() {
        this.invalidateDataRange = new Signal();
        //this.buffer = new ArrayBuffer(0x0FFFFFFF + 1);
        this.buffer = new ArrayBuffer(0xa000000 + 4);
        this.data = new DataView(this.buffer);
        this.s8 = new Int8Array(this.buffer);
        this.u8 = new Uint8Array(this.buffer);
        this.u16 = new Uint16Array(this.buffer);
        this.s16 = new Int16Array(this.buffer);
        this.s32 = new Int32Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
        this.f32 = new Float32Array(this.buffer);
    }
    Object.defineProperty(Memory, "instance", {
        get: function () {
            if (!Memory._instance)
                Memory._instance = new Memory();
            return Memory._instance;
        },
        enumerable: true,
        configurable: true
    });

    Memory.prototype.reset = function () {
        this.memset(Memory.DEFAULT_FRAME_ADDRESS, 0, 0x200000);
    };

    Memory.prototype.availableAfterAddress = function (address) {
        return this.buffer.byteLength - (address & Memory.MASK);
    };

    Memory.prototype.getPointerDataView = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new DataView(this.buffer, address & Memory.MASK, size);
    };

    Memory.prototype.getPointerU8Array = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new Uint8Array(this.buffer, address & Memory.MASK, size);
    };

    Memory.prototype.getPointerU16Array = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new Uint16Array(this.buffer, address & Memory.MASK, size >> 1);
    };

    Memory.prototype.isAddressInRange = function (address, min, max) {
        address &= Memory.MASK;
        address >>>= 0;
        min &= Memory.MASK;
        min >>>= 0;
        max &= Memory.MASK;
        max >>>= 0;

        return (address >= min) && (address < max);
    };

    Memory.prototype.isValidAddress = function (address) {
        address &= Memory.MASK;
        if ((address & 0x3E000000) == 0x08000000)
            return true;
        if ((address & 0x3F800000) == 0x04000000)
            return true;
        if ((address & 0xBFFF0000) == 0x00010000)
            return true;
        if (this.isAddressInRange(address, Memory.DEFAULT_FRAME_ADDRESS, Memory.DEFAULT_FRAME_ADDRESS + 0x200000))
            return true;
        if (this.isAddressInRange(address, 0x08000000, 0x08000000 + 0x04000000))
            return true;
        return false;
    };

    Memory.prototype.getPointerStream = function (address, size) {
        //console.log(sprintf("getPointerStream: %08X", address));
        if (address == 0)
            return null;
        if (!this.isValidAddress(address))
            return Stream.INVALID;
        if (!size)
            size = this.availableAfterAddress(address & Memory.MASK);
        return new Stream(this.getPointerDataView(address & Memory.MASK, size));
    };

    Memory.prototype.getU8Array = function (address, size) {
        if (address == 0)
            return null;
        if (!this.isValidAddress(address))
            return null;
        if (!size)
            size = this.availableAfterAddress(address & Memory.MASK);
        return this.getPointerU8Array(address & Memory.MASK, size);
    };

    Memory.prototype.getU16Array = function (address, size) {
        if (address == 0)
            return null;
        if (!this.isValidAddress(address))
            return null;
        if (!size)
            size = this.availableAfterAddress(address & Memory.MASK);
        return this.getPointerU16Array(address & Memory.MASK, size);
    };

    Memory.prototype.writeInt8 = function (address, value) {
        this.u8[(address & Memory.MASK) >> 0] = value;
    };
    Memory.prototype.readInt8 = function (address) {
        return this.s8[(address & Memory.MASK) >> 0];
    };
    Memory.prototype.readUInt8 = function (address) {
        return this.u8[(address & Memory.MASK) >> 0];
    };

    Memory.prototype.writeInt16 = function (address, value) {
        this.u16[(address & Memory.MASK) >> 1] = value;
    };
    Memory.prototype.readInt16 = function (address) {
        return this.s16[(address & Memory.MASK) >> 1];
    };
    Memory.prototype.readUInt16 = function (address) {
        return this.u16[(address & Memory.MASK) >> 1];
    };

    Memory.prototype.writeInt32 = function (address, value) {
        this.u32[(address & Memory.MASK) >> 2] = value;
    };
    Memory.prototype.readInt32 = function (address) {
        return this.s32[(address & Memory.MASK) >> 2];
    };
    Memory.prototype.readUInt32 = function (address) {
        return this.u32[(address & Memory.MASK) >> 2];
    };

    Memory.prototype.writeFloat32 = function (address, value) {
        this.f32[(address & Memory.MASK) >> 2] = value;
    };
    Memory.prototype.readFloat32 = function (address) {
        return this.f32[(address & Memory.MASK) >> 2];
    };

    Memory.prototype.writeBytes = function (address, data) {
        Memory.memoryCopy(data, 0, this.buffer, address & Memory.MASK, data.byteLength);
    };

    Memory.prototype.readArrayBuffer = function (address, length) {
        return this.buffer.slice(address, address + length);
    };

    Memory.prototype.readBytes = function (address, length) {
        return new Uint8Array(this.buffer, address, length);
    };

    Memory.prototype.writeStream = function (address, stream) {
        stream = stream.sliceWithLength(0, stream.length);
        while (stream.available > 0) {
            this.writeInt8(address++, stream.readUInt8());
        }
    };

    Memory.prototype.readStringz = function (address) {
        if (address == 0)
            return null;
        var out = '';
        while (true) {
            var _char = this.readUInt8(address++);
            if (_char == 0)
                break;
            out += String.fromCharCode(_char);
        }
        return out;
    };

    Memory.prototype.sliceWithBounds = function (low, high) {
        return new Stream(new DataView(this.buffer, low & Memory.MASK, high - low));
    };

    Memory.prototype.sliceWithSize = function (address, size) {
        return new Stream(new DataView(this.buffer, address & Memory.MASK, size));
    };

    Memory.prototype.copy = function (from, to, length) {
        this.u8.set(new Uint8Array(this.buffer, from & Memory.MASK, length), to & Memory.MASK);
    };

    Memory.prototype.memset = function (address, value, length) {
        address &= Memory.MASK;

        var start = address;
        var end = start + length;
        var value8 = value & 0xFF;

        while (address < end)
            this.u8[address++] = value8;
        /*
        var value16 = value8 | (value8 << 8);
        var value32 = value16 | (value16 << 16);
        
        debugger;
        
        while ((address & 3) && (address < end)) this.u8[address++] = value8;
        
        var end32 = end & ~3;
        
        while (address < end32) {
        this.u32[address >>> 2] = value32;
        address += 4;
        }
        
        // @TODO: Optimize generating 32-bit values
        while (address < end) this.u8[address++] = value8;
        */
    };

    /*
    private hashAligned(result:number, address: number, count: number) {
    var u32 = this.u32;
    var address4 = (address >> 2);
    var count4 = (count >> 2);
    var m = 0;
    for (var n = 0; n < count4; n++) {
    var v = u32[address4++];
    result ^= n << 22;
    result += (v >> 24) & 0xFF;
    result += (v >> 16) & 0xFF;
    result += (v >> 8) & 0xFF;
    result += (v >> 0) & 0xFF;
    }
    return result;
    }
    
    hash(address: number, count: number) {
    var result = 0;
    var u8 = this.u8;
    while (address & 3) { result += u8[address++]; count--; }
    this.hashAligned(result, address, count);
    return result;
    }
    */
    Memory.prototype.hashWordCount = function (addressAligned, count) {
        addressAligned >>>= 2;
        count >>>= 2;

        var result = 0;
        var u32 = this.u32;
        for (var n = 0; n < count; n++) {
            var v = u32[addressAligned + n];
            result = (result + v ^ n) | 0;
        }
        return result;
        /*
        var result1 = 0;
        var result2 = 0;
        var u32 = this.u32;
        for (var n = 0; n < count; n++) {
        var v = u32[addressAligned + n];
        
        result1 = (result1 + v * n) | 0;
        result2 = ((result2 + v + n) ^ (n << 17)) | 0;
        
        }
        return result1 + result2 * Math.pow(2, 24);
        */
    };

    Memory.prototype.hash = function (address, count) {
        var result = 0;

        while ((address & 3) != 0) {
            result += this.u8[address++];
            count--;
        }

        var count2 = MathUtils.prevAligned(count, 4);

        result += this.hashWordCount(address, count2);

        address += count2;
        count -= count2;

        while (address & 3) {
            result += this.u8[address++] * 7;
            count--;
        }

        return result;
        /*
        var result1 = 0;
        var result2 = 0;
        var u8 = this.u8;
        for (var n = 0; n < count; n++) {
        var byte = u8[address++];
        result1 = (result1 + Math.imul(byte, n + 1)) | 0;
        result2 = ((result2 + byte + n) ^ (n << 17)) | 0;
        }
        return result1 + result2 * Math.pow(2, 24);
        */
    };

    Memory.memoryCopy = function (source, sourcePosition, destination, destinationPosition, length) {
        var _source = new Uint8Array(source, sourcePosition, length);
        var _destination = new Uint8Array(destination, destinationPosition, length);
        _destination.set(_source);
    };

    Memory.prototype.dump = function () {
        saveAs(new Blob([this.getPointerDataView(0x08000000, 0x2000000)]), 'memory.bin');
    };
    Memory.DEFAULT_FRAME_ADDRESS = 0x04000000;

    Memory.MASK = 0x0FFFFFFF;
    Memory.MAIN_OFFSET = 0x08000000;
    return Memory;
})();
exports.Memory = Memory;
//# sourceMappingURL=memory.js.map
},
"src/core/pixelformat": function(module, exports, require) {
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
        if (typeof useAlpha === "undefined") { useAlpha = true; }
        if (typeof palette === "undefined") { palette = null; }
        if (typeof clutStart === "undefined") { clutStart = 0; }
        if (typeof clutShift === "undefined") { clutShift = 0; }
        if (typeof clutMask === "undefined") { clutMask = 0; }
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
        if (typeof useAlpha === "undefined") { useAlpha = true; }
        if (typeof palette === "undefined") { palette = null; }
        if (typeof clutStart === "undefined") { clutStart = 0; }
        if (typeof clutShift === "undefined") { clutShift = 0; }
        if (typeof clutMask === "undefined") { clutMask = 0; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        clutMask &= 0xF;

        var updateT4Translate = PixelConverter.updateT4Translate;

        for (var n = 0; n < 16; n++) {
            updateT4Translate[n] = palette[((clutStart + n) >>> clutShift) & clutMask];
            //updateT4Translate2[n] = updateT4Translate[n];
        }

        for (var n = 0, m = 0; n < count; n++) {
            var char = from[fromIndex + n];
            to32[m++] = updateT4Translate[(char >>> 0) & 0xF] | orValue;
            to32[m++] = updateT4Translate[(char >>> 4) & 0xF] | orValue;
        }
    };

    PixelConverter.updateT8 = function (from, fromIndex, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask) {
        if (typeof useAlpha === "undefined") { useAlpha = true; }
        if (typeof palette === "undefined") { palette = null; }
        if (typeof clutStart === "undefined") { clutStart = 0; }
        if (typeof clutShift === "undefined") { clutShift = 0; }
        if (typeof clutMask === "undefined") { clutMask = 0; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        clutMask &= 0xFF;
        for (var m = 0; m < count; m++)
            to32[m] = palette[clutStart + ((from[fromIndex + m] & clutMask) << clutShift)] | orValue;
    };

    PixelConverter.decode8888 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (typeof useAlpha === "undefined") { useAlpha = true; }
        var to32 = ArrayBufferUtils.uint8ToUint32(to, toIndex);
        var from32 = ArrayBufferUtils.uint8ToUint32(from, fromIndex);
        var orValue = useAlpha ? 0 : 0xFF000000;
        for (var n = 0; n < count; n++)
            to32[n] = from32[n] | orValue;
    };

    PixelConverter.update5551 = function (from, fromIndex, to, toIndex, count, useAlpha) {
        if (typeof useAlpha === "undefined") { useAlpha = true; }
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
        if (typeof useAlpha === "undefined") { useAlpha = true; }
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
        if (typeof useAlpha === "undefined") { useAlpha = true; }
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
},
"src/core/rtc": function(module, exports, require) {
var PspRtc = (function () {
    function PspRtc() {
    }
    PspRtc.prototype.getCurrentUnixSeconds = function () {
        return new Date().getTime() / 1000;
    };

    PspRtc.prototype.getCurrentUnixMicroseconds = function () {
        return new Date().getTime() * 1000;
    };

    PspRtc.prototype.getClockMicroseconds = function () {
        return (performance.now() * 1000) >>> 0;
    };

    PspRtc.prototype.getDayOfWeek = function (year, month, day) {
        return new Date(year, month - 1, day).getDay();
    };

    PspRtc.prototype.getDaysInMonth = function (year, month) {
        return new Date(year, month, 0).getDate();
    };
    return PspRtc;
})();
exports.PspRtc = PspRtc;
//# sourceMappingURL=rtc.js.map
},
"src/emulator": function(module, exports, require) {
var _context = require('./context');
var _cpu = require('./core/cpu');
var _gpu = require('./core/gpu');
var _rtc = require('./core/rtc');
var _controller = require('./core/controller');
var _display = require('./core/display');
var _audio = require('./core/audio');
var _interrupt = require('./core/interrupt');
var _memory = require('./core/memory');
var _format = require('./format/format');
var _format_cso = require('./format/cso');
var _format_iso = require('./format/iso');
var _format_zip = require('./format/zip');
var _pbp = require('./format/pbp');
var _psf = require('./format/psf');
var _vfs = require('./hle/vfs');
var _elf_psp = require('./hle/elf_psp');
var _elf_crypted_prx = require('./hle/elf_crypted_prx');

var _manager = require('./hle/manager');
var _pspmodules = require('./hle/pspmodules');

var PspRtc = _rtc.PspRtc;

var FileOpenFlags = _vfs.FileOpenFlags;

var MountableVfs = _vfs.MountableVfs;
var UriVfs = _vfs.UriVfs;
var IsoVfs = _vfs.IsoVfs;
var ZipVfs = _vfs.ZipVfs;
var StorageVfs = _vfs.StorageVfs;
var MemoryStickVfs = _vfs.MemoryStickVfs;
var EmulatorVfs = _vfs.EmulatorVfs;
_vfs.EmulatorVfs;
var MemoryVfs = _vfs.MemoryVfs;
var DropboxVfs = _vfs.DropboxVfs;

var PspElfLoader = _elf_psp.PspElfLoader;

var Memory = _memory.Memory;
var EmulatorContext = _context.EmulatorContext;
var InterruptManager = _interrupt.InterruptManager;
var PspAudio = _audio.PspAudio;
var PspDisplay = _display.PspDisplay;
var PspGpu = _gpu.PspGpu;
var PspController = _controller.PspController;
var InstructionCache = _cpu.InstructionCache;
var SyscallManager = _cpu.SyscallManager;

var ThreadManager = _manager.ThreadManager;
var ModuleManager = _manager.ModuleManager;
var MemoryManager = _manager.MemoryManager;
var FileManager = _manager.FileManager;
var CallbackManager = _manager.CallbackManager;
var Interop = _manager.Interop;

var Emulator = (function () {
    function Emulator(memory) {
        this.usingDropbox = false;
        this.gameTitle = '';
        if (!memory)
            memory = Memory.instance;
        this.memory = memory;
    }
    Emulator.prototype.stopAsync = function () {
        if (!this.display)
            return Promise.resolve();

        return Promise.all([
            this.display.stopAsync(),
            this.controller.stopAsync(),
            this.gpu.stopAsync(),
            this.audio.stopAsync(),
            this.threadManager.stopAsync()
        ]);
    };

    Emulator.prototype.startAsync = function () {
        var _this = this;
        return this.stopAsync().then(function () {
            _this.memory.reset();
            _this.context = new EmulatorContext();
            _this.memoryManager = new MemoryManager();
            _this.interruptManager = new InterruptManager();
            _this.audio = new PspAudio();
            _this.canvas = (document.getElementById('canvas'));
            _this.webgl_canvas = (document.getElementById('webgl_canvas'));
            _this.controller = new PspController();
            _this.instructionCache = new InstructionCache(_this.memory);
            _this.syscallManager = new SyscallManager(_this.context);
            _this.fileManager = new FileManager();
            _this.interop = new Interop();
            _this.callbackManager = new CallbackManager(_this.interop);
            _this.rtc = new PspRtc();
            _this.display = new PspDisplay(_this.memory, _this.interruptManager, _this.canvas, _this.webgl_canvas);
            _this.gpu = new PspGpu(_this.memory, _this.display, _this.webgl_canvas, _this.interop);
            _this.threadManager = new ThreadManager(_this.memory, _this.interruptManager, _this.callbackManager, _this.memoryManager, _this.display, _this.syscallManager, _this.instructionCache);
            _this.moduleManager = new ModuleManager(_this.context);

            _this.emulatorVfs = new EmulatorVfs();
            _this.ms0Vfs = new MountableVfs();
            _this.storageVfs = new StorageVfs('psp_storage');
            _this.dropboxVfs = new DropboxVfs();
            _this.dropboxVfs.enabled = _this.usingDropbox;

            var msvfs = new MemoryStickVfs([_this.dropboxVfs, _this.storageVfs, _this.ms0Vfs], _this.callbackManager, _this.memory);
            _this.fileManager.mount('fatms0', msvfs);
            _this.fileManager.mount('ms0', msvfs);
            _this.fileManager.mount('mscmhc0', msvfs);

            _this.fileManager.mount('host0', new MemoryVfs());
            _this.fileManager.mount('flash0', new UriVfs('flash0'));
            _this.fileManager.mount('emulator', _this.emulatorVfs);
            _this.fileManager.mount('kemulator', _this.emulatorVfs);

            _this.ms0Vfs.mountVfs('/', new MemoryVfs());

            _pspmodules.registerModulesAndSyscalls(_this.syscallManager, _this.moduleManager);

            _this.context.init(_this.interruptManager, _this.display, _this.controller, _this.gpu, _this.memoryManager, _this.threadManager, _this.audio, _this.memory, _this.instructionCache, _this.fileManager, _this.rtc, _this.callbackManager, _this.moduleManager);

            return Promise.all([
                _this.display.startAsync(),
                _this.controller.startAsync(),
                _this.gpu.startAsync(),
                _this.audio.startAsync(),
                _this.threadManager.startAsync()
            ]);
        });
    };

    Emulator.prototype.processParamsPsf = function (psf) {
        this.gameTitle = psf.entriesByName['TITLE'];
        console.log(psf.entriesByName);
    };

    Emulator.prototype.changeFavicon = function (src) {
        var link = document.createElement('link'), oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';
        link.href = src;
        if (oldLink) {
            document.head.removeChild(oldLink);
        }
        document.head.appendChild(link);
    };

    Emulator.prototype.loadIcon0 = function (data) {
        //console.log('loadIcon0---------');
        //console.log(data);
        if (data.length == 0) {
            this.changeFavicon('icon.png');
        } else {
            this.changeFavicon(data.toImageUrl());
        }
        //var item = document.head.querySelector('link[rel="shortcut icon"]');
        //item['href'] = ;
    };

    Emulator.prototype.loadPic1 = function (data) {
        //console.log('loadPic1---------');
        //console.log(data);
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundImage = 'url("' + data.toImageUrl() + '")';
    };

    Emulator.prototype._loadAndExecuteAsync = function (asyncStream, pathToFile) {
        var _this = this;
        return _format.detectFormatAsync(asyncStream).then(function (fileFormat) {
            console.info(sprintf('File:: size: %d, format: "%s", name: "%s"', asyncStream.size, fileFormat, asyncStream.name));
            switch (fileFormat) {
                case 'ciso':
                    return _format_cso.Cso.fromStreamAsync(asyncStream).then(function (asyncStream2) {
                        return _this._loadAndExecuteAsync(asyncStream2, pathToFile);
                    });
                case 'pbp':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        var pbp = _pbp.Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
                        var psf = _psf.Psf.fromStream(pbp.get(_pbp.Names.ParamSfo));
                        _this.processParamsPsf(psf);
                        _this.loadIcon0(pbp.get(_pbp.Names.Icon0Png));
                        _this.loadPic1(pbp.get(_pbp.Names.Pic1Png));

                        return _this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get(_pbp.Names.PspData).toArrayBuffer()), pathToFile);
                    });
                case 'psp':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        _elf_crypted_prx.decrypt(new Uint8Array(executableArrayBuffer));
                        throw (new Error("Not supported encrypted elf files yet!"));
                    });
                case 'zip':
                    return _format_zip.Zip.fromStreamAsync(asyncStream).then(function (zip) {
                        var zipFs = new ZipVfs(zip, _this.storageVfs);
                        var mountableVfs = _this.ms0Vfs;
                        mountableVfs.mountVfs('/PSP/GAME/virtual', zipFs);

                        var availableElf = ['/EBOOT.ELF', '/BOOT.ELF', '/EBOOT.PBP'].first(function (item) {
                            return zip.has(item);
                        });

                        console.log('elf: ' + availableElf);

                        return zipFs.openAsync(availableElf, 1 /* Read */, parseInt('0777', 8)).then(function (node) {
                            return node.readAllAsync().then(function (data) {
                                return _this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(data), 'ms0:/PSP/GAME/virtual/EBOOT.ELF');
                            });
                        });
                    });
                case 'iso':
                    return _format_iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
                        var isoFs = new IsoVfs(iso);
                        _this.fileManager.mount('umd0', isoFs);
                        _this.fileManager.mount('disc0', isoFs);

                        return isoFs.readAllAsync('PSP_GAME/PARAM.SFO').then(function (paramSfoData) {
                            var psf = _psf.Psf.fromStream(Stream.fromArrayBuffer(paramSfoData));
                            _this.processParamsPsf(psf);

                            var icon0Promise = isoFs.readAllAsync('PSP_GAME/ICON0.PNG').then(function (data) {
                                _this.loadIcon0(Stream.fromArrayBuffer(data));
                            }).catch(function () {
                            });
                            var pic1Promise = isoFs.readAllAsync('PSP_GAME/PIC1.PNG').then(function (data) {
                                _this.loadPic1(Stream.fromArrayBuffer(data));
                            }).catch(function () {
                            });

                            return isoFs.readAllAsync('PSP_GAME/SYSDIR/BOOT.BIN').then(function (bootBinData) {
                                return _this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'umd0:/PSP_GAME/SYSDIR/BOOT.BIN');
                            });
                        });
                    });
                case 'elf':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        if (_this.gameTitle) {
                            document.title = _this.gameTitle + ' - jspspemu';
                        } else {
                            document.title = 'jspspemu';
                        }

                        var mountableVfs = _this.ms0Vfs;
                        mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);

                        var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);

                        _this.fileManager.cwd = new _manager.Uri('ms0:/PSP/GAME/virtual');
                        console.info('pathToFile:', pathToFile);
                        var arguments = [pathToFile];
                        var argumentsPartition = _this.memoryManager.userPartition.allocateLow(0x4000);
                        var argument = arguments.map(function (argument) {
                            return argument + String.fromCharCode(0);
                        }).join('');
                        _this.memory.getPointerStream(argumentsPartition.low).writeString(argument);

                        //console.log(new Uint8Array(executableArrayBuffer));
                        var pspElf = new PspElfLoader(_this.memory, _this.memoryManager, _this.moduleManager, _this.syscallManager);
                        pspElf.load(elfStream);
                        _this.context.symbolLookup = pspElf;
                        var moduleInfo = pspElf.moduleInfo;

                        //return;
                        //window['saveAs'](new Blob([this.memory.getPointerDataView(0x08000000, 0x2000000)]), 'after_allocate_and_write_dump.bin');
                        // "ms0:/PSP/GAME/virtual/EBOOT.PBP"
                        var thread = _this.threadManager.create('main', moduleInfo.pc, 10);
                        thread.state.GP = moduleInfo.gp;
                        thread.state.gpr[4] = argument.length;
                        thread.state.gpr[5] = argumentsPartition.low;
                        thread.start();
                    });

                default:
                    throw (new Error(sprintf("Unhandled format '%s'", fileFormat)));
            }
        });
    };

    Emulator.prototype.toggleDropbox = function () {
        this.connectToDropbox(!(localStorage["dropbox"] == 'true'));
    };

    Emulator.prototype.connectToDropbox = function (newValue) {
        newValue = !!newValue;
        $('#dropbox').html(newValue ? '<span style="color:#3A3;">dropbox enabled</span>' : '<span style="color:#777;">dropbox disabled</span>');
        var oldValue = (localStorage["dropbox"] == 'true');

        console.log('dropbox: ', oldValue, '->', newValue);

        if (newValue) {
            localStorage["dropbox"] = 'true';

            DropboxVfs.tryLoginAsync().then(function () {
                $('#dropbox').html('<span style="color:#7F7;">dropbox connected</span>');
            }).catch(function (e) {
                console.error(e);
                $('#dropbox').html('<span style="color:#F77;">dropbox error</span>');
            });
        } else {
            delete localStorage["dropbox"];
        }
        this.usingDropbox = newValue;
        if (this.dropboxVfs) {
            this.dropboxVfs.enabled = newValue;
        }
    };

    Emulator.prototype.checkPlugins = function () {
        this.connectToDropbox(localStorage["dropbox"] == 'true');
    };

    Emulator.prototype.loadExecuteAndWaitAsync = function (asyncStream, url) {
        var _this = this;
        this.gameTitle = '';
        return this.loadAndExecuteAsync(asyncStream, url).then(function () {
            //console.error('WAITING!');
            return _this.threadManager.waitExitGameAsync().then(function () {
                //console.error('STOPPING!');
                return _this.stopAsync();
            });
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
            throw (e);
        });
    };

    Emulator.prototype.loadAndExecuteAsync = function (asyncStream, url) {
        var _this = this;
        this.gameTitle = '';
        this.loadIcon0(Stream.fromArray([]));
        this.loadPic1(Stream.fromArray([]));
        return this.startAsync().then(function () {
            var parentUrl = url.replace(/\/[^//]+$/, '');
            console.info('parentUrl: ' + parentUrl);
            _this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new UriVfs(parentUrl));
            return _this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
            throw (e);
        });
    };

    Emulator.prototype.downloadAndExecuteAsync = function (url) {
        var _this = this;
        return UrlAsyncStream.fromUrlAsync(url).then(function (stream) {
            setImmediate(function () {
                // escape try/catch!
                _this.loadAndExecuteAsync(stream, url);
            });
        });
    };

    Emulator.prototype.executeFileAsync = function (file) {
        var _this = this;
        setImmediate(function () {
            // escape try/catch!
            _this.loadAndExecuteAsync(new FileAsyncStream(file), '.');
        });
    };
    return Emulator;
})();
exports.Emulator = Emulator;
//# sourceMappingURL=emulator.js.map
},
"src/format/cso": function(module, exports, require) {
var CSO_MAGIC = 'CISO';

var Header = (function () {
    function Header() {
    }
    Object.defineProperty(Header.prototype, "numberOfBlocks", {
        get: function () {
            return Math.floor(this.totalBytes / this.blockSize);
        },
        enumerable: true,
        configurable: true
    });

    Header.struct = StructClass.create(Header, [
        { magic: Stringz(4) },
        { headerSize: UInt32 },
        { totalBytes: Int64 },
        { blockSize: UInt32 },
        { version: UInt8 },
        { alignment: UInt8 },
        { reserved: UInt16 }
    ]);
    return Header;
})();

var Cso = (function () {
    function Cso() {
        this.date = new Date();
        this.cache = new AsyncCache(128 * 1024, function (arraybuffer) {
            return arraybuffer.byteLength;
        });
    }
    Cso.fromStreamAsync = function (stream) {
        return new Cso().loadAsync(stream);
    };

    Object.defineProperty(Cso.prototype, "name", {
        get: function () {
            return this.stream.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cso.prototype, "size", {
        get: function () {
            return this.header.totalBytes;
        },
        enumerable: true,
        configurable: true
    });

    Cso.prototype.decodeBlockAsync = function (index) {
        var _this = this;
        return this.cache.getOrGenerateAsync('item-' + index, function () {
            var compressed = ((_this.offsets[index + 0] & 0x80000000) == 0);
            var low = _this.offsets[index + 0] & 0x7FFFFFFF;
            var high = _this.offsets[index + 1] & 0x7FFFFFFF;
            return _this.stream.readChunkAsync(low, high - low).then(function (data) {
                return (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
            }).catch(function (e) {
                console.error(e);
                throw (e);
            });
        });
    };

    Cso.prototype.readChunkAsync = function (offset, count) {
        var _this = this;
        var blockIndex = Math.floor(offset / this.header.blockSize);
        var blockLow = MathUtils.prevAligned(offset, this.header.blockSize);
        var blockHigh = blockLow + this.header.blockSize;
        var maxReadCount = blockHigh - offset;
        var toReadInChunk = Math.min(count, maxReadCount);

        var chunkPromise = this.decodeBlockAsync(blockIndex).then(function (data) {
            //console.log(data.byteLength);
            var low = offset - blockLow;
            return data.slice(low, low + toReadInChunk);
        });

        if (count <= maxReadCount) {
            //console.log(sprintf("readChunkAsyncOne: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));
            return chunkPromise;
        } else {
            //console.log(sprintf("readChunkAsyncSeveral: %08X, %d, (%d)", offset, count, blockIndex), (new Error())['stack']);
            return chunkPromise.then(function (chunk1) {
                return _this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(function (chunk2) {
                    return ArrayBufferUtils.concat([chunk1, chunk2]);
                });
            });
        }
    };

    Cso.prototype.loadAsync = function (stream) {
        var _this = this;
        this.stream = stream;
        this.date = stream.date;

        return stream.readChunkAsync(0, Header.struct.length).then(function (buffer) {
            var header = _this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
            if (header.magic != CSO_MAGIC)
                throw ('Not a CSO file');

            return stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4).then(function (buffer) {
                _this.offsets = new Uint32Array(buffer);
                return _this;
            });
        });
    };
    return Cso;
})();
exports.Cso = Cso;
//# sourceMappingURL=cso.js.map
},
"src/format/elf": function(module, exports, require) {
var _memory = require('../core/memory');
var Memory = _memory.Memory;

var ElfHeader = (function () {
    function ElfHeader() {
    }
    Object.defineProperty(ElfHeader.prototype, "hasValidMagic", {
        get: function () {
            return this.magic == String.fromCharCode(0x7F) + 'ELF';
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ElfHeader.prototype, "hasValidMachine", {
        get: function () {
            return this.machine == 8 /* ALLEGREX */;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ElfHeader.prototype, "hasValidType", {
        get: function () {
            return [2 /* Executable */, 65440 /* Prx */].indexOf(this.type) >= 0;
        },
        enumerable: true,
        configurable: true
    });

    ElfHeader.struct = StructClass.create(ElfHeader, [
        { magic: Stringn(4) },
        { class: Int8 },
        { data: Int8 },
        { idVersion: Int8 },
        { _padding: StructArray(Int8, 9) },
        { type: UInt16 },
        { machine: Int16 },
        { version: Int32 },
        { entryPoint: Int32 },
        { programHeaderOffset: Int32 },
        { sectionHeaderOffset: Int32 },
        { flags: Int32 },
        { elfHeaderSize: Int16 },
        { programHeaderEntrySize: Int16 },
        { programHeaderCount: Int16 },
        { sectionHeaderEntrySize: Int16 },
        { sectionHeaderCount: Int16 },
        { sectionHeaderStringTable: Int16 }
    ]);
    return ElfHeader;
})();
exports.ElfHeader = ElfHeader;

var ElfProgramHeader = (function () {
    function ElfProgramHeader() {
    }
    ElfProgramHeader.struct = StructClass.create(ElfProgramHeader, [
        { type: UInt32 },
        { offset: UInt32 },
        { virtualAddress: UInt32 },
        { psysicalAddress: UInt32 },
        { fileSize: UInt32 },
        { memorySize: UInt32 },
        { flags: UInt32 },
        { alignment: UInt32 }
    ]);
    return ElfProgramHeader;
})();
exports.ElfProgramHeader = ElfProgramHeader;

var ElfSectionHeader = (function () {
    function ElfSectionHeader() {
        this.stream = null;
    }
    ElfSectionHeader.struct = StructClass.create(ElfSectionHeader, [
        { nameOffset: UInt32 },
        { type: UInt32 },
        { flags: UInt32 },
        { address: UInt32 },
        { offset: UInt32 },
        { size: UInt32 },
        { link: UInt32 },
        { info: UInt32 },
        { addressAlign: UInt32 },
        { entitySize: UInt32 }
    ]);
    return ElfSectionHeader;
})();
exports.ElfSectionHeader = ElfSectionHeader;

(function (ElfProgramHeaderType) {
    ElfProgramHeaderType[ElfProgramHeaderType["NoLoad"] = 0] = "NoLoad";
    ElfProgramHeaderType[ElfProgramHeaderType["Load"] = 1] = "Load";
    ElfProgramHeaderType[ElfProgramHeaderType["Reloc1"] = 0x700000A0] = "Reloc1";
    ElfProgramHeaderType[ElfProgramHeaderType["Reloc2"] = 0x700000A1] = "Reloc2";
})(exports.ElfProgramHeaderType || (exports.ElfProgramHeaderType = {}));
var ElfProgramHeaderType = exports.ElfProgramHeaderType;

(function (ElfSectionHeaderType) {
    ElfSectionHeaderType[ElfSectionHeaderType["Null"] = 0] = "Null";
    ElfSectionHeaderType[ElfSectionHeaderType["ProgramBits"] = 1] = "ProgramBits";
    ElfSectionHeaderType[ElfSectionHeaderType["SYMTAB"] = 2] = "SYMTAB";
    ElfSectionHeaderType[ElfSectionHeaderType["STRTAB"] = 3] = "STRTAB";
    ElfSectionHeaderType[ElfSectionHeaderType["RELA"] = 4] = "RELA";
    ElfSectionHeaderType[ElfSectionHeaderType["HASH"] = 5] = "HASH";
    ElfSectionHeaderType[ElfSectionHeaderType["DYNAMIC"] = 6] = "DYNAMIC";
    ElfSectionHeaderType[ElfSectionHeaderType["NOTE"] = 7] = "NOTE";
    ElfSectionHeaderType[ElfSectionHeaderType["NoBits"] = 8] = "NoBits";
    ElfSectionHeaderType[ElfSectionHeaderType["Relocation"] = 9] = "Relocation";
    ElfSectionHeaderType[ElfSectionHeaderType["SHLIB"] = 10] = "SHLIB";
    ElfSectionHeaderType[ElfSectionHeaderType["DYNSYM"] = 11] = "DYNSYM";

    ElfSectionHeaderType[ElfSectionHeaderType["LOPROC"] = 0x70000000] = "LOPROC";
    ElfSectionHeaderType[ElfSectionHeaderType["HIPROC"] = 0x7FFFFFFF] = "HIPROC";
    ElfSectionHeaderType[ElfSectionHeaderType["LOUSER"] = 0x80000000] = "LOUSER";
    ElfSectionHeaderType[ElfSectionHeaderType["HIUSER"] = 0xFFFFFFFF] = "HIUSER";

    ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation"] = (ElfSectionHeaderType.LOPROC | 0xA0)] = "PrxRelocation";
    ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation_FW5"] = (ElfSectionHeaderType.LOPROC | 0xA1)] = "PrxRelocation_FW5";
})(exports.ElfSectionHeaderType || (exports.ElfSectionHeaderType = {}));
var ElfSectionHeaderType = exports.ElfSectionHeaderType;

(function (ElfSectionHeaderFlags) {
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["None"] = 0] = "None";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Write"] = 1] = "Write";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Allocate"] = 2] = "Allocate";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Execute"] = 4] = "Execute";
})(exports.ElfSectionHeaderFlags || (exports.ElfSectionHeaderFlags = {}));
var ElfSectionHeaderFlags = exports.ElfSectionHeaderFlags;

(function (ElfProgramHeaderFlags) {
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Executable"] = 0x1] = "Executable";

    // Note: demo PRX's were found to be not writable
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Writable"] = 0x2] = "Writable";
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Readable"] = 0x4] = "Readable";
})(exports.ElfProgramHeaderFlags || (exports.ElfProgramHeaderFlags = {}));
var ElfProgramHeaderFlags = exports.ElfProgramHeaderFlags;

(function (ElfType) {
    ElfType[ElfType["Executable"] = 0x0002] = "Executable";
    ElfType[ElfType["Prx"] = 0xFFA0] = "Prx";
})(exports.ElfType || (exports.ElfType = {}));
var ElfType = exports.ElfType;

(function (ElfMachine) {
    ElfMachine[ElfMachine["ALLEGREX"] = 8] = "ALLEGREX";
})(exports.ElfMachine || (exports.ElfMachine = {}));
var ElfMachine = exports.ElfMachine;

(function (ElfPspModuleFlags) {
    ElfPspModuleFlags[ElfPspModuleFlags["User"] = 0x0000] = "User";
    ElfPspModuleFlags[ElfPspModuleFlags["Kernel"] = 0x1000] = "Kernel";
})(exports.ElfPspModuleFlags || (exports.ElfPspModuleFlags = {}));
var ElfPspModuleFlags = exports.ElfPspModuleFlags;

(function (ElfPspLibFlags) {
    ElfPspLibFlags[ElfPspLibFlags["DirectJump"] = 0x0001] = "DirectJump";
    ElfPspLibFlags[ElfPspLibFlags["Syscall"] = 0x4000] = "Syscall";
    ElfPspLibFlags[ElfPspLibFlags["SysLib"] = 0x8000] = "SysLib";
})(exports.ElfPspLibFlags || (exports.ElfPspLibFlags = {}));
var ElfPspLibFlags = exports.ElfPspLibFlags;

(function (ElfPspModuleNids) {
    ElfPspModuleNids[ElfPspModuleNids["MODULE_INFO"] = 0xF01D73A7] = "MODULE_INFO";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_BOOTSTART"] = 0xD3744BE0] = "MODULE_BOOTSTART";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_REBOOT_BEFORE"] = 0x2F064FA6] = "MODULE_REBOOT_BEFORE";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_START"] = 0xD632ACDB] = "MODULE_START";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_START_THREAD_PARAMETER"] = 0x0F7C276C] = "MODULE_START_THREAD_PARAMETER";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP"] = 0xCEE8593C] = "MODULE_STOP";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP_THREAD_PARAMETER"] = 0xCF0CC697] = "MODULE_STOP_THREAD_PARAMETER";
})(exports.ElfPspModuleNids || (exports.ElfPspModuleNids = {}));
var ElfPspModuleNids = exports.ElfPspModuleNids;

(function (ElfRelocType) {
    ElfRelocType[ElfRelocType["None"] = 0] = "None";
    ElfRelocType[ElfRelocType["Mips16"] = 1] = "Mips16";
    ElfRelocType[ElfRelocType["Mips32"] = 2] = "Mips32";
    ElfRelocType[ElfRelocType["MipsRel32"] = 3] = "MipsRel32";
    ElfRelocType[ElfRelocType["Mips26"] = 4] = "Mips26";
    ElfRelocType[ElfRelocType["MipsHi16"] = 5] = "MipsHi16";
    ElfRelocType[ElfRelocType["MipsLo16"] = 6] = "MipsLo16";
    ElfRelocType[ElfRelocType["MipsGpRel16"] = 7] = "MipsGpRel16";
    ElfRelocType[ElfRelocType["MipsLiteral"] = 8] = "MipsLiteral";
    ElfRelocType[ElfRelocType["MipsGot16"] = 9] = "MipsGot16";
    ElfRelocType[ElfRelocType["MipsPc16"] = 10] = "MipsPc16";
    ElfRelocType[ElfRelocType["MipsCall16"] = 11] = "MipsCall16";
    ElfRelocType[ElfRelocType["MipsGpRel32"] = 12] = "MipsGpRel32";
    ElfRelocType[ElfRelocType["StopRelocation"] = 0xFF] = "StopRelocation";
})(exports.ElfRelocType || (exports.ElfRelocType = {}));
var ElfRelocType = exports.ElfRelocType;

var ElfReloc = (function () {
    function ElfReloc() {
    }
    Object.defineProperty(ElfReloc.prototype, "pointeeSectionHeaderBase", {
        get: function () {
            return (this.info >> 16) & 0xFF;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfReloc.prototype, "pointerSectionHeaderBase", {
        get: function () {
            return (this.info >> 8) & 0xFF;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfReloc.prototype, "type", {
        get: function () {
            return ((this.info >> 0) & 0xFF);
        },
        enumerable: true,
        configurable: true
    });

    ElfReloc.struct = StructClass.create(ElfReloc, [
        { pointerAddress: UInt32 },
        { info: UInt32 }
    ]);
    return ElfReloc;
})();
exports.ElfReloc = ElfReloc;

var ElfLoader = (function () {
    function ElfLoader() {
        this.header = null;
        this.stream = null;
    }
    ElfLoader.prototype.load = function (stream) {
        var _this = this;
        this.readAndCheckHeaders(stream);

        var programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
        var sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);

        this.programHeaders = StructArray(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
        this.sectionHeaders = StructArray(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);

        this.sectionHeaderStringTable = this.sectionHeaders[this.header.sectionHeaderStringTable];
        this.stringTableStream = this.getSectionHeaderFileStream(this.sectionHeaderStringTable);

        this.sectionHeadersByName = {};
        this.sectionHeaders.forEach(function (sectionHeader) {
            var name = _this.getStringFromStringTable(sectionHeader.nameOffset);
            sectionHeader.name = name;
            if (sectionHeader.type != 0 /* Null */) {
                sectionHeader.stream = _this.getSectionHeaderFileStream(sectionHeader);
            }
            _this.sectionHeadersByName[name] = sectionHeader;
        });

        console.log(this.sectionHeadersByName);
    };

    ElfLoader.prototype.readAndCheckHeaders = function (stream) {
        this.stream = stream;
        var header = this.header = ElfHeader.struct.read(stream);
        if (!header.hasValidMagic)
            throw ('Not an ELF file');
        if (!header.hasValidMachine)
            throw ('Not a PSP ELF file');
        if (!header.hasValidType)
            throw ('Not a executable or a Prx but has type ' + header.type);
    };

    ElfLoader.prototype.getStringFromStringTable = function (index) {
        this.stringTableStream.position = index;
        return this.stringTableStream.readStringz();
    };

    ElfLoader.prototype.getSectionHeaderFileStream = function (sectionHeader) {
        switch (sectionHeader.type) {
            case 8 /* NoBits */:
            case 0 /* Null */:
                return this.stream.sliceWithLength(0, 0);
                break;
            default:
                return this.stream.sliceWithLength(sectionHeader.offset, sectionHeader.size);
        }
    };

    ElfLoader.fromStream = function (stream) {
        var elf = new ElfLoader();
        elf.load(stream);
        return elf;
    };

    Object.defineProperty(ElfLoader.prototype, "isPrx", {
        get: function () {
            return (this.header.type & 65440 /* Prx */) != 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfLoader.prototype, "needsRelocation", {
        get: function () {
            return this.isPrx || (this.header.entryPoint < Memory.MAIN_OFFSET);
        },
        enumerable: true,
        configurable: true
    });
    return ElfLoader;
})();
exports.ElfLoader = ElfLoader;
//# sourceMappingURL=elf.js.map
},
"src/format/elf_dwarf": function(module, exports, require) {
// https://github.com/soywiz/pspemu/blob/master/src/pspemu/hle/elf/ElfDwarf.d
var Uleb128Class = (function () {
    function Uleb128Class() {
    }
    Uleb128Class.prototype.read = function (stream) {
        var val = 0;
        var b = 0x80;

        for (var shift = 0; ((stream.available) > 0 && (b & 0x80)); shift += 7) {
            b = stream.readUInt8();
            val |= (b & 0x7F) << shift;
        }

        return val;
    };
    Uleb128Class.prototype.write = function (stream, value) {
        throw (new Error("Not implemented"));
    };
    Object.defineProperty(Uleb128Class.prototype, "length", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return Uleb128Class;
})();

var Uleb128 = new Uleb128Class();

var ElfDwarfHeader = (function () {
    function ElfDwarfHeader() {
    }
    Object.defineProperty(ElfDwarfHeader.prototype, "total_length_real", {
        get: function () {
            return this.total_length + 4;
        },
        enumerable: true,
        configurable: true
    });

    ElfDwarfHeader.struct = StructClass.create(ElfDwarfHeader, [
        { total_length: UInt32 },
        { version: UInt16 },
        { prologue_length: UInt32 },
        { minimum_instruction_length: UInt8 },
        { default_is_stmt: UInt8 },
        { line_base: Int8 },
        { line_range: UInt8 },
        { opcode_base: UInt8 }
    ]);
    return ElfDwarfHeader;
})();

var DW_LNS;
(function (DW_LNS) {
    DW_LNS[DW_LNS["extended_op"] = 0] = "extended_op";
    DW_LNS[DW_LNS["copy"] = 1] = "copy";
    DW_LNS[DW_LNS["advance_pc"] = 2] = "advance_pc";
    DW_LNS[DW_LNS["advance_line"] = 3] = "advance_line";
    DW_LNS[DW_LNS["set_file"] = 4] = "set_file";
    DW_LNS[DW_LNS["set_column"] = 5] = "set_column";
    DW_LNS[DW_LNS["negate_stmt"] = 6] = "negate_stmt";
    DW_LNS[DW_LNS["set_basic_block"] = 7] = "set_basic_block";
    DW_LNS[DW_LNS["const_add_pc"] = 8] = "const_add_pc";
    DW_LNS[DW_LNS["fixed_advance_pc"] = 9] = "fixed_advance_pc";
})(DW_LNS || (DW_LNS = {}));

var DW_LNE;
(function (DW_LNE) {
    DW_LNE[DW_LNE["end_sequence"] = 1] = "end_sequence";
    DW_LNE[DW_LNE["set_address"] = 2] = "set_address";
    DW_LNE[DW_LNE["define_file"] = 3] = "define_file";
})(DW_LNE || (DW_LNE = {}));

// 6.2.2 State Machine Registers
/*
class State {
uint address = 0;
uint file = 1;
uint line = 1;
uint column = 0;
bool is_stmt = false; // Must be setted by the header.
bool basic_block = false;
bool end_sequence = false;
FileEntry * file_entry;
string file_full_path() { return file_entry.full_path; }
//writefln("DW_LNS_copy: %08X, %s/%s:%d", state.address, directories[files[state.file].directory_index], files[state.file].name, state.line);
string toString() {
//return std.string.format("%08X: is_stmt(%d) basic_block(%d) end_sequence(%d) '%s':%d:%d ", address, is_stmt, basic_block, end_sequence, file_entry.full_path, line, column);
return std.string.format("%08X: '%s':%d:%d ", address, file_entry.full_path, line, column);
}
}
*/
var FileEntry = (function () {
    function FileEntry() {
        this.name = '';
        this.directory = '';
        this.directory_index = 0;
        this.time_mod = 0;
        this.size = 0;
    }
    FileEntry.prototype.full_path = function () {
        if (this.directory.length) {
            return this.directory + "/" + this.name;
        } else {
            return name;
        }
    };

    FileEntry.struct = StructClass.create(FileEntry, [
        { name: StringzVariable },
        { directory_index: Uleb128 },
        { time_mod: Uleb128 },
        { size: Uleb128 }
    ]);
    return FileEntry;
})();

var ElfSymbol = (function () {
    function ElfSymbol() {
        this.name = '';
        this.index = -1;
        this.nameIndex = 0;
        this.value = 0;
        this.size = 0;
        this.info = 0;
        this.other = 0;
        this.shndx = 0;
    }
    Object.defineProperty(ElfSymbol.prototype, "type", {
        get: function () {
            return BitUtils.extract(this.info, 0, 4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "bind", {
        get: function () {
            return BitUtils.extract(this.info, 4, 4);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ElfSymbol.prototype, "typeName", {
        get: function () {
            return SymInfoType[this.type];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "bindName", {
        get: function () {
            return SymInfoBind[this.bind];
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ElfSymbol.prototype, "address", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "low", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "high", {
        get: function () {
            return this.value + this.size;
        },
        enumerable: true,
        configurable: true
    });

    ElfSymbol.prototype.toString = function () {
        return sprintf('ElfSymbol("%s", %08X-%08X)', this.name, this.low, this.high);
    };

    ElfSymbol.prototype.contains = function (address) {
        return (address >= this.low) && (address < (this.high));
    };

    ElfSymbol.struct = StructClass.create(ElfSymbol, [
        { nameIndex: UInt32 },
        { value: UInt32 },
        { size: UInt32 },
        { info: UInt8 },
        { other: UInt8 },
        { shndx: UInt16 }
    ]);
    return ElfSymbol;
})();
exports.ElfSymbol = ElfSymbol;

(function (SymInfoBind) {
    SymInfoBind[SymInfoBind["LOCAL"] = 0] = "LOCAL";
    SymInfoBind[SymInfoBind["GLOBAL"] = 1] = "GLOBAL";
    SymInfoBind[SymInfoBind["WEAK"] = 2] = "WEAK";
    SymInfoBind[SymInfoBind["OS_1"] = 10] = "OS_1";
    SymInfoBind[SymInfoBind["OS_2"] = 11] = "OS_2";
    SymInfoBind[SymInfoBind["OS_3"] = 12] = "OS_3";
    SymInfoBind[SymInfoBind["PROC_1"] = 13] = "PROC_1";
    SymInfoBind[SymInfoBind["PROC_2"] = 14] = "PROC_2";
    SymInfoBind[SymInfoBind["PROC_3"] = 15] = "PROC_3";
})(exports.SymInfoBind || (exports.SymInfoBind = {}));
var SymInfoBind = exports.SymInfoBind;

(function (SymInfoType) {
    SymInfoType[SymInfoType["NOTYPE"] = 0] = "NOTYPE";
    SymInfoType[SymInfoType["OBJECT"] = 1] = "OBJECT";
    SymInfoType[SymInfoType["FUNC"] = 2] = "FUNC";
    SymInfoType[SymInfoType["SECTION"] = 3] = "SECTION";
    SymInfoType[SymInfoType["FILE"] = 4] = "FILE";
    SymInfoType[SymInfoType["OS_1"] = 10] = "OS_1";
    SymInfoType[SymInfoType["OS_2"] = 11] = "OS_2";
    SymInfoType[SymInfoType["OS_3"] = 12] = "OS_3";
    SymInfoType[SymInfoType["PROC_1"] = 13] = "PROC_1";
    SymInfoType[SymInfoType["PROC_2"] = 14] = "PROC_2";
    SymInfoType[SymInfoType["PROC_3"] = 15] = "PROC_3";
})(exports.SymInfoType || (exports.SymInfoType = {}));
var SymInfoType = exports.SymInfoType;

var ElfDwarfLoader = (function () {
    function ElfDwarfLoader() {
        this.symbolEntries = [];
    }
    ElfDwarfLoader.prototype.parseElfLoader = function (elf) {
        //this.parseDebugLine(elf);
        this.parseSymtab(elf);
    };

    ElfDwarfLoader.prototype.parseSymtab = function (elf) {
        console.log('ElfDwarfLoader.parseSymtab');
        var symtabHeader = elf.sectionHeadersByName[".symtab"];
        if (!symtabHeader)
            return;

        var nameSection = elf.sectionHeaders[symtabHeader.link];

        var nameStream = nameSection.stream.sliceWithLength(0);
        var stream = symtabHeader.stream.sliceWithLength(0);

        var n = 0;
        try  {
            while (stream.available > 0) {
                var entry = ElfSymbol.struct.read(stream);
                entry.name = nameStream.sliceWithLength(entry.nameIndex).readStringz();
                entry.index = n;
                this.symbolEntries.push(entry);
                n++;
            }
        } catch (e) {
            console.warn(e);
        }

        this.symbolEntries.sortBy(function (item) {
            return item.value;
        });
    };

    ElfDwarfLoader.prototype.getSymbolAt = function (address) {
        for (var n = 0; n < this.symbolEntries.length; n++) {
            var entry = this.symbolEntries[n];
            if (entry.contains(address))
                return entry;
        }

        /*
        return this.symbolEntries.binarySearchValue((item) => {
        if (address < item.value) return +1;
        if (address >= item.value + item.size) return -1;
        return 0;
        });
        */
        return null;
    };

    ElfDwarfLoader.prototype.parseDebugLine = function (elf) {
        console.log('ElfDwarfLoader.parseDebugLine');
        console.log(sectionHeader);
        var sectionHeader = elf.sectionHeadersByName[".debug_line"];
        var stream = sectionHeader.stream.sliceWithLength(0);
        var header = ElfDwarfHeader.struct.read(stream);
        console.log(header);
        var opcodes = StructArray(Uleb128, header.opcode_base).read(stream);
        console.log(opcodes);
        while (stream.available > 0) {
            console.log('item:');
            var item = StringzVariable.read(stream);
            if (!item.length)
                break;
            console.log(item);
        }

        while (stream.available > 0) {
            var entry = FileEntry.struct.read(stream);
            console.log(entry);
            if (!entry.name.length)
                break;
        }
    };
    return ElfDwarfLoader;
})();
exports.ElfDwarfLoader = ElfDwarfLoader;
//# sourceMappingURL=elf_dwarf.js.map
},
"src/format/format": function(module, exports, require) {
function detectFormatAsync(asyncStream) {
    return asyncStream.readChunkAsync(0, 4).then(function (data) {
        var stream = Stream.fromArrayBuffer(data);
        if (stream.length < 4) {
            console.error(asyncStream);
            throw (new Error("detectFormatAsync: Buffer is too small (" + data.byteLength + ")"));
        }
        var magic = stream.readString(4);
        switch (magic) {
            case 'PK\u0001\u0002':
            case 'PK\u0003\u0004':
            case 'PK\u0005\u0006':
                return 'zip';
            case '\u0000PBP':
                return 'pbp';
            case '\u007FELF':
                return 'elf';
            case '~PSP':
                return 'psp';
            case 'CISO':
                return 'ciso';
            case '\u0000\u0000\u0000\u0000':
                return asyncStream.readChunkAsync(0x10 * 0x800, 6).then(function (data) {
                    var stream = Stream.fromArrayBuffer(data);
                    var magic = stream.readString(6);
                    switch (magic) {
                        case '\u0001CD001':
                            return 'iso';
                        default:
                            throw (sprintf("Unknown format. Magic: '%s'", magic));
                    }
                });
            default:
                break;
        }
        throw (sprintf("Unknown format. Magic: '%s'", magic));
    });
}
exports.detectFormatAsync = detectFormatAsync;
//# sourceMappingURL=format.js.map
},
"src/format/iso": function(module, exports, require) {
var SECTOR_SIZE = 0x800;

var DirectoryRecordDate = (function () {
    function DirectoryRecordDate() {
        this.year = 2004;
        this.month = 1;
        this.day = 1;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.offset = 0;
    }
    Object.defineProperty(DirectoryRecordDate.prototype, "date", {
        get: function () {
            return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
        },
        enumerable: true,
        configurable: true
    });

    DirectoryRecordDate.struct = StructClass.create(DirectoryRecordDate, [
        { year: UInt8 },
        { month: UInt8 },
        { day: UInt8 },
        { hour: UInt8 },
        { minute: UInt8 },
        { second: UInt8 },
        { offset: UInt8 }
    ]);
    return DirectoryRecordDate;
})();

var IsoStringDate = (function () {
    function IsoStringDate() {
    }
    Object.defineProperty(IsoStringDate.prototype, "year", {
        get: function () {
            return parseInt(this.data.substr(0, 4));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "month", {
        get: function () {
            return parseInt(this.data.substr(4, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "day", {
        get: function () {
            return parseInt(this.data.substr(6, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "hour", {
        get: function () {
            return parseInt(this.data.substr(8, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "minute", {
        get: function () {
            return parseInt(this.data.substr(10, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "second", {
        get: function () {
            return parseInt(this.data.substr(12, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "hsecond", {
        get: function () {
            return parseInt(this.data.substr(14, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "offset", {
        get: function () {
            return parseInt(this.data.substr(16, 1));
        },
        enumerable: true,
        configurable: true
    });

    IsoStringDate.struct = StructClass.create(IsoStringDate, [
        { data: Stringz(17) }
    ]);
    return IsoStringDate;
})();

var VolumeDescriptorHeaderType;
(function (VolumeDescriptorHeaderType) {
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["BootRecord"] = 0x00] = "BootRecord";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionSetTerminator"] = 0xFF] = "VolumePartitionSetTerminator";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["PrimaryVolumeDescriptor"] = 0x01] = "PrimaryVolumeDescriptor";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["SupplementaryVolumeDescriptor"] = 0x02] = "SupplementaryVolumeDescriptor";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionDescriptor"] = 0x03] = "VolumePartitionDescriptor";
})(VolumeDescriptorHeaderType || (VolumeDescriptorHeaderType = {}));

var VolumeDescriptorHeader = (function () {
    function VolumeDescriptorHeader() {
    }
    VolumeDescriptorHeader.struct = StructClass.create(VolumeDescriptorHeader, [
        { type: UInt8 },
        { id: Stringz(5) },
        { version: UInt8 }
    ]);
    return VolumeDescriptorHeader;
})();

var DirectoryRecordFlags;
(function (DirectoryRecordFlags) {
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown1"] = 1 << 0] = "Unknown1";
    DirectoryRecordFlags[DirectoryRecordFlags["Directory"] = 1 << 1] = "Directory";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown2"] = 1 << 2] = "Unknown2";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown3"] = 1 << 3] = "Unknown3";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown4"] = 1 << 4] = "Unknown4";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown5"] = 1 << 5] = "Unknown5";
})(DirectoryRecordFlags || (DirectoryRecordFlags = {}));

var DirectoryRecord = (function () {
    function DirectoryRecord() {
        this.length = 0;
        this.extendedAttributeLength = 0;
        this.extent = 0;
        this.size = 0;
        this.date = new DirectoryRecordDate();
        this.flags = DirectoryRecordFlags.Directory;
        this.fileUnitSize = 0;
        this.interleave = 0;
        this.volumeSequenceNumber = 0;
        this.nameLength = 0;
        this.name = '';
    }
    Object.defineProperty(DirectoryRecord.prototype, "offset", {
        get: function () {
            return this.extent * SECTOR_SIZE;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(DirectoryRecord.prototype, "isDirectory", {
        get: function () {
            return (this.flags & DirectoryRecordFlags.Directory) != 0;
        },
        enumerable: true,
        configurable: true
    });

    DirectoryRecord.struct = StructClass.create(DirectoryRecord, [
        { length: UInt8 },
        { extendedAttributeLength: UInt8 },
        { extent: UInt32_2lb },
        { size: UInt32_2lb },
        { date: DirectoryRecordDate.struct },
        { flags: UInt8 },
        { fileUnitSize: UInt8 },
        { interleave: UInt8 },
        { volumeSequenceNumber: UInt16_2lb },
        { nameLength: UInt8 }
    ]);
    return DirectoryRecord;
})();

var PrimaryVolumeDescriptor = (function () {
    function PrimaryVolumeDescriptor() {
    }
    PrimaryVolumeDescriptor.struct = StructClass.create(PrimaryVolumeDescriptor, [
        { header: VolumeDescriptorHeader.struct },
        { _pad1: UInt8 },
        { systemId: Stringz(0x20) },
        { volumeId: Stringz(0x20) },
        { _pad2: Int64 },
        { volumeSpaceSize: UInt32_2lb },
        { _pad3: StructArray(Int64, 4) },
        { volumeSetSize: UInt32 },
        { volumeSequenceNumber: UInt32 },
        { logicalBlockSize: UInt16_2lb },
        { pathTableSize: UInt32_2lb },
        { typeLPathTable: UInt32 },
        { optType1PathTable: UInt32 },
        { typeMPathTable: UInt32 },
        { optTypeMPathTable: UInt32 },
        { directoryRecord: DirectoryRecord.struct },
        { _pad4: UInt8 },
        { volumeSetId: Stringz(0x80) },
        { publisherId: Stringz(0x80) },
        { preparerId: Stringz(0x80) },
        { applicationId: Stringz(0x80) },
        { copyrightFileId: Stringz(37) },
        { abstractFileId: Stringz(37) },
        { bibliographicFileId: Stringz(37) },
        { creationDate: IsoStringDate.struct },
        { modificationDate: IsoStringDate.struct },
        { expirationDate: IsoStringDate.struct },
        { effectiveDate: IsoStringDate.struct },
        { fileStructureVersion: UInt8 },
        { pad5: UInt8 },
        { pad6: StructArray(UInt8, 0x200) },
        { pad7: StructArray(UInt8, 653) }
    ]);
    return PrimaryVolumeDescriptor;
})();

var IsoNode = (function () {
    function IsoNode(iso, directoryRecord, parent) {
        if (typeof parent === "undefined") { parent = null; }
        this.iso = iso;
        this.directoryRecord = directoryRecord;
        this.parent = parent;
        this.childs = [];
        this.childsByName = {};
    }
    Object.defineProperty(IsoNode.prototype, "isRoot", {
        get: function () {
            return this.parent == null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "size", {
        get: function () {
            return this.directoryRecord.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "path", {
        get: function () {
            return (this.parent && !this.parent.isRoot) ? (this.parent.path + '/' + this.name) : this.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "name", {
        get: function () {
            return this.directoryRecord.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "isDirectory", {
        get: function () {
            return this.directoryRecord.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "date", {
        get: function () {
            return this.directoryRecord.date.date;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "extent", {
        get: function () {
            return this.directoryRecord.extent;
        },
        enumerable: true,
        configurable: true
    });

    IsoNode.prototype.readChunkAsync = function (offset, count) {
        var fileBaseLow = this.directoryRecord.offset;
        var low = fileBaseLow + offset;
        var high = Math.min(low + count, fileBaseLow + this.size);
        return this.iso.readChunkAsync(low, high - low);
    };

    IsoNode.prototype.addChild = function (child) {
        this.childs.push(child);
        this.childsByName[child.name] = child;
    };

    IsoNode.prototype.toString = function () {
        return sprintf('IsoNode(%s, %d)', this.path, this.size);
    };
    return IsoNode;
})();

var Iso = (function () {
    function Iso() {
        this.date = new Date();
    }
    Object.defineProperty(Iso.prototype, "name", {
        get: function () {
            return this.asyncStream.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "root", {
        get: function () {
            return this._root;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "childrenByPath", {
        get: function () {
            return this._childrenByPath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "children", {
        get: function () {
            return this._children.slice(0);
        },
        enumerable: true,
        configurable: true
    });

    Iso.fromStreamAsync = function (asyncStream) {
        return new Iso().loadAsync(asyncStream);
    };

    Iso.prototype.get = function (path) {
        path = path.replace(/^\/+/, '');

        var sce_file = path.match(/^sce_lbn(0x[0-9a-f]+|\d+)_size(0x[0-9a-f]+|\d+)$/i);
        if (sce_file) {
            var lba = parseIntFormat(sce_file[1]);
            var size = parseIntFormat(sce_file[2]);
            var dr = new DirectoryRecord();
            dr.extent = lba;
            dr.size = size;
            dr.name = '';

            //console.log(dr);
            return new IsoNode(this, dr, null);
        }

        if (path == '')
            return this.root;
        var node = this._childrenByPath[path];
        if (!node) {
            throw (new Error(sprintf("Can't find node '%s'", path)));
        }
        return node;
    };

    Object.defineProperty(Iso.prototype, "size", {
        get: function () {
            return this.asyncStream.size;
        },
        enumerable: true,
        configurable: true
    });

    Iso.prototype.readChunkAsync = function (offset, count) {
        return this.asyncStream.readChunkAsync(offset, count);
    };

    Iso.prototype.loadAsync = function (asyncStream) {
        var _this = this;
        this.asyncStream = asyncStream;
        this.date = asyncStream.date;

        if (PrimaryVolumeDescriptor.struct.length != SECTOR_SIZE)
            throw (sprintf("Invalid PrimaryVolumeDescriptor.struct size %d != %d", PrimaryVolumeDescriptor.struct.length, SECTOR_SIZE));

        return asyncStream.readChunkAsync(SECTOR_SIZE * 0x10, 0x800).then(function (arrayBuffer) {
            var stream = Stream.fromArrayBuffer(arrayBuffer);
            var pvd = PrimaryVolumeDescriptor.struct.read(stream);
            if (pvd.header.type != 1 /* PrimaryVolumeDescriptor */)
                throw ("Not an ISO file");
            if (pvd.header.id != 'CD001')
                throw ("Not an ISO file");

            _this._children = [];
            _this._childrenByPath = {};
            _this._root = new IsoNode(_this, pvd.directoryRecord);

            return _this.processDirectoryRecordAsync(_this._root).then(function () {
                return _this;
            });
        });
    };

    Iso.prototype.processDirectoryRecordAsync = function (parentIsoNode) {
        var _this = this;
        var directoryStart = parentIsoNode.directoryRecord.extent * SECTOR_SIZE;
        var directoryLength = parentIsoNode.directoryRecord.size;

        return this.asyncStream.readChunkAsync(directoryStart, directoryLength).then(function (data) {
            var directoryStream = Stream.fromArrayBuffer(data);

            while (directoryStream.available) {
                var directoryRecordSize = directoryStream.readUInt8();

                // Even if a directory spans multiple sectors, the directory entries are not permitted to cross the sector boundary (unlike the path table).
                // Where there is not enough space to record an entire directory entry at the end of a sector, that sector is zero-padded and the next
                // consecutive sector is used.
                if (directoryRecordSize == 0) {
                    directoryStream.position = MathUtils.nextAligned(directoryStream.position, SECTOR_SIZE);

                    continue;
                }

                directoryStream.position = directoryStream.position - 1;

                //Console.WriteLine("[{0}:{1:X}-{2:X}]", DirectoryRecordSize, DirectoryStream.Position, DirectoryStream.Position + DirectoryRecordSize);
                var directoryRecordStream = directoryStream.readStream(directoryRecordSize);
                var directoryRecord = DirectoryRecord.struct.read(directoryRecordStream);
                directoryRecord.name = directoryRecordStream.readStringz(directoryRecordStream.available);

                //Console.WriteLine("{0}", name); Console.ReadKey();
                if (directoryRecord.name == "" || directoryRecord.name == "\x01")
                    continue;

                //console.log(directoryRecord);
                //writefln("   %s", name);
                var child = new IsoNode(_this, directoryRecord, parentIsoNode);
                parentIsoNode.addChild(child);
                _this._children.push(child);
                _this._childrenByPath[child.path] = child;
            }

            var promiseGenerators = [];

            parentIsoNode.childs.forEach(function (child) {
                if (child.isDirectory) {
                    promiseGenerators.push(function () {
                        return _this.processDirectoryRecordAsync(child);
                    });
                }
            });

            return PromiseUtils.sequence(promiseGenerators);
        });
    };
    return Iso;
})();
exports.Iso = Iso;
//# sourceMappingURL=iso.js.map
},
"src/format/pbp": function(module, exports, require) {
var PbpMagic;
(function (PbpMagic) {
    PbpMagic[PbpMagic["expected"] = 0x50425000] = "expected";
})(PbpMagic || (PbpMagic = {}));

var PbpHeader = (function () {
    function PbpHeader() {
    }
    PbpHeader.struct = StructClass.create(PbpHeader, [
        { magic: Int32 },
        { version: Int32 },
        { offsets: StructArray(Int32, 8) }
    ]);
    return PbpHeader;
})();

var Names = (function () {
    function Names() {
    }
    Names.ParamSfo = "param.sfo";
    Names.Icon0Png = "icon0.png";
    Names.Icon1Pmf = "icon1.pmf";
    Names.Pic0Png = "pic0.png";
    Names.Pic1Png = "pic1.png";
    Names.Snd0At3 = "snd0.at3";
    Names.PspData = "psp.data";
    Names.PsarData = "psar.data";
    return Names;
})();
exports.Names = Names;

var Pbp = (function () {
    function Pbp() {
    }
    Pbp.fromStream = function (stream) {
        var pbp = new Pbp();
        pbp.load(stream);
        return pbp;
    };

    Pbp.prototype.load = function (stream) {
        this.stream = stream;
        this.header = PbpHeader.struct.read(stream);
        if (this.header.magic != 1346523136 /* expected */)
            throw ("Not a PBP file");
        this.header.offsets.push(stream.length);
    };

    Pbp.prototype.get = function (name) {
        var index = Pbp.names.indexOf(name);
        return this.getByIndex(index);
    };

    Pbp.prototype.getByIndex = function (index) {
        var offsets = this.header.offsets;
        return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
    };
    Pbp.names = [Names.ParamSfo, Names.Icon0Png, Names.Icon1Pmf, Names.Pic0Png, Names.Pic1Png, Names.Snd0At3, Names.PspData, Names.PsarData];
    return Pbp;
})();
exports.Pbp = Pbp;
//# sourceMappingURL=pbp.js.map
},
"src/format/psf": function(module, exports, require) {
var DataType;
(function (DataType) {
    DataType[DataType["Binary"] = 0] = "Binary";
    DataType[DataType["Text"] = 2] = "Text";
    DataType[DataType["Int"] = 4] = "Int";
})(DataType || (DataType = {}));

var HeaderStruct = (function () {
    function HeaderStruct() {
    }
    HeaderStruct.struct = StructClass.create(HeaderStruct, [
        { magic: UInt32 },
        { version: UInt32 },
        { keyTable: UInt32 },
        { valueTable: UInt32 },
        { numberOfPairs: UInt32 }
    ]);
    return HeaderStruct;
})();

var EntryStruct = (function () {
    function EntryStruct() {
    }
    EntryStruct.struct = StructClass.create(EntryStruct, [
        { keyOffset: UInt16 },
        { unknown: UInt8 },
        { dataType: UInt8 },
        { valueSize: UInt32 },
        { valueSizePad: UInt32 },
        { valueOffset: UInt32 }
    ]);
    return EntryStruct;
})();

var Psf = (function () {
    function Psf() {
        this.entries = [];
        this.entriesByName = {};
    }
    Psf.fromStream = function (stream) {
        var psf = new Psf();
        psf.load(stream);
        return psf;
    };

    Psf.prototype.load = function (stream) {
        var header = this.header = HeaderStruct.struct.read(stream);
        if (header.magic != 0x46535000)
            throw ("Not a PSF file");
        var entries = StructArray(EntryStruct.struct, header.numberOfPairs).read(stream);
        var entriesByName = {};

        var keysStream = stream.sliceWithLength(header.keyTable);
        var valuesStream = stream.sliceWithLength(header.valueTable);

        entries.forEach(function (entry) {
            var key = keysStream.sliceWithLength(entry.keyOffset).readUtf8Stringz();
            var valueStream = valuesStream.sliceWithLength(entry.valueOffset, entry.valueSize);
            entry.key = key;

            switch (entry.dataType) {
                case 0 /* Binary */:
                    entry.value = valueStream.sliceWithLength(0);
                    break;
                case 4 /* Int */:
                    entry.value = valueStream.readInt32();
                    break;
                case 2 /* Text */:
                    entry.value = valueStream.readUtf8Stringz();
                    break;
                default:
                    throw (sprintf("Unknown dataType: %s", entry.dataType));
            }

            entriesByName[entry.key] = entry.value;
        });

        this.entries = entries;
        this.entriesByName = entriesByName;
    };
    return Psf;
})();
exports.Psf = Psf;
//# sourceMappingURL=psf.js.map
},
"src/format/riff": function(module, exports, require) {
var Riff = (function () {
    function Riff() {
        this.handlers = {};
    }
    Riff.prototype.addHandler = function (name, handler) {
        this.handlers[name] = handler;
    };

    Riff.prototype.load = function (stream) {
        if (stream.readString(4) != 'RIFF')
            throw (new Error("Not a riff file"));
        var chunkSize = stream.readInt32();
        var chunkStream = stream.readStream(chunkSize);
        var chunkType = chunkStream.readString(4);
        switch (chunkType) {
            case 'WAVE':
                this.loadWave(chunkStream);
                break;
            default:
                throw (new Error("Don't know how to handle chunk '" + chunkType + "'"));
        }
    };

    Riff.prototype.loadWave = function (stream) {
        while (stream.available > 0) {
            var type = stream.readString(4);
            var length = stream.readInt32();
            var data = stream.readStream(length);
            console.info('subchunk', type, length, data);
            if (this.handlers[type] === undefined)
                throw (new Error("Don't know how to handle subchunk '" + type + "'"));
            (this.handlers[type])(data);
        }
    };

    Riff.fromStreamWithHandlers = function (stream, handlers) {
        var riff = new Riff();
        for (var handlerName in handlers)
            riff.addHandler(handlerName, handlers[handlerName]);
        riff.load(stream);
        return riff;
    };
    return Riff;
})();
exports.Riff = Riff;
//# sourceMappingURL=riff.js.map
},
"src/format/zip": function(module, exports, require) {
var ZipEntry = (function () {
    function ZipEntry(zip, name, parent) {
        this.zip = zip;
        this.name = name;
        this.parent = parent;
        this.children = {};
        this.normalizedName = ZipEntry.normalizeString(name);
    }
    Object.defineProperty(ZipEntry.prototype, "size", {
        get: function () {
            return this.uncompressedSize;
        },
        enumerable: true,
        configurable: true
    });

    ZipEntry.prototype.getChildList = function () {
        var list = [];
        for (var key in this.children)
            list.push(this.children[key]);
        return list;
    };

    Object.defineProperty(ZipEntry.prototype, "date", {
        get: function () {
            var dosDate = this.zipDirEntry.dosDate;
            var dosTime = this.zipDirEntry.dosTime;

            var seconds = BitUtils.extract(dosTime, 0, 5) * 2;
            var minutes = BitUtils.extract(dosTime, 5, 6);
            var hours = BitUtils.extract(dosTime, 11, 6);
            var day = BitUtils.extract(dosDate, 0, 5);
            var month = BitUtils.extract(dosDate, 5, 4);
            var year = BitUtils.extract(dosDate, 9, 7) + 1980;

            return new Date(year, month - 1, day, hours, minutes, seconds);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ZipEntry.prototype, "compressedSize", {
        get: function () {
            return this.zipDirEntry.compressedSize;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ZipEntry.prototype, "uncompressedSize", {
        get: function () {
            return this.zipDirEntry.uncompressedSize;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ZipEntry.prototype, "compressionType", {
        get: function () {
            return this.zipDirEntry.compType;
        },
        enumerable: true,
        configurable: true
    });

    ZipEntry.normalizeString = function (string) {
        return string.toUpperCase();
    };

    ZipEntry.prototype.readRawCompressedAsync = function () {
        var _this = this;
        if (this.compressedData)
            return Promise.resolve(this.compressedData);
        return this.zip.zipStream.readChunkAsync(this.zipDirEntry.headerOffset, this.zipDirEntry.compressedSize + 1024).then(function (data) {
            var stream = Stream.fromArrayBuffer(data);
            var zipFileRecord = ZipFileRecord.struct.read(stream);
            return _this.compressedData = stream.readBytes(zipFileRecord.compressedSize);
        });
    };

    ZipEntry.prototype.readChunkAsync = function (offset, length) {
        return this.readAsync().then(function (data) {
            return ArrayBufferUtils.fromUInt8Array(data.subarray(offset, offset + length));
        });
    };

    ZipEntry.prototype.readAsync = function () {
        var _this = this;
        if (this.uncompressedData)
            return Promise.resolve(this.uncompressedData);
        return this.readRawCompressedAsync().then(function (data) {
            switch (_this.compressionType) {
                case 8 /* DEFLATE */:
                    return new Zlib.RawInflate(data).decompress();
                case 0 /* STORED */:
                    return data;
                default:
                    throw (new Error("Unsupported compression type '" + _this.compressionType + "'"));
            }
        }).then(function (data) {
            return _this.uncompressedData = data;
        });
    };

    ZipEntry.prototype.access = function (path, create, fullPath) {
        if (typeof create === "undefined") { create = false; }
        if (typeof fullPath === "undefined") { fullPath = null; }
        if (fullPath === null)
            fullPath = path;
        if (path == '')
            return this;
        if (path == '.')
            return this;
        if (path == '..')
            return this.parent || this;

        var pathIndex = path.indexOf('/');

        // Single component
        if (pathIndex < 0) {
            var normalizedName = ZipEntry.normalizeString(path);
            var child = this.children[normalizedName];
            if (!child) {
                if (!create) {
                    throw (new Error("ZIP: Can't access to path '" + fullPath + "'"));
                } else {
                    child = this.children[normalizedName] = new ZipEntry(this.zip, path, this);
                }
            }
            return child;
        } else {
            return this.access(path.substr(0, pathIndex), create, fullPath).access(path.substr(pathIndex + 1), create, fullPath);
        }
    };
    return ZipEntry;
})();
exports.ZipEntry = ZipEntry;

var Zip = (function () {
    function Zip(zipStream, zipDirEntries) {
        var _this = this;
        this.zipStream = zipStream;
        this.zipDirEntries = zipDirEntries;
        this.root = new ZipEntry(this, '', null);
        zipDirEntries.forEach(function (zipDirEntry) {
            var item = _this.root.access(zipDirEntry.fileName, true);
            item.isDirectory = (zipDirEntry.fileName.substr(-1, 1) == '/');
            item.zipDirEntry = zipDirEntry;
        });
        console.log(this.root);
    }
    Zip.prototype.get = function (path) {
        return this.root.access(path);
    };

    Zip.prototype.has = function (path) {
        try  {
            this.root.access(path);
            return true;
        } catch (e) {
            return false;
        }
    };

    Zip.fromStreamAsync = function (zipStream) {
        console.info('zipStream', zipStream);

        return zipStream.readChunkAsync(zipStream.size - ZipEndLocator.struct.length, ZipEndLocator.struct.length).then(function (data) {
            var zipEndLocator = ZipEndLocator.struct.read(Stream.fromArrayBuffer(data));

            console.log('zipEndLocator', zipEndLocator);

            return zipStream.readChunkAsync(zipEndLocator.directoryOffset, zipEndLocator.directorySize).then(function (data) {
                var dirEntries = StructArray(ZipDirEntry.struct, zipEndLocator.entriesInDirectory).read(Stream.fromArrayBuffer(data));

                return new Zip(zipStream, dirEntries);
            });
        });
    };
    return Zip;
})();
exports.Zip = Zip;

(function (ZipCompressionType) {
    ZipCompressionType[ZipCompressionType["STORED"] = 0] = "STORED";
    ZipCompressionType[ZipCompressionType["SHRUNK"] = 1] = "SHRUNK";
    ZipCompressionType[ZipCompressionType["REDUCED1"] = 2] = "REDUCED1";
    ZipCompressionType[ZipCompressionType["REDUCED2"] = 3] = "REDUCED2";
    ZipCompressionType[ZipCompressionType["REDUCED3"] = 4] = "REDUCED3";
    ZipCompressionType[ZipCompressionType["REDUCED4"] = 5] = "REDUCED4";
    ZipCompressionType[ZipCompressionType["IMPLODED"] = 6] = "IMPLODED";
    ZipCompressionType[ZipCompressionType["TOKEN"] = 7] = "TOKEN";
    ZipCompressionType[ZipCompressionType["DEFLATE"] = 8] = "DEFLATE";
    ZipCompressionType[ZipCompressionType["DEFLATE64"] = 9] = "DEFLATE64";
})(exports.ZipCompressionType || (exports.ZipCompressionType = {}));
var ZipCompressionType = exports.ZipCompressionType;

var ZipEndLocator = (function () {
    function ZipEndLocator() {
    }
    ZipEndLocator.struct = StructClass.create(ZipEndLocator, [
        { magic: UInt32 },
        { currentDiskNumber: UInt16 },
        { startDiskNumber: UInt16 },
        { entriesOnDisk: UInt16 },
        { entriesInDirectory: UInt16 },
        { directorySize: UInt32 },
        { directoryOffset: UInt32 },
        { commentLength: UInt16 }
    ]);
    return ZipEndLocator;
})();
exports.ZipEndLocator = ZipEndLocator;

var ZipFileRecord = (function () {
    function ZipFileRecord() {
    }
    ZipFileRecord.struct = StructClass.create(ZipFileRecord, [
        { magic: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { compType: UInt16 },
        { dosTime: UInt16 },
        { dosDate: UInt16 },
        { crc32: UInt32 },
        { compressedSize: UInt32 },
        { uncompressedSize: UInt32 },
        { fileNameLength: UInt16 },
        { extraFieldLength: UInt16 },
        { fileName: StringWithSize(function (context) {
                return context.fileNameLength;
            }) },
        { extraField: StringWithSize(function (context) {
                return context.extraFieldLength;
            }) }
    ]);
    return ZipFileRecord;
})();
exports.ZipFileRecord = ZipFileRecord;

var ZipDirEntry = (function () {
    function ZipDirEntry() {
    }
    ZipDirEntry.struct = StructClass.create(ZipDirEntry, [
        { magic: UInt32 },
        { versionMadeBy: UInt16 },
        { versionToExtract: UInt16 },
        { flags: UInt16 },
        { compType: UInt16 },
        { dosTime: UInt16 },
        { dosDate: UInt16 },
        { crc32: UInt32 },
        { compressedSize: UInt32 },
        { uncompressedSize: UInt32 },
        { fileNameLength: UInt16 },
        { extraFieldLength: UInt16 },
        { fileCommentsLength: UInt16 },
        { diskNumberStart: UInt16 },
        { internalAttributes: UInt16 },
        { externalAttributes: UInt32 },
        { headerOffset: UInt32 },
        { fileName: StringWithSize(function (context) {
                return context.fileNameLength;
            }) },
        { extraField: StringWithSize(function (context) {
                return context.extraFieldLength;
            }) },
        { fileComments: StringWithSize(function (context) {
                return context.fileCommentsLength;
            }) }
    ]);
    return ZipDirEntry;
})();
exports.ZipDirEntry = ZipDirEntry;
//# sourceMappingURL=zip.js.map
},
"src/hle/SceKernelErrors": function(module, exports, require) {
var SceKernelErrors;
(function (SceKernelErrors) {
    /*
    * PSP Errors:
    * Represented by a 32-bit value with the following scheme:
    *
    *  31  30  29  28  27        16  15        0
    * | 1 | 0 | 0 | 0 | X | ... | X | E |... | E |
    *
    * Bits 31 and 30: Can only be 1 or 0.
    *      -> If both are 0, there's no error (0x0==SUCCESS).
    *      -> If 31 is 1 but 30 is 0, there's an error (0x80000000).
    *      -> If both bits are 1, a critical error stops the PSP (0xC0000000).
    *
    * Bits 29 and 28: Unknown. Never change.
    *
    * Bits 27 to 16 (X): Represent the system area associated with the error.
    *      -> 0x000 - Null (can be used anywhere).
    *      -> 0x001 - Errno (PSP's implementation of errno.h).
    *      -> 0x002 - Kernel.
    *      -> 0x011 - Utility.
    *      -> 0x021 - UMD.
    *      -> 0x022 - MemStick.
    *      -> 0x026 - Audio.
    *      -> 0x02b - Power.
    *      -> 0x041 - Wlan.
    *      -> 0x042 - SAS.
    *      -> 0x043 - HTTP(0x0431)/HTTPS/SSL(0x0435).
    *      -> 0x044 - WAVE.
    *      -> 0x046 - Font.
    *      -> 0x061 - MPEG(0x0618)/PSMF(0x0615)/PSMF Player(0x0616).
    *      -> 0x062 - AVC.
    *      -> 0x063 - ATRAC.
    *      -> 0x07f - Codec.
    *
    * Bits 15 to 0 (E): Represent the error code itself (different for each area).
    *      -> E.g.: 0x80110001 - Error -> Utility -> Some unknown error.
    */
    SceKernelErrors[SceKernelErrors["ERROR_OK"] = 0x00000000] = "ERROR_OK";

    SceKernelErrors[SceKernelErrors["ERROR_ERROR"] = 0x80020001] = "ERROR_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_NOTIMP"] = 0x80020002] = "ERROR_NOTIMP";

    SceKernelErrors[SceKernelErrors["ERROR_ALREADY"] = 0x80000020] = "ERROR_ALREADY";
    SceKernelErrors[SceKernelErrors["ERROR_BUSY"] = 0x80000021] = "ERROR_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_OUT_OF_MEMORY"] = 0x80000022] = "ERROR_OUT_OF_MEMORY";

    SceKernelErrors[SceKernelErrors["ERROR_INVALID_ID"] = 0x80000100] = "ERROR_INVALID_ID";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_NAME"] = 0x80000101] = "ERROR_INVALID_NAME";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_INDEX"] = 0x80000102] = "ERROR_INVALID_INDEX";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_POINTER"] = 0x80000103] = "ERROR_INVALID_POINTER";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_SIZE"] = 0x80000104] = "ERROR_INVALID_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_FLAG"] = 0x80000105] = "ERROR_INVALID_FLAG";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_COMMAND"] = 0x80000106] = "ERROR_INVALID_COMMAND";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_MODE"] = 0x80000107] = "ERROR_INVALID_MODE";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_FORMAT"] = 0x80000108] = "ERROR_INVALID_FORMAT";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_VALUE"] = 0x800001FE] = "ERROR_INVALID_VALUE";
    SceKernelErrors[SceKernelErrors["ERROR_INVALID_ARGUMENT"] = 0x800001FF] = "ERROR_INVALID_ARGUMENT";

    SceKernelErrors[SceKernelErrors["ERROR_BAD_FILE"] = 0x80000209] = "ERROR_BAD_FILE";
    SceKernelErrors[SceKernelErrors["ERROR_ACCESS_ERROR"] = 0x8000020D] = "ERROR_ACCESS_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_OPERATION_NOT_PERMITTED"] = 0x80010001] = "ERROR_ERRNO_OPERATION_NOT_PERMITTED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_NOT_FOUND"] = 0x80010002] = "ERROR_ERRNO_FILE_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_OPEN_ERROR"] = 0x80010003] = "ERROR_ERRNO_FILE_OPEN_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_IO_ERROR"] = 0x80010005] = "ERROR_ERRNO_IO_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_ARG_LIST_TOO_LONG"] = 0x80010007] = "ERROR_ERRNO_ARG_LIST_TOO_LONG";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_FILE_DESCRIPTOR"] = 0x80010009] = "ERROR_ERRNO_INVALID_FILE_DESCRIPTOR";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_RESOURCE_UNAVAILABLE"] = 0x8001000B] = "ERROR_ERRNO_RESOURCE_UNAVAILABLE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NO_MEMORY"] = 0x8001000C] = "ERROR_ERRNO_NO_MEMORY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NO_PERM"] = 0x8001000D] = "ERROR_ERRNO_NO_PERM";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_INVALID_ADDR"] = 0x8001000E] = "ERROR_ERRNO_FILE_INVALID_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_DEVICE_BUSY"] = 0x80010010] = "ERROR_ERRNO_DEVICE_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_ALREADY_EXISTS"] = 0x80010011] = "ERROR_ERRNO_FILE_ALREADY_EXISTS";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_CROSS_DEV_LINK"] = 0x80010012] = "ERROR_ERRNO_CROSS_DEV_LINK";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_DEVICE_NOT_FOUND"] = 0x80010013] = "ERROR_ERRNO_DEVICE_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NOT_A_DIRECTORY"] = 0x80010014] = "ERROR_ERRNO_NOT_A_DIRECTORY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_IS_DIRECTORY"] = 0x80010015] = "ERROR_ERRNO_IS_DIRECTORY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_ARGUMENT"] = 0x80010016] = "ERROR_ERRNO_INVALID_ARGUMENT";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_TOO_MANY_OPEN_SYSTEM_FILES"] = 0x80010018] = "ERROR_ERRNO_TOO_MANY_OPEN_SYSTEM_FILES";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_IS_TOO_BIG"] = 0x8001001B] = "ERROR_ERRNO_FILE_IS_TOO_BIG";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_DEVICE_NO_FREE_SPACE"] = 0x8001001C] = "ERROR_ERRNO_DEVICE_NO_FREE_SPACE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_READ_ONLY"] = 0x8001001E] = "ERROR_ERRNO_READ_ONLY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_CLOSED"] = 0x80010020] = "ERROR_ERRNO_CLOSED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_PATH_TOO_LONG"] = 0x80010024] = "ERROR_ERRNO_FILE_PATH_TOO_LONG";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_PROTOCOL"] = 0x80010047] = "ERROR_ERRNO_FILE_PROTOCOL";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_DIRECTORY_IS_NOT_EMPTY"] = 0x8001005A] = "ERROR_ERRNO_DIRECTORY_IS_NOT_EMPTY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_TOO_MANY_SYMBOLIC_LINKS"] = 0x8001005C] = "ERROR_ERRNO_TOO_MANY_SYMBOLIC_LINKS";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_ADDR_IN_USE"] = 0x80010062] = "ERROR_ERRNO_FILE_ADDR_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_CONNECTION_ABORTED"] = 0x80010067] = "ERROR_ERRNO_CONNECTION_ABORTED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_CONNECTION_RESET"] = 0x80010068] = "ERROR_ERRNO_CONNECTION_RESET";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NO_FREE_BUF_SPACE"] = 0x80010069] = "ERROR_ERRNO_NO_FREE_BUF_SPACE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_TIMEOUT"] = 0x8001006E] = "ERROR_ERRNO_FILE_TIMEOUT";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_IN_PROGRESS"] = 0x80010077] = "ERROR_ERRNO_IN_PROGRESS";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_ALREADY"] = 0x80010078] = "ERROR_ERRNO_ALREADY";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NO_MEDIA"] = 0x8001007B] = "ERROR_ERRNO_NO_MEDIA";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_MEDIUM"] = 0x8001007C] = "ERROR_ERRNO_INVALID_MEDIUM";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_ADDRESS_NOT_AVAILABLE"] = 0x8001007D] = "ERROR_ERRNO_ADDRESS_NOT_AVAILABLE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_IS_ALREADY_CONNECTED"] = 0x8001007F] = "ERROR_ERRNO_IS_ALREADY_CONNECTED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_NOT_CONNECTED"] = 0x80010080] = "ERROR_ERRNO_NOT_CONNECTED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FILE_QUOTA_EXCEEDED"] = 0x80010084] = "ERROR_ERRNO_FILE_QUOTA_EXCEEDED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_FUNCTION_NOT_SUPPORTED"] = 0x8001B000] = "ERROR_ERRNO_FUNCTION_NOT_SUPPORTED";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_ADDR_OUT_OF_MAIN_MEM"] = 0x8001B001] = "ERROR_ERRNO_ADDR_OUT_OF_MAIN_MEM";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_UNIT_NUM"] = 0x8001B002] = "ERROR_ERRNO_INVALID_UNIT_NUM";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_FILE_SIZE"] = 0x8001B003] = "ERROR_ERRNO_INVALID_FILE_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_ERRNO_INVALID_FLAG"] = 0x8001B004] = "ERROR_ERRNO_INVALID_FLAG";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_CANNOT_BE_CALLED_FROM_INTERRUPT"] = 0x80020064] = "ERROR_KERNEL_CANNOT_BE_CALLED_FROM_INTERRUPT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_INTERRUPTS_ALREADY_DISABLED"] = 0x80020066] = "ERROR_KERNEL_INTERRUPTS_ALREADY_DISABLED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNKNOWN_UID"] = 0x800200cb] = "ERROR_KERNEL_UNKNOWN_UID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNMATCH_TYPE_UID"] = 0x800200cc] = "ERROR_KERNEL_UNMATCH_TYPE_UID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_EXIST_ID"] = 0x800200cd] = "ERROR_KERNEL_NOT_EXIST_ID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_FUNCTION_UID"] = 0x800200ce] = "ERROR_KERNEL_NOT_FOUND_FUNCTION_UID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ALREADY_HOLDER_UID"] = 0x800200cf] = "ERROR_KERNEL_ALREADY_HOLDER_UID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_HOLDER_UID"] = 0x800200d0] = "ERROR_KERNEL_NOT_HOLDER_UID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_PERMISSION"] = 0x800200d1] = "ERROR_KERNEL_ILLEGAL_PERMISSION";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_ARGUMENT"] = 0x800200d2] = "ERROR_KERNEL_ILLEGAL_ARGUMENT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_ADDR"] = 0x800200d3] = "ERROR_KERNEL_ILLEGAL_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMORY_AREA_OUT_OF_RANGE"] = 0x800200d4] = "ERROR_KERNEL_MEMORY_AREA_OUT_OF_RANGE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMORY_AREA_IS_OVERLAP"] = 0x800200d5] = "ERROR_KERNEL_MEMORY_AREA_IS_OVERLAP";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_PARTITION_ID"] = 0x800200d6] = "ERROR_KERNEL_ILLEGAL_PARTITION_ID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_PARTITION_IN_USE"] = 0x800200d7] = "ERROR_KERNEL_PARTITION_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE"] = 0x800200d8] = "ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK"] = 0x800200d9] = "ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_INHIBITED_RESIZE_MEMBLOCK"] = 0x800200da] = "ERROR_KERNEL_INHIBITED_RESIZE_MEMBLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FAILED_RESIZE_MEMBLOCK"] = 0x800200db] = "ERROR_KERNEL_FAILED_RESIZE_MEMBLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FAILED_ALLOC_HEAPBLOCK"] = 0x800200dc] = "ERROR_KERNEL_FAILED_ALLOC_HEAPBLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FAILED_ALLOC_HEAP"] = 0x800200dd] = "ERROR_KERNEL_FAILED_ALLOC_HEAP";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_CHUNK_ID"] = 0x800200de] = "ERROR_KERNEL_ILLEGAL_CHUNK_ID";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_CANNOT_FIND_CHUNK_NAME"] = 0x800200df] = "ERROR_KERNEL_CANNOT_FIND_CHUNK_NAME";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NO_FREE_CHUNK"] = 0x800200e0] = "ERROR_KERNEL_NO_FREE_CHUNK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMBLOCK_FRAGMENTED"] = 0x800200e1] = "ERROR_KERNEL_MEMBLOCK_FRAGMENTED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMBLOCK_CANNOT_JOINT"] = 0x800200e2] = "ERROR_KERNEL_MEMBLOCK_CANNOT_JOINT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMBLOCK_CANNOT_SEPARATE"] = 0x800200e3] = "ERROR_KERNEL_MEMBLOCK_CANNOT_SEPARATE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_ALIGNMENT_SIZE"] = 0x800200e4] = "ERROR_KERNEL_ILLEGAL_ALIGNMENT_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_DEVKIT_VER"] = 0x800200e5] = "ERROR_KERNEL_ILLEGAL_DEVKIT_VER";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_LINK_ERROR"] = 0x8002012c] = "ERROR_KERNEL_MODULE_LINK_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_OBJECT_FORMAT"] = 0x8002012d] = "ERROR_KERNEL_ILLEGAL_OBJECT_FORMAT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNKNOWN_MODULE"] = 0x8002012e] = "ERROR_KERNEL_UNKNOWN_MODULE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNKNOWN_MODULE_FILE"] = 0x8002012f] = "ERROR_KERNEL_UNKNOWN_MODULE_FILE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FILE_READ_ERROR"] = 0x80020130] = "ERROR_KERNEL_FILE_READ_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEMORY_IN_USE"] = 0x80020131] = "ERROR_KERNEL_MEMORY_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_PARTITION_MISMATCH"] = 0x80020132] = "ERROR_KERNEL_PARTITION_MISMATCH";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_ALREADY_STARTED"] = 0x80020133] = "ERROR_KERNEL_MODULE_ALREADY_STARTED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_NOT_STARTED"] = 0x80020134] = "ERROR_KERNEL_MODULE_NOT_STARTED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_ALREADY_STOPPED"] = 0x80020135] = "ERROR_KERNEL_MODULE_ALREADY_STOPPED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_CANNOT_STOP"] = 0x80020136] = "ERROR_KERNEL_MODULE_CANNOT_STOP";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_NOT_STOPPED"] = 0x80020137] = "ERROR_KERNEL_MODULE_NOT_STOPPED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_CANNOT_REMOVE"] = 0x80020138] = "ERROR_KERNEL_MODULE_CANNOT_REMOVE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_EXCLUSIVE_LOAD"] = 0x80020139] = "ERROR_KERNEL_EXCLUSIVE_LOAD";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LIBRARY_IS_NOT_LINKED"] = 0x8002013a] = "ERROR_KERNEL_LIBRARY_IS_NOT_LINKED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LIBRARY_ALREADY_EXISTS"] = 0x8002013b] = "ERROR_KERNEL_LIBRARY_ALREADY_EXISTS";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LIBRARY_NOT_FOUND"] = 0x8002013c] = "ERROR_KERNEL_LIBRARY_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_LIBRARY_HEADER"] = 0x8002013d] = "ERROR_KERNEL_ILLEGAL_LIBRARY_HEADER";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LIBRARY_IN_USE"] = 0x8002013e] = "ERROR_KERNEL_LIBRARY_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_ALREADY_STOPPING"] = 0x8002013f] = "ERROR_KERNEL_MODULE_ALREADY_STOPPING";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_OFFSET_VALUE"] = 0x80020140] = "ERROR_KERNEL_ILLEGAL_OFFSET_VALUE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_POSITION_CODE"] = 0x80020141] = "ERROR_KERNEL_ILLEGAL_POSITION_CODE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_ACCESS_CODE"] = 0x80020142] = "ERROR_KERNEL_ILLEGAL_ACCESS_CODE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MODULE_MANAGER_BUSY"] = 0x80020143] = "ERROR_KERNEL_MODULE_MANAGER_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_FLAG"] = 0x80020144] = "ERROR_KERNEL_ILLEGAL_FLAG";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_CANNOT_GET_MODULE_LIST"] = 0x80020145] = "ERROR_KERNEL_CANNOT_GET_MODULE_LIST";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_PROHIBIT_LOADMODULE_DEVICE"] = 0x80020146] = "ERROR_KERNEL_PROHIBIT_LOADMODULE_DEVICE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_PROHIBIT_LOADEXEC_DEVICE"] = 0x80020147] = "ERROR_KERNEL_PROHIBIT_LOADEXEC_DEVICE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNSUPPORTED_PRX_TYPE"] = 0x80020148] = "ERROR_KERNEL_UNSUPPORTED_PRX_TYPE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_PERMISSION_CALL"] = 0x80020149] = "ERROR_KERNEL_ILLEGAL_PERMISSION_CALL";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_CANNOT_GET_MODULE_INFO"] = 0x8002014a] = "ERROR_KERNEL_CANNOT_GET_MODULE_INFO";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_LOADEXEC_BUFFER"] = 0x8002014b] = "ERROR_KERNEL_ILLEGAL_LOADEXEC_BUFFER";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_LOADEXEC_FILENAME"] = 0x8002014c] = "ERROR_KERNEL_ILLEGAL_LOADEXEC_FILENAME";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NO_EXIT_CALLBACK"] = 0x8002014d] = "ERROR_KERNEL_NO_EXIT_CALLBACK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MEDIA_CHANGED"] = 0x8002014e] = "ERROR_KERNEL_MEDIA_CHANGED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_CANNOT_USE_BETA_VER_MODULE"] = 0x8002014f] = "ERROR_KERNEL_CANNOT_USE_BETA_VER_MODULE";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NO_MEMORY"] = 0x80020190] = "ERROR_KERNEL_NO_MEMORY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_ATTR"] = 0x80020191] = "ERROR_KERNEL_ILLEGAL_ATTR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_THREAD_ENTRY_ADDR"] = 0x80020192] = "ERROR_KERNEL_ILLEGAL_THREAD_ENTRY_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_PRIORITY"] = 0x80020193] = "ERROR_KERNEL_ILLEGAL_PRIORITY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_STACK_SIZE"] = 0x80020194] = "ERROR_KERNEL_ILLEGAL_STACK_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_MODE"] = 0x80020195] = "ERROR_KERNEL_ILLEGAL_MODE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_MASK"] = 0x80020196] = "ERROR_KERNEL_ILLEGAL_MASK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_THREAD"] = 0x80020197] = "ERROR_KERNEL_ILLEGAL_THREAD";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_THREAD"] = 0x80020198] = "ERROR_KERNEL_NOT_FOUND_THREAD";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_SEMAPHORE"] = 0x80020199] = "ERROR_KERNEL_NOT_FOUND_SEMAPHORE";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_EVENT_FLAG"] = 0x8002019a] = "ERROR_KERNEL_NOT_FOUND_EVENT_FLAG";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_MESSAGE_BOX"] = 0x8002019b] = "ERROR_KERNEL_NOT_FOUND_MESSAGE_BOX";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_VPOOL"] = 0x8002019c] = "ERROR_KERNEL_NOT_FOUND_VPOOL";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_FPOOL"] = 0x8002019d] = "ERROR_KERNEL_NOT_FOUND_FPOOL";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_MESSAGE_PIPE"] = 0x8002019e] = "ERROR_KERNEL_NOT_FOUND_MESSAGE_PIPE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_ALARM"] = 0x8002019f] = "ERROR_KERNEL_NOT_FOUND_ALARM";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_THREAD_EVENT_HANDLER"] = 0x800201a0] = "ERROR_KERNEL_NOT_FOUND_THREAD_EVENT_HANDLER";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_CALLBACK"] = 0x800201a1] = "ERROR_KERNEL_NOT_FOUND_CALLBACK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_ALREADY_DORMANT"] = 0x800201a2] = "ERROR_KERNEL_THREAD_ALREADY_DORMANT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_ALREADY_SUSPEND"] = 0x800201a3] = "ERROR_KERNEL_THREAD_ALREADY_SUSPEND";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_IS_NOT_DORMANT"] = 0x800201a4] = "ERROR_KERNEL_THREAD_IS_NOT_DORMANT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_IS_NOT_SUSPEND"] = 0x800201a5] = "ERROR_KERNEL_THREAD_IS_NOT_SUSPEND";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_IS_NOT_WAIT"] = 0x800201a6] = "ERROR_KERNEL_THREAD_IS_NOT_WAIT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_CAN_NOT_WAIT"] = 0x800201a7] = "ERROR_KERNEL_WAIT_CAN_NOT_WAIT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_TIMEOUT"] = 0x800201a8] = "ERROR_KERNEL_WAIT_TIMEOUT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_CANCELLED"] = 0x800201a9] = "ERROR_KERNEL_WAIT_CANCELLED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_STATUS_RELEASED"] = 0x800201aa] = "ERROR_KERNEL_WAIT_STATUS_RELEASED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_STATUS_RELEASED_CALLBACK"] = 0x800201ab] = "ERROR_KERNEL_WAIT_STATUS_RELEASED_CALLBACK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_THREAD_IS_TERMINATED"] = 0x800201ac] = "ERROR_KERNEL_THREAD_IS_TERMINATED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_SEMA_ZERO"] = 0x800201ad] = "ERROR_KERNEL_SEMA_ZERO";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_SEMA_OVERFLOW"] = 0x800201ae] = "ERROR_KERNEL_SEMA_OVERFLOW";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_EVENT_FLAG_POLL_FAILED"] = 0x800201af] = "ERROR_KERNEL_EVENT_FLAG_POLL_FAILED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_EVENT_FLAG_NO_MULTI_PERM"] = 0x800201b0] = "ERROR_KERNEL_EVENT_FLAG_NO_MULTI_PERM";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN"] = 0x800201b1] = "ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MESSAGEBOX_NO_MESSAGE"] = 0x800201b2] = "ERROR_KERNEL_MESSAGEBOX_NO_MESSAGE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MESSAGE_PIPE_FULL"] = 0x800201b3] = "ERROR_KERNEL_MESSAGE_PIPE_FULL";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MESSAGE_PIPE_EMPTY"] = 0x800201b4] = "ERROR_KERNEL_MESSAGE_PIPE_EMPTY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_WAIT_DELETE"] = 0x800201b5] = "ERROR_KERNEL_WAIT_DELETE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_MEMBLOCK"] = 0x800201b6] = "ERROR_KERNEL_ILLEGAL_MEMBLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_MEMSIZE"] = 0x800201b7] = "ERROR_KERNEL_ILLEGAL_MEMSIZE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_SCRATCHPAD_ADDR"] = 0x800201b8] = "ERROR_KERNEL_ILLEGAL_SCRATCHPAD_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_SCRATCHPAD_IN_USE"] = 0x800201b9] = "ERROR_KERNEL_SCRATCHPAD_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_SCRATCHPAD_NOT_IN_USE"] = 0x800201ba] = "ERROR_KERNEL_SCRATCHPAD_NOT_IN_USE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_TYPE"] = 0x800201bb] = "ERROR_KERNEL_ILLEGAL_TYPE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_SIZE"] = 0x800201bc] = "ERROR_KERNEL_ILLEGAL_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_COUNT"] = 0x800201bd] = "ERROR_KERNEL_ILLEGAL_COUNT";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_FOUND_VTIMER"] = 0x800201be] = "ERROR_KERNEL_NOT_FOUND_VTIMER";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_VTIMER"] = 0x800201bf] = "ERROR_KERNEL_ILLEGAL_VTIMER";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ILLEGAL_KTLS"] = 0x800201c0] = "ERROR_KERNEL_ILLEGAL_KTLS";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_KTLS_IS_FULL"] = 0x800201c1] = "ERROR_KERNEL_KTLS_IS_FULL";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_KTLS_IS_BUSY"] = 0x800201c2] = "ERROR_KERNEL_KTLS_IS_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_NOT_FOUND"] = 0x800201c3] = "ERROR_KERNEL_MUTEX_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_LOCKED"] = 0x800201c4] = "ERROR_KERNEL_MUTEX_LOCKED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_UNLOCKED"] = 0x800201c5] = "ERROR_KERNEL_MUTEX_UNLOCKED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_LOCK_OVERFLOW"] = 0x800201c6] = "ERROR_KERNEL_MUTEX_LOCK_OVERFLOW";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_UNLOCK_UNDERFLOW"] = 0x800201c7] = "ERROR_KERNEL_MUTEX_UNLOCK_UNDERFLOW";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MUTEX_RECURSIVE_NOT_ALLOWED"] = 0x800201c8] = "ERROR_KERNEL_MUTEX_RECURSIVE_NOT_ALLOWED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MESSAGEBOX_DUPLICATE_MESSAGE"] = 0x800201c9] = "ERROR_KERNEL_MESSAGEBOX_DUPLICATE_MESSAGE";

    //PSP_LWMUTEX_ERROR_NO_SUCH_LWMUTEX 0x800201CA
    //PSP_LWMUTEX_ERROR_TRYLOCK_FAILED 0x800201CB
    //PSP_LWMUTEX_ERROR_NOT_LOCKED 0x800201CC
    //PSP_LWMUTEX_ERROR_LOCK_OVERFLOW 0x800201CD
    //PSP_LWMUTEX_ERROR_UNLOCK_UNDERFLOW 0x800201CE
    //PSP_LWMUTEX_ERROR_ALREADY_LOCKED 0x800201CF
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_NOT_FOUND"] = 0x800201ca] = "ERROR_KERNEL_LWMUTEX_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_LOCKED"] = 0x800201cb] = "ERROR_KERNEL_LWMUTEX_LOCKED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_UNLOCKED"] = 0x800201cc] = "ERROR_KERNEL_LWMUTEX_UNLOCKED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_LOCK_OVERFLOW"] = 0x800201cd] = "ERROR_KERNEL_LWMUTEX_LOCK_OVERFLOW";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_UNLOCK_UNDERFLOW"] = 0x800201ce] = "ERROR_KERNEL_LWMUTEX_UNLOCK_UNDERFLOW";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_LWMUTEX_RECURSIVE_NOT_ALLOWED"] = 0x800201cf] = "ERROR_KERNEL_LWMUTEX_RECURSIVE_NOT_ALLOWED";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_POWER_CANNOT_CANCEL"] = 0x80020261] = "ERROR_KERNEL_POWER_CANNOT_CANCEL";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_TOO_MANY_OPEN_FILES"] = 0x80020320] = "ERROR_KERNEL_TOO_MANY_OPEN_FILES";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NO_SUCH_DEVICE"] = 0x80020321] = "ERROR_KERNEL_NO_SUCH_DEVICE";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_BAD_FILE_DESCRIPTOR"] = 0x80020323] = "ERROR_KERNEL_BAD_FILE_DESCRIPTOR";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_UNSUPPORTED_OPERATION"] = 0x80020325] = "ERROR_KERNEL_UNSUPPORTED_OPERATION";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOCWD"] = 0x8002032c] = "ERROR_KERNEL_NOCWD";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_FILENAME_TOO_LONG"] = 0x8002032d] = "ERROR_KERNEL_FILENAME_TOO_LONG";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_ASYNC_BUSY"] = 0x80020329] = "ERROR_KERNEL_ASYNC_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NO_ASYNC_OP"] = 0x8002032a] = "ERROR_KERNEL_NO_ASYNC_OP";

    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_NOT_CACHE_ALIGNED"] = 0x8002044c] = "ERROR_KERNEL_NOT_CACHE_ALIGNED";
    SceKernelErrors[SceKernelErrors["ERROR_KERNEL_MAX_ERROR"] = 0x8002044d] = "ERROR_KERNEL_MAX_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_INVALID_STATUS"] = 0x80110001] = "ERROR_UTILITY_INVALID_STATUS";
    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_INVALID_PARAM_ADDR"] = 0x80110002] = "ERROR_UTILITY_INVALID_PARAM_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_IS_UNKNOWN"] = 0x80110003] = "ERROR_UTILITY_IS_UNKNOWN";
    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_INVALID_PARAM_SIZE"] = 0x80110004] = "ERROR_UTILITY_INVALID_PARAM_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_WRONG_TYPE"] = 0x80110005] = "ERROR_UTILITY_WRONG_TYPE";
    SceKernelErrors[SceKernelErrors["ERROR_UTILITY_MODULE_NOT_FOUND"] = 0x80110006] = "ERROR_UTILITY_MODULE_NOT_FOUND";

    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_NO_MEMSTICK"] = 0x80110301] = "ERROR_SAVEDATA_LOAD_NO_MEMSTICK";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_MEMSTICK_REMOVED"] = 0x80110302] = "ERROR_SAVEDATA_LOAD_MEMSTICK_REMOVED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_ACCESS_ERROR"] = 0x80110305] = "ERROR_SAVEDATA_LOAD_ACCESS_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_DATA_BROKEN"] = 0x80110306] = "ERROR_SAVEDATA_LOAD_DATA_BROKEN";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_NO_DATA"] = 0x80110307] = "ERROR_SAVEDATA_LOAD_NO_DATA";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_BAD_PARAMS"] = 0x80110308] = "ERROR_SAVEDATA_LOAD_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_NO_UMD"] = 0x80110309] = "ERROR_SAVEDATA_LOAD_NO_UMD";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_LOAD_INTERNAL_ERROR"] = 0x80110309] = "ERROR_SAVEDATA_LOAD_INTERNAL_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_NO_MEMSTICK"] = 0x80110321] = "ERROR_SAVEDATA_RW_NO_MEMSTICK";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_MEMSTICK_REMOVED"] = 0x80110322] = "ERROR_SAVEDATA_RW_MEMSTICK_REMOVED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_MEMSTICK_FULL"] = 0x80110323] = "ERROR_SAVEDATA_RW_MEMSTICK_FULL";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_MEMSTICK_PROTECTED"] = 0x80110324] = "ERROR_SAVEDATA_RW_MEMSTICK_PROTECTED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_ACCESS_ERROR"] = 0x80110325] = "ERROR_SAVEDATA_RW_ACCESS_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_DATA_BROKEN"] = 0x80110326] = "ERROR_SAVEDATA_RW_DATA_BROKEN";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_NO_DATA"] = 0x80110327] = "ERROR_SAVEDATA_RW_NO_DATA";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_BAD_PARAMS"] = 0x80110328] = "ERROR_SAVEDATA_RW_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_FILE_NOT_FOUND"] = 0x80110329] = "ERROR_SAVEDATA_RW_FILE_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_CAN_NOT_SUSPEND"] = 0x8011032a] = "ERROR_SAVEDATA_RW_CAN_NOT_SUSPEND";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_INTERNAL_ERROR"] = 0x8011032b] = "ERROR_SAVEDATA_RW_INTERNAL_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_BAD_STATUS"] = 0x8011032c] = "ERROR_SAVEDATA_RW_BAD_STATUS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_RW_SECURE_FILE_FULL"] = 0x8011032d] = "ERROR_SAVEDATA_RW_SECURE_FILE_FULL";

    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_NO_MEMSTICK"] = 0x80110341] = "ERROR_SAVEDATA_DELETE_NO_MEMSTICK";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_MEMSTICK_REMOVED"] = 0x80110342] = "ERROR_SAVEDATA_DELETE_MEMSTICK_REMOVED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_MEMSTICK_PROTECTED"] = 0x80110344] = "ERROR_SAVEDATA_DELETE_MEMSTICK_PROTECTED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_ACCESS_ERROR"] = 0x80110345] = "ERROR_SAVEDATA_DELETE_ACCESS_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_DATA_BROKEN"] = 0x80110346] = "ERROR_SAVEDATA_DELETE_DATA_BROKEN";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_NO_DATA"] = 0x80110347] = "ERROR_SAVEDATA_DELETE_NO_DATA";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_BAD_PARAMS"] = 0x80110348] = "ERROR_SAVEDATA_DELETE_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_DELETE_INTERNAL_ERROR"] = 0x8011034b] = "ERROR_SAVEDATA_DELETE_INTERNAL_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_NO_MEMSTICK"] = 0x80110381] = "ERROR_SAVEDATA_SAVE_NO_MEMSTICK";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_MEMSTICK_REMOVED"] = 0x80110382] = "ERROR_SAVEDATA_SAVE_MEMSTICK_REMOVED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_NO_SPACE"] = 0x80110383] = "ERROR_SAVEDATA_SAVE_NO_SPACE";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_MEMSTICK_PROTECTED"] = 0x80110384] = "ERROR_SAVEDATA_SAVE_MEMSTICK_PROTECTED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_ACCESS_ERROR"] = 0x80110385] = "ERROR_SAVEDATA_SAVE_ACCESS_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_BAD_PARAMS"] = 0x80110388] = "ERROR_SAVEDATA_SAVE_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_NO_UMD"] = 0x80110389] = "ERROR_SAVEDATA_SAVE_NO_UMD";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_WRONG_UMD"] = 0x8011038a] = "ERROR_SAVEDATA_SAVE_WRONG_UMD";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SAVE_INTERNAL_ERROR"] = 0x8011038b] = "ERROR_SAVEDATA_SAVE_INTERNAL_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_NO_MEMSTICK"] = 0x801103c1] = "ERROR_SAVEDATA_SIZES_NO_MEMSTICK";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_MEMSTICK_REMOVED"] = 0x801103c2] = "ERROR_SAVEDATA_SIZES_MEMSTICK_REMOVED";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_ACCESS_ERROR"] = 0x801103c5] = "ERROR_SAVEDATA_SIZES_ACCESS_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_DATA_BROKEN"] = 0x801103c6] = "ERROR_SAVEDATA_SIZES_DATA_BROKEN";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_NO_DATA"] = 0x801103c7] = "ERROR_SAVEDATA_SIZES_NO_DATA";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_BAD_PARAMS"] = 0x801103c8] = "ERROR_SAVEDATA_SIZES_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_SAVEDATA_SIZES_INTERNAL_ERROR"] = 0x801103cb] = "ERROR_SAVEDATA_SIZES_INTERNAL_ERROR";

    SceKernelErrors[SceKernelErrors["ERROR_NETPARAM_BAD_NETCONF"] = 0x80110601] = "ERROR_NETPARAM_BAD_NETCONF";
    SceKernelErrors[SceKernelErrors["ERROR_NETPARAM_BAD_PARAM"] = 0x80110604] = "ERROR_NETPARAM_BAD_PARAM";

    SceKernelErrors[SceKernelErrors["ERROR_NET_MODULE_BAD_ID"] = 0x80110801] = "ERROR_NET_MODULE_BAD_ID";
    SceKernelErrors[SceKernelErrors["ERROR_NET_MODULE_ALREADY_LOADED"] = 0x80110802] = "ERROR_NET_MODULE_ALREADY_LOADED";
    SceKernelErrors[SceKernelErrors["ERROR_NET_MODULE_NOT_LOADED"] = 0x80110803] = "ERROR_NET_MODULE_NOT_LOADED";

    SceKernelErrors[SceKernelErrors["ERROR_AV_MODULE_BAD_ID"] = 0x80110901] = "ERROR_AV_MODULE_BAD_ID";
    SceKernelErrors[SceKernelErrors["ERROR_AV_MODULE_ALREADY_LOADED"] = 0x80110902] = "ERROR_AV_MODULE_ALREADY_LOADED";
    SceKernelErrors[SceKernelErrors["ERROR_AV_MODULE_NOT_LOADED"] = 0x80110903] = "ERROR_AV_MODULE_NOT_LOADED";

    SceKernelErrors[SceKernelErrors["ERROR_MODULE_BAD_ID"] = 0x80111101] = "ERROR_MODULE_BAD_ID";
    SceKernelErrors[SceKernelErrors["ERROR_MODULE_ALREADY_LOADED"] = 0x80111102] = "ERROR_MODULE_ALREADY_LOADED";
    SceKernelErrors[SceKernelErrors["ERROR_MODULE_NOT_LOADED"] = 0x80111103] = "ERROR_MODULE_NOT_LOADED";

    SceKernelErrors[SceKernelErrors["ERROR_SCREENSHOT_CONT_MODE_NOT_INIT"] = 0x80111229] = "ERROR_SCREENSHOT_CONT_MODE_NOT_INIT";

    SceKernelErrors[SceKernelErrors["ERROR_UMD_NOT_READY"] = 0x80210001] = "ERROR_UMD_NOT_READY";
    SceKernelErrors[SceKernelErrors["ERROR_UMD_LBA_OUT_OF_BOUNDS"] = 0x80210002] = "ERROR_UMD_LBA_OUT_OF_BOUNDS";
    SceKernelErrors[SceKernelErrors["ERROR_UMD_NO_DISC"] = 0x80210003] = "ERROR_UMD_NO_DISC";

    SceKernelErrors[SceKernelErrors["ERROR_MEMSTICK_DEVCTL_BAD_PARAMS"] = 0x80220081] = "ERROR_MEMSTICK_DEVCTL_BAD_PARAMS";
    SceKernelErrors[SceKernelErrors["ERROR_MEMSTICK_DEVCTL_TOO_MANY_CALLBACKS"] = 0x80220082] = "ERROR_MEMSTICK_DEVCTL_TOO_MANY_CALLBACKS";

    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_CHANNEL_NOT_INIT"] = 0x80260001] = "ERROR_AUDIO_CHANNEL_NOT_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_CHANNEL_BUSY"] = 0x80260002] = "ERROR_AUDIO_CHANNEL_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_INVALID_CHANNEL"] = 0x80260003] = "ERROR_AUDIO_INVALID_CHANNEL";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_PRIV_REQUIRED"] = 0x80260004] = "ERROR_AUDIO_PRIV_REQUIRED";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_NO_CHANNELS_AVAILABLE"] = 0x80260005] = "ERROR_AUDIO_NO_CHANNELS_AVAILABLE";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_OUTPUT_SAMPLE_DATA_SIZE_NOT_ALIGNED"] = 0x80260006] = "ERROR_AUDIO_OUTPUT_SAMPLE_DATA_SIZE_NOT_ALIGNED";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_INVALID_FORMAT"] = 0x80260007] = "ERROR_AUDIO_INVALID_FORMAT";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_CHANNEL_NOT_RESERVED"] = 0x80260008] = "ERROR_AUDIO_CHANNEL_NOT_RESERVED";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_NOT_OUTPUT"] = 0x80260009] = "ERROR_AUDIO_NOT_OUTPUT";

    SceKernelErrors[SceKernelErrors["ERROR_POWER_VMEM_IN_USE"] = 0x802b0200] = "ERROR_POWER_VMEM_IN_USE";

    SceKernelErrors[SceKernelErrors["ERROR_NET_RESOLVER_BAD_ID"] = 0x80410408] = "ERROR_NET_RESOLVER_BAD_ID";
    SceKernelErrors[SceKernelErrors["ERROR_NET_RESOLVER_ALREADY_STOPPED"] = 0x8041040a] = "ERROR_NET_RESOLVER_ALREADY_STOPPED";
    SceKernelErrors[SceKernelErrors["ERROR_NET_RESOLVER_INVALID_HOST"] = 0x80410414] = "ERROR_NET_RESOLVER_INVALID_HOST";

    SceKernelErrors[SceKernelErrors["ERROR_WLAN_BAD_PARAMS"] = 0x80410d13] = "ERROR_WLAN_BAD_PARAMS";

    SceKernelErrors[SceKernelErrors["ERROR_HTTP_NOT_INIT"] = 0x80431001] = "ERROR_HTTP_NOT_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_HTTP_ALREADY_INIT"] = 0x80431020] = "ERROR_HTTP_ALREADY_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_HTTP_NO_MEMORY"] = 0x80431077] = "ERROR_HTTP_NO_MEMORY";
    SceKernelErrors[SceKernelErrors["ERROR_HTTP_SYSTEM_COOKIE_NOT_LOADED"] = 0x80431078] = "ERROR_HTTP_SYSTEM_COOKIE_NOT_LOADED";
    SceKernelErrors[SceKernelErrors["ERROR_HTTP_INVALID_PARAMETER"] = 0x804311FE] = "ERROR_HTTP_INVALID_PARAMETER";

    SceKernelErrors[SceKernelErrors["ERROR_SSL_NOT_INIT"] = 0x80435001] = "ERROR_SSL_NOT_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_SSL_ALREADY_INIT"] = 0x80435020] = "ERROR_SSL_ALREADY_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_SSL_OUT_OF_MEMORY"] = 0x80435022] = "ERROR_SSL_OUT_OF_MEMORY";
    SceKernelErrors[SceKernelErrors["ERROR_HTTPS_CERT_ERROR"] = 0x80435060] = "ERROR_HTTPS_CERT_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_HTTPS_HANDSHAKE_ERROR"] = 0x80435061] = "ERROR_HTTPS_HANDSHAKE_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_HTTPS_IO_ERROR"] = 0x80435062] = "ERROR_HTTPS_IO_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_HTTPS_INTERNAL_ERROR"] = 0x80435063] = "ERROR_HTTPS_INTERNAL_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_HTTPS_PROXY_ERROR"] = 0x80435064] = "ERROR_HTTPS_PROXY_ERROR";
    SceKernelErrors[SceKernelErrors["ERROR_SSL_INVALID_PARAMETER"] = 0x804351FE] = "ERROR_SSL_INVALID_PARAMETER";

    SceKernelErrors[SceKernelErrors["ERROR_WAVE_NOT_INIT"] = 0x80440001] = "ERROR_WAVE_NOT_INIT";
    SceKernelErrors[SceKernelErrors["ERROR_WAVE_FAILED_EXIT"] = 0x80440002] = "ERROR_WAVE_FAILED_EXIT";
    SceKernelErrors[SceKernelErrors["ERROR_WAVE_BAD_VOL"] = 0x8044000a] = "ERROR_WAVE_BAD_VOL";
    SceKernelErrors[SceKernelErrors["ERROR_WAVE_INVALID_CHANNEL"] = 0x80440010] = "ERROR_WAVE_INVALID_CHANNEL";
    SceKernelErrors[SceKernelErrors["ERROR_WAVE_INVALID_SAMPLE_COUNT"] = 0x80440011] = "ERROR_WAVE_INVALID_SAMPLE_COUNT";

    SceKernelErrors[SceKernelErrors["ERROR_FONT_INVALID_LIBID"] = 0x80460002] = "ERROR_FONT_INVALID_LIBID";
    SceKernelErrors[SceKernelErrors["ERROR_FONT_INVALID_PARAMETER"] = 0x80460003] = "ERROR_FONT_INVALID_PARAMETER";
    SceKernelErrors[SceKernelErrors["ERROR_FONT_TOO_MANY_OPEN_FONTS"] = 0x80460009] = "ERROR_FONT_TOO_MANY_OPEN_FONTS";

    SceKernelErrors[SceKernelErrors["ERROR_MPEG_BAD_VERSION"] = 0x80610002] = "ERROR_MPEG_BAD_VERSION";
    SceKernelErrors[SceKernelErrors["ERROR_MPEG_NO_MEMORY"] = 0x80610022] = "ERROR_MPEG_NO_MEMORY";
    SceKernelErrors[SceKernelErrors["ERROR_MPEG_INVALID_ADDR"] = 0x80610103] = "ERROR_MPEG_INVALID_ADDR";
    SceKernelErrors[SceKernelErrors["ERROR_MPEG_INVALID_VALUE"] = 0x806101fe] = "ERROR_MPEG_INVALID_VALUE";

    SceKernelErrors[SceKernelErrors["ERROR_PSMF_NOT_INITIALIZED"] = 0x80615001] = "ERROR_PSMF_NOT_INITIALIZED";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_BAD_VERSION"] = 0x80615002] = "ERROR_PSMF_BAD_VERSION";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_NOT_FOUND"] = 0x80615025] = "ERROR_PSMF_NOT_FOUND";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_INVALID_ID"] = 0x80615100] = "ERROR_PSMF_INVALID_ID";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_INVALID_VALUE"] = 0x806151fe] = "ERROR_PSMF_INVALID_VALUE";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_INVALID_TIMESTAMP"] = 0x80615500] = "ERROR_PSMF_INVALID_TIMESTAMP";
    SceKernelErrors[SceKernelErrors["ERROR_PSMF_INVALID_PSMF"] = 0x80615501] = "ERROR_PSMF_INVALID_PSMF";

    SceKernelErrors[SceKernelErrors["ERROR_PSMFPLAYER_NOT_INITIALIZED"] = 0x80616001] = "ERROR_PSMFPLAYER_NOT_INITIALIZED";
    SceKernelErrors[SceKernelErrors["ERROR_PSMFPLAYER_NO_MORE_DATA"] = 0x8061600c] = "ERROR_PSMFPLAYER_NO_MORE_DATA";

    SceKernelErrors[SceKernelErrors["ERROR_MPEG_NO_DATA"] = 0x80618001] = "ERROR_MPEG_NO_DATA";

    SceKernelErrors[SceKernelErrors["ERROR_AVC_VIDEO_FATAL"] = 0x80628002] = "ERROR_AVC_VIDEO_FATAL";

    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_NO_ID"] = 0x80630003] = "ERROR_ATRAC_NO_ID";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_INVALID_CODEC"] = 0x80630004] = "ERROR_ATRAC_INVALID_CODEC";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_BAD_ID"] = 0x80630005] = "ERROR_ATRAC_BAD_ID";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_ALL_DATA_LOADED"] = 0x80630009] = "ERROR_ATRAC_ALL_DATA_LOADED";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_NO_DATA"] = 0x80630010] = "ERROR_ATRAC_NO_DATA";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_SECOND_BUFFER_NEEDED"] = 0x80630012] = "ERROR_ATRAC_SECOND_BUFFER_NEEDED";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED"] = 0x80630022] = "ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_BUFFER_IS_EMPTY"] = 0x80630023] = "ERROR_ATRAC_BUFFER_IS_EMPTY";
    SceKernelErrors[SceKernelErrors["ERROR_ATRAC_ALL_DATA_DECODED"] = 0x80630024] = "ERROR_ATRAC_ALL_DATA_DECODED";

    SceKernelErrors[SceKernelErrors["ERROR_CODEC_AUDIO_FATAL"] = 0x807f00fc] = "ERROR_CODEC_AUDIO_FATAL";

    SceKernelErrors[SceKernelErrors["FATAL_UMD_UNKNOWN_MEDIUM"] = 0xC0210004] = "FATAL_UMD_UNKNOWN_MEDIUM";
    SceKernelErrors[SceKernelErrors["FATAL_UMD_HARDWARE_FAILURE"] = 0xC0210005] = "FATAL_UMD_HARDWARE_FAILURE";

    //ERROR_AUDIO_CHANNEL_NOT_INIT                        = unchecked((int)0x80260001,
    //ERROR_AUDIO_CHANNEL_BUSY                            = unchecked((int)0x80260002,
    //ERROR_AUDIO_INVALID_CHANNEL                         = unchecked((int)0x80260003,
    //ERROR_AUDIO_PRIV_REQUIRED                           = unchecked((int)0x80260004,
    //ERROR_AUDIO_NO_CHANNELS_AVAILABLE                   = unchecked((int)0x80260005,
    //ERROR_AUDIO_OUTPUT_SAMPLE_DATA_SIZE_NOT_ALIGNED     = unchecked((int)0x80260006,
    //ERROR_AUDIO_INVALID_FORMAT                          = unchecked((int)0x80260007,
    //ERROR_AUDIO_CHANNEL_NOT_RESERVED                    = unchecked((int)0x80260008,
    //ERROR_AUDIO_NOT_OUTPUT                              = unchecked((int)0x80260009,
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_INVALID_FREQUENCY"] = 0x8026000A] = "ERROR_AUDIO_INVALID_FREQUENCY";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_INVALID_VOLUME"] = 0x8026000B] = "ERROR_AUDIO_INVALID_VOLUME";
    SceKernelErrors[SceKernelErrors["ERROR_AUDIO_CHANNEL_ALREADY_RESERVED"] = 0x80268002] = "ERROR_AUDIO_CHANNEL_ALREADY_RESERVED";
    SceKernelErrors[SceKernelErrors["PSP_AUDIO_ERROR_SRC_FORMAT_4"] = 0x80000003] = "PSP_AUDIO_ERROR_SRC_FORMAT_4";

    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_API_FAIL"] = 0x80630002] = "ATRAC_ERROR_API_FAIL";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_NO_ATRACID"] = 0x80630003] = "ATRAC_ERROR_NO_ATRACID";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_INVALID_CODECTYPE"] = 0x80630004] = "ATRAC_ERROR_INVALID_CODECTYPE";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_BAD_ATRACID"] = 0x80630005] = "ATRAC_ERROR_BAD_ATRACID";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_ALL_DATA_LOADED"] = 0x80630009] = "ATRAC_ERROR_ALL_DATA_LOADED";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_NO_DATA"] = 0x80630010] = "ATRAC_ERROR_NO_DATA";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_SECOND_BUFFER_NEEDED"] = 0x80630012] = "ATRAC_ERROR_SECOND_BUFFER_NEEDED";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_INCORRECT_READ_SIZE"] = 0x80630013] = "ATRAC_ERROR_INCORRECT_READ_SIZE";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_ADD_DATA_IS_TOO_BIG"] = 0x80630018] = "ATRAC_ERROR_ADD_DATA_IS_TOO_BIG";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_UNSET_PARAM"] = 0x80630021] = "ATRAC_ERROR_UNSET_PARAM";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_SECOND_BUFFER_NOT_NEEDED"] = 0x80630022] = "ATRAC_ERROR_SECOND_BUFFER_NOT_NEEDED";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_BUFFER_IS_EMPTY"] = 0x80630023] = "ATRAC_ERROR_BUFFER_IS_EMPTY";
    SceKernelErrors[SceKernelErrors["ATRAC_ERROR_ALL_DATA_DECODED"] = 0x80630024] = "ATRAC_ERROR_ALL_DATA_DECODED";

    SceKernelErrors[SceKernelErrors["PSP_SYSTEMPARAM_RETVAL"] = 0x80110103] = "PSP_SYSTEMPARAM_RETVAL";

    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_VOICE"] = 0x80420010] = "ERROR_SAS_INVALID_VOICE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_ADSR_CURVE_MODE"] = 0x80420013] = "ERROR_SAS_INVALID_ADSR_CURVE_MODE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_PARAMETER"] = 0x80420014] = "ERROR_SAS_INVALID_PARAMETER";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_VOICE_PAUSED"] = 0x80420016] = "ERROR_SAS_VOICE_PAUSED";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_BUSY"] = 0x80420030] = "ERROR_SAS_BUSY";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_NOT_INIT"] = 0x80420100] = "ERROR_SAS_NOT_INIT";

    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_GRAIN"] = 0x80420001] = "ERROR_SAS_INVALID_GRAIN";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_MAX_VOICES"] = 0x80420002] = "ERROR_SAS_INVALID_MAX_VOICES";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_OUTPUT_MODE"] = 0x80420003] = "ERROR_SAS_INVALID_OUTPUT_MODE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_SAMPLE_RATE"] = 0x80420004] = "ERROR_SAS_INVALID_SAMPLE_RATE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_ADDRESS"] = 0x80420005] = "ERROR_SAS_INVALID_ADDRESS";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_VOICE_INDEX"] = 0x80420010] = "ERROR_SAS_INVALID_VOICE_INDEX";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_NOISE_CLOCK"] = 0x80420011] = "ERROR_SAS_INVALID_NOISE_CLOCK";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_PITCH_VAL"] = 0x80420012] = "ERROR_SAS_INVALID_PITCH_VAL";

    //ERROR_SAS_INVALID_ADSR_CURVE_MODE                   = unchecked((int)0x80420013,
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_ADPCM_SIZE"] = 0x80420014] = "ERROR_SAS_INVALID_ADPCM_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_LOOP_MODE"] = 0x80420015] = "ERROR_SAS_INVALID_LOOP_MODE";

    //ERROR_SAS_VOICE_PAUSED                              = unchecked((int)0x80420016,
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_VOLUME_VAL"] = 0x80420018] = "ERROR_SAS_INVALID_VOLUME_VAL";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_ADSR_VAL"] = 0x80420019] = "ERROR_SAS_INVALID_ADSR_VAL";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_SIZE"] = 0x8042001A] = "ERROR_SAS_INVALID_SIZE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_FX_TYPE"] = 0x80420020] = "ERROR_SAS_INVALID_FX_TYPE";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_FX_FEEDBACK"] = 0x80420021] = "ERROR_SAS_INVALID_FX_FEEDBACK";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_FX_DELAY"] = 0x80420022] = "ERROR_SAS_INVALID_FX_DELAY";
    SceKernelErrors[SceKernelErrors["ERROR_SAS_INVALID_FX_VOLUME_VAL"] = 0x80420023] = "ERROR_SAS_INVALID_FX_VOLUME_VAL";

    //ERROR_SAS_BUSY                                      = unchecked((int)0x80420030,
    //ERROR_SAS_NOT_INIT                                  = unchecked((int)0x80420100,
    SceKernelErrors[SceKernelErrors["ERROR_SAS_ALREADY_INIT"] = 0x80420101] = "ERROR_SAS_ALREADY_INIT";

    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_TAKEN_SLOT"] = 0x80000020] = "PSP_POWER_ERROR_TAKEN_SLOT";
    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_SLOTS_FULL"] = 0x80000022] = "PSP_POWER_ERROR_SLOTS_FULL";
    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_PRIVATE_SLOT"] = 0x80000023] = "PSP_POWER_ERROR_PRIVATE_SLOT";
    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_EMPTY_SLOT"] = 0x80000025] = "PSP_POWER_ERROR_EMPTY_SLOT";
    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_INVALID_CB"] = 0x80000100] = "PSP_POWER_ERROR_INVALID_CB";
    SceKernelErrors[SceKernelErrors["PSP_POWER_ERROR_INVALID_SLOT"] = 0x80000102] = "PSP_POWER_ERROR_INVALID_SLOT";
})(SceKernelErrors || (SceKernelErrors = {}));

module.exports = SceKernelErrors;
//# sourceMappingURL=SceKernelErrors.js.map
},
"src/hle/elf_crypted_prx": function(module, exports, require) {
var keys144 = require('./elf_crypted_prx_keys_144');
var keys16 = require('./elf_crypted_prx_keys_16');

var Header = (function () {
    function Header() {
    }
    Header.struct = StructClass.create(Header, [
        { magic: UInt32 },
        { modAttr: UInt16 },
        { compModAttr: UInt16 },
        { modVerLo: UInt8 },
        { modVerHi: UInt8 },
        { moduleName: Stringz(28) },
        { modVersion: UInt8 },
        { nsegments: UInt8 },
        { elfSize: UInt32 },
        { pspSize: UInt32 },
        { bootEntry: UInt32 },
        { modInfoOffset: UInt32 },
        { bssSize: UInt32 },
        { segAlign: StructArray(UInt16, 4) },
        { segAddress: StructArray(UInt32, 4) },
        { segSize: StructArray(UInt32, 5) },
        { reserved: StructArray(UInt32, 5) },
        { devkitVersion: UInt32 },
        { decMode: UInt8 },
        { pad: UInt8 },
        { overlapSize: UInt16 },
        { aesKey: StructArray(UInt8, 16) },
        { cmacKey: StructArray(UInt8, 16) },
        { cmacHeaderHash: StructArray(UInt8, 16) },
        { compressedSize: UInt32 },
        { compressedOffset: UInt32 },
        { unk1: UInt32 },
        { unk2: UInt32 },
        { cmacDataHash: StructArray(UInt8, 16) },
        { tag: UInt32 },
        { sigcheck: StructArray(UInt8, 88) },
        { sha1Hash: StructArray(UInt8, 20) },
        { keyData: StructArray(UInt8, 16) }
    ]);
    return Header;
})();

function getTagInfo(checkTag) {
    return keys144.g_tagInfo.first(function (item) {
        return item.tag == checkTag;
    });
}

function getTagInfo2(checkTag) {
    return keys16.g_tagInfo2.first(function (item) {
        return item.tag == checkTag;
    });
}

function decrypt1(input) {
    var stream = Stream.fromUint8Array(input);
    console.log(Header.struct.read(stream));
    //kirk.CMD7();
}

function decrypt2(input) {
}

function decrypt(input) {
    return decrypt1(input);
}
exports.decrypt = decrypt;
//# sourceMappingURL=elf_crypted_prx.js.map
},
"src/hle/elf_crypted_prx_keys_144": function(module, exports, require) {
exports.g_tagInfo = [
    // 1.x PRXs
    { tag: 0x00000000, ikey: g_key0, code: 0x42 },
    { tag: 0x02000000, ikey: g_key2, code: 0x45 },
    { tag: 0x03000000, ikey: g_key3, code: 0x46 },
    // 2.0 PRXs
    { tag: 0x4467415d, ikey: g_key44, code: 0x59, codeExtra: 0x59 },
    { tag: 0x207bbf2f, ikey: g_key20, code: 0x5A, codeExtra: 0x5A },
    { tag: 0x3ace4dce, ikey: g_key3A, code: 0x5B, codeExtra: 0x5B },
    // misc
    { tag: 0x07000000, ikey: g_key_INDEXDAT1xx, code: 0x4A },
    { tag: 0x08000000, ikey: g_keyEBOOT1xx, code: 0x4B },
    { tag: 0xC0CB167C, ikey: g_keyEBOOT2xx, code: 0x5D, codeExtra: 0x5D },
    { tag: 0x0B000000, ikey: g_keyUPDATER, code: 0x4E },
    { tag: 0x0C000000, ikey: g_keyDEMOS27X, code: 0x4F },
    { tag: 0x0F000000, ikey: g_keyMEIMG250, code: 0x52 },
    { tag: 0x862648D1, ikey: g_keyMEIMG260, code: 0x52, codeExtra: 0x52 },
    { tag: 0x207BBF2F, ikey: g_keyUNK1, code: 0x5A, codeExtra: 0x5A },
    { tag: 0x09000000, ikey: g_key_GAMESHARE1xx, code: 0x4C },
    { tag: 0xBB67C59F, ikey: g_key_GAMESHARE2xx, code: 0x5E, codeExtra: 0x5E }
];

var g_key0 = new Uint32Array([
    0x7b21f3be, 0x299c5e1d, 0x1c9c5e71, 0x96cb4645, 0x3c9b1be0, 0xeb85de3d,
    0x4a7f2022, 0xc2206eaa, 0xd50b3265, 0x55770567, 0x3c080840, 0x981d55f2,
    0x5fd8f6f3, 0xee8eb0c5, 0x944d8152, 0xf8278651, 0x2705bafa, 0x8420e533,
    0x27154ae9, 0x4819aa32, 0x59a3aa40, 0x2cb3cf65, 0xf274466d, 0x3a655605,
    0x21b0f88f, 0xc5b18d26, 0x64c19051, 0xd669c94e, 0xe87035f2, 0x9d3a5909,
    0x6f4e7102, 0xdca946ce, 0x8416881b, 0xbab097a5, 0x249125c6, 0xb34c0872
]);
var g_key2 = new Uint32Array([
    0xccfda932, 0x51c06f76, 0x046dcccf, 0x49e1821e, 0x7d3b024c, 0x9dda5865,
    0xcc8c9825, 0xd1e97db5, 0x6874d8cb, 0x3471c987, 0x72edb3fc, 0x81c8365d,
    0xe161e33a, 0xfc92db59, 0x2009b1ec, 0xb1a94ce4, 0x2f03696b, 0x87e236d8,
    0x3b2b8ce9, 0x0305e784, 0xf9710883, 0xb039db39, 0x893bea37, 0xe74d6805,
    0x2a5c38bd, 0xb08dc813, 0x15b32375, 0x46be4525, 0x0103fd90, 0xa90e87a2,
    0x52aba66a, 0x85bf7b80, 0x45e8ce63, 0x4dd716d3, 0xf5e30d2d, 0xaf3ae456
]);
var g_key3 = new Uint32Array([
    0xa6c8f5ca, 0x6d67c080, 0x924f4d3a, 0x047ca06a, 0x08640297, 0x4fd4a758,
    0xbd685a87, 0x9b2701c2, 0x83b62a35, 0x726b533c, 0xe522fa0c, 0xc24b06b4,
    0x459d1cac, 0xa8c5417b, 0x4fea62a2, 0x0615d742, 0x30628d09, 0xc44fab14,
    0x69ff715e, 0xd2d8837d, 0xbeed0b8b, 0x1e6e57ae, 0x61e8c402, 0xbe367a06,
    0x543f2b5e, 0xdb3ec058, 0xbe852075, 0x1e7e4dcc, 0x1564ea55, 0xec7825b4,
    0xc0538cad, 0x70f72c7f, 0x49e8c3d0, 0xeda97ec5, 0xf492b0a4, 0xe05eb02a
]);
var g_key44 = new Uint32Array([
    0xef80e005, 0x3a54689f, 0x43c99ccd, 0x1b7727be, 0x5cb80038, 0xdd2efe62,
    0xf369f92c, 0x160f94c5, 0x29560019, 0xbf3c10c5, 0xf2ce5566, 0xcea2c626,
    0xb601816f, 0x64e7481e, 0x0c34debd, 0x98f29cb0, 0x3fc504d7, 0xc8fb39f0,
    0x0221b3d8, 0x63f936a2, 0x9a3a4800, 0x6ecc32e3, 0x8e120cfd, 0xb0361623,
    0xaee1e689, 0x745502eb, 0xe4a6c61c, 0x74f23eb4, 0xd7fa5813, 0xb01916eb,
    0x12328457, 0xd2bc97d2, 0x646425d8, 0x328380a5, 0x43da8ab1, 0x4b122ac9
]);
var g_key20 = new Uint32Array([
    0x33b50800, 0xf32f5fcd, 0x3c14881f, 0x6e8a2a95, 0x29feefd5, 0x1394eae3,
    0xbd6bd443, 0x0821c083, 0xfab379d3, 0xe613e165, 0xf5a754d3, 0x108b2952,
    0x0a4b1e15, 0x61eadeba, 0x557565df, 0x3b465301, 0xae54ecc3, 0x61423309,
    0x70c9ff19, 0x5b0ae5ec, 0x989df126, 0x9d987a5f, 0x55bc750e, 0xc66eba27,
    0x2de988e8, 0xf76600da, 0x0382dccb, 0x5569f5f2, 0x8e431262, 0x288fe3d3,
    0x656f2187, 0x37d12e9c, 0x2f539eb4, 0xa492998e, 0xed3958f7, 0x39e96523
]);
var g_key3A = new Uint32Array([
    0x67877069, 0x3abd5617, 0xc23ab1dc, 0xab57507d, 0x066a7f40, 0x24def9b9,
    0x06f759e4, 0xdcf524b1, 0x13793e5e, 0x0359022d, 0xaae7e1a2, 0x76b9b2fa,
    0x9a160340, 0x87822fba, 0x19e28fbb, 0x9e338a02, 0xd8007e9a, 0xea317af1,
    0x630671de, 0x0b67ca7c, 0x865192af, 0xea3c3526, 0x2b448c8e, 0x8b599254,
    0x4602e9cb, 0x4de16cda, 0xe164d5bb, 0x07ecd88e, 0x99ffe5f8, 0x768800c1,
    0x53b091ed, 0x84047434, 0xb426dbbc, 0x36f948bb, 0x46142158, 0x749bb492
]);

// KEYS FROM MESG_LED.PRX (3.52)
var g_keyEBOOT1xx = new Uint32Array([
    0x18CB69EF, 0x158E8912, 0xDEF90EBB, 0x4CB0FB23, 0x3687EE18, 0x868D4A6E,
    0x19B5C756, 0xEE16551D, 0xE7CB2D6C, 0x9747C660, 0xCE95143F, 0x2956F477,
    0x03824ADE, 0x210C9DF1, 0x5029EB24, 0x81DFE69F, 0x39C89B00, 0xB00C8B91,
    0xEF2DF9C2, 0xE13A93FC, 0x8B94A4A8, 0x491DD09D, 0x686A400D, 0xCED4C7E4,
    0x96C8B7C9, 0x1EAADC28, 0xA4170B84, 0x505D5DDC, 0x5DA6C3CF, 0x0E5DFA2D,
    0x6E7919B5, 0xCE5E29C7, 0xAAACDB94, 0x45F70CDD, 0x62A73725, 0xCCE6563D
]);
var g_keyEBOOT2xx = new Uint32Array([
    0xDA8E36FA, 0x5DD97447, 0x76C19874, 0x97E57EAF, 0x1CAB09BD, 0x9835BAC6,
    0x03D39281, 0x03B205CF, 0x2882E734, 0xE714F663, 0xB96E2775, 0xBD8AAFC7,
    0x1DD3EC29, 0xECA4A16C, 0x5F69EC87, 0x85981E92, 0x7CFCAE21, 0xBAE9DD16,
    0xE6A97804, 0x2EEE02FC, 0x61DF8A3D, 0xDD310564, 0x9697E149, 0xC2453F3B,
    0xF91D8456, 0x39DA6BC8, 0xB3E5FEF5, 0x89C593A3, 0xFB5C8ABC, 0x6C0B7212,
    0xE10DD3CB, 0x98D0B2A8, 0x5FD61847, 0xF0DC2357, 0x7701166A, 0x0F5C3B68
]);
var g_keyUPDATER = new Uint32Array([
    0xA5603CBF, 0xD7482441, 0xF65764CC, 0x1F90060B, 0x4EA73E45, 0xE551D192,
    0xE7B75D8A, 0x465A506E, 0x40FB1022, 0x2C273350, 0x8096DA44, 0x9947198E,
    0x278DEE77, 0x745D062E, 0xC148FA45, 0x832582AF, 0x5FDB86DA, 0xCB15C4CE,
    0x2524C62F, 0x6C2EC3B1, 0x369BE39E, 0xF7EB1FC4, 0x1E51CE1A, 0xD70536F4,
    0xC34D39D8, 0x7418FB13, 0xE3C84DE1, 0xB118F03C, 0xA2018D4E, 0xE6D8770D,
    0x5720F390, 0x17F96341, 0x60A4A68F, 0x1327DD28, 0x05944C64, 0x0C2C4C12
]);
var g_keyMEIMG250 = new Uint32Array([
    0xA381FEBC, 0x99B9D5C9, 0x6C560A8D, 0x30309F95, 0x792646CC, 0x82B64E5E,
    0x1A3951AD, 0x0A182EC4, 0xC46131B4, 0x77C50C8A, 0x325F16C6, 0x02D1942E,
    0x0AA38AC4, 0x2A940AC6, 0x67034726, 0xE52DB133, 0xD2EF2107, 0x85C81E90,
    0xC8D164BA, 0xC38DCE1D, 0x948BA275, 0x0DB84603, 0xE2473637, 0xCD74FCDA,
    0x588E3D66, 0x6D28E822, 0x891E548B, 0xF53CF56D, 0x0BBDDB66, 0xC4B286AA,
    0x2BEBBC4B, 0xFC261FF4, 0x92B8E705, 0xDCEE6952, 0x5E0442E5, 0x8BEB7F21
]);
var g_keyMEIMG260 = new Uint32Array([
    0x11BFD698, 0xD7F9B324, 0xDD524927, 0x16215B86, 0x504AC36D, 0x5843B217,
    0xE5A0DA47, 0xBB73A1E7, 0x2915DB35, 0x375CFD3A, 0xBB70A905, 0x272BEFCA,
    0x2E960791, 0xEA0799BB, 0xB85AE6C8, 0xC9CAF773, 0x250EE641, 0x06E74A9E,
    0x5244895D, 0x466755A5, 0x9A84AF53, 0xE1024174, 0xEEBA031E, 0xED80B9CE,
    0xBC315F72, 0x5821067F, 0xE8313058, 0xD2D0E706, 0xE6D8933E, 0xD7D17FB4,
    0x505096C4, 0xFDA50B3B, 0x4635AE3D, 0xEB489C8A, 0x422D762D, 0x5A8B3231
]);
var g_keyDEMOS27X = new Uint32Array([
    0x1ABF102F, 0xD596D071, 0x6FC552B2, 0xD4F2531F, 0xF025CDD9, 0xAF9AAF03,
    0xE0CF57CF, 0x255494C4, 0x7003675E, 0x907BC884, 0x002D4EE4, 0x0B687A0D,
    0x9E3AA44F, 0xF58FDA81, 0xEC26AC8C, 0x3AC9B49D, 0x3471C037, 0xB0F3834D,
    0x10DC4411, 0xA232EA31, 0xE2E5FA6B, 0x45594B03, 0xE43A1C87, 0x31DAD9D1,
    0x08CD7003, 0xFA9C2FDF, 0x5A891D25, 0x9B5C1934, 0x22F366E5, 0x5F084A32,
    0x695516D5, 0x2245BE9F, 0x4F6DD705, 0xC4B8B8A1, 0xBC13A600, 0x77B7FC3B
]);
var g_keyUNK1 = new Uint32Array([
    0x33B50800, 0xF32F5FCD, 0x3C14881F, 0x6E8A2A95, 0x29FEEFD5, 0x1394EAE3,
    0xBD6BD443, 0x0821C083, 0xFAB379D3, 0xE613E165, 0xF5A754D3, 0x108B2952,
    0x0A4B1E15, 0x61EADEBA, 0x557565DF, 0x3B465301, 0xAE54ECC3, 0x61423309,
    0x70C9FF19, 0x5B0AE5EC, 0x989DF126, 0x9D987A5F, 0x55BC750E, 0xC66EBA27,
    0x2DE988E8, 0xF76600DA, 0x0382DCCB, 0x5569F5F2, 0x8E431262, 0x288FE3D3,
    0x656F2187, 0x37D12E9C, 0x2F539EB4, 0xA492998E, 0xED3958F7, 0x39E96523
]);
var g_key_GAMESHARE1xx = new Uint32Array([
    0x721B53E8, 0xFC3E31C6, 0xF85BA2A2, 0x3CF0AC72, 0x54EEA7AB, 0x5959BFCB,
    0x54B8836B, 0xBC431313, 0x989EF2CF, 0xF0CE36B2, 0x98BA4CF8, 0xE971C931,
    0xA0375DC8, 0x08E52FA0, 0xAC0DD426, 0x57E4D601, 0xC56E61C7, 0xEF1AB98A,
    0xD1D9F8F4, 0x5FE9A708, 0x3EF09D07, 0xFA0C1A8C, 0xA91EEA5C, 0x58F482C5,
    0x2C800302, 0x7EE6F6C3, 0xFF6ABBBB, 0x2110D0D0, 0xD3297A88, 0x980012D3,
    0xDC59C87B, 0x7FDC5792, 0xDB3F5DA6, 0xFC23B787, 0x22698ED3, 0xB680E812
]);
var g_key_GAMESHARE2xx = new Uint32Array([
    0x94A757C7, 0x9FD39833, 0xF8508371, 0x328B0B29, 0x2CBCB9DA, 0x2918B9C6,
    0x944C50BA, 0xF1DCE7D0, 0x640C3966, 0xC90B3D08, 0xF4AD17BA, 0x6CA0F84B,
    0xF7767C67, 0xA4D3A55A, 0x4A085C6A, 0x6BB27071, 0xFA8B38FB, 0x3FDB31B8,
    0x8B7196F2, 0xDB9BED4A, 0x51625B84, 0x4C1481B4, 0xF684F508, 0x30B44770,
    0x93AA8E74, 0x90C579BC, 0x246EC88D, 0x2E051202, 0xC774842E, 0xA185D997,
    0x7A2B3ADD, 0xFE835B6D, 0x508F184D, 0xEB4C4F13, 0x0E1993D3, 0xBA96DFD2
]);
var g_key_INDEXDAT1xx = new Uint32Array([
    0x76CB00AF, 0x111CE62F, 0xB7B27E36, 0x6D8DE8F9, 0xD54BF16A, 0xD9E90373,
    0x7599D982, 0x51F82B0E, 0x636103AD, 0x8E40BC35, 0x2F332C94, 0xF513AAE9,
    0xD22AFEE9, 0x04343987, 0xFC5BB80C, 0x12349D89, 0x14A481BB, 0x25ED3AE8,
    0x7D500E4F, 0x43D1B757, 0x7B59FDAD, 0x4CFBBF34, 0xC3D17436, 0xC1DA21DB,
    0xA34D8C80, 0x962B235D, 0x3E420548, 0x09CF9FFE, 0xD4883F5C, 0xD90E9CB5,
    0x00AEF4E9, 0xF0886DE9, 0x62A58A5B, 0x52A55546, 0x971941B5, 0xF5B79FAC
]);
//# sourceMappingURL=elf_crypted_prx_keys_144.js.map
},
"src/hle/elf_crypted_prx_keys_16": function(module, exports, require) {
exports.g_tagInfo2 = [
    { tag: 0x380228F0, key: keys620_5v, code: 0x5A },
    { tag: 0x4C942AF0, key: keys620_5k, code: 0x43 },
    { tag: 0x4C9428F0, key: keys620_5, code: 0x43 },
    { tag: 0x4C9429F0, key: keys570_5k, code: 0x43 },
    { tag: 0x4C941DF0, key: keys620_1, code: 0x43 },
    { tag: 0x4C941CF0, key: keys620_0, code: 0x43 },
    { tag: 0x457B1EF0, key: keys620_3, code: 0x5B },
    { tag: 0x457B0BF0, key: keys600_u1_457B0BF0, code: 0x5B },
    { tag: 0x457B0CF0, key: keys600_u1_457B0CF0, code: 0x5B },
    { tag: 0x4C9419F0, key: keys500_1, code: 0x43 },
    { tag: 0x4C9418F0, key: keys500_0, code: 0x43 },
    { tag: 0x4C941FF0, key: keys500_2, code: 0x43 },
    { tag: 0x4C9417F0, key: keys500_1, code: 0x43 },
    { tag: 0x4C9416F0, key: keys500_0, code: 0x43 },
    { tag: 0x4C9414F0, key: keys390_0, code: 0x43 },
    { tag: 0x4C9415F0, key: keys390_1, code: 0x43 },
    { tag: 0xD82310F0, key: keys02G_E, code: 0x51 },
    { tag: 0xD8231EF0, key: keys03G_E, code: 0x51 },
    { tag: 0xD82328F0, key: keys05G_E, code: 0x51 },
    { tag: 0x4C9412F0, key: keys370_0, code: 0x43 },
    { tag: 0x4C9413F0, key: keys370_1, code: 0x43 },
    { tag: 0x457B10F0, key: keys370_2, code: 0x5B },
    { tag: 0x4C940DF0, key: keys360_0, code: 0x43 },
    { tag: 0x4C9410F0, key: keys360_1, code: 0x43 },
    { tag: 0x4C940BF0, key: keys330_0, code: 0x43 },
    { tag: 0x457B0AF0, key: keys330_1, code: 0x5B },
    { tag: 0x38020AF0, key: keys330_2, code: 0x5A },
    { tag: 0x4C940AF0, key: keys330_3, code: 0x43 },
    { tag: 0x4C940CF0, key: keys330_4, code: 0x43 },
    { tag: 0xcfef09f0, key: keys310_0, code: 0x62 },
    { tag: 0x457b08f0, key: keys310_1, code: 0x5B },
    { tag: 0x380208F0, key: keys310_2, code: 0x5A },
    { tag: 0xcfef08f0, key: keys310_3, code: 0x62 },
    { tag: 0xCFEF07F0, key: keys303_0, code: 0x62 },
    { tag: 0xCFEF06F0, key: keys300_0, code: 0x62 },
    { tag: 0x457B06F0, key: keys300_1, code: 0x5B },
    { tag: 0x380206F0, key: keys300_2, code: 0x5A },
    { tag: 0xCFEF05F0, key: keys280_0, code: 0x62 },
    { tag: 0x457B05F0, key: keys280_1, code: 0x5B },
    { tag: 0x380205F0, key: keys280_2, code: 0x5A },
    { tag: 0x16D59E03, key: keys260_0, code: 0x62 },
    { tag: 0x76202403, key: keys260_1, code: 0x5B },
    { tag: 0x0F037303, key: keys260_2, code: 0x5A },
    { tag: 0x457B28F0, key: keys620_e, code: 0x5B },
    { tag: 0xADF305F0, key: demokeys_280, code: 0x60 },
    { tag: 0xADF306F0, key: demokeys_3XX_1, code: 0x60 },
    { tag: 0xADF308F0, key: demokeys_3XX_2, code: 0x60 },
    { tag: 0x8004FD03, key: ebootbin_271_new, code: 0x5D },
    { tag: 0xD91605F0, key: ebootbin_280_new, code: 0x5D },
    { tag: 0xD91606F0, key: ebootbin_300_new, code: 0x5D },
    { tag: 0xD91608F0, key: ebootbin_310_new, code: 0x5D },
    { tag: 0xD91609F0, key: key_D91609F0, code: 0x5D },
    { tag: 0x2E5E10F0, key: key_2E5E10F0, code: 0x48 },
    { tag: 0x2E5E12F0, key: key_2E5E12F0, code: 0x48 },
    { tag: 0x2E5E12F0, key: key_2E5E13F0, code: 0x48 },
    { tag: 0xD9160AF0, key: key_D9160AF0, code: 0x5D },
    { tag: 0xD9160BF0, key: key_D9160BF0, code: 0x5D },
    { tag: 0xD91611F0, key: key_D91611F0, code: 0x5D },
    { tag: 0xD91612F0, key: key_D91612F0, code: 0x5D },
    { tag: 0xD91613F0, key: key_D91613F0, code: 0x5D },
    { tag: 0x0A35EA03, key: gameshare_260_271, code: 0x5E },
    { tag: 0x7B0505F0, key: gameshare_280, code: 0x5E },
    { tag: 0x7B0506F0, key: gameshare_300, code: 0x5E },
    { tag: 0x7B0508F0, key: gameshare_310, code: 0x5E },
    { tag: 0x279D08F0, key: oneseg_310, code: 0x61 },
    { tag: 0x279D06F0, key: oneseg_300, code: 0x61 },
    { tag: 0x279D05F0, key: oneseg_280, code: 0x61 },
    { tag: 0xD66DF703, key: oneseg_260_271, code: 0x61 },
    { tag: 0x279D10F0, key: oneseg_slim, code: 0x61 },
    { tag: 0x3C2A08F0, key: ms_app_main, code: 0x67 }
];

var keys260_0 = new Uint8Array([0xC3, 0x24, 0x89, 0xD3, 0x80, 0x87, 0xB2, 0x4E, 0x4C, 0xD7, 0x49, 0xE4, 0x9D, 0x1D, 0x34, 0xD1]);
var keys260_1 = new Uint8Array([0xF3, 0xAC, 0x6E, 0x7C, 0x04, 0x0A, 0x23, 0xE7, 0x0D, 0x33, 0xD8, 0x24, 0x73, 0x39, 0x2B, 0x4A]);
var keys260_2 = new Uint8Array([0x72, 0xB4, 0x39, 0xFF, 0x34, 0x9B, 0xAE, 0x82, 0x30, 0x34, 0x4A, 0x1D, 0xA2, 0xD8, 0xB4, 0x3C]);
var keys280_0 = new Uint8Array([0xCA, 0xFB, 0xBF, 0xC7, 0x50, 0xEA, 0xB4, 0x40, 0x8E, 0x44, 0x5C, 0x63, 0x53, 0xCE, 0x80, 0xB1]);
var keys280_1 = new Uint8Array([0x40, 0x9B, 0xC6, 0x9B, 0xA9, 0xFB, 0x84, 0x7F, 0x72, 0x21, 0xD2, 0x36, 0x96, 0x55, 0x09, 0x74]);
var keys280_2 = new Uint8Array([0x03, 0xA7, 0xCC, 0x4A, 0x5B, 0x91, 0xC2, 0x07, 0xFF, 0xFC, 0x26, 0x25, 0x1E, 0x42, 0x4B, 0xB5]);
var keys300_0 = new Uint8Array([0x9F, 0x67, 0x1A, 0x7A, 0x22, 0xF3, 0x59, 0x0B, 0xAA, 0x6D, 0xA4, 0xC6, 0x8B, 0xD0, 0x03, 0x77]);
var keys300_1 = new Uint8Array([0x15, 0x07, 0x63, 0x26, 0xDB, 0xE2, 0x69, 0x34, 0x56, 0x08, 0x2A, 0x93, 0x4E, 0x4B, 0x8A, 0xB2]);
var keys300_2 = new Uint8Array([0x56, 0x3B, 0x69, 0xF7, 0x29, 0x88, 0x2F, 0x4C, 0xDB, 0xD5, 0xDE, 0x80, 0xC6, 0x5C, 0xC8, 0x73]);
var keys303_0 = new Uint8Array([0x7b, 0xa1, 0xe2, 0x5a, 0x91, 0xb9, 0xd3, 0x13, 0x77, 0x65, 0x4a, 0xb7, 0xc2, 0x8a, 0x10, 0xaf]);
var keys310_0 = new Uint8Array([0xa2, 0x41, 0xe8, 0x39, 0x66, 0x5b, 0xfa, 0xbb, 0x1b, 0x2d, 0x6e, 0x0e, 0x33, 0xe5, 0xd7, 0x3f]);
var keys310_1 = new Uint8Array([0xA4, 0x60, 0x8F, 0xAB, 0xAB, 0xDE, 0xA5, 0x65, 0x5D, 0x43, 0x3A, 0xD1, 0x5E, 0xC3, 0xFF, 0xEA]);
var keys310_2 = new Uint8Array([0xE7, 0x5C, 0x85, 0x7A, 0x59, 0xB4, 0xE3, 0x1D, 0xD0, 0x9E, 0xCE, 0xC2, 0xD6, 0xD4, 0xBD, 0x2B]);
var keys310_3 = new Uint8Array([0x2E, 0x00, 0xF6, 0xF7, 0x52, 0xCF, 0x95, 0x5A, 0xA1, 0x26, 0xB4, 0x84, 0x9B, 0x58, 0x76, 0x2F]);
var keys330_0 = new Uint8Array([0x3B, 0x9B, 0x1A, 0x56, 0x21, 0x80, 0x14, 0xED, 0x8E, 0x8B, 0x08, 0x42, 0xFA, 0x2C, 0xDC, 0x3A]);
var keys330_1 = new Uint8Array([0xE8, 0xBE, 0x2F, 0x06, 0xB1, 0x05, 0x2A, 0xB9, 0x18, 0x18, 0x03, 0xE3, 0xEB, 0x64, 0x7D, 0x26]);
var keys330_2 = new Uint8Array([0xAB, 0x82, 0x25, 0xD7, 0x43, 0x6F, 0x6C, 0xC1, 0x95, 0xC5, 0xF7, 0xF0, 0x63, 0x73, 0x3F, 0xE7]);
var keys330_3 = new Uint8Array([0xA8, 0xB1, 0x47, 0x77, 0xDC, 0x49, 0x6A, 0x6F, 0x38, 0x4C, 0x4D, 0x96, 0xBD, 0x49, 0xEC, 0x9B]);
var keys330_4 = new Uint8Array([0xEC, 0x3B, 0xD2, 0xC0, 0xFA, 0xC1, 0xEE, 0xB9, 0x9A, 0xBC, 0xFF, 0xA3, 0x89, 0xF2, 0x60, 0x1F]);
var demokeys_280 = new Uint8Array([0x12, 0x99, 0x70, 0x5E, 0x24, 0x07, 0x6C, 0xD0, 0x2D, 0x06, 0xFE, 0x7E, 0xB3, 0x0C, 0x11, 0x26]);
var demokeys_3XX_1 = new Uint8Array([0x47, 0x05, 0xD5, 0xE3, 0x56, 0x1E, 0x81, 0x9B, 0x09, 0x2F, 0x06, 0xDB, 0x6B, 0x12, 0x92, 0xE0]);
var demokeys_3XX_2 = new Uint8Array([0xF6, 0x62, 0x39, 0x6E, 0x26, 0x22, 0x4D, 0xCA, 0x02, 0x64, 0x16, 0x99, 0x7B, 0x9A, 0xE7, 0xB8]);
var ebootbin_271_new = new Uint8Array([0xF4, 0xAE, 0xF4, 0xE1, 0x86, 0xDD, 0xD2, 0x9C, 0x7C, 0xC5, 0x42, 0xA6, 0x95, 0xA0, 0x83, 0x88]);
var ebootbin_280_new = new Uint8Array([0xB8, 0x8C, 0x45, 0x8B, 0xB6, 0xE7, 0x6E, 0xB8, 0x51, 0x59, 0xA6, 0x53, 0x7C, 0x5E, 0x86, 0x31]);
var ebootbin_300_new = new Uint8Array([0xED, 0x10, 0xE0, 0x36, 0xC4, 0xFE, 0x83, 0xF3, 0x75, 0x70, 0x5E, 0xF6, 0xA4, 0x40, 0x05, 0xF7]);
var ebootbin_310_new = new Uint8Array([0x5C, 0x77, 0x0C, 0xBB, 0xB4, 0xC2, 0x4F, 0xA2, 0x7E, 0x3B, 0x4E, 0xB4, 0xB4, 0xC8, 0x70, 0xAF]);
var gameshare_260_271 = new Uint8Array([0xF9, 0x48, 0x38, 0x0C, 0x96, 0x88, 0xA7, 0x74, 0x4F, 0x65, 0xA0, 0x54, 0xC2, 0x76, 0xD9, 0xB8]);
var gameshare_280 = new Uint8Array([0x2D, 0x86, 0x77, 0x3A, 0x56, 0xA4, 0x4F, 0xDD, 0x3C, 0x16, 0x71, 0x93, 0xAA, 0x8E, 0x11, 0x43]);
var gameshare_300 = new Uint8Array([0x78, 0x1A, 0xD2, 0x87, 0x24, 0xBD, 0xA2, 0x96, 0x18, 0x3F, 0x89, 0x36, 0x72, 0x90, 0x92, 0x85]);
var gameshare_310 = new Uint8Array([0xC9, 0x7D, 0x3E, 0x0A, 0x54, 0x81, 0x6E, 0xC7, 0x13, 0x74, 0x99, 0x74, 0x62, 0x18, 0xE7, 0xDD]);
var keys360_0 = new Uint8Array([0x3C, 0x2B, 0x51, 0xD4, 0x2D, 0x85, 0x47, 0xDA, 0x2D, 0xCA, 0x18, 0xDF, 0xFE, 0x54, 0x09, 0xED]);
var keys360_1 = new Uint8Array([0x31, 0x1F, 0x98, 0xD5, 0x7B, 0x58, 0x95, 0x45, 0x32, 0xAB, 0x3A, 0xE3, 0x89, 0x32, 0x4B, 0x34]);
var keys370_0 = new Uint8Array([0x26, 0x38, 0x0A, 0xAC, 0xA5, 0xD8, 0x74, 0xD1, 0x32, 0xB7, 0x2A, 0xBF, 0x79, 0x9E, 0x6D, 0xDB]);
var keys370_1 = new Uint8Array([0x53, 0xE7, 0xAB, 0xB9, 0xC6, 0x4A, 0x4B, 0x77, 0x92, 0x17, 0xB5, 0x74, 0x0A, 0xDA, 0xA9, 0xEA]);
var keys370_2 = new Uint8Array([0x71, 0x10, 0xF0, 0xA4, 0x16, 0x14, 0xD5, 0x93, 0x12, 0xFF, 0x74, 0x96, 0xDF, 0x1F, 0xDA, 0x89]);
var oneseg_310 = new Uint8Array([0xC7, 0x27, 0x72, 0x85, 0xAB, 0xA7, 0xF7, 0xF0, 0x4C, 0xC1, 0x86, 0xCC, 0xE3, 0x7F, 0x17, 0xCA]);
var oneseg_300 = new Uint8Array([0x76, 0x40, 0x9E, 0x08, 0xDB, 0x9B, 0x3B, 0xA1, 0x47, 0x8A, 0x96, 0x8E, 0xF3, 0xF7, 0x62, 0x92]);
var oneseg_280 = new Uint8Array([0x23, 0xDC, 0x3B, 0xB5, 0xA9, 0x82, 0xD6, 0xEA, 0x63, 0xA3, 0x6E, 0x2B, 0x2B, 0xE9, 0xE1, 0x54]);
var oneseg_260_271 = new Uint8Array([0x22, 0x43, 0x57, 0x68, 0x2F, 0x41, 0xCE, 0x65, 0x4C, 0xA3, 0x7C, 0xC6, 0xC4, 0xAC, 0xF3, 0x60]);
var oneseg_slim = new Uint8Array([0x12, 0x57, 0x0D, 0x8A, 0x16, 0x6D, 0x87, 0x06, 0x03, 0x7D, 0xC8, 0x8B, 0x62, 0xA3, 0x32, 0xA9]);
var ms_app_main = new Uint8Array([0x1E, 0x2E, 0x38, 0x49, 0xDA, 0xD4, 0x16, 0x08, 0x27, 0x2E, 0xF3, 0xBC, 0x37, 0x75, 0x80, 0x93]);
var keys390_0 = new Uint8Array([0x45, 0xEF, 0x5C, 0x5D, 0xED, 0x81, 0x99, 0x84, 0x12, 0x94, 0x8F, 0xAB, 0xE8, 0x05, 0x6D, 0x7D]);
var keys390_1 = new Uint8Array([0x70, 0x1B, 0x08, 0x25, 0x22, 0xA1, 0x4D, 0x3B, 0x69, 0x21, 0xF9, 0x71, 0x0A, 0xA8, 0x41, 0xA9]);
var keys500_0 = new Uint8Array([0xEB, 0x1B, 0x53, 0x0B, 0x62, 0x49, 0x32, 0x58, 0x1F, 0x83, 0x0A, 0xF4, 0x99, 0x3D, 0x75, 0xD0]);
var keys500_1 = new Uint8Array([0xBA, 0xE2, 0xA3, 0x12, 0x07, 0xFF, 0x04, 0x1B, 0x64, 0xA5, 0x11, 0x85, 0xF7, 0x2F, 0x99, 0x5B]);
var keys500_2 = new Uint8Array([0x2C, 0x8E, 0xAF, 0x1D, 0xFF, 0x79, 0x73, 0x1A, 0xAD, 0x96, 0xAB, 0x09, 0xEA, 0x35, 0x59, 0x8B]);
var keys500_c = new Uint8Array([0xA3, 0x5D, 0x51, 0xE6, 0x56, 0xC8, 0x01, 0xCA, 0xE3, 0x77, 0xBF, 0xCD, 0xFF, 0x24, 0xDA, 0x4D]);
var keys505_a = new Uint8Array([0x7B, 0x94, 0x72, 0x27, 0x4C, 0xCC, 0x54, 0x3B, 0xAE, 0xDF, 0x46, 0x37, 0xAC, 0x01, 0x4D, 0x87]);
var keys505_0 = new Uint8Array([0x2E, 0x8E, 0x97, 0xA2, 0x85, 0x42, 0x70, 0x73, 0x18, 0xDA, 0xA0, 0x8A, 0xF8, 0x62, 0xA2, 0xB0]);
var keys505_1 = new Uint8Array([0x58, 0x2A, 0x4C, 0x69, 0x19, 0x7B, 0x83, 0x3D, 0xD2, 0x61, 0x61, 0xFE, 0x14, 0xEE, 0xAA, 0x11]);
var keys02G_E = new Uint8Array([0x9D, 0x09, 0xFD, 0x20, 0xF3, 0x8F, 0x10, 0x69, 0x0D, 0xB2, 0x6F, 0x00, 0xCC, 0xC5, 0x51, 0x2E]);
var keys03G_E = new Uint8Array([0x4F, 0x44, 0x5C, 0x62, 0xB3, 0x53, 0xC4, 0x30, 0xFC, 0x3A, 0xA4, 0x5B, 0xEC, 0xFE, 0x51, 0xEA]);
var key_D91609F0 = new Uint8Array([0xD0, 0x36, 0x12, 0x75, 0x80, 0x56, 0x20, 0x43, 0xC4, 0x30, 0x94, 0x3E, 0x1C, 0x75, 0xD1, 0xBF]);
var key_D9160AF0 = new Uint8Array([0x10, 0xA9, 0xAC, 0x16, 0xAE, 0x19, 0xC0, 0x7E, 0x3B, 0x60, 0x77, 0x86, 0x01, 0x6F, 0xF2, 0x63]);
var key_D9160BF0 = new Uint8Array([0x83, 0x83, 0xF1, 0x37, 0x53, 0xD0, 0xBE, 0xFC, 0x8D, 0xA7, 0x32, 0x52, 0x46, 0x0A, 0xC2, 0xC2]);
var key_D91611F0 = new Uint8Array([0x61, 0xB0, 0xC0, 0x58, 0x71, 0x57, 0xD9, 0xFA, 0x74, 0x67, 0x0E, 0x5C, 0x7E, 0x6E, 0x95, 0xB9]);
var key_D91612F0 = new Uint8Array([0x9E, 0x20, 0xE1, 0xCD, 0xD7, 0x88, 0xDE, 0xC0, 0x31, 0x9B, 0x10, 0xAF, 0xC5, 0xB8, 0x73, 0x23]);
var key_D91613F0 = new Uint8Array([0xEB, 0xFF, 0x40, 0xD8, 0xB4, 0x1A, 0xE1, 0x66, 0x91, 0x3B, 0x8F, 0x64, 0xB6, 0xFC, 0xB7, 0x12]);
var key_2E5E10F0 = new Uint8Array([0x9D, 0x5C, 0x5B, 0xAF, 0x8C, 0xD8, 0x69, 0x7E, 0x51, 0x9F, 0x70, 0x96, 0xE6, 0xD5, 0xC4, 0xE8]);
var key_2E5E12F0 = new Uint8Array([0x8A, 0x7B, 0xC9, 0xD6, 0x52, 0x58, 0x88, 0xEA, 0x51, 0x83, 0x60, 0xCA, 0x16, 0x79, 0xE2, 0x07]);
var key_2E5E13F0 = new Uint8Array([0xFF, 0xA4, 0x68, 0xC3, 0x31, 0xCA, 0xB7, 0x4C, 0xF1, 0x23, 0xFF, 0x01, 0x65, 0x3D, 0x26, 0x36]);
var keys600_u1_457B0BF0 = new Uint8Array([0x7B, 0x94, 0x72, 0x27, 0x4C, 0xCC, 0x54, 0x3B, 0xAE, 0xDF, 0x46, 0x37, 0xAC, 0x01, 0x4D, 0x87]);
var keys600_u1_457B0CF0 = new Uint8Array([0xAC, 0x34, 0xBA, 0xB1, 0x97, 0x8D, 0xAE, 0x6F, 0xBA, 0xE8, 0xB1, 0xD6, 0xDF, 0xDF, 0xF1, 0xA2]);
var keys05G_E = new Uint8Array([0x5D, 0xAA, 0x72, 0xF2, 0x26, 0x60, 0x4D, 0x1C, 0xE7, 0x2D, 0xC8, 0xA3, 0x2F, 0x79, 0xC5, 0x54]);
var keys570_5k = new Uint8Array([0x6D, 0x72, 0xA4, 0xBA, 0x7F, 0xBF, 0xD1, 0xF1, 0xA9, 0xF3, 0xBB, 0x07, 0x1B, 0xC0, 0xB3, 0x66]);
var keys620_0 = new Uint8Array([0xD6, 0xBD, 0xCE, 0x1E, 0x12, 0xAF, 0x9A, 0xE6, 0x69, 0x30, 0xDE, 0xDA, 0x88, 0xB8, 0xFF, 0xFB]);
var keys620_1 = new Uint8Array([0x1D, 0x13, 0xE9, 0x50, 0x04, 0x73, 0x3D, 0xD2, 0xE1, 0xDA, 0xB9, 0xC1, 0xE6, 0x7B, 0x25, 0xA7]);
var keys620_3 = new Uint8Array([0xA3, 0x5D, 0x51, 0xE6, 0x56, 0xC8, 0x01, 0xCA, 0xE3, 0x77, 0xBF, 0xCD, 0xFF, 0x24, 0xDA, 0x4D]);
var keys620_e = new Uint8Array([0xB1, 0xB3, 0x7F, 0x76, 0xC3, 0xFB, 0x88, 0xE6, 0xF8, 0x60, 0xD3, 0x35, 0x3C, 0xA3, 0x4E, 0xF3]);
var keys620_5 = new Uint8Array([0xF1, 0xBC, 0x17, 0x07, 0xAE, 0xB7, 0xC8, 0x30, 0xD8, 0x34, 0x9D, 0x40, 0x6A, 0x8E, 0xDF, 0x4E]);
var keys620_5k = new Uint8Array([0x41, 0x8A, 0x35, 0x4F, 0x69, 0x3A, 0xDF, 0x04, 0xFD, 0x39, 0x46, 0xA2, 0x5C, 0x2D, 0xF2, 0x21]);
var keys620_5v = new Uint8Array([0xF2, 0x8F, 0x75, 0xA7, 0x31, 0x91, 0xCE, 0x9E, 0x75, 0xBD, 0x27, 0x26, 0xB4, 0xB4, 0x0C, 0x32]);
//# sourceMappingURL=elf_crypted_prx_keys_16.js.map
},
"src/hle/elf_psp": function(module, exports, require) {
var _cpu = require('../core/cpu');
var _format_elf = require('../format/elf');
var _format_elf_dwarf = require('../format/elf_dwarf');

var NativeFunction = _cpu.NativeFunction;

var SyscallManager = _cpu.SyscallManager;
var MipsAssembler = _cpu.MipsAssembler;
var Instruction = _cpu.Instruction;

var ElfLoader = _format_elf.ElfLoader;

var ElfSectionHeaderFlags = _format_elf.ElfSectionHeaderFlags;
var ElfSectionHeaderType = _format_elf.ElfSectionHeaderType;
var ElfReloc = _format_elf.ElfReloc;
var ElfRelocType = _format_elf.ElfRelocType;
var ElfProgramHeaderType = _format_elf.ElfProgramHeaderType;
var ElfDwarfLoader = _format_elf_dwarf.ElfDwarfLoader;

var ElfPspModuleInfo = (function () {
    function ElfPspModuleInfo() {
    }
    ElfPspModuleInfo.struct = StructClass.create(ElfPspModuleInfo, [
        { moduleAtributes: UInt16 },
        { moduleVersion: UInt16 },
        { name: Stringz(28) },
        { gp: UInt32 },
        { exportsStart: UInt32 },
        { exportsEnd: UInt32 },
        { importsStart: UInt32 },
        { importsEnd: UInt32 }
    ]);
    return ElfPspModuleInfo;
})();
exports.ElfPspModuleInfo = ElfPspModuleInfo;

var ElfPspModuleImport = (function () {
    function ElfPspModuleImport() {
    }
    ElfPspModuleImport.struct = StructClass.create(ElfPspModuleImport, [
        { nameOffset: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { entrySize: UInt8 },
        { variableCount: UInt8 },
        { functionCount: UInt16 },
        { nidAddress: UInt32 },
        { callAddress: UInt32 }
    ]);
    return ElfPspModuleImport;
})();
exports.ElfPspModuleImport = ElfPspModuleImport;

var ElfPspModuleExport = (function () {
    function ElfPspModuleExport() {
    }
    ElfPspModuleExport.struct = StructClass.create(ElfPspModuleExport, [
        { name: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { entrySize: UInt8 },
        { variableCount: UInt8 },
        { functionCount: UInt16 },
        { exports: UInt32 }
    ]);
    return ElfPspModuleExport;
})();
exports.ElfPspModuleExport = ElfPspModuleExport;

(function (ElfPspModuleInfoAtributesEnum) {
    ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["UserMode"] = 0x0000] = "UserMode";
    ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["KernelMode"] = 0x100] = "KernelMode";
})(exports.ElfPspModuleInfoAtributesEnum || (exports.ElfPspModuleInfoAtributesEnum = {}));
var ElfPspModuleInfoAtributesEnum = exports.ElfPspModuleInfoAtributesEnum;

var InstructionReader = (function () {
    function InstructionReader(memory) {
        this.memory = memory;
    }
    InstructionReader.prototype.read = function (address) {
        return new Instruction(address, this.memory.readUInt32(address));
    };

    InstructionReader.prototype.write = function (address, instruction) {
        this.memory.writeInt32(address, instruction.data);
    };
    return InstructionReader;
})();

var PspElfLoader = (function () {
    function PspElfLoader(memory, memoryManager, moduleManager, syscallManager) {
        this.memory = memory;
        this.memoryManager = memoryManager;
        this.moduleManager = moduleManager;
        this.syscallManager = syscallManager;
        this.assembler = new MipsAssembler();
        this.baseAddress = 0;
    }
    PspElfLoader.prototype.load = function (stream) {
        console.warn('PspElfLoader.load');
        this.elfLoader = ElfLoader.fromStream(stream);

        //ElfSectionHeaderFlags.Allocate
        this.allocateMemory();
        this.writeToMemory();
        this.relocateFromHeaders();
        this.readModuleInfo();
        this.updateModuleImports();

        this.elfDwarfLoader = new ElfDwarfLoader();
        this.elfDwarfLoader.parseElfLoader(this.elfLoader);

        //this.elfDwarfLoader.getSymbolAt();
        console.log(this.moduleInfo);
    };

    PspElfLoader.prototype.getSymbolAt = function (address) {
        return this.elfDwarfLoader.getSymbolAt(address);
    };

    PspElfLoader.prototype.getSectionHeaderMemoryStream = function (sectionHeader) {
        return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size);
    };

    PspElfLoader.prototype.readModuleInfo = function () {
        this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
        this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
    };

    PspElfLoader.prototype.allocateMemory = function () {
        var _this = this;
        this.baseAddress = 0;

        if (this.elfLoader.needsRelocation) {
            this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(function (partition) {
                return partition.size;
            }).reverse().first().low;
            this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
        }

        var lowest = 0xFFFFFFFF;
        var highest = 0;
        this.elfLoader.sectionHeaders.filter(function (section) {
            return ((section.flags & 2 /* Allocate */) != 0);
        }).forEach(function (section) {
            lowest = Math.min(lowest, (_this.baseAddress + section.address));
            highest = Math.max(highest, (_this.baseAddress + section.address + section.size));
        });

        this.elfLoader.programHeaders.forEach(function (program) {
            lowest = Math.min(lowest, (_this.baseAddress + program.virtualAddress));
            highest = Math.max(highest, (_this.baseAddress + program.virtualAddress + program.memorySize));
        });

        var memorySegment = this.memoryManager.userPartition.allocateSet(highest - lowest, lowest, 'Elf');
    };

    PspElfLoader.prototype.relocateFromHeaders = function () {
        var _this = this;
        var RelocProgramIndex = 0;
        this.elfLoader.programHeaders.forEach(function (programHeader) {
            switch (programHeader.type) {
                case 1879048352 /* Reloc1 */:
                    console.warn("SKIPPING Elf.ProgramHeader.TypeEnum.Reloc1!");
                    break;
                case 1879048353 /* Reloc2 */:
                    throw ("Not implemented");
            }
        });

        var RelocSectionIndex = 0;
        this.elfLoader.sectionHeaders.forEach(function (sectionHeader) {
            switch (sectionHeader.type) {
                case 9 /* Relocation */:
                    console.log(sectionHeader);
                    console.error("Not implemented ElfSectionHeaderType.Relocation");
                    break;

                case ElfSectionHeaderType.PrxRelocation:
                    var relocs = StructArray(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
                    _this.relocateRelocs(relocs);
                    break;

                case ElfSectionHeaderType.PrxRelocation_FW5:
                    throw ("Not implemented ElfSectionHeader.Type.PrxRelocation_FW5");
            }
        });
    };

    PspElfLoader.prototype.relocateRelocs = function (relocs) {
        var baseAddress = this.baseAddress;
        var hiValue;
        var deferredHi16 = [];
        var instructionReader = new InstructionReader(this.memory);

        for (var index = 0; index < relocs.length; index++) {
            var reloc = relocs[index];
            if (reloc.type == 255 /* StopRelocation */)
                break;

            var pointerBaseOffset = this.elfLoader.programHeaders[reloc.pointerSectionHeaderBase].virtualAddress;
            var pointeeBaseOffset = this.elfLoader.programHeaders[reloc.pointeeSectionHeaderBase].virtualAddress;

            // Address of data to relocate
            var RelocatedPointerAddress = (baseAddress + reloc.pointerAddress + pointerBaseOffset);

            // Value of data to relocate
            var instruction = instructionReader.read(RelocatedPointerAddress);

            var S = baseAddress + pointeeBaseOffset;
            var GP_ADDR = (baseAddress + reloc.pointerAddress);
            var GP_OFFSET = GP_ADDR - (baseAddress & 0xFFFF0000);

            switch (reloc.type) {
                case 0 /* None */:
                    break;
                case 1 /* Mips16 */:
                    instruction.u_imm16 += S;
                    break;
                case 2 /* Mips32 */:
                    instruction.data += S;
                    break;
                case 3 /* MipsRel32 */:
                    throw ("Not implemented MipsRel32");
                case 4 /* Mips26 */:
                    instruction.jump_real = instruction.jump_real + S;
                    break;
                case 5 /* MipsHi16 */:
                    hiValue = instruction.u_imm16;
                    deferredHi16.push(RelocatedPointerAddress);
                    break;
                case 6 /* MipsLo16 */:
                    var A = instruction.u_imm16;

                    instruction.u_imm16 = ((hiValue << 16) | (A & 0x0000FFFF)) + S;

                    deferredHi16.forEach(function (data_addr2) {
                        var data2 = instructionReader.read(data_addr2);
                        var result = ((data2.data & 0x0000FFFF) << 16) + A + S;
                        if ((A & 0x8000) != 0) {
                            result -= 0x10000;
                        }
                        if ((result & 0x8000) != 0) {
                            result += 0x10000;
                        }
                        data2.u_imm16 = (result >>> 16);
                        instructionReader.write(data_addr2, data2);
                    });

                    deferredHi16 = [];
                    break;
                case 7 /* MipsGpRel16 */:
                    break;
                default:
                    throw (new Error(sprintf("RelocType %d not implemented", reloc.type)));
            }

            instructionReader.write(RelocatedPointerAddress, instruction);
        }
    };

    PspElfLoader.prototype.writeToMemory = function () {
        var _this = this;
        var needsRelocate = this.elfLoader.needsRelocation;

        //var loadAddress = this.elfLoader.programHeaders[0].psysicalAddress;
        var loadAddress = this.baseAddress;

        console.info(sprintf("PspElfLoader: needsRelocate=%s, loadAddress=%08X", needsRelocate, loadAddress));

        //console.log(moduleInfo);
        this.elfLoader.sectionHeaders.filter(function (sectionHeader) {
            return ((sectionHeader.flags & 2 /* Allocate */) != 0);
        }).forEach(function (sectionHeader) {
            var low = loadAddress + sectionHeader.address;

            switch (sectionHeader.type) {
                case 8 /* NoBits */:
                    for (var n = 0; n < sectionHeader.size; n++)
                        _this.memory.writeInt8(low + n, 0);
                    break;
                default:
                    break;
                case 1 /* ProgramBits */:
                    var stream = sectionHeader.stream;

                    var length = stream.length;

                    //console.log(sprintf('low: %08X, %08X, size: %08X', sectionHeader.address, low, stream.length));
                    _this.memory.writeStream(low, stream);

                    break;
            }
        });
    };

    PspElfLoader.prototype.updateModuleImports = function () {
        var _this = this;
        var moduleInfo = this.moduleInfo;
        console.log(moduleInfo);
        var importsBytesSize = moduleInfo.importsEnd - moduleInfo.importsStart;
        var importsStream = this.memory.sliceWithBounds(moduleInfo.importsStart, moduleInfo.importsEnd);
        var importsCount = importsBytesSize / ElfPspModuleImport.struct.length;
        var imports = StructArray(ElfPspModuleImport.struct, importsCount).read(importsStream);
        imports.forEach(function (_import) {
            _import.name = _this.memory.readStringz(_import.nameOffset);
            var imported = _this.updateModuleFunctions(_import);
            _this.updateModuleVars(_import);
            console.info('Imported: ', imported.name, imported.registeredNativeFunctions.map(function (i) {
                return i.name;
            }));
        });
        //console.log(imports);
    };

    PspElfLoader.prototype.updateModuleFunctions = function (moduleImport) {
        var _this = this;
        var _module = this.moduleManager.getByName(moduleImport.name);
        var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
        var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);
        var registeredNativeFunctions = [];
        var unknownFunctions = [];

        var registerN = function (nid, n) {
            var nfunc;
            nfunc = _module.getByNid(nid);
            if (!nfunc) {
                unknownFunctions.push(sprintf("'%s':0x%08X", _module.moduleName, nid));

                nfunc = new NativeFunction();
                nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                nfunc.nid = nid;
                nfunc.firmwareVersion = 150;
                nfunc.nativeCall = function () {
                    console.info(_module);
                    throw (new Error("updateModuleFunctions: Not implemented '" + nfunc.name + "'"));
                };
                nfunc.call = function (context, state) {
                    nfunc.nativeCall();
                };
            }

            registeredNativeFunctions.push(nfunc);

            var syscallId = _this.syscallManager.register(nfunc);

            //printf("%s:%08X -> %s", moduleImport.name, nid, syscallId);
            return syscallId;
        };

        for (var n = 0; n < moduleImport.functionCount; n++) {
            var nid = nidsStream.readUInt32();
            var syscall = registerN(nid, n);

            callStream.writeInt32(this.assembler.assemble(0, sprintf('jr $31'))[0].data);
            callStream.writeInt32(this.assembler.assemble(0, sprintf('syscall %d', syscall))[0].data);
        }

        console.warn("Can't find functions", unknownFunctions);

        return {
            name: moduleImport.name,
            registeredNativeFunctions: registeredNativeFunctions
        };
    };

    PspElfLoader.prototype.updateModuleVars = function (moduleImport) {
    };
    return PspElfLoader;
})();
exports.PspElfLoader = PspElfLoader;
//# sourceMappingURL=elf_psp.js.map
},
"src/hle/manager": function(module, exports, require) {
var _file = require('./manager/file');
_file.Device;
var _memory = require('./manager/memory');
_memory.MemoryManager;
var _module = require('./manager/module');
_module.ModuleManager;
var _thread = require('./manager/thread');
_thread.Thread;
var _callback = require('./manager/callback');
_callback.Callback;
var _interop = require('./manager/interop');
_interop.Interop;

var Device = _file.Device;
exports.Device = Device;
var FileManager = _file.FileManager;
exports.FileManager = FileManager;
var HleDirectory = _file.HleDirectory;
exports.HleDirectory = HleDirectory;
var HleFile = _file.HleFile;
exports.HleFile = HleFile;
var Uri = _file.Uri;
exports.Uri = Uri;

var MemoryAnchor = _memory.MemoryAnchor;
exports.MemoryAnchor = MemoryAnchor;
var MemoryManager = _memory.MemoryManager;
exports.MemoryManager = MemoryManager;
var MemoryPartition = _memory.MemoryPartition;
exports.MemoryPartition = MemoryPartition;
var OutOfMemoryError = _memory.OutOfMemoryError;
exports.OutOfMemoryError = OutOfMemoryError;

var ModuleManager = _module.ModuleManager;
exports.ModuleManager = ModuleManager;
var ModuleWrapper = _module.ModuleWrapper;
exports.ModuleWrapper = ModuleWrapper;

var Thread = _thread.Thread;
exports.Thread = Thread;
var ThreadManager = _thread.ThreadManager;
exports.ThreadManager = ThreadManager;
var ThreadStatus = _thread.ThreadStatus;
exports.ThreadStatus = ThreadStatus;
var PspThreadAttributes = _thread.PspThreadAttributes;
exports.PspThreadAttributes = PspThreadAttributes;

var Callback = _callback.Callback;
exports.Callback = Callback;
var CallbackManager = _callback.CallbackManager;
exports.CallbackManager = CallbackManager;

var Interop = _interop.Interop;
exports.Interop = Interop;
//# sourceMappingURL=manager.js.map
},
"src/hle/manager/callback": function(module, exports, require) {
var Signal = require('../../util/Signal');

var CallbackManager = (function () {
    function CallbackManager(interop) {
        this.interop = interop;
        this.uids = new UidCollection(1);
        this.notifications = [];
        this.onAdded = new Signal();
    }
    Object.defineProperty(CallbackManager.prototype, "hasPendingCallbacks", {
        get: function () {
            return this.notifications.length > 0;
        },
        enumerable: true,
        configurable: true
    });

    CallbackManager.prototype.register = function (callback) {
        return this.uids.allocate(callback);
    };

    CallbackManager.prototype.remove = function (id) {
        return this.uids.remove(id);
    };

    CallbackManager.prototype.get = function (id) {
        return this.uids.get(id);
    };

    CallbackManager.prototype.notify = function (id, arg2) {
        var callback = this.get(id);

        //if (!callback) throw(new Error("Can't find callback by id '" + id + "'"));
        this.notifications.push(new CallbackNotification(callback, arg2));
        this.onAdded.dispatch(this.notifications.length);
    };

    CallbackManager.prototype.executePendingWithinThread = function (thread) {
        var state = thread.state;
        var count = 0;

        while (this.notifications.length > 0) {
            var notification = this.notifications.shift();

            this.interop.execute(state, notification.callback.funcptr, [1, notification.arg2, notification.callback.argument]);

            count++;
        }

        return (count > 0);
    };
    return CallbackManager;
})();
exports.CallbackManager = CallbackManager;

var CallbackNotification = (function () {
    function CallbackNotification(callback, arg2) {
        this.callback = callback;
        this.arg2 = arg2;
    }
    return CallbackNotification;
})();
exports.CallbackNotification = CallbackNotification;

var Callback = (function () {
    function Callback(name, funcptr, argument) {
        this.name = name;
        this.funcptr = funcptr;
        this.argument = argument;
        this.count = 0;
    }
    return Callback;
})();
exports.Callback = Callback;
//# sourceMappingURL=callback.js.map
},
"src/hle/manager/file": function(module, exports, require) {
var Device = (function () {
    function Device(name, vfs) {
        this.name = name;
        this.vfs = vfs;
        this.cwd = '';
    }
    Device.prototype.devctlAsync = function (command, input, output) {
        return this.vfs.devctlAsync(command, input, output);
    };

    Device.prototype.openAsync = function (uri, flags, mode) {
        return this.vfs.openAsync(uri.pathWithoutDevice, flags, mode);
    };

    Device.prototype.openDirectoryAsync = function (uri) {
        return this.vfs.openDirectoryAsync(uri.pathWithoutDevice);
    };

    Device.prototype.getStatAsync = function (uri) {
        return this.vfs.getStatAsync(uri.pathWithoutDevice);
    };
    return Device;
})();
exports.Device = Device;

var HleFile = (function () {
    function HleFile(entry) {
        this.entry = entry;
        this.cursor = 0;
        this._asyncResult = null;
        this._asyncPromise = null;
    }
    Object.defineProperty(HleFile.prototype, "asyncResult", {
        get: function () {
            return this._asyncResult;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(HleFile.prototype, "asyncOperation", {
        get: function () {
            return this._asyncPromise;
        },
        enumerable: true,
        configurable: true
    });

    HleFile.prototype.startAsyncOperation = function () {
        this._asyncResult = null;
    };

    HleFile.prototype.setAsyncOperation = function (operation) {
        var _this = this;
        this._asyncResult = null;
        this._asyncPromise = operation.then(function (value) {
            _this._asyncResult = value;
            return value;
        });
    };

    HleFile.prototype.close = function () {
        this.entry.close();
    };
    return HleFile;
})();
exports.HleFile = HleFile;

var HleDirectory = (function () {
    function HleDirectory(childs) {
        this.childs = childs;
        this.cursor = 0;
    }
    HleDirectory.prototype.read = function () {
        return this.childs[this.cursor++];
    };

    Object.defineProperty(HleDirectory.prototype, "left", {
        get: function () {
            return this.childs.length - this.cursor;
        },
        enumerable: true,
        configurable: true
    });

    HleDirectory.prototype.close = function () {
    };
    return HleDirectory;
})();
exports.HleDirectory = HleDirectory;

var Uri = (function () {
    function Uri(path) {
        this.path = path;
    }
    Object.defineProperty(Uri.prototype, "device", {
        get: function () {
            return (this.path.split(':'))[0];
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Uri.prototype, "pathWithoutDevice", {
        get: function () {
            return (this.path.split(':'))[1];
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Uri.prototype, "isAbsolute", {
        get: function () {
            return this.path.contains(':');
        },
        enumerable: true,
        configurable: true
    });

    Uri.prototype.append = function (that) {
        if (that.isAbsolute)
            return that;
        return new Uri(this.path + '/' + that.path);
    };
    return Uri;
})();
exports.Uri = Uri;

var FileManager = (function () {
    function FileManager() {
        this.devices = {};
        this.cwd = new Uri('ms0:/');
    }
    FileManager.prototype.chdir = function (cwd) {
        this.cwd = new Uri(cwd);
    };

    FileManager.prototype.getDevice = function (name) {
        name = name.replace(/:$/, '');
        var device = this.devices[name];
        if (!device)
            throw (new Error(sprintf("Can't find device '%s'", name)));
        return device;
    };

    FileManager.prototype.openAsync = function (name, flags, mode) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openAsync(uri, flags, mode).then(function (entry) {
            return new HleFile(entry);
        });
    };

    FileManager.prototype.devctlAsync = function (deviceName, command, input, output) {
        return this.getDevice(deviceName).devctlAsync(command, input, output);
    };

    FileManager.prototype.openDirectoryAsync = function (name) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openDirectoryAsync(uri).then(function (entry) {
            return entry.enumerateAsync().then(function (items) {
                entry.close();
                return new HleDirectory(items);
            });
        });
    };

    FileManager.prototype.getStatAsync = function (name) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).getStatAsync(uri);
    };

    FileManager.prototype.mount = function (device, vfs) {
        this.devices[device] = new Device(device, vfs);
    };
    return FileManager;
})();
exports.FileManager = FileManager;
//# sourceMappingURL=file.js.map
},
"src/hle/manager/interop": function(module, exports, require) {
var _cpu = require('../../core/cpu');
_cpu.CpuState;

var CpuState = _cpu.CpuState;

var Interop = (function () {
    function Interop() {
    }
    Interop.prototype.execute = function (state, address, gprArray) {
        state.preserveRegisters(function () {
            state.setRA(0x1234);
            for (var n = 0; n < gprArray.length; n++) {
                state.gpr[4 + n] = gprArray[n];
            }
            state.callPCSafe(address);
        });
    };
    return Interop;
})();
exports.Interop = Interop;
//# sourceMappingURL=interop.js.map
},
"src/hle/manager/memory": function(module, exports, require) {
var MemoryPartitions;
(function (MemoryPartitions) {
    MemoryPartitions[MemoryPartitions["Kernel0"] = 0] = "Kernel0";
    MemoryPartitions[MemoryPartitions["User"] = 2] = "User";
    MemoryPartitions[MemoryPartitions["VolatilePartition"] = 5] = "VolatilePartition";
    MemoryPartitions[MemoryPartitions["UserStacks"] = 6] = "UserStacks";
})(MemoryPartitions || (MemoryPartitions = {}));

(function (MemoryAnchor) {
    MemoryAnchor[MemoryAnchor["Low"] = 0] = "Low";
    MemoryAnchor[MemoryAnchor["High"] = 1] = "High";
    MemoryAnchor[MemoryAnchor["Address"] = 2] = "Address";
    MemoryAnchor[MemoryAnchor["LowAligned"] = 3] = "LowAligned";
    MemoryAnchor[MemoryAnchor["HighAligned"] = 4] = "HighAligned";
})(exports.MemoryAnchor || (exports.MemoryAnchor = {}));
var MemoryAnchor = exports.MemoryAnchor;

var OutOfMemoryError = (function () {
    function OutOfMemoryError(message, name) {
        if (typeof name === "undefined") { name = 'OutOfMemoryError'; }
        this.message = message;
        this.name = name;
    }
    return OutOfMemoryError;
})();
exports.OutOfMemoryError = OutOfMemoryError;

var MemoryPartition = (function () {
    function MemoryPartition(name, low, high, allocated, parent) {
        this.name = name;
        this.low = low;
        this.high = high;
        this.allocated = allocated;
        this.parent = parent;
        this._childPartitions = [];
    }
    Object.defineProperty(MemoryPartition.prototype, "size", {
        get: function () {
            return this.high - this.low;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(MemoryPartition.prototype, "root", {
        get: function () {
            return (this.parent) ? this.parent.root : this;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(MemoryPartition.prototype, "childPartitions", {
        get: function () {
            if (this._childPartitions.length == 0)
                this._childPartitions.push(new MemoryPartition("", this.low, this.high, false));
            return this._childPartitions;
        },
        enumerable: true,
        configurable: true
    });

    MemoryPartition.prototype.contains = function (address) {
        return address >= this.low && address < this.high;
    };

    MemoryPartition.prototype.deallocate = function () {
        this.allocated = false;
        if (this.parent) {
            this.parent.cleanup();
        }
    };

    MemoryPartition.prototype.allocate = function (size, anchor, address, name) {
        if (typeof address === "undefined") { address = 0; }
        if (typeof name === "undefined") { name = ''; }
        switch (anchor) {
            case 3 /* LowAligned */:
            case 0 /* Low */:
                return this.allocateLow(size, name);
            case 1 /* High */:
                return this.allocateHigh(size, name);
            case 2 /* Address */:
                return this.allocateSet(size, address, name);
            default:
                throw (new Error(sprintf("Not implemented anchor %d:%s", anchor, MemoryAnchor[anchor])));
        }
    };

    MemoryPartition.prototype.allocateSet = function (size, addressLow, name) {
        if (typeof name === "undefined") { name = ''; }
        var childs = this.childPartitions;
        var addressHigh = addressLow + size;

        if (!this.contains(addressLow) || !this.contains(addressHigh)) {
            throw (new OutOfMemoryError(sprintf("Can't allocate [%08X-%08X] in [%08X-%08X]", addressLow, addressHigh, this.low, this.high)));
        }

        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (!child.contains(addressLow))
                continue;
            if (child.allocated)
                throw (new Error("Memory already allocated"));
            if (!child.contains(addressHigh - 1))
                throw (new Error("Can't fit memory"));

            var p1 = new MemoryPartition('', child.low, addressLow, false, this);
            var p2 = new MemoryPartition(name, addressLow, addressHigh, true, this);
            var p3 = new MemoryPartition('', addressHigh, child.high, false, this);

            childs.splice(n, 1, p1, p2, p3);

            this.cleanup();
            return p2;
        }
        console.log(sprintf('address: %08X, size: %d', addressLow, size));
        console.log(this);
        throw (new Error("Can't find the segment"));
    };

    MemoryPartition.prototype.allocateLow = function (size, name) {
        if (typeof name === "undefined") { name = ''; }
        return this.allocateLowHigh(size, true, name);
    };

    MemoryPartition.prototype.allocateHigh = function (size, name, alignment) {
        if (typeof name === "undefined") { name = ''; }
        if (typeof alignment === "undefined") { alignment = 1; }
        return this.allocateLowHigh(size, false, name);
    };

    MemoryPartition.prototype._validateChilds = function () {
        var childs = this._childPartitions;

        if (childs[0].low != this.low)
            throw (new Error("Invalid state [1]"));
        if (childs[childs.length - 1].high != this.high)
            throw (new Error("Invalid state [2]"));

        for (var n = 0; n < childs.length - 1; n++) {
            if (childs[n + 0].high != childs[n + 1].low)
                throw (new Error("Invalid state [3] -> " + n));
        }
    };

    MemoryPartition.prototype.allocateLowHigh = function (size, low, name) {
        if (typeof name === "undefined") { name = ''; }
        var childs = this.childPartitions;
        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (child.allocated)
                continue;
            if (child.size < size)
                continue;

            if (low) {
                var p1 = child.low;
                var p2 = child.low + size;
                var p3 = child.high;
                var allocatedChild = new MemoryPartition(name, p1, p2, true, this);
                var unallocatedChild = new MemoryPartition("", p2, p3, false, this);
                childs.splice(n, 1, allocatedChild, unallocatedChild);
            } else {
                var p1 = child.low;
                var p2 = child.high - size;
                var p3 = child.high;
                var unallocatedChild = new MemoryPartition("", p1, p2, false, this);
                var allocatedChild = new MemoryPartition(name, p2, p3, true, this);
                childs.splice(n, 1, unallocatedChild, allocatedChild);
            }
            this.cleanup();
            return allocatedChild;
        }

        throw (new OutOfMemoryError("Can't find a partition with " + size + " available"));
    };

    MemoryPartition.prototype.unallocate = function () {
        this.name = '';
        this.allocated = false;
        if (this.parent)
            this.parent.cleanup();
    };

    MemoryPartition.prototype.cleanup = function () {
        var startTotalFreeMemory = this.getTotalFreeMemory();

        //this._validateChilds();
        // join contiguous free memory
        var childs = this.childPartitions;
        if (childs.length >= 2) {
            for (var n = 0; n < childs.length - 1; n++) {
                var child = childs[n + 0];
                var c1 = childs[n + 1];
                if (!child.allocated && !c1.allocated) {
                    //console.log('joining', child, c1, child.low, c1.high);
                    childs.splice(n, 2, new MemoryPartition("", child.low, c1.high, false, this));
                    n--;
                }
            }
        }

        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (!child.allocated && child.size == 0)
                childs.splice(n, 1);
        }

        //this._validateChilds();
        var endTotalFreeMemory = this.getTotalFreeMemory();

        if (endTotalFreeMemory != startTotalFreeMemory) {
            console.log('assertion failed! : ' + startTotalFreeMemory + ',' + endTotalFreeMemory);
        }
    };

    Object.defineProperty(MemoryPartition.prototype, "nonAllocatedPartitions", {
        get: function () {
            return this.childPartitions.filter(function (item) {
                return !item.allocated;
            });
        },
        enumerable: true,
        configurable: true
    });

    MemoryPartition.prototype.getTotalFreeMemory = function () {
        return this.nonAllocatedPartitions.reduce(function (prev, item) {
            return item.size + prev;
        }, 0);
    };

    MemoryPartition.prototype.getMaxContiguousFreeMemory = function () {
        return this.nonAllocatedPartitions.max(function (item) {
            return item.size;
        }).size;
    };

    MemoryPartition.prototype.findFreeChildWithSize = function (size) {
    };
    return MemoryPartition;
})();
exports.MemoryPartition = MemoryPartition;

var MemoryManager = (function () {
    function MemoryManager() {
        this.memoryPartitionsUid = {};
        this.init();
    }
    MemoryManager.prototype.init = function () {
        this.memoryPartitionsUid[0 /* Kernel0 */] = new MemoryPartition("Kernel Partition 1", 0x88000000, 0x88300000, false);

        //this.memoryPartitionsUid[MemoryPartitions.User] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        //this.memoryPartitionsUid[MemoryPartitions.UserStacks] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        this.memoryPartitionsUid[2 /* User */] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[6 /* UserStacks */] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[5 /* VolatilePartition */] = new MemoryPartition("Volatile Partition", 0x08400000, 0x08800000, false);
    };

    Object.defineProperty(MemoryManager.prototype, "kernelPartition", {
        get: function () {
            return this.memoryPartitionsUid[0 /* Kernel0 */];
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(MemoryManager.prototype, "userPartition", {
        get: function () {
            return this.memoryPartitionsUid[2 /* User */];
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(MemoryManager.prototype, "stackPartition", {
        get: function () {
            return this.memoryPartitionsUid[6 /* UserStacks */];
        },
        enumerable: true,
        configurable: true
    });
    return MemoryManager;
})();
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=memory.js.map
},
"src/hle/manager/module": function(module, exports, require) {
var _cpu = require('../../core/cpu');

var NativeFunction = _cpu.NativeFunction;

var ModuleWrapper = (function () {
    function ModuleWrapper(moduleName, _modules) {
        var _this = this;
        this.moduleName = moduleName;
        this._modules = _modules;
        this.names = {};
        this.nids = {};
        _modules.forEach(function (_module) {
            for (var key in _module) {
                var item = _module[key];
                if (item && item instanceof NativeFunction) {
                    var nativeFunction = item;
                    nativeFunction.name = key;
                    _this.nids[nativeFunction.nid] = nativeFunction;
                    _this.names[nativeFunction.name] = nativeFunction;
                }
            }
        });
    }
    ModuleWrapper.prototype.getByName = function (name) {
        return this.names[name];
    };

    ModuleWrapper.prototype.getByNid = function (nid) {
        var result = this.nids[nid];

        //if (!result) throw (new Error(sprintf("Can't find function '%s':0x%08X", this.moduleName, nid)));
        return result;
    };
    return ModuleWrapper;
})();
exports.ModuleWrapper = ModuleWrapper;

var ModuleManager = (function () {
    function ModuleManager(context) {
        this.context = context;
        this.names = {};
        this.moduleWrappers = {};
    }
    ModuleManager.prototype.registerModule = function (_module) {
        for (var key in _module) {
            if (key == 'createNativeFunction')
                continue;
            var _class = _module[key];
            this.add(key, _class);
        }
    };

    ModuleManager.prototype.getByName = function (name) {
        var _this = this;
        var _moduleWrapper = this.moduleWrappers[name];
        if (_moduleWrapper)
            return _moduleWrapper;

        var _classes = this.names[name];
        if (!_classes)
            throw (new Error("Can't find module '" + name + "'"));

        var _modules = _classes.map(function (_class) {
            return new _class(_this.context);
        });

        return this.moduleWrappers[name] = new ModuleWrapper(name, _modules);
    };

    ModuleManager.prototype.add = function (name, _class) {
        if (!_class)
            throw (new Error("Can't find module '" + name + "'"));
        if (!this.names[name])
            this.names[name] = [];
        this.names[name].push(_class);
    };
    return ModuleManager;
})();
exports.ModuleManager = ModuleManager;
//# sourceMappingURL=module.js.map
},
"src/hle/manager/thread": function(module, exports, require) {
var _cpu = require('../../core/cpu');

var SyscallManager = _cpu.SyscallManager;

var InstructionCache = _cpu.InstructionCache;
var CpuState = _cpu.CpuState;
var ProgramExecutor = _cpu.ProgramExecutor;
var NativeFunction = _cpu.NativeFunction;
var CpuSpecialAddresses = _cpu.CpuSpecialAddresses;

(function (ThreadStatus) {
    ThreadStatus[ThreadStatus["RUNNING"] = 1] = "RUNNING";
    ThreadStatus[ThreadStatus["READY"] = 2] = "READY";
    ThreadStatus[ThreadStatus["WAIT"] = 4] = "WAIT";
    ThreadStatus[ThreadStatus["SUSPEND"] = 8] = "SUSPEND";
    ThreadStatus[ThreadStatus["DORMANT"] = 16] = "DORMANT";
    ThreadStatus[ThreadStatus["DEAD"] = 32] = "DEAD";

    ThreadStatus[ThreadStatus["WAITSUSPEND"] = ThreadStatus.WAIT | ThreadStatus.SUSPEND] = "WAITSUSPEND";
})(exports.ThreadStatus || (exports.ThreadStatus = {}));
var ThreadStatus = exports.ThreadStatus;

(function (PspThreadAttributes) {
    PspThreadAttributes[PspThreadAttributes["None"] = 0] = "None";
    PspThreadAttributes[PspThreadAttributes["LowFF"] = 0x000000FF] = "LowFF";
    PspThreadAttributes[PspThreadAttributes["Vfpu"] = 0x00004000] = "Vfpu";
    PspThreadAttributes[PspThreadAttributes["V0x2000"] = 0x2000] = "V0x2000";
    PspThreadAttributes[PspThreadAttributes["V0x4000"] = 0x4000] = "V0x4000";
    PspThreadAttributes[PspThreadAttributes["V0x400000"] = 0x400000] = "V0x400000";
    PspThreadAttributes[PspThreadAttributes["V0x800000"] = 0x800000] = "V0x800000";
    PspThreadAttributes[PspThreadAttributes["V0xf00000"] = 0xf00000] = "V0xf00000";
    PspThreadAttributes[PspThreadAttributes["V0x8000000"] = 0x8000000] = "V0x8000000";
    PspThreadAttributes[PspThreadAttributes["V0xf000000"] = 0xf000000] = "V0xf000000";
    PspThreadAttributes[PspThreadAttributes["User"] = 0x80000000] = "User";
    PspThreadAttributes[PspThreadAttributes["UsbWlan"] = 0xa0000000] = "UsbWlan";
    PspThreadAttributes[PspThreadAttributes["Vsh"] = 0xc0000000] = "Vsh";

    //ScratchRamEnable = 0x00008000, // Allow using scratchpad memory for a thread, NOT USABLE ON V1.0
    PspThreadAttributes[PspThreadAttributes["NoFillStack"] = 0x00100000] = "NoFillStack";
    PspThreadAttributes[PspThreadAttributes["ClearStack"] = 0x00200000] = "ClearStack";
    PspThreadAttributes[PspThreadAttributes["ValidMask"] = PspThreadAttributes.LowFF | PspThreadAttributes.Vfpu | PspThreadAttributes.User | PspThreadAttributes.UsbWlan | PspThreadAttributes.Vsh | PspThreadAttributes.NoFillStack | PspThreadAttributes.ClearStack | PspThreadAttributes.V0x2000 | PspThreadAttributes.V0x4000 | PspThreadAttributes.V0x400000 | PspThreadAttributes.V0x800000 | PspThreadAttributes.V0xf00000 | PspThreadAttributes.V0x8000000 | PspThreadAttributes.V0xf000000] = "ValidMask";
})(exports.PspThreadAttributes || (exports.PspThreadAttributes = {}));
var PspThreadAttributes = exports.PspThreadAttributes;

var Thread = (function () {
    function Thread(name, manager, memoryManager, state, instructionCache, stackSize) {
        var _this = this;
        this.name = name;
        this.manager = manager;
        this.state = state;
        this.instructionCache = instructionCache;
        this.id = 0;
        this.status = 16 /* DORMANT */;
        this.initialPriority = 10;
        this.entryPoint = 0;
        this.priority = 10;
        this.attributes = 0;
        //exitStatus: number = 0x800201a2;
        this.exitStatus = 0;
        this.running = false;
        this.preemptionCount = 0;
        this.info = null;
        this.waitingName = null;
        this.waitingObject = null;
        this.waitingPromise = null;
        this.runningPromise = null;
        this.acceptingCallbacks = false;
        this.wakeupCount = 0;
        this.wakeupPromise = null;
        this.wakeupFunc = null;
        this.accumulatedMicroseconds = 0;
        this.state.thread = this;
        this.programExecutor = new ProgramExecutor(state, instructionCache);
        this.runningPromise = new Promise(function (resolve, reject) {
            _this.runningStop = resolve;
        });
        this.stackPartition = memoryManager.stackPartition.allocateHigh(stackSize, name + '-stack', 0x100);
    }
    Object.defineProperty(Thread.prototype, "runningOrAcceptingCallbacks", {
        get: function () {
            return this.running || this.acceptingCallbacks;
        },
        enumerable: true,
        configurable: true
    });

    Thread.prototype.delete = function () {
        this.stackPartition.deallocate();
    };

    Thread.prototype.waitEndAsync = function () {
        return this.runningPromise;
    };

    Thread.prototype.getWakeupPromise = function () {
        var _this = this;
        if (!this.wakeupPromise) {
            this.wakeupPromise = new Promise(function (resolve, reject) {
                _this.wakeupFunc = resolve;
            });
        }
        return this.wakeupPromise;
    };

    Thread.prototype.wakeupSleepAsync = function (callbacks) {
        this.wakeupCount--;
        this.suspend();

        //return new Promise((resolve, reject) => { });
        return this.getWakeupPromise();
    };

    Thread.prototype.wakeupWakeupAsync = function () {
        this.wakeupCount++;
        if (this.wakeupCount >= 0) {
            this.wakeupFunc();
            this.wakeupPromise = null;
            this.wakeupFunc = null;
        }
        return Promise.resolve(0);
    };

    Thread.prototype.delayMicrosecondsAsync = function (delayMicroseconds) {
        //console.error(delayMicroseconds, this.accumulatedMicroseconds);
        var _this = this;
        var subtractAccumulatedMicroseconds = Math.min(delayMicroseconds, this.accumulatedMicroseconds);
        delayMicroseconds -= subtractAccumulatedMicroseconds;
        this.accumulatedMicroseconds -= subtractAccumulatedMicroseconds;

        //console.error(delayMicroseconds, this.accumulatedMicroseconds, subtractAccumulatedMicroseconds);
        if (delayMicroseconds <= 0.00001) {
            //console.error('none!');
            return Promise.resolve(0);
        }

        var start = performance.now();
        return waitAsync(delayMicroseconds / 1000).then(function () {
            var end = performance.now();
            var elapsedmicroseconds = (end - start) * 1000;

            _this.accumulatedMicroseconds += ((elapsedmicroseconds - delayMicroseconds) | 0);

            return 0;
        });
    };

    Thread.prototype.suspend = function () {
        //console.log('suspended ' + this.name);
        this.running = false;
        this.manager.eventOcurred();
    };

    Thread.prototype.suspendUntilDone = function (info) {
        this.info = info;
        this.waitingName = info.name;
        this.waitingObject = info.object;
        this.acceptingCallbacks = (info.callbacks == 1 /* YES */);
        this._suspendUntilPromiseDone(info.promise);
    };

    Thread.prototype.suspendUntilPromiseDone = function (promise, info) {
        this.waitingName = sprintf('%s:0x%08X (Promise)', info.name, info.nid);
        this.waitingObject = info;
        this._suspendUntilPromiseDone(promise);
    };

    Thread.prototype._suspendUntilPromiseDone = function (promise) {
        var _this = this;
        this.waitingPromise = promise;

        this.suspend();

        //console.log(promise);
        promise.then(function (result) {
            _this.waitingPromise = null;
            _this.waitingName = null;
            _this.waitingObject = null;
            _this.acceptingCallbacks = false;
            if (result !== undefined)
                _this.state.V0 = result;

            //console.error('resumed ' + this.name);
            _this.resume();
        });
    };

    Thread.prototype.resume = function () {
        this.running = true;
        this.manager.eventOcurred();
    };

    Thread.prototype.start = function () {
        this.running = true;
        this.manager.threads.add(this);
        this.manager.eventOcurred();
    };

    Thread.prototype.stop = function () {
        this.running = false;
        this.runningStop();
        this.manager.threads.delete(this);
        this.manager.eventOcurred();
    };

    Thread.prototype.runStep = function () {
        this.preemptionCount++;

        try  {
            this.programExecutor.execute(10000);
            //this.programExecutor.execute(200000);
            //this.programExecutor.execute(2000000);
        } catch (e) {
            console.error(e);
            console.error(e['stack']);
            this.stop();
            throw (e);
        }
    };
    return Thread;
})();
exports.Thread = Thread;

var ThreadManager = (function () {
    function ThreadManager(memory, interruptManager, callbackManager, memoryManager, display, syscallManager, instructionCache) {
        var _this = this;
        this.memory = memory;
        this.interruptManager = interruptManager;
        this.callbackManager = callbackManager;
        this.memoryManager = memoryManager;
        this.display = display;
        this.syscallManager = syscallManager;
        this.instructionCache = instructionCache;
        this.threads = new DSet();
        this.interval = -1;
        this.enqueued = false;
        this.enqueuedTime = 0;
        this.running = false;
        this.callbackAdded = null;
        this.exitPromise = new Promise(function (resolve, reject) {
            _this.exitResolve = resolve;
        });
        this.interruptManager.event.add(this.eventOcurred);
    }
    ThreadManager.prototype.create = function (name, entryPoint, initialPriority, stackSize, attributes) {
        if (typeof stackSize === "undefined") { stackSize = 0x1000; }
        if (typeof attributes === "undefined") { attributes = 0; }
        var thread = new Thread(name, this, this.memoryManager, new CpuState(this.memory, this.syscallManager), this.instructionCache, stackSize);
        thread.entryPoint = entryPoint;
        thread.state.PC = entryPoint;
        thread.state.setRA(268435455 /* EXIT_THREAD */);
        thread.state.SP = thread.stackPartition.high;
        thread.initialPriority = initialPriority;
        thread.priority = initialPriority;
        thread.attributes = attributes;

        if ((thread.stackPartition.high & 0xFF) != 0)
            throw (new Error("Stack not aligned"));

        if (!(thread.attributes & 1048576 /* NoFillStack */)) {
            //this.memory.memset(thread.stackPartition.low, 0xFF, thread.stackPartition.size);
        } else if ((thread.attributes & 2097152 /* ClearStack */)) {
            //this.memory.memset(thread.stackPartition.low, 0x00, thread.stackPartition.size);
        }

        return thread;
    };

    ThreadManager.prototype.eventOcurred = function () {
        var _this = this;
        if (!this.running)
            return;
        if (this.enqueued)
            return;
        this.enqueued = true;
        this.enqueuedTime = performance.now();
        setImmediate(function () {
            return _this.eventOcurredCallback();
        });
    };

    //get runningThreads() { return this.threads.filter(thread => thread.running); }
    ThreadManager.getHighestPriority = function (threads) {
        var priority = -9999;
        threads.forEach(function (thread) {
            priority = Math.max(priority, thread.priority);
        });
        return priority;
    };

    ThreadManager.prototype.eventOcurredCallback = function () {
        var _this = this;
        if (!this.running)
            return;

        var microsecondsToCompensate = Math.round((performance.now() - this.enqueuedTime) * 1000);

        //console.log('delayedTime', timeMsToCompensate);
        this.enqueued = false;
        var start = window.performance.now();

        while (true) {
            if (this.threads.elements.length > 0) {
                this.interruptManager.execute(this.threads.elements[0].state);
            }

            var callbackThreadCount = 0;
            var callbackPriority = Number.MAX_VALUE;
            var runningThreadCount = 0;
            var runningPriority = Number.MAX_VALUE;

            this.threads.forEach(function (thread) {
                if (_this.callbackManager.hasPendingCallbacks) {
                    if (thread.acceptingCallbacks) {
                        callbackThreadCount++;
                        callbackPriority = Math.min(callbackPriority, thread.priority);
                    }
                }
                if (thread.running) {
                    runningThreadCount++;
                    runningPriority = Math.min(runningPriority, thread.priority);
                    thread.accumulatedMicroseconds += microsecondsToCompensate;
                }
            });

            if ((runningThreadCount == 0) && (callbackThreadCount == 0))
                break;

            if (callbackThreadCount != 0) {
                this.threads.forEach(function (thread) {
                    if (thread.acceptingCallbacks && (thread.priority == callbackPriority)) {
                        _this.callbackManager.executePendingWithinThread(thread);
                    }
                });
            }

            if (runningThreadCount != 0) {
                this.threads.forEach(function (thread) {
                    if (thread.running && (thread.priority == runningPriority)) {
                        do {
                            thread.runStep();
                            if (!_this.interruptManager.enabled)
                                console.log('interrupts disabled, no thread scheduling!');
                        } while(!_this.interruptManager.enabled);
                    }
                });
            }

            var current = window.performance.now();
            if (current - start >= 100) {
                setTimeout(function () {
                    return _this.eventOcurred();
                }, 0);
                return;
            }
        }
    };

    ThreadManager.prototype.debugThreads = function () {
        var html = '';
        this.threads.forEach(function (thread) {
            html += sprintf("%08X:%s:%s", thread.state.PC, thread.name, thread.running);
        });
        document.getElementById('thread_list').innerHTML = html;
    };

    ThreadManager.prototype.startAsync = function () {
        var _this = this;
        this.running = true;
        this.eventOcurred();
        this.callbackAdded = this.callbackManager.onAdded.add(function () {
            _this.eventOcurred();
        });
        return Promise.resolve();
    };

    ThreadManager.prototype.stopAsync = function () {
        this.running = false;
        this.callbackManager.onAdded.remove(this.callbackAdded);
        clearInterval(this.interval);
        this.interval = -1;
        return Promise.resolve();
    };

    ThreadManager.prototype.exitGame = function () {
        this.exitResolve();
    };

    ThreadManager.prototype.waitExitGameAsync = function () {
        return this.exitPromise;
    };
    return ThreadManager;
})();
exports.ThreadManager = ThreadManager;
//# sourceMappingURL=thread.js.map
},
"src/hle/module/ExceptionManagerForKernel": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var ExceptionManagerForKernel = (function () {
    function ExceptionManagerForKernel(context) {
        this.context = context;
        this.sceKernelRegisterDefaultExceptionHandler = createNativeFunction(0x565C0B0E, 150, 'uint', 'uint', this, function (exceptionHandlerFunction) {
            return 0;
        });
    }
    return ExceptionManagerForKernel;
})();
exports.ExceptionManagerForKernel = ExceptionManagerForKernel;
//# sourceMappingURL=ExceptionManagerForKernel.js.map
},
"src/hle/module/InterruptManager": function(module, exports, require) {
var _utils = require('../utils');

var _interrupt = require('../../core/interrupt');

var PspInterrupts = _interrupt.PspInterrupts;
var createNativeFunction = _utils.createNativeFunction;

var InterruptManager = (function () {
    function InterruptManager(context) {
        var _this = this;
        this.context = context;
        this.sceKernelRegisterSubIntrHandler = createNativeFunction(0xCA04A2B9, 150, 'uint', 'Thread/int/int/uint/uint', this, function (thread, interrupt, handlerIndex, callbackAddress, callbackArgument) {
            var interruptManager = _this.context.interruptManager;
            var interruptHandler = interruptManager.get(interrupt).get(handlerIndex);
            interruptHandler.address = callbackAddress;
            interruptHandler.argument = callbackArgument;
            interruptHandler.cpuState = thread.state;
            return 0;
        });
        this.sceKernelEnableSubIntr = createNativeFunction(0xFB8E22EC, 150, 'uint', 'int/int', this, function (interrupt, handlerIndex) {
            var interruptManager = _this.context.interruptManager;

            if (interrupt >= 67 /* PSP_NUMBER_INTERRUPTS */)
                return -1;
            if (!interruptManager.get(interrupt).has(handlerIndex))
                return -1;

            interruptManager.get(interrupt).get(handlerIndex).enabled = true;
            return 0;
        });
        this.sceKernelReleaseSubIntrHandler = createNativeFunction(0xD61E6961, 150, 'uint', 'int/int', this, function (pspInterrupt, handlerIndex) {
            var interruptManager = _this.context.interruptManager;

            if (pspInterrupt >= 67 /* PSP_NUMBER_INTERRUPTS */)
                return -1;
            if (!interruptManager.get(pspInterrupt).has(handlerIndex))
                return -1;

            interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
            return 0;
        });
        this.context.display.vblank.add(function () {
            //this.context.callbackManager.notify(
        });
    }
    return InterruptManager;
})();
exports.InterruptManager = InterruptManager;
//# sourceMappingURL=InterruptManager.js.map
},
"src/hle/module/KDebugForKernel": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var KDebugForKernel = (function () {
    function KDebugForKernel(context) {
        this.context = context;
        this.Kprintf = createNativeFunction(0x84F370BC, 150, 'void', 'string', this, function (format) {
            console.info('Kprintf: ' + format);
        });
    }
    return KDebugForKernel;
})();
exports.KDebugForKernel = KDebugForKernel;
//# sourceMappingURL=KDebugForKernel.js.map
},
"src/hle/module/Kernel_Library": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var Kernel_Library = (function () {
    function Kernel_Library(context) {
        var _this = this;
        this.context = context;
        this.sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, function () {
            return _this.context.interruptManager.suspend();
        });
        this.sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', 'uint', this, function (flags) {
            _this.context.interruptManager.resume(flags);
            return 0;
        });
        this.sceKernelMemset = createNativeFunction(0xA089ECA4, 150, 'uint', 'uint/int/int', this, function (address, value, size) {
            _this.context.memory.memset(address, value, size);
            return address;
        });
        this.sceKernelMemcpy = createNativeFunction(0x1839852A, 150, 'uint', 'uint/uint/int', this, function (dst, src, size) {
            _this.context.memory.copy(src, dst, size);
            return dst;
        });
    }
    return Kernel_Library;
})();
exports.Kernel_Library = Kernel_Library;
//# sourceMappingURL=Kernel_Library.js.map
},
"src/hle/module/LoadCoreForKernel": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var LoadCoreForKernel = (function () {
    function LoadCoreForKernel(context) {
        var _this = this;
        this.context = context;
        this.sceKernelIcacheClearAll = createNativeFunction(0xD8779AC6, 150, 'void', '', this, function () {
            _this.context.instructionCache.invalidateAll();
        });
        this.sceKernelFindModuleByUID = createNativeFunction(0xCCE4A157, 150, 'int', 'int', this, function (moduleID) {
            console.warn('Not implemented sceKernelFindModuleByUID(' + moduleID + ')');
            return 0;
        });
    }
    return LoadCoreForKernel;
})();
exports.LoadCoreForKernel = LoadCoreForKernel;
//# sourceMappingURL=LoadCoreForKernel.js.map
},
"src/hle/module/LoadExecForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var LoadExecForUser = (function () {
    function LoadExecForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelExitGame = createNativeFunction(0xBD2F1094, 150, 'uint', 'Thread', this, function (thread) {
            console.info('sceKernelExitGame');
            thread.stop();
            _this.context.threadManager.exitGame();
            throw (new CpuBreakException());
            return 0;
        });
        this.sceKernelExitGame2 = createNativeFunction(0x05572A5F, 150, 'uint', 'Thread', this, function (thread) {
            console.info("Call stack:");
            thread.state.printCallstack(_this.context.symbolLookup);

            //this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
            console.info('sceKernelExitGame2');
            _this.context.threadManager.exitGame();
            thread.stop();
            throw (new CpuBreakException());
        });
        this.sceKernelRegisterExitCallback = createNativeFunction(0x4AC57943, 150, 'uint', 'int', this, function (callbackId) {
            //console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
            return 0;
        });
    }
    return LoadExecForUser;
})();
exports.LoadExecForUser = LoadExecForUser;
//# sourceMappingURL=LoadExecForUser.js.map
},
"src/hle/module/ModuleMgrForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var ModuleMgrForUser = (function () {
    function ModuleMgrForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelStopModule = createNativeFunction(0xD1FF982A, 150, 'uint', '', this, function () {
            return 0;
        });
        this.sceKernelUnloadModule = createNativeFunction(0x2E0911AA, 150, 'uint', 'int', this, function (id) {
            return 0;
        });
        this.sceKernelSelfStopUnloadModule = createNativeFunction(0xD675EBB8, 150, 'uint', 'Thread/int/int/int', this, function (thread, unknown, argsize, argp) {
            console.info("Call stack:");
            thread.state.printCallstack(_this.context.symbolLookup);

            //this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
            throw (new Error("sceKernelSelfStopUnloadModule"));
            return 0;
        });
        this.sceKernelLoadModule = createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, function (path, flags, sceKernelLMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule("%s", %d)', path, flags));
            return 0x08900000;
        });
        this.sceKernelStartModule = createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, function (moduleId, argumentSize, argumentPointer, status, sceKernelSMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
            return 0;
        });
        this.sceKernelGetModuleIdByAddress = createNativeFunction(0xD8B73127, 150, 'uint', 'uint', this, function (address) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
            return 3;
        });
        this.sceKernelGetModuleId = createNativeFunction(0xF0A26395, 150, 'uint', '', this, function () {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleId()'));
            return 4;
        });
        this.sceKernelLoadModuleByID = createNativeFunction(0xB7F46618, 150, 'uint', 'uint/uint/void*', this, function (fileId, flags, sceKernelLMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModuleByID(%d, %08X)', fileId, flags));
            return 0;
        });
    }
    return ModuleMgrForUser;
})();
exports.ModuleMgrForUser = ModuleMgrForUser;
//# sourceMappingURL=ModuleMgrForUser.js.map
},
"src/hle/module/StdioForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var StdioForUser = (function () {
    function StdioForUser(context) {
        this.context = context;
        this.sceKernelStdin = createNativeFunction(0x172D316E, 150, 'int', '', this, function () {
            return 0;
        });
        this.sceKernelStdout = createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, function () {
            return 1;
        });
        this.sceKernelStderr = createNativeFunction(0xF78BA90A, 150, 'int', '', this, function () {
            return 2;
        });
    }
    return StdioForUser;
})();
exports.StdioForUser = StdioForUser;
//# sourceMappingURL=StdioForUser.js.map
},
"src/hle/module/SysMemUserForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var SysMemUserForUser = (function () {
    function SysMemUserForUser(context) {
        var _this = this;
        this.context = context;
        this.partitionUids = new UidCollection(1);
        this.blockUids = new UidCollection(1);
        this.sceKernelAllocPartitionMemory = createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, function (partitionId, name, anchor, size, address) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;

            try  {
                var parentPartition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
                var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
                console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:'%s', type:%d, size:%d, address:%08X) : %08X-%08X", partitionId, name, anchor, size, address, allocatedPartition.low, allocatedPartition.high));
                return _this.partitionUids.allocate(allocatedPartition);
            } catch (e) {
                console.error(e);
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            }
        });
        this.AllocMemoryBlock = createNativeFunction(0xFE707FDF, 150, 'int', 'string/uint/uint/void*', this, function (name, type, size, paramsAddrPtr) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;
            if (type < 0 || type > 1)
                return 2147614936 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE */;
            if (size == 0)
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            if (paramsAddrPtr) {
                var size = paramsAddrPtr.readInt32();
                var unk = paramsAddrPtr.readInt32();
                if (size != 4)
                    return 2147614930 /* ERROR_KERNEL_ILLEGAL_ARGUMENT */;
            }
            var parentPartition = _this.context.memoryManager.userPartition;
            try  {
                var block = parentPartition.allocate(size, type, 0, name);
                return _this.blockUids.allocate(block);
            } catch (e) {
                console.error(e);
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            }
        });
        this.GetMemoryBlockAddr = createNativeFunction(0xDB83A952, 150, 'int', 'int', this, function (blockId) {
            if (!_this.blockUids.has(blockId))
                return 0;
            var block = _this.blockUids.get(blockId);
            return block.low;
        });
        this.FreeMemoryBlock = createNativeFunction(0x50F61D8A, 150, 'int', 'int', this, function (blockId) {
            if (!_this.blockUids.has(blockId))
                return 2147614923 /* ERROR_KERNEL_UNKNOWN_UID */;
            _this.blockUids.remove(blockId);
            return 0;
        });
        this.sceKernelFreePartitionMemory = createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, function (partitionId) {
            if (!_this.partitionUids.has(partitionId))
                return 2147615158 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK */;
            var partition = _this.partitionUids.get(partitionId);
            partition.deallocate();
            _this.partitionUids.remove(partitionId);
            return 0;
        });
        this.sceKernelTotalFreeMemSize = createNativeFunction(0xF919F628, 150, 'int', '', this, function () {
            return _this.context.memoryManager.userPartition.getTotalFreeMemory() - 0x8000;
        });
        this.sceKernelGetBlockHeadAddr = createNativeFunction(0x9D9A5BA1, 150, 'uint', 'int', this, function (partitionId) {
            if (!_this.partitionUids.has(partitionId))
                return 2147615158 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK */;
            var block = _this.partitionUids.get(partitionId);
            return block.low;
        });
        /**
        * Get the size of the largest free memory block.
        */
        this.sceKernelMaxFreeMemSize = createNativeFunction(0xA291F107, 150, 'int', '', this, function () {
            return _this.context.memoryManager.userPartition.nonAllocatedPartitions.max(function (partition) {
                return partition.size;
            }).size;
        });
        this.sceKernelSetCompiledSdkVersion = createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, function (sdkVersion) {
            console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
        });
        this.sceKernelSetCompilerVersion = createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, function (version) {
            console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
        });
        this.sceKernelPrintf = createNativeFunction(0x13A5ABEF, 150, 'void', 'Thread/string', this, function (thread, format) {
            var gprIndex = 5;
            var memory = _this.context.memory;
            var gpr = thread.state.gpr;

            var readParam = function (type) {
                switch (type) {
                    case '%s':
                        return memory.readStringz(gpr[gprIndex++]);
                    case '%d':
                        return String(gpr[gprIndex++]);
                }
                return '??[' + type + ']??';
            };
            console.info('sceKernelPrintf: ' + format.replace(/%[dsux]/g, function (data) {
                return readParam(data);
            }));
            //console.warn(this.context.memory.readStringz(thread.state.gpr[5]));
        });
    }
    return SysMemUserForUser;
})();
exports.SysMemUserForUser = SysMemUserForUser;
//# sourceMappingURL=SysMemUserForUser.js.map
},
"src/hle/module/UtilsForKernel": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var UtilsForKernel = (function () {
    function UtilsForKernel(context) {
        var _this = this;
        this.context = context;
        this.sceKernelIcacheInvalidateRange = createNativeFunction(0xC2DF770E, 150, 'void', 'uint/uint', this, function (address, size) {
            _this.context.instructionCache.invalidateRange(address, address + size);
        });
    }
    return UtilsForKernel;
})();
exports.UtilsForKernel = UtilsForKernel;
//# sourceMappingURL=UtilsForKernel.js.map
},
"src/hle/module/UtilsForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var UtilsForUser = (function () {
    function UtilsForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelLibcClock = createNativeFunction(0x91E4F6A7, 150, 'uint', '', this, function () {
            return _this.context.rtc.getClockMicroseconds();
        });
        this.sceKernelLibcTime = createNativeFunction(0x27CC57F0, 150, 'uint', 'void*', this, function (pointer) {
            //console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
            if (pointer == Stream.INVALID)
                return 0;

            var result = (_this.context.rtc.getCurrentUnixSeconds()) | 0;
            if (pointer)
                pointer.writeInt32(result);
            return result;
        });
        this.sceKernelGetGPI = createNativeFunction(0x37FB5C42, 150, 'uint', '', this, function () {
            return 0;
        });
        this.sceKernelUtilsMt19937Init = createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, function (memory, contextPtr, seed) {
            console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
            return 0;
        });
        this.sceKernelUtilsMt19937UInt = createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, function (memory, contextPtr) {
            return Math.round(Math.random() * 0xFFFFFFFF);
        });
        this.sceKernelLibcGettimeofday = createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, function (timevalPtr, timezonePtr) {
            if (timevalPtr) {
                var totalMilliseconds = Date.now();
                var totalSeconds = Math.floor(totalMilliseconds / 1000);
                var milliseconds = Math.floor(totalMilliseconds % 1000);
                var microseconds = milliseconds * 1000;
                timevalPtr.writeInt32(totalSeconds);
                timevalPtr.writeInt32(microseconds);
            }

            if (timezonePtr) {
                var minutesWest = 0;
                var dstTime = 0;
                timevalPtr.writeInt32(minutesWest);
                timevalPtr.writeInt32(dstTime);
            }

            return 0;
        });
        this.sceKernelDcacheWritebackInvalidateRange = createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147483907 /* ERROR_INVALID_POINTER */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheInvalidateRange = createNativeFunction(0xBFA98062, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (!MathUtils.isAlignedTo(size, 4))
                return 2147615820 /* ERROR_KERNEL_NOT_CACHE_ALIGNED */;

            //if (!this.context.memory.isValidAddress(pointer + size)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147614931 /* ERROR_KERNEL_ILLEGAL_ADDR */;
            if (!MathUtils.isAlignedTo(pointer, 4))
                return 2147615820 /* ERROR_KERNEL_NOT_CACHE_ALIGNED */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheWritebackRange = createNativeFunction(0x3EE30821, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147483907 /* ERROR_INVALID_POINTER */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheWritebackAll = createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, function () {
            _this.context.memory.invalidateDataRange.dispatch({ start: 0, end: 0xFFFFFFFF });
            return 0;
        });
        this.sceKernelDcacheWritebackInvalidateAll = createNativeFunction(0xB435DEC5, 150, 'uint', '', this, function () {
            _this.context.memory.invalidateDataRange.dispatch({ start: 0, end: 0xFFFFFFFF });
            return 0;
        });
    }
    return UtilsForUser;
})();
exports.UtilsForUser = UtilsForUser;
//# sourceMappingURL=UtilsForUser.js.map
},
"src/hle/module/iofilemgr/IoFileMgrForUser": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;
var _vfs = require('../../vfs');
var _structs = require('../../structs');
var SceKernelErrors = require('../../SceKernelErrors');

var _manager = require('../../manager');
_manager.Thread;
var Thread = _manager.Thread;

var FileOpenFlags = _vfs.FileOpenFlags;

var IoFileMgrForUser = (function () {
    function IoFileMgrForUser(context) {
        var _this = this;
        this.context = context;
        this.sceIoDevctl = createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, function (deviceName, command, inputPointer, inputLength, outputPointer, outputLength) {
            var input = _this.context.memory.getPointerStream(inputPointer, inputLength);
            var output = _this.context.memory.getPointerStream(outputPointer, outputLength);

            return _this.context.fileManager.devctlAsync(deviceName, command, input, output);
        });
        this.fileUids = new UidCollection(3);
        this.directoryUids = new UidCollection(1);
        this.sceIoOpen = createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
            return _this._sceIoOpenAsync(filename, flags, mode).then(function (result) {
                var str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
                if (result == 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */) {
                    console.error(str, result);
                } else {
                    console.info(str, result);
                }
                return result;
            });
        });
        this.sceIoOpenAsync = createNativeFunction(0x89AA9906, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
            console.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));

            //if (filename == '') return Promise.resolve(0);
            return _this._sceIoOpenAsync(filename, flags, mode).then(function (fileId) {
                var file = _this.getFileById(fileId);
                file.setAsyncOperation(Promise.resolve(Integer64.fromNumber(fileId)));
                console.info('-->', fileId);
                return fileId;
            });
        });
        this.sceIoCloseAsync = createNativeFunction(0xFF5940B6, 150, 'int', 'int', this, function (fileId) {
            console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoCloseAsync(%d)', fileId));

            //if (filename == '') return Promise.resolve(0);
            var file = _this.getFileById(fileId);
            if (file)
                file.close();

            //file.setAsyncOperation(Promise.resolve(Integer64.fromInt(fileId)));
            file.setAsyncOperation(Promise.resolve(Integer64.fromInt(0)));

            return 0;
        });
        this.sceIoAssign = createNativeFunction(0xB2A628C1, 150, 'int', 'string/string/string/int/void*/long', this, function (device1, device2, device3, mode, unk1Ptr, unk2) {
            // IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
            console.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
            return 0;
        });
        this.sceIoClose = createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, function (fileId) {
            var file = _this.getFileById(fileId);
            if (file)
                file.close();

            console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoClose(%d)', fileId));

            _this.fileUids.remove(fileId);

            return 0;
        });
        this.sceIoWrite = createNativeFunction(0x42EC03AC, 150, 'int', 'int/byte[]', this, function (fileId, input) {
            if (fileId < 3) {
                // @TODO: Fixme! Create a proper file
                console.log('STD[' + fileId + ']', input.readString(input.length));
                return 0;
            } else {
                var file = _this.getFileById(fileId);

                return file.entry.writeChunkAsync(file.cursor, input.toArrayBuffer()).then(function (writtenCount) {
                    console.info('sceIoWrite', 'file.cursor', file.cursor, 'input.length:', input.length, 'writtenCount:', writtenCount);
                    file.cursor += writtenCount;
                    return writtenCount;
                }).catch(function (e) {
                    console.error(e);
                    return 2147614721 /* ERROR_ERROR */;
                });
            }
        });
        this.sceIoRead = createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, function (fileId, outputPointer, outputLength) {
            var file = _this.getFileById(fileId);

            return file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                file.cursor += readedData.byteLength;

                //console.log(new Uint8Array(readedData));
                _this.context.memory.writeBytes(outputPointer, readedData);

                //console.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
                return readedData.byteLength;
            });
        });
        this.sceIoReadAsync = createNativeFunction(0xA0B5A7C2, 150, 'int', 'int/uint/int', this, function (fileId, outputPointer, outputLength) {
            var file = _this.getFileById(fileId);

            file.setAsyncOperation(file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                //console.log('sceIoReadAsync', file, fileId, outputLength, readedData.byteLength, new Uint8Array(readedData));
                file.cursor += readedData.byteLength;
                _this.context.memory.writeBytes(outputPointer, readedData);
                return Integer64.fromNumber(readedData.byteLength);
            }));

            return 0;
        });
        this.sceIoWaitAsync = createNativeFunction(0xE23EEC33, 150, 'int', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            return _this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
        });
        this.sceIoWaitAsyncCB = createNativeFunction(0x35DBD746, 150, 'int', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            return _this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
        });
        this.sceIoPollAsync = createNativeFunction(0x3251EA56, 150, 'uint', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            console.info('sceIoPollAsync', fileId);
            var file = _this.getFileById(fileId);

            if (file.asyncResult) {
                //return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
                //console.log('resolved -> ', file.asyncResult.number);
                resultPointer.writeInt64(file.asyncResult);
                return 0;
            } else {
                //console.log('not resolved');
                resultPointer.writeInt64(Integer64.fromInt(0));
                return 1;
            }
        });
        this.sceIoGetstat = createNativeFunction(0xACE946E8, 150, 'int', 'string/void*', this, function (fileName, sceIoStatPointer) {
            if (sceIoStatPointer) {
                sceIoStatPointer.position = 0;
                _structs.SceIoStat.struct.write(sceIoStatPointer, new _structs.SceIoStat());
            }

            try  {
                return _this.context.fileManager.getStatAsync(fileName).then(function (stat) {
                    var stat2 = _this._vfsStatToSceIoStat(stat);
                    console.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
                    if (sceIoStatPointer) {
                        sceIoStatPointer.position = 0;
                        _structs.SceIoStat.struct.write(sceIoStatPointer, stat2);
                    }
                    return 0;
                }).catch(function (error) {
                    return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
                });
            } catch (e) {
                console.error(e);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            }
        });
        this.sceIoChdir = createNativeFunction(0x55F4717D, 150, 'int', 'string', this, function (path) {
            console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
            try  {
                _this.context.fileManager.chdir(path);
                return 0;
            } catch (e) {
                console.error(e);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            }
        });
        /*
        [HlePspFunction(NID = 0x71B19E77, FirmwareVersion = 150)]
        public int sceIoLseekAsync(SceUID FileId, long Offset, SeekAnchor Whence)
        {
        var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
        File.AsyncLastResult = sceIoLseek(FileId, Offset, Whence);
        _DelayIo(IoDelayType.Seek);
        return 0;
        }
        */
        this.sceIoLseekAsync = createNativeFunction(0x71B19E77, 150, 'int', 'int/long/int', this, function (fileId, offset, whence) {
            //var file = this.getFileById(fileId);
            var file = _this.getFileById(fileId);
            var result = _this._seek(fileId, offset.getNumber(), whence);
            file.setAsyncOperation(Promise.resolve(Integer64.fromNumber(result)));
            return 0;
        });
        this.sceIoLseek = createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, function (fileId, offset, whence) {
            var result = _this._seek(fileId, offset.getNumber(), whence);

            //console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
            return Integer64.fromNumber(result);
        });
        this.sceIoLseek32 = createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, function (fileId, offset, whence) {
            var result = _this._seek(fileId, offset, whence);

            //console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
            return result;
        });
        this.sceIoMkdir = createNativeFunction(0x06A70004, 150, 'uint', 'string/int', this, function (path, accessMode) {
            console.warn('Not implemented: sceIoMkdir("' + path + '", ' + accessMode.toString(8) + ')');
            return 0;
        });
        this.sceIoDopen = createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, function (path) {
            console.log('sceIoDopen("' + path + '")');
            return _this.context.fileManager.openDirectoryAsync(path).then(function (directory) {
                console.log('opened directory "' + path + '"');
                return _this.directoryUids.allocate(directory);
            }).catch(function (error) {
                console.error(error);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            });
        });
        this.sceIoDclose = createNativeFunction(0xEB092469, 150, 'uint', 'int', this, function (fileId) {
            if (!_this.directoryUids.has(fileId))
                return -1;
            _this.directoryUids.get(fileId).close();
            _this.directoryUids.remove(fileId);
            return 0;
        });
        this.sceIoDread = createNativeFunction(0xE3EB004C, 150, 'int', 'int/void*', this, function (fileId, hleIoDirentPtr) {
            if (!_this.directoryUids.has(fileId))
                return -1;
            var directory = _this.directoryUids.get(fileId);
            if (directory.left > 0) {
                var stat = directory.read();
                var hleIoDirent = new _structs.HleIoDirent();
                hleIoDirent.name = stat.name;
                hleIoDirent.stat = _this._vfsStatToSceIoStat(stat);
                hleIoDirent.privateData = 0;
                _structs.HleIoDirent.struct.write(hleIoDirentPtr, hleIoDirent);
            }
            return directory.left;
        });
    }
    IoFileMgrForUser.prototype.getFileById = function (id) {
        if (!this.fileUids.has(id))
            throw (new SceKernelException(2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */));
        return this.fileUids.get(id);
    };

    IoFileMgrForUser.prototype._sceIoOpenAsync = function (filename, flags, mode) {
        var _this = this;
        return this.context.fileManager.openAsync(filename, flags, mode).then(function (file) {
            return _this.fileUids.allocate(file);
        }).catch(function (e) {
            console.error('Not found', filename, e);
            return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
        });
    };

    IoFileMgrForUser.prototype._sceIoWaitAsyncCB = function (thread, fileId, resultPointer) {
        console.info('_sceIoWaitAsyncCB', fileId);
        thread.state.LO = fileId;

        if (this.fileUids.has(fileId))
            return Promise.resolve(2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */);

        var file = this.getFileById(fileId);

        if (file.asyncOperation) {
            return file.asyncOperation.then(function (result) {
                resultPointer.writeInt64(result);
                return 0;
            });
        } else {
            resultPointer.writeInt64(Integer64.fromNumber(0));
            return Promise.resolve(1);
        }
    };

    /*
    [HlePspFunction(NID = 0xA0B5A7C2, FirmwareVersion = 150)]
    public int sceIoReadAsync(SceUID FileId, byte * OutputPointer, int OutputSize)
    {
    var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
    File.AsyncLastResult = sceIoRead(FileId, OutputPointer, OutputSize);
    
    _DelayIo(IoDelayType.Read, OutputSize);
    
    return 0;
    }
    */
    IoFileMgrForUser.prototype._vfsStatToSceIoStat = function (stat) {
        var stat2 = new _structs.SceIoStat();

        //stat2.mode = <_structs.SceMode>parseInt('777', 8)
        stat2.mode = 0;
        stat2.size = stat.size;
        stat2.timeCreation = _structs.ScePspDateTime.fromDate(stat.timeCreation);
        stat2.timeLastAccess = _structs.ScePspDateTime.fromDate(stat.timeLastAccess);
        stat2.timeLastModification = _structs.ScePspDateTime.fromDate(stat.timeLastModification);
        stat2.deviceDependentData[0] = stat.dependentData0 || 0;
        stat2.deviceDependentData[1] = stat.dependentData1 || 0;

        stat2.attributes = 0;
        if (stat.isDirectory) {
            stat2.mode = 0x1000; // Directory
            stat2.attributes |= 16 /* Directory */;
            stat2.attributes |= 4 /* CanRead */;
        } else {
            stat2.mode = 0x2000; // File
            stat2.attributes |= 32 /* File */;
            stat2.attributes |= 1 /* CanExecute */;
            stat2.attributes |= 4 /* CanRead */;
            stat2.attributes |= 2 /* CanWrite */;
        }
        return stat2;
    };

    IoFileMgrForUser.prototype._seek = function (fileId, offset, whence) {
        var file = this.getFileById(fileId);
        switch (whence) {
            case 0 /* Set */:
                file.cursor = 0 + offset;
                break;
            case 1 /* Cursor */:
                file.cursor = file.cursor + offset;
                break;
            case 2 /* End */:
                file.cursor = file.entry.size + offset;
                break;
        }
        return file.cursor;
    };
    return IoFileMgrForUser;
})();
exports.IoFileMgrForUser = IoFileMgrForUser;
//# sourceMappingURL=IoFileMgrForUser.js.map
},
"src/hle/module/sceAtrac3plus": function(module, exports, require) {
var _utils = require('../utils');
var SceKernelErrors = require('../SceKernelErrors');

var _riff = require('../../format/riff');
_riff.Riff;
var Riff = _riff.Riff;
var createNativeFunction = _utils.createNativeFunction;

var sceAtrac3plus = (function () {
    function sceAtrac3plus(context) {
        var _this = this;
        this.context = context;
        this._atrac3Ids = new UidCollection();
        this.sceAtracSetDataAndGetID = createNativeFunction(0x7A20E7AF, 150, 'uint', 'byte[]', this, function (data) {
            return _this._atrac3Ids.allocate(Atrac3.fromStream(data));
        });
        this.sceAtracGetSecondBufferInfo = createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, function (id, puiPosition, puiDataByte) {
            var atrac3 = _this.getById(id);
            puiPosition.writeInt32(0);
            puiDataByte.writeInt32(0);
            return 2153971746 /* ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED */;
        });
        this.sceAtracSetSecondBuffer = createNativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint', this, function (id, pucSecondBufferAddr, uiSecondBufferByte) {
            //throw (new Error("Not implemented sceAtracSetSecondBuffer"));
            return 0;
        });
        this.sceAtracReleaseAtracID = createNativeFunction(0x61EB33F5, 150, 'uint', 'int', this, function (id) {
            _this._atrac3Ids.remove(id);
            return 0;
        });
        this.sceAtracDecodeData = createNativeFunction(0x6A8C3CD5, 150, 'uint', 'int/void*/void*/void*/void*', this, function (id, samplesOutPtr, decodedSamplesCountPtr, reachedEndPtr, remainingFramesToDecodePtr) {
            var atrac3 = _this.getById(id);

            return atrac3.decodeAsync(samplesOutPtr).then(function (decodedSamples) {
                var reachedEnd = 0;
                var remainingFramesToDecode = atrac3.remainingFrames;

                function outputPointers() {
                    if (reachedEndPtr)
                        reachedEndPtr.writeInt32(reachedEnd);
                    if (decodedSamplesCountPtr)
                        decodedSamplesCountPtr.writeInt32(decodedSamples / atrac3.format.atracChannels);
                    if (remainingFramesToDecodePtr)
                        remainingFramesToDecodePtr.writeInt32(remainingFramesToDecode);
                }

                //Console.WriteLine("{0}/{1} -> {2} : {3}", Atrac.DecodingOffsetInSamples, Atrac.TotalSamples, DecodedSamples, Atrac.DecodingReachedEnd);
                if (atrac3.decodingReachedEnd) {
                    if (atrac3.numberOfLoops == 0) {
                        //if (true) {
                        decodedSamples = 0;
                        reachedEnd = 1;
                        remainingFramesToDecode = 0;
                        outputPointers();
                        return 2153971748 /* ERROR_ATRAC_ALL_DATA_DECODED */;
                    }
                    if (atrac3.numberOfLoops > 0)
                        atrac3.numberOfLoops--;

                    atrac3.currentSample = (atrac3.loopInfoList.length > 0) ? atrac3.loopInfoList[0].startSample : 0;
                }

                //return Atrac.GetUidIndex(InjectContext);
                outputPointers();
                return 0;
            });
        });
        /**
        * Gets the remaining (not decoded) number of frames
        * Pointer to a integer that receives either -1 if all at3 data is already on memory,
        * or the remaining (not decoded yet) frames at memory if not all at3 data is on memory
        * @return Less than 0 on error, otherwise 0
        */
        this.sceAtracGetRemainFrame = createNativeFunction(0x9AE849A7, 150, 'uint', 'int/void*', this, function (id, remainFramePtr) {
            var atrac3 = _this.getById(id);
            if (remainFramePtr)
                remainFramePtr.writeInt32(atrac3.remainingFrames);
            return 0;
        });
        this.sceAtracGetBitrate = createNativeFunction(0xA554A158, 150, 'uint', 'int/void*', this, function (id, bitratePtr) {
            var atrac3 = _this.getById(id);
            bitratePtr.writeInt32(atrac3.bitrate);
            return 0;
        });
        this.sceAtracGetChannel = createNativeFunction(0x31668baa, 150, 'uint', 'int/void*', this, function (id, channelsPtr) {
            var atrac3 = _this.getById(id);
            channelsPtr.writeInt32(atrac3.format.atracChannels);
            return 0;
        });
        this.sceAtracGetMaxSample = createNativeFunction(0xD6A5F2F7, 150, 'uint', 'int/void*', this, function (id, maxNumberOfSamplesPtr) {
            var atrac3 = _this.getById(id);
            maxNumberOfSamplesPtr.writeInt32(atrac3.maximumSamples);
            return 0;
        });
        this.sceAtracGetNextSample = createNativeFunction(0x36FAABFB, 150, 'uint', 'int/void*', this, function (id, numberOfSamplesInNextFramePtr) {
            var atrac3 = _this.getById(id);

            numberOfSamplesInNextFramePtr.writeInt32(atrac3.getNumberOfSamplesInNextFrame());
            return 0;
        });
        this.sceAtracGetAtracID = createNativeFunction(0x780F88D1, 150, 'uint', 'int', this, function (codecType) {
            if (codecType != 4097 /* PSP_MODE_AT_3 */ && codecType != 4096 /* PSP_MODE_AT_3_PLUS */) {
                return 2153971716 /* ATRAC_ERROR_INVALID_CODECTYPE */;
            }

            return _this._atrac3Ids.allocate(new Atrac3(-1));
        });
        this.sceAtracAddStreamData = createNativeFunction(0x7DB31251, 150, 'uint', 'int/int', this, function (id, bytesToAdd) {
            var atrac3 = _this.getById(id);

            //console.warn("Not implemented sceAtracAddStreamData", id, bytesToAdd, atrac3);
            //throw (new Error("Not implemented sceAtracAddStreamData"));
            //return -1;
            return 0;
        });
        this.sceAtracGetStreamDataInfo = createNativeFunction(0x5D268707, 150, 'uint', 'int/void*/void*/void*', this, function (id, writePointerPointer, availableBytesPtr, readOffsetPtr) {
            var atrac3 = _this.getById(id);
            writePointerPointer.writeInt32(0);
            availableBytesPtr.writeInt32(0);
            readOffsetPtr.writeInt32(0);

            //WritePointerPointer = Atrac.PrimaryBuffer.Low; // @FIXME!!
            //AvailableBytes = Atrac.PrimaryBuffer.Size;
            //ReadOffset = Atrac.PrimaryBufferReaded;
            //console.warn("Not implemented sceAtracGetStreamDataInfo");
            //throw (new Error("Not implemented sceAtracGetStreamDataInfo"));
            //return -1;
            return 0;
        });
        this.sceAtracGetNextDecodePosition = createNativeFunction(0xE23E3A35, 150, 'uint', 'int/void*', this, function (id, samplePositionPtr) {
            var atrac3 = _this.getById(id);
            if (atrac3.decodingReachedEnd)
                return 2153971748 /* ERROR_ATRAC_ALL_DATA_DECODED */;
            if (samplePositionPtr)
                samplePositionPtr.writeInt32(atrac3.currentSample);
            return 0;
        });
        this.sceAtracGetSoundSample = createNativeFunction(0xA2BBA8BE, 150, 'uint', 'int/void*/void*/void*', this, function (id, endSamplePtr, loopStartSamplePtr, loopEndSamplePtr) {
            var atrac3 = _this.getById(id);
            var hasLoops = (atrac3.loopInfoList != null) && (atrac3.loopInfoList.length > 0);
            if (endSamplePtr)
                endSamplePtr.writeInt32(atrac3.fact.endSample);

            //if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(hasLoops ? atrac3.LoopInfoList[0].StartSample : -1);
            if (loopStartSamplePtr)
                loopStartSamplePtr.writeInt32(-1);

            //if (loopEndSamplePtr) *LoopEndSamplePointer = hasLoops ? atrac3.LoopInfoList[0].EndSample : -1;
            if (loopEndSamplePtr)
                loopEndSamplePtr.writeInt32(-1);
            return 0;
        });
        this.sceAtracSetLoopNum = createNativeFunction(0x868120B5, 150, 'uint', 'int/int', this, function (id, numberOfLoops) {
            var atrac3 = _this.getById(id);
            atrac3.numberOfLoops = numberOfLoops;
            return 0;
        });
        this.sceAtracGetBufferInfoForReseting = createNativeFunction(0xCA3CA3D2, 150, 'uint', 'int/uint/void*', this, function (id, uiSample, bufferInfoPtr) {
            throw (new Error("Not implemented sceAtracGetBufferInfoForReseting"));
            return 0;
        });
        this.sceAtracResetPlayPosition = createNativeFunction(0x644E5607, 150, 'uint', 'int/uint/uint/uint', this, function (id, uiSample, uiWriteByteFirstBuf, uiWriteByteSecondBuf) {
            throw (new Error("Not implemented sceAtracResetPlayPosition"));
            return 0;
        });
        this.sceAtracGetInternalErrorInfo = createNativeFunction(0xE88F759B, 150, 'uint', 'int/void*', this, function (id, errorResultPtr) {
            throw (new Error("Not implemented sceAtracGetInternalErrorInfo"));
            return 0;
        });
        this.sceAtracGetOutputChannel = createNativeFunction(0xB3B5D042, 150, 'uint', 'int/void*', this, function (id, outputChannelPtr) {
            var atrac3 = _this.getById(id);
            var sceAudioChReserve = _this.context.moduleManager.getByName('sceAudio').getByName('sceAudioChReserve').nativeCall;
            var channel = sceAudioChReserve(-1, atrac3.maximumSamples, 0);
            outputChannelPtr.writeInt32(channel);
            return 0;
        });
    }
    /*
    [HlePspFunction(NID = 0x780F88D1, FirmwareVersion = 150)]
    [HlePspNotImplemented]
    public Atrac sceAtracGetAtracID(CodecType CodecType)
    {
    if (CodecType != CodecType.PSP_MODE_AT_3 && CodecType != CodecType.PSP_MODE_AT_3_PLUS) {
    throw (new SceKernelException(SceKernelErrors.ATRAC_ERROR_INVALID_CODECTYPE));
    }
    
    return TryToAlloc(new Atrac(InjectContext, CodecType));
    }
    */
    sceAtrac3plus.prototype.getById = function (id) {
        if (!this._atrac3Ids.has(id))
            throw (new SceKernelException(2153971715 /* ATRAC_ERROR_NO_ATRACID */));
        return this._atrac3Ids.get(id);
    };
    return sceAtrac3plus;
})();
exports.sceAtrac3plus = sceAtrac3plus;

var Atrac3 = (function () {
    function Atrac3(id) {
        this.id = id;
        this.format = new At3FormatStruct();
        this.fact = new FactStruct();
        this.smpl = new SmplStruct();
        this.loopInfoList = [];
        this.dataStream = Stream.fromArray([]);
        this.numberOfLoops = 0;
        this.currentSample = 0;
        this.codecType = 4096 /* PSP_MODE_AT_3_PLUS */;
    }
    Atrac3.prototype.loadStream = function (data) {
        var _this = this;
        this.atrac3Decoder = new MediaEngine.Atrac3Decoder();

        //debugger;
        Riff.fromStreamWithHandlers(data, {
            'fmt ': function (stream) {
                _this.format = At3FormatStruct.struct.read(stream);
            },
            'fact': function (stream) {
                _this.fact = FactStruct.struct.read(stream);
            },
            'smpl': function (stream) {
                _this.smpl = SmplStruct.struct.read(stream);
                _this.loopInfoList = StructArray(LoopInfoStruct.struct, _this.smpl.loopCount).read(stream);
            },
            'data': function (stream) {
                _this.dataStream = stream;
            }
        });

        this.firstDataChunk = this.dataStream.readBytes(this.format.blockSize).subarray(0);

        //console.log(this.fmt);
        //console.log(this.fact);
        return this;
    };

    Object.defineProperty(Atrac3.prototype, "bitrate", {
        get: function () {
            var _atracBitrate = Math.floor((this.format.bytesPerFrame * 352800) / 1000);
            if (this.codecType == 4096 /* PSP_MODE_AT_3_PLUS */) {
                return ((_atracBitrate >> 11) + 8) & 0xFFFFFFF0;
            } else {
                return (_atracBitrate + 511) >> 10;
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Atrac3.prototype, "maximumSamples", {
        get: function () {
            this.format.compressionCode;
            switch (this.codecType) {
                case 4096 /* PSP_MODE_AT_3_PLUS */:
                    return 0x800;
                case 4097 /* PSP_MODE_AT_3 */:
                    return 0x400;
                default:
                    throw (new Error("Unknown codec type"));
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Atrac3.prototype, "endSample", {
        get: function () {
            return this.fact.endSample;
        },
        enumerable: true,
        configurable: true
    });

    Atrac3.prototype.getNumberOfSamplesInNextFrame = function () {
        return Math.min(this.maximumSamples, this.endSample - this.currentSample);
    };

    Object.defineProperty(Atrac3.prototype, "remainingFrames", {
        get: function () {
            if (this.format.blockSize == 0)
                return -1;
            return (this.dataStream.available / this.format.blockSize);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Atrac3.prototype, "decodingReachedEnd", {
        get: function () {
            return this.remainingFrames <= 0;
        },
        enumerable: true,
        configurable: true
    });

    Atrac3.prototype.decodeAsync = function (samplesOutPtr) {
        if (this.dataStream.available < this.format.blockSize)
            return Promise.resolve(0);
        var blockData = this.dataStream.readBytes(this.format.blockSize);
        this.currentSample++;

        var outPromise;

        if (Atrac3.useWorker) {
            outPromise = WorkerTask.executeAsync(function (id, blockData, firstDataChunk) {
                self['window'] = self;
                if (!self['MediaEngine']) {
                    importScripts('polyfills/promise.js');
                    importScripts('MediaEngine.js');
                    self['MediaEngine'] = MediaEngine;
                }

                var atrac3Decoder = 'atrac3Decoder_' + id;
                if (!self[atrac3Decoder]) {
                    self[atrac3Decoder] = new MediaEngine.Atrac3Decoder();
                    self[atrac3Decoder].initWithHeader(firstDataChunk);
                }
                return self[atrac3Decoder].decode(blockData);
            }, [this.id, blockData, this.firstDataChunk]);
        } else {
            if (this.firstDataChunk) {
                this.atrac3Decoder.initWithHeader(this.firstDataChunk);
            }

            outPromise = Promise.resolve(this.atrac3Decoder.decode(blockData));
        }

        this.firstDataChunk = null;

        return outPromise.then(function (out) {
            for (var n = 0; n < out.length; n++)
                samplesOutPtr.writeInt16(out[n]);
            return out.length;
        });
    };

    Atrac3.fromStream = function (data) {
        return new Atrac3(Atrac3.lastId++).loadStream(data);
    };
    Atrac3.useWorker = true;

    Atrac3.lastId = 0;
    return Atrac3;
})();

var FactStruct = (function () {
    function FactStruct() {
        this.endSample = 0;
        this.sampleOffset = 0;
    }
    FactStruct.struct = StructClass.create(FactStruct, [
        { endSample: Int32 },
        { sampleOffset: Int32 }
    ]);
    return FactStruct;
})();

var SmplStruct = (function () {
    function SmplStruct() {
        this.unknown = [0, 0, 0, 0, 0, 0, 0];
        this.loopCount = 0;
        this.unknown2 = 0;
    }
    SmplStruct.struct = StructClass.create(SmplStruct, [
        { unknown: StructArray(Int32, 7) },
        { loopCount: Int32 },
        { unknown2: Int32 }
    ]);
    return SmplStruct;
})();

var LoopInfoStruct = (function () {
    function LoopInfoStruct() {
        this.cuePointID = 0;
        this.type = 0;
        this.startSample = 0;
        this.endSample = 0;
        this.fraction = 0;
        this.playCount = 0;
    }
    LoopInfoStruct.struct = StructClass.create(LoopInfoStruct, [
        { cuePointID: Int32 },
        { type: Int32 },
        { startSample: Int32 },
        { endSample: Int32 },
        { fraction: Int32 },
        { playCount: Int32 }
    ]);
    return LoopInfoStruct;
})();

var At3FormatStruct = (function () {
    function At3FormatStruct() {
        this.compressionCode = 0;
        this.atracChannels = 0;
        this.bitrate = 0;
        this.averageBytesPerSecond = 0;
        this.blockAlignment = 0;
        this.bytesPerFrame = 0;
        this.unknown = [0, 0, 0, 0];
        this.omaInfo = 0;
        this._unk2 = 0;
        this._blockSize = 0;
    }
    Object.defineProperty(At3FormatStruct.prototype, "blockSize", {
        get: function () {
            return (this._blockSize & 0x3FF) * 8 + 8;
        },
        enumerable: true,
        configurable: true
    });

    At3FormatStruct.struct = StructClass.create(At3FormatStruct, [
        { compressionCode: UInt16 },
        { atracChannels: UInt16 },
        { bitrate: UInt32 },
        { averageBytesPerSecond: UInt16 },
        { blockAlignment: UInt16 },
        { bytesPerFrame: UInt16 },
        { _unk: UInt16 },
        { unknown: StructArray(UInt32, 6) },
        { _unk2: UInt16_b },
        { _blockSize: UInt16_b }
    ]);
    return At3FormatStruct;
})();

var CodecType;
(function (CodecType) {
    CodecType[CodecType["PSP_MODE_AT_3_PLUS"] = 0x00001000] = "PSP_MODE_AT_3_PLUS";
    CodecType[CodecType["PSP_MODE_AT_3"] = 0x00001001] = "PSP_MODE_AT_3";
})(CodecType || (CodecType = {}));
//# sourceMappingURL=sceAtrac3plus.js.map
},
"src/hle/module/sceAudio": function(module, exports, require) {
var _utils = require('../utils');
var SceKernelErrors = require('../SceKernelErrors');

var _audio = require('../../core/audio');
var createNativeFunction = _utils.createNativeFunction;

var sceAudio = (function () {
    function sceAudio(context) {
        var _this = this;
        this.context = context;
        this.channels = [];
        this.sceAudioOutput2Reserve = createNativeFunction(0x01562BA3, 150, 'uint', 'int', this, function (sampleCount) {
            console.warn('sceAudioOutput2Reserve not implemented!');
            return 0;
        });
        this.sceAudioOutput2OutputBlocking = createNativeFunction(0x2D53F36E, 150, 'uint', 'int/void*', this, function (volume, buffer) {
            return waitAsync(10).then(function () {
                return 0;
            });
        });
        this.sceAudioChReserve = createNativeFunction(0x5EC81C55, 150, 'uint', 'int/int/int', this, function (channelId, sampleCount, format) {
            if (channelId >= _this.channels.length)
                return -1;
            if (channelId < 0) {
                channelId = _this.channels.first(function (channel) {
                    return !channel.allocated;
                }).id;
                if (channelId === undefined) {
                    console.warn('Not implemented sceAudio.sceAudioChReserve');
                    return -2;
                }
            }
            var channel = _this.channels[channelId];
            channel.allocated = true;
            channel.sampleCount = sampleCount;
            channel.format = format;

            //console.log(this.context);
            channel.channel = _this.context.audio.createChannel();
            channel.channel.start();
            return channelId;
        });
        this.sceAudioChRelease = createNativeFunction(0x6FC46853, 150, 'uint', 'int', this, function (channelId) {
            var channel = _this.getChannelById(channelId);
            channel.allocated = false;
            channel.channel.stop();
            channel.channel = null;
            return 0;
        });
        this.sceAudioChangeChannelConfig = createNativeFunction(0x95FD0C2D, 150, 'uint', 'int/int', this, function (channelId, format) {
            var channel = _this.getChannelById(channelId);
            channel.format = format;
            return 0;
        });
        this.sceAudioSetChannelDataLen = createNativeFunction(0xCB2E439E, 150, 'uint', 'int/int', this, function (channelId, sampleCount) {
            var channel = _this.getChannelById(channelId);
            channel.sampleCount = sampleCount;
            return 0;
        });
        this.sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
            if (!buffer)
                return -1;
            var channel = _this.getChannelById(channelId);
            return new WaitingThreadInfo('sceAudioOutputPannedBlocking', channel, channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount))), 0 /* NO */);
        });
        this.sceAudioOutputBlocking = createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
            if (!buffer)
                return -1;
            var channel = _this.getChannelById(channelId);
            return channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            //debugger;
            //return new WaitingThreadInfo('sceAudioOutputBlocking', channel, , AcceptCallbacks.NO);
        });
        this.sceAudioOutput = createNativeFunction(0x8C1009B2, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
            var channel = _this.getChannelById(channelId);
            channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            return 0;
        });
        this.sceAudioOutputPanned = createNativeFunction(0xE2D56B2D, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
            var channel = _this.getChannelById(channelId);
            channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            return 0;
        });
        this.sceAudioChangeChannelVolume = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, function (channelId, volumeLeft, volumeRight) {
            console.warn("Not implemented sceAudioChangeChannelVolume");
            return 0;
        });
        this.sceAudioGetChannelRestLen = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int', this, function (channelId) {
            console.warn("Not implemented sceAudioGetChannelRestLen");
            return 0;
        });
        for (var n = 0; n < 8; n++)
            this.channels.push(new Channel(n));
    }
    sceAudio.prototype.isValidChannel = function (channelId) {
        return (channelId >= 0 && channelId < this.channels.length);
    };

    sceAudio.prototype.getChannelById = function (id) {
        if (!this.isValidChannel(id))
            throw (new SceKernelException(2149974019 /* ERROR_AUDIO_INVALID_CHANNEL */));
        return this.channels[id];
    };
    return sceAudio;
})();
exports.sceAudio = sceAudio;

var AudioFormat;
(function (AudioFormat) {
    AudioFormat[AudioFormat["Stereo"] = 0x00] = "Stereo";
    AudioFormat[AudioFormat["Mono"] = 0x10] = "Mono";
})(AudioFormat || (AudioFormat = {}));

var Channel = (function () {
    function Channel(id) {
        this.id = id;
        this.allocated = false;
        this.sampleCount = 44100;
        this.format = 0 /* Stereo */;
    }
    Object.defineProperty(Channel.prototype, "totalSampleCount", {
        get: function () {
            return this.sampleCount * this.numberOfChannels;
            //return this.sampleCount;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Channel.prototype, "numberOfChannels", {
        get: function () {
            return (this.format == 0 /* Stereo */) ? 2 : 1;
        },
        enumerable: true,
        configurable: true
    });
    return Channel;
})();
//# sourceMappingURL=sceAudio.js.map
},
"src/hle/module/sceCtrl": function(module, exports, require) {
var _utils = require('../utils');
var _manager = require('../manager');
_manager.Thread;

var _controller = require('../../core/controller');

var createNativeFunction = _utils.createNativeFunction;

var SceCtrlData = _controller.SceCtrlData;

var sceCtrl = (function () {
    function sceCtrl(context) {
        var _this = this;
        this.context = context;
        this.sceCtrlPeekBufferPositive = createNativeFunction(0x3A622550, 150, 'uint', 'void*/int', this, function (sceCtrlDataPtr, count) {
            for (var n = 0; n < count; n++)
                _controller.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);

            //return waitAsync(1).then(v => count);
            return count;
        });
        this.sceCtrlReadBufferPositive = createNativeFunction(0x1F803938, 150, 'uint', 'Thread/void*/int', this, function (thread, sceCtrlDataPtr, count) {
            for (var n = 0; n < count; n++)
                _controller.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);

            //return Promise.resolve(0);
            return new WaitingThreadInfo('sceCtrlReadBufferPositive', _this.context.display, _this.context.display.waitVblankStartAsync(thread).then(function (v) {
                return count;
            }), 0 /* NO */);
            //return 0;
        });
        this.sceCtrlSetSamplingCycle = createNativeFunction(0x6A2774F3, 150, 'uint', 'int', this, function (samplingCycle) {
            //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
            return 0;
        });
        this.sceCtrlSetSamplingMode = createNativeFunction(0x1F4011E6, 150, 'uint', 'int', this, function (samplingMode) {
            //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
            return 0;
        });
        this.lastLatchData = new SceCtrlData();
        this.sceCtrlReadLatch = createNativeFunction(0x0B588501, 150, 'uint', 'void*', this, function (currentLatchPtr) {
            try  {
                return _this._peekLatch(currentLatchPtr);
            } finally {
                _this.lastLatchData = _this.context.controller.data;
                _this.context.controller.latchSamplingCount = 0;
            }
        });
        this.sceCtrlSetIdleCancelThreshold = createNativeFunction(0xA7144800, 150, 'uint', 'int/int', this, function (idlereset, idleback) {
            return 0;
        });
    }
    sceCtrl.prototype._peekLatch = function (currentLatchPtr) {
        var ButtonsNew = this.context.controller.data.buttons;
        var ButtonsOld = this.lastLatchData.buttons;
        var ButtonsChanged = ButtonsOld ^ ButtonsNew;

        currentLatchPtr.writeInt32(ButtonsNew & ButtonsChanged); // uiMake
        currentLatchPtr.writeInt32(ButtonsOld & ButtonsChanged); // uiBreak
        currentLatchPtr.writeInt32(ButtonsNew); // uiPress
        currentLatchPtr.writeInt32((ButtonsOld & ~ButtonsNew) & ButtonsChanged); // uiRelease

        return this.context.controller.latchSamplingCount;
    };
    return sceCtrl;
})();
exports.sceCtrl = sceCtrl;
//# sourceMappingURL=sceCtrl.js.map
},
"src/hle/module/sceDisplay": function(module, exports, require) {
var _utils = require('../utils');
var _manager = require('../manager');
_manager.Thread;

var _display = require('../../core/display');

var createNativeFunction = _utils.createNativeFunction;

var PspDisplay = _display.PspDisplay;

var Thread = _manager.Thread;

var sceDisplay = (function () {
    function sceDisplay(context) {
        var _this = this;
        this.context = context;
        this.mode = 0;
        this.width = 512;
        this.height = 272;
        this.sceDisplaySetMode = createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, function (mode, width, height) {
            console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
            _this.mode = mode;
            _this.width = width;
            _this.height = height;
            return 0;
        });
        this.sceDisplayGetMode = createNativeFunction(0xDEA197D4, 150, 'uint', 'void*/void*/void*', this, function (modePtr, widthPtr, heightPtr) {
            if (modePtr)
                modePtr.writeInt32(_this.mode);
            if (widthPtr)
                widthPtr.writeInt32(_this.width);
            if (heightPtr)
                heightPtr.writeInt32(_this.height);
            return 0;
        });
        this.sceDisplayWaitVblank = createNativeFunction(0x36CDFADE, 150, 'uint', 'Thread/int', this, function (thread, cycleNum) {
            return _this._waitVblankAsync(thread, 0 /* NO */);
        });
        this.sceDisplayWaitVblankCB = createNativeFunction(0x8EB9EC49, 150, 'uint', 'Thread/int', this, function (thread, cycleNum) {
            return _this._waitVblankAsync(thread, 1 /* YES */);
        });
        this.sceDisplayWaitVblankStart = createNativeFunction(0x984C27E7, 150, 'uint', 'Thread', this, function (thread) {
            return _this._waitVblankStartAsync(thread, 0 /* NO */);
        });
        this.sceDisplayWaitVblankStartCB = createNativeFunction(0x46F186C3, 150, 'uint', 'Thread', this, function (thread) {
            return _this._waitVblankStartAsync(thread, 1 /* YES */);
        });
        this.sceDisplayGetVcount = createNativeFunction(0x9C6EAAD7, 150, 'int', '', this, function () {
            _this.context.display.updateTime();
            return _this.context.display.vblankCount;
        });
        this.sceDisplayGetFramePerSec = createNativeFunction(0xDBA6C4C4, 150, 'float', '', this, function () {
            return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
        });
        this.sceDisplayIsVblank = createNativeFunction(0x4D4E10EC, 150, 'int', '', this, function () {
            return (_this.context.display.secondsLeftForVblank == 0);
        });
        this.sceDisplaySetFrameBuf = createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, function (address, bufferWidth, pixelFormat, sync) {
            _this.context.display.address = address;
            _this.context.display.bufferWidth = bufferWidth;
            _this.context.display.pixelFormat = pixelFormat;
            _this.context.display.sync = sync;
            return 0;
        });
        this.sceDisplayGetFrameBuf = createNativeFunction(0xEEDA2E54, 150, 'uint', 'void*/void*/void*/void*', this, function (topaddrPtr, bufferWidthPtr, pixelFormatPtr, syncPtr) {
            if (topaddrPtr)
                topaddrPtr.writeInt32(_this.context.display.address);
            if (bufferWidthPtr)
                bufferWidthPtr.writeInt32(_this.context.display.bufferWidth);
            if (pixelFormatPtr)
                pixelFormatPtr.writeInt32(_this.context.display.pixelFormat);
            if (syncPtr)
                syncPtr.writeInt32(_this.context.display.sync);
            return 0;
        });
        this.sceDisplayGetCurrentHcount = createNativeFunction(0x773DD3A3, 150, 'uint', '', this, function () {
            _this.context.display.updateTime();
            return _this.context.display.hcountTotal;
        });
    }
    sceDisplay.prototype._waitVblankAsync = function (thread, acceptCallbacks) {
        this.context.display.updateTime();
        return new WaitingThreadInfo('_waitVblankAsync', this.context.display, this.context.display.waitVblankAsync(thread), acceptCallbacks);
    };

    sceDisplay.prototype._waitVblankStartAsync = function (thread, acceptCallbacks) {
        this.context.display.updateTime();
        return new WaitingThreadInfo('_waitVblankStartAsync', this.context.display, this.context.display.waitVblankStartAsync(thread), acceptCallbacks);
    };
    return sceDisplay;
})();
exports.sceDisplay = sceDisplay;
//# sourceMappingURL=sceDisplay.js.map
},
"src/hle/module/sceDmac": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var sceDmac = (function () {
    function sceDmac(context) {
        var _this = this;
        this.context = context;
        this.sceDmacMemcpy = createNativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
            return _this._sceDmacMemcpy(destination, source, size);
        });
        this.sceDmacTryMemcpy = createNativeFunction(0xD97F94D8, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
            return _this._sceDmacMemcpy(destination, source, size);
        });
    }
    sceDmac.prototype._sceDmacMemcpy = function (destination, source, size) {
        if (size == 0)
            return 2147483908 /* ERROR_INVALID_SIZE */;
        if (destination == 0)
            return 2147483907 /* ERROR_INVALID_POINTER */;
        if (source == 0)
            return 2147483907 /* ERROR_INVALID_POINTER */;
        this.context.memory.copy(source, destination, size);
        return Promise.resolve(0);
    };
    return sceDmac;
})();
exports.sceDmac = sceDmac;
//# sourceMappingURL=sceDmac.js.map
},
"src/hle/module/sceGe_user": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var _gpu = require('../../core/gpu');
_gpu.PspGpuCallback;

var PspGpuCallback = _gpu.PspGpuCallback;

var sceGe_user = (function () {
    function sceGe_user(context) {
        var _this = this;
        this.context = context;
        this.sceGeSetCallback = createNativeFunction(0xA4FC06A4, 150, 'uint', 'Thread/void*', this, function (thread, callbackDataPtr) {
            var callbacks = _this.context.gpu.callbacks;
            var info = CallbackData.struct.read(callbackDataPtr);
            return callbacks.allocate(new PspGpuCallback(thread.state, info.signalFunction, info.signalArgument, info.finishFunction, info.finishArgument));
        });
        this.sceGeUnsetCallback = createNativeFunction(0x05DB22CE, 150, 'uint', 'int', this, function (callbackId) {
            _this.context.gpu.callbacks.remove(callbackId);
            return 0;
        });
        this.sceGeListEnQueue = createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, function (start, stall, callbackId, argsPtr) {
            return _this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
        });
        this.sceGeListSync = createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, function (displayListId, syncType) {
            //console.warn('Not implemented sceGe_user.sceGeListSync');
            return _this.context.gpu.listSync(displayListId, syncType);
        });
        this.sceGeListUpdateStallAddr = createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, function (displayListId, stall) {
            //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
            return _this.context.gpu.updateStallAddr(displayListId, stall);
        });
        this.sceGeDrawSync = createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, function (syncType) {
            return _this.context.gpu.drawSync(syncType);
        });
        this.sceGeContinue = createNativeFunction(0x4C06E472, 150, 'uint', '', this, function () {
            return -1;
        });
        this.sceGeBreak = createNativeFunction(0xB448EC0D, 150, 'uint', 'int/void*', this, function (mode, breakAddress) {
            return -1;
        });
        this.sceGeEdramGetAddr = createNativeFunction(0xE47E40E4, 150, 'uint', '', this, function () {
            //console.warn('Not implemented sceGe_user.sceGeEdramGetAddr', 0x04000000);
            return 0x04000000;
        });
        this.sceGeEdramGetSize = createNativeFunction(0x1F6752AD, 150, 'uint', '', this, function () {
            //console.warn('Not implemented sceGe_user.sceGeEdramGetSize', 0x00200000);
            return 0x00200000;
        });
    }
    return sceGe_user;
})();
exports.sceGe_user = sceGe_user;

var CallbackData = (function () {
    function CallbackData() {
    }
    CallbackData.struct = StructClass.create(CallbackData, [
        { signalFunction: UInt32 },
        { signalArgument: UInt32 },
        { finishFunction: UInt32 },
        { finishArgument: UInt32 }
    ]);
    return CallbackData;
})();
//# sourceMappingURL=sceGe_user.js.map
},
"src/hle/module/sceHprm": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceHprm = (function () {
    function sceHprm(context) {
        this.context = context;
        this.sceHprmPeekCurrentKey = createNativeFunction(0x1910B327, 150, 'uint', 'void*', this, function (PspHprmKeysEnumKeyPtr) {
            PspHprmKeysEnumKeyPtr.writeInt32(0);
            return 0;
        });
    }
    return sceHprm;
})();
exports.sceHprm = sceHprm;
//# sourceMappingURL=sceHprm.js.map
},
"src/hle/module/sceHttp": function(module, exports, require) {
var sceHttp = (function () {
    function sceHttp(context) {
        this.context = context;
    }
    return sceHttp;
})();
exports.sceHttp = sceHttp;
//# sourceMappingURL=sceHttp.js.map
},
"src/hle/module/sceImpose": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceImpose = (function () {
    function sceImpose(context) {
        this.context = context;
        this.sceImposeGetBatteryIconStatus = createNativeFunction(0x8C943191, 150, 'uint', 'void*/void*', this, function (isChargingPointer, iconStatusPointer) {
            isChargingPointer.writeInt32(0 /* NotCharging */);
            iconStatusPointer.writeInt32(3 /* FullyFilled */);
            return 0;
        });
    }
    return sceImpose;
})();
exports.sceImpose = sceImpose;

var ChargingEnum;
(function (ChargingEnum) {
    ChargingEnum[ChargingEnum["NotCharging"] = 0] = "NotCharging";
    ChargingEnum[ChargingEnum["Charging"] = 1] = "Charging";
})(ChargingEnum || (ChargingEnum = {}));

var BatteryStatusEnum;
(function (BatteryStatusEnum) {
    BatteryStatusEnum[BatteryStatusEnum["VeryLow"] = 0] = "VeryLow";
    BatteryStatusEnum[BatteryStatusEnum["Low"] = 1] = "Low";
    BatteryStatusEnum[BatteryStatusEnum["PartiallyFilled"] = 2] = "PartiallyFilled";
    BatteryStatusEnum[BatteryStatusEnum["FullyFilled"] = 3] = "FullyFilled";
})(BatteryStatusEnum || (BatteryStatusEnum = {}));
//# sourceMappingURL=sceImpose.js.map
},
"src/hle/module/sceLibFont": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceLibFont = (function () {
    function sceLibFont(context) {
        var _this = this;
        this.context = context;
        this.fontLibUid = new UidCollection(1);
        this.fontUid = new UidCollection(1);
        this.sceFontNewLib = createNativeFunction(0x67F17ED7, 150, 'uint', 'void*/void*', this, function (paramsPtr, errorCodePtr) {
            var fontLib = new FontLib();
            return _this.fontLibUid.allocate(fontLib);
        });
        this.sceFontFindOptimumFont = createNativeFunction(0x099EF33C, 150, 'uint', 'int/void*/void*', this, function (fontLibId, fontStylePointer, errorCodePointer) {
            var fontLib = _this.fontLibUid.get(fontLibId);
            return 0;
        });
        this.sceFontOpen = createNativeFunction(0xA834319D, 150, 'uint', 'int/int/int/void*', this, function (fontLibId, index, mode, errorCodePointer) {
            var fontLib = _this.fontLibUid.get(fontLibId);
            return _this.fontUid.allocate(new Font());
        });
        this.sceFontGetFontInfo = createNativeFunction(0x0DA7535E, 150, 'uint', 'int/void*', this, function (fontId, fontInfoPointer) {
            var font = _this.fontUid.get(fontId);
            return 0;
        });
    }
    return sceLibFont;
})();
exports.sceLibFont = sceLibFont;

var FontLib = (function () {
    function FontLib() {
    }
    return FontLib;
})();

var Font = (function () {
    function Font() {
    }
    return Font;
})();
/*
class FontInfo {
private Fixed26_6 MaxGlyphWidthI;
private Fixed26_6 MaxGlyphHeightI;
private Fixed26_6 MaxGlyphAscenderI;
private Fixed26_6 MaxGlyphDescenderI;
private Fixed26_6 MaxGlyphLeftXI;
private Fixed26_6 MaxGlyphBaseYI;
private Fixed26_6 MinGlyphCenterXI;
private Fixed26_6 MaxGlyphTopYI;
private Fixed26_6 MaxGlyphAdvanceXI;
private Fixed26_6 MaxGlyphAdvanceYI;
private float MaxGlyphWidthF;
private float MaxGlyphHeightF;
private float MaxGlyphAscenderF;
private float MaxGlyphDescenderF;
private float MaxGlyphLeftXF;
private float MaxGlyphBaseYF;
private float MinGlyphCenterXF;
private float MaxGlyphTopYF;
private float MaxGlyphAdvanceXF;
private float MaxGlyphAdvanceYF;
public float MaxGlyphAscender { set { MaxGlyphAscenderI = MaxGlyphAscenderF = value; } get { return MaxGlyphAscenderF; } }
public float MaxGlyphDescender { set { MaxGlyphDescenderI = MaxGlyphDescenderF = value; } get { return MaxGlyphDescenderF; } }
public float MaxGlyphLeftX { set { MaxGlyphLeftXI = MaxGlyphLeftXF = value; } get { return MaxGlyphLeftXF; } }
public float MaxGlyphBaseY { set { MaxGlyphBaseYI = MaxGlyphBaseYF = value; } get { return MaxGlyphBaseYF; } }
public float MinGlyphCenterX { set { MinGlyphCenterXI = MinGlyphCenterXF = value; } get { return MinGlyphCenterXF; } }
public float MaxGlyphTopY { set { MaxGlyphTopYI = MaxGlyphTopYF = value; } get { return MaxGlyphTopYF; } }
public float MaxGlyphAdvanceX { set { MaxGlyphAdvanceXI = MaxGlyphAdvanceXF = value; } get { return MaxGlyphAdvanceXF; } }
public float MaxGlyphAdvanceY { set { MaxGlyphAdvanceYI = MaxGlyphAdvanceYF = value; } get { return MaxGlyphAdvanceYF; } }
public ushort MaxGlyphWidth { set { MaxGlyphWidthI = MaxGlyphWidthF = _MaxGlyphWidth = value; } get { return _MaxGlyphWidth; } }
public ushort MaxGlyphHeight { set { MaxGlyphHeightI = MaxGlyphHeightF = _MaxGlyphHeight = value; } get { return _MaxGlyphHeight; } }
#region Bitmap dimensions.
/// <summary>
///
/// </summary>
private ushort _MaxGlyphWidth;
/// <summary>
///
/// </summary>
private ushort _MaxGlyphHeight;
/// <summary>
/// Number of elements in the font's charmap.
/// </summary>
public uint CharMapLength;
/// <summary>
/// Number of elements in the font's shadow charmap.
/// </summary>
public uint ShadowMapLength;
/// <summary>
/// Font style (used by font comparison functions).
/// </summary>
public FontStyle FontStyle;
#endregion
/// <summary>
/// Font's BPP. = 4
/// </summary>
public byte BPP;
/// <summary>
/// Padding.
/// </summary>
public fixed byte Pad[3];
}
*/
//# sourceMappingURL=sceLibFont.js.map
},
"src/hle/module/sceMp3": function(module, exports, require) {
var sceMp3 = (function () {
    function sceMp3(context) {
        this.context = context;
    }
    return sceMp3;
})();
exports.sceMp3 = sceMp3;
//# sourceMappingURL=sceMp3.js.map
},
"src/hle/module/sceMpeg": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceMpeg = (function () {
    function sceMpeg(context) {
        this.context = context;
        this.sceMpegInit = createNativeFunction(0x682A619B, 150, 'uint', '', this, function () {
            return -1;
        });
        this.sceMpegRingbufferQueryMemSize = createNativeFunction(0xD7A29F46, 150, 'uint', 'int', this, function (numberOfPackets) {
            return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
        });
    }
    sceMpeg.RING_BUFFER_PACKET_SIZE = 0x800;
    return sceMpeg;
})();
exports.sceMpeg = sceMpeg;
//# sourceMappingURL=sceMpeg.js.map
},
"src/hle/module/sceNet": function(module, exports, require) {
var sceNet = (function () {
    function sceNet(context) {
        this.context = context;
    }
    return sceNet;
})();
exports.sceNet = sceNet;
//# sourceMappingURL=sceNet.js.map
},
"src/hle/module/sceNetAdhoc": function(module, exports, require) {
var sceNetAdhoc = (function () {
    function sceNetAdhoc(context) {
        this.context = context;
    }
    return sceNetAdhoc;
})();
exports.sceNetAdhoc = sceNetAdhoc;
//# sourceMappingURL=sceNetAdhoc.js.map
},
"src/hle/module/sceNetAdhocMatching": function(module, exports, require) {
var sceNetAdhocMatching = (function () {
    function sceNetAdhocMatching(context) {
        this.context = context;
    }
    return sceNetAdhocMatching;
})();
exports.sceNetAdhocMatching = sceNetAdhocMatching;
//# sourceMappingURL=sceNetAdhocMatching.js.map
},
"src/hle/module/sceNetAdhocctl": function(module, exports, require) {
var sceNetAdhocctl = (function () {
    function sceNetAdhocctl(context) {
        this.context = context;
    }
    return sceNetAdhocctl;
})();
exports.sceNetAdhocctl = sceNetAdhocctl;
//# sourceMappingURL=sceNetAdhocctl.js.map
},
"src/hle/module/sceNetApctl": function(module, exports, require) {
var sceNetApctl = (function () {
    function sceNetApctl(context) {
        this.context = context;
    }
    return sceNetApctl;
})();
exports.sceNetApctl = sceNetApctl;
//# sourceMappingURL=sceNetApctl.js.map
},
"src/hle/module/sceNetInet": function(module, exports, require) {
var sceNetInet = (function () {
    function sceNetInet(context) {
        this.context = context;
    }
    return sceNetInet;
})();
exports.sceNetInet = sceNetInet;
//# sourceMappingURL=sceNetInet.js.map
},
"src/hle/module/sceNetResolver": function(module, exports, require) {
var sceNetResolver = (function () {
    function sceNetResolver(context) {
        this.context = context;
    }
    return sceNetResolver;
})();
exports.sceNetResolver = sceNetResolver;
//# sourceMappingURL=sceNetResolver.js.map
},
"src/hle/module/sceNp": function(module, exports, require) {
var sceNp = (function () {
    function sceNp(context) {
        this.context = context;
    }
    return sceNp;
})();
exports.sceNp = sceNp;
//# sourceMappingURL=sceNp.js.map
},
"src/hle/module/sceNpAuth": function(module, exports, require) {
var sceNpAuth = (function () {
    function sceNpAuth(context) {
        this.context = context;
    }
    return sceNpAuth;
})();
exports.sceNpAuth = sceNpAuth;
//# sourceMappingURL=sceNpAuth.js.map
},
"src/hle/module/sceNpService": function(module, exports, require) {
var sceNpService = (function () {
    function sceNpService(context) {
        this.context = context;
    }
    return sceNpService;
})();
exports.sceNpService = sceNpService;
//# sourceMappingURL=sceNpService.js.map
},
"src/hle/module/sceOpenPSID": function(module, exports, require) {
var sceOpenPSID = (function () {
    function sceOpenPSID(context) {
        this.context = context;
    }
    return sceOpenPSID;
})();
exports.sceOpenPSID = sceOpenPSID;
//# sourceMappingURL=sceOpenPSID.js.map
},
"src/hle/module/sceParseHttp": function(module, exports, require) {
var sceParseHttp = (function () {
    function sceParseHttp(context) {
        this.context = context;
    }
    return sceParseHttp;
})();
exports.sceParseHttp = sceParseHttp;
//# sourceMappingURL=sceParseHttp.js.map
},
"src/hle/module/sceParseUri": function(module, exports, require) {
var sceParseUri = (function () {
    function sceParseUri(context) {
        this.context = context;
    }
    return sceParseUri;
})();
exports.sceParseUri = sceParseUri;
//# sourceMappingURL=sceParseUri.js.map
},
"src/hle/module/scePower": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var scePower = (function () {
    function scePower(context) {
        var _this = this;
        this.context = context;
        // 222/111
        // 333/166
        this.cpuMult = 511;
        this.pllFreq = 222;
        this.busFreq = 111;
        this.scePowerRegisterCallback = createNativeFunction(0x04B7766E, 150, 'int', 'int/int', this, function (slotIndex, callbackId) {
            _this.context.callbackManager.notify(callbackId, 128 /* BATTERY_EXIST */);
            return 0;
        });
        this.scePowerUnregitserCallback = createNativeFunction(0xDB9D28DD, 150, 'int', 'int', this, function (slotIndex) {
            return 0;
        });
        this.scePowerUnregisterCallback = createNativeFunction(0xDFA8BAF8, 150, 'int', 'int', this, function (slotIndex) {
            return 0;
        });
        this.scePowerSetClockFrequency = createNativeFunction(0x737486F2, 150, 'int', 'int/int/int', this, function (pllFreq, cpuFreq, busFreq) {
            if (!_this._isValidCpuFreq(cpuFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            if (!_this._isValidBusFreq(busFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            if (!_this._isValidPllFreq(pllFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            _this.pllFreq = pllFreq;
            _this._setCpuFreq(cpuFreq);
            _this.busFreq = busFreq;
            return 0;
        });
        this.scePowerGetCpuClockFrequency = createNativeFunction(0xFEE03A2F, 150, 'int', '', this, function () {
            return _this._getCpuFreq();
        });
        this.scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, function () {
            return _this._getCpuFreq();
        });
        this.scePowerGetCpuClockFrequencyFloat = createNativeFunction(0xB1A52C83, 150, 'float', '', this, function () {
            return _this._getCpuFreq();
        });
        this.scePowerGetBusClockFrequency = createNativeFunction(0x478FE6F5, 150, 'int', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetBusClockFrequencyInt = createNativeFunction(0xBD681969, 150, 'int', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetBusClockFrequencyFloat = createNativeFunction(0x9BADB3EB, 150, 'float', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetPllClockFrequencyInt = createNativeFunction(0x34F9C463, 150, 'int', '', this, function () {
            return _this.pllFreq;
        });
        this.scePowerGetPllClockFrequencyFloat = createNativeFunction(0xEA382A27, 150, 'float', '', this, function () {
            return _this.pllFreq;
        });
        this.scePowerSetBusClockFrequency = createNativeFunction(0xB8D7B3FB, 150, 'int', 'int', this, function (busFreq) {
            if (!_this._isValidBusFreq(busFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;

            //this.busFreq = busFreq;
            _this.busFreq = 111;
            return 0;
        });
        this.scePowerSetCpuClockFrequency = createNativeFunction(0x843FBF43, 150, 'int', 'int', this, function (cpuFreq) {
            if (!_this._isValidCpuFreq(cpuFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            _this._setCpuFreq(cpuFreq);
            return 0;
        });
        this.scePowerGetBatteryLifePercent = createNativeFunction(0x2085D15D, 150, 'int', '', this, function () {
            return 100;
        });
        this.scePowerIsPowerOnline = createNativeFunction(0x87440F5E, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerIsBatteryExist = createNativeFunction(0x0AFD0D8B, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerIsLowBattery = createNativeFunction(0xD3075926, 150, 'int', '', this, function () {
            return 0;
        });
        this.scePowerIsBatteryCharging = createNativeFunction(0x1E490401, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerGetBatteryLifeTime = createNativeFunction(0x8EFB3FA2, 150, 'int', '', this, function () {
            return 3 * 60;
        });
        this.scePowerGetBatteryVolt = createNativeFunction(0x483CE86B, 150, 'int', '', this, function () {
            return 4135;
        });
        this.scePowerGetBatteryTemp = createNativeFunction(0x28E12023, 150, 'int', '', this, function () {
            return 28;
        });
        this.scePowerLock = createNativeFunction(0xD6D016EF, 150, 'int', 'int', this, function (unknown) {
            return 0;
        });
        this.scePowerUnlock = createNativeFunction(0xCA3D34C1, 150, 'int', 'int', this, function (unknown) {
            return 0;
        });
        this.scePowerTick = createNativeFunction(0xEFD3C963, 150, 'int', 'int', this, function (type) {
            return 0;
        });
        this.scePowerGetBatteryChargingStatus = createNativeFunction(0xB4432BC8, 150, 'int', '', this, function () {
            return 128 /* BatteryExists */ | 4096 /* AcPower */ | 127 /* BatteryPower */;
        });
    }
    scePower.prototype._getCpuMult = function () {
        return 0.43444227005871 * (this.busFreq / 111);
    };

    scePower.prototype._getCpuFreq = function () {
        return this.cpuMult * this._getCpuMult();
    };

    scePower.prototype._setCpuFreq = function (cpuFreq) {
        if (cpuFreq > 222) {
            // do nothing
        } else if (cpuFreq == 222) {
            this.cpuMult = 511;
        } else {
            this.cpuMult = Math.floor(cpuFreq / this._getCpuMult());
        }
    };

    scePower.prototype._isValidCpuFreq = function (freq) {
        return (freq >= 1 && freq <= 222);
    };

    scePower.prototype._isValidBusFreq = function (freq) {
        return (freq >= 1 && freq <= 111);
    };

    scePower.prototype._isValidPllFreq = function (freq) {
        return (freq >= 19 && freq <= 111);
    };
    return scePower;
})();
exports.scePower = scePower;

var CallbackStatus;
(function (CallbackStatus) {
    CallbackStatus[CallbackStatus["AC_POWER"] = 0x00001000] = "AC_POWER";
    CallbackStatus[CallbackStatus["BATTERY_EXIST"] = 0x00000080] = "BATTERY_EXIST";
    CallbackStatus[CallbackStatus["BATTERY_FULL"] = 0x00000064] = "BATTERY_FULL";
})(CallbackStatus || (CallbackStatus = {}));

var PowerFlagsSet;
(function (PowerFlagsSet) {
    PowerFlagsSet[PowerFlagsSet["PowerSwitch"] = 0x80000000] = "PowerSwitch";
    PowerFlagsSet[PowerFlagsSet["HoldSwitch"] = 0x40000000] = "HoldSwitch";
    PowerFlagsSet[PowerFlagsSet["StandBy"] = 0x00080000] = "StandBy";
    PowerFlagsSet[PowerFlagsSet["ResumeComplete"] = 0x00040000] = "ResumeComplete";
    PowerFlagsSet[PowerFlagsSet["Resuming"] = 0x00020000] = "Resuming";
    PowerFlagsSet[PowerFlagsSet["Suspending"] = 0x00010000] = "Suspending";
    PowerFlagsSet[PowerFlagsSet["AcPower"] = 0x00001000] = "AcPower";
    PowerFlagsSet[PowerFlagsSet["BatteryLow"] = 0x00000100] = "BatteryLow";
    PowerFlagsSet[PowerFlagsSet["BatteryExists"] = 0x00000080] = "BatteryExists";
    PowerFlagsSet[PowerFlagsSet["BatteryPower"] = 0x0000007F] = "BatteryPower";
})(PowerFlagsSet || (PowerFlagsSet = {}));
//# sourceMappingURL=scePower.js.map
},
"src/hle/module/scePspNpDrm_user": function(module, exports, require) {
var scePspNpDrm_user = (function () {
    function scePspNpDrm_user(context) {
        this.context = context;
    }
    return scePspNpDrm_user;
})();
exports.scePspNpDrm_user = scePspNpDrm_user;
//# sourceMappingURL=scePspNpDrm_user.js.map
},
"src/hle/module/sceReg": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceReg = (function () {
    function sceReg(context) {
        this.context = context;
        this.sceRegOpenRegistry = createNativeFunction(0x92E41280, 150, 'int', 'void*/int/void*', this, function (regParamPtr, mode, regHandlePtr) {
            var regParam = RegParam.struct.read(regParamPtr);
            console.warn('sceRegOpenRegistry: ' + regParam.name);
            regHandlePtr.writeInt32(0);
            return 0;
        });
        this.sceRegOpenCategory = createNativeFunction(0x1D8A762E, 150, 'int', 'int/string/int/void*', this, function (regHandle, name, mode, regCategoryHandlePtr) {
            console.warn('sceRegOpenCategory: ' + name);
            return 0;
        });
        this.sceRegGetKeyInfo = createNativeFunction(0xD4475AA8, 150, 'int', 'int/string/void*/void*/void*', this, function (categoryHandle, name, regKeyHandlePtr, regKeyTypesPtr, sizePtr) {
            console.warn('sceRegGetKeyInfo: ' + name);
            return 0;
        });
        this.sceRegGetKeyValue = createNativeFunction(0x28A8E98A, 150, 'int', 'int/int/void*/int', this, function (categoryHandle, regKeyHandle, bufferPtr, size) {
            console.warn('sceRegGetKeyValue');
            return 0;
        });
        this.sceRegFlushCategory = createNativeFunction(0x0D69BF40, 150, 'int', 'int', this, function (categoryHandle) {
            console.warn('sceRegFlushCategory');
            return 0;
        });
        this.sceRegCloseCategory = createNativeFunction(0x0CAE832B, 150, 'int', 'int', this, function (categoryHandle) {
            console.warn('sceRegCloseCategory');
            return 0;
        });
        this.sceRegFlushRegistry = createNativeFunction(0x39461B4D, 150, 'int', 'int', this, function (regHandle) {
            console.warn('sceRegFlushRegistry');
            return 0;
        });
        this.sceRegCloseRegistry = createNativeFunction(0xFA8A5739, 150, 'int', 'int', this, function (regHandle) {
            console.warn('sceRegCloseRegistry');
            return 0;
        });
    }
    return sceReg;
})();
exports.sceReg = sceReg;

var RegParam = (function () {
    function RegParam() {
    }
    RegParam.struct = StructClass.create(RegParam, [
        { regType: UInt32 },
        { name: Stringz(256) },
        { nameLength: Int32 },
        { unknown2: Int32 },
        { unknown3: Int32 }
    ]);
    return RegParam;
})();
//# sourceMappingURL=sceReg.js.map
},
"src/hle/module/sceRtc": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var _structs = require('../structs');

var sceRtc = (function () {
    function sceRtc(context) {
        var _this = this;
        this.context = context;
        this.sceRtcGetCurrentTick = createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, function (tickPtr) {
            tickPtr.writeUInt64(_structs.ScePspDateTime.fromDate(new Date()).getTotalMicroseconds());
            return 0;
        });
        this.sceRtcGetDayOfWeek = createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, function (year, month, day) {
            return _this.context.rtc.getDayOfWeek(year, month, day);
        });
        this.sceRtcGetDaysInMonth = createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, function (year, month) {
            return _this.context.rtc.getDaysInMonth(year, month);
        });
        this.sceRtcGetTickResolution = createNativeFunction(0xC41C2853, 150, 'uint', 'void*', this, function (tickPtr) {
            return 1000000;
        });
        this.sceRtcSetTick = createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, function (datePtr, ticksPtr) {
            var ticks = ticksPtr.readInt64();
            datePtr.writeStruct(_structs.ScePspDateTime.struct, _structs.ScePspDateTime.fromTicks(ticks));
            return 0;
        });
        this.sceRtcGetTick = createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, function (datePtr, ticksPtr) {
            try  {
                var date = _structs.ScePspDateTime.struct.read(datePtr);
                ticksPtr.writeUInt64(date.getTotalMicroseconds());
                return 0;
            } catch (e) {
                return 2147484158 /* ERROR_INVALID_VALUE */;
            }
        });
    }
    return sceRtc;
})();
exports.sceRtc = sceRtc;
//# sourceMappingURL=sceRtc.js.map
},
"src/hle/module/sceSasCore": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var sceSasCore = (function () {
    function sceSasCore(context) {
        var _this = this;
        this.context = context;
        this.voices = [];
        this.__sceSasInit = createNativeFunction(0x42778A9F, 150, 'uint', 'int/int/int/int/int', this, function (sasCorePointer, grainSamples, maxVoices, outputMode, sampleRate) {
            if (sampleRate != 44100) {
                return 2151809028 /* ERROR_SAS_INVALID_SAMPLE_RATE */;
            }

            //CheckGrains(GrainSamples);
            if (maxVoices < 1 || maxVoices > sceSasCore.PSP_SAS_VOICES_MAX) {
                return 2151809026 /* ERROR_SAS_INVALID_MAX_VOICES */;
            }

            if (outputMode != 0 /* STEREO */ && outputMode != 1 /* MULTICHANNEL */) {
                return 2151809027 /* ERROR_SAS_INVALID_OUTPUT_MODE */;
            }

            /*
            var SasCore = GetSasCore(SasCorePointer, CreateIfNotExists: true);
            SasCore.Initialized = true;
            SasCore.GrainSamples = GrainSamples;
            SasCore.MaxVoices = MaxVoices;
            SasCore.OutputMode = OutputMode;
            SasCore.SampleRate = SampleRate;
            
            BufferTemp = new StereoIntSoundSample[SasCore.GrainSamples * 2];
            BufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
            MixBufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
            */
            return 0;
        });
        this.__sceSasCore = createNativeFunction(0xA3589D81, 150, 'uint', 'int/void*', this, function (sasCorePointer, sasOut) {
            //return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
            return 0;
        });
        this.__sceSasGetEndFlag = createNativeFunction(0x68A46B95, 150, 'uint', 'int', this, function (sasCorePointer) {
            //return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
            return 0;
        });
        this.__sceSasRevType = createNativeFunction(0x33D4AB37, 150, 'uint', 'int/int', this, function (sasCorePointer, waveformEffectType) {
            //return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
            return 0;
        });
        this.__sceSasRevVON = createNativeFunction(0xF983B186, 150, 'uint', 'int/int/int', this, function (sasCorePointer, waveformEffectIsDry, waveformEffectIsWet) {
            //return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
            return 0;
        });
        this.__sceSasRevEVOL = createNativeFunction(0xD5A229C9, 150, 'uint', 'int/int/int', this, function (sasCorePointer, leftVolume, rightVolume) {
            //return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
            return 0;
        });
        this.__sceSasSetADSR = createNativeFunction(0x019B25EB, 150, 'uint', 'int/int/int/int/int/int/int', this, function (sasCorePointer, voiceId, flags, attackRate, decayRate, sustainRate, releaseRate) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);

            if (flags & AdsrFlags.HasAttack)
                voice.envelope.attackRate = attackRate;
            if (flags & AdsrFlags.HasDecay)
                voice.envelope.decayRate = decayRate;
            if (flags & AdsrFlags.HasSustain)
                voice.envelope.sustainRate = sustainRate;
            if (flags & AdsrFlags.HasRelease)
                voice.envelope.releaseRate = releaseRate;

            return 0;
        });
        this.__sceSasSetADSRmode = createNativeFunction(0x9EC3676A, 150, 'uint', 'int/int/int/int/int/int/int', this, function (sasCorePointer, voiceId, flags, attackCurveMode, decayCurveMode, sustainCurveMode, releaseCurveMode) {
            console.warn('__sceSasSetADSRmode not implemented!');
            return 0;
        });
        this.__sceSasSetKeyOff = createNativeFunction(0xA0CF2FA4, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (!voice.pause)
                return 2151809046 /* ERROR_SAS_VOICE_PAUSED */;
            voice.on = false;
            return 0;
        });
        this.__sceSasSetKeyOn = createNativeFunction(0x76F01ACA, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            voice.on = true;
            return 0;
        });
        this.__sceSasSetVoicePCM = createNativeFunction(0xE1CD9561, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            console.warn('__sceSasSetVoicePCM not implemented!');
            return 0;
        });
        this.__sceSasGetEnvelopeHeight = createNativeFunction(0x74AE582A, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            return _this.getSasCoreVoice(sasCorePointer, voiceId).envelope.height;
        });
        this.__sceSasSetSL = createNativeFunction(0x5F9529F6, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, sustainLevel) {
            _this.getSasCoreVoice(sasCorePointer, voiceId).sustainLevel = sustainLevel;
            return 0;
        });
        this.__sceSasSetPause = createNativeFunction(0x787D04D5, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceBits, pause) {
            _this.voices.forEach(function (voice) {
                if (voiceBits & (1 << voice.index)) {
                    voice.pause = pause;
                }
            });
            return 0;
        });
        this.__sceSasGetPauseFlag = createNativeFunction(0x2C8E6AB3, 150, 'uint', 'int', this, function (sasCorePointer) {
            var voiceBits = 0;
            _this.voices.forEach(function (voice) {
                voiceBits |= (voice.pause ? 1 : 0) << voice.index;
            });
            return voiceBits;
        });
        this.__sceSasGetAllEnvelopeHeights = createNativeFunction(0x07F58C24, 150, 'uint', 'int/void*', this, function (sasCorePointer, heightPtr) {
            _this.voices.forEach(function (voice) {
                heightPtr.writeInt32(voice.envelope.height);
            });
            return 0;
        });
        this.__sceSasSetNoise = createNativeFunction(0xB7660A23, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, noiseFrequency) {
            if (noiseFrequency < 0 || noiseFrequency >= 64)
                return 2151809041 /* ERROR_SAS_INVALID_NOISE_CLOCK */;
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            return 0;
        });
        this.__sceSasSetVolume = createNativeFunction(0x440CA7D8, 150, 'uint', 'int/int/int/int/int/int', this, function (sasCorePointer, voiceId, leftVolume, rightVolume, effectLeftVol, effectRightVol) {
            return 0;
        });
        this.__sceSasSetPitch = createNativeFunction(0xAD84D37F, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, pitch) {
            return 0;
        });
        this.__sceSasSetVoice = createNativeFunction(0x99944089, 150, 'uint', 'int/int/byte[]/int', this, function (sasCorePointer, voiceId, vagPointer, loopCount) {
            // Not implemented
            return 0;
        });
        while (this.voices.length < 32)
            this.voices.push(new Voice(this.voices.length));
    }
    sceSasCore.prototype.getSasCoreVoice = function (sasCorePointer, voiceId) {
        var voice = this.voices[voiceId];
        if (!voice)
            throw (new SceKernelException(2151809040 /* ERROR_SAS_INVALID_VOICE */));
        return voice;
    };
    sceSasCore.PSP_SAS_VOICES_MAX = 32;
    sceSasCore.PSP_SAS_GRAIN_SAMPLES = 256;
    sceSasCore.PSP_SAS_VOL_MAX = 0x1000;
    sceSasCore.PSP_SAS_LOOP_MODE_OFF = 0;
    sceSasCore.PSP_SAS_LOOP_MODE_ON = 1;
    sceSasCore.PSP_SAS_PITCH_MIN = 0x1;
    sceSasCore.PSP_SAS_PITCH_BASE = 0x1000;
    sceSasCore.PSP_SAS_PITCH_MAX = 0x4000;
    sceSasCore.PSP_SAS_NOISE_FREQ_MAX = 0x3F;
    sceSasCore.PSP_SAS_ENVELOPE_HEIGHT_MAX = 0x40000000;
    sceSasCore.PSP_SAS_ENVELOPE_FREQ_MAX = 0x7FFFFFFF;
    sceSasCore.PSP_SAS_ADSR_ATTACK = 1;
    sceSasCore.PSP_SAS_ADSR_DECAY = 2;
    sceSasCore.PSP_SAS_ADSR_SUSTAIN = 4;
    sceSasCore.PSP_SAS_ADSR_RELEASE = 8;
    return sceSasCore;
})();
exports.sceSasCore = sceSasCore;

var Envelope = (function () {
    function Envelope() {
        this.attackRate = 0;
        this.decayRate = 0;
        this.sustainRate = 0;
        this.releaseRate = 0;
        this.height = 0;
    }
    return Envelope;
})();

var Voice = (function () {
    function Voice(index) {
        this.index = index;
        this.envelope = new Envelope();
        this.sustainLevel = 0;
        this.on = false;
        this.pause = false;
    }
    return Voice;
})();

var OutputMode;
(function (OutputMode) {
    OutputMode[OutputMode["STEREO"] = 0] = "STEREO";
    OutputMode[OutputMode["MULTICHANNEL"] = 1] = "MULTICHANNEL";
})(OutputMode || (OutputMode = {}));

var WaveformEffectType;
(function (WaveformEffectType) {
    WaveformEffectType[WaveformEffectType["OFF"] = -1] = "OFF";
    WaveformEffectType[WaveformEffectType["ROOM"] = 0] = "ROOM";
    WaveformEffectType[WaveformEffectType["UNK1"] = 1] = "UNK1";
    WaveformEffectType[WaveformEffectType["UNK2"] = 2] = "UNK2";
    WaveformEffectType[WaveformEffectType["UNK3"] = 3] = "UNK3";
    WaveformEffectType[WaveformEffectType["HALL"] = 4] = "HALL";
    WaveformEffectType[WaveformEffectType["SPACE"] = 5] = "SPACE";
    WaveformEffectType[WaveformEffectType["ECHO"] = 6] = "ECHO";
    WaveformEffectType[WaveformEffectType["DELAY"] = 7] = "DELAY";
    WaveformEffectType[WaveformEffectType["PIPE"] = 8] = "PIPE";
})(WaveformEffectType || (WaveformEffectType = {}));

var AdsrFlags;
(function (AdsrFlags) {
    AdsrFlags[AdsrFlags["HasAttack"] = (1 << 0)] = "HasAttack";
    AdsrFlags[AdsrFlags["HasDecay"] = (1 << 1)] = "HasDecay";
    AdsrFlags[AdsrFlags["HasSustain"] = (1 << 2)] = "HasSustain";
    AdsrFlags[AdsrFlags["HasRelease"] = (1 << 3)] = "HasRelease";
})(AdsrFlags || (AdsrFlags = {}));

var AdsrCurveMode;
(function (AdsrCurveMode) {
    AdsrCurveMode[AdsrCurveMode["LINEAR_INCREASE"] = 0] = "LINEAR_INCREASE";
    AdsrCurveMode[AdsrCurveMode["LINEAR_DECREASE"] = 1] = "LINEAR_DECREASE";
    AdsrCurveMode[AdsrCurveMode["LINEAR_BENT"] = 2] = "LINEAR_BENT";
    AdsrCurveMode[AdsrCurveMode["EXPONENT_REV"] = 3] = "EXPONENT_REV";
    AdsrCurveMode[AdsrCurveMode["EXPONENT"] = 4] = "EXPONENT";
    AdsrCurveMode[AdsrCurveMode["DIRECT"] = 5] = "DIRECT";
})(AdsrCurveMode || (AdsrCurveMode = {}));
//# sourceMappingURL=sceSasCore.js.map
},
"src/hle/module/sceSsl": function(module, exports, require) {
var sceSsl = (function () {
    function sceSsl(context) {
        this.context = context;
    }
    return sceSsl;
})();
exports.sceSsl = sceSsl;
//# sourceMappingURL=sceSsl.js.map
},
"src/hle/module/sceSuspendForUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var sceSuspendForUser = (function () {
    function sceSuspendForUser(context) {
        this.context = context;
        this.sceKernelPowerLock = createNativeFunction(0xEADB1BD7, 150, 'uint', 'uint', this, function (lockType) {
            if (lockType != 0)
                return 2147483911 /* ERROR_INVALID_MODE */;
            return 0;
        });
        this.sceKernelPowerUnlock = createNativeFunction(0x3AEE7261, 150, 'uint', 'uint', this, function (lockType) {
            if (lockType != 0)
                return 2147483911 /* ERROR_INVALID_MODE */;
            return 0;
        });
        this.sceKernelPowerTick = createNativeFunction(0x090CCB3F, 150, 'uint', 'uint', this, function (value) {
            // prevent screen from turning off!
            return 0;
        });
    }
    return sceSuspendForUser;
})();
exports.sceSuspendForUser = sceSuspendForUser;
//# sourceMappingURL=sceSuspendForUser.js.map
},
"src/hle/module/sceUmdUser": function(module, exports, require) {
var _utils = require('../utils');

var createNativeFunction = _utils.createNativeFunction;

var sceUmdUser = (function () {
    function sceUmdUser(context) {
        this.context = context;
        this.sceUmdRegisterUMDCallBack = createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, function (callbackId) {
            console.warn('Not implemented sceUmdRegisterUMDCallBack');
            return 0;
        });
        this.sceUmdCheckMedium = createNativeFunction(0x46EBB729, 150, 'uint', '', this, function () {
            return 1 /* Inserted */;
        });
        this.sceUmdWaitDriveStat = createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, function (pspUmdState) {
            console.warn('Not implemented sceUmdWaitDriveStat');
            return 0;
        });
        this.sceUmdWaitDriveStatCB = createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint/uint', this, function (pspUmdState, timeout) {
            console.warn('Not implemented sceUmdWaitDriveStatCB');
            return 0;
        });
        this.sceUmdActivate = createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, function (mode, drive) {
            console.warn('Not implemented sceUmdActivate');
            return 0;
        });
        this.sceUmdGetDriveStat = createNativeFunction(0x6B4A146C, 150, 'uint', '', this, function () {
            return 2 /* PSP_UMD_PRESENT */ | 16 /* PSP_UMD_READY */ | 32 /* PSP_UMD_READABLE */;
        });
        this.sceUmdWaitDriveStatWithTimer = createNativeFunction(0x56202973, 150, 'uint', 'uint/uint', this, function (state, timeout) {
            return Promise.resolve(0);
        });
    }
    return sceUmdUser;
})();
exports.sceUmdUser = sceUmdUser;

var UmdCheckMedium;
(function (UmdCheckMedium) {
    UmdCheckMedium[UmdCheckMedium["NoDisc"] = 0] = "NoDisc";
    UmdCheckMedium[UmdCheckMedium["Inserted"] = 1] = "Inserted";
})(UmdCheckMedium || (UmdCheckMedium = {}));

var PspUmdState;
(function (PspUmdState) {
    PspUmdState[PspUmdState["PSP_UMD_INIT"] = 0x00] = "PSP_UMD_INIT";
    PspUmdState[PspUmdState["PSP_UMD_NOT_PRESENT"] = 0x01] = "PSP_UMD_NOT_PRESENT";
    PspUmdState[PspUmdState["PSP_UMD_PRESENT"] = 0x02] = "PSP_UMD_PRESENT";
    PspUmdState[PspUmdState["PSP_UMD_CHANGED"] = 0x04] = "PSP_UMD_CHANGED";
    PspUmdState[PspUmdState["PSP_UMD_NOT_READY"] = 0x08] = "PSP_UMD_NOT_READY";
    PspUmdState[PspUmdState["PSP_UMD_READY"] = 0x10] = "PSP_UMD_READY";
    PspUmdState[PspUmdState["PSP_UMD_READABLE"] = 0x20] = "PSP_UMD_READABLE";
})(PspUmdState || (PspUmdState = {}));
//# sourceMappingURL=sceUmdUser.js.map
},
"src/hle/module/sceUtility": function(module, exports, require) {
var _utils = require('../utils');

var _vfs = require('../vfs');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');

var FileOpenFlags = _vfs.FileOpenFlags;

var sceUtility = (function () {
    function sceUtility(context) {
        var _this = this;
        this.context = context;
        this.currentStep = 0 /* NONE */;
        this.sceUtilityLoadModule = createNativeFunction(0x2A2B3DE0, 150, 'uint', 'int', this, function (pspModule) {
            console.warn("Not implemented sceUtilityLoadModule '" + pspModule + "'");
            return Promise.resolve(0);
        });
        this.sceUtilitySavedataInitStart = createNativeFunction(0x50C4CD57, 150, 'uint', 'void*', this, function (paramsPtr) {
            console.log('sceUtilitySavedataInitStart');
            var params = SceUtilitySavedataParam.struct.read(paramsPtr);

            var fileManager = _this.context.fileManager;
            var savePathFolder = "ms0:/PSP/SAVEDATA/" + params.gameName + params.saveName;
            var saveDataBin = savePathFolder + "/DATA.BIN";
            var saveIcon0 = savePathFolder + "/ICON0.PNG";
            var savePic1 = savePathFolder + "/PIC1.PNG";

            _this.currentStep = 3 /* SUCCESS */;

            switch (params.mode) {
                case 0 /* Autoload */:
                case 2 /* Load */:
                case 4 /* ListLoad */:
                    return fileManager.openAsync(saveDataBin, 1 /* Read */, parseIntFormat('0777')).then(function (file) {
                        return file.entry.readAllAsync();
                    }).then(function (data) {
                        _this.context.memory.writeBytes(params.dataBufPointer, data);
                        return 0;
                    }).catch(function (error) {
                        return 2148598535 /* ERROR_SAVEDATA_LOAD_NO_DATA */;
                    });
                case 1 /* Autosave */:
                case 3 /* Save */:
                case 5 /* ListSave */:
                    var data = _this.context.memory.readArrayBuffer(params.dataBufPointer, params.dataSize);

                    return fileManager.openAsync(saveDataBin, 512 /* Create */ | 1024 /* Truncate */ | 2 /* Write */, parseIntFormat('0777')).then(function (file) {
                        return file.entry.writeAllAsync(data);
                    }).then(function (written) {
                        return 0;
                    }).catch(function (error) {
                        return 2148598661 /* ERROR_SAVEDATA_SAVE_ACCESS_ERROR */;
                    });
                default:
                    throw (new Error("Not implemented " + params.mode + ': ' + PspUtilitySavedataMode[params.mode]));
            }
            return Promise.resolve(0);
        });
        this.sceUtilitySavedataShutdownStart = createNativeFunction(0x9790B33C, 150, 'uint', '', this, function () {
            //console.log('sceUtilitySavedataShutdownStart');
            //debugger;
            _this.currentStep = 4 /* SHUTDOWN */;
            return 0;
        });
        this.sceUtilitySavedataGetStatus = createNativeFunction(0x8874DBE0, 150, 'uint', '', this, function () {
            try  {
                return _this.currentStep;
            } finally {
                if (_this.currentStep == 4 /* SHUTDOWN */)
                    _this.currentStep = 0 /* NONE */;
            }
        });
        this.sceUtilityMsgDialogInitStart = createNativeFunction(0x2AD8E239, 150, 'uint', 'void*', this, function (paramsPtr) {
            console.warn("Not implemented sceUtilityMsgDialogInitStart()");
            _this.currentStep = 2 /* PROCESSING */;

            return 0;
        });
        this.sceUtilityMsgDialogGetStatus = createNativeFunction(0x9A1C91D7, 150, 'uint', '', this, function () {
            try  {
                return _this.currentStep;
            } finally {
                if (_this.currentStep == 4 /* SHUTDOWN */)
                    _this.currentStep = 0 /* NONE */;
            }
        });
        this.sceUtilityMsgDialogUpdate = createNativeFunction(0x9A1C91D7, 150, 'uint', 'int', this, function (value) {
        });
        this.sceUtilityLoadNetModule = createNativeFunction(0x1579A159, 150, 'uint', '', this, function () {
            console.warn('Not implemented sceUtilityLoadNetModule');
            return 0;
        });
        this.sceUtilityGetSystemParamInt = createNativeFunction(0xA5DA2406, 150, 'uint', 'int/void*', this, function (id, valuePtr) {
            //console.warn("Not implemented sceUtilityGetSystemParamInt", id, PSP_SYSTEMPARAM_ID[id]);
            var value = parseInt(_this._getKey(id));
            if (valuePtr)
                valuePtr.writeInt32(value);
            return 0;
        });
        this.sceUtilityGetSystemParamString = createNativeFunction(0x34B78343, 150, 'uint', 'int/void*/int', this, function (id, strPtr, len) {
            var value = String(_this._getKey(id));
            value = value.substr(0, Math.min(value.length, len - 1));
            if (strPtr)
                strPtr.writeStringz(value);
            return 0;
        });
    }
    sceUtility.prototype._getKey = function (id) {
        switch (id) {
            case 2 /* INT_ADHOC_CHANNEL */:
                return 0 /* AUTOMATIC */;
            case 3 /* INT_WLAN_POWERSAVE */:
                return 1 /* ON */;
            case 4 /* INT_DATE_FORMAT */:
                return 0 /* YYYYMMDD */;
            case 5 /* INT_TIME_FORMAT */:
                return 0 /* _24HR */;
            case 6 /* INT_TIMEZONE */:
                return -5 * 60;
            case 7 /* INT_DAYLIGHTSAVINGS */:
                return 0 /* STD */;
            case 8 /* INT_LANGUAGE */:
                return 1 /* ENGLISH */;
            case 9 /* INT_BUTTON_PREFERENCE */:
                return 1 /* NA */;
            case 1 /* STRING_NICKNAME */:
                return "USERNAME";
        }
        throw (new Error("Invalid key " + id));
    };
    return sceUtility;
})();
exports.sceUtility = sceUtility;

var PSP_SYSTEMPARAM_ID;
(function (PSP_SYSTEMPARAM_ID) {
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["STRING_NICKNAME"] = 1] = "STRING_NICKNAME";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_ADHOC_CHANNEL"] = 2] = "INT_ADHOC_CHANNEL";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_WLAN_POWERSAVE"] = 3] = "INT_WLAN_POWERSAVE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_DATE_FORMAT"] = 4] = "INT_DATE_FORMAT";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_TIME_FORMAT"] = 5] = "INT_TIME_FORMAT";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_TIMEZONE"] = 6] = "INT_TIMEZONE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_DAYLIGHTSAVINGS"] = 7] = "INT_DAYLIGHTSAVINGS";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_LANGUAGE"] = 8] = "INT_LANGUAGE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_BUTTON_PREFERENCE"] = 9] = "INT_BUTTON_PREFERENCE";
})(PSP_SYSTEMPARAM_ID || (PSP_SYSTEMPARAM_ID = {}));

var DialogStepEnum;
(function (DialogStepEnum) {
    DialogStepEnum[DialogStepEnum["NONE"] = 0] = "NONE";
    DialogStepEnum[DialogStepEnum["INIT"] = 1] = "INIT";
    DialogStepEnum[DialogStepEnum["PROCESSING"] = 2] = "PROCESSING";
    DialogStepEnum[DialogStepEnum["SUCCESS"] = 3] = "SUCCESS";
    DialogStepEnum[DialogStepEnum["SHUTDOWN"] = 4] = "SHUTDOWN";
})(DialogStepEnum || (DialogStepEnum = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_ADHOC_CHANNEL
/// </summary>
var PSP_SYSTEMPARAM_ADHOC_CHANNEL;
(function (PSP_SYSTEMPARAM_ADHOC_CHANNEL) {
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["AUTOMATIC"] = 0] = "AUTOMATIC";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C1"] = 1] = "C1";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C6"] = 6] = "C6";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C11"] = 11] = "C11";
})(PSP_SYSTEMPARAM_ADHOC_CHANNEL || (PSP_SYSTEMPARAM_ADHOC_CHANNEL = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_WLAN_POWERSAVE
/// </summary>
var PSP_SYSTEMPARAM_WLAN_POWERSAVE;
(function (PSP_SYSTEMPARAM_WLAN_POWERSAVE) {
    PSP_SYSTEMPARAM_WLAN_POWERSAVE[PSP_SYSTEMPARAM_WLAN_POWERSAVE["OFF"] = 0] = "OFF";
    PSP_SYSTEMPARAM_WLAN_POWERSAVE[PSP_SYSTEMPARAM_WLAN_POWERSAVE["ON"] = 1] = "ON";
})(PSP_SYSTEMPARAM_WLAN_POWERSAVE || (PSP_SYSTEMPARAM_WLAN_POWERSAVE = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DATE_FORMAT
/// </summary>
var PSP_SYSTEMPARAM_DATE_FORMAT;
(function (PSP_SYSTEMPARAM_DATE_FORMAT) {
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["YYYYMMDD"] = 0] = "YYYYMMDD";
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["MMDDYYYY"] = 1] = "MMDDYYYY";
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["DDMMYYYY"] = 2] = "DDMMYYYY";
})(PSP_SYSTEMPARAM_DATE_FORMAT || (PSP_SYSTEMPARAM_DATE_FORMAT = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_TIME_FORMAT
/// </summary>
var PSP_SYSTEMPARAM_TIME_FORMAT;
(function (PSP_SYSTEMPARAM_TIME_FORMAT) {
    PSP_SYSTEMPARAM_TIME_FORMAT[PSP_SYSTEMPARAM_TIME_FORMAT["_24HR"] = 0] = "_24HR";
    PSP_SYSTEMPARAM_TIME_FORMAT[PSP_SYSTEMPARAM_TIME_FORMAT["_12HR"] = 1] = "_12HR";
})(PSP_SYSTEMPARAM_TIME_FORMAT || (PSP_SYSTEMPARAM_TIME_FORMAT = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DAYLIGHTSAVINGS
/// </summary>
var PSP_SYSTEMPARAM_DAYLIGHTSAVINGS;
(function (PSP_SYSTEMPARAM_DAYLIGHTSAVINGS) {
    PSP_SYSTEMPARAM_DAYLIGHTSAVINGS[PSP_SYSTEMPARAM_DAYLIGHTSAVINGS["STD"] = 0] = "STD";
    PSP_SYSTEMPARAM_DAYLIGHTSAVINGS[PSP_SYSTEMPARAM_DAYLIGHTSAVINGS["SAVING"] = 1] = "SAVING";
})(PSP_SYSTEMPARAM_DAYLIGHTSAVINGS || (PSP_SYSTEMPARAM_DAYLIGHTSAVINGS = {}));

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_LANGUAGE
/// </summary>
var PSP_SYSTEMPARAM_LANGUAGE;
(function (PSP_SYSTEMPARAM_LANGUAGE) {
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["JAPANESE"] = 0] = "JAPANESE";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["ENGLISH"] = 1] = "ENGLISH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["FRENCH"] = 2] = "FRENCH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["SPANISH"] = 3] = "SPANISH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["GERMAN"] = 4] = "GERMAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["ITALIAN"] = 5] = "ITALIAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["DUTCH"] = 6] = "DUTCH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["PORTUGUESE"] = 7] = "PORTUGUESE";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["RUSSIAN"] = 8] = "RUSSIAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["KOREAN"] = 9] = "KOREAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["CHINESE_TRADITIONAL"] = 10] = "CHINESE_TRADITIONAL";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["CHINESE_SIMPLIFIED"] = 11] = "CHINESE_SIMPLIFIED";
})(PSP_SYSTEMPARAM_LANGUAGE || (PSP_SYSTEMPARAM_LANGUAGE = {}));

/// <summary>
/// #9 seems to be Region or maybe X/O button swap.
/// It doesn't exist on JAP v1.0
/// is 1 on NA v1.5s
/// is 0 on JAP v1.5s
/// is read-only
/// </summary>
var PSP_SYSTEMPARAM_BUTTON_PREFERENCE;
(function (PSP_SYSTEMPARAM_BUTTON_PREFERENCE) {
    PSP_SYSTEMPARAM_BUTTON_PREFERENCE[PSP_SYSTEMPARAM_BUTTON_PREFERENCE["JAP"] = 0] = "JAP";
    PSP_SYSTEMPARAM_BUTTON_PREFERENCE[PSP_SYSTEMPARAM_BUTTON_PREFERENCE["NA"] = 1] = "NA";
})(PSP_SYSTEMPARAM_BUTTON_PREFERENCE || (PSP_SYSTEMPARAM_BUTTON_PREFERENCE = {}));

var PspLanguages;
(function (PspLanguages) {
    PspLanguages[PspLanguages["JAPANESE"] = 0] = "JAPANESE";
    PspLanguages[PspLanguages["ENGLISH"] = 1] = "ENGLISH";
    PspLanguages[PspLanguages["FRENCH"] = 2] = "FRENCH";
    PspLanguages[PspLanguages["SPANISH"] = 3] = "SPANISH";
    PspLanguages[PspLanguages["GERMAN"] = 4] = "GERMAN";
    PspLanguages[PspLanguages["ITALIAN"] = 5] = "ITALIAN";
    PspLanguages[PspLanguages["DUTCH"] = 6] = "DUTCH";
    PspLanguages[PspLanguages["PORTUGUESE"] = 7] = "PORTUGUESE";
    PspLanguages[PspLanguages["RUSSIAN"] = 8] = "RUSSIAN";
    PspLanguages[PspLanguages["KOREAN"] = 9] = "KOREAN";
    PspLanguages[PspLanguages["TRADITIONAL_CHINESE"] = 10] = "TRADITIONAL_CHINESE";
    PspLanguages[PspLanguages["SIMPLIFIED_CHINESE"] = 11] = "SIMPLIFIED_CHINESE";
})(PspLanguages || (PspLanguages = {}));

var PspModule;
(function (PspModule) {
    PspModule[PspModule["PSP_MODULE_NET_COMMON"] = 0x0100] = "PSP_MODULE_NET_COMMON";
    PspModule[PspModule["PSP_MODULE_NET_ADHOC"] = 0x0101] = "PSP_MODULE_NET_ADHOC";
    PspModule[PspModule["PSP_MODULE_NET_INET"] = 0x0102] = "PSP_MODULE_NET_INET";
    PspModule[PspModule["PSP_MODULE_NET_PARSEURI"] = 0x0103] = "PSP_MODULE_NET_PARSEURI";
    PspModule[PspModule["PSP_MODULE_NET_PARSEHTTP"] = 0x0104] = "PSP_MODULE_NET_PARSEHTTP";
    PspModule[PspModule["PSP_MODULE_NET_HTTP"] = 0x0105] = "PSP_MODULE_NET_HTTP";
    PspModule[PspModule["PSP_MODULE_NET_SSL"] = 0x0106] = "PSP_MODULE_NET_SSL";

    // USB Modules
    PspModule[PspModule["PSP_MODULE_USB_PSPCM"] = 0x0200] = "PSP_MODULE_USB_PSPCM";
    PspModule[PspModule["PSP_MODULE_USB_MIC"] = 0x0201] = "PSP_MODULE_USB_MIC";
    PspModule[PspModule["PSP_MODULE_USB_CAM"] = 0x0202] = "PSP_MODULE_USB_CAM";
    PspModule[PspModule["PSP_MODULE_USB_GPS"] = 0x0203] = "PSP_MODULE_USB_GPS";

    // Audio/video Modules
    PspModule[PspModule["PSP_MODULE_AV_AVCODEC"] = 0x0300] = "PSP_MODULE_AV_AVCODEC";
    PspModule[PspModule["PSP_MODULE_AV_SASCORE"] = 0x0301] = "PSP_MODULE_AV_SASCORE";
    PspModule[PspModule["PSP_MODULE_AV_ATRAC3PLUS"] = 0x0302] = "PSP_MODULE_AV_ATRAC3PLUS";
    PspModule[PspModule["PSP_MODULE_AV_MPEGBASE"] = 0x0303] = "PSP_MODULE_AV_MPEGBASE";
    PspModule[PspModule["PSP_MODULE_AV_MP3"] = 0x0304] = "PSP_MODULE_AV_MP3";
    PspModule[PspModule["PSP_MODULE_AV_VAUDIO"] = 0x0305] = "PSP_MODULE_AV_VAUDIO";
    PspModule[PspModule["PSP_MODULE_AV_AAC"] = 0x0306] = "PSP_MODULE_AV_AAC";
    PspModule[PspModule["PSP_MODULE_AV_G729"] = 0x0307] = "PSP_MODULE_AV_G729";

    // NP
    PspModule[PspModule["PSP_MODULE_NP_COMMON"] = 0x0400] = "PSP_MODULE_NP_COMMON";
    PspModule[PspModule["PSP_MODULE_NP_SERVICE"] = 0x0401] = "PSP_MODULE_NP_SERVICE";
    PspModule[PspModule["PSP_MODULE_NP_MATCHING2"] = 0x0402] = "PSP_MODULE_NP_MATCHING2";

    PspModule[PspModule["PSP_MODULE_NP_DRM"] = 0x0500] = "PSP_MODULE_NP_DRM";

    // IrDA
    PspModule[PspModule["PSP_MODULE_IRDA"] = 0x0600] = "PSP_MODULE_IRDA";
})(PspModule || (PspModule = {}));

var PspUtilityDialogCommon = (function () {
    function PspUtilityDialogCommon() {
        this.size = 0;
        this.language = 1 /* ENGLISH */;
        this.buttonSwap = 0;
        this.graphicsThread = 0;
        this.accessThread = 0;
        this.fontThread = 0;
        this.soundThread = 0;
        this.result = 0 /* ERROR_OK */;
        this.reserved = [0, 0, 0, 0];
    }
    PspUtilityDialogCommon.struct = StructClass.create(PspUtilityDialogCommon, [
        { size: Int32 },
        { language: Int32 },
        { buttonSwap: Int32 },
        { graphicsThread: Int32 },
        { accessThread: Int32 },
        { fontThread: Int32 },
        { soundThread: Int32 },
        { result: Int32 },
        { reserved: StructArray(Int32, 4) }
    ]);
    return PspUtilityDialogCommon;
})();

var PspUtilitySavedataMode;
(function (PspUtilitySavedataMode) {
    PspUtilitySavedataMode[PspUtilitySavedataMode["Autoload"] = 0] = "Autoload";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Autosave"] = 1] = "Autosave";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Load"] = 2] = "Load";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Save"] = 3] = "Save";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListLoad"] = 4] = "ListLoad";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListSave"] = 5] = "ListSave";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListDelete"] = 6] = "ListDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Delete"] = 7] = "Delete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Sizes"] = 8] = "Sizes";
    PspUtilitySavedataMode[PspUtilitySavedataMode["AutoDelete"] = 9] = "AutoDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["SingleDelete"] = 10] = "SingleDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["List"] = 11] = "List";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Files"] = 12] = "Files";
    PspUtilitySavedataMode[PspUtilitySavedataMode["MakeDataSecure"] = 13] = "MakeDataSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["MakeData"] = 14] = "MakeData";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ReadSecure"] = 15] = "ReadSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Read"] = 16] = "Read";
    PspUtilitySavedataMode[PspUtilitySavedataMode["WriteSecure"] = 17] = "WriteSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Write"] = 18] = "Write";
    PspUtilitySavedataMode[PspUtilitySavedataMode["EraseSecure"] = 19] = "EraseSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Erase"] = 20] = "Erase";
    PspUtilitySavedataMode[PspUtilitySavedataMode["DeleteData"] = 21] = "DeleteData";
    PspUtilitySavedataMode[PspUtilitySavedataMode["GetSize"] = 22] = "GetSize";
})(PspUtilitySavedataMode || (PspUtilitySavedataMode = {}));

var PspUtilitySavedataFocus;
(function (PspUtilitySavedataFocus) {
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN"] = 0] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_FIRSTLIST"] = 1] = "PSP_UTILITY_SAVEDATA_FOCUS_FIRSTLIST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LASTLIST"] = 2] = "PSP_UTILITY_SAVEDATA_FOCUS_LASTLIST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LATEST"] = 3] = "PSP_UTILITY_SAVEDATA_FOCUS_LATEST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_OLDEST"] = 4] = "PSP_UTILITY_SAVEDATA_FOCUS_OLDEST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN2"] = 5] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN2";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN3"] = 6] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN3";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_FIRSTEMPTY"] = 7] = "PSP_UTILITY_SAVEDATA_FOCUS_FIRSTEMPTY";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LASTEMPTY"] = 8] = "PSP_UTILITY_SAVEDATA_FOCUS_LASTEMPTY";
})(PspUtilitySavedataFocus || (PspUtilitySavedataFocus = {}));

var PspUtilitySavedataFileData = (function () {
    function PspUtilitySavedataFileData() {
        this.bufferPointer = 0;
        this.bufferSize = 0;
        this.size = 0;
        this.unknown = 0;
    }
    Object.defineProperty(PspUtilitySavedataFileData.prototype, "used", {
        get: function () {
            if (this.bufferPointer == 0)
                return false;

            //if (BufferSize == 0) return false;
            if (this.size == 0)
                return false;
            return true;
        },
        enumerable: true,
        configurable: true
    });

    PspUtilitySavedataFileData.struct = StructClass.create(PspUtilitySavedataFileData, [
        { bufferPointer: Int32 },
        { bufferSize: Int32 },
        { size: Int32 },
        { unknown: Int32 }
    ]);
    return PspUtilitySavedataFileData;
})();

var PspUtilitySavedataSFOParam = (function () {
    function PspUtilitySavedataSFOParam() {
        this.title = '';
        this.savedataTitle = '';
        this.detail = '';
        this.parentalLevel = 0;
        this.unknown = [0, 0, 0];
    }
    PspUtilitySavedataSFOParam.struct = StructClass.create(PspUtilitySavedataSFOParam, [
        { title: Stringz(0x80) },
        { savedataTitle: Stringz(0x80) },
        { detail: Stringz(0x400) },
        { parentalLevel: UInt8 },
        { unknown: StructArray(UInt8, 3) }
    ]);
    return PspUtilitySavedataSFOParam;
})();

var SceUtilitySavedataParam = (function () {
    function SceUtilitySavedataParam() {
        this.base = new PspUtilityDialogCommon();
        this.mode = 0;
        this.unknown1 = 0;
        this.overwrite = 0;
        this.gameName = '';
        this.saveName = '';
        this.saveNameListPointer = 0;
        this.fileName = '';
        this.dataBufPointer = 0;
        this.dataBufSize = 0;
        this.dataSize = 0;
        this.sfoParam = new PspUtilitySavedataSFOParam();
        this.icon0FileData = new PspUtilitySavedataFileData();
        this.icon1FileData = new PspUtilitySavedataFileData();
        this.pic1FileData = new PspUtilitySavedataFileData();
        this.snd0FileData = new PspUtilitySavedataFileData();
        this.newDataPointer = 0;
        this.focus = 0 /* PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN */;
        this.abortStatus = 0;
        this.msFreeAddr = 0;
        this.msDataAddr = 0;
        this.utilityDataAddr = 0;
        //#if _PSP_FW_VERSION >= 200
        this.key = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.secureVersion = 0;
        this.multiStatus = 0;
        this.idListAddr = 0;
        this.fileListAddr = 0;
        this.sizeAddr = 0;
        this.unknown3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    SceUtilitySavedataParam.struct = StructClass.create(SceUtilitySavedataParam, [
        { base: PspUtilityDialogCommon.struct },
        { mode: Int32 },
        { unknown1: Int32 },
        { overwrite: Int32 },
        { gameName: Stringz(16) },
        { saveName: Stringz(20) },
        { saveNameListPointer: UInt32 },
        { fileName: Stringz(16) },
        { dataBufPointer: UInt32 },
        { dataBufSize: UInt32 },
        { dataSize: UInt32 },
        { sfoParam: PspUtilitySavedataSFOParam.struct },
        { icon0FileData: PspUtilitySavedataFileData.struct },
        { icon1FileData: PspUtilitySavedataFileData.struct },
        { pic1FileData: PspUtilitySavedataFileData.struct },
        { snd0FileData: PspUtilitySavedataFileData.struct },
        { newDataPointer: UInt32 },
        { focus: UInt32 },
        { abortStatus: UInt32 },
        { msFreeAddr: UInt32 },
        { msDataAddr: UInt32 },
        { utilityDataAddr: UInt32 },
        { key: StructArray(UInt8, 16) },
        { secureVersion: UInt32 },
        { multiStatus: UInt32 },
        { idListAddr: UInt32 },
        { fileListAddr: UInt32 },
        { sizeAddr: UInt32 },
        { unknown3: StructArray(UInt8, 20 - 5) }
    ]);
    return SceUtilitySavedataParam;
})();
//# sourceMappingURL=sceUtility.js.map
},
"src/hle/module/sceVaudio": function(module, exports, require) {
var sceVaudio = (function () {
    function sceVaudio(context) {
        this.context = context;
    }
    return sceVaudio;
})();
exports.sceVaudio = sceVaudio;
//# sourceMappingURL=sceVaudio.js.map
},
"src/hle/module/sceWlanDrv": function(module, exports, require) {
var sceWlanDrv = (function () {
    function sceWlanDrv(context) {
        this.context = context;
    }
    return sceWlanDrv;
})();
exports.sceWlanDrv = sceWlanDrv;
//# sourceMappingURL=sceWlanDrv.js.map
},
"src/hle/module/threadman/ThreadManForUser": function(module, exports, require) {
var _utils = require('../../utils');

var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');
_manager.Thread;

var CpuSpecialAddresses = _cpu.CpuSpecialAddresses;

var Thread = _manager.Thread;
var ThreadStatus = _manager.ThreadStatus;
var PspThreadAttributes = _manager.PspThreadAttributes;
var OutOfMemoryError = _manager.OutOfMemoryError;

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.threadUids = new UidCollection(1);
        this.sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'int', 'Thread/string/uint/int/int/int/int', this, function (currentThread, name, entryPoint, initPriority, stackSize, attributes, optionPtr) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;
            if (stackSize < 0x200)
                return 2147615124 /* ERROR_KERNEL_ILLEGAL_STACK_SIZE */;
            if (initPriority < 0x08 || initPriority > 0x77)
                return 2147615123 /* ERROR_KERNEL_ILLEGAL_PRIORITY */;

            if (!_this.context.memory.isValidAddress(entryPoint) || entryPoint == 0)
                return 2147615122 /* ERROR_KERNEL_ILLEGAL_THREAD_ENTRY_ADDR */;
            if (name.length > 31)
                name = name.substr(0, 31);
            if (stackSize > 2 * 1024 * 1024)
                return -3;
            if ((attributes & (~PspThreadAttributes.ValidMask)) != 0) {
                //console.log(sprintf('Invalid mask %08X, %08X, %08X', attributes, PspThreadAttributes.ValidMask, (attributes & (~PspThreadAttributes.ValidMask))));
                return 2147615121 /* ERROR_KERNEL_ILLEGAL_ATTR */;
            }

            attributes |= 2147483648 /* User */;
            attributes |= 255 /* LowFF */;

            try  {
                stackSize = Math.max(stackSize, 0x200); // 512 byte min. (required for interrupts)
                stackSize = MathUtils.nextAligned(stackSize, 0x100); // Aligned to 256 bytes.

                var newThread = _this.context.threadManager.create(name, entryPoint, initPriority, stackSize, attributes);
                newThread.id = _this.threadUids.allocate(newThread);
                newThread.status = 16 /* DORMANT */;

                newThread.state.GP = currentThread.state.GP;

                console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d, entryPC=%08X', newThread.id, newThread.name, newThread.priority, currentThread.priority, entryPoint));

                return newThread.id;
                //return Promise.resolve(newThread.id);
            } catch (e) {
                if (e instanceof OutOfMemoryError)
                    return 2147615120 /* ERROR_KERNEL_NO_MEMORY */;
                throw (e);
            }
        });
        this.sceKernelDelayThread = createNativeFunction(0xCEADEB47, 150, 'uint', 'Thread/uint', this, function (thread, delayInMicroseconds) {
            return _this._sceKernelDelayThreadCB(thread, delayInMicroseconds, 0 /* NO */);
        });
        this.sceKernelDelayThreadCB = createNativeFunction(0x68DA9E36, 150, 'uint', 'Thread/uint', this, function (thread, delayInMicroseconds) {
            return _this._sceKernelDelayThreadCB(thread, delayInMicroseconds, 1 /* YES */);
        });
        this.sceKernelWaitThreadEndCB = createNativeFunction(0x840E8133, 150, 'uint', 'uint/void*', this, function (threadId, timeoutPtr) {
            return _this.getThreadById(threadId).waitEndAsync().then(function () {
                return 0;
            });
        });
        this.sceKernelWaitThreadEnd = createNativeFunction(0x278C0DF5, 150, 'uint', 'uint/void*', this, function (threadId, timeoutPtr) {
            return _this.getThreadById(threadId).waitEndAsync().then(function () {
                return 0;
            });
        });
        this.sceKernelGetThreadCurrentPriority = createNativeFunction(0x94AA61EE, 150, 'int', 'Thread', this, function (currentThread) {
            return currentThread.priority;
        });
        this.sceKernelStartThread = createNativeFunction(0xF475845D, 150, 'uint', 'Thread/int/int/int', this, function (currentThread, threadId, userDataLength, userDataPointer) {
            var newThread = _this.getThreadById(threadId);

            //if (!newThread) debugger;
            var newState = newThread.state;
            newState.setRA(268435455 /* EXIT_THREAD */);

            var copiedDataAddress = ((newThread.stackPartition.high - 0x100) - ((userDataLength + 0xF) & ~0xF));

            if (userDataPointer != null) {
                newState.memory.copy(userDataPointer, copiedDataAddress, userDataLength);
                newState.gpr[4] = userDataLength;
                newState.gpr[5] = copiedDataAddress;
            }

            newState.SP = copiedDataAddress - 0x40;

            console.info(sprintf('sceKernelStartThread: %d:"%s":priority=%d, currentPriority=%d, SP=%08X, GP=%08X, FP=%08X', threadId, newThread.name, newThread.priority, currentThread.priority, newState.SP, newState.GP, newState.FP));

            newThread.start();
            return Promise.resolve(0);
        });
        this.sceKernelChangeThreadPriority = createNativeFunction(0x71BC9871, 150, 'uint', 'Thread/int/int', this, function (currentThread, threadId, priority) {
            var thread = _this.getThreadById(threadId);
            thread.priority = priority;
            return Promise.resolve(0);
        });
        this.sceKernelExitThread = createNativeFunction(0xAA73C935, 150, 'int', 'Thread/int', this, function (currentThread, exitStatus) {
            console.info(sprintf('sceKernelExitThread: %d', exitStatus));

            currentThread.exitStatus = exitStatus;
            currentThread.stop();
            throw (new CpuBreakException());
        });
        this.sceKernelGetThreadExitStatus = createNativeFunction(0x3B183E26, 150, 'int', 'int', this, function (threadId) {
            var thread = _this.getThreadById(threadId);
            return thread.exitStatus;
        });
        this.sceKernelDeleteThread = createNativeFunction(0x9FA03CD3, 150, 'int', 'int', this, function (threadId) {
            return _this._sceKernelDeleteThread(threadId);
        });
        this.sceKernelTerminateThread = createNativeFunction(0x616403BA, 150, 'int', 'int', this, function (threadId) {
            console.info(sprintf('sceKernelTerminateThread: %d', threadId));

            return _this._sceKernelTerminateThread(threadId);
        });
        this.sceKernelExitDeleteThread = createNativeFunction(0x809CE29B, 150, 'uint', 'Thread/int', this, function (currentThread, exitStatus) {
            currentThread.exitStatus = exitStatus;
            currentThread.stop();
            throw (new CpuBreakException());
        });
        this.sceKernelTerminateDeleteThread = createNativeFunction(0x383F7BCC, 150, 'int', 'int', this, function (threadId) {
            _this._sceKernelTerminateThread(threadId);
            _this._sceKernelDeleteThread(threadId);
            return 0;
        });
        this.sceKernelSleepThreadCB = createNativeFunction(0x82826F70, 150, 'uint', 'Thread', this, function (currentThread) {
            return currentThread.wakeupSleepAsync(1 /* YES */);
        });
        this.sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'Thread', this, function (currentThread) {
            return currentThread.wakeupSleepAsync(0 /* NO */);
        });
        this.sceKernelWakeupThread = createNativeFunction(0xD59EAD2F, 150, 'uint', 'int', this, function (threadId) {
            var thread = _this.getThreadById(threadId);
            return thread.wakeupWakeupAsync();
        });
        this.sceKernelGetSystemTimeLow = createNativeFunction(0x369ED59D, 150, 'uint', '', this, function () {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return _this._getCurrentMicroseconds();
        });
        this.sceKernelGetSystemTimeWide = createNativeFunction(0x82BC5777, 150, 'long', '', this, function () {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return Integer64.fromNumber(_this._getCurrentMicroseconds());
        });
        this.sceKernelGetThreadId = createNativeFunction(0x293B45B8, 150, 'int', 'Thread', this, function (currentThread) {
            return currentThread.id;
        });
        this.sceKernelSuspendThread = createNativeFunction(0x9944F31F, 150, 'int', 'int', this, function (threadId) {
            _this.getThreadById(threadId).suspend();
            return 0;
        });
        this.sceKernelResumeThread = createNativeFunction(0x75156E8F, 150, 'int', 'int', this, function (threadId) {
            _this.getThreadById(threadId).resume();
            return 0;
        });
        this.sceKernelReferThreadStatus = createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, function (threadId, sceKernelThreadInfoPtr) {
            if (threadId == 0)
                return 0;

            var thread = _this.getThreadById(threadId);

            var info = new SceKernelThreadInfo();

            info.size = SceKernelThreadInfo.struct.length;

            info.name = thread.name;
            info.attributes = thread.attributes;
            info.status = thread.status;
            info.threadPreemptionCount = thread.preemptionCount;
            info.entryPoint = thread.entryPoint;
            info.stackPointer = thread.stackPartition.high;
            info.stackSize = thread.stackPartition.size;
            info.GP = thread.state.GP;

            info.priorityInit = thread.initialPriority;
            info.priority = thread.priority;
            info.waitType = 0;
            info.waitId = 0;
            info.wakeupCount = 0;
            info.exitStatus = thread.exitStatus;
            info.runClocksLow = 0;
            info.runClocksHigh = 0;
            info.interruptPreemptionCount = 0;
            info.threadPreemptionCount = 0;
            info.releaseCount = 0;

            SceKernelThreadInfo.struct.write(sceKernelThreadInfoPtr, info);

            return 0;
        });
        this.sceKernelChangeCurrentThreadAttr = createNativeFunction(0xEA748E31, 150, 'int', 'uint/uint/uint', this, function (currentThread, removeAttributes, addAttributes) {
            currentThread.attributes &= ~removeAttributes;
            currentThread.attributes |= addAttributes;
            return 0;
        });
        this.sceKernelUSec2SysClockWide = createNativeFunction(0xC8CD158C, 150, 'int', 'uint', this, function (microseconds) {
            return microseconds;
        });
    }
    ThreadManForUser.prototype.getThreadById = function (id) {
        if (!this.threadUids.has(id))
            throw (new SceKernelException(2147615128 /* ERROR_KERNEL_NOT_FOUND_THREAD */));
        return this.threadUids.get(id);
    };

    ThreadManForUser.prototype._sceKernelDelayThreadCB = function (thread, delayInMicroseconds, acceptCallbacks) {
        return new WaitingThreadInfo('_sceKernelDelayThreadCB', 'microseconds:' + delayInMicroseconds, thread.delayMicrosecondsAsync(delayInMicroseconds), acceptCallbacks);
    };

    ThreadManForUser.prototype._sceKernelTerminateThread = function (threadId) {
        var newThread = this.getThreadById(threadId);
        newThread.stop();
        newThread.exitStatus = 0x800201ac;
        return 0;
    };

    ThreadManForUser.prototype._sceKernelDeleteThread = function (threadId) {
        var newThread = this.getThreadById(threadId);
        newThread.delete();
        this.threadUids.remove(threadId);
        return 0;
    };

    ThreadManForUser.prototype._getCurrentMicroseconds = function () {
        return this.context.rtc.getCurrentUnixMicroseconds();
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;

var SceKernelThreadInfo = (function () {
    function SceKernelThreadInfo() {
    }
    SceKernelThreadInfo.struct = StructClass.create(SceKernelThreadInfo, [
        { size: Int32 },
        { name: Stringz(32) },
        { attributes: UInt32 },
        { status: UInt32 },
        { entryPoint: UInt32 },
        { stackPointer: UInt32 },
        { stackSize: Int32 },
        { GP: UInt32 },
        { priorityInit: Int32 },
        { priority: Int32 },
        { waitType: UInt32 },
        { waitId: Int32 },
        { wakeupCount: Int32 },
        { exitStatus: Int32 },
        { runClocksLow: Int32 },
        { runClocksHigh: Int32 },
        { interruptPreemptionCount: Int32 },
        { threadPreemptionCount: Int32 },
        { releaseCount: Int32 }
    ]);
    return SceKernelThreadInfo;
})();
//# sourceMappingURL=ThreadManForUser.js.map
},
"src/hle/module/threadman/ThreadManForUser_callbacks": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;

var _manager = require('../../manager');
_manager.Thread;

var Callback = _manager.Callback;

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelCreateCallback = createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, function (name, functionCallbackAddr, argument) {
            return _this.context.callbackManager.register(new Callback(name, functionCallbackAddr, argument));
        });
        this.sceKernelDeleteCallback = createNativeFunction(0xEDBA5844, 150, 'uint', 'int', this, function (callbackId) {
            _this.context.callbackManager.remove(callbackId);
        });
        /**
        * Run all peding callbacks and return if executed any.
        * Callbacks cannot be executed inside a interrupt.
        * @return 0 no reported callbacks; 1 reported callbacks which were executed successfully.
        */
        this.sceKernelCheckCallback = createNativeFunction(0x349D6D6C, 150, 'uint', 'Thread', this, function (thread) {
            //console.warn('Not implemented ThreadManForUser.sceKernelCheckCallback');
            return _this.context.callbackManager.executePendingWithinThread(thread) ? 1 : 0;
        });
        this.sceKernelNotifyCallback = createNativeFunction(0xC11BA8C4, 150, 'uint', 'Thread/int/int', this, function (thread, callbackId, argument2) {
            return _this.context.callbackManager.notify(callbackId, argument2);
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
//# sourceMappingURL=ThreadManForUser_callbacks.js.map
},
"src/hle/module/threadman/ThreadManForUser_eventflag": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.eventFlagUids = new UidCollection(1);
        this.sceKernelCreateEventFlag = createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, function (name, attributes, bitPattern, optionsPtr) {
            if (name === null)
                return 2147614721 /* ERROR_ERROR */;
            if ((attributes & 0x100) != 0 || attributes >= 0x300)
                return 2147615121 /* ERROR_KERNEL_ILLEGAL_ATTR */;

            //console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
            var eventFlag = new EventFlag();
            eventFlag.name = name;
            eventFlag.attributes = attributes;
            eventFlag.initialPattern = bitPattern;
            eventFlag.currentPattern = bitPattern;
            return _this.eventFlagUids.allocate(eventFlag);
        });
        this.sceKernelSetEventFlag = createNativeFunction(0x1FB15A32, 150, 'uint', 'int/uint', this, function (id, bitPattern) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).setBits(bitPattern);
            return 0;
        });
        this.sceKernelWaitEventFlag = createNativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*', this, function (id, bits, waitType, outBits, timeout) {
            return _this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, 0 /* NO */);
        });
        this.sceKernelWaitEventFlagCB = createNativeFunction(0x328C546A, 150, 'uint', 'int/uint/int/void*/void*', this, function (id, bits, waitType, outBits, timeout) {
            return _this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, 1 /* YES */);
        });
        this.sceKernelPollEventFlag = createNativeFunction(0x30FD48F0, 150, 'uint', 'int/uint/int/void*', this, function (id, bits, waitType, outBits) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0)
                return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
            if ((waitType & (32 /* Clear */ | 16 /* ClearAll */)) == (32 /* Clear */ | 16 /* ClearAll */)) {
                return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
            }
            if (bits == 0)
                return 2147615153 /* ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN */;
            if (EventFlag == null)
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;

            var matched = _this.eventFlagUids.get(id).poll(bits, waitType, outBits);

            return matched ? 0 : 2147615151 /* ERROR_KERNEL_EVENT_FLAG_POLL_FAILED */;
        });
        this.sceKernelDeleteEventFlag = createNativeFunction(0xEF9E4C70, 150, 'uint', 'int', this, function (id) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.remove(id);
            return 0;
        });
        this.sceKernelClearEventFlag = createNativeFunction(0x812346E4, 150, 'uint', 'int/uint', this, function (id, bitsToClear) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).clearBits(bitsToClear);
            return 0;
        });
        this.sceKernelCancelEventFlag = createNativeFunction(0xCD203292, 150, 'uint', 'int/uint/void*', this, function (id, newPattern, numWaitThreadPtr) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).cancel(newPattern);
            return 0;
        });
        this.sceKernelReferEventFlagStatus = createNativeFunction(0xA66B0120, 150, 'uint', 'int/void*', this, function (id, infoPtr) {
            var size = infoPtr.readUInt32();
            if (size == 0)
                return 0;

            infoPtr.position = 0;
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            var eventFlag = _this.eventFlagUids.get(id);
            var info = new EventFlagInfo();
            info.size = EventFlagInfo.struct.length;
            info.name = eventFlag.name;
            info.currentPattern = eventFlag.currentPattern;
            info.initialPattern = eventFlag.initialPattern;
            info.attributes = eventFlag.attributes;
            info.numberOfWaitingThreads = eventFlag.waitingThreads.length;
            EventFlagInfo.struct.write(infoPtr, info);
            console.warn('Not implemented ThreadManForUser.sceKernelReferEventFlagStatus');
            return 0;
        });
    }
    ThreadManForUser.prototype._sceKernelWaitEventFlagCB = function (id, bits, waitType, outBits, timeout, acceptCallbacks) {
        if (!this.eventFlagUids.has(id))
            return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
        var eventFlag = this.eventFlagUids.get(id);

        if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0)
            return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
        if (bits == 0)
            return 2147615153 /* ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN */;
        var timedOut = false;
        var previousPattern = eventFlag.currentPattern;
        return new WaitingThreadInfo('_sceKernelWaitEventFlagCB', eventFlag, eventFlag.waitAsync(bits, waitType, outBits, timeout, acceptCallbacks).then(function () {
            if (outBits != null)
                outBits.writeUInt32(previousPattern);
            return 0;
        }), acceptCallbacks);
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;

var EventFlagWaitingThread = (function () {
    function EventFlagWaitingThread(bitsToMatch, waitType, outBits, eventFlag, wakeUp) {
        this.bitsToMatch = bitsToMatch;
        this.waitType = waitType;
        this.outBits = outBits;
        this.eventFlag = eventFlag;
        this.wakeUp = wakeUp;
    }
    return EventFlagWaitingThread;
})();

var EventFlag = (function () {
    function EventFlag() {
        this.waitingThreads = new SortedSet();
    }
    EventFlag.prototype.waitAsync = function (bits, waitType, outBits, timeout, callbacks) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, _this, function () {
                _this.waitingThreads.delete(waitingSemaphoreThread);
                resolve();
                throw (new CpuBreakException());
            });
            _this.waitingThreads.add(waitingSemaphoreThread);
        }).then(function () {
            return 0;
        });
    };

    EventFlag.prototype.poll = function (bitsToMatch, waitType, outBits) {
        if (outBits != null)
            outBits.writeInt32(this.currentPattern);

        if ((waitType & 1 /* Or */) ? ((this.currentPattern & bitsToMatch) != 0) : ((this.currentPattern & bitsToMatch) == bitsToMatch)) {
            this._doClear(bitsToMatch, waitType);
            return true;
        }

        return false;
    };

    EventFlag.prototype._doClear = function (bitsToMatch, waitType) {
        if (waitType & (16 /* ClearAll */))
            this.clearBits(~0xFFFFFFFF, false);
        if (waitType & (32 /* Clear */))
            this.clearBits(~bitsToMatch, false);
    };

    EventFlag.prototype.cancel = function (newPattern) {
        this.waitingThreads.forEach(function (item) {
            item.wakeUp();
        });
    };

    EventFlag.prototype.clearBits = function (bitsToClear, doUpdateWaitingThreads) {
        if (typeof doUpdateWaitingThreads === "undefined") { doUpdateWaitingThreads = true; }
        this.currentPattern &= bitsToClear;
        if (doUpdateWaitingThreads)
            this.updateWaitingThreads();
    };

    EventFlag.prototype.setBits = function (bits, doUpdateWaitingThreads) {
        if (typeof doUpdateWaitingThreads === "undefined") { doUpdateWaitingThreads = true; }
        this.currentPattern |= bits;
        if (doUpdateWaitingThreads)
            this.updateWaitingThreads();
    };

    EventFlag.prototype.updateWaitingThreads = function () {
        var _this = this;
        this.waitingThreads.forEach(function (waitingThread) {
            if (_this.poll(waitingThread.bitsToMatch, waitingThread.waitType, waitingThread.outBits)) {
                waitingThread.wakeUp();
            }
        });
    };
    return EventFlag;
})();

var EventFlagInfo = (function () {
    function EventFlagInfo() {
    }
    EventFlagInfo.struct = StructClass.create(EventFlagInfo, [
        { size: Int32 },
        { name: Stringz(32) },
        { attributes: Int32 },
        { initialPattern: UInt32 },
        { currentPattern: UInt32 },
        { numberOfWaitingThreads: Int32 }
    ]);
    return EventFlagInfo;
})();

var EventFlagWaitTypeSet;
(function (EventFlagWaitTypeSet) {
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["And"] = 0x00] = "And";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["Or"] = 0x01] = "Or";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["ClearAll"] = 0x10] = "ClearAll";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["Clear"] = 0x20] = "Clear";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["MaskValidBits"] = EventFlagWaitTypeSet.Or | EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll] = "MaskValidBits";
})(EventFlagWaitTypeSet || (EventFlagWaitTypeSet = {}));
//# sourceMappingURL=ThreadManForUser_eventflag.js.map
},
"src/hle/module/threadman/ThreadManForUser_mutex": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        this.context = context;
        this.sceKernelCreateMutex = createNativeFunction(0xB7D098C6, 150, 'int', 'string/int/int', this, function (name, attribute, options) {
            return -1;
        });
        this.sceKernelLockMutexCB = createNativeFunction(0x5BF4DD27, 150, 'int', 'int/int/void*', this, function (mutexId, count, timeout) {
            return -1;
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
//# sourceMappingURL=ThreadManForUser_mutex.js.map
},
"src/hle/module/threadman/ThreadManForUser_sema": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.semaporesUid = new UidCollection(1);
        this.sceKernelCreateSema = createNativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*', this, function (name, attribute, initialCount, maxCount, options) {
            var semaphore = new Semaphore(name, attribute, initialCount, maxCount);
            var id = _this.semaporesUid.allocate(semaphore);
            semaphore.id = id;
            console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d) -> %d', name, attribute, initialCount, maxCount, id));
            return id;
        });
        this.sceKernelDeleteSema = createNativeFunction(0x28B6489C, 150, 'int', 'int', this, function (id) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            semaphore.delete();
            _this.semaporesUid.remove(id);
            return 0;
        });
        this.sceKernelCancelSema = createNativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*', this, function (id, count, numWaitingThreadsPtr) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            if (numWaitingThreadsPtr)
                numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
            semaphore.cancel();
            return 0;
        });
        this.sceKernelWaitSemaCB = createNativeFunction(0x6D212BAC, 150, 'int', 'Thread/int/int/void*', this, function (currentThread, id, signal, timeout) {
            return _this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, 1 /* YES */);
        });
        this.sceKernelWaitSema = createNativeFunction(0x4E3A1105, 150, 'int', 'Thread/int/int/void*', this, function (currentThread, id, signal, timeout) {
            return _this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, 0 /* NO */);
        });
        this.sceKernelReferSemaStatus = createNativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*', this, function (id, infoStream) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            var semaphoreInfo = new SceKernelSemaInfo();
            semaphoreInfo.size = SceKernelSemaInfo.struct.length;
            semaphoreInfo.attributes = semaphore.attributes;
            semaphoreInfo.currentCount = semaphore.currentCount;
            semaphoreInfo.initialCount = semaphore.initialCount;
            semaphoreInfo.maximumCount = semaphore.maximumCount;
            semaphoreInfo.name = semaphore.name;
            semaphoreInfo.numberOfWaitingThreads = semaphore.numberOfWaitingThreads;
            SceKernelSemaInfo.struct.write(infoStream, semaphoreInfo);
            return 0;
        });
        this.sceKernelSignalSema = createNativeFunction(0x3F53E640, 150, 'int', 'Thread/int/int', this, function (currentThread, id, signal) {
            //console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d) : Thread("%s")', id, signal, currentThread.name));
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            var previousCount = semaphore.currentCount;
            if (semaphore.currentCount + signal > semaphore.maximumCount)
                return 2147615150 /* ERROR_KERNEL_SEMA_OVERFLOW */;
            var awakeCount = semaphore.incrementCount(signal);

            //console.info(sprintf(': awakeCount %d, previousCount: %d, currentCountAfterSignal: %d', awakeCount, previousCount, semaphore.currentCount));
            if (awakeCount > 0) {
                return Promise.resolve(0);
            } else {
                return 0;
            }
        });
        this.sceKernelPollSema = createNativeFunction(0x58B1F937, 150, 'int', 'Thread/int/int', this, function (currentThread, id, signal) {
            var semaphore = _this.semaporesUid.get(id);
            if (signal <= 0)
                return 2147615165 /* ERROR_KERNEL_ILLEGAL_COUNT */;
            if (signal > semaphore.currentCount)
                return 2147615149 /* ERROR_KERNEL_SEMA_ZERO */;
            semaphore.incrementCount(-signal);
            return 0;
        });
    }
    ThreadManForUser.prototype._sceKernelWaitSemaCB = function (currentThread, id, signal, timeout, acceptCallbacks) {
        //console.warn(sprintf('Not implemented ThreadManForUser._sceKernelWaitSemaCB(%d, %d) :: Thread("%s")', id, signal, currentThread.name));
        if (!this.semaporesUid.has(id))
            return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
        var semaphore = this.semaporesUid.get(id);
        var promise = semaphore.waitAsync(currentThread, signal);
        if (promise) {
            return new WaitingThreadInfo('sceKernelWaitSema', semaphore, promise, acceptCallbacks);
        } else {
            return 0;
        }
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;

var SceKernelSemaInfo = (function () {
    function SceKernelSemaInfo() {
    }
    SceKernelSemaInfo.struct = StructClass.create(SceKernelSemaInfo, [
        { size: Int32 },
        { name: Stringz(32) },
        { attributes: Int32 },
        { initialCount: Int32 },
        { currentCount: Int32 },
        { maximumCount: Int32 },
        { numberOfWaitingThreads: Int32 }
    ]);
    return SceKernelSemaInfo;
})();

var WaitingSemaphoreThread = (function () {
    function WaitingSemaphoreThread(expectedCount, wakeUp) {
        this.expectedCount = expectedCount;
        this.wakeUp = wakeUp;
    }
    return WaitingSemaphoreThread;
})();

var Semaphore = (function () {
    function Semaphore(name, attributes, initialCount, maximumCount) {
        this.name = name;
        this.attributes = attributes;
        this.initialCount = initialCount;
        this.maximumCount = maximumCount;
        this.waitingSemaphoreThreadList = new SortedSet();
        this.currentCount = initialCount;
    }
    Object.defineProperty(Semaphore.prototype, "numberOfWaitingThreads", {
        get: function () {
            return this.waitingSemaphoreThreadList.length;
        },
        enumerable: true,
        configurable: true
    });

    Semaphore.prototype.incrementCount = function (count) {
        this.currentCount = Math.min(this.currentCount + count, this.maximumCount);
        return this.updatedCount();
    };

    Semaphore.prototype.cancel = function () {
        this.waitingSemaphoreThreadList.forEach(function (item) {
            item.wakeUp();
        });
    };

    Semaphore.prototype.updatedCount = function () {
        var _this = this;
        var awakeCount = 0;
        this.waitingSemaphoreThreadList.forEach(function (item) {
            if (_this.currentCount >= item.expectedCount) {
                //console.info(sprintf('Semaphore.updatedCount: %d, %d -> %d', this.currentCount, item.expectedCount, this.currentCount - item.expectedCount));
                _this.currentCount -= item.expectedCount;
                item.wakeUp();
                awakeCount++;
            }
        });
        return awakeCount;
    };

    Semaphore.prototype.waitAsync = function (thread, expectedCount) {
        var _this = this;
        if (this.currentCount >= expectedCount) {
            this.currentCount -= expectedCount;
            return null;
        } else {
            var promise = new Promise(function (resolve, reject) {
                var waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, function () {
                    //console.info(sprintf('Semaphore.waitAsync() -> wakeup thread : "%s"', thread.name));
                    _this.waitingSemaphoreThreadList.delete(waitingSemaphoreThread);
                    resolve();
                });
                _this.waitingSemaphoreThreadList.add(waitingSemaphoreThread);
            });
            this.updatedCount();
            return promise;
        }
    };

    Semaphore.prototype.delete = function () {
    };
    return Semaphore;
})();

var SemaphoreAttribute;
(function (SemaphoreAttribute) {
    SemaphoreAttribute[SemaphoreAttribute["FirstInFirstOut"] = 0x000] = "FirstInFirstOut";
    SemaphoreAttribute[SemaphoreAttribute["Priority"] = 0x100] = "Priority";
})(SemaphoreAttribute || (SemaphoreAttribute = {}));
//# sourceMappingURL=ThreadManForUser_sema.js.map
},
"src/hle/module/threadman/ThreadManForUser_vpl": function(module, exports, require) {
var _utils = require('../../utils');

var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');

var MemoryAnchor = _manager.MemoryAnchor;

var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.vplUid = new UidCollection(1);
        this.sceKernelCreateVpl = createNativeFunction(0x56C039B5, 150, 'int', 'string/int/int/int/void*', this, function (name, partitionId, attribute, size, optionsPtr) {
            var partition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
            var allocatedPartition = partition.allocate(size, (attribute & 16384 /* PSP_VPL_ATTR_ADDR_HIGH */) ? 1 /* High */ : 0 /* Low */);

            var vpl = new Vpl(name, allocatedPartition);
            return _this.vplUid.allocate(vpl);
        });
        this.sceKernelTryAllocateVpl = createNativeFunction(0xAF36D708, 150, 'int', 'int/int/void*', this, function (vplId, size, addressPtr) {
            var vpl = _this.vplUid.get(vplId);

            try  {
                var item = vpl.partition.allocateLow(size);
                if (addressPtr)
                    addressPtr.writeInt32(item.low);
                return 0;
            } catch (e) {
                console.error(e);
                return 2147615120 /* ERROR_KERNEL_NO_MEMORY */;
            }
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;

var Vpl = (function () {
    function Vpl(name, partition) {
        this.name = name;
        this.partition = partition;
    }
    return Vpl;
})();

var VplAttributeFlags;
(function (VplAttributeFlags) {
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_MASK"] = 0x41FF] = "PSP_VPL_ATTR_MASK";
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_ADDR_HIGH"] = 0x4000] = "PSP_VPL_ATTR_ADDR_HIGH";
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_EXT"] = 0x8000] = "PSP_VPL_ATTR_EXT";
})(VplAttributeFlags || (VplAttributeFlags = {}));
//# sourceMappingURL=ThreadManForUser_vpl.js.map
},
"src/hle/pspmodules": function(module, exports, require) {
function _registerModules(manager) {
}

function _registerSyscall(syscallManager, moduleManager, id, moduleName, functionName) {
    syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
}

function registerModules(manager) {
    manager.registerModule(require('./module/ExceptionManagerForKernel'));
    manager.registerModule(require('./module/InterruptManager'));
    manager.registerModule(require('./module/iofilemgr/IoFileMgrForUser'));
    manager.registerModule(require('./module/KDebugForKernel'));
    manager.registerModule(require('./module/Kernel_Library'));
    manager.registerModule(require('./module/LoadCoreForKernel'));
    manager.registerModule(require('./module/LoadExecForUser'));
    manager.registerModule(require('./module/ModuleMgrForUser'));
    manager.registerModule(require('./module/sceAtrac3plus'));
    manager.registerModule(require('./module/sceAudio'));
    manager.registerModule(require('./module/sceCtrl'));
    manager.registerModule(require('./module/sceDisplay'));
    manager.registerModule(require('./module/sceDmac'));
    manager.registerModule(require('./module/sceGe_user'));
    manager.registerModule(require('./module/sceHprm'));
    manager.registerModule(require('./module/sceHttp'));
    manager.registerModule(require('./module/sceParseHttp'));
    manager.registerModule(require('./module/sceParseUri'));
    manager.registerModule(require('./module/sceImpose'));
    manager.registerModule(require('./module/sceLibFont'));
    manager.registerModule(require('./module/sceMp3'));
    manager.registerModule(require('./module/sceMpeg'));
    manager.registerModule(require('./module/sceNet'));
    manager.registerModule(require('./module/sceNetAdhoc'));
    manager.registerModule(require('./module/sceNetAdhocctl'));
    manager.registerModule(require('./module/sceNetAdhocMatching'));
    manager.registerModule(require('./module/sceNetApctl'));
    manager.registerModule(require('./module/sceNetInet'));
    manager.registerModule(require('./module/sceNetResolver'));
    manager.registerModule(require('./module/sceNp'));
    manager.registerModule(require('./module/sceNpAuth'));
    manager.registerModule(require('./module/sceNpService'));
    manager.registerModule(require('./module/sceOpenPSID'));
    manager.registerModule(require('./module/scePower'));
    manager.registerModule(require('./module/scePspNpDrm_user'));
    manager.registerModule(require('./module/sceReg'));
    manager.registerModule(require('./module/sceRtc'));
    manager.registerModule(require('./module/sceSasCore'));
    manager.registerModule(require('./module/sceSsl'));
    manager.registerModule(require('./module/sceSuspendForUser'));
    manager.registerModule(require('./module/sceUmdUser'));
    manager.registerModule(require('./module/sceUtility'));
    manager.registerModule(require('./module/sceVaudio'));
    manager.registerModule(require('./module/sceWlanDrv'));
    manager.registerModule(require('./module/StdioForUser'));
    manager.registerModule(require('./module/SysMemUserForUser'));
    manager.registerModule(require('./module/threadman/ThreadManForUser'));
    manager.registerModule(require('./module/threadman/ThreadManForUser_callbacks'));
    manager.registerModule(require('./module/threadman/ThreadManForUser_sema'));
    manager.registerModule(require('./module/threadman/ThreadManForUser_eventflag'));
    manager.registerModule(require('./module/threadman/ThreadManForUser_vpl'));
    manager.registerModule(require('./module/threadman/ThreadManForUser_mutex'));
    manager.registerModule(require('./module/UtilsForKernel'));
    manager.registerModule(require('./module/UtilsForUser'));
}

function registerSyscalls(syscallManager, moduleManager) {
    _registerSyscall(syscallManager, moduleManager, 0x206D, "ThreadManForUser", "sceKernelCreateThread");
    _registerSyscall(syscallManager, moduleManager, 0x206F, "ThreadManForUser", "sceKernelStartThread");
    _registerSyscall(syscallManager, moduleManager, 0x2071, "ThreadManForUser", "sceKernelExitDeleteThread");

    _registerSyscall(syscallManager, moduleManager, 0x20BF, "UtilsForUser", "sceKernelUtilsMt19937Init");
    _registerSyscall(syscallManager, moduleManager, 0x20C0, "UtilsForUser", "sceKernelUtilsMt19937UInt");

    _registerSyscall(syscallManager, moduleManager, 0x213A, "sceDisplay", "sceDisplaySetMode");
    _registerSyscall(syscallManager, moduleManager, 0x2147, "sceDisplay", "sceDisplayWaitVblankStart");
    _registerSyscall(syscallManager, moduleManager, 0x213F, "sceDisplay", "sceDisplaySetFrameBuf");

    _registerSyscall(syscallManager, moduleManager, 0x20EB, "LoadExecForUser", "sceKernelExitGame");

    _registerSyscall(syscallManager, moduleManager, 0x2150, "sceCtrl", "sceCtrlPeekBufferPositive");
}

function registerModulesAndSyscalls(syscallManager, moduleManager) {
    registerModules(moduleManager);
    registerSyscalls(syscallManager, moduleManager);
}
exports.registerModulesAndSyscalls = registerModulesAndSyscalls;
//# sourceMappingURL=pspmodules.js.map
},
"src/hle/structs": function(module, exports, require) {
(function (SeekAnchor) {
    SeekAnchor[SeekAnchor["Set"] = 0] = "Set";
    SeekAnchor[SeekAnchor["Cursor"] = 1] = "Cursor";
    SeekAnchor[SeekAnchor["End"] = 2] = "End";
})(exports.SeekAnchor || (exports.SeekAnchor = {}));
var SeekAnchor = exports.SeekAnchor;

(function (SceMode) {
})(exports.SceMode || (exports.SceMode = {}));
var SceMode = exports.SceMode;

(function (IOFileModes) {
    IOFileModes[IOFileModes["FormatMask"] = 0x0038] = "FormatMask";
    IOFileModes[IOFileModes["SymbolicLink"] = 0x0008] = "SymbolicLink";
    IOFileModes[IOFileModes["Directory"] = 0x0010] = "Directory";
    IOFileModes[IOFileModes["File"] = 0x0020] = "File";
    IOFileModes[IOFileModes["CanRead"] = 0x0004] = "CanRead";
    IOFileModes[IOFileModes["CanWrite"] = 0x0002] = "CanWrite";
    IOFileModes[IOFileModes["CanExecute"] = 0x0001] = "CanExecute";
})(exports.IOFileModes || (exports.IOFileModes = {}));
var IOFileModes = exports.IOFileModes;

var ScePspDateTime = (function () {
    function ScePspDateTime() {
        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.microseconds = 0;
    }
    ScePspDateTime.fromDate = function (date) {
        if (!date)
            date = new Date();
        var pspdate = new ScePspDateTime();
        pspdate.year = date.getFullYear();
        pspdate.month = date.getMonth();
        pspdate.day = date.getDay();
        pspdate.hour = date.getHours();
        pspdate.minute = date.getMinutes();
        pspdate.second = date.getSeconds();
        pspdate.microseconds = date.getMilliseconds() * 1000;
        return pspdate;
    };

    ScePspDateTime.fromTicks = function (ticks) {
        return ScePspDateTime.fromDate(new Date(ticks.getNumber()));
    };

    ScePspDateTime.prototype.getTotalMicroseconds = function () {
        return Integer64.fromNumber((Date.UTC(this.year + 1970, this.month - 1, this.day, this.hour, this.minute, this.second, this.microseconds / 1000) * 1000));
    };

    ScePspDateTime.struct = StructClass.create(ScePspDateTime, [
        { year: Int16 },
        { month: Int16 },
        { day: Int16 },
        { hour: Int16 },
        { minute: Int16 },
        { second: Int16 },
        { microsecond: Int32 }
    ]);
    return ScePspDateTime;
})();
exports.ScePspDateTime = ScePspDateTime;

var SceIoStat = (function () {
    function SceIoStat() {
        this.mode = 0;
        this.attributes = 32 /* File */;
        this.size = 0;
        this.timeCreation = new ScePspDateTime();
        this.timeLastAccess = new ScePspDateTime();
        this.timeLastModification = new ScePspDateTime();
        this.deviceDependentData = [0, 0, 0, 0, 0, 0];
    }
    SceIoStat.struct = StructClass.create(SceIoStat, [
        { mode: Int32 },
        { attributes: Int32 },
        { size: Int64 },
        { timeCreation: ScePspDateTime.struct },
        { timeLastAccess: ScePspDateTime.struct },
        { timeLastModification: ScePspDateTime.struct },
        { deviceDependentData: StructArray(Int32, 6) }
    ]);
    return SceIoStat;
})();
exports.SceIoStat = SceIoStat;

var HleIoDirent = (function () {
    function HleIoDirent() {
        this.stat = new SceIoStat();
        this.name = '';
        this.privateData = 0;
        this.dummy = 0;
    }
    HleIoDirent.struct = StructClass.create(HleIoDirent, [
        { stat: SceIoStat.struct },
        { name: Stringz(256) },
        { privateData: Int32 },
        { dummy: Int32 }
    ]);
    return HleIoDirent;
})();
exports.HleIoDirent = HleIoDirent;
//# sourceMappingURL=structs.js.map
},
"src/hle/utils": function(module, exports, require) {
var _cpu = require('../core/cpu');

var NativeFunction = _cpu.NativeFunction;
exports.NativeFunction = NativeFunction;

function createNativeFunction(exportId, firmwareVersion, retval, argTypesString, _this, internalFunc) {
    var code = '';

    var args = [];
    var argindex = 4;

    function _readGpr32() {
        return 'state.gpr[' + (argindex++) + ']';
    }

    function readGpr32_S() {
        return '(' + _readGpr32() + ' | 0)';
    }

    function readGpr32_U() {
        return '(' + _readGpr32() + ' >>> 0)';
    }

    function readGpr64() {
        argindex = MathUtils.nextAligned(argindex, 2);
        var gprLow = readGpr32_S();
        var gprHigh = readGpr32_S();
        return sprintf('Integer64.fromBits(%s, %s)', gprLow, gprHigh);
    }

    var argTypes = argTypesString.split('/').filter(function (item) {
        return item.length > 0;
    });

    if (argTypes.length != internalFunc.length)
        throw (new Error("Function arity mismatch '" + argTypesString + "' != " + String(internalFunc)));

    argTypes.forEach(function (item) {
        switch (item) {
            case 'EmulatorContext':
                args.push('context');
                break;
            case 'Thread':
                args.push('state.thread');
                break;
            case 'CpuState':
                args.push('state');
                break;
            case 'Memory':
                args.push('state.memory');
                break;
            case 'string':
                args.push('state.memory.readStringz(' + readGpr32_S() + ')');
                break;
            case 'uint':
                args.push(readGpr32_U() + ' >>> 0');
                break;
            case 'int':
                args.push(readGpr32_S() + ' | 0');
                break;
            case 'ulong':
            case 'long':
                args.push(readGpr64());
                break;
            case 'void*':
                args.push('state.getPointerStream(' + readGpr32_S() + ')');
                break;
            case 'byte[]':
                args.push('state.getPointerStream(' + readGpr32_S() + ', ' + readGpr32_S() + ')');
                break;
            default:
                throw ('Invalid argument "' + item + '"');
        }
    });

    code += 'var args = [' + args.join(', ') + '];';
    code += 'try {';
    code += 'var result = internalFunc.apply(_this, args);';
    code += '} catch (e) {';
    code += 'if (e instanceof SceKernelException) { result = e.id; } else { throw(e); }';
    code += '}';

    //code += "var info = 'calling:' + state.thread.name + ':' + nativeFunction.name;";
    //code += "if (DebugOnce(info, 10)) {";
    //code += "console.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result) " : "result") + ");";
    //code += "if (result instanceof Promise) { result.then(function(value) { console.warn('####### args=', args, 'result-->', " + ((retval == 'uint') ? "sprintf('0x%08X', value) " : "value") + "); }); } ";
    //code += "}";
    code += 'if (result instanceof Promise) { state.thread.suspendUntilPromiseDone(result, nativeFunction); throw (new CpuBreakException()); } ';
    code += 'if (result instanceof WaitingThreadInfo) { if (result.promise instanceof Promise) { state.thread.suspendUntilDone(result); throw (new CpuBreakException()); } else { result = result.promise; } } ';

    switch (retval) {
        case 'void':
            break;
        case 'uint':
        case 'int':
            code += 'state.V0 = result | 0;';
            break;
        case 'float':
            code += 'state.fpr[0] = result;';
            break;
        case 'long':
            code += 'if (!(result instanceof Integer64)) throw(new Error("Invalid long result. Expecting Integer64."));';
            code += 'state.V0 = result.low; state.V1 = result.high;';
            break;
            break;
        default:
            throw ('Invalid return value "' + retval + '"');
    }

    var nativeFunction = new exports.NativeFunction();
    nativeFunction.name = 'unknown';
    nativeFunction.nid = exportId;
    nativeFunction.firmwareVersion = firmwareVersion;

    //console.log(code);
    var func = new Function('_this', 'internalFunc', 'context', 'state', 'nativeFunction', code);
    nativeFunction.call = function (context, state) {
        func(_this, internalFunc, context, state, nativeFunction);
    };
    nativeFunction.nativeCall = internalFunc;

    //console.log(out);
    return nativeFunction;
}
exports.createNativeFunction = createNativeFunction;
//# sourceMappingURL=utils.js.map
},
"src/hle/vfs": function(module, exports, require) {
var _vfs = require('./vfs/vfs');
_vfs.Vfs;
var _zip = require('./vfs/vfs_zip');
_zip.ZipVfs;
var _iso = require('./vfs/vfs_iso');
_iso.IsoVfs;
var _uri = require('./vfs/vfs_uri');
_uri.UriVfs;
var _ms = require('./vfs/vfs_ms');
_ms.MemoryStickVfs;
var _memory = require('./vfs/vfs_memory');
_memory.MemoryVfs;
var _mountable = require('./vfs/vfs_mountable');
_mountable.MountableVfs;
var _storage = require('./vfs/vfs_storage');
_storage.StorageVfs;
var _emulator = require('./vfs/vfs_emulator');
_emulator.EmulatorVfs;
var _dropbox = require('./vfs/vfs_dropbox');
_dropbox.DropboxVfs;

var FileMode = _vfs.FileMode;
exports.FileMode = FileMode;
var FileOpenFlags = _vfs.FileOpenFlags;
exports.FileOpenFlags = FileOpenFlags;
var Vfs = _vfs.Vfs;
exports.Vfs = Vfs;
var VfsEntry = _vfs.VfsEntry;
exports.VfsEntry = VfsEntry;

var ZipVfs = _zip.ZipVfs;
exports.ZipVfs = ZipVfs;
var IsoVfs = _iso.IsoVfs;
exports.IsoVfs = IsoVfs;
var UriVfs = _uri.UriVfs;
exports.UriVfs = UriVfs;
var MemoryVfs = _memory.MemoryVfs;
exports.MemoryVfs = MemoryVfs;
var DropboxVfs = _dropbox.DropboxVfs;
exports.DropboxVfs = DropboxVfs;
var MountableVfs = _mountable.MountableVfs;
exports.MountableVfs = MountableVfs;
var StorageVfs = _storage.StorageVfs;
exports.StorageVfs = StorageVfs;
var EmulatorVfs = _emulator.EmulatorVfs;
exports.EmulatorVfs = EmulatorVfs;
var MemoryStickVfs = _ms.MemoryStickVfs;
exports.MemoryStickVfs = MemoryStickVfs;
//# sourceMappingURL=vfs.js.map
},
"src/hle/vfs/vfs": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Vfs = (function () {
    function Vfs() {
    }
    Vfs.prototype.devctlAsync = function (command, input, output) {
        console.error('VfsMustOverride devctlAsync', this);
        throw (new Error("Must override devctlAsync : " + this));
        return null;
    };

    Vfs.prototype.openAsync = function (path, flags, mode) {
        console.error('VfsMustOverride openAsync', this);
        throw (new Error("Must override openAsync : " + this));
        return null;
    };

    Vfs.prototype.readAllAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8)).then(function (entry) {
            return entry.readAllAsync();
        });
    };

    Vfs.prototype.writeAllAsync = function (path, data) {
        return this.openAsync(path, 512 /* Create */ | 1024 /* Truncate */ | 2 /* Write */, parseInt('0777', 8)).then(function (entry) {
            return entry.writeAllAsync(data);
        });
    };

    Vfs.prototype.openDirectoryAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8));
    };

    Vfs.prototype.getStatAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8)).then(function (entry) {
            return entry.stat();
        });
    };
    return Vfs;
})();
exports.Vfs = Vfs;

var ProxyVfs = (function (_super) {
    __extends(ProxyVfs, _super);
    function ProxyVfs(parentVfsList) {
        _super.call(this);
        this.parentVfsList = parentVfsList;
    }
    ProxyVfs.prototype._callChainWhenError = function (callback) {
        var promise = Promise.reject(new Error());
        this.parentVfsList.forEach(function (parentVfs) {
            promise = promise.catch(function (e) {
                return callback(parentVfs, e);
            });
        });
        return promise;
    };

    ProxyVfs.prototype.devctlAsync = function (command, input, output) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.devctlAsync(command, input, output);
        });
    };
    ProxyVfs.prototype.openAsync = function (path, flags, mode) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.openAsync(path, flags, mode);
        });
    };
    ProxyVfs.prototype.openDirectoryAsync = function (path) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.openDirectoryAsync(path);
        });
    };
    ProxyVfs.prototype.getStatAsync = function (path) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.getStatAsync(path);
        });
    };
    return ProxyVfs;
})(Vfs);
exports.ProxyVfs = ProxyVfs;

var VfsEntry = (function () {
    function VfsEntry() {
    }
    Object.defineProperty(VfsEntry.prototype, "isDirectory", {
        get: function () {
            return this.stat().isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VfsEntry.prototype, "size", {
        get: function () {
            return this.stat().size;
        },
        enumerable: true,
        configurable: true
    });

    VfsEntry.prototype.readAllAsync = function () {
        return this.readChunkAsync(0, this.size);
    };
    VfsEntry.prototype.writeAllAsync = function (data) {
        return this.writeChunkAsync(0, data);
    };

    VfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must override enumerateAsync : " + this));
    };
    VfsEntry.prototype.readChunkAsync = function (offset, length) {
        throw (new Error("Must override readChunkAsync : " + this));
    };
    VfsEntry.prototype.writeChunkAsync = function (offset, data) {
        throw (new Error("Must override writeChunkAsync : " + this));
    };
    VfsEntry.prototype.stat = function () {
        throw (new Error("Must override stat"));
    };
    VfsEntry.prototype.close = function () {
    };
    return VfsEntry;
})();
exports.VfsEntry = VfsEntry;

var VfsEntryStream = (function (_super) {
    __extends(VfsEntryStream, _super);
    function VfsEntryStream(asyncStream) {
        _super.call(this);
        this.asyncStream = asyncStream;
    }
    Object.defineProperty(VfsEntryStream.prototype, "size", {
        get: function () {
            return this.asyncStream.size;
        },
        enumerable: true,
        configurable: true
    });
    VfsEntryStream.prototype.readChunkAsync = function (offset, length) {
        return this.asyncStream.readChunkAsync(offset, length);
    };
    VfsEntryStream.prototype.close = function () {
    };
    VfsEntryStream.prototype.stat = function () {
        return {
            name: this.asyncStream.name,
            size: this.asyncStream.size,
            isDirectory: false,
            timeCreation: this.asyncStream.date,
            timeLastAccess: this.asyncStream.date,
            timeLastModification: this.asyncStream.date
        };
    };
    return VfsEntryStream;
})(VfsEntry);
exports.VfsEntryStream = VfsEntryStream;

(function (FileOpenFlags) {
    FileOpenFlags[FileOpenFlags["Read"] = 0x0001] = "Read";
    FileOpenFlags[FileOpenFlags["Write"] = 0x0002] = "Write";
    FileOpenFlags[FileOpenFlags["ReadWrite"] = FileOpenFlags.Read | FileOpenFlags.Write] = "ReadWrite";
    FileOpenFlags[FileOpenFlags["NoBlock"] = 0x0004] = "NoBlock";
    FileOpenFlags[FileOpenFlags["_InternalDirOpen"] = 0x0008] = "_InternalDirOpen";
    FileOpenFlags[FileOpenFlags["Append"] = 0x0100] = "Append";
    FileOpenFlags[FileOpenFlags["Create"] = 0x0200] = "Create";
    FileOpenFlags[FileOpenFlags["Truncate"] = 0x0400] = "Truncate";
    FileOpenFlags[FileOpenFlags["Excl"] = 0x0800] = "Excl";
    FileOpenFlags[FileOpenFlags["Unknown1"] = 0x4000] = "Unknown1";
    FileOpenFlags[FileOpenFlags["NoWait"] = 0x8000] = "NoWait";
    FileOpenFlags[FileOpenFlags["Unknown2"] = 0xf0000] = "Unknown2";
    FileOpenFlags[FileOpenFlags["Unknown3"] = 0x2000000] = "Unknown3";
})(exports.FileOpenFlags || (exports.FileOpenFlags = {}));
var FileOpenFlags = exports.FileOpenFlags;

(function (FileMode) {
})(exports.FileMode || (exports.FileMode = {}));
var FileMode = exports.FileMode;
//# sourceMappingURL=vfs.js.map
},
"src/hle/vfs/vfs_dropbox": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;

var FileOpenFlags = _vfs.FileOpenFlags;

var AsyncClient = (function () {
    function AsyncClient(key) {
        this.key = key;
        this.statCachePromise = {};
        this.readdirCachePromise = {};
    }
    AsyncClient.prototype.initOnceAsync = function () {
        var _this = this;
        if (!this.initPromise) {
            this.client = new Dropbox.Client({ key: this.key });

            if (this.client.isAuthenticated()) {
                //DropboxLogged();
                // Client is authenticated. Display UI.
                $('#dropbox').html('logged');
            }

            this.client.authDriver(new Dropbox.AuthDriver.Redirect({
                redirectUrl: (document.location.host == '127.0.0.1') ? 'http://127.0.0.1/oauth_receive.html' : "https://" + document.location.host + '/oauth_receive.html'
            }));

            this.initPromise = new Promise(function (resolve, reject) {
                _this.client.authenticate({ interactive: true }, function (e) {
                    if (e) {
                        this.initPromise = null;
                        reject(e);
                    } else {
                        resolve();
                    }
                });
            });
        }
        return this.initPromise;
    };

    AsyncClient.prototype.writeFileAsync = function (fullpath, content) {
        var _this = this;
        delete this.readdirCachePromise[getDirectoryPath(fullpath)];
        delete this.statCachePromise[getBaseName(fullpath)];

        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.writeFile(fullpath, content, function (e, data) {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
    };

    AsyncClient.prototype.mkdirAsync = function (path) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.mkdir(path, function (e, data) {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
    };

    AsyncClient.prototype.readFileAsync = function (name, offset, length) {
        var _this = this;
        if (typeof offset === "undefined") { offset = 0; }
        if (typeof length === "undefined") { length = undefined; }
        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.readFile(name, { arrayBuffer: true, start: offset, length: length }, function (e, data) {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
    };

    AsyncClient.prototype.statAsync = function (fullpath) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            if (!_this.statCachePromise[fullpath]) {
                _this.statCachePromise[fullpath] = _this.readdirAsync(getDirectoryPath(fullpath)).then(function (files) {
                    var basename = getBaseName(fullpath);
                    if (!files.contains(basename))
                        throw (new Error("folder not contains file"));
                    return new Promise(function (resolve, reject) {
                        _this.client.stat(fullpath, {}, function (e, data) {
                            if (e) {
                                reject(e);
                            } else {
                                resolve(data);
                            }
                        });
                    });
                });
                return _this.statCachePromise[fullpath];
            }
        });
    };

    AsyncClient.prototype.readdirAsync = function (name) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            if (!_this.readdirCachePromise[name]) {
                _this.readdirCachePromise[name] = new Promise(function (resolve, reject) {
                    _this.client.readdir(name, {}, function (e, data) {
                        if (e) {
                            reject(e);
                        } else {
                            resolve(data);
                        }
                    });
                });
            }
            return _this.readdirCachePromise[name];
        });
    };
    return AsyncClient;
})();
exports.AsyncClient = AsyncClient;

function getDirectoryPath(fullpath) {
    return fullpath.split('/').slice(0, -1).join('/');
}

function getBaseName(fullpath) {
    return fullpath.split('/').pop();
}

function normalizePath(fullpath) {
    var out = [];
    var parts = fullpath.replace(/\\/g, '/').split('/');
    parts.forEach(function (part) {
        switch (part) {
            case '.':
                break;
            case '..':
                out.pop();
                break;
            default:
                out.push(part);
        }
    });
    return out.join('/');
}

var client = new AsyncClient('4mdwp62ogo4tna1');

/*
client.mkdirAsync('PSP').then(() => {
console.log('resilt');
}).catch(e => {
console.error(e);
});
*/
//client.mkdirAsync('PSP/GAME');
//client.mkdirAsync('PSP/GAME/virtual');
/*
client.writeFileAsync('/PSP/GAME/virtual/lsdlmidi.bin', new Uint8Array([1, 2, 3, 4]).buffer).then((result) => {
console.log(result);
}).catch((error) => {
console.error(error);
});
*/
var DropboxVfs = (function (_super) {
    __extends(DropboxVfs, _super);
    function DropboxVfs() {
        _super.call(this);
        this.enabled = true;
    }
    DropboxVfs.tryLoginAsync = function () {
        return client.initOnceAsync();
    };

    DropboxVfs.prototype.openAsync = function (path, flags, mode) {
        path = normalizePath(path);
        if (!this.enabled)
            return Promise.reject(new Error("Not using dropbox"));
        return DropboxVfsEntry.fromPathAsync(path, flags, mode);
    };
    return DropboxVfs;
})(Vfs);
exports.DropboxVfs = DropboxVfs;

var DropboxVfsEntry = (function (_super) {
    __extends(DropboxVfsEntry, _super);
    function DropboxVfsEntry(path, name, _size, isFile, date) {
        _super.call(this);
        this.path = path;
        this.name = name;
        this._size = _size;
        this.isFile = isFile;
        this.date = date;
        this.writeTimer = -1;
    }
    DropboxVfsEntry.fromPathAsync = function (path, flags, mode) {
        function readedErrorAsync(e) {
            if (flags & 512 /* Create */) {
                //console.log('creating file!');
                var entry = new DropboxVfsEntry(path, path.split('/').pop(), 0, true, new Date());
                return client.writeFileAsync(path, new ArrayBuffer(0)).then(function () {
                    //console.log('created file!');
                    return entry;
                }).catch(function (e) {
                    console.error(e);
                    throw (e);
                });
            } else {
                throw (e);
            }
        }

        return client.statAsync(path).then(function (info) {
            if (info.isRemoved) {
                return readedErrorAsync(new Error("file not exists"));
            } else {
                //console.log(info);
                return new DropboxVfsEntry(path, info.name, info.size, info.isFile, info.modifiedAt);
            }
        }).catch(function (e) {
            return readedErrorAsync(e);
        });
    };

    DropboxVfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must implement DropboxVfsEntry.enumerateAsync"));
    };

    DropboxVfsEntry.prototype.readChunkAsync = function (offset, length) {
        //console.log('dropbox: read chunk!', this.path, offset, length);
        var _this = this;
        if (this._size < 128 * 1024 * 1024) {
            if (this.cachedContent)
                return Promise.resolve(this.cachedContent.slice(offset, offset + length));
            return client.readFileAsync(this.path).then(function (data) {
                _this.cachedContent = data;
                return _this.cachedContent.slice(offset, offset + length);
            });
        } else {
            //console.log('read dropbox file ' + this.path);
            return client.readFileAsync(this.path, offset, offset + length);
        }
    };

    DropboxVfsEntry.prototype.writeChunkAsync = function (offset, dataToWrite) {
        var _this = this;
        return this.readChunkAsync(0, this._size).then(function (base) {
            //console.log('dropbox: write chunk!', this.path, offset, dataToWrite.byteLength);
            var newContent = new ArrayBuffer(Math.max(base.byteLength, offset + dataToWrite.byteLength));
            var newContentArray = new Uint8Array(newContent);
            newContentArray.set(new Uint8Array(base), 0);
            newContentArray.set(new Uint8Array(dataToWrite), offset);
            _this._size = newContent.byteLength;
            _this.cachedContent = newContent;

            //return client.writeFileAsync(this.path, newContent).then(() => data.byteLength);
            //console.log(newContentArray);
            clearTimeout(_this.writeTimer);
            _this.writeTimer = setTimeout(function () {
                client.writeFileAsync(_this.path, newContent);
            }, 500);
            return dataToWrite.byteLength;
        });
    };

    DropboxVfsEntry.prototype.stat = function () {
        return {
            name: this.name,
            size: this._size,
            isDirectory: !this.isFile,
            timeCreation: this.date,
            timeLastAccess: this.date,
            timeLastModification: this.date,
            dependentData0: 0,
            dependentData1: 1
        };
    };
    DropboxVfsEntry.prototype.close = function () {
    };
    return DropboxVfsEntry;
})(VfsEntry);
exports.DropboxVfsEntry = DropboxVfsEntry;
/*
var dvfs = new DropboxVfs();
dvfs.openAsync('/test', FileOpenFlags.Create | FileOpenFlags.Write | FileOpenFlags.Truncate, <FileMode>parseIntFormat('0777')).then(value => {
console.info('dvfs result:', value);
}).catch(e => {
console.error('dvfs error:', e);
});
*/
/*
client.readdirAsync('/PSP/GAME/virtual/SAVE/SharewareDoom').then(result => {
console.log(result);
});
*/
//# sourceMappingURL=vfs_dropbox.js.map
},
"src/hle/vfs/vfs_emulator": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
_vfs.Vfs;

var EmulatorVfs = (function (_super) {
    __extends(EmulatorVfs, _super);
    function EmulatorVfs() {
        _super.apply(this, arguments);
        this.output = '';
        this.screenshot = null;
    }
    EmulatorVfs.prototype.devctlAsync = function (command, input, output) {
        switch (command) {
            case 1 /* GetHasDisplay */:
                if (output)
                    output.writeInt32(0);

                break;
            case 2 /* SendOutput */:
                var str = input.readString(input.length);
                this.output += str;
                $('#output').append(str);

                break;
            case 3 /* IsEmulator */:
                return 0;
            case 32 /* EmitScreenshot */:
                this.screenshot = 1;
                console.warn('emit screenshot!');
                return 0;
            default:
                throw (new Error("Can't handle EmulatorVfs devctlAsync. Command '" + command + "'"));
        }

        return 0;
    };
    return EmulatorVfs;
})(_vfs.Vfs);
exports.EmulatorVfs = EmulatorVfs;

(function (EmulatorDevclEnum) {
    EmulatorDevclEnum[EmulatorDevclEnum["GetHasDisplay"] = 0x00000001] = "GetHasDisplay";
    EmulatorDevclEnum[EmulatorDevclEnum["SendOutput"] = 0x00000002] = "SendOutput";
    EmulatorDevclEnum[EmulatorDevclEnum["IsEmulator"] = 0x00000003] = "IsEmulator";
    EmulatorDevclEnum[EmulatorDevclEnum["SendCtrlData"] = 0x00000010] = "SendCtrlData";
    EmulatorDevclEnum[EmulatorDevclEnum["EmitScreenshot"] = 0x00000020] = "EmitScreenshot";
})(exports.EmulatorDevclEnum || (exports.EmulatorDevclEnum = {}));
var EmulatorDevclEnum = exports.EmulatorDevclEnum;
//# sourceMappingURL=vfs_emulator.js.map
},
"src/hle/vfs/vfs_iso": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;

var IsoVfs = (function (_super) {
    __extends(IsoVfs, _super);
    function IsoVfs(iso) {
        _super.call(this);
        this.iso = iso;
    }
    IsoVfs.prototype.openAsync = function (path, flags, mode) {
        try  {
            return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
        } catch (e) {
            return Promise.reject(e);
        }
    };
    return IsoVfs;
})(Vfs);
exports.IsoVfs = IsoVfs;

var IsoVfsFile = (function (_super) {
    __extends(IsoVfsFile, _super);
    function IsoVfsFile(node) {
        _super.call(this);
        this.node = node;
    }
    Object.defineProperty(IsoVfsFile.prototype, "isDirectory", {
        get: function () {
            return this.node.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoVfsFile.prototype, "size", {
        get: function () {
            return this.node.size;
        },
        enumerable: true,
        configurable: true
    });
    IsoVfsFile.prototype.readChunkAsync = function (offset, length) {
        return this.node.readChunkAsync(offset, length);
    };
    IsoVfsFile.prototype.close = function () {
    };

    IsoVfsFile.statNode = function (node) {
        return {
            name: node.name,
            size: node.size,
            isDirectory: node.isDirectory,
            timeCreation: node.date,
            timeLastAccess: node.date,
            timeLastModification: node.date,
            dependentData0: node.extent
        };
    };

    IsoVfsFile.prototype.stat = function () {
        return IsoVfsFile.statNode(this.node);
    };

    IsoVfsFile.prototype.enumerateAsync = function () {
        return Promise.resolve(this.node.childs.map(function (node) {
            return IsoVfsFile.statNode(node);
        }));
    };
    return IsoVfsFile;
})(VfsEntry);
//# sourceMappingURL=vfs_iso.js.map
},
"src/hle/vfs/vfs_memory": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;

var FileOpenFlags = _vfs.FileOpenFlags;

var MemoryVfs = (function (_super) {
    __extends(MemoryVfs, _super);
    function MemoryVfs() {
        _super.apply(this, arguments);
        this.files = {};
    }
    MemoryVfs.prototype.addFile = function (name, data) {
        this.files[name] = new MemoryVfsEntry(name, data);
    };

    MemoryVfs.prototype.openAsync = function (path, flags, mode) {
        if (flags & 2 /* Write */) {
            if (!this.files[path]) {
                this.addFile(path, new ArrayBuffer(0));
            }
        }
        if (flags & 1024 /* Truncate */) {
            this.addFile(path, new ArrayBuffer(0));
        }
        var file = this.files[path];
        if (!file) {
            var error = new Error(sprintf("MemoryVfs: Can't find '%s'", path));
            console.error(error);
            return Promise.reject(error);
        } else {
            return Promise.resolve(file);
        }
    };
    return MemoryVfs;
})(Vfs);
exports.MemoryVfs = MemoryVfs;

var MemoryVfsEntry = (function (_super) {
    __extends(MemoryVfsEntry, _super);
    function MemoryVfsEntry(name, data) {
        _super.call(this);
        this.name = name;
        this.data = data;
    }
    Object.defineProperty(MemoryVfsEntry.prototype, "isDirectory", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });

    MemoryVfsEntry.prototype.readChunkAsync = function (offset, length) {
        return Promise.resolve(this.data.slice(offset, offset + length));
    };

    MemoryVfsEntry.prototype.writeChunkAsync = function (offset, data) {
        var newData = new ArrayBuffer(Math.max(this.data.byteLength, offset + data.byteLength));
        var newDataArray = new Uint8Array(newData);
        newDataArray.set(new Uint8Array(this.data), 0);
        newDataArray.set(new Uint8Array(data), offset);
        this.data = newData;
        return Promise.resolve(data.byteLength);
    };

    MemoryVfsEntry.prototype.stat = function () {
        return {
            name: this.name,
            size: this.data.byteLength,
            isDirectory: false,
            timeCreation: new Date(),
            timeLastAccess: new Date(),
            timeLastModification: new Date()
        };
    };
    MemoryVfsEntry.prototype.close = function () {
    };

    MemoryVfsEntry.prototype.enumerateAsync = function () {
        return Promise.resolve([]);
    };
    return MemoryVfsEntry;
})(VfsEntry);
exports.MemoryVfsEntry = MemoryVfsEntry;
//# sourceMappingURL=vfs_memory.js.map
},
"src/hle/vfs/vfs_mountable": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var _vfs_memory = require('./vfs_memory');
var MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

var Vfs = _vfs.Vfs;

var MountableVfs = (function (_super) {
    __extends(MountableVfs, _super);
    function MountableVfs() {
        _super.apply(this, arguments);
        this.mounts = [];
    }
    MountableVfs.prototype.mountVfs = function (path, vfs) {
        this.mounts.unshift(new MountableEntry(this.normalizePath(path), vfs, null));
    };

    MountableVfs.prototype.mountFileData = function (path, data) {
        this.mounts.unshift(new MountableEntry(this.normalizePath(path), null, new MemoryVfsEntry(path, data)));
    };

    MountableVfs.prototype.normalizePath = function (path) {
        return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    };

    MountableVfs.prototype.transformPath = function (path) {
        path = this.normalizePath(path);

        for (var n = 0; n < this.mounts.length; n++) {
            var mount = this.mounts[n];

            //console.log(mount.path + ' -- ' + path);
            if (path.startsWith(mount.path)) {
                var part = path.substr(mount.path.length);
                return { mount: mount, part: part };
            }
        }
        console.info(this.mounts);
        throw (new Error("MountableVfs: Can't find file '" + path + "'"));
    };

    MountableVfs.prototype.openAsync = function (path, flags, mode) {
        var info = this.transformPath(path);

        if (info.mount.file) {
            return Promise.resolve(info.mount.file);
        } else {
            return info.mount.vfs.openAsync(info.part, flags, mode);
        }
    };

    MountableVfs.prototype.openDirectoryAsync = function (path) {
        var info = this.transformPath(path);

        if (info.mount.file) {
            return Promise.resolve(info.mount.file);
        } else {
            return info.mount.vfs.openDirectoryAsync(info.part);
        }
    };

    MountableVfs.prototype.getStatAsync = function (path) {
        var info = this.transformPath(path);

        if (info.mount.file) {
            return Promise.resolve(info.mount.file.stat());
        } else {
            return info.mount.vfs.getStatAsync(info.part);
        }
    };
    return MountableVfs;
})(Vfs);
exports.MountableVfs = MountableVfs;

var MountableEntry = (function () {
    function MountableEntry(path, vfs, file) {
        this.path = path;
        this.vfs = vfs;
        this.file = file;
    }
    return MountableEntry;
})();
//window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
//window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
//window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
//export class IndexedDbVfs extends Vfs {
//	initAsync() {
//		var request = indexedDB.open("mydatabase");
//
//		request.onsuccess = (e) => {
//			var db = <IDBDatabase>request.result;
//
//			var trans = db.transaction(["objectstore1", "objectstore2", READ_WRITE);
//			trans.objectStore("objectstore1").put(myblob, "somekey");
//			trans.objectStore("objectstore2").put(myblob, "otherkey");
//		};
//		request.onerror = (e) => {
//		};
//	}
//}
//# sourceMappingURL=vfs_mountable.js.map
},
"src/hle/vfs/vfs_ms": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var _manager = require('../manager');
_manager.CallbackManager;

var SceKernelErrors = require('../SceKernelErrors');

var ProxyVfs = _vfs.ProxyVfs;

var CallbackManager = _manager.CallbackManager;

var MemoryStickVfs = (function (_super) {
    __extends(MemoryStickVfs, _super);
    function MemoryStickVfs(parentVfsList, callbackManager, memory) {
        _super.call(this, parentVfsList);
        this.callbackManager = callbackManager;
        this.memory = memory;
    }
    MemoryStickVfs.prototype.devctlAsync = function (command, input, output) {
        switch (command) {
            case 37902371 /* CheckInserted */:
                if (output == null || output.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;

                // 0 - Device is not assigned (callback not registered).
                // 1 - Device is assigned (callback registered).
                output.writeInt32(1);
                return 0;
            case 37836833 /* MScmRegisterMSInsertEjectCallback */:
                if (input == null || input.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;
                var callbackId = input.readInt32();

                this.callbackManager.notify(callbackId, 1);

                return 0;
            case 37836834 /* MScmUnregisterMSInsertEjectCallback */:
                // Ignore.
                return 0;
            case 37902360 /* GetMemoryStickCapacity */:
                if (input == null || input.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;

                var structAddress = input.readInt32();
                var structStream = this.memory.getPointerStream(structAddress, SizeInfoStruct.struct.length);

                var sizeInfo = new SizeInfoStruct();
                var memoryStickSectorSize = (32 * 1024);

                //var TotalSpaceInBytes = 2L * 1024 * 1024 * 1024;
                var freeSpaceInBytes = 1 * 1024 * 1024 * 1024;

                sizeInfo.sectorSize = 0x200;
                sizeInfo.sectorCount = (memoryStickSectorSize / sizeInfo.sectorSize);
                sizeInfo.maxClusters = (freeSpaceInBytes * 95 / 100) / (sizeInfo.sectorSize * sizeInfo.sectorCount);
                sizeInfo.freeClusters = sizeInfo.maxClusters;
                sizeInfo.maxSectors = sizeInfo.maxClusters;

                SizeInfoStruct.struct.write(structStream, sizeInfo);

                return 0;
            case 33708038 /* CheckMemoryStickIsInserted */:
                output.writeInt32(1);
                return 0;
            case 33708033 /* CheckMemoryStickStatus */:
                // 0 <- Busy
                // 1 <- Ready
                output.writeInt32(4);
                return 0;
            default:
                throw (new Error("Invalid MemoryStick command '" + command + "'"));
                break;
        }

        return 0;
    };
    return MemoryStickVfs;
})(ProxyVfs);
exports.MemoryStickVfs = MemoryStickVfs;

(function (CommandType) {
    CommandType[CommandType["CheckInserted"] = 0x02425823] = "CheckInserted";
    CommandType[CommandType["MScmRegisterMSInsertEjectCallback"] = 0x02415821] = "MScmRegisterMSInsertEjectCallback";
    CommandType[CommandType["MScmUnregisterMSInsertEjectCallback"] = 0x02415822] = "MScmUnregisterMSInsertEjectCallback";
    CommandType[CommandType["GetMemoryStickCapacity"] = 0x02425818] = "GetMemoryStickCapacity";
    CommandType[CommandType["CheckMemoryStickIsInserted"] = 0x02025806] = "CheckMemoryStickIsInserted";
    CommandType[CommandType["CheckMemoryStickStatus"] = 0x02025801] = "CheckMemoryStickStatus";
})(exports.CommandType || (exports.CommandType = {}));
var CommandType = exports.CommandType;

var SizeInfoStruct = (function () {
    function SizeInfoStruct() {
    }
    SizeInfoStruct.struct = StructClass.create(SizeInfoStruct, [
        { maxClusters: UInt32 },
        { freeClusters: UInt32 },
        { maxSectors: UInt32 },
        { sectorSize: UInt32 },
        { sectorCount: UInt32 }
    ]);
    return SizeInfoStruct;
})();
//# sourceMappingURL=vfs_ms.js.map
},
"src/hle/vfs/vfs_storage": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;

var FileOpenFlags = _vfs.FileOpenFlags;


function indexedDbOpenAsync(name, version, stores) {
    return new Promise(function (resolve, reject) {
        var request = indexedDB.open(name, version);
        request.onupgradeneeded = function (e) {
            var db = request.result;

            // A versionchange transaction is started automatically.
            //request.transaction.onerror = html5rocks.indexedDB.onerror;
            console.log('upgrade!');

            stores.forEach(function (store) {
                if (db.objectStoreNames.contains(store))
                    db.deleteObjectStore(store);
                db.createObjectStore(store, { keyPath: "name" });
            });
        };
        request.onerror = function (event) {
            reject(new Error("Can't open indexedDB"));
        };
        request.onsuccess = function (event) {
            resolve(request.result);
        };
    });
}

function indexedDbPutAsync(store, value) {
    return new Promise(function (resolve, reject) {
        var request = store.put(value);
        request.onsuccess = function (e) {
            resolve();
        };
        request.onerror = function (e) {
            reject(e['value']);
        };
    });
}

function indexedDbDeleteAsync(store, key) {
    return new Promise(function (resolve, reject) {
        var request = store.delete(key);

        request.onsuccess = function (e) {
            resolve();
        };

        request.onerror = function (e) {
            reject(e['value']);
        };
    });
}

function indexedDbGetRangeAsync(store, keyRange, iterator) {
    return new Promise(function (resolve, reject) {
        try  {
            var cursorRequest = store.openCursor(keyRange);
        } catch (e) {
            console.error(e);
            reject(e);
        }

        //console.log('mm', cursorRequest);
        cursorRequest.onsuccess = function (e) {
            var cursor = cursorRequest.result;
            if (!!cursor == false) {
                resolve();
                return;
            } else {
                var result2 = iterator(cursor.value);
                cursor.continue();
            }
        };

        cursorRequest.onerror = function (e) {
            //console.log('dd');
            reject(e['value']);
        };
    });
}

function indexedDbGetOneAsync(store, keyRange) {
    return new Promise(function (resolve, reject) {
        indexedDbGetRangeAsync(store, keyRange, function (item) {
            resolve(item);
        }).then(function () {
            resolve(null);
        }).catch(function (e) {
            reject(e);
        });
    });
}

var StorageVfs = (function (_super) {
    __extends(StorageVfs, _super);
    function StorageVfs(key) {
        _super.call(this);
        this.key = key;
    }
    StorageVfs.prototype.initializeOnceAsync = function () {
        var _this = this;
        if (!this.openDbPromise) {
            this.openDbPromise = indexedDbOpenAsync(this.key, 3, ['files']).then(function (db) {
                _this.db = db;
                return _this;
            });
        }
        return this.openDbPromise;
    };

    StorageVfs.prototype.openAsync = function (path, flags, mode) {
        var _this = this;
        return this.initializeOnceAsync().then(function () {
            return StorageVfsEntry.fromNameAsync(_this.db, path, flags, mode);
        });
    };
    return StorageVfs;
})(Vfs);
exports.StorageVfs = StorageVfs;

var StorageVfsEntry = (function (_super) {
    __extends(StorageVfsEntry, _super);
    function StorageVfsEntry(db, name) {
        _super.call(this);
        this.db = db;
        this.name = name;
    }
    StorageVfsEntry.prototype.initAsync = function (flags, mode) {
        var _this = this;
        return this._getFileAsync().then(function (file) {
            if (!file.exists) {
                if (!(flags & 512 /* Create */)) {
                    throw (new Error("File '" + file.name + "' doesn't exist"));
                }
            }
            if (flags & 1024 /* Truncate */) {
                file.content = new Uint8Array([]);
            }
            _this.file = file;
            return _this;
        });
    };

    StorageVfsEntry.fromNameAsync = function (db, name, flags, mode) {
        return (new StorageVfsEntry(db, name)).initAsync(flags, mode);
    };

    StorageVfsEntry.prototype._getFileAsync = function () {
        var _this = this;
        var store = this.db.transaction(["files"], "readwrite").objectStore('files');
        return indexedDbGetOneAsync(store, IDBKeyRange.only(this.name)).then(function (file) {
            if (file == null)
                file = { name: _this.name, content: new ArrayBuffer(0), date: new Date(), exists: false };
            return file;
        });
    };

    StorageVfsEntry.prototype._getAllAsync = function () {
        return this._getFileAsync().then(function (item) {
            return item.content;
        });
    };

    StorageVfsEntry.prototype._writeAllAsync = function (data) {
        var store = this.db.transaction(["files"], "readwrite").objectStore('files');
        return indexedDbPutAsync(store, {
            'name': this.name,
            'content': new Uint8Array(data),
            'date': new Date(),
            'exists': true
        });
    };

    StorageVfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must override enumerateAsync : " + this));
    };

    StorageVfsEntry.prototype.readChunkAsync = function (offset, length) {
        //console.log(this.file);
        return Promise.resolve(this.file.content.buffer.slice(offset, offset + length));
    };

    StorageVfsEntry.prototype.writeChunkAsync = function (offset, data) {
        var newContent = new ArrayBuffer(Math.max(this.file.content.byteLength, offset + data.byteLength));
        var newContentArray = new Uint8Array(newContent);
        newContentArray.set(new Uint8Array(this.file.content), 0);
        newContentArray.set(new Uint8Array(data), offset);
        this.file.content = newContentArray;
        return this._writeAllAsync(newContent).then(function () {
            return data.byteLength;
        });
    };

    StorageVfsEntry.prototype.stat = function () {
        return {
            name: this.file.name,
            size: this.file.content.byteLength,
            isDirectory: false,
            timeCreation: this.file.date,
            timeLastAccess: this.file.date,
            timeLastModification: this.file.date,
            dependentData0: 0,
            dependentData1: 0
        };
    };
    StorageVfsEntry.prototype.close = function () {
    };
    return StorageVfsEntry;
})(VfsEntry);
//# sourceMappingURL=vfs_storage.js.map
},
"src/hle/vfs/vfs_uri": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var _vfs_memory = require('./vfs_memory');
var MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

var Vfs = _vfs.Vfs;

var VfsEntryStream = _vfs.VfsEntryStream;

var FileOpenFlags = _vfs.FileOpenFlags;

var UriVfs = (function (_super) {
    __extends(UriVfs, _super);
    function UriVfs(baseUri) {
        _super.call(this);
        this.baseUri = baseUri;
    }
    UriVfs.prototype.getAbsoluteUrl = function (path) {
        return this.baseUri + '/' + path;
    };

    UriVfs.prototype.openAsync = function (path, flags, mode) {
        if (flags & 2 /* Write */) {
            return Promise.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
        }

        var url = this.getAbsoluteUrl(path);

        return UrlAsyncStream.fromUrlAsync(url).then(function (stream) {
            return new VfsEntryStream(stream);
        });
    };

    UriVfs.prototype.openDirectoryAsync = function (path) {
        return Promise.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
    };

    UriVfs.prototype.getStatAsync = function (path) {
        var url = this.getAbsoluteUrl(path);
        return statUrlAsync(url);
    };
    return UriVfs;
})(Vfs);
exports.UriVfs = UriVfs;

function urlStatToVfsStat(url, info) {
    return {
        name: url,
        size: info.size,
        isDirectory: false,
        timeCreation: info.date,
        timeLastAccess: info.date,
        timeLastModification: info.date
    };
}

function statUrlAsync(url) {
    return statFileAsync(url).then(function (info) {
        return urlStatToVfsStat(url, info);
    });
}
//# sourceMappingURL=vfs_uri.js.map
},
"src/hle/vfs/vfs_zip": function(module, exports, require) {
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');

var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;

var ZipVfs = (function (_super) {
    __extends(ZipVfs, _super);
    function ZipVfs(zip, writeVfs) {
        _super.call(this);
        this.zip = zip;
        this.writeVfs = writeVfs;
    }
    ZipVfs.prototype.openAsync = function (path, flags, mode) {
        try  {
            return Promise.resolve(new ZipVfsFile(this.zip.get(path)));
        } catch (e) {
            return Promise.reject(e);
        }
    };
    return ZipVfs;
})(Vfs);
exports.ZipVfs = ZipVfs;

var ZipVfsFile = (function (_super) {
    __extends(ZipVfsFile, _super);
    function ZipVfsFile(node) {
        _super.call(this);
        this.node = node;
    }
    Object.defineProperty(ZipVfsFile.prototype, "isDirectory", {
        get: function () {
            return this.node.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ZipVfsFile.prototype, "size", {
        get: function () {
            return this.node.size;
        },
        enumerable: true,
        configurable: true
    });
    ZipVfsFile.prototype.readChunkAsync = function (offset, length) {
        return this.node.readChunkAsync(offset, length);
    };
    ZipVfsFile.prototype.close = function () {
    };

    ZipVfsFile.statNode = function (node) {
        return {
            name: node.name,
            size: node.size,
            isDirectory: node.isDirectory,
            timeCreation: node.date,
            timeLastAccess: node.date,
            timeLastModification: node.date
        };
    };

    ZipVfsFile.prototype.stat = function () {
        return ZipVfsFile.statNode(this.node);
    };

    ZipVfsFile.prototype.enumerateAsync = function () {
        return Promise.resolve(this.node.getChildList().map(function (node) {
            return ZipVfsFile.statNode(node);
        }));
    };
    return ZipVfsFile;
})(VfsEntry);
//# sourceMappingURL=vfs_zip.js.map
},
"src/util/IndentStringGenerator": function(module, exports, require) {
var IndentStringGenerator = (function () {
    function IndentStringGenerator() {
        this.indentation = 0;
        this.output = '';
        this.newLine = true;
    }
    IndentStringGenerator.prototype.indent = function (callback) {
        this.indentation++;
        try  {
            callback();
        } finally {
            this.indentation--;
        }
    };

    IndentStringGenerator.prototype.write = function (text) {
        var chunks = text.split('\n');
        for (var n = 0; n < chunks.length; n++) {
            if (n != 0)
                this.writeBreakLine();
            this.writeInline(chunks[n]);
        }
    };

    IndentStringGenerator.prototype.writeInline = function (text) {
        if (text == null || text.length == 0)
            return;

        if (this.newLine) {
            for (var n = 0; n < this.indentation; n++)
                this.output += '\t';
            this.newLine = false;
        }
        this.output += text;
    };

    IndentStringGenerator.prototype.writeBreakLine = function () {
        this.output += '\n';
        this.newLine = true;
    };
    return IndentStringGenerator;
})();

module.exports = IndentStringGenerator;
//# sourceMappingURL=IndentStringGenerator.js.map
},
"src/util/Signal": function(module, exports, require) {
var Signal = (function () {
    function Signal() {
        this.callbacks = [];
    }
    Signal.prototype.add = function (callback) {
        this.callbacks.push(callback);
        return callback;
    };

    Signal.prototype.remove = function (callback) {
        var index = this.callbacks.indexOf(callback);
        if (index >= 0) {
            this.callbacks.splice(index, 1);
        }
    };

    Signal.prototype.once = function (callback) {
        var _this = this;
        var once = function () {
            _this.remove(once);
            callback();
        };
        this.add(once);
    };

    Signal.prototype.dispatch = function (value) {
        this.callbacks.forEach(function (callback) {
            callback(value);
        });
    };
    return Signal;
})();

module.exports = Signal;
//# sourceMappingURL=Signal.js.map
},
"src/util/StringUtils": function(module, exports, require) {
var StringUtils = (function () {
    function StringUtils() {
    }
    return StringUtils;
})();

module.exports = StringUtils;
//# sourceMappingURL=StringUtils.js.map
},
"test/_tests": function(module, exports, require) {
require('./format/csoTest');
require('./format/isoTest');
require('./format/pbpTest');
require('./format/psfTest');
require('./format/zipTest');
require('./hle/elfTest');
require('./hle/memorymanagerTest');
require('./hle/vfsTest');
require('./util/utilsTest');
require('./testasm');
require('./gpuTest');
require('./instructionTest');
require('./pspautotests');
//# sourceMappingURL=_tests.js.map
},
"test/format/csoTest": function(module, exports, require) {
var _cso = require('../../src/format/cso');
var _iso = require('../../src/format/iso');

describe('cso', function () {
    var testCsoArrayBuffer;

    before(function () {
        return downloadFileAsync('samples/test.cso').then(function (data) {
            testCsoArrayBuffer = data;
        });
    });

    it('should load fine', function () {
        return _cso.Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer)).then(function (cso) {
            //cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(data => {
            return cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(function (data) {
                var stream = Stream.fromArrayBuffer(data);
                stream.skip(10);
                var CD0001 = stream.readStringz(6);
                assert.equal(CD0001, '\u0001CD001');
            });
            //console.log(cso);
        });
    });

    it('should work with iso', function () {
        return _cso.Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer)).then(function (cso) {
            return _iso.Iso.fromStreamAsync(cso).then(function (iso) {
                assert.equal(JSON.stringify(iso.children.slice(0, 4).map(function (node) {
                    return node.path;
                })), JSON.stringify(["path", "path/0", "path/1", "path/2"]));
            });
        });
    });
});
//# sourceMappingURL=csoTest.js.map
},
"test/format/isoTest": function(module, exports, require) {
var _iso = require('../../src/format/iso');

describe('iso', function () {
    var isoData;

    before(function () {
        return downloadFileAsync('samples/cube.iso').then(function (data) {
            isoData = new Uint8Array(data);
        });
    });

    it('should load fine', function () {
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        return _iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            assert.equal(JSON.stringify(iso.children.map(function (item) {
                return item.path;
            })), JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"]));
        });
    });
});
//# sourceMappingURL=isoTest.js.map
},
"test/format/pbpTest": function(module, exports, require) {
var _pbp = require('../../src/format/pbp');

var Pbp = _pbp.Pbp;

describe('pbp', function () {
    var rtctestPbpArrayBuffer;

    before(function () {
        return downloadFileAsync('samples/rtctest.pbp').then(function (data) {
            rtctestPbpArrayBuffer = data;
        });
    });

    it('should load fine', function () {
        var pbp = new Pbp();
        pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
        var pspData = pbp.get('psp.data');
        assert.equal(pspData.length, 77550);
    });
});
//# sourceMappingURL=pbpTest.js.map
},
"test/format/psfTest": function(module, exports, require) {
var _psf = require('../../src/format/psf');

var Psf = _psf.Psf;

describe('psf', function () {
    var rtctestPsfArrayBuffer;

    before(function () {
        return downloadFileAsync('samples/rtctest.psf').then(function (data) {
            rtctestPsfArrayBuffer = data;
        });
    });

    it('should load fine', function () {
        var psf = new Psf();
        psf.load(Stream.fromArrayBuffer(rtctestPsfArrayBuffer));
        assert.equal(psf.entriesByName['BOOTABLE'], 1);
        assert.equal(psf.entriesByName['CATEGORY'], 'MG');
        assert.equal(psf.entriesByName['DISC_ID'], 'UCJS10041');
        assert.equal(psf.entriesByName['DISC_VERSION'], '1.00');
        assert.equal(psf.entriesByName['PARENTAL_LEVEL'], 1);
        assert.equal(psf.entriesByName['PSP_SYSTEM_VER'], '1.00');
        assert.equal(psf.entriesByName['REGION'], 32768);
        assert.equal(psf.entriesByName['TITLE'], 'rtctest');
    });
});
//# sourceMappingURL=psfTest.js.map
},
"test/format/zipTest": function(module, exports, require) {
var _zip = require('../../src/format/zip');
var _vfs = require('../../src/hle/vfs');

describe('zip', function () {
    var arrayBuffer;

    before(function () {
        return downloadFileAsync('samples/TrigWars.zip').then(function (data) {
            arrayBuffer = data;
        });
    });

    it('should load fine', function () {
        return _zip.Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then(function (zip) {
            assert.equal(27233, zip.get('/EBOOT.PBP').uncompressedSize);
            assert.equal(63548, zip.get('/Data/Sounds/bullet.wav').uncompressedSize);

            assert.equal(63548, zip.get('/DATA/SOUNDS/Bullet.Wav').uncompressedSize);

            return zip.get('/DATA/SOUNDS/Bullet.Wav').readAsync().then(function (data) {
                assert.equal(63548, data.length);
                //console.log(data);
            });
        });
    });

    it('zip vfs should work', function () {
        return _zip.Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then(function (zip) {
            var vfs = new _vfs.ZipVfs(zip);
            return vfs.getStatAsync('/Data/Sounds/bullet.wav').then(function (info) {
                assert.equal(false, info.isDirectory);
                assert.equal(63548, info.size);
            });
        });
    });
});
//# sourceMappingURL=zipTest.js.map
},
"test/gpuTest": function(module, exports, require) {
var _state = require('../src/core/gpu/state');
var _gpu = require('../src/core/gpu/gpu');

describe('gpu', function () {
    describe('vertex reading', function () {
        it('should work', function () {
            var vertexState = new _state.VertexState();
            vertexState.size = 10;

            vertexState.texture = 0 /* Void */;
            vertexState.color = 0 /* Void */;
            vertexState.normal = 0 /* Void */;
            vertexState.position = 2 /* Short */;
            vertexState.weight = 0 /* Void */;
            vertexState.index = 0 /* Void */;
            vertexState.weightCount = 1;
            vertexState.morphingVertexCount = 1;
            vertexState.transform2D = true;
            vertexState.textureComponentCount = 2;

            var vertexReader = _gpu.VertexReaderFactory.get(vertexState);

            var vertexInput = new DataView(new ArrayBuffer(128));
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

            var vertex1 = new _state.Vertex();
            var vertex2 = new _state.Vertex();

            //console.log(vertexReader.readCode);
            vertexReader.readCount([vertex1, vertex2], vertexInput, null, 2);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
        });
    });
});
//# sourceMappingURL=gpuTest.js.map
},
"test/hle/elfTest": function(module, exports, require) {
var _memory = require('../../src/core/memory');
var _cpu = require('../../src/core/cpu');
var _display = require('../../src/core/display');
var _manager = require('../../src/hle/manager');
var _elf_psp = require('../../src/hle/elf_psp');
var _context = require('../../src/context');
var pspmodules = require('../../src/hle/pspmodules');

var PspElfLoader = _elf_psp.PspElfLoader;

var ModuleManager = _manager.ModuleManager;
var SyscallManager = _cpu.SyscallManager;
var DummyPspDisplay = _display.DummyPspDisplay;
var EmulatorContext = _context.EmulatorContext;

describe('elf', function () {
    var stream;

    before(function () {
        return downloadFileAsync('samples/counter.elf').then(function (data) {
            stream = Stream.fromArrayBuffer(data);
        });
    });

    it('load', function () {
        //var stream = Stream.fromBase64(minifireElfBase64);
        var memory = _memory.Memory.instance;
        var memoryManager = new _manager.MemoryManager();
        var display = new DummyPspDisplay();
        var syscallManager = new SyscallManager(context);
        var context = new EmulatorContext();
        var moduleManager = new ModuleManager(context);
        pspmodules.registerModulesAndSyscalls(syscallManager, moduleManager);

        context.init(null, display, null, null, memoryManager, null, null, memory, null, null, null, null, null);

        var elf = new PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
        console.log(elf);
    });
});
//# sourceMappingURL=elfTest.js.map
},
"test/hle/memorymanagerTest": function(module, exports, require) {
var _manager = require('../../src/hle/manager');

var MemoryAnchor = _manager.MemoryAnchor;
var MemoryPartition = _manager.MemoryPartition;

describe("memorymanager", function () {
    it("low", function () {
        var partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        var p1 = partition.allocate(25, 0 /* Low */);
        var p2 = partition.allocate(25, 0 /* Low */);
        var p3 = partition.allocate(25, 0 /* Low */);

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 25);

        p2.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 50);

        p3.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 75);
        assert.equal(partition.getTotalFreeMemory(), 75);
    });

    it("low2", function () {
        var partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        var p1 = partition.allocateLow(25);
        var p2 = partition.allocateLow(25);
        var p3 = partition.allocateLow(25);

        assert.equal(partition.getTotalFreeMemory(), 25);
        assert.equal(partition.getMaxContiguousFreeMemory(), 25);

        p3.deallocate();

        assert.equal(partition.getTotalFreeMemory(), 50);
        assert.equal(partition.getMaxContiguousFreeMemory(), 50);

        p1.unallocate();

        console.info(partition);

        assert.equal(partition.getTotalFreeMemory(), 75);
        assert.equal(partition.getMaxContiguousFreeMemory(), 50);
    });

    it("high", function () {
        var partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        var p1 = partition.allocateHigh(25);
        var p2 = partition.allocateHigh(25);
        var p3 = partition.allocateHigh(25);

        assert.equal(partition.getTotalFreeMemory(), 25);
        assert.equal(partition.getMaxContiguousFreeMemory(), 25);

        p3.deallocate();

        assert.equal(partition.getTotalFreeMemory(), 50);
        assert.equal(partition.getMaxContiguousFreeMemory(), 50);

        p1.unallocate();

        assert.equal(partition.getTotalFreeMemory(), 75);
        assert.equal(partition.getMaxContiguousFreeMemory(), 50);
    });
});
//# sourceMappingURL=memorymanagerTest.js.map
},
"test/hle/vfsTest": function(module, exports, require) {
var _iso = require('../../src/format/iso');
var _psf = require('../../src/format/psf');
var _vfs = require('../../src/hle/vfs');
_vfs.StorageVfs;

var StorageVfs = _vfs.StorageVfs;
var MemoryVfs = _vfs.MemoryVfs;
var MemoryStickVfs = _vfs.MemoryStickVfs;
var FileOpenFlags = _vfs.FileOpenFlags;

describe('vfs', function () {
    var isoData;

    before(function () {
        return downloadFileAsync('samples/cube.iso').then(function (data) {
            isoData = new Uint8Array(data);
        });
    });

    it('iso', function () {
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        return _iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            var vfs = new _vfs.IsoVfs(iso);
            return vfs.openAsync("PSP_GAME/PARAM.SFO", 1 /* Read */, parseInt('777', 8)).then(function (file) {
                return file.readAllAsync().then(function (content) {
                    var psf = _psf.Psf.fromStream(Stream.fromArrayBuffer(content));
                    assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041");
                });
            });
        });
    });

    it('storage', function () {
        var storageVfs = new StorageVfs('test');

        return Promise.resolve(0).then(function () {
            storageVfs.writeAllAsync('simple', new Uint8Array([1, 2, 3, 4, 5]).buffer);
        }).then(function () {
            return storageVfs.getStatAsync('simple').then(function (stat) {
                assert.equal('simple', stat.name);
                assert.equal(5, stat.size);
            });
        }).then(function () {
            return storageVfs.readAllAsync('simple').then(function (data) {
                assert.equal(5, data.byteLength);
            });
        }).then(function () {
            return storageVfs.readAllAsync('nonExistant').then(function (data) {
                assert['fail']();
            }).catch(function (e) {
                assert.equal("File 'nonExistant' doesn't exist", e.message);
            });
        }).then(function () {
            return storageVfs.openAsync('simple2', 512 /* Create */ | 2 /* Write */ | 1024 /* Truncate */, parseIntFormat('0777')).then(function (file) {
                return Promise.resolve(0).then(function () {
                    return file.writeChunkAsync(0, new Int8Array([1, 2, 3, 4, 5]).buffer);
                }).then(function () {
                    return file.writeChunkAsync(2, new Int8Array([-3, -4, -5, -6, -7]).buffer);
                }).then(function () {
                    return file.readAllAsync().then(function (data) {
                        var v = new Int8Array(data);
                        assert.equal(7, v.length);
                        assert.equal(1, v[0]);
                        assert.equal(2, v[1]);
                        assert.equal(-3, v[2]);
                        assert.equal(-4, v[3]);
                        assert.equal(-5, v[4]);
                        assert.equal(-6, v[5]);
                        assert.equal(-7, v[6]);
                    });
                });
                ;
            });
        });
    });

    it('memorystick', function () {
        var storageVfs = new StorageVfs('test');
        var msVfs = new MemoryStickVfs([storageVfs], null, null);

        return Promise.resolve(0).then(function () {
            msVfs.writeAllAsync('simple', new Uint8Array([1, 2, 3, 4, 5]).buffer);
        }).then(function () {
            return msVfs.getStatAsync('simple').then(function (stat) {
                assert.equal('simple', stat.name);
                assert.equal(5, stat.size);
            });
        }).then(function () {
            return msVfs.readAllAsync('simple').then(function (data) {
                assert.equal(5, data.byteLength);
            });
        }).then(function () {
            return msVfs.readAllAsync('nonExistant').then(function (data) {
                assert['fail']();
            }).catch(function (e) {
                assert.equal("File 'nonExistant' doesn't exist", e.message);
            });
        });
    });

    it('memorystick_combined', function () {
        var vfs1 = new MemoryVfs();
        var vfs2 = new MemoryVfs();

        var msVfs = new MemoryStickVfs([vfs1, vfs2], null, null);

        return Promise.resolve(0).then(function () {
            vfs1.writeAllAsync('simple1', new Uint8Array([1, 2, 3, 4, 5]).buffer);
            vfs2.writeAllAsync('simple2', new Uint8Array([1, 2, 3, 4, 5]).buffer);
        }).then(function () {
            return msVfs.getStatAsync('simple1').then(function (stat) {
                console.log(stat);
                assert.equal('simple1', stat.name);
                assert.equal(5, stat.size);
            });
        }).then(function () {
            return msVfs.getStatAsync('simple2').then(function (stat) {
                assert.equal('simple2', stat.name);
                assert.equal(5, stat.size);
            });
        });
    });
});
//# sourceMappingURL=vfsTest.js.map
},
"test/instructionTest": function(module, exports, require) {
var _cpu = require('../src/core/cpu');

var Instructions = _cpu.Instructions;

describe('instruction lookup', function () {
    var instructions = Instructions.instance;

    it('should accept locate instruction by name', function () {
        assert.equal(instructions.findByName('addi').name, 'addi');
        assert.equal(instructions.findByName('lui').name, 'lui');
        assert.equal(instructions.findByName('syscall').name, 'syscall');
        assert.equal(instructions.findByName('mflo').name, 'mflo');
        assert.equal(instructions.findByName('sb').name, 'sb');
    });

    it('should accept locate instruction by data', function () {
        assert.equal(instructions.findByData(0x0C000000).name, 'jal');
        assert.equal(instructions.findByData(0x3C100890).name, 'lui');
        assert.equal(instructions.findByData(0x00081C4C).name, 'syscall');
        assert.equal(instructions.findByData(0x00001012).name, 'mflo');
        assert.equal(instructions.findByData(0xA0410004).name, 'sb');
    });
});
//# sourceMappingURL=instructionTest.js.map
},
"test/pspautotests": function(module, exports, require) {
var _emulator = require('../src/emulator');

var Emulator = _emulator.Emulator;

describe('pspautotests', function () {
    this.timeout(5000);

    var tests = [
        { "audio/atrac": ["atractest", "decode", "ids", "resetting", "setdata"] },
        { "audio/mp3": ["mp3test"] },
        { "audio/sascore": ["adsrcurve", "getheight", "keyoff", "keyon", "noise", "outputmode", "pause", "pcm", "pitch", "sascore", "setadsr", "vag"] },
        { "audio/sceaudio": ["datalen", "output", "reserve"] },
        { "cpu/cpu_alu": ["cpu_alu", "cpu_branch"] },
        { "cpu/fpu": ["fcr", "fpu"] },
        { "cpu/icache": ["icache"] },
        { "cpu/lsu": ["lsu"] },
        { "cpu/vfpu": ["colors", "convert", "gum", "matrix", "prefixes", "vector"] },
        { "ctrl": ["ctrl", "vblank"] },
        { "ctrl/idle": ["idle"] },
        { "ctrl/sampling": ["sampling"] },
        { "ctrl/sampling2": ["sampling2"] },
        { "display": ["display", "hcount", "vblankmulti"] },
        { "dmac": ["dmactest"] },
        { "font": ["altcharcode", "charglyphimage", "charglyphimageclip", "charimagerect", "charinfo", "find", "fontinfo", "fontinfobyindex", "fontlist", "fonttest", "newlib", "open", "openfile", "openmem", "optimum", "resolution", "shadowglyphimage", "shadowglyphimageclip", "shadowimagerect", "shadowinfo"] },
        { "gpu/callbacks": ["ge_callbacks"] },
        { "gpu/commands": ["basic", "blocktransfer", "material"] },
        { "gpu/complex": ["complex"] },
        { "gpu/displaylist": ["state"] },
        { "gpu/ge": ["break", "context", "edram", "get", "queue"] },
        { "gpu/reflection": ["reflection"] },
        { "gpu/rendertarget": ["rendertarget"] },
        { "gpu/signals": ["continue", "jumps", "pause", "simple", "suspend", "sync"] },
        { "gpu/simple": ["simple"] },
        { "gpu/triangle": ["triangle"] },
        { "hash": ["hash"] },
        { "hle": ["check_not_used_uids"] },
        { "intr": ["intr", "suspended", "waits"] },
        { "intr/vblank": ["vblank"] },
        { "io/cwd": ["cwd"] },
        { "io/directory": ["directory"] },
        { "io/file": ["file", "rename"] },
        { "io/io": ["io"] },
        { "io/iodrv": ["iodrv"] },
        { "kirk": ["kirk"] },
        { "loader/bss": ["bss"] },
        { "malloc": ["malloc"] },
        { "misc": ["dcache", "deadbeef", "libc", "sdkver", "testgp", "timeconv"] },
        { "modules/loadexec": ["loader"] },
        { "mstick": ["mstick"] },
        { "net/http": ["http"] },
        { "net/primary": ["ether"] },
        { "power": ["cpu", "freq", "power"] },
        { "power/volatile": ["lock", "trylock", "unlock"] },
        { "rtc": ["arithmetic", "convert", "lookup", "rtc"] },
        { "string": ["string"] },
        { "sysmem": ["freesize", "memblock", "partition", "sysmem"] },
        { "threads/alarm": ["alarm"] },
        { "threads/alarm/cancel": ["cancel"] },
        { "threads/alarm/refer": ["refer"] },
        { "threads/alarm/set": ["set"] },
        { "threads/callbacks": ["callbacks", "cancel", "check", "count", "create", "delete", "exit", "notify", "refer"] },
        { "threads/events/cancel": ["cancel"] },
        { "threads/events/clear": ["clear"] },
        { "threads/events/create": ["create"] },
        { "threads/events/delete": ["delete"] },
        { "threads/events": ["events"] },
        { "threads/events/poll": ["poll"] },
        { "threads/events/refer": ["refer"] },
        { "threads/events/set": ["set"] },
        { "threads/events/wait": ["wait"] },
        { "threads/fpl": ["allocate", "cancel", "create", "delete", "fpl", "free", "priority", "refer", "tryallocate"] },
        { "threads/k0": ["k0"] },
        { "threads/lwmutex": ["create", "delete", "lock", "priority", "refer", "try", "try600", "unlock"] },
        { "threads/mbx/cancel": ["cancel"] },
        { "threads/mbx/create": ["create"] },
        { "threads/mbx/delete": ["delete"] },
        { "threads/mbx": ["mbx"] },
        { "threads/mbx/poll": ["poll"] },
        { "threads/mbx/priority": ["priority"] },
        { "threads/mbx/receive": ["receive"] },
        { "threads/mbx/refer": ["refer"] },
        { "threads/mbx/send": ["send"] },
        { "threads/msgpipe": ["cancel", "create", "data", "delete", "msgpipe", "receive", "refer", "send", "tryreceive", "trysend"] },
        { "threads/mutex": ["cancel", "create", "delete", "lock", "mutex", "priority", "refer", "try", "unlock"] },
        { "threads/scheduling": ["dispatch", "scheduling"] },
        { "threads/semaphores": ["cancel", "create", "delete", "fifo", "poll", "priority", "refer", "semaphores", "signal", "wait"] },
        { "threads/semaphores/semaphore_greater_than_zero": ["semaphore_greater_than_zero"] },
        { "threads/threads": ["change", "create", "exitstatus", "extend", "refer", "release", "rotate", "stackfree", "start", "suspend", "terminate", "threadend", "threads"] },
        { "threads/vpl": ["allocate", "cancel", "create", "delete", "fifo", "free", "order", "priority", "refer", "try", "vpl"] },
        { "threads/vtimers": ["cancelhandler", "create", "delete", "getbase", "gettime", "interrupt", "refer", "sethandler", "settime", "start", "stop", "vtimer"] },
        { "threads/wakeup": ["wakeup"] },
        { "umd/callbacks": ["umd"] },
        { "umd/io": ["umd_io"] },
        { "umd/raw_access": ["raw_access", "raw_acess"] },
        { "umd": ["register"] },
        { "umd/wait": ["wait"] },
        { "utility/msgdialog": ["abort", "dialog"] },
        { "utility/savedata": ["autosave", "filelist", "getsize", "idlist", "makedata", "sizes"] },
        { "utility/systemparam": ["systemparam"] },
        { "video/mpeg": ["basic"] },
        { "video/mpeg/ringbuffer": ["avail", "construct", "destruct", "memsize", "packnum"] },
        { "video/pmf": ["pmf"] },
        { "video/pmf_simple": ["pmf_simple"] },
        { "video/psmfplayer": ["basic", "create", "getpsmfinfo", "setpsmf", "setpsmfoffset", "settempbuf"] }
    ];

    function normalizeString(string) {
        return string.replace(/(\r\n|\r)/gm, '\n').replace(/[\r\n\s]+$/gm, '');
    }

    function compareLines2(lines1, lines2) {
        return new difflib.SequenceMatcher(lines1, lines2).get_opcodes();
    }

    function compareText2(text1, text2) {
        return new difflib.SequenceMatcher(difflib.stringAsLines(text1), difflib.stringAsLines(text2)).get_opcodes();
    }

    /*
    function compareLines(text1, text2) {
    var out = [];
    var sm = new difflib.SequenceMatcher(text1, text2);
    var opcodes = sm.get_opcodes();
    for (var n = 0; n < opcodes.length; n++) {
    var opcode = <string>(opcodes[n]);
    var start1 = <number><any>(opcode[1]), end1 = <number><any>(opcode[2]);
    var start2 = <number><any>(opcode[3]), end2 = <number><any>(opcode[4]);
    var length1 = end1 - start1;
    var length2 = end2 - start2;
    switch (opcode[0]) {
    case 'equal': for (var m = start1; m < end1; m++) out.push(['', m, text1[m]]); break;
    case 'delete': for (var m = start1; m < end1; m++) out.push(['-', m, text1[m]]); break;
    case 'insert': for (var m = start2; m < end2; m++) out.push(['+', m, text1[m]]); break;
    case 'replace':
    if (length1 == length2) {
    for (var m = 0; m < length1; m++) {
    out.push(['!', m + start1, m + start2, text1[m + start1], text2[m + start2]]);
    }
    } else {
    for (var m = start1; m < end1; m++) out.push(['-', m, text1[m]]);
    for (var m = start2; m < end2; m++) out.push(['+', m, text2[m]]);
    }
    break;
    }
    }
    return out;
    }
    
    function compareText(text1, text2) {
    return compareLines(difflib.stringAsLines(text1), difflib.stringAsLines(text2));
    }
    */
    //console.log(compareText('a', 'b'));
    function compareOutput(name, output, expected) {
        output = normalizeString(output);
        expected = normalizeString(expected);

        var outputLines = difflib.stringAsLines(output);
        var expectedLines = difflib.stringAsLines(expected);

        var equalLines = 0;
        var totalLines = expectedLines.length;
        console.groupCollapsed(name + ' (TEST RESULT DIFF)');

        var opcodes = compareText2(output, expected);

        for (var n = 0; n < opcodes.length; n++) {
            var opcode = (opcodes[n]);
            var start1 = (opcode[1]), end1 = (opcode[2]);
            var start2 = (opcode[3]), end2 = (opcode[4]);
            var length1 = end1 - start1;
            var length2 = end2 - start2;
            switch (opcode[0]) {
                case 'equal':
                    var showBegin = (n > 0);
                    var showEnd = (n < opcodes.length - 1);
                    var broke = false;
                    for (var m = start1; m < end1; m++) {
                        if (!((showBegin && m < start1 + 2) || (showEnd && m > end1 - 2))) {
                            if (!broke)
                                console.log(' ...');
                            broke = true;
                            continue;
                        }
                        console.log(sprintf('\u2714%04d %s', m + 1, outputLines[m]));
                        equalLines++;
                    }
                    break;
                case 'delete':
                    for (var m = start1; m < end1; m++)
                        console.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
                    break;
                case 'insert':
                    for (var m = start2; m < end2; m++)
                        console.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
                    break;
                case 'replace':
                    if (length1 == length2) {
                        for (var m = 0; m < length1; m++) {
                            console.warn(sprintf('\u2716%04d %s', m + start1 + 1, outputLines[m + start1]));
                            console.info(sprintf(' %04d %s', m + start2 + 1, expectedLines[m + start2]));
                        }
                    } else {
                        for (var m = start1; m < end1; m++)
                            console.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
                        for (var m = start2; m < end2; m++)
                            console.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
                    }
                    break;
            }
            //console.log(opcode);
        }
        var distinctLines = totalLines - equalLines;

        /*
        var output_lines = output.split('\n');
        var expected_lines = expected.split('\n');
        
        var distinctLines = 0;
        var totalLines = Math.max(output_lines.length, expected_lines.length)
        console.groupCollapsed('TEST RESULT: ' + name);
        var linesToShow = {};
        for (var n = 0; n < totalLines; n++) {
        if (output_lines[n] != expected_lines[n]) {
        distinctLines++;
        for (var m = -2; m <= 2; m++) linesToShow[n + m] = true;
        }
        }
        
        for (var n = 0; n < totalLines; n++) {
        var lineNumber = n + 1;
        var output_line = output_lines[n];
        var expected_line = expected_lines[n];
        if (linesToShow[n]) {
        if (output_line != expected_line) {
        console.warn(sprintf('%04d: %s', lineNumber, output_line));
        console.info(sprintf('%04d: %s', lineNumber, expected_line));
        } else {
        console.log(sprintf('%04d: %s', lineNumber, output_line));
        }
        }
        }
        
        if (distinctLines == 0) console.log('great: output and expected are equal!');
        */
        var table = [];
        for (var n = 0; n < Math.max(outputLines.length, expectedLines.length); n++) {
            table[n + 1] = { output: outputLines[n], expected: expectedLines[n] };
        }

        console.groupEnd();

        console.groupCollapsed(name + ' (TEST RESULT TABLE)');
        if (console['table'])
            console['table'](table);
        console.groupEnd();

        assert(output == expected, "Output not expected. " + distinctLines + "/" + totalLines + " lines didn't match. Please check console for details.");
    }

    var groupCollapsed = false;

    tests.forEach(function (testGroup) {
        _.keys(testGroup).forEach(function (testGroupName) {
            describe(testGroupName, function () {
                var testNameList = testGroup[testGroupName];

                testNameList.forEach(function (testName) {
                    it(testName, function () {
                        var emulator = new Emulator();
                        var file_base = '../pspautotests/tests/' + testGroupName + '/' + testName;
                        var file_prx = file_base + '.prx';
                        var file_expected = file_base + '.expected';

                        if (!groupCollapsed)
                            console.groupEnd();
                        groupCollapsed = false;
                        console.groupCollapsed('' + testName);
                        return downloadFileAsync(file_prx).then(function (data_prx) {
                            return downloadFileAsync(file_expected).then(function (data_expected) {
                                var string_expected = String.fromCharCode.apply(null, new Uint8Array(data_expected));

                                return emulator.loadExecuteAndWaitAsync(MemoryAsyncStream.fromArrayBuffer(data_prx), file_prx).then(function () {
                                    groupCollapsed = true;
                                    console.groupEnd();
                                    compareOutput(testName, emulator.emulatorVfs.output, string_expected);
                                    if (emulator.emulatorVfs.screenshot != null) {
                                        throw (new Error("Not implemented screenshot comparison"));
                                    }
                                });
                            });
                        });
                        //emulator.executeFileAsync
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=pspautotests.js.map
},
"test/testasm": function(module, exports, require) {
var _cpu = require('../src/core/cpu');
var _memory = require('../src/core/memory');

var Memory = _memory.Memory;

var CpuState = _cpu.CpuState;

var InstructionCache = _cpu.InstructionCache;
var ProgramExecutor = _cpu.ProgramExecutor;

var assembler = new _cpu.MipsAssembler();
var disassembler = new _cpu.MipsDisassembler();
var memory = Memory.instance;

var TestSyscallManager = (function () {
    function TestSyscallManager() {
    }
    TestSyscallManager.prototype.call = function (state, id) {
    };
    return TestSyscallManager;
})();

function executeProgram(gprInitial, program) {
    program = program.slice(0);
    program.push('break 0');
    assembler.assembleToMemory(memory, 4, program);
    var state = new CpuState(memory, new TestSyscallManager());
    var instructionCache = new InstructionCache(memory);
    var programExecuter = new ProgramExecutor(state, instructionCache);

    for (var key in gprInitial) {
        if (key.substr(0, 1) == '$') {
            state.gpr[parseInt(key.substr(1))] = gprInitial[key];
        } else {
            state[key] = gprInitial[key];
        }
    }

    state.PC = 4;
    state.SP = 0x10000;
    programExecuter.execute(1000);
    return state;
}

function generateGpr3Matrix(op, vector) {
    var gprInitial = {};
    var outputMatrix = [];
    for (var n = 0; n < vector.length; n++)
        gprInitial['$' + (15 + n)] = vector[n];

    for (var n = 0; n < vector.length; n++) {
        var program = [];
        for (var m = 0; m < vector.length; m++) {
            program.push(sprintf('%s $%d, $%d, $%d', op, 1 + m, 15 + n, 15 + m));
        }
        var state = executeProgram(gprInitial, program);
        var outputVector = [];
        for (var m = 0; m < vector.length; m++)
            outputVector.push(sprintf('%08X', state.gpr[1 + m]));
        outputMatrix.push(outputVector);
        //console.log(state);
    }
    return outputMatrix;
}

function assertProgram(description, gprInitial, program, gprAssertions) {
    var state = executeProgram(gprInitial, program);

    for (var key in gprAssertions) {
        var value = 0;
        if (key.substr(0, 1) == '$') {
            value = state.gpr[parseInt(key.substr(1))];
        } else {
            value = state[key];
        }
        assert.equal(sprintf('%08X', value), sprintf('%08X', gprAssertions[key]), description + ': ' + key + ' == ' + sprintf('%08X', gprAssertions[key]));
    }
}

describe('cpu running', function () {
    it('simple', function () {
        assertProgram("subtract 1", {}, ["li r1, 100", "addiu r1, r1, -1"], { $1: 99 });
        assertProgram("xor", { "$1": 0xFF00FF00, "$2": 0x00FFFF00 }, ["xor r3, r1, r2"], { $3: 0xFFFF0000 });

        assertProgram("some arithmetic", { $1: -1, $2: -1, $3: -1, $4: -1, $11: 11, $12: 12 }, [
            "add  r1, r0, r11",
            "add  r2, r0, r12",
            "sub  r3, r2, r1",
            "addi r4, r0, 1234"
        ], { $1: 11, $2: 12, $3: 1, $4: 1234 });
    });
    it('set less than', function () {
        assertProgram("set less than", { "$1": 0x77777777, "$10": 0, "$11": -100, "$12": +100, "$20": 0, "$21": 7, "$22": -200 }, [
            "sltu r1, r10, r20",
            "sltu r2, r10, r21",
            "sltu r3, r11, r22",
            "slt  r4, r11, r22"
        ], { "$1": 0, "$2": 1, "$3": 0, "$4": 0 });
    });
    it('divide', function () {
        assertProgram("divide", {}, ["li r10, 100", "li r11, 12", "div r10, r11"], { HI: 4, LO: 8 });
    });
    it('branch', function () {
    });

    it('shift', function () {
    });

    it('load/write', function () {
        assertProgram("loadwrite", { "$1": 0x7F, "$2": 0x100 }, [
            "sb r1, 4(r2)",
            "sb r1, 5(r2)",
            "sb r1, 6(r2)",
            "sb r1, 7(r2)",
            "lw r3, 4(r2)",
            "sw r3, 8(r2)",
            "lw r5, 8(r2)",
            "addi r5, r5, 1"
        ], { "$3": 0x7F7F7F7F, "$5": 0x7F7F7F80 });
    });

    it('opcode add/addu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "00000001", "00000309", "80000000", "7FFFFFFF", "FFFFFFFF"],
            ["00000001", "00000002", "0000030A", "80000001", "80000000", "00000000"],
            ["00000309", "0000030A", "00000612", "80000309", "80000308", "00000308"],
            ["80000000", "80000001", "80000309", "00000000", "FFFFFFFF", "7FFFFFFF"],
            ["7FFFFFFF", "80000000", "80000308", "FFFFFFFF", "FFFFFFFE", "7FFFFFFE"],
            ["FFFFFFFF", "00000000", "00000308", "7FFFFFFF", "7FFFFFFE", "FFFFFFFE"]
        ];
        var matrix_add = generateGpr3Matrix('add', combineValues);
        var matrix_addu = generateGpr3Matrix('addu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_add));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_addu));
    });

    it('opcode sub/subu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "FFFFFFFF", "FFFFFCF7", "80000000", "80000001", "00000001"],
            ["00000001", "00000000", "FFFFFCF8", "80000001", "80000002", "00000002"],
            ["00000309", "00000308", "00000000", "80000309", "8000030A", "0000030A"],
            ["80000000", "7FFFFFFF", "7FFFFCF7", "00000000", "00000001", "80000001"],
            ["7FFFFFFF", "7FFFFFFE", "7FFFFCF6", "FFFFFFFF", "00000000", "80000000"],
            ["FFFFFFFF", "FFFFFFFE", "FFFFFCF6", "7FFFFFFF", "80000000", "00000000"]
        ];
        var matrix_sub = generateGpr3Matrix('sub', combineValues);
        var matrix_subu = generateGpr3Matrix('subu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_sub));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_subu));
    });

    it('opcode slvl', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000002, 0x0000000A, 0x0000001F, 0x00000020, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000"],
            ["00000001", "00000002", "00000004", "00000400", "80000000", "00000001", "00000001", "80000000", "80000000"],
            ["00000002", "00000004", "00000008", "00000800", "00000000", "00000002", "00000002", "00000000", "00000000"],
            ["0000000A", "00000014", "00000028", "00002800", "00000000", "0000000A", "0000000A", "00000000", "00000000"],
            ["0000001F", "0000003E", "0000007C", "00007C00", "80000000", "0000001F", "0000001F", "80000000", "80000000"],
            ["00000020", "00000040", "00000080", "00008000", "00000000", "00000020", "00000020", "00000000", "00000000"],
            ["80000000", "00000000", "00000000", "00000000", "00000000", "80000000", "80000000", "00000000", "00000000"],
            ["7FFFFFFF", "FFFFFFFE", "FFFFFFFC", "FFFFFC00", "80000000", "7FFFFFFF", "7FFFFFFF", "80000000", "80000000"],
            ["FFFFFFFF", "FFFFFFFE", "FFFFFFFC", "FFFFFC00", "80000000", "FFFFFFFF", "FFFFFFFF", "80000000", "80000000"]
        ];
        var matrix = generateGpr3Matrix('sllv', combineValues);
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix));
    });

    it('opcode mult', function () {
        assertProgram("mult", { "$1": 7, "$2": 9 }, ["mult $1, $2"], { "LO": 7 * 9, "HI": 0 });
        assertProgram("mult", { "$1": -1, "$2": 9 }, ["mult $1, $2"], { "LO": -1 * 9, "HI": -1 });
    });
});
//# sourceMappingURL=testasm.js.map
},
"test/util/utilsTest": function(module, exports, require) {
describe('utils', function () {
    describe('string repeat', function () {
        it('simple', function () {
            assert.equal('', String_repeat('a', 0));
            assert.equal('a', String_repeat('a', 1));
            assert.equal('aaaa', String_repeat('a', 4));
        });
    });

    describe('Binary layouts', function () {
        it('should read int32', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int32.read(stream), 0x04030201);
        });

        it('should read int16', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int16.read(stream), 0x0201);
            assert.equal(Int16.read(stream), 0x0403);
        });

        it('should read simple struct', function () {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            var MyStruct = Struct.create([
                { item1: Int16 },
                { item2: Int16 }
            ]);
            assert.equal(JSON.stringify(MyStruct.read(stream)), JSON.stringify({ item1: 0x0201, item2: 0x0403 }));
        });
    });

    describe('Binary search', function () {
        it('none', function () {
            var test = [];
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(0, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(11, b);
            }));
        });

        it('one', function () {
            var test = [10];
            assert.equal(0, test.binarySearchIndex(function (b) {
                return compareNumbers(10, b);
            }));

            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(0, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(11, b);
            }));
        });

        it('odd', function () {
            var test = [10, 20, 30, 50, 100];
            assert.equal(0, test.binarySearchIndex(function (b) {
                return compareNumbers(10, b);
            }));
            assert.equal(1, test.binarySearchIndex(function (b) {
                return compareNumbers(20, b);
            }));
            assert.equal(2, test.binarySearchIndex(function (b) {
                return compareNumbers(30, b);
            }));
            assert.equal(3, test.binarySearchIndex(function (b) {
                return compareNumbers(50, b);
            }));
            assert.equal(4, test.binarySearchIndex(function (b) {
                return compareNumbers(100, b);
            }));

            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(0, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(11, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(21, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(31, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(51, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(101, b);
            }));
        });

        it('even', function () {
            var test = [10, 20, 30, 50, 100, 110];
            assert.equal(0, test.binarySearchIndex(function (b) {
                return compareNumbers(10, b);
            }));
            assert.equal(1, test.binarySearchIndex(function (b) {
                return compareNumbers(20, b);
            }));
            assert.equal(2, test.binarySearchIndex(function (b) {
                return compareNumbers(30, b);
            }));
            assert.equal(3, test.binarySearchIndex(function (b) {
                return compareNumbers(50, b);
            }));
            assert.equal(4, test.binarySearchIndex(function (b) {
                return compareNumbers(100, b);
            }));
            assert.equal(5, test.binarySearchIndex(function (b) {
                return compareNumbers(110, b);
            }));

            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(0, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(11, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(21, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(31, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(51, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(101, b);
            }));
            assert.equal(-1, test.binarySearchIndex(function (b) {
                return compareNumbers(111, b);
            }));
        });
    });
});
//# sourceMappingURL=utilsTest.js.map
}});
})();
