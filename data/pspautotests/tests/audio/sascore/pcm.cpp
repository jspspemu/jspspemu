#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testSetVoicePCM(SasCore *sasCore, int v, void *addr, int size, int loop, const char *title) {
	int result = __sceSasSetVoicePCM(sasCore, v, addr, size, loop);
	if (result < 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, result);
	}
}

void printSample(int i) {
	schedf("  [%03x] %04x %04x\n", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
}

void testPCMOutput(int loopPos) {
	memset(samples, 0xdd, sizeof(samples));

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	char temp[64];
	snprintf(temp, sizeof(temp), "Output with loop at %d:", loopPos);
	checkpointNext(temp);
	__sceSasSetGrain(&sasCore, 512);
	__sceSasSetOutputmode(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, loopPos);
	__sceSasSetKeyOn(&sasCore, 0);
	memset(samples, 0xdd, sizeof(samples));
	__sceSasCore(&sasCore, samples);
	printSample(0x0020);
	printSample(0x011E);
	printSample(0x0120);
	checkpoint("  Ended: %08x", __sceSasGetEndFlag(&sasCore));
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	for (int i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = (short)(65535 - i);
	}

	checkpointNext("Voices:");
	testSetVoicePCM(&sasCore, 0, pcm, 0x100, 0, "Normal");
	testSetVoicePCM(&sasCore, -1, pcm, 0x100, 0, "Voice -1");
	testSetVoicePCM(&sasCore, 32, pcm, 0x100, 0, "Voice 32");

	checkpointNext("Addresses:");
	testSetVoicePCM(&sasCore, 0, 0, 0x100, 0, "Zero");
	testSetVoicePCM(&sasCore, 0, pcm, 0x100, 0, "Valid");

	checkpointNext("Sizes:");
	static const int sizes[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 255, 256, 257, 0x10000, 0x10001, 0x20000, 0x40000};
	for (int i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Size %d", sizes[i]);
		testSetVoicePCM(&sasCore, 0, pcm, sizes[i], 0, temp);
	}

	checkpointNext("Loop start pos:");
	static const int loops[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 255, 256, 257, 0x10000, 0x10001, 0x10000000, 0x40000001, 0x80000001};
	for (int i = 0; i < ARRAY_SIZE(loops); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Loop pos %d / 256", loops[i]);
		testSetVoicePCM(&sasCore, 0, pcm, 0x100, loops[i], temp);
	}
	testSetVoicePCM(&sasCore, 0, pcm, 1, 1, "  Loop pos 1 / 1");
	testSetVoicePCM(&sasCore, 0, pcm, 1, 2, "  Loop pos 2 / 1");
	testSetVoicePCM(&sasCore, 0, pcm, 0x10000, 0xFFFF, "  Loop pos 0xFFFF / 0x10000");
	testSetVoicePCM(&sasCore, 0, pcm, 0x10000, 0x10000, "  Loop pos 0x10000 / 0x10000");

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testSetVoicePCM(&sasCore, 0, pcm, 0x100, 1, "  Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testSetVoicePCM(&sasCore, 0, pcm, 0x100, 1, "  While paused");
	checkpoint("  Still paused: %08x", __sceSasGetPauseFlag(&sasCore));
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("  Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("  Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testSetVoicePCM(&sasCore, 0, pcm, 0x100, 1, "  After processing");
	checkpoint("  Still playing: %08x", __sceSasGetEndFlag(&sasCore));
	
	// TODO: Do we want to emulate the resampling exactly?
	testPCMOutput(0);
	testPCMOutput(254);
	testPCMOutput(-1);

	return 0;
}
