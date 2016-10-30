#include "shared.h"

extern "C" int main(int argc, char *argv[]) {
	SceUID vtimer = sceKernelCreateVTimer("test", NULL);
	SceKernelVTimerInfo info;
	info.size = sizeof(info);

	checkpointNext("Objects");
	checkpoint("  Normal: %08x", sceKernelReferVTimerStatus(vtimer, &info));
	checkpoint("  Twice: %08x", sceKernelReferVTimerStatus(vtimer, &info));
	checkpoint("  NULL: %08x", sceKernelReferVTimerStatus(0, &info));
	checkpoint("  Invalid: %08x", sceKernelReferVTimerStatus(0xDEADBEEF, &info));
	sceKernelDeleteVTimer(vtimer);
	checkpoint("  Deleted: %08x", sceKernelReferVTimerStatus(vtimer, &info));

	vtimer = sceKernelCreateVTimer("test", NULL);
	checkpointNext("Sizes");
	int sizes[] = {-1, 0, 1, 4, 8, 9, 32, 64, 70, 72, 800};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		memset(&info, 0xCC, sizeof(info));
		info.size = sizes[i];
		int result = sceKernelReferVTimerStatus(vtimer, &info);
		if (result == 0) {
			checkpoint("  size %d => %d, %08x", sizes[i], info.size, info.common);
		} else {
			checkpoint("  size %d: Failed (%08x)", sizes[i], result);
		}
	}

	sceKernelDeleteVTimer(vtimer);
	return 0;
}