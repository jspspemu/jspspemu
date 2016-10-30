#include "shared.h"

inline void testFree(const char *title, SceUID tlspl) {
	int result = sceKernelFreeTlspl(tlspl);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: OK ", title);
		schedfTlspl(tlspl);
	} else {
		checkpoint(NULL);
		schedf("%s: Failed (%08x) ", title, result);
		schedfTlspl(tlspl);
	}
}

int threadFunc(SceSize args, void *argp) {
	SceUID uid = *(SceUID *)argp;
	void *temp = sceKernelGetTlsAddr(uid);
	checkpoint("  Thread obtained tls: %08x", temp);
	sceKernelSleepThread();
	checkpoint("  Thread quiting without free");
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	SceUID tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x10, 8, NULL);
	void *temp = sceKernelGetTlsAddr(tls);

	checkpointNext("Objects:");
	testFree("  Normal", tls);
	testFree("  Twice", tls);
	testFree("  NULL", 0);
	testFree("  Invalid", 0xDEADBEEF);
	sceKernelDeleteTlspl(tls);
	testFree("  Deleted", tls);

	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, 1, NULL);
	temp = sceKernelGetTlsAddr(tls);
	checkpointNext("Threads:");
	{
		TlsplWaitThread wait1("waiting thread", tls);
		testFree("  With waiting thread", tls);
	}
	{
		TlsplWaitThread wait1("holding thread", tls);
		testFree("  With holding thread", tls);
	}

	checkpointNext("Clearing:");
	temp = sceKernelGetTlsAddr(tls);
	memset(temp, 0xCC, 0x100);
	checkpoint("  Before free: %08x", *(u32 *)temp);
	sceKernelFreeTlspl(tls);
	checkpoint("  After free: %08x", *(u32 *)temp);
	// There's only one block, so we must get the same one.
	memset(temp, 0xCC, 0x100);
	temp = sceKernelGetTlsAddr(tls);
	checkpoint("  After allocate: %08x", *(u32 *)temp);
	sceKernelFreeTlspl(tls);

	checkpointNext("Auto free:");
	SceUID threadID = sceKernelCreateThread("no free", &threadFunc, 0x20, 0x1000, 0, NULL);
	const void *arg[1] = { (void *)tls };
	sceKernelStartThread(threadID, sizeof(arg), arg);
	sceKernelDelayThread(1000);
	checkpoint(NULL);
	schedf("  While thread running: ");
	schedfTlspl(tls);
	sceKernelWakeupThread(threadID);
	sceKernelDelayThread(1000);
	checkpoint(NULL);
	schedf("  After thread exit: ");
	schedfTlspl(tls);

	sceKernelDeleteTlspl(tls);
	return 0;
}
