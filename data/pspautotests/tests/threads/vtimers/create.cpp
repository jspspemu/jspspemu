#include "shared.h"

inline void createTest(const char *title, const char *name, SceKernelVTimerOptParam *options) {
	SceUID vtimer = sceKernelCreateVTimer(name, options);
	if (vtimer > 0) {
		checkpoint(NULL);
		schedf("%s: ", title);
		schedfVTimer(vtimer);
		sceKernelDeleteVTimer(vtimer);
	} else {
		checkpoint("%s: Failed (%X)", title, vtimer);
	}
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Names:");
	createTest("  NULL", NULL, NULL);
	createTest("  Blank", "", NULL);
	createTest("  Long", "1234567890123456789012345678901234567890123456789012345678901234", NULL);

	SceUID vtimer1 = sceKernelCreateVTimer("create", NULL);
	SceUID vtimer2 = sceKernelCreateVTimer("create", NULL);
	if (vtimer1 > 0 && vtimer2 > 0) {
		checkpoint("  Two with same name: OK");
	} else {
		checkpoint("  Two with same name: Failed (%X, %X)", vtimer1, vtimer2);
	}
	sceKernelDeleteVTimer(vtimer1);
	sceKernelDeleteVTimer(vtimer2);

	checkpointNext("Option sizes:");
	u32 options[1024];
	memset(options, 0, sizeof(options));
	int sizes[] = {-1, 0, 1, 4, 7, 8, 12, 4096, 0x7FFFFFFF};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[32];
		sprintf(temp, "  %d", sizes[i]);
		options[0] = sizes[i];
		createTest(temp, "test", (SceKernelVTimerOptParam *)options);
	}

	checkpointNext("Create 1024");
	SceUID vtimers[1024];
	int result = 0;
	int i;
	for (i = 0; i < 1024; i++)
	{
		vtimers[i] = sceKernelCreateVTimer("create", NULL);
		if (vtimers[i] < 0)
		{
			result = vtimers[i];
			break;
		}
	}

	if (result != 0)
		checkpoint("  Failed at %d (%08X)\n", i, result);
	else
		checkpoint("  OK\n");

	while (--i >= 0)
		sceKernelDeleteVTimer(vtimers[i]);

	return 0;
}