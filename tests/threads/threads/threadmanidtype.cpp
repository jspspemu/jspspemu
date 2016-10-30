#include <common.h>
#include <pspthreadman.h>
#include <pspmodulemgr.h>
#include <pspsysmem.h>

int dormantThreadFunc(SceSize args, void *argp) {
	return 0;
}

int sleepThreadFunc(SceSize args, void *argp) {
	sceKernelSleepThread();
	return 0;
}

int delayThreadFunc(SceSize args, void *argp) {
	sceKernelDelayThread(1000000);
	return 0;
}

int suspendThreadFunc(SceSize args, void *argp) {
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Threads:");
	SceUID thread = sceKernelCreateThread("dormant", dormantThreadFunc, 0x1F, 0x1000, 0, NULL);
	checkpoint("  Dormant thread: %08x", sceKernelGetThreadmanIdType(thread));
	sceKernelTerminateDeleteThread(thread);

	thread = sceKernelCreateThread("sleeping", sleepThreadFunc, 0x1F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	checkpoint("  Sleeping thread: %08x", sceKernelGetThreadmanIdType(thread));
	sceKernelTerminateDeleteThread(thread);

	thread = sceKernelCreateThread("delaying", delayThreadFunc, 0x1F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	checkpoint("  Delaying thread: %08x", sceKernelGetThreadmanIdType(thread));
	sceKernelTerminateDeleteThread(thread);

	thread = sceKernelCreateThread("suspended", suspendThreadFunc, 0x2F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	sceKernelSuspendThread(thread);
	checkpoint("  Suspended thread: %08x", sceKernelGetThreadmanIdType(thread));
	sceKernelResumeThread(thread);
	sceKernelTerminateDeleteThread(thread);

	checkpoint("  Deleted thread: %08x", sceKernelGetThreadmanIdType(thread));

	checkpointNext("Special values:");
	checkpoint("  -1: %08x", sceKernelGetThreadmanIdType(-1));
	checkpoint("  0: %08x", sceKernelGetThreadmanIdType(0));
	checkpoint("  1: %08x", sceKernelGetThreadmanIdType(1));

	checkpointNext("Other types:");
	SceUID pmb = sceKernelAllocPartitionMemory(2, "TEST", PSP_SMEM_Low, 0x100, NULL);
	checkpoint("  PartitionMemoryBlock: %08x", sceKernelGetThreadmanIdType(pmb));
	sceKernelFreePartitionMemory(pmb);
	SceUID mod = sceKernelLoadModule("threadmanidtype.prx", 0, NULL);
	checkpoint("  Module: %08x", sceKernelGetThreadmanIdType(mod));
	sceKernelUnloadModule(mod);

	return 0;
}