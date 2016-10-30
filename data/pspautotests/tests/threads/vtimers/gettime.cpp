#include "shared.h"

inline void testTime(const char *title, SceUID vtimer, s64 expect) {
	s64 t = 0x1337;
	int result = sceKernelGetVTimerTime(vtimer, (SceKernelSysClock *)&t);
	if (result == 0) {
		s64 t_1000 = t / 1000;
		s64 e_1000 = expect / 1000;
		if (t >= 0 && (t_1000 == e_1000 || t_1000 == e_1000 - 1 || t_1000 == e_1000 + 1)) {
			checkpoint("%s: OK", title, t);
		} else {
			checkpoint("%s: Wrong value - %016x", title, t);
		}
	} else {
		checkpoint("%s: Failed (%08x) %016llx", title, result, t);
	}
}

inline void testTimeWide(const char *title, SceUID vtimer, s64 expect) {
	s64 t = sceKernelGetVTimerTimeWide(vtimer);
	s64 t_1000 = t / 1000;
	s64 e_1000 = expect / 1000;
	if (t >= 0 && (t_1000 == e_1000 || t_1000 == e_1000 - 1 || t_1000 == e_1000 + 1)) {
		checkpoint("%s: OK", title, t);
	} else {
		checkpoint("%s: Wrong value - %016llx", title, t);
	}
}

extern "C" int main(int argc, char *argv[]) {
	SceUID vtimer = sceKernelCreateVTimer("test", NULL);

	// Crashes.
	//sceKernelGetVTimerTime(vtimer, NULL);

	checkpointNext("Objects");
	testTime("  Normal", vtimer, 0);
	testTime("  NULL", 0, 0);
	testTime("  Invalid", 0xDEADBEEF, 0);
	sceKernelDeleteVTimer(vtimer);
	testTime("  Deleted", vtimer, 0);

	vtimer = sceKernelCreateVTimer("test", NULL);
	checkpointNext("Running");
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(5000);
	testTime("  After start", vtimer, 5000);
	sceKernelStopVTimer(vtimer);
	testTime("  After stop", vtimer, 5000);

	sceKernelSetVTimerTimeWide(vtimer, 0);
	checkpointNext("Objects (wide)");
	testTimeWide("  Normal", vtimer, 0);
	testTimeWide("  NULL", 0, 0);
	testTimeWide("  Invalid", 0xDEADBEEF, 0);
	sceKernelDeleteVTimer(vtimer);
	testTimeWide("  Deleted", vtimer, 0);

	vtimer = sceKernelCreateVTimer("test", NULL);
	checkpointNext("Running (wide)");
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(5000);
	testTimeWide("  After start", vtimer, 5000);
	sceKernelStopVTimer(vtimer);
	testTimeWide("  After stop", vtimer, 5000);

	sceKernelDeleteVTimer(vtimer);
	return 0;
}
