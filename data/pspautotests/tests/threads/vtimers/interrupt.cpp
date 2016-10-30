#include "shared.h"

SceUID vtimer;
bool intrRan = false;

extern "C" void interruptFunc(int no, void *arg) {
	SceKernelVTimerInfo info;
	info.size = sizeof(info);

	if (intrRan) {
		return;
	}
	intrRan = true;
	checkpoint("  ** Inside interrupt");

	checkpoint("sceKernelCreateVTimer: %08x", sceKernelCreateVTimer("test", NULL));
	checkpoint("sceKernelSetVTimerTimeWide: %016llx", sceKernelSetVTimerTimeWide(vtimer, 0));
	checkpoint("sceKernelGetVTimerBaseWide: %016llx", sceKernelGetVTimerBaseWide(vtimer));
	checkpoint("sceKernelGetVTimerTimeWide: %016llx", sceKernelGetVTimerTimeWide(vtimer));
	checkpoint("sceKernelStartVTimer: %08x", sceKernelStartVTimer(vtimer));
	checkpoint("sceKernelStopVTimer: %08x", sceKernelStopVTimer(vtimer));
	checkpoint("sceKernelSetVTimerHandler: %08x", sceKernelSetVTimerHandler(vtimer, NULL, NULL, NULL));
	checkpoint("sceKernelCancelVTimerHandler: %08x", sceKernelCancelVTimerHandler(vtimer));
	checkpoint("sceKernelReferVTimerStatus: %08x", sceKernelReferVTimerStatus(vtimer, &info));
	checkpoint("sceKernelDeleteVTimer 0: %08x", sceKernelDeleteVTimer(0));
	checkpoint("sceKernelDeleteVTimer: %08x", sceKernelDeleteVTimer(vtimer));
}

extern "C" int main(int argc, char *argv[]) {
	SceKernelVTimerInfo info;
	info.size = sizeof(info);

	vtimer = sceKernelCreateVTimer("test", NULL);

	checkpointNext("Inside interrupt:");
	checkpoint("sceKernelRegisterSubIntrHandler 1: %08x", sceKernelRegisterSubIntrHandler(PSP_VBLANK_INT, 1, (void *)interruptFunc, NULL));
	checkpoint("sceKernelEnableSubIntr: %08x", sceKernelEnableSubIntr(PSP_VBLANK_INT, 1));
	checkpoint("sceKernelDelayThread: %08x", sceKernelDelayThread(30000));
	checkpoint("sceKernelDisableSubIntr: %08x", sceKernelDisableSubIntr(PSP_VBLANK_INT, 1));
	checkpoint("sceKernelReleaseSubIntrHandler: %08x", sceKernelReleaseSubIntrHandler(PSP_VBLANK_INT, 1));

	sceKernelSetVTimerTimeWide(vtimer, 0);
	checkpointNext("Interrupts disabled:");
	int flag = sceKernelCpuSuspendIntr();
	SceUID vtimer2 = sceKernelCreateVTimer("test", NULL);
	checkpoint("sceKernelCreateVTimer: %08x", vtimer2 >= 0 ? 0x1337 : vtimer2);
	checkpoint("sceKernelSetVTimerTimeWide: %016llx", sceKernelSetVTimerTimeWide(vtimer, 0));
	checkpoint("sceKernelGetVTimerBaseWide: %016llx", sceKernelGetVTimerBaseWide(vtimer));
	checkpoint("sceKernelGetVTimerTimeWide: %016llx", sceKernelGetVTimerTimeWide(vtimer));
	checkpoint("sceKernelStartVTimer: %08x", sceKernelStartVTimer(vtimer));
	checkpoint("sceKernelStopVTimer: %08x", sceKernelStopVTimer(vtimer));
	checkpoint("sceKernelSetVTimerHandler: %08x", sceKernelSetVTimerHandler(vtimer, NULL, NULL, NULL));
	checkpoint("sceKernelCancelVTimerHandler: %08x", sceKernelCancelVTimerHandler(vtimer));
	checkpoint("sceKernelReferVTimerStatus: %08x", sceKernelReferVTimerStatus(vtimer, &info));
	checkpoint("sceKernelDeleteVTimer 0: %08x", sceKernelDeleteVTimer(0));
	checkpoint("sceKernelDeleteVTimer: %08x", sceKernelDeleteVTimer(vtimer));
	sceKernelCpuResumeIntr(flag);

	sceKernelDeleteVTimer(vtimer);
	return 0;
}