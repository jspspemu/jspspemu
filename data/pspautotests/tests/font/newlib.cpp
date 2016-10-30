#include <common.h>
#include <pspmodulemgr.h>
#include <malloc.h>
extern "C" {
#include "libfont.h"
}

static int g_allocated = 0;

static void *allocQuiet(void *data, u32 size) {
	g_allocated += size;
	return malloc(size);
}

static void freeQuiet(void *data, void *p) {
	free(p);
}

static void *allocFail(void *data, u32 size) {
	return 0;
}

static void freeFail(void *data, void *p) {
	checkpoint("  free(%08x)", p);
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

void testNewLib(const char *title, FontNewLibParams *params, bool useError = true) {
	uint error = -1;
	g_allocated = 0;
	FontLibraryHandle libID = sceFontNewLib(params, useError ? &error : NULL);
	if (libID <= 0) {
		checkpoint("%s: Failed (%08x, %08x)", title, libID, error);
	} else if (error != 0) {
		checkpoint("%s: Error (%08x, %08x)", title, libID, error);
	} else {
		int allocated = g_allocated;
		sceFontDoneLib(libID);
		checkpoint("%s: OK (allocated %d)", title, allocated);
	}
}

void testBasicParams() {
	FontNewLibParams libParams;
	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	libParams.numFonts = 4;

	checkpointNext("sceFontNewLib primary params:");
	testNewLib("  Normal", &libParams, true);
	// Crashes.
	//testNewLib("  Bad params", NULL, true);
	//testNewLib("  Missing error", &libParams, false);

	checkpointNext("sceFontNewLib numFonts:");
	static const int numFonts[] = {-1, 0, 1, 2, 4, 8, 9, 10, 100};
	for (size_t i = 0; i < ARRAY_SIZE(numFonts); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  %d", numFonts[i]);
		libParams.numFonts = numFonts[i];
		testNewLib(temp, &libParams, true);
	}
}

void testCallbacks() {
	FontNewLibParams libParams;

	checkpointNext("sceFontNewLib callbacks:");

	memset(&libParams, 0, sizeof(libParams));
	testNewLib("  No callbacks set", &libParams);

	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	testNewLib("  Alloc only", &libParams);

	memset(&libParams, 0, sizeof(libParams));
	libParams.freeFuncAddr = freeQuiet;
	testNewLib("  Free only", &libParams);

	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	testNewLib("  Alloc and free", &libParams);

	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocFail;
	libParams.freeFuncAddr = freeFail;
	testNewLib("  Failing alloc", &libParams);
}

void testTwice() {
	FontNewLibParams libParams;
	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	libParams.numFonts = 4;

	checkpointNext("sceFontNewLib Twice");

	uint error = -1;
	FontLibraryHandle libID = sceFontNewLib(&libParams, &error);
	testNewLib("  Second lib", &libParams);
	sceFontDoneLib(libID);
}

void testDataLayout() {
	FontNewLibParams libParams;
	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	libParams.numFonts = 4;

	checkpointNext("FontLib data layout");

	uint error = -1;
	FontLibraryHandle libID = sceFontNewLib(&libParams, &error);

	checkpoint("  Params: %d", memcmp(&libParams, &libID->params, sizeof(libParams)));
	checkpoint("  unk1=%04x, unk2=%04x hRes=%f, vRes=%f, internal count=%d, altCharCode=%04x, unk5=%04x", libID->unk1, libID->unk2, libID->hRes, libID->vRes, libID->internalFontCount, libID->altCharCode, libID->unk5);

	sceFontDoneLib(libID);
}

extern "C" int main(int argc, char *argv[]) {
	if (!loadFontModule()) {
		return 1;
	}
	testBasicParams();
	testCallbacks();
	testTwice();
	testDataLayout();

	return 0;
}