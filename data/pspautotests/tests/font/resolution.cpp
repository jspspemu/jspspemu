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

void testSetResolution(const char *title, FontLibrary *lib, float h, float v) {
	int result = sceFontSetResolution(lib, h, v);
	if (result != 0) {
		checkpoint("%s: Failed (%08x -> %f, %f)", title, result, lib ? lib->hRes : NAN, lib ? lib->vRes : NAN);
	} else {
		checkpoint("%s: OK (%f, %f)", title, lib ? lib->hRes : NAN, lib ? lib->vRes : NAN);
	}
}

void testBasicParams() {
	checkpoint("Initial value: %04x", fontLib->altCharCode);

	checkpointNext("Libraries:");
	testSetResolution("  Normal", fontLib, 128.0f, 128.0f);
	testSetResolution("  Done", fontLibDone, 128.0f, 128.0f);
	testSetResolution("  NULL", NULL, 128.0f, 128.0f);

	checkpointNext("Values:");
	testSetResolution("  -1", fontLib, -1.0f, -1.0f);
	testSetResolution("  0", fontLib, 0.0f, 0.0f);
	testSetResolution("  1", fontLib, 1.0f, 1.0f);
	testSetResolution("  -1/128", fontLib, -1.0f, 128.0f);
	testSetResolution("  -INFINITY", fontLib, -INFINITY, -INFINITY);
	testSetResolution("  INFINITY", fontLib, INFINITY, INFINITY);
	// Crashes?
	//testSetResolution("  NAN", fontLib, NAN, NAN);
}

void testConversion(const char *title, float (*func)(FontLibraryHandle lib, float val, uint *errorCode)) {
	char temp[256];
	snprintf(temp, sizeof(temp), "%s conversions:", title);
	checkpointNext(temp);

	uint error;
	float result;

	result = func(fontLibDone, 5.0f, &error);
	checkpoint("  Lib done: %08x, %f", error, result);

	result = func(NULL, 5.0f, &error);
	checkpoint("  Lib NULL: %08x, %f", error, result);

	// Crashes.
	//result = func(fontLib, 5.0f, NULL);
	//checkpoint("  Missing error: %08x, %f", error, result);

	sceFontSetResolution(fontLib, 128.0f, 128.0f);
	result = func(fontLib, 5.0f, &error);
	checkpoint("  5.0f x 128.0f: %08x, %f", error, result);

	sceFontSetResolution(fontLib, 64.0f, 64.0f);
	result = func(fontLib, 5.0f, &error);
	checkpoint("  5.0f x 64.0f: %08x, %f", error, result);

	sceFontSetResolution(fontLib, 64.0f, 64.0f);
	result = func(fontLib, -5.0f, &error);
	checkpoint("  -5.0f x 64.0f: %08x, %f", error, result);

	sceFontSetResolution(fontLib, 64.0f, 64.0f);
	result = func(fontLib, 0.0f, &error);
	checkpoint("  0.0f x 64.0f: %08x, %f", error, result);
}

void testConversions() {
	testConversion("sceFontPixelToPointH", &sceFontPixelToPointH);
	testConversion("sceFontPixelToPointV", &sceFontPixelToPointV);
	testConversion("sceFontPointToPixelH", &sceFontPointToPixelH);
	testConversion("sceFontPointToPixelV", &sceFontPointToPixelV);
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
	testConversions();

	sceFontDoneLib(fontLib);

	return 0;
}
