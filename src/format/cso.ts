import {Integer64_l, Stringz, StructClass, UInt16, UInt32, UInt8} from "../global/struct";
import {ArrayBufferUtils, PromiseFast} from "../global/utils";
import {AsyncStream, BaseAsyncStream, Stream} from "../global/stream";
import {Integer64} from "../global/int64";
import {zlib_inflate_raw} from "./zlib";

const CSO_MAGIC = 'CISO'

class Header {
    magic: string = ''
    headerSize: number = 0
    totalBytes: Integer64 = Integer64.ZERO
    blockSize: number = 0;
    version: number = 0
    alignment: number = 0
    reserved: number = 0

    get numberOfBlocks() { return Math.floor(this.totalBytes.number / this.blockSize); }

    static struct = StructClass.create<Header>(Header, [
		{ magic: Stringz(4) },
		{ headerSize: UInt32 },
		{ totalBytes: Integer64_l },
		{ blockSize: UInt32 },
		{ version: UInt8 },
		{ alignment: UInt8 },
		{ reserved: UInt16 },
    ]);
}

class Block {
	private _uncompressedData: Uint8Array|null = null;
	public compressedData: Uint8Array = new Uint8Array()
	public compressed: boolean;
	public low: number;
	public high: number;
	
	constructor(public index:number, raw1:number, raw2:number) {
		this.compressed = (raw1 & 0x80000000) == 0;
		this.low = raw1 & 0x7FFFFFFF;
		this.high = raw2 & 0x7FFFFFFF;
	}
	
	get uncompresesdData():Uint8Array {
		if (!this._uncompressedData) {
			if (this.compressed) {
				this._uncompressedData = zlib_inflate_raw(this.compressedData);
			} else {
				this._uncompressedData = this.compressedData; 
			}
		}
		return this._uncompressedData;
	}
	
	get size() {
		return this.high - this.low;
	}
	
	static getBlocksUncompressedData(blocks: Block[]):Uint8Array {
		return ArrayBufferUtils.concatU8(blocks.map(b => {
			//console.log('block', b.index, b.low, b.compressed);
			return b.uncompresesdData;
		}));
	}
}

export class Cso extends BaseAsyncStream {
	date: Date = new Date();
    // @ts-ignore
    private stream: AsyncStream;
    // @ts-ignore
    private header: Header;
    // @ts-ignore
	private offsets: Uint32Array;
	
	private getBlockInfo(index:number) {
		return new Block(index, this.offsets[index + 0], this.offsets[index + 1]);
	}

	static fromStreamAsync(stream: AsyncStream) {
        return new Cso().loadAsync(stream);
    }

	get name() { return this.stream.name; }
    get size() { return this.header.totalBytes.number; }
	
	private async readUncachedBlocksAsync(index: number, count:number): Promise<Block[]> {
        const low = this.getBlockInfo(index).low;
        const high = this.getBlockInfo(index + count - 1).high;
        const data = await this.stream.readChunkAsync(low, high - low)
        const chunks: Block[] = [];
        for (let n = 0; n < count; n++) {
            const chunk = this.getBlockInfo(index + n);
            chunk.compressedData = new Uint8Array(data, chunk.low - low, chunk.size);
            chunks.push(chunk);
        }
        return chunks;
	}

	async readChunkPromiseAsync(offset: number, count: number): Promise<ArrayBuffer> {
        const blockIndexLow = Math.floor(offset / this.header.blockSize);
        const blockIndexHigh = Math.floor((offset + count - 1) / this.header.blockSize);
        const blockCount = blockIndexHigh - blockIndexLow + 2;
        //const skip = (this.header.blockSize - (offset % this.header.blockSize)) % this.header.blockSize;
        const skip = offset % this.header.blockSize;

        //console.log('reading: ', offset, count, 'blocks:', blockIndexLow, blockIndexHigh, blockCount, 'skip:', skip);

        const blocks = await this.readUncachedBlocksAsync(blockIndexLow, blockCount)
		
        return ArrayBufferUtils.copyUint8ToArrayBuffer(Block.getBlocksUncompressedData(blocks).subarray(skip, skip + count));
    }

    private async loadAsync(stream: AsyncStream) {
		this.stream = stream;
		this.date = stream.date;

        let buffer = await stream.readChunkAsync(0, Header.struct.length);
        const header = this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
        if (header.magic != CSO_MAGIC) throw ('Not a CSO file');
        const buffer2 = await stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4)
        this.offsets = new Uint32Array(buffer2);
        return this;
    }
}
