import { SceKernelErrors } from '../SceKernelErrors';
import {Stream} from "../../global/stream";
import {logger} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";
import {Atrac3PlusUtil, AtracFileInfo} from "../../me/atrac3plus/Atrac3PlusUtil";
import {Atrac3plusDecoder} from "../../me/atrac3plus/Atrac3plusDecoder";
import {ArrayUtils} from "../../global/math";
import {Atrac3plusConstants, CodecType} from "../../me/atrac3plus/Atrac3plusConstants";
import {IMemory} from "../../me/MeUtils";

type Int = number

const log = logger.named("sceAtrac3plus")

export class sceAtrac3plus {
	constructor(private context: EmulatorContext) { }

    getStartSkippedSamples(codecType: CodecType) {
        switch (codecType) {
            case Atrac3plusConstants.PSP_CODEC_AT3: return 69
            case Atrac3plusConstants.PSP_CODEC_AT3PLUS: return 368
            default: return 0
        }
    }

    getMaxSamples(codecType: CodecType) {
        switch (codecType) {
            case Atrac3plusConstants.PSP_CODEC_AT3: return 1024
            case Atrac3plusConstants.PSP_CODEC_AT3PLUS: return Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES
            default: return 0
        }
    }

    private atracIDs = ArrayUtils.create(6, i => new AtracID(i))

    @nativeFunction(0x7A20E7AF, 150, 'uint', 'int/int')
	sceAtracSetDataAndGetID(dataPtr: number, bufferSize: number) {
        const id = this.atracIDs.first(it => !it.inUse)
        if (!id) return SceKernelErrors.ERROR_ATRAC_NO_ID
        this.sceAtracSetData(id.id, dataPtr, bufferSize)
        return id.id
	}

    @nativeFunction(0x0E2A73AB, 150, 'uint', 'int/int/int')
    sceAtracSetData(atID: number, dataPtr: number, bufferSize: number) {
        if (!this.hasById(atID)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const id = this.getAtrac(atID)
        const info = id.info
        const mem = this.context.memory
        const dataStream = mem.getPointerStream(dataPtr, bufferSize)!
        //const fileData = dataStream.clone().readAllBytes()
        log.trace("sceAtracSetData Partially implemented")

        const res = Atrac3PlusUtil.analyzeRiffFile(dataStream.clone(), 0, bufferSize, id.info)
        if (res < 0) {
            console.error("Invalid atrac data")
            return res
        }
        const outputChannels = 2
        //id.inputBuffer = fileData
        const startSkippedSamples = this.getStartSkippedSamples(Atrac3plusConstants.PSP_CODEC_AT3PLUS)
        const maxSamples = this.getMaxSamples(Atrac3plusConstants.PSP_CODEC_AT3PLUS)
        const skippedSamples = startSkippedSamples + info.atracSampleOffset
        const skippedFrames = Math.ceil(skippedSamples / maxSamples)
        //id.startAddr = dataPtr + id.info.inputFileDataOffset + (skippedFrames * info.atracBytesPerFrame)
        id.data = dataStream.clone().skipThis(id.info.inputFileDataOffset).readBytesCloned(id.info.inputDataSize)
        id.dataMem = new Uint8ArrayMem(id.data)
        id.startAddr = 0
        id.readAddr = id.startAddr
        id.endAddr = id.startAddr + id.info.inputDataSize
        id.decoder.init(id.info.atracBytesPerFrame, id.info.atracChannels, outputChannels, 0)
        //console.log(id.info)
        //console.error(`Decoder initialized with ${id.info.atracBytesPerFrame}, ${id.info.atracChannels}, ${outputChannels}, 0`)
        return 0;
    }

    getAtrac(id: Int) { return this.atracIDs[id] }

    @nativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*')
    sceAtracGetSecondBufferInfo(atID: number, puiPosition: Stream, puiDataByte: Stream) {
        logger.error(`sceAtracGetSecondBufferInfo Not implemented (${atID}, ${puiPosition}, ${puiDataByte})`)
        const id = this.getAtrac(atID)
        if (!id.isSecondBufferNeeded) {
            puiPosition.writeInt32(0)
            puiDataByte.writeInt32(0)
            return SceKernelErrors.ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED
        } else {
            puiPosition.writeInt32(id.secondBufferReadPosition)
            puiDataByte.writeInt32(id.secondBufferSize)
            return 0
        }
    }

    @nativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint')
    sceAtracSetSecondBuffer(id: number, pucSecondBufferAddr: Stream, uiSecondBufferByte: number) {
        //throw (new Error("Not implemented sceAtracSetSecondBuffer"));
        return 0;
    }

    @nativeFunction(0xA2BBA8BE, 150, 'uint', 'int/void*/void*/void*')
    sceAtracGetSoundSample(id: number, endSamplePtr: Stream, loopStartSamplePtr: Stream, loopEndSamplePtr: Stream) {
        if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        const hasLoops = (atrac3.info.loops != null) && (atrac3.info.loops.length > 0);
        if (endSamplePtr) endSamplePtr.writeInt32(atrac3.info.atracEndSample)
        //if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(hasLoops ? atrac3.LoopInfoList[0].StartSample : -1);
        if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(-1);
        //if (loopEndSamplePtr) *LoopEndSamplePointer = hasLoops ? atrac3.LoopInfoList[0].EndSample : -1;
        if (loopEndSamplePtr) loopEndSamplePtr.writeInt32(-1);
        return 0;
    }

    @nativeFunction(0x868120B5, 150, 'uint', 'int/int')
    sceAtracSetLoopNum(id: number, numberOfLoops: number) {
        if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        atrac3.info.numLoops = numberOfLoops;
        return 0;
    }
    /**
     * Gets the remaining (not decoded) number of frames
     * Pointer to a integer that receives either -1 if all at3 data is already on memory,
     * or the remaining (not decoded yet) frames at memory if not all at3 data is on memory
     * @return Less than 0 on error, otherwise 0
     */
    @nativeFunction(0x9AE849A7, 150, 'uint', 'int/void*')
    sceAtracGetRemainFrame(id: number, remainFramePtr: Stream) {
        if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        if (remainFramePtr) remainFramePtr.writeInt32(atrac3.remainFrames);
        return 0;
    }

    @nativeFunction(0xE23E3A35, 150, 'uint', 'int/void*')
    sceAtracGetNextDecodePosition(id: number, samplePositionPtr: Stream) {
        if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        if (atrac3.decodingReachedEnd) return SceKernelErrors.ERROR_ATRAC_ALL_DATA_DECODED;
        if (samplePositionPtr) samplePositionPtr.writeInt32(atrac3.currentFrame);
        return 0;
    }

    @nativeFunction(0x6A8C3CD5, 150, 'uint', 'int/void*/void*/void*/void*')
    sceAtracDecodeData(
        idAT: number,
        samplesAddr: Stream,
        samplesNbrAddr: Stream,
        outEndAddr: Stream,
        remainFramesAddr: Stream
    ) {
        logger.trace("sceAtracDecodeData Not implemented ($idAT, $samplesAddr, $samplesNbrAddr, $outEndAddr, $remainFramesAddr)")
        const id = this.getAtrac(idAT)
        const info = id.info
        if (id.isSecondBufferNeeded && !id.isSecondBufferSet) {
            logger.warn("sceAtracDecodeData atracID=0x%X needs second buffer!".format(idAT))
            return SceKernelErrors.ERROR_ATRAC_SECOND_BUFFER_NEEDED
        }

        const result = id.decoder.decode(id.dataMem, id.readAddr, info.atracBytesPerFrame, samplesAddr)
        if (result < 0) {
            samplesNbrAddr.writeInt32(0)
            return result
        }

        id.moveNext()
        samplesNbrAddr.writeInt32(id.decoder.numberOfSamples)
        //remainFramesAddr.set(id.remainFrames)
        remainFramesAddr.writeInt32(id.remainFrames)

        if (result == 0) {
            this.context.threadManager.delayThread(2300)
        }

        return result
    }

	@nativeFunction(0x61EB33F5, 150, 'uint', 'int')
	sceAtracReleaseAtracID(atID: number) {
        const atrac = this.getAtrac(atID)
        atrac.inUse = false
        return 0
	}

	@nativeFunction(0xA554A158, 150, 'uint', 'int/void*')
	sceAtracGetBitrate(id: number, bitratePtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        bitratePtr.writeInt32(atrac3.info.atracBitrate);
		return 0;
	}

	@nativeFunction(0x31668baa, 150, 'uint', 'int/void*')
	sceAtracGetChannel(id: number, channelsPtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        channelsPtr.writeInt32(atrac3.info.atracChannels);
		return 0;
	}

	@nativeFunction(0xD6A5F2F7, 150, 'uint', 'int/void*')
	sceAtracGetMaxSample(id: number, maxNumberOfSamplesPtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        maxNumberOfSamplesPtr.writeInt32(this.getMaxSamples(Atrac3plusConstants.PSP_CODEC_AT3PLUS));
		return 0;
	}

	@nativeFunction(0x36FAABFB, 150, 'uint', 'int/void*')
	sceAtracGetNextSample(id: number, numberOfSamplesInNextFramePtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);

        numberOfSamplesInNextFramePtr.writeInt32(Math.min(this.getMaxSamples(Atrac3plusConstants.PSP_CODEC_AT3PLUS), atrac3.byteAvailable));
		return 0;
	}

	@nativeFunction(0x780F88D1, 150, 'uint', 'int')
	sceAtracGetAtracID(codecType: CodecType) {
		if (codecType != CodecType.PSP_MODE_AT_3 && codecType != CodecType.PSP_MODE_AT_3_PLUS) {
			return SceKernelErrors.ATRAC_ERROR_INVALID_CODECTYPE;
		}
		return 1
	}

	hasById(id: number) {
        return id >= 0 && id < this.atracIDs.length
    }
	
	@nativeFunction(0x7DB31251, 150, 'uint', 'int/int')
	sceAtracAddStreamData(id: number, bytesToAdd: number) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        //console.warn("Not implemented sceAtracAddStreamData", id, bytesToAdd, atrac3);
		//throw (new Error("Not implemented sceAtracAddStreamData"));
		//return -1;
		return 0;
	}

	@nativeFunction(0x5D268707, 150, 'uint', 'int/void*/void*/void*')
	sceAtracGetStreamDataInfo(id: number, writePointerPointer: Stream, availableBytesPtr: Stream, readOffsetPtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        writePointerPointer.writeInt32(0);
		availableBytesPtr.writeInt32(0);
		readOffsetPtr.writeInt32(0);
		//WritePointerPointer = Atrac.PrimaryBuffer.Low; // @FIXME!!
		//AvailableBytes = Atrac.PrimaryBuffer.Size;
		//ReadOffset = Atrac.PrimaryBufferReaded;

		//console.warn("Not implemented sceAtracGetStreamDataInfo");
		//throw (new Error("Not implemented sceAtracGetStreamDataInfo"));
		//return -1;
		return 0;
	}

	@nativeFunction(0xCA3CA3D2, 150, 'uint', 'int/uint/void*')
	sceAtracGetBufferInfoForReseting(id: number, uiSample: number, bufferInfoPtr: Stream) {
		throw new Error("Not implemented sceAtracGetBufferInfoForReseting");
	}

	@nativeFunction(0x644E5607, 150, 'uint', 'int/uint/uint/uint')
	sceAtracResetPlayPosition(id: number, uiSample: number, uiWriteByteFirstBuf: number, uiWriteByteSecondBuf: number) {
		throw new Error("Not implemented sceAtracResetPlayPosition");
	}

	@nativeFunction(0xE88F759B, 150, 'uint', 'int/void*')
	sceAtracGetInternalErrorInfo(id: number, errorResultPtr: Stream) {
		throw new Error("Not implemented sceAtracGetInternalErrorInfo");
	}

	@nativeFunction(0xB3B5D042, 150, 'uint', 'int/void*')
	sceAtracGetOutputChannel(id: number, outputChannelPtr: Stream) {
		if (!this.hasById(id)) return SceKernelErrors.ATRAC_ERROR_NO_ATRACID;
        const atrac3 = this.getAtrac(id);
        const sceAudioChReserve = this.context.moduleManager.getByName('sceAudio').getByName('sceAudioChReserve').nativeCall;
        const channel = sceAudioChReserve(-1, this.getMaxSamples(Atrac3plusConstants.PSP_CODEC_AT3PLUS), 0);
        outputChannelPtr.writeInt32(channel);
		return 0;
	}
}

class Uint8ArrayMem implements IMemory {
    constructor(public data: Uint8Array) {
    }

    read8(addr: Int): Int {
        return this.data[addr]
    }
}

class AtracID {
    constructor(public id: Int) {
    }

    decoder = new Atrac3plusDecoder()
    inUse = false
    isSecondBufferNeeded = false
    isSecondBufferSet = false
    info = new AtracFileInfo()
    atracCurrentSample: Int = 0
    get atracEndSample(): Int { return this.info.atracEndSample }
    secondBufferReadPosition: Int = 0
    secondBufferSize: Int = 0
    data = new Uint8Array(0)
    // @ts-ignore
    dataMem: IMemory
    startAddr: Int = 0
    readAddr: Int = 0
    endAddr: Int = 0
    currentFrame = 0

    get byteLength(): Int { return this.endAddr - this.startAddr }
    get byteOffset(): Int { return this.readAddr - this.startAddr }
    get byteAvailable(): Int { return this.byteLength - this.byteOffset }
    get remainFrames(): Int {
        return Math.floor(this.byteAvailable / this.info.atracBytesPerFrame)
    }

    get decodingReachedEnd() {
        return this.remainFrames <= 0
    }

    getNumberOfSamplesInNextFrame() {
        return Math.min(this.getMaxSamples(CodecType.PSP_MODE_AT_3_PLUS), this.info.atracEndSample - this.currentFrame);
    }

    getMaxSamples(codecType: CodecType) {
        switch (codecType) {
            case Atrac3plusConstants.PSP_CODEC_AT3: return 1024
            case Atrac3plusConstants.PSP_CODEC_AT3PLUS: return Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES
            default: return 0
        }
    }

    moveNext() {
        this.readAddr += this.info.atracBytesPerFrame
    }
}