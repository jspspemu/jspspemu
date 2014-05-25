///<reference path="../../typings/promise/promise.d.ts" />

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
	constructor(public id:string, public size: number, public usageCount: number, public value: T, public lastUsedTime:number) {
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

	getOrGenerateAsync(id: string, generator: () => Promise<T>): Promise<T> {
		var item = this.itemsMap[id];
		if (item) {
			item.lastUsedTime = Date.now();
			return Promise.resolve(item.value);
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
	rstrip(): string;
	contains(value: string): boolean;
	startsWith(value: string): boolean;
	endsWith(value: string): boolean;
}

String.prototype.startsWith = function (value: string) {
	var string = <string>this;
	return string.substr(0, value.length) == value;
};

String.prototype.endsWith = function (value: string) {
	var string = <string>this;
	return string.substr(-value.length) == value;
};

String.prototype.rstrip = function () {
    var string = <string>this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function (value: string) {
	var string = <string>this;
	return string.indexOf(value) >= 0;
};

declare function setImmediate(callback: () => void): number;

interface MicrotaskCallback {
	(): void;
}

class Microtask {
	private static queued: boolean = false;
	private static callbacks: MicrotaskCallback[] = [];
	private static initialized: boolean = false;
	private static __messageType = '__Microtask_execute';
	private static __location = null;

	private static initOnce() {
		if (Microtask.initialized) return;
		window.addEventListener("message", Microtask.window_message, false);
		Microtask.__location = document.location.href;
		Microtask.initialized = true;
	}

	private static window_message(e) {
		if (e.data == Microtask.__messageType) Microtask.execute();
	}

	static queue(callback: MicrotaskCallback) {
		Microtask.initOnce();
		Microtask.callbacks.push(callback);
		if (!Microtask.queued) {
			Microtask.queued = true;
			//window.postMessage(Microtask.__messageType, Microtask.__location);
			setTimeout(Microtask.execute, 0);
			//Microtask.execute(); // @TODO
		}
	}

	private static execute() {
		while (Microtask.callbacks.length > 0) {
			var callback = Microtask.callbacks.shift();
			callback();
		}
		Microtask.queued = false;
	}
}

if (!window['setImmediate']) {
	window['setImmediate'] = function (callback: () => void) {
		Microtask.queue(callback);
		//return setTimeout(callback, 0);
		return -1;
	};
	window['clearImmediate'] = function (timer: number) {
		throw(new Error("Not implemented!"));
		//clearTimeout(timer);
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
    slice(begin: number, end?: number):ArrayBuffer;
}

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (begin: number, end?: number): ArrayBuffer {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - begin);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + begin];
        return result;
    };
}

interface AudioNode {
	context: AudioContext;
	numberOfInputs: number;
	numberOfOutputs: number;
	channelCount: number;
	channelCountMode: string;
	channelInterpretation: any;

	connect(to: AudioNode);
	disconnect();
}

interface AudioBuffer {
	sampleRate: number;
	length: number;
	duration: number;
	numberOfChannels: number;
	getChannelData(channel:number): Float32Array;
}

interface AudioProcessingEvent extends Event {
	playbackTime: number;
	inputBuffer: AudioBuffer;
	outputBuffer: AudioBuffer;
}

interface ScriptProcessorNode extends AudioNode {
	bufferSize: number;
	onaudioprocess: Function;
}

interface AudioDestinationNode extends AudioNode {
	maxChannelCount: number;
}

interface AudioContext {
	createScriptProcessor(bufferSize: number, numInputChannels: number, numOutputChannels: number): ScriptProcessorNode;
	destination: AudioDestinationNode;
	sampleRate: number;
	currentTime: number;
	//listener: AudioListener;
}

declare var AudioContext: {
	new(): AudioContext;
};

window['AudioContext'] = window['AudioContext'] || window['webkitAudioContext'];

navigator['getGamepads'] = navigator['getGamepads'] || navigator['webkitGetGamepads'];

if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = function (callback: FrameRequestCallback) {
		var start = Date.now();
		return setTimeout(function () {
			callback(Date.now());
		}, 20);
	};
	window.cancelAnimationFrame = function (id: number) {
		clearTimeout(id);
	};
}

class ArrayBufferUtils {
	static fromUInt8Array(input: Uint8Array) {
		return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
	}

	static uint8ToUint32(input: Uint8Array, offset: number = 0, length?: number) {
		if (length === undefined) length = ((input.length >>> 2) - (offset >>> 2));
		return new Uint32Array(input.buffer, input.byteOffset + offset, length);
	}

	static uint8ToUint8(input: Uint8Array, offset: number = 0, length?: number) {
		if (length === undefined) length = (input.length - offset);
		return new Uint8Array(input.buffer, input.byteOffset + offset, length);
	}

	static copy(input: Uint8Array, inputPosition: number, output: Uint8Array, outputPosition: number, length: number) {
		output.subarray(outputPosition, outputPosition + length).set(input.subarray(inputPosition, inputPosition + length));
		//for (var n = 0; n < length; n++) output[outputPosition + n] = input[inputPosition + n];
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
	(): Promise<T>;
}

class PromiseUtils {
	static sequence<T>(generators: PromiseGenerator<T>[]) {
		return new Promise((resolve, reject) => {
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
		if (ms <= 0) return Promise.resolve<any>(null);
		return new Promise<any>((resolve, reject) => setTimeout(resolve, ms));
	}

	static delaySecondsAsync(seconds: number) {
		return PromiseUtils.delayAsync(seconds * 1000);
	}
}

window['requestFileSystem'] = window['requestFileSystem'] || window['webkitRequestFileSystem'];

function setToString(Enum: any, value: number) {
	var items = [];
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
	public constructor(public name: string, public object: any, public promise: Promise<T>, public callbacks: AcceptCallbacks, public compensate: Compensate = Compensate.YES) {
	}
}

class CpuBreakException implements Error {
	constructor(public name: string = 'CpuBreakException', public message: string = 'CpuBreakException') {
	}
}

class SceKernelException implements Error {
	constructor(public id: number, public name: string = 'SceKernelException', public message: string = 'SceKernelException') {
	}
}

var DebugOnceArray = {};
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
	static fromFloat(Float:number) {
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

	static toFloat(imm16:number) {
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


function htmlspecialchars(str) {
	return str.replace(/[&<>]/g, (tag) => {
		switch (tag) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
		}
		return tag;
	});
}

function mac2string(mac: Uint8Array) {
	return sprintf("%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

function string2mac(string: string) {
	var array = String(string).split(':').map(item => parseInt(item, 16));
	while (array.length < 6) array.push(0);
	return new Uint8Array(array);
}
