#include <common.h>
#include <pspthreadman.h>

void testUSec2SysClock(const char *title, unsigned int usec) {
	u64 t = -0x1337LL;
	int result = sceKernelUSec2SysClock(usec, (SceKernelSysClock *) &t);
	checkpoint("%s: %08x, %016llx", title, result, t);
}

void testUSec2SysClockWide(const char *title, unsigned int usec) {
	u64 t = sceKernelUSec2SysClockWide(usec);
	checkpoint("%s: %016llx", title, t);
}

void testSysClock2USec(const char *title, u64 t, bool doHigh = true, bool doLow = true) {
	unsigned int res[4];
	memset(res, 0xCC, sizeof(res));
	int result = sceKernelSysClock2USec((SceKernelSysClock *) &t, doHigh ? &res[0] : NULL, doLow ? &res[2] : NULL);
	checkpoint("%s: %08x, %08x%08x %08x%08x", title, result, res[0], res[2], res[1], res[3]);
}

void testSysClock2USecWide(const char *title, u64 t, bool doHigh = true, bool doLow = true) {
	unsigned int res[4];
	memset(res, 0xCC, sizeof(res));
	int result = sceKernelSysClock2USecWide(t, doHigh ? &res[0] : NULL, doLow ? &res[2] : NULL);
	checkpoint("%s: %08x, %08x%08x %08x%08x", title, result, res[0], res[2], res[1], res[3]);
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("sceKernelUSec2SysClock");
	testUSec2SysClock("  Zero", 0);
	testUSec2SysClock("  0x1337", 0x1337);
	testUSec2SysClock("  -1", -1);
	// Crashes.
	//sceKernelUSec2SysClock(0, NULL);

	checkpointNext("sceKernelUSec2SysClockWide");
	testUSec2SysClockWide("  Zero", 0);
	testUSec2SysClockWide("  0x1337", 0x1337);
	testUSec2SysClockWide("  -1", -1);

	checkpointNext("sceKernelSysClock2USec");
	u64 t = 0x1337;
	// Crashes.
	//sceKernelSysClock2USec(NULL, NULL, NULL);
	//sceKernelSysClock2USec((SceKernelSysClock *) &t, NULL, NULL);
	testSysClock2USec("  Zero", 0);
	testSysClock2USec("  0x1337", 0x1337);
	testSysClock2USec("  -1", -1);
	testSysClock2USec("  Low only", 0x1337, false, true);
	testSysClock2USec("  High only", 0x1337, true, false);

	checkpointNext("sceKernelSysClock2USecWide");
	// Crashes.
	//sceKernelSysClock2USecWide(t, NULL, NULL);
	testSysClock2USecWide("  Zero", 0);
	testSysClock2USecWide("  0x1337", 0x1337);
	testSysClock2USecWide("  -1", -1);
	testSysClock2USecWide("  Low only", 0x1337, false, true);
	testSysClock2USecWide("  High only", 0x1337, true, false);

	return 0;
}