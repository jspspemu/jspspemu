#include <common.h>
#include <pspintrman.h>
#include <pspthreadman.h>

void handler(int no, int *arg) {
	checkpoint("* handler(%08x, %08x)", no, arg);
}

extern "C" int main(int argc, char *argv[]) {
	int result;

	sceKernelRegisterSubIntrHandler(30, 1, (void *)&handler, (void *)0xDEADBEEF);

	checkpointNext("sceKernelEnableSubIntr:");
	result = sceKernelEnableSubIntr(70, 1);
	checkpoint("  Invalid intr: %08x", result);
	result = sceKernelEnableSubIntr(30, 70);
	checkpoint("  Invalid subintr: %08x", result);
	result = sceKernelEnableSubIntr(30, 1);
	checkpoint("  Registered: %08x", result);
	result = sceKernelEnableSubIntr(30, 1);
	checkpoint("  Twice: %08x", result);
	result = sceKernelEnableSubIntr(30, 3);
	checkpoint("  Unregistered: %08x", result);
	sceKernelDisableSubIntr(30, 2);
	sceKernelDisableSubIntr(30, 1);

	checkpointNext("Interrupts run when enabled:");

	checkpoint("  With handler first:");
	result = sceKernelEnableSubIntr(30, 1);
	sceKernelDelayThread(17000);
	sceKernelDisableSubIntr(30, 1);

	checkpoint("  With handler after:");
	result = sceKernelEnableSubIntr(30, 2);
	sceKernelRegisterSubIntrHandler(30, 2, (void *)&handler, (void *)0xDEADBEEF);
	sceKernelDelayThread(17000);
	sceKernelDisableSubIntr(30, 2);
	sceKernelReleaseSubIntrHandler(30, 2);

	checkpoint("  Without handler:");
	result = sceKernelEnableSubIntr(30, 3);
	sceKernelDelayThread(17000);
	sceKernelDisableSubIntr(30, 3);

	checkpoint("  Released while enabled:");
	sceKernelRegisterSubIntrHandler(30, 4, (void *)&handler, (void *)0xDEADBEEF);
	result = sceKernelEnableSubIntr(30, 4);
	sceKernelReleaseSubIntrHandler(30, 4);
	sceKernelRegisterSubIntrHandler(30, 4, (void *)&handler, (void *)0xDEADBEEF);
	sceKernelDelayThread(17000);
	sceKernelDisableSubIntr(30, 4);
	sceKernelReleaseSubIntrHandler(30, 4);

	checkpointNext("sceKernelDisableSubIntr:");
	result = sceKernelDisableSubIntr(70, 1);
	checkpoint("  Invalid intr: %08x", result);
	result = sceKernelDisableSubIntr(30, 70);
	checkpoint("  Invalid subintr: %08x", result);
	sceKernelEnableSubIntr(30, 1);
	result = sceKernelDisableSubIntr(30, 1);
	checkpoint("  Registered: %08x", result);
	result = sceKernelDisableSubIntr(30, 1);
	checkpoint("  Twice: %08x", result);
	result = sceKernelDisableSubIntr(30, 3);
	checkpoint("  Unregistered: %08x", result);

	sceKernelReleaseSubIntrHandler(30, 1);

	return 0;
}