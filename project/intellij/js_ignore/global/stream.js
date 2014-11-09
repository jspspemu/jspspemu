///<reference path="./utils.ts" />
///<reference path="./int64.ts" />
///<reference path="./async.ts" />
///<reference path="./struct.ts" />
var __extends = this.__extends || function (d, b) {
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
        if (bufferSize === void 0) { bufferSize = 131072; }
        _super.call(this, stream);
        this.bufferSize = bufferSize;
        this.cache = { start: 0, end: 0, data: new ArrayBuffer(0) };
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
        }
        else {
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
        }
        else {
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
        if (name === void 0) { name = 'memory'; }
        if (date === void 0) { date = new Date(); }
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
                return downloadFileAsync(url).then(function (data) { return MemoryAsyncStream.fromArrayBuffer(data); });
            }
            else {
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
        if (offset === void 0) { offset = 0; }
        this.data = data;
        this.offset = offset;
    }
    Stream.fromArrayBuffer = function (data) {
        return new Stream(new DataView(data));
    };
    Stream.fromDataView = function (data, offset) {
        if (offset === void 0) { offset = 0; }
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
    Stream.fromSize = function (size) {
        return Stream.fromUint8Array(new Uint8Array(size));
    };
    Stream.fromArray = function (array) {
        var buffer = new ArrayBuffer(array.length);
        var w8 = new Uint8Array(buffer);
        for (var n = 0; n < array.length; n++)
            w8[n] = array[n];
        return new Stream(new DataView(buffer));
    };
    Stream.prototype.toImageUrl = function () {
        try {
            var urlCreator = window['URL'] || window['webkitURL'];
            var blob = new Blob([this.toUInt8Array()], { type: "image/jpeg" });
            return urlCreator.createObjectURL(blob);
        }
        catch (e) {
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
    Stream.prototype.toStringAll = function () {
        return this.sliceWithLength(0).readString(this.length);
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
    Stream.prototype.slice = function () {
        return this.clone();
    };
    Stream.prototype.sliceFrom = function (low) {
        return this.sliceWithLength(low);
    };
    Stream.prototype.sliceWithLength = function (low, count) {
        if (count === undefined)
            count = this.length - low;
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
    Stream.prototype.set = function (index, value) {
        this.data.setInt8(index, value);
        return this;
    };
    Stream.prototype.get = function (index) {
        return this.data.getUint8(index);
    };
    Stream.prototype.readInt8 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getInt8(this.offset));
    };
    Stream.prototype.readInt16 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getInt16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readInt32 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getInt32(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readInt64 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        var items = [this.readUInt32(endian), this.readUInt32(endian)];
        var low = items[(endian == 0 /* LITTLE */) ? 0 : 1];
        var high = items[(endian == 0 /* LITTLE */) ? 1 : 0];
        return Integer64.fromBits(low, high);
    };
    Stream.prototype.readFloat32 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getFloat32(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readUInt8 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(1, this.data.getUint8(this.offset));
    };
    Stream.prototype.readUInt16 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(2, this.data.getUint16(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readUInt32 = function (endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this.skip(4, this.data.getUint32(this.offset, (endian == 0 /* LITTLE */)));
    };
    Stream.prototype.readStruct = function (struct) {
        return struct.read(this);
    };
    Stream.prototype.copyTo = function (other) {
        other.writeBytes(this.readBytes(this.available));
    };
    Stream.prototype.writeByteRepeated = function (value, count) {
        if (count === void 0) { count = -1; }
        if (count < 0)
            count = this.available;
        for (var n = 0; n < count; n++)
            this.data.setInt8(this.offset + n, value);
        this.skip(n);
        return this;
    };
    Stream.prototype.writeInt8 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setInt8(this.offset, value);
        return this.skip(1, this);
    };
    Stream.prototype.writeInt16 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setInt16(this.offset, value, (endian == 0 /* LITTLE */));
        return this.skip(2, this);
    };
    Stream.prototype.writeInt32 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setInt32(this.offset, value, (endian == 0 /* LITTLE */));
        return this.skip(4, this);
    };
    Stream.prototype.writeInt64 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this._writeUInt64(value, endian);
    };
    Stream.prototype.writeFloat32 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setFloat32(this.offset, value, (endian == 0 /* LITTLE */));
        return this.skip(4, this);
    };
    Stream.prototype.writeUInt8 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setUint8(this.offset, value);
        return this.skip(1, this);
    };
    Stream.prototype.writeUInt16 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setUint16(this.offset, value, (endian == 0 /* LITTLE */));
        return this.skip(2, this);
    };
    Stream.prototype.writeUInt32 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.data.setUint32(this.offset, value, (endian == 0 /* LITTLE */));
        return this.skip(4, this);
    };
    Stream.prototype.writeUInt64 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        return this._writeUInt64(value, endian);
    };
    Stream.prototype._writeUInt64 = function (value, endian) {
        if (endian === void 0) { endian = 0 /* LITTLE */; }
        this.writeUInt32((endian == 0 /* LITTLE */) ? value.low : value.high, endian);
        this.writeUInt32((endian == 0 /* LITTLE */) ? value.high : value.low, endian);
        return this;
    };
    Stream.prototype.writeStruct = function (struct, value) {
        struct.write(this, value);
    };
    Stream.prototype.writeStream = function (stream) {
        return this.writeBytes(stream.slice().readBytes(stream.available));
    };
    Stream.prototype.writeString = function (str) {
        var _this = this;
        try {
            str.split('').forEach(function (char) {
                _this.writeUInt8(char.charCodeAt(0));
            });
        }
        catch (e) {
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
    Stream.prototype.writeBytes = function (data) {
        var out = new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        out.set(data, this.offset);
        this.skip(data.length);
    };
    Stream.prototype.readBytes = function (count) {
        return this.skip(count, new Uint8Array(this.data.buffer, this.data.byteOffset + this.offset, count));
    };
    Stream.prototype.readAllBytes = function () {
        return this.readBytes(this.available);
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
        if (count > 1 * 1024 * 1024)
            throw (new Error("Trying to read a string larger than 128KB"));
        var str = '';
        for (var n = 0; n < count; n++) {
            str += String.fromCharCode(this.readUInt8());
        }
        return str;
    };
    Stream.prototype.readUtf8Stringz = function (maxCount) {
        if (maxCount === void 0) { maxCount = 131072; }
        return Utf8.decode(this.readStringz(maxCount));
    };
    Stream.prototype.readStringz = function (maxCount) {
        if (maxCount === void 0) { maxCount = 131072; }
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