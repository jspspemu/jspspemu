///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var SceKernelErrors = require('../SceKernelErrors');
var _riff = require('../../format/riff');
_riff.Riff;
var Riff = _riff.Riff;
var createNativeFunction = _utils.createNativeFunction;
var sceAtrac3plus = (function () {
    function sceAtrac3plus(context) {
        var _this = this;
        this.context = context;
        this._atrac3Ids = new UidCollection();
        this.sceAtracSetDataAndGetID = createNativeFunction(0x7A20E7AF, 150, 'uint', 'byte[]', this, function (data) {
            return _this._atrac3Ids.allocate(Atrac3.fromStream(data));
        });
        this.sceAtracSetData = createNativeFunction(0x0E2A73AB, 150, 'uint', 'int/byte[]', this, function (id, data) {
            var atrac3 = _this.getById(id);
            atrac3.setDataStream(data);
            return 0;
        });
        this.sceAtracGetSecondBufferInfo = createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, function (id, puiPosition, puiDataByte) {
            var atrac3 = _this.getById(id);
            puiPosition.writeInt32(0);
            puiDataByte.writeInt32(0);
            return 2153971746 /* ERROR_ATRAC_SECOND_BUFFER_NOT_NEEDED */;
        });
        this.sceAtracSetSecondBuffer = createNativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint', this, function (id, pucSecondBufferAddr, uiSecondBufferByte) {
            //throw (new Error("Not implemented sceAtracSetSecondBuffer"));
            return 0;
        });
        this.sceAtracReleaseAtracID = createNativeFunction(0x61EB33F5, 150, 'uint', 'int', this, function (id) {
            _this._atrac3Ids.remove(id);
            return 0;
        });
        this.sceAtracDecodeData = createNativeFunction(0x6A8C3CD5, 150, 'uint', 'int/void*/void*/void*/void*', this, function (id, samplesOutPtr, decodedSamplesCountPtr, reachedEndPtr, remainingFramesToDecodePtr) {
            var atrac3 = _this.getById(id);
            return atrac3.decodeAsync(samplesOutPtr).then(function (decodedSamples) {
                var reachedEnd = 0;
                var remainingFramesToDecode = atrac3.remainingFrames;
                function outputPointers() {
                    if (reachedEndPtr)
                        reachedEndPtr.writeInt32(reachedEnd);
                    if (decodedSamplesCountPtr)
                        decodedSamplesCountPtr.writeInt32(decodedSamples / atrac3.format.atracChannels);
                    if (remainingFramesToDecodePtr)
                        remainingFramesToDecodePtr.writeInt32(remainingFramesToDecode);
                }
                //Console.WriteLine("{0}/{1} -> {2} : {3}", Atrac.DecodingOffsetInSamples, Atrac.TotalSamples, DecodedSamples, Atrac.DecodingReachedEnd);
                if (atrac3.decodingReachedEnd) {
                    if (atrac3.numberOfLoops == 0) {
                        //if (true) {
                        decodedSamples = 0;
                        reachedEnd = 1;
                        remainingFramesToDecode = 0;
                        outputPointers();
                        return 2153971748 /* ERROR_ATRAC_ALL_DATA_DECODED */;
                    }
                    if (atrac3.numberOfLoops > 0)
                        atrac3.numberOfLoops--;
                    atrac3.currentSample = (atrac3.loopInfoList.length > 0) ? atrac3.loopInfoList[0].startSample : 0;
                }
                //return Atrac.GetUidIndex(InjectContext);
                outputPointers();
                return 0;
            });
        });
        /**
         * Gets the remaining (not decoded) number of frames
         * Pointer to a integer that receives either -1 if all at3 data is already on memory,
         * or the remaining (not decoded yet) frames at memory if not all at3 data is on memory
         * @return Less than 0 on error, otherwise 0
         */
        this.sceAtracGetRemainFrame = createNativeFunction(0x9AE849A7, 150, 'uint', 'int/void*', this, function (id, remainFramePtr) {
            var atrac3 = _this.getById(id);
            if (remainFramePtr)
                remainFramePtr.writeInt32(atrac3.remainingFrames);
            return 0;
        });
        this.sceAtracGetBitrate = createNativeFunction(0xA554A158, 150, 'uint', 'int/void*', this, function (id, bitratePtr) {
            var atrac3 = _this.getById(id);
            bitratePtr.writeInt32(atrac3.bitrate);
            return 0;
        });
        this.sceAtracGetChannel = createNativeFunction(0x31668baa, 150, 'uint', 'int/void*', this, function (id, channelsPtr) {
            var atrac3 = _this.getById(id);
            channelsPtr.writeInt32(atrac3.format.atracChannels);
            return 0;
        });
        this.sceAtracGetMaxSample = createNativeFunction(0xD6A5F2F7, 150, 'uint', 'int/void*', this, function (id, maxNumberOfSamplesPtr) {
            var atrac3 = _this.getById(id);
            maxNumberOfSamplesPtr.writeInt32(atrac3.maximumSamples);
            return 0;
        });
        this.sceAtracGetNextSample = createNativeFunction(0x36FAABFB, 150, 'uint', 'int/void*', this, function (id, numberOfSamplesInNextFramePtr) {
            var atrac3 = _this.getById(id);
            numberOfSamplesInNextFramePtr.writeInt32(atrac3.getNumberOfSamplesInNextFrame());
            return 0;
        });
        this.sceAtracGetAtracID = createNativeFunction(0x780F88D1, 150, 'uint', 'int', this, function (codecType) {
            if (codecType != 4097 /* PSP_MODE_AT_3 */ && codecType != 4096 /* PSP_MODE_AT_3_PLUS */) {
                return 2153971716 /* ATRAC_ERROR_INVALID_CODECTYPE */;
            }
            return _this._atrac3Ids.allocate(new Atrac3(-1));
        });
        this.sceAtracAddStreamData = createNativeFunction(0x7DB31251, 150, 'uint', 'int/int', this, function (id, bytesToAdd) {
            var atrac3 = _this.getById(id);
            //console.warn("Not implemented sceAtracAddStreamData", id, bytesToAdd, atrac3);
            //throw (new Error("Not implemented sceAtracAddStreamData"));
            //return -1;
            return 0;
        });
        this.sceAtracGetStreamDataInfo = createNativeFunction(0x5D268707, 150, 'uint', 'int/void*/void*/void*', this, function (id, writePointerPointer, availableBytesPtr, readOffsetPtr) {
            var atrac3 = _this.getById(id);
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
        });
        this.sceAtracGetNextDecodePosition = createNativeFunction(0xE23E3A35, 150, 'uint', 'int/void*', this, function (id, samplePositionPtr) {
            var atrac3 = _this.getById(id);
            if (atrac3.decodingReachedEnd)
                return 2153971748 /* ERROR_ATRAC_ALL_DATA_DECODED */;
            if (samplePositionPtr)
                samplePositionPtr.writeInt32(atrac3.currentSample);
            return 0;
        });
        this.sceAtracGetSoundSample = createNativeFunction(0xA2BBA8BE, 150, 'uint', 'int/void*/void*/void*', this, function (id, endSamplePtr, loopStartSamplePtr, loopEndSamplePtr) {
            var atrac3 = _this.getById(id);
            var hasLoops = (atrac3.loopInfoList != null) && (atrac3.loopInfoList.length > 0);
            if (endSamplePtr)
                endSamplePtr.writeInt32(atrac3.fact.endSample);
            //if (loopStartSamplePtr) loopStartSamplePtr.writeInt32(hasLoops ? atrac3.LoopInfoList[0].StartSample : -1);
            if (loopStartSamplePtr)
                loopStartSamplePtr.writeInt32(-1);
            //if (loopEndSamplePtr) *LoopEndSamplePointer = hasLoops ? atrac3.LoopInfoList[0].EndSample : -1;
            if (loopEndSamplePtr)
                loopEndSamplePtr.writeInt32(-1);
            return 0;
        });
        this.sceAtracSetLoopNum = createNativeFunction(0x868120B5, 150, 'uint', 'int/int', this, function (id, numberOfLoops) {
            var atrac3 = _this.getById(id);
            atrac3.numberOfLoops = numberOfLoops;
            return 0;
        });
        this.sceAtracGetBufferInfoForReseting = createNativeFunction(0xCA3CA3D2, 150, 'uint', 'int/uint/void*', this, function (id, uiSample, bufferInfoPtr) {
            throw (new Error("Not implemented sceAtracGetBufferInfoForReseting"));
            return 0;
        });
        this.sceAtracResetPlayPosition = createNativeFunction(0x644E5607, 150, 'uint', 'int/uint/uint/uint', this, function (id, uiSample, uiWriteByteFirstBuf, uiWriteByteSecondBuf) {
            throw (new Error("Not implemented sceAtracResetPlayPosition"));
            return 0;
        });
        this.sceAtracGetInternalErrorInfo = createNativeFunction(0xE88F759B, 150, 'uint', 'int/void*', this, function (id, errorResultPtr) {
            throw (new Error("Not implemented sceAtracGetInternalErrorInfo"));
            return 0;
        });
        this.sceAtracGetOutputChannel = createNativeFunction(0xB3B5D042, 150, 'uint', 'int/void*', this, function (id, outputChannelPtr) {
            var atrac3 = _this.getById(id);
            var sceAudioChReserve = _this.context.moduleManager.getByName('sceAudio').getByName('sceAudioChReserve').nativeCall;
            var channel = sceAudioChReserve(-1, atrac3.maximumSamples, 0);
            outputChannelPtr.writeInt32(channel);
            return 0;
        });
    }
    /*
    [HlePspFunction(NID = 0x780F88D1, FirmwareVersion = 150)]
    [HlePspNotImplemented]
    public Atrac sceAtracGetAtracID(CodecType CodecType)
    {
        if (CodecType != CodecType.PSP_MODE_AT_3 && CodecType != CodecType.PSP_MODE_AT_3_PLUS) {
            throw (new SceKernelException(SceKernelErrors.ATRAC_ERROR_INVALID_CODECTYPE));
        }

        return TryToAlloc(new Atrac(InjectContext, CodecType));
    }
    */
    sceAtrac3plus.prototype.getById = function (id) {
        if (!this._atrac3Ids.has(id))
            throw (new SceKernelException(2153971715 /* ATRAC_ERROR_NO_ATRACID */));
        return this._atrac3Ids.get(id);
    };
    return sceAtrac3plus;
})();
exports.sceAtrac3plus = sceAtrac3plus;
var Atrac3 = (function () {
    function Atrac3(id) {
        this.id = id;
        this.format = new At3FormatStruct();
        this.fact = new FactStruct();
        this.smpl = new SmplStruct();
        this.loopInfoList = [];
        this.dataStream = Stream.fromArray([]);
        this.numberOfLoops = 0;
        this.currentSample = 0;
        this.codecType = 4096 /* PSP_MODE_AT_3_PLUS */;
    }
    Atrac3.prototype.setDataStream = function (data) {
        var _this = this;
        this.atrac3Decoder = new MediaEngine.Atrac3Decoder();
        //debugger;
        Riff.fromStreamWithHandlers(data, {
            'fmt ': function (stream) {
                _this.format = At3FormatStruct.struct.read(stream);
            },
            'fact': function (stream) {
                _this.fact = FactStruct.struct.read(stream);
            },
            'smpl': function (stream) {
                _this.smpl = SmplStruct.struct.read(stream);
                _this.loopInfoList = StructArray(LoopInfoStruct.struct, _this.smpl.loopCount).read(stream);
            },
            'data': function (stream) {
                _this.dataStream = stream;
            },
        });
        this.firstDataChunk = this.dataStream.readBytes(this.format.blockSize).subarray(0);
        //console.log(this.fmt);
        //console.log(this.fact);
        return this;
    };
    Object.defineProperty(Atrac3.prototype, "bitrate", {
        get: function () {
            var _atracBitrate = Math.floor((this.format.bytesPerFrame * 352800) / 1000);
            if (this.codecType == 4096 /* PSP_MODE_AT_3_PLUS */) {
                return ((_atracBitrate >> 11) + 8) & 0xFFFFFFF0;
            }
            else {
                return (_atracBitrate + 511) >> 10;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Atrac3.prototype, "maximumSamples", {
        get: function () {
            this.format.compressionCode;
            switch (this.codecType) {
                case 4096 /* PSP_MODE_AT_3_PLUS */:
                    return 0x800;
                case 4097 /* PSP_MODE_AT_3 */:
                    return 0x400;
                default:
                    throw (new Error("Unknown codec type"));
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Atrac3.prototype, "endSample", {
        get: function () {
            return this.fact.endSample;
        },
        enumerable: true,
        configurable: true
    });
    Atrac3.prototype.getNumberOfSamplesInNextFrame = function () {
        return Math.min(this.maximumSamples, this.endSample - this.currentSample);
    };
    Object.defineProperty(Atrac3.prototype, "remainingFrames", {
        get: function () {
            if (this.format.blockSize == 0)
                return -1;
            return (this.dataStream.available / this.format.blockSize);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Atrac3.prototype, "decodingReachedEnd", {
        get: function () {
            return this.remainingFrames <= 0;
        },
        enumerable: true,
        configurable: true
    });
    Atrac3.prototype.decodeAsync = function (samplesOutPtr) {
        if (this.dataStream.available < this.format.blockSize)
            return Promise.resolve(0);
        var blockData = this.dataStream.readBytes(this.format.blockSize);
        this.currentSample++;
        var outPromise;
        if (Atrac3.useWorker) {
            outPromise = WorkerTask.executeAsync(function (id, blockData, firstDataChunk) {
                self['window'] = self;
                if (!self['MediaEngine']) {
                    importScripts('polyfills/promise.js');
                    importScripts('MediaEngine.js');
                    self['MediaEngine'] = MediaEngine;
                }
                var atrac3Decoder = 'atrac3Decoder_' + id;
                if (!self[atrac3Decoder]) {
                    self[atrac3Decoder] = new MediaEngine.Atrac3Decoder();
                    self[atrac3Decoder].initWithHeader(firstDataChunk);
                }
                return self[atrac3Decoder].decode(blockData);
            }, [this.id, blockData, this.firstDataChunk]);
        }
        else {
            if (this.firstDataChunk) {
                this.atrac3Decoder.initWithHeader(this.firstDataChunk);
            }
            outPromise = Promise.resolve(this.atrac3Decoder.decode(blockData));
        }
        this.firstDataChunk = null;
        return outPromise.then(function (out) {
            for (var n = 0; n < out.length; n++)
                samplesOutPtr.writeInt16(out[n]);
            return out.length;
        });
    };
    Atrac3.fromStream = function (data) {
        return new Atrac3(Atrac3.lastId++).setDataStream(data);
    };
    //private static useWorker = false;
    Atrac3.useWorker = true;
    Atrac3.lastId = 0;
    return Atrac3;
})();
var FactStruct = (function () {
    function FactStruct() {
        this.endSample = 0;
        this.sampleOffset = 0;
    }
    FactStruct.struct = StructClass.create(FactStruct, [
        { endSample: Int32 },
        { sampleOffset: Int32 },
    ]);
    return FactStruct;
})();
var SmplStruct = (function () {
    function SmplStruct() {
        this.unknown = [0, 0, 0, 0, 0, 0, 0];
        this.loopCount = 0;
        this.unknown2 = 0;
    }
    SmplStruct.struct = StructClass.create(SmplStruct, [
        { unknown: StructArray(Int32, 7) },
        { loopCount: Int32 },
        { unknown2: Int32 },
    ]);
    return SmplStruct;
})();
var LoopInfoStruct = (function () {
    function LoopInfoStruct() {
        this.cuePointID = 0;
        this.type = 0;
        this.startSample = 0;
        this.endSample = 0;
        this.fraction = 0;
        this.playCount = 0;
    }
    LoopInfoStruct.struct = StructClass.create(LoopInfoStruct, [
        { cuePointID: Int32 },
        { type: Int32 },
        { startSample: Int32 },
        { endSample: Int32 },
        { fraction: Int32 },
        { playCount: Int32 },
    ]);
    return LoopInfoStruct;
})();
var At3FormatStruct = (function () {
    function At3FormatStruct() {
        this.compressionCode = 0;
        this.atracChannels = 0;
        this.bitrate = 0;
        this.averageBytesPerSecond = 0;
        this.blockAlignment = 0;
        this.bytesPerFrame = 0;
        this.unknown = [0, 0, 0, 0];
        this.omaInfo = 0;
        this._unk2 = 0;
        this._blockSize = 0;
    }
    Object.defineProperty(At3FormatStruct.prototype, "blockSize", {
        get: function () {
            return (this._blockSize & 0x3FF) * 8 + 8;
        },
        enumerable: true,
        configurable: true
    });
    At3FormatStruct.struct = StructClass.create(At3FormatStruct, [
        { compressionCode: UInt16 },
        { atracChannels: UInt16 },
        { bitrate: UInt32 },
        { averageBytesPerSecond: UInt16 },
        { blockAlignment: UInt16 },
        { bytesPerFrame: UInt16 },
        { _unk: UInt16 },
        { unknown: StructArray(UInt32, 6) },
        { _unk2: UInt16_b },
        { _blockSize: UInt16_b },
    ]);
    return At3FormatStruct;
})();
var CodecType;
(function (CodecType) {
    CodecType[CodecType["PSP_MODE_AT_3_PLUS"] = 0x00001000] = "PSP_MODE_AT_3_PLUS";
    CodecType[CodecType["PSP_MODE_AT_3"] = 0x00001001] = "PSP_MODE_AT_3";
})(CodecType || (CodecType = {}));
//# sourceMappingURL=sceAtrac3plus.js.map