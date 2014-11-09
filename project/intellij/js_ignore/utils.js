///<reference path="../../typings/promise/promise.d.ts" />
///<reference path="../../typings/sprintf.d.ts" />
///<reference path="./array.ts" />
///<reference path="./math.ts" />
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
        if (maxSize === void 0) { maxSize = 16; }
        this.maxSize = maxSize;
        this.measure = measure;
        this.itemsMap = {};
        if (!measure)
            measure = (function (item) { return 1; });
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
            return this.items.sum(function (item) { return item.size; });
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
            var itemToDelete = this.items.min(function (item) { return item.lastUsedTime; });
            delete this.itemsMap[itemToDelete.id];
        }
    };
    AsyncCache.prototype.getOrGenerateAsync = function (id, generator) {
        var _this = this;
        var item = this.itemsMap[id];
        if (item) {
            item.lastUsedTime = Date.now();
            return Promise.resolve(item.value);
        }
        else {
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
var Pool = (function () {
    function Pool() {
    }
    return Pool;
})();
var UidCollection = (function () {
    function UidCollection(lastId) {
        if (lastId === void 0) { lastId = 1; }
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
    UidCollection.prototype.list = function () {
        var out = [];
        for (var key in this.items)
            out.push(this.items[key]);
        return out;
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
    Microtask.initOnce = function () {
        if (Microtask.initialized)
            return;
        window.addEventListener("message", Microtask.window_message, false);
        Microtask.__location = document.location.href;
        Microtask.initialized = true;
    };
    Microtask.window_message = function (e) {
        if (e.data == Microtask.__messageType)
            Microtask.execute();
    };
    Microtask.queue = function (callback) {
        Microtask.initOnce();
        Microtask.callbacks.push(callback);
        if (!Microtask.queued) {
            Microtask.queued = true;
            //window.postMessage(Microtask.__messageType, Microtask.__location);
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
    Microtask.initialized = false;
    Microtask.__messageType = '__Microtask_execute';
    Microtask.__location = null;
    return Microtask;
})();
self['polyfills'] = self['polyfills'] || {};
self['polyfills']['ArrayBuffer_slice'] = !ArrayBuffer.prototype.slice;
self['polyfills']['setImmediate'] = !self.setImmediate;
self['polyfills']['performance'] = !self.performance;
if (!self['performance']) {
    self['performance'] = {};
    self['performance']['now'] = function () {
        return Date.now();
    };
}
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
        try {
            return decodeURIComponent(escape(input));
        }
        catch (e) {
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
        if (offset === void 0) { offset = 0; }
        if (length === undefined)
            length = ((input.length >>> 2) - (offset >>> 2));
        return new Uint32Array(input.buffer, input.byteOffset + offset, length);
    };
    ArrayBufferUtils.uint8ToUint8 = function (input, offset, length) {
        if (offset === void 0) { offset = 0; }
        if (length === undefined)
            length = (input.length - offset);
        return new Uint8Array(input.buffer, input.byteOffset + offset, length);
    };
    ArrayBufferUtils.copy = function (input, inputPosition, output, outputPosition, length) {
        output.subarray(outputPosition, outputPosition + length).set(input.subarray(inputPosition, inputPosition + length));
        //for (var n = 0; n < length; n++) output[outputPosition + n] = input[inputPosition + n];
    };
    ArrayBufferUtils.cloneBytes = function (input) {
        var out = new Uint8Array(input.length);
        out.set(input);
        return out;
    };
    ArrayBufferUtils.concat = function (chunks) {
        var tmp = new Uint8Array(chunks.sum(function (chunk) { return chunk.byteLength; }));
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
                }
                else {
                    resolve();
                }
            }
            step();
        });
    };
    PromiseUtils.delayAsync = function (ms) {
        if (ms <= 0)
            return Promise.resolve(null);
        return new Promise(function (resolve, reject) { return setTimeout(resolve, ms); });
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
var Compensate;
(function (Compensate) {
    Compensate[Compensate["NO"] = 0] = "NO";
    Compensate[Compensate["YES"] = 1] = "YES";
})(Compensate || (Compensate = {}));
var WaitingThreadInfo = (function () {
    function WaitingThreadInfo(name, object, promise, callbacks, compensate) {
        if (compensate === void 0) { compensate = 1 /* YES */; }
        this.name = name;
        this.object = object;
        this.promise = promise;
        this.callbacks = callbacks;
        this.compensate = compensate;
    }
    return WaitingThreadInfo;
})();
var CpuBreakException = (function () {
    function CpuBreakException(name, message) {
        if (name === void 0) { name = 'CpuBreakException'; }
        if (message === void 0) { message = 'CpuBreakException'; }
        this.name = name;
        this.message = message;
    }
    return CpuBreakException;
})();
var SceKernelException = (function () {
    function SceKernelException(id, name, message) {
        if (name === void 0) { name = 'SceKernelException'; }
        if (message === void 0) { message = 'SceKernelException'; }
        this.id = id;
        this.name = name;
        this.message = message;
    }
    return SceKernelException;
})();
var DebugOnceArray = {};
function DebugOnce(name, times) {
    if (times === void 0) { times = 1; }
    if (DebugOnceArray[name] >= times)
        return false;
    if (DebugOnceArray[name]) {
        DebugOnceArray[name]++;
    }
    else {
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
        var s = ((i >> 16) & 0x00008000); // sign
        var e = ((i >> 23) & 0x000000ff) - (127 - 15); // exponent
        var f = ((i >> 0) & 0x007fffff); // fraction
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
        }
        else if (e == 0xff - (127 - 15)) {
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
        var s = (imm16 >> 15) & 0x00000001; // Sign
        var e = (imm16 >> 10) & 0x0000001f; // Exponent
        var f = (imm16 >> 0) & 0x000003ff; // Fraction
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
        }
        else if (e == 31) {
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
function htmlspecialchars(str) {
    return str.replace(/[&<>]/g, function (tag) {
        switch (tag) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
        }
        return tag;
    });
}
function mac2string(mac) {
    return sprintf("%02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}
function string2mac(string) {
    var array = String(string).split(':').map(function (item) { return parseInt(item, 16); });
    while (array.length < 6)
        array.push(0);
    return new Uint8Array(array);
}
var SignalCancelable = (function () {
    function SignalCancelable(signal, callback) {
        this.signal = signal;
        this.callback = callback;
    }
    SignalCancelable.prototype.cancel = function () {
        this.signal.remove(this.callback);
    };
    return SignalCancelable;
})();
var Signal = (function () {
    function Signal() {
        this.callbacks = [];
    }
    Object.defineProperty(Signal.prototype, "length", {
        get: function () {
            return this.callbacks.length;
        },
        enumerable: true,
        configurable: true
    });
    Signal.prototype.add = function (callback) {
        this.callbacks.push(callback);
        return new SignalCancelable(this, callback);
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
        return new SignalCancelable(this, once);
    };
    Signal.prototype.dispatch = function (value) {
        this.callbacks.forEach(function (callback) {
            callback(value);
        });
    };
    return Signal;
})();
var Logger = (function () {
    function Logger(policy, console, name) {
        this.policy = policy;
        this.console = console;
        this.name = name;
    }
    Logger.prototype.named = function (name) {
        return new Logger(this.policy, this.console, (this.name + '.' + name).replace(/^\.+/, ''));
    };
    Logger.prototype._log = function (type, level, args) {
        if (this.policy.canLog(this.name, level)) {
            args.unshift(this.name + ':');
            this.console[type].apply(this.console, args);
        }
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('debug', 0, args);
    };
    Logger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('log', 1, args);
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('info', 2, args);
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('warn', 3, args);
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('error', 4, args);
    };
    Logger.prototype.groupCollapsed = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('groupCollapsed', 5, args);
    };
    Logger.prototype.groupEnd = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this._log('groupEnd', 5, args);
    };
    return Logger;
})();
var LoggerPolicies = (function () {
    function LoggerPolicies() {
        this.disableAll = false;
        this.minLogLevel = 1;
    }
    LoggerPolicies.prototype.canLog = function (name, level) {
        if (this.disableAll)
            return false;
        if (level < this.minLogLevel)
            return false;
        return true;
    };
    return LoggerPolicies;
})();
var loggerPolicies = new LoggerPolicies();
var logger = new Logger(loggerPolicies, console, '');
//# sourceMappingURL=utils.js.map