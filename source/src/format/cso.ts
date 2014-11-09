///<reference path="../global.d.ts" />

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
		{ magic: Stringz(4) },
		{ headerSize: UInt32 },
		{ totalBytes: Int64 },
		{ blockSize: UInt32 },
		{ version: UInt8 },
		{ alignment: UInt8 },
		{ reserved: UInt16 },
    ]);
}

export class Cso implements AsyncStream {
	date: Date = new Date();
    private stream: AsyncStream;
    private header: Header;
	private offsets: Uint32Array;

	static fromStreamAsync(stream: AsyncStream) {
        return new Cso().loadAsync(stream);
    }

	get name() { return this.stream.name; }
    get size() { return this.header.totalBytes; }

	private cache = new AsyncCache<ArrayBuffer>(128 * 1024, arraybuffer => arraybuffer.byteLength);
	private decodeBlockAsync(index: number) {
		return this.cache.getOrGenerateAsync('item-' + index, () => {
			var compressed = ((this.offsets[index + 0] & 0x80000000) == 0);
			var low = this.offsets[index + 0] & 0x7FFFFFFF;
			var high = this.offsets[index + 1] & 0x7FFFFFFF;
			return this.stream.readChunkAsync(low, high - low).then((data) => {
				return (compressed ? ArrayBufferUtils.fromUInt8Array(new Zlib.RawInflate(data).decompress()) : data);
			}).catch(e => {
				console.error(e);
				throw (e);
			});
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


		if (count <= maxReadCount) {
			//console.log(sprintf("readChunkAsyncOne: %08X, %d, (%d) : %d, %d", offset, count, blockIndex, toReadInChunk, offset - blockLow));

			return chunkPromise;
		} else {
			//console.log(sprintf("readChunkAsyncSeveral: %08X, %d, (%d)", offset, count, blockIndex), (new Error())['stack']);
			//var time1 = performance.now();
			return chunkPromise.then(chunk1 => {
				return this.readChunkAsync(offset + toReadInChunk, count - toReadInChunk).then(chunk2 => {
					//var time2 = performance.now();
					var result = ArrayBufferUtils.concat([chunk1, chunk2]);
					//var time3 = performance.now();
					//console.log('Cso.readChunkAsync', time1, time2, time3);
					return result;
				});
			});
		}
    }

    private loadAsync(stream: AsyncStream) {
		this.stream = stream;
		this.date = stream.date;

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
