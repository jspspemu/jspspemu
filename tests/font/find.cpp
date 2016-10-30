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

void testFindOptimum(const char *title, FontLibraryHandle lib, FontStyle *fontStyle, bool useError = true) {
	uint error = -1;
	g_allocated = 0;
	int index = sceFontFindFont(lib, fontStyle, useError ? &error : NULL);
	if (index < 0) {
		checkpoint("%s: Failed (%08x, %08x)", title, index, error);
	} else if (error != 0) {
		checkpoint("%s: Error (%08x, %08x)", title, index, error);
	} else {
		int allocated = g_allocated;
		checkpoint("%s: OK - %d (allocated %d)", title, index, allocated);
	}
}

void testBasicParams() {
	FontStyle style;
	memset(&style, 0, sizeof(style));

	checkpointNext("sceFontFindFont libs:");
	testFindOptimum("  Normal", fontLib, &style, true);
	testFindOptimum("  Invalid", 0, &style, true);
	testFindOptimum("  Done", fontLibDone, &style, true);

	checkpointNext("sceFontFindFont errors:");
	testFindOptimum("  Missing style", fontLib, NULL, true);
	// Crashes.
	//testFindOptimum("  No error pointer", fontLib, &style, false);
}

void testSizeMatch(const char *title, float h, float v, float hRes = 0.0f, float vRes = 0.0f) {
	FontStyle style;
	memset(&style, 0, sizeof(style));
	style.fontH = h;
	style.fontV = v;
	style.fontHRes = hRes;
	style.fontVRes = vRes;
	testFindOptimum(title, fontLib, &style);
}

void testSizeMatches() {
	checkpointNext("H match:");
	static const float sizes[] = {-1.0f, 0.01f, 1.0f, 3.0f, 5.0f, 6.5f, 7.0f, 8.0f, 8.5f, 8.5624f, 8.5625f, 9.0f, 10.0f, 10.125f, 11.0f, 12.0f, 13.0f, INFINITY};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  H=%f", sizes[i]);
		testSizeMatch(temp, sizes[i], 0.0f);
	}

	checkpointNext("V match:");
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  V=%f", sizes[i]);
		testSizeMatch(temp, 0.0f, sizes[i]);
	}

	sceFontSetResolution(fontLib, 256.0f, 256.0f);
	testSizeMatch("  H=7.000000 (double res)", 7.0f, 0.0f);
	testSizeMatch("  H=3.500000 (double res)", 3.5f, 0.0f);
	testSizeMatch("  H=7.000000 (128.0f res)", 7.0f, 0.0f, 128.0f, 128.0f);
	sceFontSetResolution(fontLib, 128.0f, 128.0f);
}

void testBasicMatches() {
	FontStyle style;
	memset(&style, 0, sizeof(style));
	
	checkpointNext("General match:");
	style.fontFamily = 1;
	testFindOptimum("  Family = 1", fontLib, &style);
	style.fontFamily = 2;
	testFindOptimum("  Family = 2", fontLib, &style);
	style.fontFamily = 0;
	style.fontStyle = 1;
	testFindOptimum("  Style = 1", fontLib, &style);
	style.fontStyle = 5;
	testFindOptimum("  Style = 5", fontLib, &style);
	style.fontStyle = 6;
	testFindOptimum("  Style = 6", fontLib, &style);
	style.fontStyle = 103;
	testFindOptimum("  Style = 103", fontLib, &style);
	style.fontStyle = 0;
	style.fontLanguage = 1;
	testFindOptimum("  Language = 1", fontLib, &style);
	style.fontLanguage = 0;
	style.fontCountry = 1;
	testFindOptimum("  Country = 1", fontLib, &style);
	style.fontCountry = 0;
}

void testFilenameMatch(const char *title, const char *filename) {
	FontStyle style;
	memset(&style, 0, sizeof(style));
	strcpy(style.fontFileName, filename);
	testFindOptimum(title, fontLib, &style);
}

void testFilenameMatches() {
	checkpointNext("Filename match:");
	testFilenameMatch("  Exact", "ltn0.pgf");
	testFilenameMatch("  Partial", "ltn0.pg");
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
	testSizeMatches();
	testBasicMatches();
	testFilenameMatches();

	sceFontDoneLib(fontLib);

	return 0;
}