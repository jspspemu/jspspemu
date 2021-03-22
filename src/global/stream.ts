import "./window"
import "./utils"
import {Endian, PromiseFast, Utf8} from "./utils";
import {IType} from "./struct";
import {downloadFileAsync, downloadFileChunkAsync, statFileAsync, StatInfo} from "./async";
import {Integer64} from "./int64";
///<reference path="./int64.ts" />
///<reference path="./async.ts" />
///<reference path="./struct.ts" />

export interface AsyncStream {
	name: string;
	date: Date;
	size: number;
	readChunkAsync(offset: number, count: number): PromiseFast<ArrayBuffer>;
}

export class ProxyAsyncStream {
	constructor(public stream: AsyncStream) {
	}

	get name() { return this.stream.name; }
	get date() { return this.stream.date; }
	get size() { return this.stream.size; }
	readChunkAsync(offset: number, count: number) { return this.stream.readChunkAsync(offset, count); }
}

export class BufferedAsyncStream extends ProxyAsyncStream {
	constructor(stream: AsyncStream, public bufferSize = 131072) {
		super(stream);
	}

	get name() { return this.stream.name + '+buffered'; }

	private cache = { start: 0, end: 0, data: new ArrayBuffer(0) };

	getCachedEntry(start: number, end: number) {
		if (start >= this.cache.start && end <= this.cache.end) {
			return this.cache;
		} else {
			return null;
		}
	}

	putCacheEntry(start: number, data: ArrayBuffer) {
		this.cache.start = start;
		this.cache.end = start + data.byteLength;
		this.cache.data = data;
	}

	readChunkAsync(offset: number, count: number):PromiseFast<ArrayBuffer> {
        const availableFromOffset = this.size - offset;
        const start = offset;
        let end = offset + count;

        const cache = this.getCachedEntry(start, end);

        //return this.stream.readChunkAsync(start, count);

		if (cache) {
			return PromiseFast.resolve(cache.data.slice(start - cache.start, end - cache.start));
		} else {
            let bigCount = Math.max(count, this.bufferSize);
            bigCount = Math.min(bigCount, availableFromOffset);

			end = start + bigCount;

			return this.stream.readChunkAsync(offset, bigCount).then(data => {
				this.putCacheEntry(start, data);
				return this.readChunkAsync(offset, count);
			});
		}
    }
}

export class MemoryAsyncStream implements AsyncStream {
	constructor(private data: ArrayBuffer, public name = 'memory', public date = new Date()) {
	}

	static fromArrayBuffer(data: ArrayBuffer): MemoryAsyncStream {
		return new MemoryAsyncStream(data);
	}

	get size() { return this.data.byteLength; }

	readChunkAsync(offset: number, count: number) {
        return PromiseFast.resolve(this.data.slice(offset, offset + count))
    }
}

export class DelayedAsyncStream implements AsyncStream {
    get name() { return `delayed-${this.parent.name}` }

    constructor(public parent: AsyncStream, public timeoutMs: number = 100, public date = new Date()) {
    }

    get size() { return this.parent.size; }

    readChunkAsync(offset: number, count: number): PromiseFast<ArrayBuffer> {
        return this.parent.readChunkAsync(offset, count).then(value => {
            return PromiseFast.delay(this.timeoutMs, value)
        })
    }
}

export class UrlAsyncStream implements AsyncStream {
	name: string;
	date: Date;

	constructor(private url: string, public stat: StatInfo) {
		this.name = url;
		this.date = stat.date;
	}

	static fromUrlAsync(url: string): PromiseFast<AsyncStream> {
		console.info('open ', url);
		return statFileAsync(url).then((stat): PromiseFast<AsyncStream> => {
			console.info('fromUrlAsync', stat);

			if (stat.size == 0) {
				console.error("Invalid file with size '" + stat.size + "'", stat);
				throw (new Error("Invalid file with size '" + stat.size + "'"));
			}

			// If file is less  than 5MB, then download it completely
			if (stat.size < 5 * 1024 * 1024) {
				return downloadFileAsync(url).then(data => MemoryAsyncStream.fromArrayBuffer(data));
			} else {
				return PromiseFast.resolve(new BufferedAsyncStream(new UrlAsyncStream(url, stat)));
			}
		});
	}

	get size() { return this.stat.size; }

	readChunkAsync(offset: number, count: number) {
		//console.error();
		console.info('download chunk', this.url, offset + '-' + (offset + count), '(' + count + ')');
		return downloadFileChunkAsync(this.url, offset, count);
    }
}

export class FileAsyncStream implements AsyncStream {
	date: Date;

	constructor(private file: File) {
		this.date = (file as any).lastModifiedDate;
	}

	get name() { return this.file.name; }
	get size() { return this.file.size; }

	readChunkAsync(offset: number, count: number) {
		return new PromiseFast<ArrayBuffer>((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = (e) => { resolve((fileReader as any).result); };
			fileReader.onerror = (e:any) => { reject(e['error']); };
			fileReader.readAsArrayBuffer(this.file.slice(offset, offset + count));
		});
	}
}

export class Stream {
	static INVALID = Stream.fromArray([]);

	constructor(protected data: DataView, protected offset: number = 0) {
	}

	static fromArrayBuffer(data: ArrayBuffer) {
		return new Stream(new DataView(data));
	}

	static fromDataView(data: DataView, offset: number = 0) {
		return new Stream(data);
	}

	static fromBase64(data: string) {
        const outstr = atob(data);
        const out = new ArrayBuffer(outstr.length);
        const ia = new Uint8Array(out);
        for (let n = 0; n < outstr.length; n++) ia[n] = outstr.charCodeAt(n);
		return new Stream(new DataView(out));
	}

	static fromUint8Array(array: Uint8Array) {
		return Stream.fromArray(<any>array);
	}

	static fromSize(size: number) {
		return Stream.fromUint8Array(new Uint8Array(size))
	}

	static fromArray(array: any[]) {
        const buffer = new ArrayBuffer(array.length);
        const w8 = new Uint8Array(buffer);
        for (let n = 0; n < array.length; n++) w8[n] = array[n];
		return new Stream(new DataView(buffer));
	}

	toImageUrl(): string {
		try {
            const urlCreator = (<any>window)['URL'] || (<any>window)['webkitURL'];
            const blob = new Blob([this.toUInt8Array()], {type: "image/jpeg"});
            return urlCreator.createObjectURL(blob);
		} catch (e) {
			return 'data:image/png;base64,' + this.toBase64();
		}
	}

	toBase64() {
        let out = '';
        const array = this.toUInt8Array();
        for (let n = 0; n < array.length; n++) {
			out += String.fromCharCode(array[n]);
		}
		return btoa(out);
	}

	toStringAll() {
		return this.sliceWithLength(0).readString(this.length);
	}

	toUInt8Array() {
		return new Uint8Array(this.toArrayBuffer());
	}

	toArrayBuffer() {

		return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
	}

	clone() {
		return this.sliceWithLowHigh(this.position, this.length);
	}

	slice() {
		return this.clone();
	}

	sliceFrom(low: number) {
		return this.sliceWithLength(low);
	}

	sliceWithLength(low: number, count?: number) {
		if (count === undefined) count = this.length - low;
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

	get isNull() {
	    return this.offset == 0
    }

	get position() {
		return this.offset;
	}

    skipThis(count: number) {
        this.offset += count;
        return this
    }

	skip<T>(count: number, pass?: T): T {
		this.offset += count;
		return pass as T
	}

	set(index: number, value: number) {
		this.data.setInt8(index, value);
		return this;
	}

	get (index: number) {
		return this.data.getUint8(index);
	}

    readInt8LE() { return this.readInt8(Endian.LITTLE) }
    readInt16LE() { return this.readInt16(Endian.LITTLE) }
    readInt32LE() { return this.readInt32(Endian.LITTLE) }
    readInt64LE() { return this.readInt64(Endian.LITTLE) }
    readFloat32LE() { return this.readFloat32(Endian.LITTLE) }
    readUInt8LE() { return this.readUInt8(Endian.LITTLE) }
    readUInt16LE() { return this.readUInt16(Endian.LITTLE) }
    readUInt32LE() { return this.readUInt32(Endian.LITTLE) }

    readInt8BE() { return this.readInt8(Endian.BIG) }
    readInt16BE() { return this.readInt16(Endian.BIG) }
    readInt32BE() { return this.readInt32(Endian.BIG) }
    readInt64BE() { return this.readInt64(Endian.BIG) }
    readFloat32BE() { return this.readFloat32(Endian.BIG) }
    readUInt8BE() { return this.readUInt8(Endian.BIG) }
    readUInt16BE() { return this.readUInt16(Endian.BIG) }
    readUInt32BE() { return this.readUInt32(Endian.BIG) }

	readInt8(endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.getInt8(this.offset)); }
	readInt16(endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.getInt16(this.offset, (endian == Endian.LITTLE))); }
	readInt32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getInt32(this.offset, (endian == Endian.LITTLE))); }
	readInt64(endian: Endian = Endian.LITTLE) {
        const items = [this.readUInt32(endian), this.readUInt32(endian)];
        const low = items[(endian == Endian.LITTLE) ? 0 : 1];
        const high = items[(endian == Endian.LITTLE) ? 1 : 0];
        return Integer64.fromBits(low, high);
	}
	readFloat32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getFloat32(this.offset, (endian == Endian.LITTLE))); }

	readUInt8(endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.getUint8(this.offset)); }
	readUInt16(endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.getUint16(this.offset, (endian == Endian.LITTLE))); }
	readUInt32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getUint32(this.offset, (endian == Endian.LITTLE))); }

	readStruct<T>(struct: IType<T>) {
		return <T><any>struct.read(this);
	}

	copyTo(other: Stream) {
		other.writeBytes(this.readBytes(this.available));
	}

	writeByteRepeated(value: number, count: number = -1) {
		let n;
        if (count < 0) count = this.available;
		for (n = 0; n < count; n++) this.data.setInt8(this.offset + n, value);
		this.skip(n);
		return this;
	}

    writeInt8LE(value: number) { return this.writeInt8(value, Endian.LITTLE) }
    writeInt16LE(value: number) { return this.writeInt16(value, Endian.LITTLE) }
    writeInt32LE(value: number) { return this.writeInt32(value, Endian.LITTLE) }
    writeInt64LE(value: Integer64) { return this.writeInt64(value, Endian.LITTLE) }
    writeFloat32LE(value: number) { return this.writeFloat32(value, Endian.LITTLE) }
    writeUInt8LE(value: number) { return this.writeUInt8(value, Endian.LITTLE) }
    writeUInt16LE(value: number) { return this.writeUInt16(value, Endian.LITTLE) }
    writeUInt32LE(value: number) { return this.writeUInt32(value, Endian.LITTLE) }
    writeUInt64LE(value: Integer64) { return this.writeUInt64(value, Endian.LITTLE) }

    writeInt8BE(value: number) { return this.writeInt8(value, Endian.BIG) }
    writeInt16BE(value: number) { return this.writeInt16(value, Endian.BIG) }
    writeInt32BE(value: number) { return this.writeInt32(value, Endian.BIG) }
    writeInt64BE(value: Integer64) { return this.writeInt64(value, Endian.BIG) }
    writeFloat32BE(value: number) { return this.writeFloat32(value, Endian.BIG) }
    writeUInt8BE(value: number) { return this.writeUInt8(value, Endian.BIG) }
    writeUInt16BE(value: number) { return this.writeUInt16(value, Endian.BIG) }
    writeUInt32BE(value: number) { return this.writeUInt32(value, Endian.BIG) }
    writeUInt64BE(value: Integer64) { return this.writeUInt64(value, Endian.BIG) }

	writeInt8(value: number, endian: Endian = Endian.LITTLE) { this.ensure(1); this.data.setInt8(this.offset, value); return this.skip(1, this); }
	writeInt16(value: number, endian: Endian = Endian.LITTLE) { this.ensure(2); this.data.setInt16(this.offset, value, (endian == Endian.LITTLE)); return this.skip(2, this); }
	writeInt32(value: number, endian: Endian = Endian.LITTLE) { this.ensure(4); this.data.setInt32(this.offset, value, (endian == Endian.LITTLE)); return this.skip(4, this); }
	writeInt64(value: Integer64, endian: Endian = Endian.LITTLE) { this.ensure(8); return this._writeUInt64(value, endian); }
	writeFloat32(value: number, endian: Endian = Endian.LITTLE) { this.ensure(4); this.data.setFloat32(this.offset, value, (endian == Endian.LITTLE)); return this.skip(4, this); }
	writeUInt8(value: number, endian: Endian = Endian.LITTLE) { this.ensure(1); this.data.setUint8(this.offset, value); return this.skip(1, this); }
	writeUInt16(value: number, endian: Endian = Endian.LITTLE) { this.ensure(2); this.data.setUint16(this.offset, value, (endian == Endian.LITTLE)); return this.skip(2, this); }
	writeUInt32(value: number, endian: Endian = Endian.LITTLE) { this.ensure(4); this.data.setUint32(this.offset, value, (endian == Endian.LITTLE)); return this.skip(4, this); }
	writeUInt64(value: Integer64, endian: Endian = Endian.LITTLE) { this.ensure(8); return this._writeUInt64(value, endian); }

	private _writeUInt64(value: Integer64, endian: Endian = Endian.LITTLE) {
		this.writeUInt32((endian == Endian.LITTLE) ? value.low : value.high, endian);
		this.writeUInt32((endian == Endian.LITTLE) ? value.high : value.low, endian);
		return this;
	}

	writeStruct<T>(struct: IType<T>, value: T) {
		struct.write(this, value);
	}

	writeStream(stream: Stream) {
		return this.writeBytes(stream.slice().readBytes(stream.available));
	}

	writeString(str: string) {
		try {
			str.split('').forEach(char => {
				this.writeUInt8(char.charCodeAt(0));
			});
		} catch (e) {
			console.log("Can't write string '" + str + "'");
			debugger;
			console.warn(this.data);
			console.error(e);
			throw (e);
		}
	}

	writeStringz(str: string) {
		return this.writeString(str + String.fromCharCode(0));
	}

    ensure(count: number) {
	    if (count > this.available) {
	        throw new Error("Trying to write outside")
        }
    }

	writeBytes(data: Uint8Array) {
	    this.ensure(data.length)
        const out = new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        out.set(data, this.offset);
		this.skip(data.length);
	}

	readBytes(count: number):Uint8Array {
		return this.skip(count, new Uint8Array(this.data.buffer, this.data.byteOffset + this.offset, count));
	}

    readBytesCloned(count: number):Uint8Array {
	    const inp = this.readBytes(count)
        const out = new Uint8Array(inp.length)
        out.set(inp)
        return out
    }

	readAllBytes():Uint8Array {
		return this.readBytes(this.available);
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

	readString(count: number) {
		if (count > 1 * 1024 * 1024) throw(new Error("Trying to read a string larger than 128KB"));
        let str = '';
        for (let n = 0; n < count; n++) {
			str += String.fromCharCode(this.readUInt8());
		}
		return str;
	}

	readUtf8Stringz(maxCount: number = 131072) {
		return Utf8.decode(this.readStringz(maxCount));
	}

	readStringz(maxCount: number = 131072) {
        let str = '';
        for (let n = 0; n < maxCount; n++) {
			if (this.available <= 0) break;
            const char = this.readUInt8();
            if (char == 0) break;
			str += String.fromCharCode(char);
		}
		return str;
	}
}

export class GrowableStream extends Stream {
    constructor(data: DataView = new DataView(new ArrayBuffer(7)), offset: number = 0) {
        super(data, offset);
    }

    ensure(count: number) {
        if (count > this.available) {
            const newBuffer = new ArrayBuffer((this.length + 7) * 2)
            const newData = new DataView(newBuffer, this.data.byteOffset, newBuffer.byteLength - this.data.byteOffset)
            new Uint8Array(newBuffer).set(new Uint8Array(this.data.buffer, this.data.byteOffset))
            this.data = newData
        }
    }

    toByteArray() {
        return new Uint8Array(this.data.buffer, this.data.byteOffset, this.position)
    }
}
