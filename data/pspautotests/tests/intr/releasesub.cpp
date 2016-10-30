#include <common.h>
#include <pspintrman.h>

void handler(int no, int *arg) {
	checkpoint("* handler(%08x, %08x)", no, arg);
}

extern "C" int main(int argc, char *argv[]) {
	int result;

	checkpointNext("sceKernelReleaseSubIntrHandler interrupts:");
	for (int intr = -2; intr < 70; ++intr) {
		sceKernelRegisterSubIntrHandler(intr, 0, (void *)&handler, (void *)0xDEADBEEF);
		result = sceKernelReleaseSubIntrHandler(intr, 0);

		checkpoint("  Interrupt %d: %08x", intr, result);
	}

	checkpointNext("sceKernelReleaseSubIntrHandler sub interrupts:");
	for (int intr = -2; intr < 70; ++intr) {
		sceKernelRegisterSubIntrHandler(30, intr, (void *)&handler, (void *)0xDEADBEEF);
		result = sceKernelReleaseSubIntrHandler(30, intr);

		checkpoint("  Sub interrupt %d: %08x", intr, result);
	}

	checkpointNext("sceKernelReleaseSubIntrHandler handlers:");
	sceKernelRegisterSubIntrHandler(30, 1, NULL, (void *)0xDEADBEEF);
	result = sceKernelReleaseSubIntrHandler(30, 1);
	checkpoint("  NULL handler: %08x", result);
	result = sceKernelReleaseSubIntrHandler(30, 1);
	checkpoint("  Twice NULL: %08x", result);
	sceKernelRegisterSubIntrHandler(30, 1, (void *)&handler, (void *)0xDEADBEEF);
	result = sceKernelReleaseSubIntrHandler(30, 1);
	checkpoint("  Not NULL: %08x", result);
	result = sceKernelReleaseSubIntrHandler(30, 1);
	checkpoint("  Twice not NULL: %08x", result);

	return 0;
}