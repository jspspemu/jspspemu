#include <common.h>
#include <psputility.h>
#include "../sascore/sascore.h"

__attribute__((aligned(64))) SasCore sasCore;

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Initialization:");
	checkpoint("  Load avcodec: %08x", sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC));
	checkpoint("  Load sascore: %08x", sceUtilityLoadModule(PSP_MODULE_AV_SASCORE));
	checkpoint("  Init core: %08x", __sceSasInit(&sasCore, 1024, 32, 1, 44100));

	checkpointNext("Delay parameters:");
	static const int params[] = { -2, -1, 0, 1, 2, 63, 64, 65, 127, 128, 129, 256, 0x1000, 0x80000002 };
	for (size_t i = 0; i < ARRAY_SIZE(params); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevParam delay=%d: %%08x", params[i]);
		checkpoint(temp, __sceSasRevParam(&sasCore, params[i], 0));
	}
	checkpointNext("Feedback parameters:");
	for (size_t i = 0; i < ARRAY_SIZE(params); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevParam feedback=%d: %%08x", params[i]);
		checkpoint(temp, __sceSasRevParam(&sasCore, 0, params[i]));
	}

	checkpointNext("Reverb types:");
	static const int types[] = { -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 64, 127, 128, 129, 0x1000, 0x80000002 };
	for (size_t i = 0; i < ARRAY_SIZE(types); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevType %d: %%08x", types[i]);
		checkpoint(temp, __sceSasRevType(&sasCore, types[i]));
	}

	checkpointNext("Effect volumes:");
	static const int volumes[] = { -2, -1, 0, 1, 2, 64, 128, 0x1000, 0x1001, 0x80000002 };
	for (size_t i = 0; i < ARRAY_SIZE(volumes); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevEVOL %d (left): %%08x", volumes[i]);
		checkpoint(temp, __sceSasRevEVOL(&sasCore, volumes[i], 0));
		snprintf(temp, 128, "  __sceSasRevEVOL %d (right): %%08x", volumes[i]);
		checkpoint(temp, __sceSasRevEVOL(&sasCore, 0, volumes[i]));
	}

	checkpointNext("Dry flags:");
	static const int dryWet[] = { -2, -1, 0, 1, 2, 64, 128, 0x1000, 0x1001, 0x80000002 };
	for (size_t i = 0; i < ARRAY_SIZE(dryWet); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevVON dry=%d: %%08x", dryWet[i]);
		// Observed: on = anything but zero.
		checkpoint(temp, __sceSasRevVON(&sasCore, dryWet[i], 0));
	}
	checkpointNext("Wet flags:");
	for (size_t i = 0; i < ARRAY_SIZE(dryWet); ++i) {
		char temp[128];
		snprintf(temp, 128, "  __sceSasRevVON wet=%d: %%08x", dryWet[i]);
		// Observed: on = anything but zero.
		checkpoint(temp, __sceSasRevVON(&sasCore, 0, dryWet[i]));
	}

	return 0;
}