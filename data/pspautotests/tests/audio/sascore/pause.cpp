#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testPauseVoice(SasCore *sasCore, int bits, int val, const char *title) {
	int result = __sceSasSetPause(sasCore, bits, val);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK -> %08x", title, __sceSasGetPauseFlag(sasCore));
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	memset(pcm, 0xCC, sizeof(pcm));
	
	checkpointNext("After init:");
	testPauseVoice(&sasCore, 1, 1, "Pause without type");
	testPauseVoice(&sasCore, 1, 1, "Pause twice");
	testPauseVoice(&sasCore, 1, 0, "Resume without type");
	testPauseVoice(&sasCore, 1, 0, "Resume twice");
	testPauseVoice(&sasCore, 1, 2, "Pause 2");
	testPauseVoice(&sasCore, 1, -1, "Pause -1");
	testPauseVoice(&sasCore, 1, 0x80000000, "Pause 0x80000000");

	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 0, 7, 0x1000, 0x1000, 0x1000, 0x1000);
	
	checkpointNext("After voice setup:");
	testPauseVoice(&sasCore, 1, 1, "Pause");
	testPauseVoice(&sasCore, 1, 0, "Resume");

	__sceSasSetKeyOn(&sasCore, 0);
	checkpointNext("After key on:");
	testPauseVoice(&sasCore, 1, 1, "Pause");
	testPauseVoice(&sasCore, 1, 0, "Resume");

	__sceSasSetKeyOff(&sasCore, 0);
	checkpointNext("After key off:");
	testPauseVoice(&sasCore, 1, 1, "Pause");
	testPauseVoice(&sasCore, 1, 0, "Resume");

	__sceSasSetKeyOn(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	checkpointNext("After key on and core:");
	testPauseVoice(&sasCore, 1, 1, "Pause");

	int height = __sceSasGetEnvelopeHeight(&sasCore, 0);
	if (height < 0) {
		checkpoint("Height while paused: %08x", height);
	}
	memset(samples, 0xdd, sizeof(samples));
	checkpoint("Core while paused: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x", __sceSasGetEnvelopeHeight(&sasCore, 0) - height);

	testPauseVoice(&sasCore, 1, 0, "Resume");

	return 0;
}