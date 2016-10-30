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

void testCharImageRect(const char *title, FontHandle f, u16 charCode, FontImageRect *rect) {
	if (rect) {
		rect->width = -1;
		rect->height = -1;
	}
	int result = sceFontGetCharImageRect(f, charCode, rect);
	if (result == 0) {
		checkpoint("%s: OK (%d, %d)", title, rect ? rect->width : -1, rect ? rect->height : -1);
	} else {
		checkpoint("%s: Failed (%08x -> %d, %d)", title, result, rect ? rect->width : -1, rect ? rect->height : -1);
	}
}

void testGlyphParams() {
	FontImageRect rect;

	checkpointNext("Fonts:");
	testCharImageRect("  Normal", font, 'A', &rect);
	testCharImageRect("  NULL", 0, 'A', &rect);
	testCharImageRect("  Closed", fontClosed, 'A', &rect);

	checkpointNext("Characters:");
	testCharImageRect("  NUL", font, 0, &rect);
	testCharImageRect("  SOH", font, 1, &rect);
	testCharImageRect("  BEL", font, 7, &rect);
	testCharImageRect("  0xD7FF", font, 0xD7FF, &rect);
	testCharImageRect("  0xFFFE", font, 0xFFFE, &rect);
	testCharImageRect("  0xFFFF", font, 0xFFFF, &rect);

	checkpointNext("Rect:");
	testCharImageRect("  Missing", font, 'A', NULL);

	u32 data[4];
	memset(data, 0xdd, sizeof(data));
	sceFontGetCharImageRect(font, 'A', (FontImageRect *)data);
	checkpoint("  Data size: %08x %08x %08x %08x", data[0], data[1], data[2], data[3]);
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