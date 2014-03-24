module format.cso {
    var CSO_MAGIC = 'CISO';

    class Header {
        magic: string;
        headerSize: number;
        totalBytes: number;
        blockSize: number;
        version: number;
        alignment: number;
        reserved: number;

        get numberOfBlocks() { return Math.floor(this.totalBytes / this.blockSize); }

        static struct = StructClass.create<Header>(Header, [
            { type: Stringz(4), name: "magic" },
            { type: UInt32, name: "headerSize" },
            { type: Int64, name: "totalBytes" },
            { type: UInt32, name: "blockSize" },
            { type: UInt8, name: "version" },
            { type: UInt8, name: "alignment" },
            { type: UInt16, name: "reserved" },
        ]);
    }

    export class Cso implements AsyncStream {
        private stream: AsyncStream;
        private header: Header;
		private offsets: Uint32Array;

        static fromStreamAsync(stream: AsyncStream) {
            return new Cso().loadAsync(stream);
        }

		get name() { return this.stream.name; }
        get size() { return this.header.totalBytes; }

		private cachedBlockIndex: number;
		private cachedBlockData: ArrayBuffer;
		private decodeBlockAsync(index: number) {
			if (this.cachedBlockIndex == index) return Promise.resolve(this.cachedBlockData);
			this.cachedBlockIndex = index;
			var compressed = ((this.offsets[index + 0] & 0x80000000) == 0);
			var low = this.offsets[index + 0] & 0x7FFFFFFF;
			var high = this.offsets[index + 1] & 0x7FFFFFFF;
			return this.stream.readChunkAsync(low, high - low).then((data) => {
				return this.cachedBlockData = (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
			}).catch(e => {
				console.error(e);
				throw(e);
			});
        }

		readChunkAsync(offset: number, count: number): Promise<ArrayBuffer> {
			var blockIndex = Math.floor(offset / this.header.blockSize);
			var blockLow = MathUtils.prevAligned(offset, this.header.blockSize);
			var blockHigh = blockLow + this.header.blockSize;
			var maxReadCount = blockHigh - offset;
			var toReadInChunk = Math.min(count, maxReadCount);
			var chunkPromise = this.decodeBlockAsync(blockIndex).then(data => {
				//console.log(data.byteLength);
				var low = offset - blockLow;
				return data.slice(low, low + toReadInChunk);
			});

			//console.log(sprintf("readChunkAsync: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));

			if (count <= maxReadCount) {
				return chunkPromise;
			} else {
				return chunkPromise.then(chunk1 => {
					return this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(chunk2 => {
						return ArrayBufferUtils.concat([chunk1, chunk2]);
					});
				});
			}
        }

        private loadAsync(stream: AsyncStream) {
            this.stream = stream;

            return stream.readChunkAsync(0, Header.struct.length).then(buffer => {
                var header = this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
                if (header.magic != CSO_MAGIC) throw ('Not a CSO file');

                return stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4).then(buffer => {
                    this.offsets = new Uint32Array(buffer);
                    return this;
                });
            });
        }
	}
}
