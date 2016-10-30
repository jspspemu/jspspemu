#include <common.h>
#include <pspmodulemgr.h>
#include <pspiofilemgr.h>
#include <malloc.h>
extern "C" {
#include "libfont.h"
}

static FontLibraryHandle fontLib;
static FontHandle font;
static FontHandle fontClosed;
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

	font = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	if (font <= 0) {
		printf("TEST ERROR: Unable to load ltn0.pgf\n");
		return false;
	}

	fontClosed = sceFontOpenUserFile(fontLib, "ltn0.pgf", 1, &error);
	sceFontClose(fontClosed);

	return true;
}

void schedfCharInfo(FontCharInfo *info) {
	schedf("Font Char: bitmap %dx%d, from %d,%d", info->bitmapWidth, info->bitmapHeight, info->bitmapLeft, info->bitmapTop);
	schedf(", metrics: %dx%d, asc=%d, desc=%d", info->sfp26Width, info->sfp26Height, info->sfp26Ascender, info->sfp26Descender);
	schedf(", bearH=%dx%d, bearV=%dx%d", info->sfp26BearingHX, info->sfp26BearingHY, info->sfp26BearingVX, info->sfp26BearingVY);
	schedf(", advanceH=%d, advanceV=%d", info->sfp26AdvanceH, info->sfp26AdvanceV);
	schedf(", shadowFlags=%04x, shadowId=%d\n", info->shadowFlags, info->shadowId);
}

void testCharInfo(const char *title, FontHandle f, u16 charCode, FontCharInfo *charInfo) {
	if (charInfo) {
		charInfo->bitmapWidth = -1;
		charInfo->bitmapHeight = -1;
	}
	int result = sceFontGetShadowInfo(f, charCode, charInfo);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: OK ", title);
		schedfCharInfo(charInfo);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

void testGlyphParams() {
	FontCharInfo charInfo;

	checkpointNext("Fonts:");
	testCharInfo("  Normal", font, 'A', &charInfo);
	testCharInfo("  NULL", 0, 'A', &charInfo);
	testCharInfo("  Closed", fontClosed, 'A', &charInfo);

	checkpointNext("Characters:");
	testCharInfo("  NUL", font, 0, &charInfo);
	testCharInfo("  SOH", font, 1, &charInfo);
	testCharInfo("  BEL", font, 7, &charInfo);
	testCharInfo("  0xD7FF", font, 0xD7FF, &charInfo);
	testCharInfo("  0xFFFE", font, 0xFFFE, &charInfo);
	testCharInfo("  0xFFFF", font, 0xFFFF, &charInfo);

	checkpointNext("Info:");
	testCharInfo("  Missing", font, 'A', NULL);

	u32 data[18];
	memset(data, 0xdd, sizeof(data));
	sceFontGetCharInfo(font, 'A', (FontCharInfo *)data);
	checkpoint("  Data size: %08x %08x %08x %08x", data[14], data[15], data[16], data[17]);
}

extern "C" int main(int argc, char *argv[]) {
	if (!loadFontModule()) {
		return 1;
	}
	if (!loadFontHandles()) {
		return 1;
	}

	testGlyphParams();

	sceFontClose(font);
	sceFontDoneLib(fontLib);

	return 0;
}