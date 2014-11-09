///<reference path="../global.d.ts" />
var CSO_MAGIC = 'CISO';
var Header = (function () {
    function Header() {
    }
    Object.defineProperty(Header.prototype, "numberOfBlocks", {
        get: function () {
            return Math.floor(this.totalBytes / this.blockSize);
        },
        enumerable: true,
        configurable: true
    });
    Header.struct = StructClass.create(Header, [
        { magic: Stringz(4) },
        { headerSize: UInt32 },
        { totalBytes: Int64 },
        { blockSize: UInt32 },
        { version: UInt8 },
        { alignment: UInt8 },
        { reserved: UInt16 },
    ]);
    return Header;
})();
var Cso = (function () {
    function Cso() {
        this.date = new Date();
        this.cache = new AsyncCache(128 * 1024, function (arraybuffer) { return arraybuffer.byteLength; });
    }
    Cso.fromStreamAsync = function (stream) {
        return new Cso().loadAsync(stream);
    };
    Object.defineProperty(Cso.prototype, "name", {
        get: function () {
            return this.stream.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cso.prototype, "size", {
        get: function () {
            return this.header.totalBytes;
        },
        enumerable: true,
        configurable: true
    });
    Cso.prototype.decodeBlockAsync = function (index) {
        var _this = this;
        return this.cache.getOrGenerateAsync('item-' + index, function () {
            var compressed = ((_this.offsets[index + 0] & 0x80000000) == 0);
            var low = _this.offsets[index + 0] & 0x7FFFFFFF;
            var high = _this.offsets[index + 1] & 0x7FFFFFFF;
            return _this.stream.readChunkAsync(low, high - low).then(function (data) {
                return (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
            }).catch(function (e) {
                console.error(e);
                throw (e);
            });
        });
    };
    Cso.prototype.readChunkAsync = function (offset, count) {
        var _this = this;
        var blockIndex = Math.floor(offset / this.header.blockSize);
        var blockLow = MathUtils.prevAligned(offset, this.header.blockSize);
        var blockHigh = blockLow + this.header.blockSize;
        var maxReadCount = blockHigh - offset;
        var toReadInChunk = Math.min(count, maxReadCount);
        var chunkPromise = this.decodeBlockAsync(blockIndex).then(function (data) {
            //console.log(data.byteLength);
            var low = offset - blockLow;
            return data.slice(low, low + toReadInChunk);
        });
        if (count <= maxReadCount) {
            //console.log(sprintf("readChunkAsyncOne: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));
            return chunkPromise;
        }
        else {
            //console.log(sprintf("readChunkAsyncSeveral: %08X, %d, (%d)", offset, count, blockIndex), (new Error())['stack']);
            //var time1 = performance.now();
            return chunkPromise.then(function (chunk1) {
                return _this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(function (chunk2) {
                    //var time2 = performance.now();
                    var result = ArrayBufferUtils.concat([chunk1, chunk2]);
                    //var time3 = performance.now();
                    //console.log('Cso.readChunkAsync', time1, time2, time3);
                    return result;
                });
            });
        }
    };
    Cso.prototype.loadAsync = function (stream) {
        var _this = this;
        this.stream = stream;
        this.date = stream.date;
        return stream.readChunkAsync(0, Header.struct.length).then(function (buffer) {
            var header = _this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
            if (header.magic != CSO_MAGIC)
                throw ('Not a CSO file');
            return stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4).then(function (buffer) {
                _this.offsets = new Uint32Array(buffer);
                return _this;
            });
        });
    };
    return Cso;
})();
exports.Cso = Cso;
//# sourceMappingURL=cso.js.map