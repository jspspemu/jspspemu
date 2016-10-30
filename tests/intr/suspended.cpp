#include <common.h>
#include <pspintrman.h>

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Not suspended:");
	checkpoint("  0: %08x", sceKernelIsCpuIntrSuspended(0));
	checkpoint("  1: %08x", sceKernelIsCpuIntrSuspended(1));
	checkpoint("  2: %08x", sceKernelIsCpuIntrSuspended(2));
	checkpoint("  0xDEADBEEF: %08x", sceKernelIsCpuIntrSuspended(0xDEADBEEF));

	checkpointNext("Suspended:");
	int flags1 = sceKernelCpuSuspendIntr();
	int flags2 = sceKernelCpuSuspendIntr();
	checkpoint("  0: %08x", sceKernelIsCpuIntrSuspended(0));
	checkpoint("  1: %08x", sceKernelIsCpuIntrSuspended(1));
	checkpoint("  2: %08x", sceKernelIsCpuIntrSuspended(2));
	checkpoint("  0xDEADBEEF: %08x", sceKernelIsCpuIntrSuspended(0xDEADBEEF));
	checkpoint("  flags (inner): %08x", sceKernelIsCpuIntrSuspended(flags2));
	checkpoint("  flags (outer): %08x", sceKernelIsCpuIntrSuspended(flags1));
	sceKernelCpuResumeIntr(flags2);
	sceKernelCpuResumeIntr(flags1);

	return 0;
}