#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testKeyOn(SasCore *sasCore, int v, const char *title) {
	int result = __sceSasSetKeyOn(sasCore, v);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK", title);
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	memset(pcm, 0xCC, sizeof(pcm));

	checkpointNext("After init:");
	testKeyOn(&sasCore, 0, "Key on without type");
	testKeyOn(&sasCore, 0, "Key on twice");
	testKeyOn(&sasCore, -1, "Voice -1");
	testKeyOn(&sasCore, 32, "Voice 32");

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testKeyOn(&sasCore, 0, "Key on");
	testKeyOn(&sasCore, 0, "Key on twice");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testKeyOn(&sasCore, 0, "While paused");
	__sceSasSetPause(&sasCore, -1, 0);

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	checkpointNext("After core:");
	testKeyOn(&sasCore, 0, "Key on");

	int height = __sceSasGetEnvelopeHeight(&sasCore, 0);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 0));

	return 0;
}
