///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _audio = require('../../core/audio');
var _vag = require('../../format/vag');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var Sample = _audio.Sample;
var VagSoundSource = _vag.VagSoundSource;
var PSP_SAS_VOL_MAX = 0x1000;
var PSP_SAS_PITCH_MIN = 0x1;
var PSP_SAS_PITCH_BASE = 0x1000;
var PSP_SAS_PITCH_MAX = 0x4000;
var sceSasCore = (function () {
    function sceSasCore(context) {
        var _this = this;
        this.context = context;
        this.core = new SasCore();
        this.__sceSasInit = createNativeFunction(0x42778A9F, 150, 'uint', 'int/int/int/int/int', this, function (sasCorePointer, grainSamples, maxVoices, outputMode, sampleRate) {
            if (sampleRate != 44100) {
                return 2151809028 /* ERROR_SAS_INVALID_SAMPLE_RATE */;
            }
            //CheckGrains(GrainSamples);
            if (maxVoices < 1 || maxVoices > sceSasCore.PSP_SAS_VOICES_MAX) {
                return 2151809026 /* ERROR_SAS_INVALID_MAX_VOICES */;
            }
            if (outputMode != 0 /* STEREO */ && outputMode != 1 /* MULTICHANNEL */) {
                return 2151809027 /* ERROR_SAS_INVALID_OUTPUT_MODE */;
            }
            //var SasCore = GetSasCore(SasCorePointer, CreateIfNotExists: true);
            _this.core.grainSamples = grainSamples;
            _this.core.maxVoices = maxVoices;
            _this.core.outputMode = outputMode;
            _this.core.sampleRate = sampleRate;
            _this.core.initialized = true;
            //BufferTemp = new StereoIntSoundSample[SasCore.GrainSamples * 2];
            //BufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
            //MixBufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
            return 0;
        });
        this.__sceSasSetGrain = createNativeFunction(0xD1E0A01E, 150, 'uint', 'int/int', this, function (sasCorePointer, grainSamples) {
            _this.core.grainSamples = grainSamples;
            return 0;
        });
        this.__sceSasSetOutputmode = createNativeFunction(0xE855BF76, 150, 'uint', 'int/int', this, function (sasCorePointer, outputMode) {
            _this.core.outputMode = outputMode;
            return 0;
        });
        this.__sceSasSetVoice = createNativeFunction(0x99944089, 150, 'uint', 'int/int/byte[]/int', this, function (sasCorePointer, voiceId, data, loop) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (data == null) {
                voice.unsetSource();
                return 0;
            }
            if (data.length == 0)
                throw (new SceKernelException(2151809044 /* ERROR_SAS_INVALID_ADPCM_SIZE */));
            if (data.length < 0x10)
                throw (new SceKernelException(2151809044 /* ERROR_SAS_INVALID_ADPCM_SIZE */));
            if (data.length % 0x10)
                throw (new SceKernelException(2151809044 /* ERROR_SAS_INVALID_ADPCM_SIZE */));
            if (data == Stream.INVALID)
                throw (new SceKernelException(2151809040 /* ERROR_SAS_INVALID_VOICE */));
            if (loop != 0 && loop != 1)
                throw (new SceKernelException(2151809045 /* ERROR_SAS_INVALID_LOOP_POS */));
            if (data == null) {
                voice.unsetSource();
            }
            else {
                voice.setAdpcm(data, loop);
            }
            return 0;
        });
        this.__sceSasSetVoicePCM = createNativeFunction(0xE1CD9561, 150, 'uint', 'int/int/byte[]/int', this, function (sasCorePointer, voiceId, data, loop) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (data == null) {
                voice.unsetSource();
            }
            else {
                voice.setPCM(data, loop);
            }
            return 0;
        });
        this.__sceSasCoreWithMix = createNativeFunction(0x50A14DFC, 150, 'uint', 'int/void*/int/int', this, function (sasCorePointer, sasOut, leftVolume, rightVolume) {
            return _this.core.mix(sasCorePointer, sasOut, leftVolume, rightVolume);
        });
        this.__sceSasCore = createNativeFunction(0xA3589D81, 150, 'uint', 'int/void*', this, function (sasCorePointer, sasOut) {
            return _this.core.mix(sasCorePointer, sasOut, PSP_SAS_VOL_MAX, PSP_SAS_VOL_MAX);
        });
        this.__sceSasGetEndFlag = createNativeFunction(0x68A46B95, 150, 'uint', 'int', this, function (sasCorePointer) {
            return _this.core.endFlags;
        });
        this.__sceSasRevType = createNativeFunction(0x33D4AB37, 150, 'uint', 'int/int', this, function (sasCorePointer, waveformEffectType) {
            _this.core.waveformEffectType = waveformEffectType;
            return 0;
        });
        this.__sceSasRevVON = createNativeFunction(0xF983B186, 150, 'uint', 'int/int/int', this, function (sasCorePointer, waveformEffectIsDry, waveformEffectIsWet) {
            _this.core.waveformEffectIsDry = waveformEffectIsDry;
            _this.core.waveformEffectIsWet = waveformEffectIsWet;
            return 0;
        });
        this.__sceSasRevEVOL = createNativeFunction(0xD5A229C9, 150, 'uint', 'int/int/int', this, function (sasCorePointer, leftVolume, rightVolume) {
            _this.core.leftVolume = leftVolume;
            _this.core.rightVolume = rightVolume;
            return 0;
        });
        this.__sceSasSetADSR = createNativeFunction(0x019B25EB, 150, 'uint', 'int/int/int/int/int/int/int', this, function (sasCorePointer, voiceId, flags, attackRate, decayRate, sustainRate, releaseRate) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (flags & AdsrFlags.HasAttack)
                voice.envelope.attackRate = attackRate;
            if (flags & AdsrFlags.HasDecay)
                voice.envelope.decayRate = decayRate;
            if (flags & AdsrFlags.HasSustain)
                voice.envelope.sustainRate = sustainRate;
            if (flags & AdsrFlags.HasRelease)
                voice.envelope.releaseRate = releaseRate;
            return 0;
        });
        this.__sceSasSetADSRmode = createNativeFunction(0x9EC3676A, 150, 'uint', 'int/int/int/int/int/int/int', this, function (sasCorePointer, voiceId, flags, attackCurveMode, decayCurveMode, sustainCurveMode, releaseCurveMode) {
            console.warn('__sceSasSetADSRmode not implemented!');
            return 0;
        });
        this.__sceSasSetKeyOff = createNativeFunction(0xA0CF2FA4, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (!voice.paused)
                return 2151809046 /* ERROR_SAS_VOICE_PAUSED */;
            voice.setOn(false);
            return 0;
        });
        this.__sceSasSetKeyOn = createNativeFunction(0x76F01ACA, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            voice.setOn(true);
            return 0;
        });
        this.__sceSasGetEnvelopeHeight = createNativeFunction(0x74AE582A, 150, 'uint', 'int/int', this, function (sasCorePointer, voiceId) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            return voice.envelope.height;
        });
        this.__sceSasSetSL = createNativeFunction(0x5F9529F6, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, sustainLevel) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            voice.sustainLevel = sustainLevel;
            return 0;
        });
        this.__sceSasSetPause = createNativeFunction(0x787D04D5, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceBits, pause) {
            _this.core.voices.forEach(function (voice) {
                if (voiceBits & (1 << voice.index)) {
                    voice.paused = pause;
                }
            });
            return 0;
        });
        this.__sceSasGetPauseFlag = createNativeFunction(0x2C8E6AB3, 150, 'uint', 'int', this, function (sasCorePointer) {
            var voiceBits = 0;
            _this.core.voices.forEach(function (voice) {
                voiceBits |= (voice.paused ? 1 : 0) << voice.index;
            });
            return voiceBits;
        });
        this.__sceSasGetAllEnvelopeHeights = createNativeFunction(0x07F58C24, 150, 'uint', 'int/void*', this, function (sasCorePointer, heightPtr) {
            _this.core.voices.forEach(function (voice) {
                heightPtr.writeInt32(voice.envelope.height);
            });
            return 0;
        });
        this.__sceSasSetNoise = createNativeFunction(0xB7660A23, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, noiseFrequency) {
            if (noiseFrequency < 0 || noiseFrequency >= 64)
                return 2151809041 /* ERROR_SAS_INVALID_NOISE_CLOCK */;
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            return 0;
        });
        this.__sceSasSetVolume = createNativeFunction(0x440CA7D8, 150, 'uint', 'int/int/int/int/int/int', this, function (sasCorePointer, voiceId, leftVolume, rightVolume, effectLeftVol, effectRightVol) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            leftVolume = Math.abs(leftVolume);
            rightVolume = Math.abs(rightVolume);
            effectLeftVol = Math.abs(effectLeftVol);
            effectRightVol = Math.abs(effectRightVol);
            if (leftVolume > PSP_SAS_VOL_MAX || rightVolume > PSP_SAS_VOL_MAX || effectLeftVol > PSP_SAS_VOL_MAX || effectRightVol > PSP_SAS_VOL_MAX) {
                throw (new SceKernelException(2151809048 /* ERROR_SAS_INVALID_VOLUME_VAL */));
            }
            voice.leftVolume = leftVolume;
            voice.rightVolume = rightVolume;
            voice.effectLeftVolume = effectLeftVol;
            voice.effectRightVolume = effectRightVol;
            return 0;
        });
        this.__sceSasSetPitch = createNativeFunction(0xAD84D37F, 150, 'uint', 'int/int/int', this, function (sasCorePointer, voiceId, pitch) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            if (pitch < PSP_SAS_PITCH_MIN || pitch > PSP_SAS_PITCH_MAX)
                return -1;
            voice.pitch = pitch;
            return 0;
        });
        this.__sceSasRevParam = createNativeFunction(0x267A6DD2, 150, 'uint', 'int/int/int', this, function (sasCorePointer, delay, feedback) {
            _this.core.delay = delay;
            _this.core.feedback = feedback;
            // Not implemented
            return 0;
        });
        this.__sceSasSetSimpleADSR = createNativeFunction(0xCBCD4F79, 150, 'uint', 'int/int/int/int', this, function (sasCorePointer, voiceId, env1Bitfield, env2Bitfield) {
            var voice = _this.getSasCoreVoice(sasCorePointer, voiceId);
            return 0;
        });
    }
    sceSasCore.prototype.getSasCoreVoice = function (sasCorePointer, voiceId) {
        var voice = this.core.voices[voiceId];
        if (!voice)
            throw (new SceKernelException(2151809040 /* ERROR_SAS_INVALID_VOICE */));
        return voice;
    };
    sceSasCore.PSP_SAS_VOICES_MAX = 32;
    sceSasCore.PSP_SAS_GRAIN_SAMPLES = 256;
    sceSasCore.PSP_SAS_LOOP_MODE_OFF = 0;
    sceSasCore.PSP_SAS_LOOP_MODE_ON = 1;
    sceSasCore.PSP_SAS_NOISE_FREQ_MAX = 0x3F;
    sceSasCore.PSP_SAS_ENVELOPE_HEIGHT_MAX = 0x40000000;
    sceSasCore.PSP_SAS_ENVELOPE_FREQ_MAX = 0x7FFFFFFF;
    sceSasCore.PSP_SAS_ADSR_ATTACK = 1;
    sceSasCore.PSP_SAS_ADSR_DECAY = 2;
    sceSasCore.PSP_SAS_ADSR_SUSTAIN = 4;
    sceSasCore.PSP_SAS_ADSR_RELEASE = 8;
    return sceSasCore;
})();
exports.sceSasCore = sceSasCore;
var SasCore = (function () {
    function SasCore() {
        this.initialized = false;
        this.grainSamples = 0;
        this.maxVoices = 32;
        this.outputMode = 0 /* STEREO */;
        this.sampleRate = 44100;
        this.delay = 0;
        this.feedback = 0;
        this.endFlags = 0;
        this.waveformEffectType = -1 /* OFF */;
        this.waveformEffectIsDry = false;
        this.waveformEffectIsWet = false;
        this.leftVolume = PSP_SAS_VOL_MAX;
        this.rightVolume = PSP_SAS_VOL_MAX;
        this.voices = [];
        this.bufferTempArray = [];
        while (this.voices.length < 32)
            this.voices.push(new Voice(this.voices.length));
    }
    SasCore.prototype.mix = function (sasCorePointer, sasOut, leftVolume, rightVolume) {
        while (this.bufferTempArray.length < this.grainSamples)
            this.bufferTempArray.push(new Sample(0, 0));
        var numberOfChannels = (this.outputMode == 0 /* STEREO */) ? 2 : 1;
        var numberOfSamples = this.grainSamples;
        var numberOfVoicesPlaying = Math.max(1, this.voices.count(function (Voice) { return Voice.onAndPlaying; }));
        for (var n = 0; n < numberOfSamples; n++)
            this.bufferTempArray[n].set(0, 0);
        var prevPosDiv = -1;
        for (var n = 0; n < this.voices.length; n++) {
            var voice = this.voices[n];
            if (!voice.onAndPlaying)
                continue;
            //var sampleLeftSum = 0, sampleRightSum = 0;
            //var sampleLeftMax = 0, sampleRightMax = 0;
            //var sampleCount = 0;
            var pos = 0;
            while (true) {
                if ((voice.source != null) && (voice.source.hasMore)) {
                    var posDiv = Math.floor(pos / voice.pitch);
                    if (posDiv >= numberOfSamples)
                        break;
                    var sample = voice.source.getNextSample();
                    for (var m = prevPosDiv + 1; m <= posDiv; m++) {
                        //sampleLeftSum += voice.leftVolume;
                        //sampleRightSum += voice.rightVolume;
                        //
                        //sampleLeftMax = Math.max(sampleLeftMax, Math.abs(voice.leftVolume));
                        //sampleRightMax = Math.max(sampleRightMax, Math.abs(voice.rightVolume));
                        //
                        //sampleCount++;
                        this.bufferTempArray[m].addScaled(sample, voice.leftVolume / PSP_SAS_VOL_MAX, voice.rightVolume / PSP_SAS_VOL_MAX);
                    }
                    prevPosDiv = posDiv;
                    pos += PSP_SAS_PITCH_BASE;
                }
                else {
                    voice.setPlaying(false);
                    break;
                }
            }
        }
        for (var n = 0; n < numberOfSamples; n++) {
            var sample = this.bufferTempArray[n];
            sample.scale(leftVolume / PSP_SAS_VOL_MAX, rightVolume / PSP_SAS_VOL_MAX);
            if (numberOfChannels >= 1)
                sasOut.writeInt16(MathUtils.clamp(sample.left, -32768, 32767));
            if (numberOfChannels >= 2)
                sasOut.writeInt16(MathUtils.clamp(sample.right, -32768, 32767));
        }
        return 0;
    };
    return SasCore;
})();
var Voice = (function () {
    function Voice(index) {
        this.index = index;
        this.envelope = new Envelope();
        this.sustainLevel = 0;
        this.on = false;
        this.playing = false;
        this.paused = false;
        this.leftVolume = PSP_SAS_VOL_MAX;
        this.rightVolume = PSP_SAS_VOL_MAX;
        this.effectLeftVolume = PSP_SAS_VOL_MAX;
        this.effectRightVolume = PSP_SAS_VOL_MAX;
        this.pitch = PSP_SAS_PITCH_BASE;
        this.source = null;
    }
    Object.defineProperty(Voice.prototype, "onAndPlaying", {
        get: function () {
            return this.on && this.playing;
        },
        enumerable: true,
        configurable: true
    });
    Voice.prototype.setOn = function (set) {
        this.on = set;
        this.setPlaying(set);
    };
    Voice.prototype.setPlaying = function (set) {
        this.playing = set;
        // CHECK. Reset on change?
        if (this.source)
            this.source.reset();
    };
    Object.defineProperty(Voice.prototype, "ended", {
        get: function () {
            return !this.playing;
        },
        enumerable: true,
        configurable: true
    });
    Voice.prototype.unsetSource = function () {
        this.source = null;
    };
    Voice.prototype.setAdpcm = function (stream, loopCount) {
        this.source = new VagSoundSource(stream, loopCount);
        this.source.reset();
    };
    Voice.prototype.setPCM = function (stream, loopCount) {
        this.source = new PcmSoundSource(stream, loopCount);
        this.source.reset();
    };
    return Voice;
})();
var PcmSoundSource = (function () {
    function PcmSoundSource(stream, loopCount) {
    }
    PcmSoundSource.prototype.reset = function () {
    };
    Object.defineProperty(PcmSoundSource.prototype, "hasMore", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    PcmSoundSource.prototype.getNextSample = function () {
        return null;
    };
    return PcmSoundSource;
})();
var Envelope = (function () {
    function Envelope() {
        this.attackRate = 0;
        this.decayRate = 0;
        this.sustainRate = 0;
        this.releaseRate = 0;
        this.height = 0;
    }
    return Envelope;
})();
var OutputMode;
(function (OutputMode) {
    OutputMode[OutputMode["STEREO"] = 0] = "STEREO";
    OutputMode[OutputMode["MULTICHANNEL"] = 1] = "MULTICHANNEL";
})(OutputMode || (OutputMode = {}));
var WaveformEffectType;
(function (WaveformEffectType) {
    WaveformEffectType[WaveformEffectType["OFF"] = -1] = "OFF";
    WaveformEffectType[WaveformEffectType["ROOM"] = 0] = "ROOM";
    WaveformEffectType[WaveformEffectType["UNK1"] = 1] = "UNK1";
    WaveformEffectType[WaveformEffectType["UNK2"] = 2] = "UNK2";
    WaveformEffectType[WaveformEffectType["UNK3"] = 3] = "UNK3";
    WaveformEffectType[WaveformEffectType["HALL"] = 4] = "HALL";
    WaveformEffectType[WaveformEffectType["SPACE"] = 5] = "SPACE";
    WaveformEffectType[WaveformEffectType["ECHO"] = 6] = "ECHO";
    WaveformEffectType[WaveformEffectType["DELAY"] = 7] = "DELAY";
    WaveformEffectType[WaveformEffectType["PIPE"] = 8] = "PIPE";
})(WaveformEffectType || (WaveformEffectType = {}));
var AdsrCurveMode;
(function (AdsrCurveMode) {
    AdsrCurveMode[AdsrCurveMode["LINEAR_INCREASE"] = 0] = "LINEAR_INCREASE";
    AdsrCurveMode[AdsrCurveMode["LINEAR_DECREASE"] = 1] = "LINEAR_DECREASE";
    AdsrCurveMode[AdsrCurveMode["LINEAR_BENT"] = 2] = "LINEAR_BENT";
    AdsrCurveMode[AdsrCurveMode["EXPONENT_REV"] = 3] = "EXPONENT_REV";
    AdsrCurveMode[AdsrCurveMode["EXPONENT"] = 4] = "EXPONENT";
    AdsrCurveMode[AdsrCurveMode["DIRECT"] = 5] = "DIRECT";
})(AdsrCurveMode || (AdsrCurveMode = {}));
var AdsrFlags;
(function (AdsrFlags) {
    AdsrFlags[AdsrFlags["HasAttack"] = (1 << 0)] = "HasAttack";
    AdsrFlags[AdsrFlags["HasDecay"] = (1 << 1)] = "HasDecay";
    AdsrFlags[AdsrFlags["HasSustain"] = (1 << 2)] = "HasSustain";
    AdsrFlags[AdsrFlags["HasRelease"] = (1 << 3)] = "HasRelease";
})(AdsrFlags || (AdsrFlags = {}));
//# sourceMappingURL=sceSasCore.js.map