#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testSetNoise(SasCore *sasCore, int v, int freq, const char *title) {
	int result = __sceSasSetNoise(sasCore, v, freq);
	if (result < 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, result);
	}
}

void schedfBits(u16 v) {
	for (int j = 0; j < 16; ++j) {
		int b = (v & (1 << j)) ? 1 : 0;
		schedf("%d", b);
	}
}

void testNoiseOutput() {
	memset(pcm, 0x11, sizeof(pcm));
	memset(samples, 0xdd, sizeof(samples));

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	checkpointNext("Values (freq 63):");
	__sceSasSetNoise(&sasCore, 0, 63);
	__sceSasSetKeyOn(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	// TODO: There's definitely a pattern.
	// Higher frequencies introduce new bits / shift faster.
	// Seems to introduce a new bit every (0x00004000 >> (freq / 4)) / 4, or so.
	// Probably gets the bits from some source, not sure.
	u16 last;
	for (int i = 0; i < 256; ++i) {
		schedf("[%02x] %04x %04x  ", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
		schedfBits(samples[i * 2 + 0]);
		schedf(" ");
		schedfBits(samples[i * 2 + 1]);

		if (i > 0) {
			schedf("\n                ");
			schedfBits(samples[i * 2 - 2] << 1);
			schedf(" ");
			schedfBits(samples[i * 2 - 0] << 1);
		}
		schedf("\n");
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	memset(pcm, 0xCC, sizeof(pcm));

	checkpointNext("After init:");
	testSetNoise(&sasCore, 0, 1, "Normal");
	testSetNoise(&sasCore, -1, 1, "Voice -1");
	testSetNoise(&sasCore, 32, 1, "Voice 32");

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testSetNoise(&sasCore, 0, 1, "Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testSetNoise(&sasCore, 0, 1, "While paused");
	checkpoint("Still paused: %08x", __sceSasGetPauseFlag(&sasCore));
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testSetNoise(&sasCore, 0, 1, "After processing");
	checkpoint("Still playing: %08x", __sceSasGetEndFlag(&sasCore));

	checkpointNext("Frequencies:");
	static const int freqs[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 31, 32, 33, 63, 64, 128, 256, 441, 44100};
	for (size_t i = 0; i < ARRAY_SIZE(freqs); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Freq %d", freqs[i]);
		testSetNoise(&sasCore, 0, freqs[i], temp);
	}

	// TODO
	//testNoiseOutput();

	return 0;
}
