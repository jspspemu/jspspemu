interface AsyncStream {
	name: string;
	date: Date;
	size: number;
	readChunkAsync(offset: number, count: number): Promise<ArrayBuffer>;
}

class ProxyAsyncStream {
	constructor(public stream: AsyncStream) {
	}

	get name() { return this.stream.name; }
	get date() { return this.stream.date; }
	get size() { return this.stream.size; }
	readChunkAsync(offset: number, count: number) { return this.stream.readChunkAsync(offset, count); }
}

class BufferedAsyncStream extends ProxyAsyncStream {
	constructor(stream: AsyncStream, public bufferSize = 131072) {
		super(stream);
	}

	get name() { return this.stream.name + '+buffered'; }

	private cache = {
		start: 0,
		end: 0,
		data: new ArrayBuffer(0),
	};

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

	readChunkAsync(offset: number, count: number) {
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

			return this.stream.readChunkAsync(offset, bigCount).then(data => {
				this.putCacheEntry(start, data);
				return this.readChunkAsync(offset, count);
			});
		}
    }
}

class MemoryAsyncStream implements AsyncStream {
	constructor(private data: ArrayBuffer, public name = 'memory', public date = new Date()) {
	}

	static fromArrayBuffer(data: ArrayBuffer) {
		return new MemoryAsyncStream(data);
	}

	get size() { return this.data.byteLength; }

	readChunkAsync(offset: number, count: number) {
        return Promise.resolve(this.data.slice(offset, offset + count))
    }
}

class UrlAsyncStream implements AsyncStream {
	name: string;
	date: Date;

	constructor(private url: string, public stat: StatInfo) {
		this.name = url;
		this.date = stat.date;
	}

	static fromUrlAsync(url: string) {
		console.info('open ', url);
		return statFileAsync(url).then((stat): Promise<AsyncStream> => {
			console.info('fromUrlAsync', stat);

			if (stat.size == 0) {
				console.error("Invalid file with size '" + stat.size + "'", stat);
				throw (new Error("Invalid file with size '" + stat.size + "'"));
			}

			// If file is less  than 5MB, then download it completely
			if (stat.size < 5 * 1024 * 1024) {
				return downloadFileAsync(url).then(data => MemoryAsyncStream.fromArrayBuffer(data));
			} else {
				return Promise.resolve(new BufferedAsyncStream(new UrlAsyncStream(url, stat)));
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

class FileAsyncStream implements AsyncStream {
	date: Date;

	constructor(private file: File) {
		this.date = file.lastModifiedDate;
	}

	get name() { return this.file.name; }
	get size() { return this.file.size; }

	readChunkAsync(offset: number, count: number) {
		return new Promise<ArrayBuffer>((resolve, reject) => {
			var fileReader = new FileReader();
			fileReader.onload = (e) => { resolve(fileReader.result); };
			fileReader.onerror = (e) => { reject(e['error']); };
			fileReader.readAsArrayBuffer(this.file.slice(offset, offset + count));
		});
	}
}

class Stream {
	static INVALID = Stream.fromArray([]);

	constructor(private data: DataView, private offset: number = 0) {
	}

	static fromArrayBuffer(data: ArrayBuffer) {
		return new Stream(new DataView(data));
	}

	static fromDataView(data: DataView, offset: number = 0) {
		return new Stream(data);
	}

	static fromBase64(data: string) {
		var outstr = atob(data);
		var out = new ArrayBuffer(outstr.length);
		var ia = new Uint8Array(out);
		for (var n = 0; n < outstr.length; n++) ia[n] = outstr.charCodeAt(n);
		return new Stream(new DataView(out));
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

	toImageUrl() {
		var urlCreator = window['URL'] || window['webkitURL'];
		if (urlCreator) {
			var blob = new Blob([this.toUInt8Array()], { type: "image/jpeg" });
			return urlCreator.createObjectURL(blob);
		} else {
			return 'data:image/png;base64,' + this.toBase64();
		}
	}

	toBase64() {
		var out = '';
		var array = this.toUInt8Array();
		for (var n = 0; n < array.length; n++) {
			out += String.fromCharCode(array[n]);
		}
		return btoa(out);
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
	readInt64(endian: Endian = Endian.LITTLE) {
		var items = [this.readUInt32(endian), this.readUInt32(endian)];
		var low = items[(endian == Endian.LITTLE) ? 0 : 1];
		var high = items[(endian == Endian.LITTLE) ? 1 : 0];
		return Integer64.fromBits(low, high);
	}
	readFloat32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getFloat32(this.offset, (endian == Endian.LITTLE))); }

	readUInt8(endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.getUint8(this.offset)); }
	readUInt16(endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.getUint16(this.offset, (endian == Endian.LITTLE))); }
	readUInt32(endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.getUint32(this.offset, (endian == Endian.LITTLE))); }

	readStruct<T>(struct: IType) {
		return <any>struct.read(this);
	}

	writeInt8(value: number, endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.setInt8(this.offset, value)); }
	writeInt16(value: number, endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.setInt16(this.offset, value, (endian == Endian.LITTLE))); }
	writeInt32(value: number, endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.setInt32(this.offset, value, (endian == Endian.LITTLE))); }
	writeInt64(value: Integer64, endian: Endian = Endian.LITTLE) { return this._writeUInt64(value, endian); }

	writeFloat32(value: number, endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.setFloat32(this.offset, value, (endian == Endian.LITTLE))); }

	writeUInt8(value: number, endian: Endian = Endian.LITTLE) { return this.skip(1, this.data.setUint8(this.offset, value)); }
	writeUInt16(value: number, endian: Endian = Endian.LITTLE) { return this.skip(2, this.data.setUint16(this.offset, value, (endian == Endian.LITTLE))); }
	writeUInt32(value: number, endian: Endian = Endian.LITTLE) { return this.skip(4, this.data.setUint32(this.offset, value, (endian == Endian.LITTLE))); }
	writeUInt64(value: Integer64, endian: Endian = Endian.LITTLE) { return this._writeUInt64(value, endian); }

	private _writeUInt64(value: Integer64, endian: Endian = Endian.LITTLE) {
		this.writeUInt32((endian == Endian.LITTLE) ? value.low : value.high, endian);
		this.writeUInt32((endian == Endian.LITTLE) ? value.high : value.low, endian);
	}

	writeStruct<T>(struct: IType, value: T) {
		struct.write(this, value);
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

	readString(count: number) {
		if (count > 128 * 1024) throw(new Error("Trying to read a string larger than 128KB"));
		var str = '';
		for (var n = 0; n < count; n++) {
			str += String.fromCharCode(this.readUInt8());
		}
		return str;
	}

	readUtf8Stringz(maxCount: number = 131072) {
		return Utf8.decode(this.readStringz(maxCount));
	}

	readStringz(maxCount: number = 131072) {
		var str = '';
		for (var n = 0; n < maxCount; n++) {
			if (this.available <= 0) break;
			var char = this.readUInt8();
			if (char == 0) break;
			str += String.fromCharCode(char);
		}
		return str;
	}
}
