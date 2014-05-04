import _utils = require('../utils');
import SceKernelErrors = require('../SceKernelErrors');
import _context = require('../../context');
import _riff = require('../../format/riff'); _riff.Riff;
import Riff = _riff.Riff;
import createNativeFunction = _utils.createNativeFunction;

export class sceAtrac3plus {
	constructor(private context: _context.EmulatorContext) { }

	_waitAsync(name: string, time: number) {
		return new WaitingThreadInfo(name, this, waitAsync(time).then(() => 0));
	}

	private atrac3Ids = new UidCollection<Atrac3>();

	sceAtracSetDataAndGetID = createNativeFunction(0x7A20E7AF, 150, 'uint', 'byte[]', this, (data: Stream) => {
		return this.atrac3Ids.allocate(Atrac3.fromStream(data));
	});

	sceAtracGetSecondBufferInfo = createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, (id: number, puiPosition: Stream, puiDataByte: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);
		puiPosition.writeInt32(0);
		puiDataByte.writeInt32(0);
		return SceKernelErrors.ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED;
	});

	sceAtracSetSecondBuffer = createNativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint', this, (id: number, pucSecondBufferAddr: Stream, uiSecondBufferByte: number) => {
		//throw (new Error("Not implemented sceAtracSetSecondBuffer"));
		return 0;
	});

	sceAtracReleaseAtracID = createNativeFunction(0x61EB33F5, 150, 'uint', 'int', this, (id: number) => {
		this.atrac3Ids.remove(id);
		return 0;
	});

	sceAtracDecodeData = createNativeFunction(0x6A8C3CD5, 150, 'uint', 'int/void*/void*', this, (id: number, samplesOutPtr: Stream, decodedSamplesCountPtr: Stream, reachedEndPtr: Stream, remainingFramesToDecodePtr: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);

		var decodedSamples = atrac3.decode(samplesOutPtr);
		var reachedEnd = 0;
		var remainingFramesToDecode = atrac3.remainingFrames;

		function outputPointers() {
			if (reachedEndPtr) reachedEndPtr.writeInt32(reachedEnd);
			if (decodedSamplesCountPtr) decodedSamplesCountPtr.writeInt32(decodedSamples);
			if (remainingFramesToDecodePtr) remainingFramesToDecodePtr.writeInt32(remainingFramesToDecode);
		}

		//Console.WriteLine("{0}/{1} -> {2} : {3}", Atrac.DecodingOffsetInSamples, Atrac.TotalSamples, DecodedSamples, Atrac.DecodingReachedEnd);

		if (atrac3.decodingReachedEnd) {
			//if (atrac3.numberOfLoops == 0) {
			if (true) {
				decodedSamples = 0;
				reachedEnd = 1;
				remainingFramesToDecode = 0;
				outputPointers();
				return SceKernelErrors.ERROR_ATRAC_ALL_DATA_DECODED;
			}
			if (atrac3.numberOfLoops > 0) atrac3.numberOfLoops--;

			//atrac3.decodingOffset = (atrac3.LoopInfoList.Length > 0) ? atrac3.LoopInfoList[0].StartSample : 0;
		}

		//return Atrac.GetUidIndex(InjectContext);
		outputPointers();
		return 0;
	});

	/**
	 * Gets the remaining (not decoded) number of frames
	 * Pointer to a integer that receives either -1 if all at3 data is already on memory, 
	 * or the remaining (not decoded yet) frames at memory if not all at3 data is on memory 
	 * @return Less than 0 on error, otherwise 0
	 */
	sceAtracGetRemainFrame = createNativeFunction(0x9AE849A7, 150, 'uint', 'int/void*', this, (id: number, remainFramePtr: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);
		if (remainFramePtr) remainFramePtr.writeInt32(atrac3.remainingFrames);
		return 0;
	});

	sceAtracGetStreamDataInfo = createNativeFunction(0x5D268707, 150, 'uint', 'int/void*/void*/void*', this, (id: number, writePointerPointer: Stream, availableBytesPtr: Stream, readOffsetPtr: Stream) => {
		throw (new Error("Not implemented sceAtracGetStreamDataInfo"));
		return 0;
	});

	sceAtracAddStreamData = createNativeFunction(0x7DB31251, 150, 'uint', 'int/int', this, (id: number, bytesToAdd: number) => {
		throw (new Error("Not implemented sceAtracAddStreamData"));
		return 0;
	});

	sceAtracGetNextDecodePosition = createNativeFunction(0xE23E3A35, 150, 'uint', 'int/void*', this, (id: number, samplePositionPtr: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);
		if (atrac3.decodingReachedEnd) return SceKernelErrors.ERROR_ATRAC_ALL_DATA_DECODED;
		if (samplePositionPtr) samplePositionPtr.writeInt32(atrac3.decodingOffset);
		return 0;
	});

	sceAtracGetSoundSample = createNativeFunction(0xA2BBA8BE, 150, 'uint', 'int/void*/void*/void*', this, (id: number, endSamplePtr: Stream, loopStartSamplePtr: Stream, loopEndSamplePtr: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);
		//var hasLoops = (Atrac.LoopInfoList != null) && (Atrac.LoopInfoList.Length > 0);
		var hasLoops = false;
		if (endSamplePtr) endSamplePtr.writeInt32(atrac3.fact.endSample)
		//if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(hasLoops ? atrac3.LoopInfoList[0].StartSample : -1);
		if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(-1);
		//if (loopEndSamplePtr) *LoopEndSamplePointer = hasLoops ? atrac3.LoopInfoList[0].EndSample : -1;
		if (loopEndSamplePtr) loopEndSamplePtr.writeInt32(-1);
		return 0;
	});

	sceAtracSetLoopNum = createNativeFunction(0x868120B5, 150, 'uint', 'int/int', this, (id: number, numberOfLoops: number) => {
		var atrac3 = this.atrac3Ids.get(id);
		atrac3.numberOfLoops = numberOfLoops;
		return 0;
	});

	sceAtracGetBufferInfoForReseting = createNativeFunction(0xCA3CA3D2, 150, 'uint', 'int/uint/void*', this, (id: number, uiSample: number, bufferInfoPtr: Stream) => {
		throw (new Error("Not implemented sceAtracGetBufferInfoForReseting"));
		return 0;
	});

	sceAtracResetPlayPosition = createNativeFunction(0x644E5607, 150, 'uint', 'int/uint/uint/uint', this, (id: number, uiSample: number, uiWriteByteFirstBuf: number, uiWriteByteSecondBuf: number) => {
		throw (new Error("Not implemented sceAtracResetPlayPosition"));
		return 0;
	});

	sceAtracGetInternalErrorInfo = createNativeFunction(0xE88F759B, 150, 'uint', 'int/void*', this, (id: number, errorResultPtr: Stream) => {
		throw (new Error("Not implemented sceAtracGetInternalErrorInfo"));
		return 0;
	});

	sceAtracGetOutputChannel = createNativeFunction(0xB3B5D042, 150, 'uint', 'int/void*', this, (id: number, outputChannelPtr: Stream) => {
		var atrac3 = this.atrac3Ids.get(id);
		var sceAudioChReserve = this.context.moduleManager.getByName('sceAudio').getByName('sceAudioChReserve').nativeCall;
		var channel = sceAudioChReserve(-1, atrac3.maximumSamples, 0);
		outputChannelPtr.writeInt32(channel);
		return 0;
	});
}

class Atrac3 {
	fmt = new At3FormatStruct();
	fact = new FactStruct();
	//smpl = new SmplStruct();
	dataStream = Stream.fromArray([]);
	numberOfLoops = 0;
	decodingOffset = 0;
	codecType = CodecType.PSP_MODE_AT_3_PLUS;

	loadStream(data: Stream) {
		//debugger;

		Riff.fromStreamWithHandlers(data, {
			'fmt ': (stream: Stream) => { this.fmt = At3FormatStruct.struct.read(stream); },
			'fact': (stream: Stream) => { this.fact = FactStruct.struct.read(stream); },
			'smpl': (stream: Stream) => { },//{ this.smpl = SmplStruct.struct.read(stream); },
			'data': (stream: Stream) => { this.dataStream = stream; },
		});

		//console.log(this.fmt);
		//console.log(this.fact);

		return this;
	}

	get maximumSamples() {
		this.fmt.compressionCode
		switch (this.codecType) {
			case CodecType.PSP_MODE_AT_3_PLUS: return 0x800;
			case CodecType.PSP_MODE_AT_3: return 0x400;
			default: throw (new Error("Unknown codec type"));
		}
	}

	get remainingFrames() {
		if (this.fmt.blockSize == 0) return -1;
		return (this.dataStream.available / this.fmt.blockSize);
	}

	get decodingReachedEnd() {
		return this.remainingFrames <= 0;
	}

	decode(samplesOutPtr: Stream) {
		if (this.dataStream.available < this.fmt.blockSize) return 0;
		var blockData = this.dataStream.readBytes(this.fmt.blockSize);
		this.decodingOffset++;
		// decode
		return 0x800 * this.fmt.atracChannels * 2;
	}

	static fromStream(data: Stream) {
		return new Atrac3().loadStream(data);
	}
}

class FactStruct {
	endSample = 0;
	sampleOffset = 0;

	static struct = StructClass.create<FactStruct>(FactStruct, [
		{ endSample: Int32 },
		{ sampleOffset: Int32 },
	]);
}

class At3FormatStruct {
	compressionCode = 0;
	atracChannels = 0;
	bitrate = 0;
	averageBytesPerSecond = 0;
	blockAlignment = 0;
	bytesPerFrame = 0;
	unknown = [0, 0, 0, 0];
	omaInfo = 0;
	_unk2 = 0;
	_blockSize = 0;

	get blockSize() { return (this._blockSize & 0x3FF) * 8 + 8; }

	static struct = StructClass.create<At3FormatStruct>(At3FormatStruct, <StructEntry[]>[
		{ compressionCode: UInt16 },
		{ atracChannels: UInt16 },
		{ bitrate: UInt32 },
		{ averageBytesPerSecond: UInt16 },
		{ blockAlignment: UInt16 },
		{ bytesPerFrame: UInt16 },
		{ unknown: StructArray(UInt32, 4) },
		{ omaInfo: UInt32 },
		{ _unk2: UInt16_b },
		{ _blockSize: UInt16_b },
	]);
}

enum CodecType {
	PSP_MODE_AT_3_PLUS = 0x00001000,
	PSP_MODE_AT_3 = 0x00001001,
}