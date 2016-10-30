#include "shared.h"

inline void testDelete(const char *title, SceUID vtimer) {
	int result = sceKernelDeleteVTimer(vtimer);
	if (result == 0) {
		checkpoint("%s: OK", title);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

SceUInt deleteHandler(SceUID uid, SceInt64 scheduled, SceInt64 actual, void *common) {
	checkpoint("Delete within handler: %08x", sceKernelDeleteVTimer((SceUID)common));
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	SceUID vtimer = sceKernelCreateVTimer("delete", NULL);

	testDelete("Normal", vtimer);
	testDelete("NULL", 0);
	testDelete("Invalid", 0xDEADBEEF);
	testDelete("Deleted", vtimer);

	vtimer = sceKernelCreateVTimer("delete", NULL);
	sceKernelStartVTimer(vtimer);
	testDelete("Started", vtimer);

	vtimer = sceKernelCreateVTimer("delete", NULL);
	sceKernelSetVTimerHandlerWide(vtimer, 1, &deleteHandler, (void *)vtimer);
	sceKernelStartVTimer(vtimer);
	sceKernelDelayThread(10000);
	checkpoint("Delete after handler: %08x", sceKernelDeleteVTimer(vtimer));

	return 0;
}