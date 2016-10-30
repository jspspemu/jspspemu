#include "shared.h"

inline void testBase(const char *title, SceUID vtimer, s64 expect) {
	s64 t = 0x1337;
	int result = sceKernelGetVTimerBase(vtimer, (SceKernelSysClock *)&t);
	if (result == 0) {
		s64 t_1000 = t / 1000;
		s64 e_1000 = expect / 1000;
		if (t >= 0 && (t_1000 == e_1000 || t_1000 == e_1000 - 1 || t_1000 == e_1000 + 1)) {
			checkpoint("%s: OK", title, t);
		} else {
			checkpoint("%s: Wrong value - %016llx", title, t);
		}
	} else {
		checkpoint("%s: Failed (%08x) %016llx", title, result, t);
	}
}

inline void testBaseWide(const char *title, SceUID vtimer, s64 expect) {
	s64 t = sceKernelGetVTimerBaseWide(vtimer);
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
	s64 t;

	// Crashes.
	//sceKernelGetVTimerBase(vtimer, NULL);

	checkpointNext("Objects");
	testBase("  Normal", vtimer, 0);
	testBase("  NULL", 0, 0);
	testBase("  Invalid", 0xDEADBEEF, 0);
	sceKernelDeleteVTimer(vtimer);
	testBase("  Deleted", vtimer, 0);

	vtimer = sceKernelCreateVTimer("test", NULL);
	sceKernelStartVTimer(vtimer);
	t = sceKernelGetSystemTimeWide();

	checkpointNext("Running");
	testBase("  After start", vtimer, t);
	sceKernelStopVTimer(vtimer);
	testBase("  After stop", vtimer, 0);

	checkpointNext("Objects (wide)");
	testBaseWide("  Normal", vtimer, 0);
	testBaseWide("  NULL", 0, 0);
	testBaseWide("  Invalid", 0xDEADBEEF, 0);
	sceKernelDeleteVTimer(vtimer);
	testBaseWide("  Deleted", vtimer, 0);

	vtimer = sceKernelCreateVTimer("test", NULL);
	sceKernelStartVTimer(vtimer);
	t = sceKernelGetSystemTimeWide();

	checkpointNext("Running (wide)");
	testBaseWide("  After start", vtimer, t);
	sceKernelStopVTimer(vtimer);
	testBaseWide("  After stop", vtimer, 0);

	sceKernelDeleteVTimer(vtimer);
	return 0;
}
