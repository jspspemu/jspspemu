///<reference path="./array.ts" />
///<reference path="./math.ts" />

if (typeof global != 'undefined') window = global;
if (typeof self != 'undefined') window = self;

declare var global: any;
if (typeof self == 'undefined') window = self = global;
if (typeof navigator == 'undefined') navigator = <any>{};

function sprintf(...args: any[]): string {
	//  discuss at: http://phpjs.org/functions/sprintf/
	// original by: Ash Searle (http://hexmen.com/blog/)
	// improved by: Michael White (http://getsprink.com)
	// improved by: Jack
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Dj
	// improved by: Allidylls
	//    input by: Paulo Freitas
	//    input by: Brett Zamir (http://brett-zamir.me)
	//   example 1: sprintf("%01.2f", 123.1);
	//   returns 1: 123.10
	//   example 2: sprintf("[%10s]", 'monkey');
	//   returns 2: '[    monkey]'
	//   example 3: sprintf("[%'#10s]", 'monkey');
	//   returns 3: '[####monkey]'
	//   example 4: sprintf("%d", 123456789012345);
	//   returns 4: '123456789012345'
	//   example 5: sprintf('%-03s', 'E');
	//   returns 5: 'E00'

	var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
	var a = arguments;
	var i = 0;
	var format = a[i++];

	// pad()
	var pad = function(str: string, len: number, chr: string, leftJustify: boolean) {
		if (!chr) {
			chr = ' ';
		}
		var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0)
			.join(chr);
		return leftJustify ? str + padding : padding + str;
	};

	// justify()
	var justify = function(value: string, prefix: string, leftJustify: boolean, minWidth: number, zeroPad: boolean, customPadChar: string = undefined) {
		var diff = minWidth - value.length;
		if (diff > 0) {
			if (leftJustify || !zeroPad) {
				value = pad(value, minWidth, customPadChar, leftJustify);
			} else {
				value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
			}
		}
		return value;
	};

	// formatBaseX()
	var formatBaseX = function(value: number, base: number, prefix: any, leftJustify: boolean, minWidth: number, precision: number, zeroPad: boolean) {
		// Note: casts negative numbers to positive ones
		var number = value >>> 0;
		prefix = prefix && number && (<any>{
			'2': '0b',
			'8': '0',
			'16': '0x'
		})[base] || '';
		var valueStr = prefix + pad(number.toString(base), precision || 0, '0', false);
		return justify(valueStr, prefix, leftJustify, minWidth, zeroPad);
	};

	// formatString()
	var formatString = function(value: any, leftJustify: any, minWidth: any, precision: any, zeroPad: any, customPadChar: any = undefined) {
		if (precision != null) {
			value = value.slice(0, precision);
		}
		return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
	};

	// doFormat()
	var doFormat = function(substring: any, valueIndex: any, flags: any, minWidth: any, _: any, precision: any, type: any) {
		var number: any, prefix: any, method: any, textTransform: any, value: any;

		if (substring === '%%') {
			return '%';
		}

		// parse flags
		var leftJustify = false;
		var positivePrefix = '';
		var zeroPad = false;
		var prefixBaseX = false;
		var customPadChar = ' ';
		var flagsl = flags.length;
		for (var j = 0; flags && j < flagsl; j++) {
			switch (flags.charAt(j)) {
				case ' ':
					positivePrefix = ' ';
					break;
				case '+':
					positivePrefix = '+';
					break;
				case '-':
					leftJustify = true;
					break;
				case "'":
					customPadChar = flags.charAt(j + 1);
					break;
				case '0':
					zeroPad = true;
					customPadChar = '0';
					break;
				case '#':
					prefixBaseX = true;
					break;
			}
		}

		// parameters may be null, undefined, empty-string or real valued
		// we want to ignore null, undefined and empty-string values
		if (!minWidth) {
			minWidth = 0;
		} else if (minWidth === '*') {
			minWidth = +a[i++];
		} else if (minWidth.charAt(0) == '*') {
			minWidth = +a[minWidth.slice(1, -1)];
		} else {
			minWidth = +minWidth;
		}

		// Note: undocumented perl feature:
		if (minWidth < 0) {
			minWidth = -minWidth;
			leftJustify = true;
		}

		if (!isFinite(minWidth)) {
			throw new Error('sprintf: (minimum-)width must be finite');
		}

		if (!precision) {
			precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined;
		} else if (precision === '*') {
			precision = +a[i++];
		} else if (precision.charAt(0) == '*') {
			precision = +a[precision.slice(1, -1)];
		} else {
			precision = +precision;
		}

		// grab value using valueIndex if required?
		value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

		switch (type) {
			case 's':
				return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
			case 'c':
				return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
			case 'b':
				return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'o':
				return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'x':
				return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'X':
				return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad)
					.toUpperCase();
			case 'u':
				return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'i':
			case 'd':
				number = +value || 0;
				number = Math.round(number - number % 1); // Plain Math.round doesn't just truncate
				prefix = number < 0 ? '-' : positivePrefix;
				value = prefix + pad(String(Math.abs(number)), precision, '0', false);
				return justify(value, prefix, leftJustify, minWidth, zeroPad);
			case 'e':
			case 'E':
			case 'f': // Should handle locales (as per setlocale)
			case 'F':
			case 'g':
			case 'G':
				number = +value;
				prefix = number < 0 ? '-' : positivePrefix;
				method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
				textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
				value = prefix + (<any>Math.abs(number))[method](precision);
				return (<any>justify(value, prefix, leftJustify, minWidth, zeroPad))[textTransform]();
			default:
				return substring;
		}
	};

	return format.replace(regex, doFormat);
}

function printf(...args: any[]) {
	console.log(sprintf.apply(sprintf, arguments));
}

interface NumberDictionary<V> {
    [key: number]: V;
}

interface StringDictionary<V> {
    [key: string]: V;
}

function String_repeat(str: string, num: number) {
    return new Array(num + 1).join(str);
}

enum Endian {
    LITTLE = 0,
    BIG = 1,
}

class AsyncEntry<T> {
	constructor(public id: string, public size: number, public usageCount: number, public value: T, public lastUsedTime: number) {
	}
}

class AsyncCache<T> {
	itemsMap: StringDictionary<AsyncEntry<T>> = {};

	constructor(private maxSize: number = 16, private measure?: (value: T) => number) {
		if (!measure) measure = ((item) => 1);
	}

	private get items() {
		var items = <AsyncEntry<T>[]>[];
		for (var key in this.itemsMap) {
			var item = this.itemsMap[key];
			if (item instanceof AsyncEntry) items.push(item);
		}
		return items;
	}

	private get usedSize() {
		return this.items.sum(item => item.size);
	}

	private get availableSize() {
		return this.maxSize - this.usedSize;
	}

	private freeUntilAvailable(size: number) {
		if (size > this.maxSize) throw (new Error("Element too big"));
		//console.log('count => ', size, this.availableSize, this.usedSize, this.maxSize, this.items.length);

		while (this.availableSize < size) {
			var itemToDelete = this.items.min(item => item.lastUsedTime);
			delete this.itemsMap[itemToDelete.id];
		}
	}

	getOrGenerateAsync(id: string, generator: () => Promise2<T>): Promise2<T> {
		var item = this.itemsMap[id];
		if (item) {
			item.lastUsedTime = Date.now();
			return Promise2.resolve(item.value);
		} else {
			return generator().then(value => {
				var size = this.measure(value);
				this.freeUntilAvailable(size);
				this.itemsMap[id] = new AsyncEntry(id, size, 1, value, Date.now());
				return value;
			});
		}
	}
}

class SortedSet<T> {
    public elements: T[] = [];

    has(element: T) {
        return this.elements.indexOf(element) >= 0;
    }

    add(element: T) {
        if (!this.has(element)) this.elements.push(element);
		return element;
	}

	get length() { return this.elements.length; }

    delete(element: T) {
        this.elements.remove(element);
    }

    filter(callback: (value: T, index: number, array: T[]) => boolean) {
        return this.elements.filter(callback);
    }

    forEach(callback: (element: T) => void) {
        this.elements.forEach(callback);
    }
}

class DSet<T> extends SortedSet<T> {
}

class Pool<T> {

}

class UidCollection<T>
{
    private items: NumberDictionary<T> = {};

    constructor(private lastId: number = 1) {
    }

    allocate(item: T) {
        var id = this.lastId++;
        this.items[id] = item;
        return id;
    }

	has(id: number) {
		return (this.items[id] !== undefined);
	}

    get(id: number) {
        return this.items[id];
	}

	list() {
		var out = <T[]>[];
		for (var key in this.items) out.push(this.items[key]);
		return out;
	}

    remove(id: number) {
        delete this.items[id];
    }
}

interface NumericRange {
	start: number;
	end: number;
}

interface String {
	(value: any): string;
	rstrip(): string;
	contains(value: string): boolean;
	startsWith(value: string): boolean;
	endsWith(value: string): boolean;
}

String.prototype.startsWith = function(value: string) {
	var string = <string>this;
	return string.substr(0, value.length) == value;
};

String.prototype.endsWith = function(value: string) {
	var string = <string>this;
	return string.substr(-value.length) == value;
};

String.prototype.rstrip = function() {
    var string = <string>this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function(value: string) {
	var string = <string>this;
	return string.indexOf(value) >= 0;
};

interface MicrotaskCallback {
	(): void;
}

class Microtask {
	private static queued: boolean = false;
	private static callbacks: MicrotaskCallback[] = [];

	static queue(callback: MicrotaskCallback) {
		Microtask.callbacks.push(callback);
		if (!Microtask.queued) {
			Microtask.queued = true;
			setTimeout(Microtask.execute, 0);
		}
	}

	static execute() {
		var start = performance.now();
		while (Microtask.callbacks.length > 0) {
			var callback = Microtask.callbacks.shift();
			callback();
			var end = performance.now();
			if ((end - start) >= 20) {
				setTimeout(Microtask.execute, 0);
				return;
			}
		}
		Microtask.queued = false;
	}
}

var _self: any = self;
_self['polyfills'] = _self['polyfills'] || {};
_self['polyfills']['ArrayBuffer_slice'] = !ArrayBuffer.prototype.slice;
_self['polyfills']['performance'] = !self.performance;

if (!self['performance']) {
	self['performance'] = <any>{};
	self['performance']['now'] = function() {
		return Date.now();
	};
}

declare function escape(input: string): string;
declare function unescape(input: string): string;

class Utf8 {
	static decode(input: string): string {
		try {
			return decodeURIComponent(escape(input));
		} catch (e) {
			console.error(e);
			return input;
		}
	}

	static encode(input: string): string {
		return unescape(encodeURIComponent(input));
	}
}

interface ArrayBuffer {
    slice(begin: number, end?: number): ArrayBuffer;
	//new(count:number):ArrayBuffer;
}

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function(begin: number, end?: number): ArrayBuffer {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - begin);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + begin];
        return result;
    };
}

interface AudioBuffer {
	getChannelData(channel: number): Float32Array;
}
interface AudioContext {
	createScriptProcessor(bufferSize: number, numInputChannels: number, numOutputChannels: number): ScriptProcessorNode;
}

var _self: any = (typeof window != 'undefined') ? window : self;
_self['AudioContext'] = _self['AudioContext'] || _self['webkitAudioContext'];

_self.navigator['getGamepads'] = _self.navigator['getGamepads'] || _self.navigator['webkitGetGamepads'];

if (!_self.requestAnimationFrame) {
	_self.requestAnimationFrame = function(callback: FrameRequestCallback) {
		var start = Date.now();
		return setTimeout(function() {
			callback(Date.now());
		}, 20);
	};
	_self.cancelAnimationFrame = function(id: number) {
		clearTimeout(id);
	};
}

class ArrayBufferUtils {
	static fromUInt8Array(input: Uint8Array) {
		return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
	}

	static uint16ToUint8(input: Uint16Array) {
		return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	}

	static uint32ToUint8(input: Uint32Array) {
		return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	}
	
	static uint8ToUint32(input: Uint8Array, offset: number = 0, length?: number) {
		if (length === undefined) length = (input.length - offset) >>> 2;
		return new Uint32Array(input.buffer, input.byteOffset + offset, length);
	}

	static uint8ToUint16(input: Uint8Array, offset: number = 0, length?: number) {
		if (length === undefined) length = (input.length - offset) >>> 1;
		return new Uint16Array(input.buffer, input.byteOffset + offset, length);
	}

	static uint8ToUint8(input: Uint8Array, offset: number = 0, length?: number) {
		if (length === undefined) length = (input.length - offset);
		return new Uint8Array(input.buffer, input.byteOffset + offset, length);
	}
	
	// http://jsperf.com/test-memory-copying
	static copy(input: Uint8Array, inputPosition: number, output: Uint8Array, outputPosition: number, length: number) {
		//new Uint8Array(output.buffer, output.byteOffset + outputPosition, length).set(new Uint8Array(input.buffer, input.byteOffset + inputPosition, length));
		output.subarray(outputPosition, outputPosition + length).set(input.subarray(inputPosition, inputPosition + length));
		//for (var n = 0; n < length; n++) output[outputPosition + n] = input[inputPosition + n];
	}
	
	static copyUint8ToUint32(from: Uint8Array) {
		var to = new Uint32Array(from.length);
		for (var n = 0; n < to.length; n++) to[n] = from[n];
		return to;
	}
	
	static copyUint8ToUint32_rep(from: Uint8Array) {
		var to = new Uint32Array(from.length);
		for (var n = 0; n < to.length; n++) to[n] = from[n] | (from[n] << 8) | (from[n] << 16) | (from[n] << 24);
		return to;
	}

	static cloneBytes(input: Uint8Array) {
		var out = new Uint8Array(input.length);
		out.set(input);
		return out;
	}

	static concat(chunks: ArrayBuffer[]) {
		var tmp = new Uint8Array(chunks.sum(chunk => chunk.byteLength));
		var offset = 0;
		chunks.forEach(chunk => {
			tmp.set(new Uint8Array(chunk), offset);
			offset += chunk.byteLength;
		});
		return tmp.buffer;
	}
}

interface PromiseGenerator<T> {
	(): Promise2<T>;
}

class PromiseUtils {
	static sequence<T>(generators: PromiseGenerator<T>[]) {
		return new Promise2((resolve, reject) => {
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
	}

	static delayAsync(ms: number) {
		if (ms <= 0) return Promise2.resolve<any>(null);
		return new Promise2<any>((resolve, reject) => setTimeout(resolve, ms));
	}

	static delaySecondsAsync(seconds: number) {
		return PromiseUtils.delayAsync(seconds * 1000);
	}
}

_self['requestFileSystem'] = _self['requestFileSystem'] || _self['webkitRequestFileSystem'];

function setToString(Enum: any, value: number) {
	var items: string[] = [];
	for (var key in Enum) {
		if (Enum[key] & value && (Enum[key] & value) == Enum[key]) {
			items.push(key);
		}
	}
	return items.join(' | ');
}

enum AcceptCallbacks { NO = 0, YES = 1 }
enum Compensate { NO = 0, YES = 1 }

class WaitingThreadInfo<T> {
	public constructor(public name: string, public object: any, public promise: Promise2<T>, public callbacks: AcceptCallbacks, public compensate: Compensate = Compensate.YES) {
	}
}

(<any>window).WaitingThreadInfo = WaitingThreadInfo;

var DebugOnceArray: { [key: string]: number; } = {};
function DebugOnce(name: string, times: number = 1) {
	if (DebugOnceArray[name] >= times) return false;
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

class HalfFloat {
	static fromFloat(Float: number) {
		var i = MathFloat.reinterpretFloatAsInt(Float);
		var s = ((i >> 16) & 0x00008000);              // sign
		var e = ((i >> 23) & 0x000000ff) - (127 - 15); // exponent
		var f = ((i >> 0) & 0x007fffff);              // fraction

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
	}

	static toFloat(imm16: number) {
		var s = (imm16 >> 15) & 0x00000001; // Sign
		var e = (imm16 >> 10) & 0x0000001f; // Exponent
		var f = (imm16 >> 0) & 0x000003ff;  // Fraction

		// Need to handle 0x7C00 INF and 0xFC00 -INF?
		if (e == 0) {
			// Need to handle +-0 case f==0 or f=0x8000?
			if (f == 0) {
				// Plus or minus zero
				return MathFloat.reinterpretIntAsFloat(s << 31);
			}
			// Denormalized number -- renormalize it
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
	}
}


function htmlspecialchars(str: string) {
	return str.replace(/[&<>]/g, (tag: string) => {
		switch (tag) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
		}
		return tag;
	});
}

function mac2string(mac: Uint8Array) {
	return sprintf("%02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

function string2mac(string: string) {
	var array = String(string).split(':').map(item => parseInt(item, 16));
	while (array.length < 6) array.push(0);
	return new Uint8Array(array);
}

interface Cancelable {
	cancel(): void;
}

class SignalCancelable<T> implements Cancelable {
	constructor(private signal: Signal<T>, private callback: (value?: T) => void) {
	}

	cancel() {
		this.signal.remove(this.callback);
	}
}

class Signal<T> {
	callbacks: ((value?: T) => void)[] = [];

	get length() {
		return this.callbacks.length;
	}

	pipeTo(other:Signal<T>) {
		return this.add(v => other.dispatch(v));
	}

	add(callback: (value?: T) => void) {
		this.callbacks.push(callback);
		return new SignalCancelable(this, callback);
	}

	remove(callback: (value?: T) => void) {
		var index = this.callbacks.indexOf(callback);
		if (index >= 0) {
			this.callbacks.splice(index, 1);
		}
	}

	once(callback: (value?: T) => void) {
		var once = () => {
			this.remove(once);
			callback();
		};
		this.add(once);
		return new SignalCancelable(this, once);
	}

	dispatch(value?: T) {
		this.callbacks.forEach((callback) => {
			callback(value);
		});
	}
}

class Logger {
	constructor(private policy: LoggerPolicies, private console: any, private name: string) {
	}

	named(name: string) {
		return new Logger(this.policy, this.console, (this.name + '.' + name).replace(/^\.+/, ''));
	}

	_log(type: string, level: number, args: any[]) {
		if (this.policy.canLog(this.name, level)) {
			args.unshift(this.name + ':');
			if (this.console[type]) this.console[type].apply(this.console, args);
		}
	}

	debug(...args: any[]) { this._log('debug', 0, args); }
	log(...args: any[]) { this._log('log', 1, args); }
	info(...args: any[]) { this._log('info', 2, args); }
	warn(...args: any[]) { this._log('warn', 3, args); }
	error(...args: any[]) { this._log('error', 4, args); }

	groupCollapsed(...args: any[]) { this._log('groupCollapsed', 5, args); }
	groupEnd(...args: any[]) { this._log('groupEnd', 5, args); }
}

class LoggerPolicies {
	public disableAll = false;
	public minLogLevel = 1;

	canLog(name: string, level: number) {
		if (this.disableAll) return false;
		if (level < this.minLogLevel) return false;
		return true;
	}
}

if (typeof global == 'undefined') global = window;
var loggerPolicies = new LoggerPolicies();
var logger = new Logger(loggerPolicies, console, '');
global.loggerPolicies = loggerPolicies;
global.logger = logger;

declare var executeCommandAsync: (code: string, args: ArrayBuffer[]) => Promise2<ArrayBuffer[]>;

if (typeof window.document != 'undefined') {
	var workers: Worker[] = [];
	var workersJobs: number[] = [];
	var lastRequestId: number = 0;
	var resolvers: any = {};
	[0, 1].forEach((index: number) => {
		var ww = workers[index] = new Worker('jspspemu.js');
		workersJobs[index] = 0;
		console.log('created worker!');
		ww.onmessage = function(event: any) {
			var requestId = event.data.requestId;
			workersJobs[index]--;
			resolvers[requestId](event.data.args);
			delete resolvers[requestId];
		}
	});

	executeCommandAsync = (code: string, args: ArrayBuffer[]) => {
		return new Promise2<ArrayBuffer[]>((resolve, reject) => {
			var requestId = lastRequestId++;
			resolvers[requestId] = resolve;
			if (workersJobs[0] <= workersJobs[1]) {
				//console.log('sent to worker0');
				workersJobs[0]++;
				workers[0].postMessage({ code: code, args: args, requestId: requestId }, args);
			} else {
				//console.log('sent to worker1');
				workersJobs[1]++;
				workers[1].postMessage({ code: code, args: args, requestId: requestId }, args);
			}
		});
	};
	
	/*
	executeCommandAsync(`
		var zlib = require("src/format/zlib");
		args[0] = zlib.inflate_raw_arraybuffer(args[0]);
	`, [new Uint8Array([10, 11, 12]).buffer]).then(function(args:any[]) {
		console.info(args);
	});
	*/
} else {
	//console.log('inside worker!');
	this.onmessage = function(event: any) {
		var requestId = event.data.requestId;
		var args = event.data.args;
		try {
			eval(event.data.code);
		} catch (e) {
			console.error(e);
			args = [];
		}
		this.postMessage({ requestId: requestId, args: args }, args);
	}

	executeCommandAsync = (code: string, args: ArrayBuffer[]) => {
		return new Promise2<ArrayBuffer[]>((resolve, reject) => {
			try {
				eval(code);
			} catch (e) {
				console.error(e);
				args = [];
			}
			resolve(args);
		});
	};
}

function inflateRawArrayBufferAsync(data: ArrayBuffer): Promise2<ArrayBuffer> {
	return inflateRawAsync(new Uint8Array(data)).then(data => data.buffer);
}

function inflateRawAsync(data: Uint8Array): Promise2<Uint8Array> {
	return executeCommandAsync(`
		var zlib = require("src/format/zlib");
		args[0] = ArrayBufferUtils.fromUInt8Array(zlib.inflate_raw(new Uint8Array(args[0])));
	`, [ArrayBufferUtils.fromUInt8Array(data)]).then(function(args: ArrayBuffer[]) {
		if (args.length == 0) throw new Error("Can't decode");
		return new Uint8Array(args[0]);
	});
}

function numberToFileSize(value: number) {
	const KB = 1024;
	const MB = 1024 * KB;
	const GB = 1024 * MB;
	const TB = 1024 * GB;
	if (value >= GB * 0.5) return `${(value / GB).toFixed(2)} GB`;
	if (value >= MB * 0.5) return `${(value / MB).toFixed(2)} MB`;
	if (value >= KB * 0.5) return `${(value / KB).toFixed(2)} KB`;
	return `${value} B`;
}

function addressToHex(address: number) {
	return '0x' + addressToHex2(address);
}

function addressToHex2(address: number) {
	return ('00000000' + (address >>> 0).toString(16)).substr(-8);
}

interface Thenable<T> {
	then<Q>(resolved: (value: T) => Q, rejected: (error: Error) => void): Thenable<Q>;
}

class Promise2<T> implements Thenable<T> {
	static resolve<T>(value: Promise2<T>): Promise2<T>;
	static resolve<T>(value: T): Promise2<T>;
	static resolve(): Promise2<any>;
	static resolve<T>(value?: any): Promise2<T> {
		if (value instanceof Promise2) return value;
		return new Promise2<T>((resolve, reject) => resolve(value));
	}
	static reject(error: Error): Promise2<any> { return new Promise2((resolve, reject) => reject(error)); }

	static all(promises: Promise2<any>[]): Promise2<any> {
		return new Promise2((resolve, reject) => {
			if (promises.length == 0) return resolve();
			var total = promises.length;
			var one = () => {
				total--;
				if (total <= 0) resolve();
			};
			var oneError = (e: Error) => {
				reject(e);
			};
			for (let p of promises) {
				if (p instanceof Promise2) {
					p.then(one, oneError);
				} else {
					one();
				}
			}
		});
	}

	static race(promises: Promise2<any>[]): Promise2<any> {
		return new Promise2((resolve, reject) => {
			if (promises.length == 0) return resolve();
			for (let p of promises) {
				if (p instanceof Promise2) {
					p.then(resolve, reject);
				} else {
					resolve();
					return;
				}
			}
		});
	}

	constructor(callback: (resolve: (value?: T) => void, reject: (error: Error) => void) => void) {
		callback(this._resolve.bind(this), this._reject.bind(this));
	}

	private _resolvedValue: T = null;
	private _rejectedValue: Error = null;
	private _solved: boolean = false;
	private _resolvedCallbacks: any[] = [];
	private _rejectedCallbacks: any[] = [];
	private _rejectedPropagated = false;

	private _resolve(value: T) {
		if (this._solved) return;
		this._resolvedValue = value;
		this._solved = true;
		this._queueCheck();
	}

	private _reject(error: Error) {
		if (this._solved) return;
		this._rejectedValue = error;
		this._solved = true;
		this._queueCheck();
	}

	then<Q>(resolved: (value: T) => Promise2<Q>, rejected?: (error: Error) => void): Promise2<Q>;
	then<Q>(resolved: (value: T) => Q, rejected?: (error: Error) => void): Promise2<Q>;
	then<Q>(resolved: (value: T) => Promise2<Q>, rejected?: (value: Error) => any): Promise2<Q> {
		var promise = new Promise2<any>((resolve, reject) => {
			if (resolved) {
				this._resolvedCallbacks.push((a: any) => {
					try {
						var result = resolved(a);
						if (result instanceof Promise2) {
							result.then(resolve, reject);
						} else {
							resolve(result);
						}
					} catch (e) {
						reject(e);
					}
				});
			} else {
				this._resolvedCallbacks.push(resolve);
			}

			if (rejected) {
				this._rejectedCallbacks.push((a: any) => {
					try {
						var result = rejected(a);
						if (result instanceof Promise2) {
							result.then(resolve, reject);
						} else {
							resolve(result);
						}
					} catch (e) {
						reject(e);
					}
				});
			} else {
				this._rejectedCallbacks.push(reject);
			}
		});
		this._queueCheck();
		return promise;
	}

	catch(rejected: (error: Error) => void): Promise2<any>;
	catch<Q>(rejected: (error: Error) => Q): Promise2<Q>;
	catch<Q>(rejected: (error: Error) => Promise2<Q>): Promise2<Q>;
	catch(rejected: (error: Error) => any): Promise2<any> {
		return this.then(null, rejected);
	}

	private _queueCheck() {
		Microtask.queue(() => this._check());
	}

	private _check() {
		if (!this._solved) return;
		if (this._rejectedValue != null) {
			while (this._rejectedCallbacks.length > 0) {
				this._rejectedPropagated = true;
				this._rejectedCallbacks.shift()(this._rejectedValue);
			}
			if (!this._rejectedPropagated) {
				//throw this._rejectedValue;
			}
		} else {
			while (this._resolvedCallbacks.length > 0) this._resolvedCallbacks.shift()(this._resolvedValue);
		}
	}
}

class DomHelp {
	constructor(e:HTMLElement);
	constructor(e:any);
	constructor(public e:HTMLElement) {
	}
	
	private get e2() { return <Window><any>this.e; }
	
	static fromId(e:string) {
		return new DomHelp(document.getElementById(e));
	}
	
	mousedown(callback: (e:MouseEvent) => void) { return this.on('mousedown', callback); }
	mouseup(callback: (e:MouseEvent) => void) { return this.on('mouseup', callback); }
	mousemove(callback: (e:MouseEvent) => void) { return this.on('mousemove', callback); }
	click(callback?: (e:MouseEvent) => void) {
		if (callback == null) this.e.click();
		return this.on('click', callback);
	}
	showToggle() {
		if (this.e.style.visibility == 'visible') {
			this.hide();
		} else {
			this.show();
		}
	}
	
	hide() { if (this.e) this.e.style.visibility = 'hidden'; }
	show() { if (this.e) this.e.style.visibility = 'visible'; }
	
	set width(value:number) { if (this.e) this.e.style.width =  value + 'px'; }
	set height(value:number) { if (this.e) this.e.style.height =  value + 'px'; }
	set top(value:number) { if (this.e) this.e.style.top =  value + 'px'; }
	set left(value:number) { if (this.e) this.e.style.left =  value + 'px'; }
	get position() { return { top: this.top, left: this.left }; }
	get size() { return { width: this.width, height: this.height }; }
	
	get width() { return this.e.offsetWidth || this.e2.innerWidth; }
	get height() { return this.e.offsetHeight || this.e2.innerHeight; }
	get top() { return this.e.offsetTop; }
	get left() { return this.e.offsetLeft; }
	
	get html() { return this.e ? this.e.innerHTML : ''; }
	set html(value:string) { if (this.e) this.e.innerHTML = value; }
	
	val() {
		return this.e.innerText;
	}
	
	css(key:string, value:any) {
		(<any>this.e.style)[key] = value;
		return this;
	}
	
	//on(event:'mousedown', callback: (e:MouseEvent) => void):void;
	on(event:string, callback: (e:Event) => void):void {
		if (this.e) this.e.addEventListener(event, callback);
	}
	
	removeClass(clazz:string) { if (this.e) this.e.className = this.e.className.replace(clazz, '');  }
	addClass(clazz:string) { if (this.e) this.e.className = `${this.e.className} ${clazz}`;  }
	toggleClass(clazz:string, value:boolean) { if (value) this.addClass(clazz); else this.removeClass(clazz); }
}

function throwWaitPromise<T>(promise:Promise2<T>) {
	var error:any = new Error('WaitPromise');
	//var error:any = new Error('WaitPromise');
	error.promise = promise;
	return error;
}

(<any>window).throwWaitPromise = throwWaitPromise;
(<any>window).Promise2 = Promise2;
(<any>window).DomHelp = DomHelp;

declare class Map<K, V> {
	constructor();
	size: number;
	clear(): void;
	delete(key:K):boolean;
	set(key:K, value:V):Map<K, V>;
	get(key:K):V;
	has(key:K):boolean;
}