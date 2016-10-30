#include <common.h>
#include <pspkernel.h>
#include <psputility.h>
#include "../sascore/sascore.h"

static const int SAMPLE_COUNT = 16384;

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = { 0 };
__attribute__((aligned(64))) short samples[SAMPLE_COUNT * 2 * 16] = { 0 };

void printSample(int i) {
	schedf("  [%03x] %04x %04x\n", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
}

void testPCMOutput(const char *title, int dry, int wet, int type, short pcmVol, short effectVol, short revVol) {
	__sceSasRevVON(&sasCore, dry, wet);
	__sceSasSetVolume(&sasCore, 0, pcmVol, pcmVol, effectVol, effectVol);
	__sceSasRevEVOL(&sasCore, revVol, revVol);
	__sceSasRevParam(&sasCore, 0, 0);
	__sceSasRevType(&sasCore, type);
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	const int grainSize = 256;
	__sceSasSetGrain(&sasCore, grainSize);
	__sceSasSetOutputmode(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetKeyOn(&sasCore, 0);

	memset(samples, 0xcc, sizeof(samples));

	sceKernelDelayThread(50000);

	bool foundInteresting = false;
	int interestingTimeout = 50;
	while (!foundInteresting && --interestingTimeout > 0) {
		__sceSasCore(&sasCore, samples);
		for (int i = 0; i < grainSize; ++i) {
			if (samples[i] != 0 && samples[i] != 0x4000) {
				foundInteresting = true;
				break;
			}
		}
	}

	for (int off = grainSize; off < SAMPLE_COUNT; off += grainSize) {
		__sceSasCore(&sasCore, samples + off * 2);
	}

	double deltaSquared = 0.0;
	for (int i = 0; i < SAMPLE_COUNT; i += 2) {
		deltaSquared += (s16)samples[i * 2] * (s16)samples[i * 2];
	}

	double rms = sqrt(deltaSquared / (double)(SAMPLE_COUNT / 2));
	double rmsRatio = rms / 16384.0;
	if (rmsRatio >= 0.98 && rmsRatio <= 1.02) {
		checkpoint("%s: root mean is near 1x input", title);
	} else if (rmsRatio >= 1.96 && rmsRatio <= 2.04) {
		checkpoint("%s: root mean is near 2x input", title);
	} else {
		checkpoint("%s: root mean is not near 1x or 2x input", title);
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	for (size_t i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = 0;
	}

	for (size_t i = 0; i < 256; ++i) {
		pcm[i] = 16384;
	}

	checkpointNext("Deltas at full vol");
	testPCMOutput("  OFF", 1, 1, PSP_SAS_EFFECT_TYPE_OFF, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ROOM", 1, 1, PSP_SAS_EFFECT_TYPE_ROOM, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK1", 1, 1, PSP_SAS_EFFECT_TYPE_UNK1, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK2", 1, 1, PSP_SAS_EFFECT_TYPE_UNK2, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK3", 1, 1, PSP_SAS_EFFECT_TYPE_UNK3, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  HALL", 1, 1, PSP_SAS_EFFECT_TYPE_HALL, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  SPACE", 1, 1, PSP_SAS_EFFECT_TYPE_SPACE, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ECHO", 1, 1, PSP_SAS_EFFECT_TYPE_ECHO, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  DELAY", 1, 1, PSP_SAS_EFFECT_TYPE_DELAY, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  PIPE", 1, 1, PSP_SAS_EFFECT_TYPE_PIPE, 0x1000, 0x1000, 0x1000);

	checkpointNext("Deltas with dry=0");
	testPCMOutput("  OFF", 0, 1, PSP_SAS_EFFECT_TYPE_OFF, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ROOM", 0, 1, PSP_SAS_EFFECT_TYPE_ROOM, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK1", 0, 1, PSP_SAS_EFFECT_TYPE_UNK1, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK2", 0, 1, PSP_SAS_EFFECT_TYPE_UNK2, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK3", 0, 1, PSP_SAS_EFFECT_TYPE_UNK3, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  HALL", 0, 1, PSP_SAS_EFFECT_TYPE_HALL, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  SPACE", 0, 1, PSP_SAS_EFFECT_TYPE_SPACE, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ECHO", 0, 1, PSP_SAS_EFFECT_TYPE_ECHO, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  DELAY", 0, 1, PSP_SAS_EFFECT_TYPE_DELAY, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  PIPE", 0, 1, PSP_SAS_EFFECT_TYPE_PIPE, 0x1000, 0x1000, 0x1000);

	checkpointNext("Deltas with mainVol=0");
	testPCMOutput("  OFF", 1, 1, PSP_SAS_EFFECT_TYPE_OFF, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  ROOM", 1, 1, PSP_SAS_EFFECT_TYPE_ROOM, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  UNK1", 1, 1, PSP_SAS_EFFECT_TYPE_UNK1, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  UNK2", 1, 1, PSP_SAS_EFFECT_TYPE_UNK2, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  UNK3", 1, 1, PSP_SAS_EFFECT_TYPE_UNK3, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  HALL", 1, 1, PSP_SAS_EFFECT_TYPE_HALL, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  SPACE", 1, 1, PSP_SAS_EFFECT_TYPE_SPACE, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  ECHO", 1, 1, PSP_SAS_EFFECT_TYPE_ECHO, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  DELAY", 1, 1, PSP_SAS_EFFECT_TYPE_DELAY, 0x0000, 0x1000, 0x1000);
	testPCMOutput("  PIPE", 1, 1, PSP_SAS_EFFECT_TYPE_PIPE, 0x0000, 0x1000, 0x1000);

	checkpointNext("Deltas with wet=0");
	testPCMOutput("  OFF", 1, 0, PSP_SAS_EFFECT_TYPE_OFF, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ROOM", 1, 0, PSP_SAS_EFFECT_TYPE_ROOM, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK1", 1, 0, PSP_SAS_EFFECT_TYPE_UNK1, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK2", 1, 0, PSP_SAS_EFFECT_TYPE_UNK2, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  UNK3", 1, 0, PSP_SAS_EFFECT_TYPE_UNK3, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  HALL", 1, 0, PSP_SAS_EFFECT_TYPE_HALL, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  SPACE", 1, 0, PSP_SAS_EFFECT_TYPE_SPACE, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  ECHO", 1, 0, PSP_SAS_EFFECT_TYPE_ECHO, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  DELAY", 1, 0, PSP_SAS_EFFECT_TYPE_DELAY, 0x1000, 0x1000, 0x1000);
	testPCMOutput("  PIPE", 1, 0, PSP_SAS_EFFECT_TYPE_PIPE, 0x1000, 0x1000, 0x1000);

	checkpointNext("Deltas with effectVol=0");
	testPCMOutput("  OFF", 1, 1, PSP_SAS_EFFECT_TYPE_OFF, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  ROOM", 1, 1, PSP_SAS_EFFECT_TYPE_ROOM, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  UNK1", 1, 1, PSP_SAS_EFFECT_TYPE_UNK1, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  UNK2", 1, 1, PSP_SAS_EFFECT_TYPE_UNK2, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  UNK3", 1, 1, PSP_SAS_EFFECT_TYPE_UNK3, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  HALL", 1, 1, PSP_SAS_EFFECT_TYPE_HALL, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  SPACE", 1, 1, PSP_SAS_EFFECT_TYPE_SPACE, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  ECHO", 1, 1, PSP_SAS_EFFECT_TYPE_ECHO, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  DELAY", 1, 1, PSP_SAS_EFFECT_TYPE_DELAY, 0x1000, 0x0000, 0x1000);
	testPCMOutput("  PIPE", 1, 1, PSP_SAS_EFFECT_TYPE_PIPE, 0x1000, 0x0000, 0x1000);

	checkpointNext("Deltas with reverbVol=0");
	testPCMOutput("  OFF", 1, 1, PSP_SAS_EFFECT_TYPE_OFF, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  ROOM", 1, 1, PSP_SAS_EFFECT_TYPE_ROOM, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  UNK1", 1, 1, PSP_SAS_EFFECT_TYPE_UNK1, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  UNK2", 1, 1, PSP_SAS_EFFECT_TYPE_UNK2, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  UNK3", 1, 1, PSP_SAS_EFFECT_TYPE_UNK3, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  HALL", 1, 1, PSP_SAS_EFFECT_TYPE_HALL, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  SPACE", 1, 1, PSP_SAS_EFFECT_TYPE_SPACE, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  ECHO", 1, 1, PSP_SAS_EFFECT_TYPE_ECHO, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  DELAY", 1, 1, PSP_SAS_EFFECT_TYPE_DELAY, 0x1000, 0x1000, 0x0000);
	testPCMOutput("  PIPE", 1, 1, PSP_SAS_EFFECT_TYPE_PIPE, 0x1000, 0x1000, 0x0000);

	return 0;
}