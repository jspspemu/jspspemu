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
static void *g_fontData = NULL;
static u32 g_fontDataSize = 0;

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

void testOpen(const char *title, FontLibraryHandle lib, const void *data, u32 size, bool useError = true) {
	uint error = -1;
	g_allocated = 0;
	FontHandle font = sceFontOpenUserMemory(lib, data, size, useError ? &error : NULL);
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
	checkpointNext("sceFontOpenUserMemory libs:");
	testOpen("  Normal", fontLib, g_fontData, g_fontDataSize, true);
	testOpen("  Invalid", 0, g_fontData, g_fontDataSize, true);
	// Crashes.
	//testOpen("  Done", fontLibDone, g_fontData, g_fontDataSize, true);

	checkpointNext("sceFontOpenUserMemory pointers:");
	testOpen("  NULL with no size", fontLib, NULL, 0, true);
	testOpen("  NULL with size", fontLib, NULL, g_fontDataSize, true);

	checkpointNext("sceFontOpenUserMemory sizes:");
	// 1 will crash, for example...
	const int sizes[] = {-1, 0, g_fontDataSize + 1, g_fontDataSize * 2};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  %d", sizes[i]);
		testOpen(temp, fontLib, g_fontData, sizes[i], true);
	}

	// Crashes.
	//checkpointNext("sceFontOpenUserMemory errors:");
	//testOpen("  Normal", fontLib, g_fontData, g_fontDataSize, false);
}

void testTooMany() {
	FontHandle fonts[4];

	checkpointNext("sceFontOpenUserMemory too many:");

	uint error;
	for (int i = 0; i < 4; ++i) {
		fonts[i] = sceFontOpenUserMemory(fontLib, g_fontData, g_fontDataSize, &error);
		if (fonts[i] == 0 || error != 0) {
			checkpoint("  Filling fonts failed: %08x, %08x", fonts[i], error);
		}
	}

	int result = sceFontOpenUserMemory(fontLib, g_fontData, g_fontDataSize, &error);
	checkpoint("  5th font: %08x, %08x", result, error);
	
	for (int i = 0; i < 4; ++i) {
		sceFontClose(fonts[i]);
	}
}

void testCallbacks() {
	fontLib->params.openFuncAddr = openFunc;
	fontLib->params.closeFuncAddr = closeFunc;
	fontLib->params.readFuncAddr = readFunc;
	fontLib->params.seekFuncAddr = seekFunc;
	fontLib->params.errorFuncAddr = (u32 *)errorFunc;
	fontLib->params.ioFinishFuncAddr = (u32 *)ioFinishFunc;

	checkpointNext("sceFontOpenUserMemory callbacks:");
	testOpen("  With callbacks set", fontLib, g_fontData, g_fontDataSize, true);
}

void testRefCount() {
	uint error;
	FontCharInfo charInfo;
	FontHandle font1 = sceFontOpenUserMemory(fontLib, g_fontData, g_fontDataSize, &error);
	FontHandle font2 = sceFontOpenUserMemory(fontLib, g_fontData, g_fontDataSize, &error);
	sceFontClose(font2);
	
	checkpointNext("sceFontOpen reference counting:");
	testOpen(  "While open", fontLib, g_fontData, g_fontDataSize);
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

	int fd = sceIoOpen("ltn0.pgf", PSP_O_RDONLY, 0);
	g_fontDataSize = sceIoLseek32(fd, 0, PSP_SEEK_END);
	sceIoLseek32(fd, 0, PSP_SEEK_SET);
	g_fontData = new u8[g_fontDataSize];
	sceIoRead(fd, g_fontData, g_fontDataSize);
	sceIoClose(fd);

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
	// That messed with our lib, let's reset.
	sceFontDoneLib(fontLib);
	fontLib = sceFontNewLib(&libParams, &error);

	testTooMany();
	testCallbacks();
	testRefCount();

	sceFontDoneLib(fontLib);

	delete [] g_fontData;

	return 0;
}
