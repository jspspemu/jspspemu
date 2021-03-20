import "../global"
import * as _audio from '../core/audio';
import Sample = _audio.Sample;
import {Stream} from "../global/stream";
import {StructClass, UInt32, UInt32_b} from "../global/struct";
import {BitUtils, MathUtils} from "../global/math";

var VAG_f = [0, 0, 60, 0, 115, -52, 98, -55, 122, -60];

class VagDecoder {
	static COMPRESSED_BYTES_IN_BLOCK = 14;
	static DECOMPRESSED_SAMPLES_IN_BLOCK = VagDecoder.COMPRESSED_BYTES_IN_BLOCK * 2; // 28

	decodedBlockSamples = <number[]>(new Array(VagDecoder.DECOMPRESSED_SAMPLES_IN_BLOCK));
	private predict1: number = 0;
	private predict2: number = 0;

	sampleIndexInBlock: number;
	sampleIndexInBlock2: number;
	reachedEnd: boolean;
	loopStack = <VagState[]>[];

	currentState = new VagState();
	currentLoopCount = 0;
	totalLoopCount = 0;

	get hasMore() { return !this.reachedEnd; }

	constructor(private blockStream: Stream, private BlockTotalCount: number) {
		this.reset();
	}

	reset() {
		this.currentState = new VagState();
		this.sampleIndexInBlock = 0;
		this.sampleIndexInBlock2 = 0;
		this.reachedEnd = false;
		this.currentLoopCount = 0;
	}

	setLoopCount(LoopCount: number) {
		this.currentLoopCount = 0;
		this.totalLoopCount = LoopCount;
	}

	seekNextBlock() {
		if (this.reachedEnd || this.currentState.blockIndex >= this.BlockTotalCount) { this.reachedEnd = true; return; }

		this.blockStream.position = this.currentState.blockIndex * 16;
		this.currentState.blockIndex++;

		//var block = VagBlock.struct.read(this.blockStream);
		var block = this.blockStream.readBytes(16);

		switch (block[1]) {
			case VagBlockType.LOOP_START:
				var copyState = this.currentState.clone();
				copyState.blockIndex--;
				this.loopStack.push(copyState);
				break;
			case VagBlockType.LOOP_END:
				if (this.currentLoopCount++ < this.totalLoopCount) {
					this.currentState = this.loopStack.pop();
				} else {
					this.loopStack.pop();
				}
				break;
			case VagBlockType.END:
				this.reachedEnd = true;
				return;
		}
		this.decodeBlock(block);
	}

	private sample = new Sample(0, 0);

	getNextSample() {
		if (this.reachedEnd) return this.sample.set(0, 0);

		this.sampleIndexInBlock %= VagDecoder.DECOMPRESSED_SAMPLES_IN_BLOCK;

		if (this.sampleIndexInBlock == 0) {
			this.seekNextBlock();
		}

		if (this.reachedEnd) return this.sample.set(0, 0);

		var value = this.decodedBlockSamples[this.sampleIndexInBlock++];
		return this.sample.set(value, value);
	}

	decodeBlock(block: Uint8Array) {
		var sampleOffset = 0;
		var shiftFactor = BitUtils.extract(block[0], 0, 4);
		var predictIndex = BitUtils.extract(block[0], 4, 4) % VAG_f.length;

		this.predict1 = VAG_f[predictIndex * 2 + 0];
		this.predict2 = VAG_f[predictIndex * 2 + 1];

		// Mono 4-bit/28 Samples per block.
		for (var n = 0; n < VagDecoder.COMPRESSED_BYTES_IN_BLOCK; n++) {
			var dataByte = block[n + 2];
			//debugger;
			var v1 = MathUtils.sextend16((((dataByte >>> 0) & 0xF) << 12)) >> shiftFactor;
			var v2 = MathUtils.sextend16((((dataByte >>> 4) & 0xF) << 12)) >> shiftFactor;
			this.decodedBlockSamples[sampleOffset + 0] = this.handleSampleKeepHistory(v1);
			this.decodedBlockSamples[sampleOffset + 1] = this.handleSampleKeepHistory(v2);

			//console.log("" + dataByte, ':', block.modificator, shiftFactor, ':', v1, v2, ':', this.currentState.history1, this.currentState.history2, ':', this.predict1, this.predict2, ':', this.decodedBlockSamples[sampleOffset + 0], this.decodedBlockSamples[sampleOffset + 1]);

			sampleOffset += 2;
		}
		//console.log('--------------> ', this.currentState.history1, this.currentState.history2);
	}

	private handleSampleKeepHistory(unpackedSample: number) {
		var sample = this.handleSample(unpackedSample);
		this.currentState.history2 = this.currentState.history1;
		this.currentState.history1 = sample;
		return sample;
	}

	private handleSample(unpackedSample: number) {
		var sample = 0;
		sample += unpackedSample * 1;
		sample += ((this.currentState.history1 * this.predict1) / 64) >> 0; // integer divide by 64
		sample += ((this.currentState.history2 * this.predict2) / 64) >> 0;
		//console.log(unpackedSample, '->', sample, ' : ');
		return MathUtils.clamp(sample, -32768, 32767);
	}
}


enum VagBlockType { LOOP_END = 3, LOOP_START = 6, END = 7 }

/*
class VagBlock {
	modificator: number;
	type: VagBlockType;
	data: number[];

	static struct = StructClass.create<VagBlock>(VagBlock, [
		{ modificator: UInt8 },
		{ type: UInt8 },
		{ data: StructArray<number>(UInt8, 14) },
	]);
}
*/

class VagHeader {
	magic: number;
	vagVersion: number;
	dataSize: number;
	sampleRate: number;
	//name: string;

	static struct = StructClass.create<VagHeader>(VagHeader, [
		{ magic: UInt32 },
		{ vagVersion: UInt32_b },
		{ dataSize: UInt32_b },
		{ sampleRate: UInt32_b },
		//{ name: Stringz(16) },
	]);
}

export class VagSoundSource {
	private header: VagHeader = null;
	private samplesCount: number = 0;
	private decoder: VagDecoder = null

	constructor(stream: Stream, loopCount: number) {
		if (stream.length < 0x10) {
			this.header = null;
			this.samplesCount = 0;
			this.decoder = new VagDecoder(stream, 0);
		} else {
			var headerStream = stream.sliceWithLength(0, VagHeader.struct.length);
			var dataStream = stream.sliceWithLength(VagHeader.struct.length);

			//debugger;

			this.header = VagHeader.struct.read(headerStream);
			this.samplesCount = Math.floor(dataStream.length * 56 / 16);
			this.decoder = new VagDecoder(dataStream, Math.floor(dataStream.length / 16));
		}
	}

	reset() {
		this.decoder.reset();
	}

	get hasMore() {
		return this.decoder.hasMore;
	}

	getNextSample(): Sample {
		return this.decoder.getNextSample();
	}
}

class VagState {
	constructor(public blockIndex = 0, public history1 = 0, public history2 = 0) {
	}

	clone() {
		return new VagState(this.blockIndex, this.history1, this.history2);
	}
}