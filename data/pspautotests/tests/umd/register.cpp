#include <common.h>
#include <pspumd.h>
#include <pspthreadman.h>
extern "C" {
#include "sysmem-imports.h"
}

int umdHandler(int count, int umdStat, void *arg) {
	checkpoint("  * umdHandler called: %08X, %08X, %08X", (uint)count, (uint)umdStat, (uint)arg);
	return 0;
}

void testRegisterCallback(const char *title, SceUID uid) {
	checkpoint("%s: %08x", title, sceUmdRegisterUMDCallBack(uid));
}

void testUnRegisterCallback(const char *title, SceUID uid) {
	int result = sceUmdUnRegisterUMDCallBack(uid);
	if (result != uid) {
		checkpoint("%s: %08x", title, result);
	} else {
		checkpoint("%s: same as param", title);
	}
}

extern "C" int main(int argc, char *argv[]) {
	SceUID cb = sceKernelCreateCallback("umd", umdHandler, 0);

	checkpointNext("sceUmdRegisterUMDCallBack:");
	testRegisterCallback("  Invalid", -1);
	testRegisterCallback("  Zero", 0);
	testRegisterCallback("  Valid", cb);
	testRegisterCallback("  Twice", cb);
	testRegisterCallback("  Zero", 0);

	checkpointNext("sceUmdUnRegisterUMDCallBack:");
	testUnRegisterCallback("  Invalid", -1);
	testUnRegisterCallback("  Zero", 0);
	testUnRegisterCallback("  Valid", cb);
	testUnRegisterCallback("  Twice", cb);
	testUnRegisterCallback("  Zero", 0);

	sceKernelSetCompiledSdkVersion(0x3000000);

	checkpointNext("sceUmdRegisterUMDCallBack 0x3000000:");
	testRegisterCallback("  Invalid", -1);
	testRegisterCallback("  Zero", 0);
	testRegisterCallback("  Valid", cb);
	testRegisterCallback("  Twice", cb);
	testRegisterCallback("  Zero", 0);

	checkpointNext("sceUmdUnRegisterUMDCallBack 0x3000000:");
	testUnRegisterCallback("  Invalid", -1);
	testUnRegisterCallback("  Zero", 0);
	testUnRegisterCallback("  Valid", cb);
	testUnRegisterCallback("  Twice", cb);
	testUnRegisterCallback("  Zero", 0);

	sceKernelSetCompiledSdkVersion(0x3000001);

	checkpointNext("sceUmdRegisterUMDCallBack 0x3000001:");
	testRegisterCallback("  Invalid", -1);
	testRegisterCallback("  Zero", 0);
	testRegisterCallback("  Valid", cb);
	testRegisterCallback("  Twice", cb);
	testRegisterCallback("  Zero", 0);

	checkpointNext("sceUmdUnRegisterUMDCallBack 0x3000001:");
	testUnRegisterCallback("  Invalid", -1);
	testUnRegisterCallback("  Zero", 0);
	testUnRegisterCallback("  Valid", cb);
	testUnRegisterCallback("  Twice", cb);
	testUnRegisterCallback("  Zero", 0);

	return 0;
}