#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testGetHeight(SasCore *sasCore, int v, const char *title) {
	int result = __sceSasGetEnvelopeHeight(sasCore, v);
	if (result < 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, result);
	}
}

void testAllHeights(SasCore *sasCore, const char *title, bool valid = true) {
	int heights[64];
	memset(heights, 0xCC, sizeof(heights));

	int result = __sceSasGetAllEnvelopeHeights(sasCore, valid ? heights : 0);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x, %08x, %08x)", title, heights[0], heights[31], heights[32]);
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	memset(pcm, 0xCC, sizeof(pcm));

	checkpointNext("After init:");
	testGetHeight(&sasCore, 0, "Normal");
	testGetHeight(&sasCore, -1, "Voice -1");
	testGetHeight(&sasCore, 32, "Voice 32");

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testGetHeight(&sasCore, 0, "Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testGetHeight(&sasCore, 0, "While paused");
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testGetHeight(&sasCore, 0, "After processing");
	
	checkpointNext("All heights:");
	testAllHeights(&sasCore, "Normal");
	// Crashes.
	//testAllHeights(&sasCore, "Invalid", false);

	return 0;
}
