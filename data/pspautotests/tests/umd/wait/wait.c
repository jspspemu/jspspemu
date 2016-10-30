#include <common.h>

#include <pspsdk.h>
#include <pspkernel.h>
#include <pspdisplay.h>
#include <pspthreadman.h>
#include <psploadexec.h>
#include <pspumd.h>
#include <psprtc.h>

static volatile int needsCancel = 0;
static int testResult;
static int otherCB = 0;

#define TEST_NAMED_RES(name, func, args...) \
	sceKernelNotifyCallback(otherCB, 1); \
	testResult = func(args); \
	checkpoint("%s: %08X", name, testResult); \
	/* Give the drive time to do its thing. */ \
	sceKernelDelayThread(2000);

#define TEST_RES(func, args...) TEST_NAMED_RES(#func, func, args)

int umdHandler(int unknown, int info, void *arg)
{
	checkpoint("  * umdHandler called: %08X, %08X, %08X", (uint)unknown, (uint)info, (uint)arg);
	return 0;
}

int umdHandler2(int unknown, int info, void *arg)
{
	checkpoint("  * umdHandler2 called: %08X, %08X, %08X", (uint)unknown, (uint)info, (uint)arg);
	return 0;
}

int otherHandler(int unknown, int info, void *arg)
{
	checkpoint("  * otherHandler called: %08X, %08X, %08X", (uint)unknown, (uint)info, (uint)arg);
	return 0;
}

int testThread(SceSize argc, void* argv)
{
	while (1)
	{
		sceKernelRotateThreadReadyQueue(sceKernelGetThreadCurrentPriority());
		if (needsCancel)
		{
			needsCancel = 0;
			checkpoint("sceUmdCancelWaitDriveStat: %08x", sceUmdCancelWaitDriveStat());
		}
	}
	return 0;
}

int main(int argc, char **argv) {
	printf("WARNING: Test cannot run without a UMD in the PSP.\n\n");

	int param = 0x1234;
	otherCB = sceKernelCreateCallback("otherHandler", otherHandler, (void *)param);
	SceUID cb = sceKernelCreateCallback("umdHandler", umdHandler, (void *)param);
	SceUID cb2 = sceKernelCreateCallback("umdHandler2", umdHandler2, (void *)param);

	SceUID thread = sceKernelCreateThread("preempt", &testThread, sceKernelGetThreadCurrentPriority(), 0x500, 0, NULL);
	sceKernelStartThread(thread, 0, 0);

	TEST_RES(sceUmdRegisterUMDCallBack, cb);
	TEST_RES(sceUmdRegisterUMDCallBack, cb2);
	TEST_RES(sceUmdUnRegisterUMDCallBack, -1);
	TEST_RES(sceUmdCheckMedium);
	TEST_RES(sceUmdActivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStat, 0x02);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	TEST_RES(sceKernelCheckCallback);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	//TEST_RES(sceUmdGetDriveStat);
	TEST_RES(sceUmdWaitDriveStatCB, 0x20, 10000);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatWithTimer, 0x20, 10000);
	TEST_RES(sceUmdActivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatWithTimer, 0x20, 10000);
	TEST_RES(sceKernelCheckCallback);
	TEST_RES(sceUmdUnRegisterUMDCallBack, cb);
	checkpoint("sceUmdUnRegisterUMDCallBack: %s", sceUmdUnRegisterUMDCallBack(cb2) == cb2 ? "OK" : "Failed");
	TEST_RES(sceUmdUnRegisterUMDCallBack, cb2);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	//TEST_RES(sceUmdGetDriveStat);
	TEST_RES(sceUmdWaitDriveStatCB, 0x20, 10000);
	//TEST_RES(sceUmdWaitDriveStatCB, 0x10, 10000);
	TEST_RES(sceUmdWaitDriveStatCB, 0xFF, 10000);
	TEST_RES(sceUmdWaitDriveStatCB, 0xFF, 10000);
	TEST_RES(sceUmdWaitDriveStatCB, 0xFF, 10000);
	TEST_RES(sceUmdWaitDriveStatCB, 0xFF, 10000);
	TEST_RES(sceUmdWaitDriveStatCB, 0xFF, 10000);

	needsCancel = 1;
	TEST_RES(sceUmdWaitDriveStat, 0x20);

	sceKernelTerminateDeleteThread(thread);
	sceKernelDelayThread(300);

	checkpointNext("SDK version");
	sceUmdRegisterUMDCallBack(cb2);

	checkpoint("sceKernelSetCompiledSdkVersion 0: %08x", sceKernelSetCompiledSdkVersion(0));

	TEST_RES(sceUmdActivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatWithTimer, 0x32, 10000);
	TEST_RES(sceUmdGetDriveStat);
	TEST_RES(sceKernelCheckCallback);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatCB, 0x10, 10000);

	checkpoint("sceKernelSetCompiledSdkVersion 1: %08x", sceKernelSetCompiledSdkVersion(1));

	TEST_RES(sceUmdActivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatWithTimer, 0x32, 10000);
	TEST_RES(sceUmdGetDriveStat);
	TEST_RES(sceKernelCheckCallback);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatCB, 0x10, 10000);

	checkpoint("sceKernelSetCompiledSdkVersion 0x6060010: %08x", sceKernelSetCompiledSdkVersion(0x6060010));

	TEST_RES(sceUmdActivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatWithTimer, 0x32, 10000);
	TEST_RES(sceUmdGetDriveStat);
	TEST_RES(sceKernelCheckCallback);
	TEST_RES(sceUmdDeactivate, 1, "disc0:");
	TEST_RES(sceUmdWaitDriveStatCB, 0x10, 10000);

	sceUmdUnRegisterUMDCallBack(cb2);

	return 0;
}
