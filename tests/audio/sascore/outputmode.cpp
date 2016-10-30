#include <common.h>
#include <psputility.h>
#include "sascore.h"
extern "C" {
#include "sysmem-imports.h"
}

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short mix[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testSetOutputmode(SasCore *sasCore, int v, const char *title) {
	int result = __sceSasSetOutputmode(sasCore, v);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, __sceSasGetOutputmode(sasCore));
	}
}

void printSample(int i) {
	schedf("  [%03x] %04x %04x\n", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
}

void testOutputmode(int mode, bool withMix) {
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	char temp[64];
	snprintf(temp, sizeof(temp), "Output with mode %d%s:", mode, withMix ? " and mix" : "");
	checkpointNext(temp);

	__sceSasRevVON(&sasCore, 1, 1);
	__sceSasRevEVOL(&sasCore, 0, 0);
	__sceSasRevParam(&sasCore, 0, 0);
	__sceSasRevType(&sasCore, PSP_SAS_EFFECT_TYPE_ROOM);

	__sceSasSetVolume(&sasCore, 0, 0x1000, 0x0C00, 0x0800, 0x0400);
	__sceSasSetGrain(&sasCore, 512);
	__sceSasSetOutputmode(&sasCore, mode);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetKeyOn(&sasCore, 0);
	memset(samples, 0xdd, sizeof(samples));
	if (withMix) {
		checkpoint("Core: %08x", __sceSasCoreWithMix(&sasCore, samples, 0, 0));
	} else {
		checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	}
	for (int i = 32; i < 35; ++i) {
		printSample(i);
	}
	for (int i = 32; i < 35; ++i) {
		printSample(i + 256);
	}
	for (int i = 32; i < 35; ++i) {
		printSample(i + 512);
	}
	for (int i = 32; i < 35; ++i) {
		printSample(i + 768);
	}
	checkpoint("  Ended: %08x", __sceSasGetEndFlag(&sasCore));
}

extern "C" int main(int argc, char *argv[]) {
	//sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	for (int i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = (short)(65535 - i);
	}

	checkpointNext("Modes:");
	static const int modes[] = {-1, 0, 1, 2, 3, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(modes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  %d", modes[i]);
		testSetOutputmode(&sasCore, modes[i], temp);
	}

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testSetOutputmode(&sasCore, 0, "  Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testSetOutputmode(&sasCore, 0, "  While paused");
	checkpoint("  Still paused: %08x", __sceSasGetPauseFlag(&sasCore));
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("  Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("  Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testSetOutputmode(&sasCore, 0, "  After processing");
	checkpoint("  Still playing: %08x", __sceSasGetEndFlag(&sasCore));
	
	// TODO: Do we want to emulate the resampling exactly?
	testOutputmode(0, false);
	testOutputmode(1, false);
	testOutputmode(0, true);
	testOutputmode(1, true);

	return 0;
}
