#include "shared.h"

extern "C" int main(int argc, char *argv[]) {
	SceUID vtimer = sceKernelCreateVTimer("test", NULL);

	checkpointNext("Objects");
	checkpoint("  Normal: %08x", sceKernelStopVTimer(vtimer));
	checkpoint("  Twice: %08x", sceKernelStopVTimer(vtimer));
	checkpoint("  NULL: %08x", sceKernelStopVTimer(0));
	checkpoint("  Invalid: %08x", sceKernelStopVTimer(0xDEADBEEF));
	sceKernelDeleteVTimer(vtimer);
	checkpoint("  Deleted: %08x", sceKernelStopVTimer(vtimer));

	vtimer = sceKernelCreateVTimer("test", NULL);
	checkpointNext("Resetting");

	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStopVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStopVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(1000);
	sceKernelStopVTimer(vtimer);

	checkpoint("  Start/Stop 3 times: %dms", (int)(sceKernelGetVTimerTimeWide(vtimer) / 1000));
	checkpoint("  Base: %lld", sceKernelGetVTimerBaseWide(vtimer));

	sceKernelDeleteVTimer(vtimer);
	return 0;
}