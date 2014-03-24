var format;
(function (format) {
    (function (cso) {
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
                { type: Stringz(4), name: "magic" },
                { type: UInt32, name: "headerSize" },
                { type: Int64, name: "totalBytes" },
                { type: UInt32, name: "blockSize" },
                { type: UInt8, name: "version" },
                { type: UInt8, name: "alignment" },
                { type: UInt16, name: "reserved" }
            ]);
            return Header;
        })();

        var Cso = (function () {
            function Cso() {
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
                if (this.cachedBlockIndex == index)
                    return Promise.resolve(this.cachedBlockData);
                this.cachedBlockIndex = index;
                var compressed = ((this.offsets[index + 0] & 0x80000000) == 0);
                var low = this.offsets[index + 0] & 0x7FFFFFFF;
                var high = this.offsets[index + 1] & 0x7FFFFFFF;
                return this.stream.readChunkAsync(low, high - low).then(function (data) {
                    return _this.cachedBlockData = (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
                }).catch(function (e) {
                    console.error(e);
                    throw (e);
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

                //console.log(sprintf("readChunkAsync: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));
                if (count <= maxReadCount) {
                    return chunkPromise;
                } else {
                    return chunkPromise.then(function (chunk1) {
                        return _this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(function (chunk2) {
                            return ArrayBufferUtils.concat([chunk1, chunk2]);
                        });
                    });
                }
            };

            Cso.prototype.loadAsync = function (stream) {
                var _this = this;
                this.stream = stream;

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
        cso.Cso = Cso;
    })(format.cso || (format.cso = {}));
    var cso = format.cso;
})(format || (format = {}));
//# sourceMappingURL=cso.js.map
