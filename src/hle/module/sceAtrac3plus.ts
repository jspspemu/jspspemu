import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

export class sceAtrac3plus {
	constructor(private context: _context.EmulatorContext) { }

	_waitAsync(name: string, time: number) {
		return new WaitingThreadInfo(name, this, waitAsycn(time).then(() => 0));
	}

	sceAtracSetDataAndGetID = createNativeFunction(0x7A20E7AF, 150, 'uint', 'void*/int', this, (dataPointer: Stream, dataLength: number) => {
		return this._waitAsync('sceAtracSetDataAndGetID', 10);
	});

	sceAtracGetSecondBufferInfo = createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, (id: number, puiPosition: Stream, puiDataByte: Stream) => {
		puiPosition.writeInt32(0);
		puiDataByte.writeInt32(0);
		return this._waitAsync('sceAtracGetSecondBufferInfo', 10);
	});

	sceAtracSetSecondBuffer = createNativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint', this, (id: number, pucSecondBufferAddr: Stream, uiSecondBufferByte: number) => {
		return this._waitAsync('sceAtracSetSecondBuffer', 10);
	});

	sceAtracReleaseAtracID = createNativeFunction(0x61EB33F5, 150, 'uint', 'int', this, (id: number) => {
		return 0;
	});

	sceAtracDecodeData = createNativeFunction(0x6A8C3CD5, 150, 'uint', 'int/void*/void*', this, (id: number, samplesOutPtr: Stream, decodedSamplesCountPtr: Stream, reachedEndPtr: Stream, remainingFramesToDecodePtr: Stream) => {
		return this._waitAsync('sceAtracDecodeData', 10);
	});

	sceAtracGetRemainFrame = createNativeFunction(0x9AE849A7, 150, 'uint', 'int/void*', this, (id: number, remainFramePtr: Stream) => {
		return 0;
	});

	sceAtracGetStreamDataInfo = createNativeFunction(0x5D268707, 150, 'uint', 'int/void*/void*/void*', this, (id: number, writePointerPointer: Stream, availableBytesPtr: Stream, readOffsetPtr: Stream) => {
		return 0;
	});

	sceAtracAddStreamData = createNativeFunction(0x7DB31251, 150, 'uint', 'int/int', this, (id: number, bytesToAdd: number) => {
		return 0;
	});

	sceAtracGetNextDecodePosition = createNativeFunction(0xE23E3A35, 150, 'uint', 'int/void*', this, (id: number, samplePositionPtr: number) => {
		return 0;
	});

	sceAtracGetSoundSample = createNativeFunction(0xA2BBA8BE, 150, 'uint', 'int/void*/void*/void*', this, (id: number, endSamplePtr: number, loopStartSamplePtr: number, loopEndSamplePtr: number) => {
		return 0;
	});

	sceAtracSetLoopNum = createNativeFunction(0x868120B5, 150, 'uint', 'int/int', this, (id: number, numberOfLoops: number) => {
		return 0;
	});

	sceAtracGetBufferInfoForReseting = createNativeFunction(0xCA3CA3D2, 150, 'uint', 'int/uint/void*', this, (id: number, uiSample: number, bufferInfoPtr: Stream) => {
		return 0;
	});

	sceAtracResetPlayPosition = createNativeFunction(0x644E5607, 150, 'uint', 'int/uint/uint/uint', this, (id: number, uiSample: number, uiWriteByteFirstBuf: number, uiWriteByteSecondBuf: number) => {
		return 0;
	});

	sceAtracGetInternalErrorInfo = createNativeFunction(0xE88F759B, 150, 'uint', 'int/void*', this, (id: number, errorResultPtr: Stream) => {
		return 0;
	});
}
