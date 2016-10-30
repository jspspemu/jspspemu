#include "shared.h"

SceUID vtimer;

inline void testCancel(const char *title, SceUID vtimer) {
	int result = sceKernelCancelVTimerHandler(vtimer);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: OK ", title);
	} else {
		checkpoint(NULL);
		schedf("%s: Failed (%08x) ", title, result);
	}
	schedfVTimer(vtimer);
}

SceUInt basicHandler(SceUID uid, SceInt64 scheduled, SceInt64 actual, void *common) {
	return 100;
}

SceUInt cancelHandler(SceUID uid, SceKernelSysClock *scheduled, SceKernelSysClock *actual, void *common) {
	checkpoint("Inside handler, cancel timer: %08x", sceKernelCancelVTimerHandler(vtimer));
	checkpoint("Inside handler, cancel NULL: %08x", sceKernelCancelVTimerHandler(0));
	return 0;
}

SceUInt zeroHandler(SceUID uid, SceInt64 scheduled, SceInt64 actual, void *common) {
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	vtimer = sceKernelCreateVTimer("cancel", NULL);

	testCancel("Normal", vtimer);
	testCancel("Twice", vtimer);
	testCancel("NULL", 0);
	testCancel("Invalid", 0xDEADBEEF);
	sceKernelDeleteVTimer(vtimer);
	testCancel("Deleted", vtimer);

	vtimer = sceKernelCreateVTimer("delete", NULL);
	sceKernelStartVTimer(vtimer);
	testCancel("Started", vtimer);

	sceKernelSetVTimerHandlerWide(vtimer, 1, &basicHandler, (void *)0xABCD1337);
	testCancel("With handler", vtimer);

	SceKernelSysClock t = {1, 0};
	sceKernelSetVTimerHandler(vtimer, &t, &cancelHandler, (void *)0xABCD1337);
	sceKernelDelayThread(1000);
	testCancel("After cancel handler", vtimer);

	sceKernelSetVTimerHandlerWide(vtimer, 1, &zeroHandler, (void *)0xABCD1337);
	sceKernelDelayThread(1000);
	schedfVTimer(vtimer);
	testCancel("After return zero handler", vtimer);

	return 0;
}