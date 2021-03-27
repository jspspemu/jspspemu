import "./window"
import "./array"
import "./math"
import {BitUtils, MathFloat, MathUtils} from "./math";

const _self: any = (typeof window != 'undefined') ? window : self;

declare global {
    interface StringConstructor {
        fromUint8Array(array: Uint8Array): string
    }
    interface String {
        (value: any): string;
        format(...args: any[]): string
        rstrip(): string;
        contains(value: string): boolean;
    }
    interface Number {
        extract(offset: number, length: number): number
        extractBit(offset: number): boolean
        extract8(offset: number): number
        signExtend(bits: number): number
    }
}

const u16TextDecoder = new TextDecoder('utf-16')
String.fromUint8Array = function(array: Uint8Array): string {
    if (array.length <= 1024) {
        return String.fromCharCode.apply(null, array as any)
    }
    const temp = new Uint16Array(array.length)
    temp.set(array, 0)
    return u16TextDecoder.decode(temp)
}

// @ts-ignore
Number.prototype.extract = function(offset: number, length: number): number { return BitUtils.extract(this, offset, length) }
// @ts-ignore
Number.prototype.extract8 = function(offset: number): number { return BitUtils.extract8(this, offset) }
// @ts-ignore
Number.prototype.extractBit = function(offset: number): boolean { return BitUtils.extractBool(this, offset) }
// @ts-ignore
Number.prototype.signExtend = function(bits: number): number { return (this << (32 - bits)) >> (32 - bits) }

String.prototype.format = function(...args: any[]): string {
    return sprintf(this, ...args)
}

String.prototype.rstrip = function() {
    const string = <string>this;
    return string.replace(/\s+$/, '');
}

String.prototype.contains = function(value: string) {
    const string = <string>this;
    return string.indexOf(value) >= 0;
}

export function sprintf(...args: any[]): string {
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

    const regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
    const a = arguments;
    let i = 0;
    const format = a[i++];

    // pad()
	const pad = function(str: string, len: number, chr: string|undefined, leftJustify: boolean) {
		if (!chr) {
			chr = ' ';
		}
        const padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0).join(chr);
        return leftJustify ? str + padding : padding + str;
	};

	// justify()
	const justify = function(value: string, prefix: string, leftJustify: boolean, minWidth: number, zeroPad: boolean, customPadChar: string|undefined = undefined) {
        const diff = minWidth - value.length;
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
	const formatBaseX = function(value: number, base: number, prefix: any, leftJustify: boolean, minWidth: number, precision: number, zeroPad: boolean) {
		// Note: casts negative numbers to positive ones
		const number = value >>> 0;
		prefix = prefix && number && (<any>{
			'2': '0b',
			'8': '0',
			'16': '0x'
		})[base] || '';
		const valueStr = prefix + pad(number.toString(base), precision || 0, '0', false);
		return justify(valueStr, prefix, leftJustify, minWidth, zeroPad);
	};

	// formatString()
	const formatString = function(value: any, leftJustify: any, minWidth: any, precision: any, zeroPad: any, customPadChar: any = undefined) {
		if (precision != null) {
			value = value.slice(0, precision);
		}
		return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
	};

	// doFormat()
	const doFormat = function(substring: any, valueIndex: any, flags: any, minWidth: any, _: any, precision: any, type: any) {
		let number: any, prefix: any, method: any, textTransform: any, value: any;

		if (substring === '%%') {
			return '%';
		}

		// parse flags
        let leftJustify = false;
        let positivePrefix = '';
        let zeroPad = false;
        let prefixBaseX = false;
        let customPadChar = ' ';
        const flagsl = flags.length;
        for (let j = 0; flags && j < flagsl; j++) {
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

export function printf(...args: any[]) {
    // @ts-ignore
	console.log(sprintf.apply(sprintf, arguments));
}

export interface NumberDictionary<V> {
    [key: number]: V;
}

export interface StringDictionary<V> {
    [key: string]: V;
}

export function String_repeat(str: string, num: number) {
    return new Array(num + 1).join(str);
}

export enum Endian {
    LITTLE = 0,
    BIG = 1,
}

export class AsyncEntry<T> {
	constructor(public id: string, public size: number, public usageCount: number, public value: T, public lastUsedTime: number) {
	}
}

export class AsyncCache<T> {
	itemsMap: StringDictionary<AsyncEntry<T>> = {};

	constructor(private maxSize: number = 16, private measure?: (value: T) => number) {
		if (!measure) measure = ((item) => 1);
	}

	private get items() {
        const items = <AsyncEntry<T>[]>[];
        for (let key in this.itemsMap) {
            const item = this.itemsMap[key];
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
            const itemToDelete = this.items.min(item => item.lastUsedTime);
            delete this.itemsMap[itemToDelete.id];
		}
	}

	getOrGenerateAsync(id: string, generator: () => PromiseFast<T>): PromiseFast<T> {
        const item = this.itemsMap[id];
        if (item) {
			item.lastUsedTime = Date.now();
			return PromiseFast.resolve(item.value);
		} else {
			return generator().thenFast(value => {
                const size = this.measure!(value);
                this.freeUntilAvailable(size);
				this.itemsMap[id] = new AsyncEntry(id, size, 1, value, Date.now());
				return value;
			});
		}
	}
}

export class SortedSet<T> {
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

export class DSet<T> extends SortedSet<T> {
}

export class Pool<T> {

}

export class UidCollection<T>
{
    private items: NumberDictionary<T> = {};
    private freeItems: number[] = []

    constructor(private lastId: number = 1) {
    }

    allocate(item: T): number {
        const id = (this.freeItems.length > 0) ? this.freeItems.pop()! : this.lastId++;
        this.items[id] = item;
        return id;
    }

	has(id: number):boolean {
		return (this.items[id] !== undefined);
	}

    get(id: number):T {
        return this.items[id];
	}

	list():T[] {
        const out = <T[]>[];
        for (let key in this.items) out.push(this.items[key]);
		return out;
	}

    remove(id: number): void {
        if (this.items[id] !== undefined) {
            delete this.items[id];
            this.freeItems.push(id)
        }
    }
}

export interface NumericRange {
	start: number;
	end: number;
}

interface MicrotaskCallback {
	(): void;
}

export class _Microtask {
	queued: boolean = false;
	callbacks: MicrotaskCallback[] = [];
	timeout: number = -1

	queue(callback: MicrotaskCallback) {
        this.callbacks.push(callback);
		if (!this.queued) {
            this._executeLater()
		}
	}

	queueExecuteNow(callback: MicrotaskCallback) {
	    this._cancelTimeout()
        this.queued = true
        callback()
        this._execute(false)
    }

	execute() {
	    this._execute(true)
	}

	_cancelTimeout() {
        if (this.timeout != -1) {
            clearTimeout(this.timeout)
            this.timeout = -1
        }
    }

	_executeLater() {
        this.queued = true
        this._cancelTimeout()
        this.timeout = setTimeout(() => { this.execute() }, 0) as any;
    }

    _execute(scheduleNext: boolean) {
        const start = performance.now();
        while (this._timedTasks.length > 0) {
            const task = this._timedTasks[0]
            if (performance.now() >= task.time) {
                this._timedTasks.shift()
            } else {
                break
            }
        }
        while (this.callbacks.length > 0) {
            const callback = this.callbacks.shift()!;
            callback();
            const end = performance.now();
            if ((end - start) >= 20) {
                if (scheduleNext) {
                    this._executeLater()
                }
                return;
            }
        }
        this.queued = false;
    }

    _timedTasks: { time: number, resolve: () => void }[] = []

    async waitAsync(timeMs: number) {
	    return new Promise((resolve, reject) => {
	        setTimeout(resolve, timeMs)
        })
        /*
	    return new Promise<void>((resolve, reject) => {
            this._timedTasks.push(
                { time: performance.now() + timeMs, resolve: resolve }
            )
            this._timedTasks.sort((a, b) => a.time - b.time)
        })
         */
    }
}

export const Microtask = new _Microtask()

_self['polyfills'] = _self['polyfills'] || {};
_self['polyfills']['ArrayBuffer_slice'] = !ArrayBuffer.prototype.slice;
_self['polyfills']['performance'] = !self.performance;

if (!_self['performance']) {
	_self['performance'] = <any>{};
	_self['performance']['now'] = function() {
		return Date.now();
	};
}

declare function escape(input: string): string;
declare function unescape(input: string): string;

export class Utf8 {
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

declare global {
    interface ArrayBuffer {
        slice(begin: number, end?: number): ArrayBuffer;

        //new(count:number):ArrayBuffer;
    }
}

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function(begin: number, end?: number): ArrayBuffer {
        const that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        const result = new ArrayBuffer(end - begin);
        const resultArray = new Uint8Array(result);
        for (let i = 0; i < resultArray.length; i++) resultArray[i] = that[i + begin];
        return result;
    };
}

interface AudioBuffer {
	getChannelData(channel: number): Float32Array;
}
interface AudioContext {
	createScriptProcessor(bufferSize: number, numInputChannels: number, numOutputChannels: number): ScriptProcessorNode;
}

_self['AudioContext'] = _self['AudioContext'] || _self['webkitAudioContext'];

_self.navigator['getGamepads'] = _self.navigator['getGamepads'] || _self.navigator['webkitGetGamepads'];

if (!_self.requestAnimationFrame) {
	_self.requestAnimationFrame = function(callback: FrameRequestCallback) {
		return setTimeout(function() { callback(Date.now()); }, 1000 / 60);
	};
	_self.cancelAnimationFrame = function(id: number) {
		clearTimeout(id);
	};
}

export class ArrayBufferUtils {
	static copyUint8ToArrayBuffer(input:Uint8Array):ArrayBuffer {
        const out = new ArrayBuffer(input.length);
        new Uint8Array(out).set(input);
		return out;
	}
	
	static hashWordCount(data:Uint32Array) {
		let count = data.length, result = 0;
		for (let n = 0; n < count; n++) result = (result + data[n] ^ n) | 0;
		return result;
	}
	
	static hashFast(data: Uint8Array) {
		return this.hashWordCount(new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4));
	}

	static hash(data:Uint8Array) {
        let result = 0;
        let address = 0;
        let count = data.length;

        while (((address + data.byteOffset) & 3) != 0) { result += data[address++]; count--; }

        const count2 = MathUtils.prevAligned(count, 4);

        result += this.hashWordCount(new Uint32Array(data.buffer, data.byteOffset + address, count2 / 4));

		address += count2;
		count -= count2;

		while (((address + data.byteOffset) & 3) != 0) { result += data[address++] * 7; count--; }

		return result;
	}
	
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

	static uint8ToUint16(input: Uint8Array, offset: number = 0, length?: number): Uint16Array {
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
		//for (let n = 0; n < length; n++) output[outputPosition + n] = input[inputPosition + n];
	}
	
	static copyUint8ToUint32(from: Uint8Array) {
        const to = new Uint32Array(from.length);
        for (let n = 0; n < to.length; n++) to[n] = from[n];
		return to;
	}
	
	static copyUint8ToUint32_rep(from: Uint8Array) {
        const to = new Uint32Array(from.length);
        for (let n = 0; n < to.length; n++) to[n] = from[n] | (from[n] << 8) | (from[n] << 16) | (from[n] << 24);
		return to;
	}

	static cloneUint8Array(input: Uint8Array) { const out = new Uint8Array(input.length); out.set(input); return out; }
	static cloneUint16Array(input: Uint16Array) { const out = new Uint16Array(input.length); out.set(input); return out; }
	static cloneInt16Array(input: Int16Array) { const out = new Int16Array(input.length); out.set(input); return out; }
	static cloneUint32Array(input: Uint32Array) { const out = new Uint32Array(input.length); out.set(input); return out; }
	
	static concatU8(chunks: Uint8Array[]):Uint8Array {
        const out = new Uint8Array(chunks.sum(chunk => chunk.length));
        let offset = 0;
        chunks.forEach(chunk => {
			out.set(chunk, offset);
			offset += chunk.length;
		});
		return out;
	}

	static concatI16(chunks: Int16Array[]): Int16Array {
        const out = new Int16Array(chunks.sum(chunk => chunk.length));
        let offset = 0;
        chunks.forEach(chunk => {
			out.set(chunk, offset);
			offset += chunk.length;
		});
		return out;
	}
}

export interface PromiseGenerator<T> {
	(): PromiseFast<T>;
}

export class PromiseUtils {
	static sequence<T>(generators: PromiseGenerator<T>[]) {
		return new PromiseFast((resolve, reject) => {
			generators = generators.slice(0);
			function step() {
				if (generators.length > 0) {
                    const generator = generators.shift()!;
                    const promise = generator();
                    promise.thenFast(step);
				} else {
					resolve();
				}
			}
			step();
		});
	}

	static delayAsync(ms: number) {
		if (ms <= 0) return PromiseFast.resolve<any>(null);
		return new PromiseFast<any>((resolve, reject) => setTimeout(resolve, ms));
	}

	static delaySecondsAsync(seconds: number) {
		return PromiseUtils.delayAsync(seconds * 1000);
	}
}

_self['requestFileSystem'] = _self['requestFileSystem'] || _self['webkitRequestFileSystem'];

export function setToString(Enum: any, value: number) {
    const items: string[] = [];
    for (const key in Enum) {
		if (Enum[key] & value && (Enum[key] & value) == Enum[key]) {
			items.push(key);
		}
	}
	return items.join(' | ');
}

export enum AcceptCallbacks { NO = 0, YES = 1 }
export enum Compensate { NO = 0, YES = 1 }

export class WaitingThreadInfo<T> {
	public constructor(public name: string, public object: any, public promise: PromiseFast<T> | Promise<T>, public callbacks: AcceptCallbacks, public compensate: Compensate = Compensate.YES) {
	}
}

(<any>window).WaitingThreadInfo = WaitingThreadInfo;

export const DebugOnceArray: { [key: string]: number; } = {};
export function DebugOnce(name: string, times: number = 1) {
	if (DebugOnceArray[name] >= times) return false;
	if (DebugOnceArray[name]) {
		DebugOnceArray[name]++;
	} else {
		DebugOnceArray[name] = 1;
	}
	return true;
}

export function isTouchDevice() {
	return 'ontouchstart' in window;
}

export class HalfFloat {
	static fromFloat(Float: number) {
        const i = MathFloat.reinterpretFloatAsInt(Float);
        const s = ((i >> 16) & 0x00008000);              // sign
        const e = ((i >> 23) & 0x000000ff) - (127 - 15); // exponent
        let f = ((i >> 0) & 0x007fffff);              // fraction

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
        const s = (imm16 >> 15) & 0x00000001; // Sign
        let e = (imm16 >> 10) & 0x0000001f; // Exponent
        let f = (imm16 >> 0) & 0x000003ff;  // Fraction

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


export function htmlspecialchars(str: string) {
	return str.replace(/[&<>]/g, (tag: string) => {
		switch (tag) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
		}
		return tag;
	});
}

export function mac2string(mac: Uint8Array) {
	return sprintf("%02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

export function string2mac(string: string) {
    const array = String(string).split(':').map(item => parseInt(item, 16));
    while (array.length < 6) array.push(0);
	return new Uint8Array(array);
}

export interface Cancelable {
	cancel(): void;
}

export class Signal0Cancelable implements Cancelable {
	constructor(private signal: Signal0, private callback: () => void) {
	}

	cancel() {
		this.signal.remove(this.callback);
	}
}

export class Signal1Cancelable<T> implements Cancelable {
	constructor(private signal: Signal1<T>, private callback: (value?: T) => void) {
	}

	cancel() {
		this.signal.remove(this.callback);
	}
}

export class Signal2Cancelable<T1, T2> implements Cancelable {
	constructor(private signal: Signal2<T1, T2>, private callback: (v1: T1, v2: T2) => void) {
	}

	cancel() {
		this.signal.remove(this.callback);
	}
}

export class WatchValue<T> {
	private _value:T;
	onChanged:Signal1<T> = new Signal1<T>();
	constructor(value:T) { this._value = value; }
	waitUntilValueAsync(expectedValue:T) {
		if (this.value == expectedValue) return PromiseFast.resolve();
		return new PromiseFast((resolve, reject) => {
			let cancelable = this.onChanged.add(changed => {
				if (changed == expectedValue) {
					cancelable.cancel();
					resolve();
				}
			});
		});
	}
	set value(value:T) {
		if (this._value == value) return;
		this._value = value;
		this.onChanged.dispatch(value);
	}
	get value():T {
		return this._value;
	}
}

export class Signal0 {
	callbacks: (() => void)[] = [];

	get length() { return this.callbacks.length; }
	clear() { this.callbacks = []; }

	pipeTo(other:Signal0) {
		return this.add(() => other.dispatch());
	}

	add(callback: () => void) {
		this.callbacks.push(callback);
		return new Signal0Cancelable(this, callback);
	}

	remove(callback: () => void) {
        const index = this.callbacks.indexOf(callback);
        if (index >= 0) {
			this.callbacks.splice(index, 1);
		}
	}

	once(callback: () => void) {
        const once = () => {
            this.remove(once);
            callback();
        };
        this.add(once);
		return new Signal0Cancelable(this, once);
	}

	dispatch() {
		this.callbacks.forEach((callback) => {
			callback();
		});
	}
}

export class Signal1<T1> {
	callbacks: ((value: T1) => void)[] = [];

	get length() { return this.callbacks.length; }
	clear() { this.callbacks = []; }

	pipeTo(other:Signal1<T1>): Signal1Cancelable<T1> {
		return this.add(v => other.dispatch(v));
	}

	add(callback: (v1: T1) => void): Signal1Cancelable<T1> {
		this.callbacks.push(callback);
        // @ts-ignore
		return new Signal1Cancelable(this, callback);
	}

	remove(callback: (v1: T1) => void) {
        const index = this.callbacks.indexOf(callback);
        if (index >= 0) {
			this.callbacks.splice(index, 1);
		}
	}

	once(callback: (v1: T1) => void): Signal1Cancelable<T1> {
        const once = (v1: T1) => {
            this.remove(once);
            callback(v1);
        };
        this.add(once);
        // @ts-ignore
		return new Signal1Cancelable(this, once);
	}

	dispatch(v1: T1) {
		this.callbacks.forEach((callback) => {
			callback(v1);
		});
	}
}

export class Signal2<T1, T2> {
	callbacks: ((v1: T1, v2: T2) => void)[] = [];

	get length() { return this.callbacks.length; }
	clear() { this.callbacks = []; }

	pipeTo(other:Signal2<T1, T2>): Signal2Cancelable<T1, T2> {
		return this.add((v1, v2) => other.dispatch(v1, v2));
	}

	add(callback: (v1: T1, v2: T2) => void): Signal2Cancelable<T1, T2> {
		this.callbacks.push(callback);
		return new Signal2Cancelable(this, callback);
	}

	remove(callback: (v1: T1, v2: T2) => void) {
        const index = this.callbacks.indexOf(callback);
        if (index >= 0) {
			this.callbacks.splice(index, 1);
		}
	}

	once(callback: (v1: T1, v2: T2) => void): Signal2Cancelable<T1, T2> {
        const once = (v1: T1, v2: T2) => {
            this.remove(once);
            callback(v1, v2);
        };
        this.add(once);
		return new Signal2Cancelable(this, once);
	}

	dispatch(v1: T1, v2: T2) {
		this.callbacks.forEach((callback) => {
			callback(v1, v2);
		});
	}
}

export class SignalPromise<T1, T2, T3, T4, T5> {
	callbacks: ((v1?: T1, v2?: T2, v3?: T3, v4?: T4, v5?: T5) => Promise<any>)[] = [];

	get length() { return this.callbacks.length; }
	clear() { this.callbacks = []; }

	add(callback: (v1?: T1, v2?: T2, v3?: T3, v4?: T4, v5?: T5) => Promise<any>) {
		this.callbacks.push(callback);
		return this;
	}

	dispatchAsync(v1?: T1, v2?: T2, v3?: T3, v4?: T4, v5?: T5) {
        const promises: Promise<any>[] = [];
        this.callbacks.forEach((callback) => {
			promises.push(callback(v1, v2, v3, v4, v5));
		});
		return Promise.all(promises)
	}
}

export const enum LoggerLevel {
    DEBUG = 0,
    LOG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
}

export class Logger {
	constructor(private policy: LoggerPolicies, private console: any, private name: string) {
	}

	named(name: string) {
		return new Logger(this.policy, this.console, (`${this.name}.${name}`).replace(/^\.+/, ''));
	}

	_log(type: string, level: LoggerLevel, args: any[]) {
		if (this.policy.canLog(this.name, level)) {
			args.unshift(this.name + ':');
			if (this.console[type]) this.console[type].apply(this.console, args);
		}
	}

    trace(...args: any[]) { this._log('debug', LoggerLevel.DEBUG, args); }
	debug(...args: any[]) { this._log('debug', LoggerLevel.DEBUG, args); }
	log(...args: any[]) { this._log('log', LoggerLevel.LOG, args); }
	info(...args: any[]) { this._log('info', LoggerLevel.INFO, args); }
	warn(...args: any[]) { this._log('warn', LoggerLevel.WARN, args); }
	error(...args: any[]) { this._log('error', LoggerLevel.ERROR, args); }

	groupCollapsed(...args: any[]) { this._log('groupCollapsed', 5, args); }
	groupEnd(...args: any[]) { this._log('groupEnd', 5, args); }

	isEnabled(level: LoggerLevel): boolean { return loggerPolicies.canLog(this.name, level) }
    get isTraceEnabled(): boolean { return this.isEnabled(LoggerLevel.DEBUG) }
    get isDebugEnabled(): boolean { return this.isEnabled(LoggerLevel.DEBUG) }
    get isLogEnabled(): boolean { return this.isEnabled(LoggerLevel.LOG) }
    get isInfoEnabled(): boolean { return this.isEnabled(LoggerLevel.INFO) }
    get isWarnEnabled(): boolean { return this.isEnabled(LoggerLevel.WARN) }
    get isErrorEnabled(): boolean { return this.isEnabled(LoggerLevel.ERROR) }

	setMinLoggerLevel(level: LoggerLevel) {
	    loggerPolicies.setNameMinLoggerLevel(this.name, level)
    }
}

export class LoggerPolicies {
	public disableAll: boolean = false;
	public minLogLevel: LoggerLevel = LoggerLevel.LOG;
	private namedLevels: StringDictionary<number> = {};

	setNameMinLoggerLevel(name: string, level: LoggerLevel) {
	    this.namedLevels[name] = level
    }

	canLog(name: string, level: number) {
		if (this.disableAll) return false
		if (level < this.minLogLevel) return false
		if (name in this.namedLevels && level < this.namedLevels[name]) return false
		return true;
	}
}

export const loggerPolicies = new LoggerPolicies();
export const logger = new Logger(loggerPolicies, console, '');
(window as any).loggerPolicies = loggerPolicies;
(window as any).logger = logger;

/*
declare const executeCommandAsync: (code: string, args: ArrayBuffer[]) => PromiseFast<ArrayBuffer[]>;

if (typeof window.document != 'undefined') {
	const workers: Worker[] = [];
	const workersJobs: number[] = [];
	const lastRequestId: number = 0;
	const resolvers: any = {};
	[0, 1].forEach((index: number) => {
		const ww = workers[index] = new Worker('jspspemu.js');
		workersJobs[index] = 0;
		console.log('created worker!');
		ww.onmessage = function(event: any) {
			const requestId = event.data.requestId;
			workersJobs[index]--;
			resolvers[requestId](event.data.args);
			delete resolvers[requestId];
		}
	});

	executeCommandAsync = (code: string, args: ArrayBuffer[]) => {
		return new PromiseFast<ArrayBuffer[]>((resolve, reject) => {
			const requestId = lastRequestId++;
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
} else {
	//console.log('inside worker!');
	this.onmessage = function(event: any) {
		const requestId = event.data.requestId;
		const args = event.data.args;
		try {
			eval(event.data.code);
		} catch (e) {
			console.error(e);
			args = [];
		}
		this.postMessage({ requestId: requestId, args: args }, args);
	}

	executeCommandAsync = (code: string, args: ArrayBuffer[]) => {
		return new PromiseFast<ArrayBuffer[]>((resolve, reject) => {
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

function inflateRawArrayBufferAsync(data: ArrayBuffer): PromiseFast<ArrayBuffer> {
	return inflateRawAsync(new Uint8Array(data)).thenFast(data => data.buffer);
}

function inflateRawAsync(data: Uint8Array): PromiseFast<Uint8Array> {
	return executeCommandAsync(`
		const zlib = require("src/format/zlib");
		args[0] = ArrayBufferUtils.fromUInt8Array(zlib.inflate_raw(new Uint8Array(args[0])));
	`, [ArrayBufferUtils.fromUInt8Array(data)]).thenFast(function(args: ArrayBuffer[]) {
		if (args.length == 0) throw new Error("Can't decode");
		return new Uint8Array(args[0]);
	});
}
*/

export function numberToSeparator(value: number) {
	return (+value).toLocaleString();
}

export function numberToFileSize(value: number) {
	const KB = 1024;
	const MB = 1024 * KB;
	const GB = 1024 * MB;
	const TB = 1024 * GB;
	if (value >= GB * 0.5) return `${(value / GB).toFixed(2)} GB`;
	if (value >= MB * 0.5) return `${(value / MB).toFixed(2)} MB`;
	if (value >= KB * 0.5) return `${(value / KB).toFixed(2)} KB`;
	return `${value} B`;
}

export function addressToHex(address: number): string {
	return `0x${addressToHex2(address)}`;
}

export function addressToHex2(address: number) {
	return (`00000000${(address >>> 0).toString(16)}`).substr(-8);
}

export interface Thenable<T> {
	then<Q>(resolved: (value: T) => Q, rejected: (error: Error) => void): Thenable<Q>;
};

declare global {
    interface Promise<T> {
        promise(): Promise<T>
        thenFast<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    }
}

Promise.prototype.promise = function() { return this }
Promise.prototype.thenFast = Promise.prototype.then;

// Note that this class is used since Promise.then is not executed immediately and that could lead to performance issues on critical paths
export class PromiseFast<T> implements Thenable<T>, PromiseLike<T> {
    promise(): Promise<T> {
        //console.warn("PromiseFast.promise", this._solved)
        if (this._promise) {
            return this._promise
        }
        if (this._solved) {
            if (this._rejectedValue) {
                return Promise.reject(this._rejectedValue)
            } else {
                return Promise.resolve<T>(this._resolvedValue as any)
            }
        }
        return new Promise<T>((resolve, reject) => {
            this.thenFast(resolve, reject)
        })
    }

    static delay<T>(timeoutMs: number, value: T): PromiseFast<T> {
        return new PromiseFast<T>((resolve, _) => {
            setTimeout(() => {
                resolve(value)
            },timeoutMs)
        })
    }

	static resolve<T>(value: PromiseFast<T>): PromiseFast<T>;
	static resolve<T>(value: T): PromiseFast<T>;
	static resolve(): PromiseFast<any>;
	static resolve<T>(value?: any): PromiseFast<T> {
        if (value instanceof Promise) return PromiseFast.fromPromise(value)
		if (value instanceof PromiseFast) return value
        const result = new PromiseFast<T>((resolve, _) => _)
        result._promise = Promise.resolve(value)
        result._solved = true
        result._resolvedValue = value
		return result
	}
	static reject(error: Error): PromiseFast<any> { return new PromiseFast((resolve, reject) => reject(error)); }

	static all(promises: PromiseFast<any>[]): PromiseFast<any> {
		return new PromiseFast((resolve, reject) => {
			if (promises.length == 0) return resolve();
            let total = promises.length;
            const one = () => {
				total--;
				if (total <= 0) resolve();
			}
            const oneError = (e: Error) => {
                reject(e);
            }
            for (let p of promises) {
				if (p instanceof PromiseFast) {
					p.thenFast(one, oneError);
				} else {
					one();
				}
			}
		});
	}

	static race(promises: PromiseFast<any>[]): PromiseFast<any> {
		return new PromiseFast((resolve, reject) => {
			if (promises.length == 0) return resolve();
			for (let p of promises) {
				if (p instanceof PromiseFast) {
					p.thenFast(resolve, reject);
				} else {
					resolve();
					return;
				}
			}
		});
	}

    static ensure(object: any): PromiseFast<any> {
        if (object instanceof PromiseFast) return object
	    if (object instanceof Promise) return PromiseFast.fromPromise(object)
        return PromiseFast.resolve(object)
    }

	static isPromise(object: any): boolean {
	    return object instanceof Promise || object instanceof PromiseFast
    }

	static fromPromise<T>(promise: Promise<T>): PromiseFast<T> {
        // @ts-ignore
	    const promiseFast = this.fromThenable(promise)
        promiseFast._promise = promise
        return promiseFast
    }
	
	static fromThenable<T>(thenable:Thenable<T>):PromiseFast<T> {
		return new PromiseFast<T>((resolve, reject) => {
			thenable.then(v => resolve(v), error => reject(error));
		});
	}

	constructor(callback: (resolve: (value?: T) => void, reject: (error: Error) => void) => void) {
        // @ts-ignore
		callback(this._resolve.bind(this), this._reject.bind(this));
	}

	private _promise?: Promise<T>
	private _resolvedValue: T|null = null;
	private _rejectedValue: Error|null = null;
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
    then<Q>(resolved: (value: T) => PromiseFast<Q>, rejected?: (error: Error) => void): PromiseFast<Q>;
    then<Q>(resolved: (value: T) => Q, rejected?: (error: Error) => void): PromiseFast<Q>;
    then<Q>(resolved: (value: T) => PromiseFast<Q>, rejected?: (value: Error) => any): PromiseFast<Q> {
        if (this._promise) {
            return PromiseFast.ensure((this._promise as any).then(resolved, rejected))
        }
        return this.thenFast(resolved, rejected)
    }

	thenFast<Q>(resolved: (value: T) => PromiseFast<Q>, rejected?: (error: Error) => void): PromiseFast<Q>;
	thenFast<Q>(resolved: (value: T) => Q, rejected?: (error: Error) => void): PromiseFast<Q>;
	thenFast<Q>(resolved: (value: T) => PromiseFast<Q>, rejected?: (value: Error) => any): PromiseFast<Q> {
        const promise = new PromiseFast<any>((resolve, reject) => {
			if (resolved) {
				this._resolvedCallbacks.push((a: any) => {
					try {
                        const result = resolved(a);
						if (result instanceof PromiseFast) {
							result.thenFast(resolve, reject);
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
                        const result = rejected(a);
						if (result instanceof PromiseFast) {
							result.thenFast(resolve, reject);
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

	catch(rejected: (error: Error) => void): PromiseFast<any>;
	catch<Q>(rejected: (error: Error) => Q): PromiseFast<Q>;
	catch<Q>(rejected: (error: Error) => PromiseFast<Q>): PromiseFast<Q>;
	catch(rejected: (error: Error) => any): PromiseFast<any> {
		return this.thenFast(null as any, rejected);
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

export class DomHelp {
	constructor(e:HTMLElement);
	constructor(e:any);
	constructor(public e:HTMLElement) {
	}
	
	private get e2() { return <Window><any>this.e; }
	
	static fromId(e:string) {
		return new DomHelp(document.getElementById(e));
	}

    // @ts-ignore
	mousedown(callback: (e:MouseEvent) => void) { return this.on('mousedown', callback); }
    // @ts-ignore
	mouseup(callback: (e:MouseEvent) => void) { return this.on('mouseup', callback); }
    // @ts-ignore
	mousemove(callback: (e:MouseEvent) => void) { return this.on('mousemove', callback); }
	click(callback?: (e:MouseEvent) => void) {
		if (callback == null) this.e.click();
        // @ts-ignore
		return this.on('click', callback!);
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

export class CpuBreakException extends Error {
    constructor() {
        super('CpuBreakException');
    }

    static is(v: any): boolean {
        return v instanceof CpuBreakException
    }
}

export class InterruptBreakException extends Error {
    constructor() {
        super('InterruptBreakException');
    }

    static is(v: any): boolean {
        return v instanceof InterruptBreakException
    }
}

export class ProgramExitException extends Error {
    constructor(message: String) {
        super(`ProgramExitException: ${message}`);
    }

    static is(v: any): boolean {
        return v instanceof ProgramExitException
    }
}

export function throwWaitPromise<T>(promise:PromiseFast<T>) {
    const error:any = new Error('WaitPromise');
	//const error:any = new Error('WaitPromise');
	error.promise = promise;
	return error;
}

export function isInsideWorker() {
	return typeof (<any>window).document == 'undefined';
}

export async function delay(ms: number) {
    await new Promise<void>((resolve, _) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

export function fields<T>() {
    return new Proxy(
        {},
        {
            get: function (_target, prop, _receiver) {
                return prop;
            },
        }
    ) as {
        [P in keyof T]: P;
    };
};


(<any>window).sprintf = sprintf;
(<any>window).throwWaitPromise = throwWaitPromise;
(<any>window).PromiseFast = PromiseFast;
(<any>window).DomHelp = DomHelp;
