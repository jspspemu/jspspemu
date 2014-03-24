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

class IndentStringGenerator {
    indentation: number = 0;
    output: string = '';
    newLine: boolean = true;

    indent(callback: () => void) {
        this.indentation++;
        try {
            callback();
        } finally {
            this.indentation--;
        }
    }

    write(text: string) {
        var chunks = text.split('\n');
        for (var n = 0; n < chunks.length; n++) {
            if (n != 0) this.writeBreakLine();
            this.writeInline(chunks[n]);
        }
    }

    private writeInline(text: string) {
        if (text == null || text.length == 0) return;

        if (this.newLine) {
            this.output += String_repeat('\t', this.indentation);
            this.newLine = false;
        }
        this.output += text;
    }

    private writeBreakLine() {
        this.output += '\n';
        this.newLine = true;
    }
}

function base64_toArrayBuffer(base64string: string) {
    var outstr = atob(base64string);
    var out = new ArrayBuffer(outstr.length);
    var ia = new Uint8Array(out);
    for (var n = 0; n < outstr.length; n++) ia[n] = outstr.charCodeAt(n);
    return out;
}

interface AsyncStream {
	name: string;
    size: number;
    readChunkAsync(offset: number, count: number): Promise<ArrayBuffer>;
}

class MemoryAsyncStream implements AsyncStream {
    constructor(private data: ArrayBuffer, public name = 'memory') {
	}

    get size() { return this.data.byteLength; }

    readChunkAsync(offset: number, count: number) {
        return Promise.resolve(this.data.slice(offset, offset + count))
    }
}

class FileAsyncStream implements AsyncStream {
    constructor(private file: File) {
    }

	get name() { return this.file.name; }
    get size() { return this.file.size; }

    readChunkAsync(offset: number, count: number) {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            var fileReader = new FileReader();
            fileReader.onload = (e) => { resolve(fileReader.result); };
            fileReader.onerror = (e) => { reject(e.error); };
            fileReader.readAsArrayBuffer(this.file.slice(offset, offset + count));
        });
    }
}

class Stream {
    constructor(private data: DataView, private offset: number = 0) {
    }

	static fromArrayBuffer(data: ArrayBuffer) {
		return new Stream(new DataView(data));
	}

	static fromDataView(data: DataView, offset: number = 0) {
		return new Stream(data);
	}

    static fromBase64(data: string) {
        return new Stream(new DataView(base64_toArrayBuffer(data)));
	}

	toUInt8Array() {
		return new Uint8Array(this.toArrayBuffer());
	}

	toArrayBuffer() {
		return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
	}

	static fromUint8Array(array: Uint8Array) {
		return Stream.fromArray(<any>array);
	}

    static fromArray(array: any[]) {
        var buffer = new ArrayBuffer(array.length);
        var w8 = new Uint8Array(buffer);
        for (var n = 0; n < array.length; n++) w8[n] = array[n];
        return new Stream(new DataView(buffer));
    }

    sliceWithLength(low: number, count?: number) {
        return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, count));
    }

	sliceWithLowHigh(low: number, high: number) {
		return new Stream(new DataView(this.data.buffer, this.data.byteOffset + low, high - low));
	}

    get available() {
        return this.length - this.offset;
    }

    get length() {
        return this.data.byteLength;
    }

    set position(value: number) {
        this.offset = value;
    }

    get position() {
        return this.offset;
    }

    skip<T>(count: number, pass?: T): T {
        this.offset += count;
        return pass;
    }

    readInt8(endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.getInt8(this.offset)); }
    readInt16(endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.getInt16(this.offset, (endian == Endian.LITTLE))); }
    readInt32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getInt32(this.offset, (endian == Endian.LITTLE))); }
    //readInt64() { return this.skip(8, this.data.getInt32(this.offset + 0, true) * Math.pow(2, 32) + this.data.getInt32(this.offset + 4, true) * Math.pow(2, 0)); }

    readFloat32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getFloat32(this.offset, (endian == Endian.LITTLE))); }

    readUInt8(endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.getUint8(this.offset)); }
    readUInt16(endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.getUint16(this.offset, (endian == Endian.LITTLE))); }
    readUInt32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getUint32(this.offset, (endian == Endian.LITTLE))); }
    readUInt64(endian: Endian = Endian.LITTLE) { return this.skip(8, this.data.getUint32(this.offset, (endian == Endian.LITTLE))); }

    writeInt8(value: number, endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.setInt8(this.offset, value)); }
    writeInt16(value: number, endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.setInt16(this.offset, value, (endian == Endian.LITTLE))); }
    writeInt32(value: number, endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.setInt32(this.offset, value, (endian == Endian.LITTLE))); }

    writeUInt8(value: number, endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.setUint8(this.offset, value)); }
    writeUInt16(value: number, endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.setUint16(this.offset, value, (endian == Endian.LITTLE))); }
    writeUInt32(value: number, endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.setUint32(this.offset, value, (endian == Endian.LITTLE))); }

    readBytes(count: number) {
        return this.skip(count, new Uint8Array(this.data.buffer, this.data.byteOffset + this.offset, count));
	}

	readInt16Array(count: number) {
		return this.skip(count, new Int16Array(this.data.buffer, this.data.byteOffset + this.offset, count));
	}

	readFloat32Array(count: number) {
		return new Float32Array(this.readBytes(count));
	}

    readStream(count: number) {
        return Stream.fromUint8Array(this.readBytes(count));
    }

    readUtf8String(count: number) {
        return Utf8.decode(this.readString(count));
	}

	/*
	writeStream(from: Stream) {
		new Uint8Array(this.data.buffer, this.data.byteOffset).set();
	}
	*/

	writeString(str: string) {
		str.split('').forEach(char => {
			this.writeUInt8(char.charCodeAt(0));
		});
	}

    readString(count: number) {
        var str = '';
        for (var n = 0; n < count; n++) {
            str += String.fromCharCode(this.readInt8());
        }
        return str;
    }

    readUtf8Stringz(maxCount: number = 2147483648) {
		return Utf8.decode(this.readStringz(maxCount));
	}

    readStringz(maxCount: number = 2147483648) {
        var str = '';
        for (var n = 0; n < maxCount; n++) {
			if (this.available <= 0) break;
            var char = this.readInt8();
            if (char == 0) break;
            str += String.fromCharCode(char);
        }
        return str;
    }
}

interface IType {
    read(stream: Stream): any;
    write(stream: Stream, value: any): void;
    length: number;
}

interface StructEntry {
    name: string;
    type: IType;
}

class Int64Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any {
        if (this.endian == Endian.LITTLE) {
            var low = stream.readUInt32(this.endian);
            var high = stream.readUInt32(this.endian);
        } else {
            var high = stream.readUInt32(this.endian);
            var low = stream.readUInt32(this.endian);
        }
        return high * Math.pow(2, 32) + low;
    }
    write(stream: Stream, value: any): void {
        var low = Math.floor(value % Math.pow(2, 32));
        var high = Math.floor(value / Math.pow(2, 32));
        if (this.endian == Endian.LITTLE) {
            stream.writeInt32(low, this.endian);
            stream.writeInt32(high, this.endian);
        } else {
            stream.writeInt32(high, this.endian);
            stream.writeInt32(low, this.endian);
        }
    }
    get length() { return 8; }
}

class Int32Type implements IType {
    constructor(public endian: Endian) { }
    read(stream: Stream): any { return stream.readInt32(this.endian); }
    write(stream: Stream, value: any): void { stream.writeInt32(value, this.endian); }
    get length() { return 4; }
}

class Int16Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readInt16(this.endian); }
    write(stream: Stream, value: any): void { stream.writeInt16(value, this.endian); }
    get length() { return 2; }
}

class Int8Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readInt8(this.endian); }
    write(stream: Stream, value: any): void { stream.writeInt8(value, this.endian); }
    get length() { return 1; }
}

class UInt32Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readUInt32(this.endian); }
    write(stream: Stream, value: any): void { stream.writeUInt32(value, this.endian); }
    get length() { return 4; }
}

class UInt16Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readUInt16(this.endian); }
    write(stream: Stream, value: any): void { stream.writeUInt16(value, this.endian); }
    get length() { return 2; }
}

class UInt8Type implements IType {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readUInt8(this.endian); }
    write(stream: Stream, value: any): void { stream.writeUInt8(value, this.endian); }
    get length() { return 1; }
}

class Struct<T> implements IType {
    constructor(private items: StructEntry[]) {
    }

    static create<T>(items: StructEntry[]) {
        return new Struct<T>(items);
    }

    read(stream: Stream): T {
        var out:any = {};
        this.items.forEach(item => { out[item.name] = item.type.read(stream); });
        return out;
    }
    write(stream: Stream, value: T): void {
        this.items.forEach(item => { item.type.write(stream, value[item.name]); });
    }
    get length() {
        return this.items.sum<number>(item => {
            if (!item) throw ("Invalid item!!");
            if (!item.type) throw ("Invalid item type!!");
            return item.type.length;
        });
    }
}

class StructClass<T> implements IType {
    constructor(private _class: any, private items: StructEntry[]) {
    }

    static create<T>(_class: any, items: StructEntry[]) {
        return new StructClass<T>(_class, items);
    }

    read(stream: Stream): T {
        var _class = this._class;
        var out: T = new _class();
        this.items.forEach(item => { out[item.name] = item.type.read(stream); });
        return out;
    }
    write(stream: Stream, value: T): void {
        this.items.forEach(item => { item.type.write(stream, value[item.name]); });
    }
    get length() {
        return this.items.sum<number>(item => {
            if (!item) throw ("Invalid item!!");
            if (!item.type) {
                console.log(item);
                throw ("Invalid item type!!");
            }
            return item.type.length;
        });
    }
}

class StructArray<T> implements IType {
    constructor(private elementType: IType, private count: number) {
    }

    static create<T>(elementType: IType, count: number) {
        return new StructArray<T>(elementType, count);
    }

    read(stream: Stream): T[] {
        var out = [];
        for (var n = 0; n < this.count; n++) {
            out.push(this.elementType.read(stream));
        }
        return out;
    }
    write(stream: Stream, value: T[]): void {
        for (var n = 0; n < this.count; n++) this.elementType.write(stream, value[n]);
    }
    get length() {
        return this.elementType.length * this.count;
    }
}

class StructStringn {
    constructor(private count: number) {
    }

    read(stream: Stream): string {
        var out = '';
        for (var n = 0; n < this.count; n++) {
            out += String.fromCharCode(stream.readUInt8());
        }
        return out;
    }
    write(stream: Stream, value: string): void {
        throw ("Not implemented StructStringn.write");
    }
    get length() {
        return this.count;
    }
}

class StructStringz {
    stringn: StructStringn;

    constructor(private count: number) {
        this.stringn = new StructStringn(count);
    }

    read(stream: Stream): string {
        return this.stringn.read(stream).split(String.fromCharCode(0))[0];
    }
    write(stream: Stream, value: string): void {
        var items = value.split('').map(char => char.charCodeAt(0));
        while (items.length < this.count) items.push(0);
        for (var n = 0; n < items.length; n++) stream.writeUInt8(items[n]);
    }
    get length() {
        return this.count;
    }
}

var Int16 = new Int16Type(Endian.LITTLE);
var Int32 = new Int32Type(Endian.LITTLE);
var Int64 = new Int64Type(Endian.LITTLE);
var Int8 = new Int8Type(Endian.LITTLE);

var UInt16 = new UInt16Type(Endian.LITTLE);
var UInt32 = new UInt32Type(Endian.LITTLE);
var UInt8 = new UInt8Type(Endian.LITTLE);

var UInt16_b = new UInt16Type(Endian.BIG);
var UInt32_b = new UInt32Type(Endian.BIG);

class UInt32_2lbStruct implements IType {
    read(stream: Stream): number {
        var l = stream.readUInt32(Endian.LITTLE);
        var b = stream.readUInt32(Endian.BIG);
        return l;
    }
    write(stream: Stream, value: number): void {
        stream.writeUInt32(value, Endian.LITTLE);
        stream.writeUInt32(value, Endian.BIG);
    }
    get length() { return 8; }
}

class UInt16_2lbStruct implements IType {
    read(stream: Stream): number {
        var l = stream.readUInt16(Endian.LITTLE);
        var b = stream.readUInt16(Endian.BIG);
        return l;
    }
    write(stream: Stream, value: number): void {
        stream.writeUInt16(value, Endian.LITTLE);
        stream.writeUInt16(value, Endian.BIG);
    }
    get length() { return 4; }
}

var UInt32_2lb = new UInt32_2lbStruct();

var UInt16_2lb = new UInt16_2lbStruct();


function Stringn(count: number) { return new StructStringn(count); }
function Stringz(count: number) { return new StructStringz(count); }

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

    get(id: number) {
        return this.items[id];
    }

    remove(id: number) {
        delete this.items[id];
    }
}

class Signal {
    callbacks = new SortedSet < Function>();

    add(callback: Function) {
        this.callbacks.add(callback);
    }

    remove(callback: Function) {
        this.callbacks.delete(callback);
    }

    once(callback: Function) {
        var once = () => {
            this.remove(once);
            callback();
        };
        this.add(once);
    }

    dispatch() {
        this.callbacks.forEach((callback) => {
            callback();
        });
    }
}

class BitUtils {
    static mask(value: number) {
        return (1 << value) - 1;
	}

	static bitrev32(v: number) {
		v = ((v >>>  1) & 0x55555555) | ((v & 0x55555555) <<  1); // swap odd and even bits
		v = ((v >>>  2) & 0x33333333) | ((v & 0x33333333) <<  2); // swap consecutive pairs
		v = ((v >>>  4) & 0x0F0F0F0F) | ((v & 0x0F0F0F0F) <<  4); // swap nibbles ... 
		v = ((v >>>  8) & 0x00FF00FF) | ((v & 0x00FF00FF) <<  8); // swap bytes
		v = ((v >>> 16) & 0x0000FFFF) | ((v & 0x0000FFFF) << 16); // swap 2-byte long pairs
		return v;
	}

	static rotr(value: number, offset: number) {
		return (value >>> offset) | (value << (32 - offset));
	}

    static clo(x: number) {
        var ret = 0;
        while ((x & 0x80000000) != 0) { x <<= 1; ret++; }
        return ret;
    }

    static clz(x: number) {
        return BitUtils.clo(~x);
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

    static extractScale(data: number, offset: number, length: number, scale: number) {
        var mask = BitUtils.mask(length);
        return (((data >>> offset) & mask) * scale / mask) |0;
    }

    static extractEnum<T>(data: number, offset: number, length: number):T {
        return <any>this.extract(data, offset, length);
    }

    static clear(data: number, offset: number, length: number) {
        data &= ~(BitUtils.mask(length) << offset);
        return data;
    }

    static insert(data: number, offset: number, length: number, value:number) {
        value &= BitUtils.mask(length);
        data = BitUtils.clear(data, offset, length);
        data |= value << offset;
        return data;
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

    static round(value: number) {
        return Math.round(value);
    }

    static rint(value: number) {
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

function compare<T>(a:T, b:T):number {
	if (a < b) return -1;
	if (a > b) return +1;
	return 0;
}

function identity<T>(a: T) { return a; }

interface Array<T> {
	remove(item: T);
	sortBy(item: (item: T) => any): T[];
	first(filter?: (item: T) => boolean): T;
	sum<Q>(selector?: (item: T) => Q);
	max<Q>(selector?: (item: T) => Q);
}

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

interface String {
	rstrip(): string;
	contains(value: string): boolean;
}

String.prototype.rstrip = function () {
    var string = <string>this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function (value: string) {
	var string = <string>this;
	return string.indexOf(value) >= 0;
};

function setImmediate(callback: () => void) {
    setTimeout(callback, 0);
}

class MathUtils {
	static prevAligned(value: number, alignment: number) {
		return Math.floor(value / alignment) * alignment;
	}

	static nextAligned(value: number, alignment: number) {
        if (alignment <= 1) return value;
        if ((value % alignment) == 0) return value;
        return value + (alignment - (value % alignment));
    }
}

declare function escape(input: string): string;
declare function unescape(input: string): string;

class Utf8 {
	static decode(input: string): string {
		return decodeURIComponent(escape(input));
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

declare function sprintf(...args: any[]);
declare function printf(...args: any[]);

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
		return new Promise((resolve, reject) => setTimeout(resolve, ms));
	}
}

window['requestFileSystem'] = window['requestFileSystem'] || window['webkitRequestFileSystem'];