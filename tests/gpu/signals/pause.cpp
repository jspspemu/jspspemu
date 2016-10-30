#include <common.h>

#include <stdlib.h>
#include <stdio.h>
#include <pspgu.h>
#include <pspgum.h>
#include <pspthreadman.h>

extern "C" {
#include "sysmem-imports.h"
#include "../commands/commands.h"
}

unsigned int __attribute__((aligned(16))) dlist1[] = {
	(GE_CMD_NOP << 24) | 0x000000,
	(GE_CMD_AMBIENTCOLOR << 24) | 0x000001,
	(GE_CMD_SIGNAL << 24) | (PSP_GE_SIGNAL_HANDLER_PAUSE << 16) | 0x0000,
	(GE_CMD_END << 24) | 0x000000,
	(GE_CMD_AMBIENTCOLOR << 24) | 0x000002,
	(GE_CMD_FINISH << 24) | 0x000000,
	(GE_CMD_END << 24) | 0x000000,
	(GE_CMD_AMBIENTCOLOR << 24) | 0x000003,
	(GE_CMD_FINISH << 24) | 0x000000,
	(GE_CMD_END << 24) | 0x000000,
};

int listid;

int ge_signal(int value, void *arg, u32 *listpc) {
	checkpoint("  * ge_signal: %d at %x, listsync: %08x, drawsync: %08x", value, sceGeGetCmd(GE_CMD_AMBIENTCOLOR), sceGeListSync(listid, 1), sceGeDrawSync(1));
}

int ge_signal2(int value, void *arg, u32 *listpc) {
	checkpoint("  * ge_signal: %d at %x, listsync: %08x, drawsync: %08x", value, sceGeGetCmd(GE_CMD_AMBIENTCOLOR), sceGeListSync(listid, 1), sceGeDrawSync(1));
	checkpoint("  * Continue: %08x", sceGeContinue());
}

int ge_finish(int value, void *arg, u32 *listpc) {
	checkpoint("  * ge_finish: %d at %x, listsync: %08x, drawsync: %08x", value, sceGeGetCmd(GE_CMD_AMBIENTCOLOR), sceGeListSync(listid, 1), sceGeDrawSync(1));
}

void testSdkVersion(u32 ver) {
	char temp[256];
	snprintf(temp, sizeof(temp), "SDK version %08x", ver);
	checkpointNext(temp);
	if (ver != 0) {
		sceKernelSetCompiledSdkVersion(ver);
	}

	PspGeCallbackData cbdata;

	cbdata.signal_func = (PspGeCallback) ge_signal;
	cbdata.signal_arg  = NULL;
	cbdata.finish_func = (PspGeCallback) ge_finish;
	cbdata.finish_arg  = NULL;
	int cbid1 = sceGeSetCallback(&cbdata);

	listid = sceGeListEnQueue(dlist1, dlist1, cbid1, NULL);
	sceGeListUpdateStallAddr(listid, dlist1 + 100);
	checkpoint("  Delay: %08x", sceKernelDelayThread(10000));
	checkpoint("  Continue: %08x", sceGeContinue());
	checkpoint("  Delay: %08x", sceKernelDelayThread(10000));
	sceGeBreak(1, NULL);
	checkpoint("  Done: %x", sceGeGetCmd(GE_CMD_AMBIENTCOLOR));

	sceGeUnsetCallback(cbid1);

	cbdata.signal_func = (PspGeCallback) ge_signal2;
	cbdata.signal_arg  = NULL;
	cbdata.finish_func = (PspGeCallback) ge_finish;
	cbdata.finish_arg  = NULL;
	int cbid2 = sceGeSetCallback(&cbdata);

	listid = sceGeListEnQueue(dlist1, dlist1, cbid2, NULL);
	sceGeListUpdateStallAddr(listid, dlist1 + 100);
	checkpoint("  Delay: %08x", sceKernelDelayThread(10000));
	checkpoint("  Continue: %08x", sceGeContinue());
	checkpoint("  Delay: %08x", sceKernelDelayThread(10000));
	sceGeBreak(1, NULL);
	checkpoint("  Done: %x", sceGeGetCmd(GE_CMD_AMBIENTCOLOR));
	
	sceGeUnsetCallback(cbid2);
}

extern "C" int main(int argc, char *argv[]) {
	testSdkVersion(0);
	testSdkVersion(0x06060010);

	return 0;
}