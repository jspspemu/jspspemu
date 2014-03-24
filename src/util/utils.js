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
            this.output += String_repeat('\t', this.indentation);
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

function base64_toArrayBuffer(base64string) {
    var outstr = atob(base64string);
    var out = new ArrayBuffer(outstr.length);
    var ia = new Uint8Array(out);
    for (var n = 0; n < outstr.length; n++)
        ia[n] = outstr.charCodeAt(n);
    return out;
}

var MemoryAsyncStream = (function () {
    function MemoryAsyncStream(data, name) {
        if (typeof name === "undefined") { name = 'memory'; }
        this.data = data;
        this.name = name;
    }
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

var FileAsyncStream = (function () {
    function FileAsyncStream(file) {
        this.file = file;
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
                reject(e.error);
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
        return new Stream(new DataView(base64_toArrayBuffer(data)));
    };

    Stream.prototype.toUInt8Array = function () {
        return new Uint8Array(this.toArrayBuffer());
    };

    Stream.prototype.toArrayBuffer = function () {
        return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
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

    //readInt64() { return this.skip(8, this.data.getInt32(this.offset + 0, true) * Math.pow(2, 32) + this.data.getInt32(this.offset + 4, true) * Math.pow(2, 0)); }
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
    Stream.prototype.readUInt64 = function (endian) {
        if (typeof endian === "undefined") { endian = 0 /* LITTLE */; }
        return this.skip(8, this.data.getUint32(this.offset, (endian == 0 /* LITTLE */)));
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

    /*
    writeStream(from: Stream) {
    new Uint8Array(this.data.buffer, this.data.byteOffset).set();
    }
    */
    Stream.prototype.writeString = function (str) {
        var _this = this;
        str.split('').forEach(function (char) {
            _this.writeUInt8(char.charCodeAt(0));
        });
    };

    Stream.prototype.readString = function (count) {
        var str = '';
        for (var n = 0; n < count; n++) {
            str += String.fromCharCode(this.readInt8());
        }
        return str;
    };

    Stream.prototype.readUtf8Stringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 2147483648; }
        return Utf8.decode(this.readStringz(maxCount));
    };

    Stream.prototype.readStringz = function (maxCount) {
        if (typeof maxCount === "undefined") { maxCount = 2147483648; }
        var str = '';
        for (var n = 0; n < maxCount; n++) {
            if (this.available <= 0)
                break;
            var char = this.readInt8();
            if (char == 0)
                break;
            str += String.fromCharCode(char);
        }
        return str;
    };
    return Stream;
})();

var Int64Type = (function () {
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
    }
    Struct.create = function (items) {
        return new Struct(items);
    };

    Struct.prototype.read = function (stream) {
        var out = {};
        this.items.forEach(function (item) {
            out[item.name] = item.type.read(stream);
        });
        return out;
    };
    Struct.prototype.write = function (stream, value) {
        this.items.forEach(function (item) {
            item.type.write(stream, value[item.name]);
        });
    };
    Object.defineProperty(Struct.prototype, "length", {
        get: function () {
            return this.items.sum(function (item) {
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
    }
    StructClass.create = function (_class, items) {
        return new StructClass(_class, items);
    };

    StructClass.prototype.read = function (stream) {
        var _class = this._class;
        var out = new _class();
        this.items.forEach(function (item) {
            out[item.name] = item.type.read(stream);
        });
        return out;
    };
    StructClass.prototype.write = function (stream, value) {
        this.items.forEach(function (item) {
            item.type.write(stream, value[item.name]);
        });
    };
    Object.defineProperty(StructClass.prototype, "length", {
        get: function () {
            return this.items.sum(function (item) {
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

var StructArray = (function () {
    function StructArray(elementType, count) {
        this.elementType = elementType;
        this.count = count;
    }
    StructArray.create = function (elementType, count) {
        return new StructArray(elementType, count);
    };

    StructArray.prototype.read = function (stream) {
        var out = [];
        for (var n = 0; n < this.count; n++) {
            out.push(this.elementType.read(stream));
        }
        return out;
    };
    StructArray.prototype.write = function (stream, value) {
        for (var n = 0; n < this.count; n++)
            this.elementType.write(stream, value[n]);
    };
    Object.defineProperty(StructArray.prototype, "length", {
        get: function () {
            return this.elementType.length * this.count;
        },
        enumerable: true,
        configurable: true
    });
    return StructArray;
})();

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

var Int16 = new Int16Type(0 /* LITTLE */);
var Int32 = new Int32Type(0 /* LITTLE */);
var Int64 = new Int64Type(0 /* LITTLE */);
var Int8 = new Int8Type(0 /* LITTLE */);

var UInt16 = new UInt16Type(0 /* LITTLE */);
var UInt32 = new UInt32Type(0 /* LITTLE */);
var UInt8 = new UInt8Type(0 /* LITTLE */);

var UInt16_b = new UInt16Type(1 /* BIG */);
var UInt32_b = new UInt32Type(1 /* BIG */);

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

var UInt32_2lb = new UInt32_2lbStruct();

var UInt16_2lb = new UInt16_2lbStruct();

function Stringn(count) {
    return new StructStringn(count);
}
function Stringz(count) {
    return new StructStringz(count);
}

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
        this.elements.slice(0).forEach(callback);
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

    UidCollection.prototype.get = function (id) {
        return this.items[id];
    };

    UidCollection.prototype.remove = function (id) {
        delete this.items[id];
    };
    return UidCollection;
})();

var Signal = (function () {
    function Signal() {
        this.callbacks = new SortedSet();
    }
    Signal.prototype.add = function (callback) {
        this.callbacks.add(callback);
    };

    Signal.prototype.remove = function (callback) {
        this.callbacks.delete(callback);
    };

    Signal.prototype.once = function (callback) {
        var _this = this;
        var once = function () {
            _this.remove(once);
            callback();
        };
        this.add(once);
    };

    Signal.prototype.dispatch = function () {
        this.callbacks.forEach(function (callback) {
            callback();
        });
    };
    return Signal;
})();

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
        var ret = 0;
        while ((x & 0x80000000) != 0) {
            x <<= 1;
            ret++;
        }
        return ret;
    };

    BitUtils.clz = function (x) {
        return BitUtils.clo(~x);
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
        return (data >>> offset) & BitUtils.mask(length);
    };

    BitUtils.extractScale = function (data, offset, length, scale) {
        var mask = BitUtils.mask(length);
        return (((data >>> offset) & mask) * scale / mask) | 0;
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

    MathFloat.round = function (value) {
        return Math.round(value);
    };

    MathFloat.rint = function (value) {
        return Math.round(value);
    };

    MathFloat.cast = function (value) {
        return (value < 0) ? Math.ceil(value) : Math.floor(value);
    };

    MathFloat.floor = function (value) {
        return Math.floor(value);
    };

    MathFloat.ceil = function (value) {
        return Math.ceil(value);
    };
    MathFloat.floatArray = new Float32Array(1);
    MathFloat.intArray = new Int32Array(MathFloat.floatArray.buffer);
    return MathFloat;
})();

function compare(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return +1;
    return 0;
}

function identity(a) {
    return a;
}

Array.prototype.max = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) {
            return a;
        };
    return array.reduce(function (previous, current) {
        return Math.max(previous, selector(current));
    }, selector(array[0]));
});

Array.prototype.sortBy = function (selector) {
    return this.slice(0).sort(function (a, b) {
        return compare(selector(a), selector(b));
    });
};

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

String.prototype.rstrip = function () {
    var string = this;
    return string.replace(/\s+$/, '');
};

String.prototype.contains = function (value) {
    var string = this;
    return string.indexOf(value) >= 0;
};

function setImmediate(callback) {
    setTimeout(callback, 0);
}

var MathUtils = (function () {
    function MathUtils() {
    }
    MathUtils.prevAligned = function (value, alignment) {
        return Math.floor(value / alignment) * alignment;
    };

    MathUtils.nextAligned = function (value, alignment) {
        if (alignment <= 1)
            return value;
        if ((value % alignment) == 0)
            return value;
        return value + (alignment - (value % alignment));
    };
    return MathUtils;
})();

var Utf8 = (function () {
    function Utf8() {
    }
    Utf8.decode = function (input) {
        return decodeURIComponent(escape(input));
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

var ArrayBufferUtils = (function () {
    function ArrayBufferUtils() {
    }
    ArrayBufferUtils.fromUInt8Array = function (input) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
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
        return new Promise(function (resolve, reject) {
            return setTimeout(resolve, ms);
        });
    };
    return PromiseUtils;
})();

window['requestFileSystem'] = window['requestFileSystem'] || window['webkitRequestFileSystem'];
//# sourceMappingURL=utils.js.map
