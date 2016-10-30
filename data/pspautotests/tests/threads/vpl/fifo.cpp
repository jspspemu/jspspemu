#include "shared.h"

SceUID vpl;

int thread1(SceSize argc, void *argv) {
	void *data;
	SceUInt t = 200;

	checkpoint("thread1 start");
	int result = sceKernelAllocateVpl(vpl, 0x800, &data, &t);
	checkpoint("thread1 end: %08x", result);

	return 0;
}

int thread2(SceSize argc, void *argv) {
	void *data;
	SceUInt t = 1000;

	checkpoint("thread2 start");
	int result = sceKernelAllocateVpl(vpl, 0x20, &data, &t);
	checkpoint("thread2 end: %08x", result);

	return 0;
}

extern "C" int main(int argc, char **argv) {
	SceUID th1 = sceKernelCreateThread("thread1", &thread1, 0x21, 0x1000, 0, NULL);
	SceUID th2 = sceKernelCreateThread("thread2", &thread2, 0x21, 0x1000, 0, NULL);
	vpl = sceKernelCreateVpl("vpl", PSP_MEMORY_PARTITION_USER, 0, 0x1000 + 0x20, NULL);
	void *data;
	sceKernelAllocateVpl(vpl, 0x800, &data, NULL);
	checkpoint("starting");
	sceKernelStartThread(th1, 0, NULL);
	sceKernelStartThread(th2, 0, NULL);
	checkpoint("waiting");
	sceKernelDelayThread(10000);
	checkpoint("deleting");
	sceKernelDeleteVpl(vpl);
	checkpoint("done, waiting");
	sceKernelDelayThread(10000);

	return 0;
}