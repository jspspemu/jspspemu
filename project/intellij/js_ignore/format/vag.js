///<reference path="../global.d.ts" />
var _audio = require('../core/audio');
var Sample = _audio.Sample;
var VAG_f = [0, 0, 60, 0, 115, -52, 98, -55, 122, -60];
var VagDecoder = (function () {
    function VagDecoder(blockStream, BlockTotalCount) {
        this.blockStream = blockStream;
        this.BlockTotalCount = BlockTotalCount;
        this.decodedBlockSamples = (new Array(VagDecoder.DECOMPRESSED_SAMPLES_IN_BLOCK));
        this.predict1 = 0;
        this.predict2 = 0;
        this.loopStack = [];
        this.currentState = new VagState();
        this.currentLoopCount = 0;
        this.totalLoopCount = 0;
        this.sample = new Sample(0, 0);
        this.reset();
    }
    Object.defineProperty(VagDecoder.prototype, "hasMore", {
        get: function () {
            return !this.reachedEnd;
        },
        enumerable: true,
        configurable: true
    });
    VagDecoder.prototype.reset = function () {
        this.currentState = new VagState();
        this.sampleIndexInBlock = 0;
        this.sampleIndexInBlock2 = 0;
        this.reachedEnd = false;
        this.currentLoopCount = 0;
    };
    VagDecoder.prototype.setLoopCount = function (LoopCount) {
        this.currentLoopCount = 0;
        this.totalLoopCount = LoopCount;
    };
    VagDecoder.prototype.seekNextBlock = function () {
        if (this.reachedEnd || this.currentState.blockIndex >= this.BlockTotalCount) {
            this.reachedEnd = true;
            return;
        }
        this.blockStream.position = this.currentState.blockIndex * 16;
        this.currentState.blockIndex++;
        //var block = VagBlock.struct.read(this.blockStream);
        var block = this.blockStream.readBytes(16);
        switch (block[1]) {
            case 6 /* LOOP_START */:
                var copyState = this.currentState.clone();
                copyState.blockIndex--;
                this.loopStack.push(copyState);
                break;
            case 3 /* LOOP_END */:
                if (this.currentLoopCount++ < this.totalLoopCount) {
                    this.currentState = this.loopStack.pop();
                }
                else {
                    this.loopStack.pop();
                }
                break;
            case 7 /* END */:
                this.reachedEnd = true;
                return;
        }
        this.decodeBlock(block);
    };
    VagDecoder.prototype.getNextSample = function () {
        if (this.reachedEnd)
            return this.sample.set(0, 0);
        this.sampleIndexInBlock %= VagDecoder.DECOMPRESSED_SAMPLES_IN_BLOCK;
        if (this.sampleIndexInBlock == 0) {
            this.seekNextBlock();
        }
        if (this.reachedEnd)
            return this.sample.set(0, 0);
        var value = this.decodedBlockSamples[this.sampleIndexInBlock++];
        return this.sample.set(value, value);
    };
    VagDecoder.prototype.decodeBlock = function (block) {
        var sampleOffset = 0;
        var shiftFactor = BitUtils.extract(block[0], 0, 4);
        var predictIndex = BitUtils.extract(block[0], 4, 4) % VAG_f.length;
        this.predict1 = VAG_f[predictIndex * 2 + 0];
        this.predict2 = VAG_f[predictIndex * 2 + 1];
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
    };
    VagDecoder.prototype.handleSampleKeepHistory = function (unpackedSample) {
        var sample = this.handleSample(unpackedSample);
        this.currentState.history2 = this.currentState.history1;
        this.currentState.history1 = sample;
        return sample;
    };
    VagDecoder.prototype.handleSample = function (unpackedSample) {
        var sample = 0;
        sample += unpackedSample * 1;
        sample += ((this.currentState.history1 * this.predict1) / 64) >> 0; // integer divide by 64
        sample += ((this.currentState.history2 * this.predict2) / 64) >> 0;
        //console.log(unpackedSample, '->', sample, ' : ');
        return MathUtils.clamp(sample, -32768, 32767);
    };
    VagDecoder.COMPRESSED_BYTES_IN_BLOCK = 14;
    VagDecoder.DECOMPRESSED_SAMPLES_IN_BLOCK = VagDecoder.COMPRESSED_BYTES_IN_BLOCK * 2; // 28
    return VagDecoder;
})();
var VagBlockType;
(function (VagBlockType) {
    VagBlockType[VagBlockType["LOOP_END"] = 3] = "LOOP_END";
    VagBlockType[VagBlockType["LOOP_START"] = 6] = "LOOP_START";
    VagBlockType[VagBlockType["END"] = 7] = "END";
})(VagBlockType || (VagBlockType = {}));
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
var VagHeader = (function () {
    function VagHeader() {
    }
    //name: string;
    VagHeader.struct = StructClass.create(VagHeader, [
        { magic: UInt32 },
        { vagVersion: UInt32_b },
        { dataSize: UInt32_b },
        { sampleRate: UInt32_b },
    ]);
    return VagHeader;
})();
var VagSoundSource = (function () {
    function VagSoundSource(stream, loopCount) {
        this.header = null;
        this.samplesCount = 0;
        this.decoder = null;
        if (stream.length < 0x10) {
            this.header = null;
            this.samplesCount = 0;
            this.decoder = new VagDecoder(stream, 0);
        }
        else {
            var headerStream = stream.sliceWithLength(0, VagHeader.struct.length);
            var dataStream = stream.sliceWithLength(VagHeader.struct.length);
            //debugger;
            this.header = VagHeader.struct.read(headerStream);
            this.samplesCount = Math.floor(dataStream.length * 56 / 16);
            this.decoder = new VagDecoder(dataStream, Math.floor(dataStream.length / 16));
        }
    }
    VagSoundSource.prototype.reset = function () {
        this.decoder.reset();
    };
    Object.defineProperty(VagSoundSource.prototype, "hasMore", {
        get: function () {
            return this.decoder.hasMore;
        },
        enumerable: true,
        configurable: true
    });
    VagSoundSource.prototype.getNextSample = function () {
        return this.decoder.getNextSample();
    };
    return VagSoundSource;
})();
exports.VagSoundSource = VagSoundSource;
var VagState = (function () {
    function VagState(blockIndex, history1, history2) {
        if (blockIndex === void 0) { blockIndex = 0; }
        if (history1 === void 0) { history1 = 0; }
        if (history2 === void 0) { history2 = 0; }
        this.blockIndex = blockIndex;
        this.history1 = history1;
        this.history2 = history2;
    }
    VagState.prototype.clone = function () {
        return new VagState(this.blockIndex, this.history1, this.history2);
    };
    return VagState;
})();
//# sourceMappingURL=vag.js.map