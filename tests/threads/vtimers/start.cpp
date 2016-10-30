#include "shared.h"

int countHits = 0;
SceUInt countHandler(SceUID uid, SceKernelSysClock *scheduled, SceKernelSysClock *actual, void *common) {
	++countHits;
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	SceUID vtimer = sceKernelCreateVTimer("test", NULL);

	checkpointNext("Objects");
	checkpoint("  Normal: %08x", sceKernelStartVTimer(vtimer));
	checkpoint("  Twice: %08x", sceKernelStartVTimer(vtimer));
	checkpoint("  NULL: %08x", sceKernelStartVTimer(0));
	checkpoint("  Invalid: %08x", sceKernelStartVTimer(0xDEADBEEF));
	sceKernelDeleteVTimer(vtimer);
	checkpoint("  Deleted: %08x", sceKernelStartVTimer(vtimer));

	vtimer = sceKernelCreateVTimer("test", NULL);
	checkpointNext("While scheduled");
	sceKernelSetVTimerTimeWide(vtimer, 10000);
	SceKernelSysClock t = {100, 0};
	sceKernelSetVTimerHandler(vtimer, &t, &countHandler, (void *)0x00001337);
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStopVTimer(vtimer);
	checkpoint("  After start: %d", countHits);

	sceKernelDeleteVTimer(vtimer);
	return 0;
}