#include <common.h>
#include <pspmodulemgr.h>
#include <pspiofilemgr.h>
#include <malloc.h>
extern "C" {
#include "libfont.h"
}

static FontLibraryHandle fontLib;
static FontLibraryHandle fontLibDone;
static int g_allocated = 0;
static int g_fontFile = 0;

static void *allocQuiet(void *data, u32 size) {
	g_allocated += size;
	void *p = malloc(size);
	//checkpoint("%08x = alloc(0x%x)", p, size);
	return p;
}

static void freeQuiet(void *data, void *p) {
	//checkpoint("free(%08x)", p);
	free(p);
}

bool loadFontModule() {
	checkpointNext("Init");
	if (RUNNING_ON_EMULATOR) {
		return true;
	}
	SceUID fontModule = sceKernelLoadModule("libfont.prx", 0, NULL);
	if (fontModule <= 0) {
		printf("TEST ERROR: Unable to load libfont.prx\n");
		return false;
	}

	int status = -1;
	int result = sceKernelStartModule(fontModule, 0, NULL, &status, NULL);
	if (result != fontModule || status != 0) {
		printf("TEST ERROR: libfont.prx startup failed (%08x, %08x)\n", result, status);
		return false;
	}
	return true;
}

void testSetAltCode(const char *title, FontLibrary *lib, int charCode) {
	int result = sceFontSetAltCharacterCode(lib, charCode);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%04x)", title, lib ? lib->altCharCode : 0x1337);
	}
}

void testBasicParams() {
	checkpoint("Initial value: %04x", fontLib->altCharCode);

	checkpointNext("Libraries:");
	testSetAltCode("  Normal", fontLib, 0x5F);
	testSetAltCode("  Done", fontLibDone, 0x5F);
	testSetAltCode("  NULL", NULL, 0x5F);

	checkpointNext("Codes:");
	testSetAltCode("  0", fontLib, 0);
	testSetAltCode("  -1", fontLib, -1);
	testSetAltCode("  0xFFFF", fontLib, 0xFFFF);
	testSetAltCode("  0x10000", fontLib, 0x10000);
}

void testFallback() {
	sceFontSetAltCharacterCode(fontLib, 0);

	uint error;
	FontHandle font = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	if (error != 0) {
		printf("TESTERROR: Unable to open font ltn0.pgf\n");
		return;
	}
	
	checkpointNext("Fallbacks:");
	FontCharInfo charInfo;
	int result;

	sceFontSetAltCharacterCode(fontLib, 0x0000);
	result = sceFontGetCharInfo(font, 0xFFFF, &charInfo);
	checkpoint("  sceFontGetCharInfo 0xFFFF (0x0000): %08x, %d", result, charInfo.bitmapHeight);

	sceFontSetAltCharacterCode(fontLib, 0x005F);
	result = sceFontGetCharInfo(font, 0xFFFF, &charInfo);
	checkpoint("  sceFontGetCharInfo 0xFFFF (0x005F): %08x, %d", result, charInfo.bitmapHeight);

	sceFontSetAltCharacterCode(fontLib, 0xFFFF);
	result = sceFontGetCharInfo(font, 0xFFFF, &charInfo);
	checkpoint("  sceFontGetCharInfo 0xFFFF (0xFFFF): %08x, %d", result, charInfo.bitmapHeight);

	sceFontClose(font);
}

extern "C" int main(int argc, char *argv[]) {
	if (!loadFontModule()) {
		return 1;
	}

	FontNewLibParams libParams;
	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	libParams.numFonts = 4;

	uint error = -1;
	fontLib = sceFontNewLib(&libParams, &error);
	fontLibDone = sceFontNewLib(&libParams, &error);
	sceFontDoneLib(fontLibDone);

	testBasicParams();
	testFallback();

	sceFontDoneLib(fontLib);

	return 0;
}
