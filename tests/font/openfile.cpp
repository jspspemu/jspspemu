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

static void *allocQuiet(void *arg, u32 size) {
	g_allocated += size;
	void *p = malloc(size);
	//checkpoint("%08x = alloc(0x%x)", p, size);
	return p;
}

static void freeQuiet(void *arg, void *p) {
	//checkpoint("free(%08x)", p);
	free(p);
}

// Returns opaque handle, always set errorCode.
static u32 openFunc(void *arg, const char *filename, int *errorCode) {
	checkpoint("   open(%08x, %s, &errorCode)", (uint)arg, filename);
	g_fontFile = sceIoOpen(filename, PSP_O_RDONLY, 0);
	*errorCode = g_fontFile < 0 ? -1 : 0;
	return 0x1337;
}

// Return error code on failure.
static int closeFunc(void *arg, u32 handle) {
	checkpoint("   close(%08x, %08x)", (uint)arg, (uint)handle);
	return sceIoClose(g_fontFile);
}

// Return sizes read, always set errorCode.
static u32 readFunc(void *arg, int handle, void *ptr, u32 size, u32 count, int *errorCode) {
	checkpoint("   read(%08x, %08x, ptr, %08x, %08x, &errorCode)", (uint)arg, (uint)handle, (uint)size, (uint)count);
	u32 res = sceIoRead(g_fontFile, ptr, size * count);
	if (res < size * count) {
		*errorCode = -1;
		return 0;
	}
	*errorCode = 0;
	return res / size;
}

// Return 0 on success, other on error.
static int seekFunc(void *arg, int handle, u32 pos) {
	checkpoint("   seek(%08x, %08x, %08x)", (uint)arg, (uint)handle, (uint)pos);
	int res = sceIoLseek32(g_fontFile, pos, PSP_SEEK_SET);
	if (res < 0) {
		return -1;
	}
	return 0;
}

static int errorFunc(void *arg, u32 b, u32 c, u32 d, u32 e, u32 f, u32 g, u32 h) {
	checkpoint("   error(%08x, %08x, %08x, %08x, %08x, %08x, %08x, %08x)", (uint)arg, (uint)b, (uint)c, (uint)d, (uint)e, (uint)f, (uint)g, (uint)h);
	return -1;
}

static int ioFinishFunc(void *arg, u32 b, u32 c, u32 d, u32 e, u32 f, u32 g, u32 h) {
	checkpoint("   ioFinish(%08x, %08x, %08x, %08x, %08x, %08x, %08x, %08x)", (uint)arg, (uint)b, (uint)c, (uint)d, (uint)e, (uint)f, (uint)g, (uint)h);
	return -1;
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

void testOpen(const char *title, FontLibraryHandle lib, const char *filename, int mode, bool useError = true) {
	uint error = -1;
	g_allocated = 0;
	FontHandle font = sceFontOpenUserFile(lib, filename, mode, useError ? &error : NULL);
	if (font <= 0) {
		checkpoint("%s: Failed (%08x, %08x)", title, font, error);
	} else if (error != 0) {
		checkpoint("%s: Error (%08x, %08x)", title, font, error);
	} else {
		int allocated = g_allocated;
		sceFontClose(font);
		checkpoint("%s: OK (allocated %d)", title, allocated);
	}
}

void testBasicParams() {
	checkpointNext("sceFontOpenUserFile libs:");
	testOpen("  Normal", fontLib, "ltn0.pgf", 0, true);
	// Crashes.
	//testOpen("  Invalid", 0, "ltn0.pgf", 0, true);
	// Crashes.
	//testOpen("  Done", fontLibDone, "ltn0.pgf", 0, true);

	checkpointNext("sceFontOpenUserFile libs (mode 1):");
	testOpen("  Normal", fontLib, "ltn0.pgf", 1, true);
	testOpen("  Invalid", 0, "ltn0.pgf", 1, true);
	// Crashes.
	//testOpen("  Done", fontLibDone, "ltn0.pgf", 1, true);

	checkpointNext("sceFontOpenUserFile modes:");
	testOpen("  Mode -1", fontLib, "ltn0.pgf", -1, true);
	testOpen("  Mode 0", fontLib, "ltn0.pgf", 0, true);
	testOpen("  Mode 1", fontLib, "ltn0.pgf", 1, true);
	testOpen("  Mode 2", fontLib, "ltn0.pgf", 2, true);

	checkpointNext("sceFontOpenUserFile filenames (mode 0):");
	testOpen("  NULL", fontLib, NULL, 0, true);
	// NOTE: Causes font ids to leak.
	testOpen("  Invalid", fontLib, "asdf", 0, true);
	// Crashes depending on the data...
	//testOpen("  Wrong type", fontLib, "openfile.prx", 0, true);

	checkpointNext("sceFontOpenUserFile filenames (mode 1):");
	testOpen("  NULL", fontLib, NULL, 1, true);
	// NOTE: Causes font ids to leak.
	testOpen("  Invalid", fontLib, "asdf", 1, true);
	// Crashes depending on the data...
	//testOpen("  Wrong type", fontLib, "openfile.prx", 1, true);

	// Crashes.
	//checkpointNext("sceFontOpenUserFile errors:");
	//testOpen("  Normal", fontLib, 0, 0, false);
}

void testTooMany() {
	FontHandle fonts[4];

	checkpointNext("sceFontOpenUserFile too many:");

	uint error;
	for (int i = 0; i < 4; ++i) {
		fonts[i] = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
		if (fonts[i] == 0 || error != 0) {
			checkpoint("  Filling fonts failed: %08x, %08x", fonts[i], error);
		}
	}

	int result = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	checkpoint("  5th font: %08x, %08x", result, error);
	
	for (int i = 0; i < 4; ++i) {
		sceFontClose(fonts[i]);
	}
}

void testCallbacks() {
	fontLib->params.openFuncAddr = NULL;
	fontLib->params.closeFuncAddr = NULL;
	fontLib->params.readFuncAddr = NULL;
	fontLib->params.seekFuncAddr = NULL;
	fontLib->params.errorFuncAddr = NULL;
	fontLib->params.ioFinishFuncAddr = NULL;

	checkpointNext("sceFontOpenUserFile callbacks:");
	testOpen("  Without callbacks set (mode 0)", fontLib, "ltn0.pgf", 0, true);
	testOpen("  Without callbacks set (mode 1)", fontLib, "ltn0.pgf", 1, true);

	fontLib->params.openFuncAddr = openFunc;
	testOpen("  With open", fontLib, "ltn0.pgf", 0, true);
	fontLib->params.closeFuncAddr = closeFunc;
	testOpen("  With close", fontLib, "ltn0.pgf", 0, true);
	fontLib->params.readFuncAddr = readFunc;
	testOpen("  With read", fontLib, "ltn0.pgf", 0, true);
	fontLib->params.seekFuncAddr = seekFunc;
	testOpen("  With seek", fontLib, "ltn0.pgf", 0, true);
}

void testRefCount() {
	uint error;
	FontCharInfo charInfo;
	FontHandle font1 = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	FontHandle font2 = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	sceFontClose(font2);
	
	checkpointNext("sceFontOpen reference counting:");
	testOpen(  "While open", fontLib, "ltn0.pgf", 1);
	checkpoint("  GetCharInfo on open: %08x", sceFontGetCharInfo(font2, '.', &charInfo));
	checkpoint("  GetCharInfo on closed: %08x", sceFontGetCharInfo(font2, '.', &charInfo));
	sceFontClose(font1);
	// Crashes.
	//checkpoint("  GetCharInfo on both closed: %08x", sceFontGetCharInfo(font2, '.', &charInfo));

	sceFontClose(font1);
	sceFontClose(font2);
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

	libParams.openFuncAddr = openFunc;
	libParams.closeFuncAddr = closeFunc;
	libParams.readFuncAddr = readFunc;
	libParams.seekFuncAddr = seekFunc;
	libParams.errorFuncAddr = (u32 *)errorFunc;
	libParams.ioFinishFuncAddr = (u32 *)ioFinishFunc;

	uint error = -1;
	fontLib = sceFontNewLib(&libParams, &error);
	fontLibDone = sceFontNewLib(&libParams, &error);
	sceFontDoneLib(fontLibDone);

	testBasicParams();
	// That messed with our lib, let's reset.
	sceFontDoneLib(fontLib);
	fontLib = sceFontNewLib(&libParams, &error);

	testTooMany();
	testCallbacks();
	testRefCount();

	sceFontDoneLib(fontLib);

	return 0;
}
