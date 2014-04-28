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
        this.elements.slice(0).forEach(callback);
    }
}

class DSet<T> extends SortedSet<T> {
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

    remove(id: number) {
        delete this.items[id];
    }
}

interface NumericRange {
	start: number;
	end: number;
}


function identity<T>(a: T) { return a; }

interface Array<T> {
	remove(item: T);
	sortBy(item: (item: T) => any): T[];
	first(filter?: (item: T) => boolean): T;
	sum<Q>(selector?: (item: T) => Q);
	max<Q>(selector?: (item: T) => Q);
	binarySearchIndex(selector: (item: T) => number): number;
	binarySearchValue(selector: (item: T) => number): T;
	contains(item: T): boolean;
}

function compareNumbers(a, b) {
	if (a < b) return -1;
	if (a > b) return +1;
	return 0;
}

Array.prototype.contains = function <T>(item: T) {
	return (<T[]>this).indexOf(item) >= 0;
}

Array.prototype.binarySearchValue = function <T>(selector: (item: T) => number) {
	var array = <T[]>this;

	var index = array.binarySearchIndex(selector);
	if (index < 0) return null;
	return array[index];
};

Array.prototype.binarySearchIndex = function <T>(selector: (item: T) => number) {
	var array = <T[]>this;
	var min = 0;
	var max = array.length - 1;
	var step = 0;

	if (array.length == 0) return -1;

	//console.log('--------');

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
				//console.log('#');
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
		if (step >= 64) throw(new Error("Too much steps"));
	}

	return -1;
};

Array.prototype.max = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = a => a;
	return array.reduce((previous, current) => { return Math.max(previous, selector(current)); }, selector(array[0]));
});

Array.prototype.sortBy = function (selector: Function) {
	return (<any[]>this).slice(0).sort((a, b) => compare(selector(a), selector(b)));
};

Array.prototype.first = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = identity;
	for (var n = 0; n < array.length; n++) if (selector(array[n])) return array[n];
	return undefined;
});

Array.prototype.sum = <any>(function (selector: Function) {
    var array = <any[]>this;
    if (!selector) selector = a => a;
    return array.reduce((previous, current) => { return previous + selector(current); }, 0);
});

Array.prototype.remove = function (item) {
    var array = <any[]>this;
    var index = array.indexOf(item);
    if (index >= 0) array.splice(index, 1);
};

Object.defineProperty(Array.prototype, "max", { enumerable: false });
Object.defineProperty(Array.prototype, "sortBy", { enumerable: false });
Object.defineProperty(Array.prototype, "first", { enumerable: false });
Object.defineProperty(Array.prototype, "sum", { enumerable: false });
Object.defineProperty(Array.prototype, "remove", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchValue", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchIndex", { enumerable: false });

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

	static queue(callback: MicrotaskCallback) {
		Microtask.callbacks.push(callback);
		if (!Microtask.queued) {
			Microtask.queued = true;
			setTimeout(Microtask.execute, 0);
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

class WaitingThreadInfo<T> {
	public constructor(public name: string, public object: any, public promise: Promise<T>) {
	}
}

class CpuBreakException implements Error {
	constructor(public name: string = 'CpuBreakException', public message: string = 'CpuBreakException') {
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
