import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

var PSP_SAS_VOL_MAX = 0x1000;
var PSP_SAS_PITCH_MIN = 0x1;
var PSP_SAS_PITCH_BASE = 0x1000;
var PSP_SAS_PITCH_MAX = 0x4000;

export class sceSasCore {
	private static PSP_SAS_VOICES_MAX = 32;
	private static PSP_SAS_GRAIN_SAMPLES = 256;
	private static PSP_SAS_LOOP_MODE_OFF = 0;
	private static PSP_SAS_LOOP_MODE_ON = 1;
	private static PSP_SAS_NOISE_FREQ_MAX = 0x3F;
	private static PSP_SAS_ENVELOPE_HEIGHT_MAX = 0x40000000;
	private static PSP_SAS_ENVELOPE_FREQ_MAX = 0x7FFFFFFF;
	private static PSP_SAS_ADSR_ATTACK = 1;
	private static PSP_SAS_ADSR_DECAY = 2;
	private static PSP_SAS_ADSR_SUSTAIN = 4;
	private static PSP_SAS_ADSR_RELEASE = 8;

	private core = new SasCore();

	constructor(private context: _context.EmulatorContext) {
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

	__sceSasSetVoice = createNativeFunction(0x99944089, 150, 'uint', 'int/int/byte[]/int', this, (sasCorePointer: number, voiceId: number, data: Stream, loopCount: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		if (data == null) {
			voice.unsetSource();
		} else {
			voice.setVag(data, loopCount);
		}
		return 0;
	});

	__sceSasSetVoicePCM = createNativeFunction(0xE1CD9561, 150, 'uint', 'int/int/byte[]/int', this, (sasCorePointer: number, voiceId: number, data: Stream, loopCount: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		if (data == null) {
			voice.unsetSource();
		} else {
			voice.setPCM(data, loopCount);
		}
		return 0;
	});

	__sceSasCoreWithMix = createNativeFunction(0x50A14DFC, 150, 'uint', 'int/void*/int/int', this, (sasCorePointer: number, sasOut: Stream, leftVolume: number, rightVolume: number) => {
		return this.core.mix(sasCorePointer, sasOut, leftVolume, rightVolume);
	});

	__sceSasCore = createNativeFunction(0xA3589D81, 150, 'uint', 'int/void*', this, (sasCorePointer: number, sasOut: Stream) => {
		return this.core.mix(sasCorePointer, sasOut, PSP_SAS_VOL_MAX, PSP_SAS_VOL_MAX);
	});

	__sceSasGetEndFlag = createNativeFunction(0x68A46B95, 150, 'uint', 'int', this, (sasCorePointer: number) => {
		return this.core.endFlags;
	});

	__sceSasRevType = createNativeFunction(0x33D4AB37, 150, 'uint', 'int/int', this, (sasCorePointer: number, waveformEffectType: WaveformEffectType) => {
		this.core.waveformEffectType = waveformEffectType;
		return 0;
	});

	__sceSasRevVON = createNativeFunction(0xF983B186, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, waveformEffectIsDry: boolean, waveformEffectIsWet: boolean) => {
		this.core.waveformEffectIsDry = waveformEffectIsDry;
		this.core.waveformEffectIsWet = waveformEffectIsWet;
		return 0;
	});

	__sceSasRevEVOL = createNativeFunction(0xD5A229C9, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, leftVolume: number, rightVolume: number) => {
		this.core.leftVolume = leftVolume;
		this.core.rightVolume = rightVolume;
		return 0;
	});

	private getSasCoreVoice(sasCorePointer: number, voiceId: number) {
		var voice = this.core.voices[voiceId];
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

	__sceSasGetEnvelopeHeight = createNativeFunction(0x74AE582A, 150, 'uint', 'int/int', this, (sasCorePointer: number, voiceId: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		return voice.envelope.height;
	});

	__sceSasSetSL = createNativeFunction(0x5F9529F6, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceId: number, sustainLevel: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		voice.sustainLevel = sustainLevel;
		return 0;
	});

	__sceSasSetPause = createNativeFunction(0x787D04D5, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceBits: number, pause: boolean) => {
		this.core.voices.forEach((voice) => {
			if (voiceBits & (1 << voice.index)) {
				voice.pause = pause;
			}
		});
		return 0;
	});

	__sceSasGetPauseFlag = createNativeFunction(0x2C8E6AB3, 150, 'uint', 'int', this, (sasCorePointer: number) => {
		var voiceBits = 0;
		this.core.voices.forEach((voice) => {
			voiceBits |= (voice.pause ? 1 : 0) << voice.index;
		});
		return voiceBits;
	});

	__sceSasGetAllEnvelopeHeights = createNativeFunction(0x07F58C24, 150, 'uint', 'int/void*', this, (sasCorePointer: number, heightPtr: Stream) => {
		this.core.voices.forEach((voice) => {
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
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		leftVolume = Math.abs(leftVolume);
		rightVolume = Math.abs(rightVolume);
		effectLeftVol = Math.abs(effectLeftVol);
		effectRightVol = Math.abs(effectRightVol);


		if (leftVolume > PSP_SAS_VOL_MAX || rightVolume > PSP_SAS_VOL_MAX || effectLeftVol > PSP_SAS_VOL_MAX || effectRightVol > PSP_SAS_VOL_MAX) {
			throw (new SceKernelException(SceKernelErrors.ERROR_SAS_INVALID_VOLUME_VAL));
		}

		voice.leftVolume = leftVolume;
		voice.rightVolume = rightVolume;
		voice.effectLeftVolume = effectLeftVol;
		voice.effectRightVolume = effectRightVol;

		return 0;
	});

	__sceSasSetPitch = createNativeFunction(0xAD84D37F, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, voiceId: number, pitch: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		if (pitch < PSP_SAS_PITCH_MIN || pitch > PSP_SAS_PITCH_MAX) return -1;
		voice.pitch = pitch;

		return 0;
	});

	__sceSasRevParam = createNativeFunction(0x267A6DD2, 150, 'uint', 'int/int/int', this, (sasCorePointer: number, delay: number, feedback: number) => {
		this.core.delay = delay;
		this.core.feedback = feedback;
		// Not implemented
		return 0;
	});

	__sceSasSetSimpleADSR = createNativeFunction(0xCBCD4F79, 150, 'uint', 'int/int/int/int', this, (sasCorePointer: number, voiceId: number, env1Bitfield: number, env2Bitfield: number) => {
		var voice = this.getSasCoreVoice(sasCorePointer, voiceId);
		return 0;
	});
}

class SasCore {
	delay = 0;
	feedback = 0;
	endFlags = 0;
	waveformEffectType = WaveformEffectType.OFF;
	waveformEffectIsDry = false;
	waveformEffectIsWet = false;
	leftVolume = PSP_SAS_VOL_MAX;
	rightVolume = PSP_SAS_VOL_MAX;
	voices: Voice[] = [];

	constructor() {
		while (this.voices.length < 32) this.voices.push(new Voice(this.voices.length));
	}

	mix(sasCorePointer: number, sasOut: Stream, leftVolume: number, rightVolume: number) {
		/*
		var NumberOfChannels = (SasCore.OutputMode == OutputMode.PSP_SAS_OUTPUTMODE_STEREO) ? 2 : 1;
		var NumberOfSamples = SasCore.GrainSamples;
		var NumberOfVoicesPlaying = Math.Max(1, SasCore.Voices.Count(Voice => Voice.OnAndPlaying));

		for (var n = 0; n < NumberOfSamples; n++) BufferTempPtr[n] = default(StereoIntSoundSample);

		var PrevPosDiv = -1;
		foreach (var Voice in SasCore.Voices) {
				if (Voice.OnAndPlaying) {
				//Console.WriteLine("Voice.Pitch: {0}", Voice.Pitch);
				//for (int n = 0, Pos = 0; n < NumberOfSamples; n++, Pos += Voice.Pitch)
				var Pos = 0;
				while (true) {
				if ((Voice.Vag != null) && (Voice.Vag.HasMore)) {
				int PosDiv = Pos / Voice.Pitch;

				if (PosDiv >= NumberOfSamples) break;

				var Sample = Voice.Vag.GetNextSample().ApplyVolumes(Voice.LeftVolume, Voice.RightVolume);

				for (int m = PrevPosDiv + 1; m <= PosDiv; m++) BufferTempPtr[m] += Sample;

				PrevPosDiv = PosDiv;
				Pos += PSP_SAS_PITCH_BASE;
				}
				else {
				Voice.SetPlaying(false);
				break;
				}
				}
			}
		}

		for (int n = 0; n < NumberOfSamples; n++) BufferShortPtr[n] = BufferTempPtr[n];

		for (int channel = 0; channel < NumberOfChannels; channel++) {
			for (int n = 0; n < NumberOfSamples; n++) {
				SasOut[n * NumberOfChannels + channel] = BufferShortPtr[n].ApplyVolumes(LeftVolume, RightVolume).GetByIndex(channel);
			}
		}
		*/
		// @TODO
		return 0;
	}
}

interface SoundSource {
}


class Voice {
	envelope = new Envelope();
	sustainLevel = 0;
	on = false;
	pause = false;
	leftVolume = PSP_SAS_VOL_MAX;
	rightVolume = PSP_SAS_VOL_MAX;
	effectLeftVolume = PSP_SAS_VOL_MAX;
	effectRightVolume = PSP_SAS_VOL_MAX;
	pitch = PSP_SAS_PITCH_BASE;
	source: SoundSource = null;

	constructor(public index: number) {
	}

	unsetSource() {
		this.source = null;
	}

	setVag(stream: Stream, loopCount: number) {
		this.source = new VagSoundSource(stream, loopCount);
	}

	setPCM(stream: Stream, loopCount: number) {
		this.source = new PcmSoundSource(stream, loopCount);
	}
}

class VagSoundSource implements SoundSource {
	constructor(stream:Stream, loopCount: number) {
	}
}

class PcmSoundSource implements SoundSource {
	constructor(stream: Stream, loopCount: number) {
	}
}

class Envelope {
	attackRate = 0;
	decayRate = 0;
	sustainRate = 0;
	releaseRate = 0;
	height = 0;
}

enum OutputMode { STEREO = 0, MULTICHANNEL = 1 }
enum WaveformEffectType { OFF = -1, ROOM = 0, UNK1 = 1, UNK2 = 2, UNK3 = 3, HALL = 4, SPACE = 5, ECHO = 6, DELAY = 7, PIPE = 8 }
enum AdsrCurveMode { LINEAR_INCREASE = 0, LINEAR_DECREASE = 1, LINEAR_BENT = 2, EXPONENT_REV = 3, EXPONENT = 4, DIRECT = 5 }

enum AdsrFlags {
	HasAttack = (1 << 0),
	HasDecay = (1 << 1),
	HasSustain = (1 << 2),
	HasRelease = (1 << 3),
}
