#include <pspmodulemgr.h>
#include <pspiofilemgr.h>
#include <common.h>
#include <malloc.h>
#include "shared.h"

AutoCCCModule::AutoCCCModule() {
	if (RUNNING_ON_EMULATOR) {
		return;
	}
	id = sceKernelLoadModule("libccc.prx", 0, NULL);
	if (!IsValid() || id != sceKernelStartModule(id, 0, 0, NULL, NULL)) {
		sceKernelUnloadModule(id);
		printf("TEST FAILURE: Unable to load libccc.prx.");
		id = -1;
	}
}

AutoCCCModule::~AutoCCCModule() {
	if (IsValid()) {
		sceKernelStopModule(id, 0, NULL, NULL, NULL);
		sceKernelUnloadModule(id);
		id = -1;
	}
}

static bool tablesLoaded = false;
static u16 *ucs2jis = NULL;
static u16 *jis2ucs = NULL;
bool LoadCCCTables() {
	if (tablesLoaded) {
		return true;
	}

	static const int tableSize = 65536 * 2;
	if (!ucs2jis) {
		ucs2jis = (u16 *)malloc(tableSize);
	}
	if (!jis2ucs) {
		jis2ucs = (u16 *)malloc(tableSize);
	}

	SceUID fd = sceIoOpen("jis2ucs.bin", PSP_O_RDONLY, 0777);
	if (fd < 0) {
		return false;
	}
	sceIoRead(fd, jis2ucs, tableSize);
	sceIoClose(fd);

	fd = sceIoOpen("ucs2jis.bin", PSP_O_RDONLY, 0777);
	if (fd < 0) {
		return false;
	}
	sceIoRead(fd, ucs2jis, tableSize);
	sceIoClose(fd);

	sceCccSetTable(jis2ucs, ucs2jis);
	checkpoint("  *** Loaded Ccc tables.");

	tablesLoaded = true;
	return true;
}
