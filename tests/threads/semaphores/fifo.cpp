#include "shared.h"

SceUID sema;

int thread1(SceSize argc, void *argv) {
	SceUInt t = 200;

	checkpoint("thread1 start");
	int result = sceKernelWaitSema(sema, 5, &t);
	checkpoint("thread1 end: %08x", result);

	return 0;
}

int thread2(SceSize argc, void *argv) {
	SceUInt t = 1000;

	checkpoint("thread2 start");
	int result = sceKernelWaitSema(sema, 1, &t);
	checkpoint("thread2 end: %08x", result);

	return 0;
}

extern "C" int main(int argc, char **argv) {
	SceUID th1 = sceKernelCreateThread("thread1", &thread1, 0x21, 0x1000, 0, NULL);
	SceUID th2 = sceKernelCreateThread("thread2", &thread2, 0x21, 0x1000, 0, NULL);
	sema = sceKernelCreateSema("vpl", 0, 0, 10, NULL);
	sceKernelSignalSema(sema, 1);
	checkpoint("starting");
	sceKernelStartThread(th1, 0, NULL);
	sceKernelStartThread(th2, 0, NULL);
	checkpoint("waiting");
	sceKernelDelayThread(10000);
	checkpoint("deleting");
	sceKernelDeleteSema(sema);
	checkpoint("done, waiting");
	sceKernelDelayThread(10000);

	return 0;
}