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

bool loadFontHandles() {
	FontNewLibParams libParams;
	memset(&libParams, 0, sizeof(libParams));
	libParams.allocFuncAddr = allocQuiet;
	libParams.freeFuncAddr = freeQuiet;
	libParams.numFonts = 4;

	uint error = -1;
	fontLib = sceFontNewLib(&libParams, &error);
	fontLibDone = sceFontNewLib(&libParams, &error);
	sceFontDoneLib(fontLibDone);

	return true;
}

void schedfStyle(FontStyle *style) {
	schedf("Font Style: h=%f (%f), v=%f (%f), w=%f", style->fontH, style->fontHRes, style->fontV, style->fontVRes, style->fontWeight);
	schedf(", family=%d, style=%d / %d", style->fontFamily, style->fontStyle, style->fontStyleSub);
	schedf(", lang=%d, reg=%d, country=%d", style->fontLanguage, style->fontRegion, style->fontCountry);
	schedf(", name=%s, file=%s", style->fontName, style->fontFileName);
	schedf(", attr=%08x, exp=%d\n", style->fontAttributes, style->fontExpire);
}

void testFontList(const char *title, FontLibraryHandle lib, FontStyle *fontInfo, int num) {
	if (fontInfo) {
		memset(fontInfo, 0, sizeof(FontStyle) * 100);
	}
	int result = sceFontGetFontList(lib, fontInfo, num);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: OK ", title);
		schedfStyle(fontInfo);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

void testNumFontList(const char *title, FontLibraryHandle lib, bool useError = true) {
	uint errorCode = -1;
	int result = sceFontGetNumFontList(lib, useError ? &errorCode : 0);
	if (result >= 0) {
		checkpoint("%s: OK (%d, %08x)", title, result, errorCode);
	} else {
		checkpoint("%s: Failed (%08x, %08x)", title, result, errorCode);
	}
}

void testFontList() {
	FontStyle styles[100];

	checkpointNext("sceFontGetFontList libraries:");
	testFontList("  Normal", fontLib, styles, 1);
	testFontList("  NULL", 0, styles, 0);
	testFontList("  Done", fontLibDone, styles, 1);

	checkpointNext("sceFontGetFontList counts:");
	testFontList("  -1", fontLib, styles, -1);
	testFontList("  0", fontLib, styles, 0);
	testFontList("  1", fontLib, styles, 1);
	testFontList("  30", fontLib, styles, 30);

	checkpointNext("sceFontGetFontList styles:");
	testFontList("  Missing", fontLib, NULL, 0);

	u32 data[45];
	memset(data, 0xdd, sizeof(data));
	sceFontGetFontList(fontLib, (FontStyle *)data, 1);
	checkpoint("  Data size: %08x %08x %08x %08x", data[41], data[42], data[43], data[44]);
}

void testNumFontList() {
	FontStyle styles[100];

	checkpointNext("sceFontGetFontList libraries:");
	testNumFontList("  Normal", fontLib);
	testNumFontList("  NULL", 0);
	testNumFontList("  Done", fontLibDone);

	// Crashes.
	//checkpointNext("sceFontGetFontList errors:");
	//testNumFontList("  Missing", fontLib, false);
}

extern "C" int main(int argc, char *argv[]) {
	if (!loadFontModule()) {
		return 1;
	}
	if (!loadFontHandles()) {
		return 1;
	}

	testFontList();
	testNumFontList();

	sceFontDoneLib(fontLib);

	return 0;
}