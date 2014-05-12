import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceSasCore {
	private static PSP_SAS_VOICES_MAX = 32;
	private static PSP_SAS_GRAIN_SAMPLES = 256;
	private static PSP_SAS_VOL_MAX = 0x1000;
	private static PSP_SAS_LOOP_MODE_OFF = 0;
	private static PSP_SAS_LOOP_MODE_ON = 1;
	private static PSP_SAS_PITCH_MIN = 0x1;
	private static PSP_SAS_PITCH_BASE = 0x1000;
	private static PSP_SAS_PITCH_MAX = 0x4000;
	private static PSP_SAS_NOISE_FREQ_MAX = 0x3F;
	private static PSP_SAS_ENVELOPE_HEIGHT_MAX = 0x40000000;
	private static PSP_SAS_ENVELOPE_FREQ_MAX = 0x7FFFFFFF;
	private static PSP_SAS_ADSR_ATTACK = 1;
	private static PSP_SAS_ADSR_DECAY = 2;
	private static PSP_SAS_ADSR_SUSTAIN = 4;
	private static PSP_SAS_ADSR_RELEASE = 8;

	private voices: Voice[] = [];

	constructor(private context: _context.EmulatorContext) {
		while (this.voices.length < 32) this.voices.push(new Voice(this.voices.length));
	}

	__sceSasInit = createNativeFunction(0x42778A9F, 150, 'uint', 'int/int/int/int/int', this, (sasCorePointer: number, grainSamples: number, maxVoices: number, outputMode: number, sampleRate: number) => {
		if (sampleRate != 44100) {
			return SceKernelErrors.ERROR_SAS_INVALID_SAMPLE_RATE;
		}

		//CheckGrains(GrainSamples);

		if (maxVoices < 1 || maxVoices > sceSasCore.PSP_SAS_VOICES_MAX) {
			return SceKernelErrors.ERROR_SAS_INVALID_MAX_VOICES;
		}

		if (outputMode != OutputMode.STEREO && outputMode != OutputMode.MULTICHANNEL) {
			return SceKernelErrors.ERROR_SAS_INVALID_OUTPUT_MODE;
		}

		/*
		var SasCore = GetSasCore(SasCorePointer, CreateIfNotExists: true);
		SasCore.Initialized = true;
		SasCore.GrainSamples = GrainSamples;
		SasCore.MaxVoices = MaxVoices;
		SasCore.OutputMode = OutputMode;
		SasCore.SampleRate = SampleRate;

		BufferTemp = new StereoIntSoundSample[SasCore.GrainSamples * 2];
		BufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
		MixBufferShort = new StereoShortSoundSample[SasCore.GrainSamples * 2];
		*/

		return 0;
	});

	__sceSasCore = createNativeFunction(0xA3589D81, 150, 'uint', 'int/void*', this, (sasCorePointer: number, sasOut: Stream) => {
		//return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
		return 0;
	});

	__sceSasGetEndFlag = createNativeFunction(0x68A46B95, 150, 'uint', 'int', this, (sasCorePointer: number) => {
		//return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
		return 0;
	});

	__sceSasRevType = createNativeFunction(0x33D4AB37, 150, 'uint', 'int/int', this, (sasCorePointer: number, waveformEffectType: WaveformEffectType) => {
		//return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
		return 0;
	});

	__sceSasRevVON = createNativeFunction(0xF983B186, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, waveformEffectIsDry: boolean, waveformEffectIsWet: boolean) => {
		//return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
		return 0;
	});

	__sceSasRevEVOL = createNativeFunction(0xD5A229C9, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, leftVolume: number, rightVolume: number) => {
		//return __sceSasCore_Internal(GetSasCore(SasCorePointer), SasOut, null, 0x1000, 0x1000);
		return 0;
	});

	private getSasCoreVoice(sasCorePointer: number, voiceId: number) {
		var voice = this.voices[voiceId];
		if (!voice) throw (new SceKernelException(SceKernelErrors.ERROR_SAS_INVALID_VOICE));
		return voice;
	}

	__sceSasSetADSR = createNativeFunction(0x019B25EB, 150, 'uint', 'int/int/int/int/int/int/int', this, (sasCorePointer: number, voiceId: number, flags: AdsrFlags, attackRate: number, decayRate: number, sustainRate: number, releaseRate: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);

		if (flags & AdsrFlags.HasAttack) voice.envelope.attackRate = attackRate;
		if (flags & AdsrFlags.HasDecay) voice.envelope.decayRate = decayRate;
		if (flags & AdsrFlags.HasSustain) voice.envelope.sustainRate = sustainRate;
		if (flags & AdsrFlags.HasRelease) voice.envelope.releaseRate = releaseRate;

		return 0;
	});

	__sceSasSetADSRmode = createNativeFunction(0x9EC3676A, 150, 'uint', 'int/int/int/int/int/int/int', this, (sasCorePointer: number, voiceId: number, flags: AdsrFlags, attackCurveMode: AdsrCurveMode, decayCurveMode: AdsrCurveMode, sustainCurveMode: AdsrCurveMode, releaseCurveMode: AdsrCurveMode) => {
		console.warn('__sceSasSetADSRmode not implemented!');
		return 0;
	});

	__sceSasSetKeyOff = createNativeFunction(0xA0CF2FA4, 150, 'uint', 'int/int', this, (sasCorePointer: number, voiceId: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		if (!voice.pause) return SceKernelErrors.ERROR_SAS_VOICE_PAUSED;
		voice.on = false;
		return 0;
	});

	__sceSasSetKeyOn = createNativeFunction(0x76F01ACA, 150, 'uint', 'int/int', this, (sasCorePointer: number, voiceId: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		voice.on = true;
		return 0;
	});

	__sceSasSetVoicePCM = createNativeFunction(0xE1CD9561, 150, 'uint', 'int/int', this, (sasCorePointer: number, voiceId: number) => {
		console.warn('__sceSasSetVoicePCM not implemented!');
		return 0;
	});

	__sceSasGetEnvelopeHeight = createNativeFunction(0x74AE582A, 150, 'uint', 'int/int', this, (sasCorePointer: number, voiceId: number) => {
		return this.getSasCoreVoice(sasCorePointer, voiceId).envelope.height;
	});

	__sceSasSetSL = createNativeFunction(0x5F9529F6, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceId: number, sustainLevel: number) => {
		this.getSasCoreVoice(sasCorePointer, voiceId).sustainLevel = sustainLevel;
		return 0;
	});

	__sceSasSetPause = createNativeFunction(0x787D04D5, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceBits: number, pause: boolean) => {
		this.voices.forEach((voice) => {
			if (voiceBits & (1 << voice.index)) {
				voice.pause = pause;
			}
		});
		return 0;
	});

	__sceSasGetPauseFlag = createNativeFunction(0x2C8E6AB3, 150, 'uint', 'int', this, (sasCorePointer: number) => {
		var voiceBits = 0;
		this.voices.forEach((voice) => {
			voiceBits |= (voice.pause ? 1 : 0) << voice.index;
		});
		return voiceBits;
	});

	__sceSasGetAllEnvelopeHeights = createNativeFunction(0x07F58C24, 150, 'uint', 'int/void*', this, (sasCorePointer: number, heightPtr: Stream) => {
		this.voices.forEach((voice) => {
			heightPtr.writeInt32(voice.envelope.height);
		});
		return 0;
	});

	__sceSasSetNoise = createNativeFunction(0xB7660A23, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceId: number, noiseFrequency: number) => {
		if (noiseFrequency < 0 || noiseFrequency >= 64) return SceKernelErrors.ERROR_SAS_INVALID_NOISE_CLOCK;
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		return 0;
	});

	__sceSasSetVolume = createNativeFunction(0x440CA7D8, 150, 'uint', 'int/int/int/int/int/int', this, (sasCorePointer: number, voiceId: number, leftVolume: number, rightVolume: number, effectLeftVol: number, effectRightVol: number) => {
		return 0;
	});

	__sceSasSetPitch = createNativeFunction(0xAD84D37F, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceId: number, pitch: number) => {
		return 0;
	});

	__sceSasSetVoice = createNativeFunction(0x99944089, 150, 'uint', 'int/int/byte[]/int', this, (sasCorePointer: number, voiceId: number, vagPointer: Stream, loopCount: number) => {
		// Not implemented
		return 0;
	});
}

class Envelope {
	attackRate = 0;
	decayRate = 0;
	sustainRate = 0;
	releaseRate = 0;
	height = 0;
}

class Voice {
	envelope = new Envelope();
	sustainLevel = 0;
	on = false;
	pause = false;

	constructor(public index: number) {
	}
}

enum OutputMode
{
	STEREO = 0,
	MULTICHANNEL = 1,
}

enum WaveformEffectType
{
	OFF = -1,
	ROOM = 0,
	UNK1 = 1,
	UNK2 = 2,
	UNK3 = 3,
	HALL = 4,
	SPACE = 5,
	ECHO = 6,
	DELAY = 7,
	PIPE = 8,
}


enum AdsrFlags {
	HasAttack = (1 << 0),
	HasDecay = (1 << 1),
	HasSustain = (1 << 2),
	HasRelease = (1 << 3),
}

enum AdsrCurveMode
{
	LINEAR_INCREASE = 0,
	LINEAR_DECREASE = 1,
	LINEAR_BENT = 2,
	EXPONENT_REV = 3,
	EXPONENT = 4,
	DIRECT = 5,
}