#include <common.h>
#include <pspintrman.h>

void handler(int no, int *arg) {
	checkpoint("* handler(%08x, %08x)", no, arg);
}

extern "C" int main(int argc, char *argv[]) {
	int result;

	checkpointNext("sceKernelRegisterSubIntrHandler interrupts:");
	for (int intr = -2; intr < 70; ++intr) {
		result = sceKernelRegisterSubIntrHandler(intr, 0, (void *)&handler, (void *)0xDEADBEEF);
		sceKernelReleaseSubIntrHandler(intr, 0);

		checkpoint("  Interrupt %d: %08x", intr, result);
	}

	checkpointNext("sceKernelRegisterSubIntrHandler sub interrupts:");
	for (int intr = -2; intr < 70; ++intr) {
		result = sceKernelRegisterSubIntrHandler(30, intr, (void *)&handler, (void *)0xDEADBEEF);
		sceKernelReleaseSubIntrHandler(30, intr);

		checkpoint("  Sub interrupt %d: %08x", intr, result);
	}

	checkpointNext("sceKernelRegisterSubIntrHandler handlers:");
	result = sceKernelRegisterSubIntrHandler(30, 1, NULL, (void *)0xDEADBEEF);
	checkpoint("  NULL handler: %08x", result);
	result = sceKernelRegisterSubIntrHandler(30, 1, NULL, (void *)0xDEADBEEF);
	checkpoint("  Twice NULL: %08x", result);
	result = sceKernelRegisterSubIntrHandler(30, 1, (void *)&handler, (void *)0xDEADBEEF);
	checkpoint("  Twice not NULL: %08x", result);
	result = sceKernelRegisterSubIntrHandler(30, 1, (void *)&handler, (void *)0xDEADBEEF);
	checkpoint("  Again not NULL: %08x", result);
	result = sceKernelRegisterSubIntrHandler(30, 1, NULL, (void *)0xDEADBEEF);
	checkpoint("  NULL afterward: %08x", result);
	sceKernelReleaseSubIntrHandler(30, 1);

	return 0;
}