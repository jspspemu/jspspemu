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

void testCharGlyphImage(const char *title, FontHandle f, u16 charCode, GlyphImage *glyph, bool show) {
	if (show) {
		memset(glyph->buffer, 0, 80 * 20);
	}

	int result = sceFontGetCharGlyphImage(f, charCode, glyph);
	if (result == 0) {
		checkpoint("%s: OK", title);
		if (show) {
			const u8 *p = (const u8 *)glyph->buffer;
			for (int y = 0; y < 20; ++y) {
				schedf("   -> ");
				int linesize = 20;
				if (glyph->bytesPerLine > 2 && glyph->bytesPerLine <= 80) {
					linesize = glyph->bytesPerLine;
				}
				for (int x = 0; x < linesize; ++x) {
					schedf("%02x", *p++);
				}
				schedf("\n");
			}
		}
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

void testGlyphParams() {
	GlyphImage glyph;
	u8 *buf = new u8[80 * 20];
	glyph.buffer = buf;
	glyph.bufferWidth = 20;
	glyph.bufferHeight = 20;
	glyph.bytesPerLine = 20;
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	glyph.positionX_F26_6 = 0;
	glyph.positionY_F26_6 = 0;

	checkpointNext("Fonts:");
	testCharGlyphImage("  Normal", font, 'A', &glyph, true);
	testCharGlyphImage("  NULL", 0, 'A', &glyph, true);
	testCharGlyphImage("  Closed", fontClosed, 'A', &glyph, true);

	checkpointNext("Characters:");
	testCharGlyphImage("  NUL", font, 0, &glyph, true);
	testCharGlyphImage("  SOH", font, 1, &glyph, true);
	testCharGlyphImage("  BEL", font, 7, &glyph, true);
	testCharGlyphImage("  0xD7FF", font, 0xD7FF, &glyph, true);
	testCharGlyphImage("  0xFFFE", font, 0xFFFE, &glyph, true);
	testCharGlyphImage("  0xFFFF", font, 0xFFFF, &glyph, true);

	checkpointNext("Glyph info:");
	testCharGlyphImage("  Missing", font, 'A', NULL, false);
	// Crashes.
	//glyph.buffer = NULL;
	//testCharGlyphImage("  No buffer", font, 'A', &glyph, false);
	//glyph.buffer = buf;
	glyph.bufferWidth = 0;
	testCharGlyphImage("  Width = 0", font, 'A', &glyph, true);
	glyph.bufferWidth = -1;
	testCharGlyphImage("  Width = -1", font, 'A', &glyph, true);
	glyph.bufferWidth = 20;
	glyph.bufferHeight = 0;
	testCharGlyphImage("  Height = 0", font, 'A', &glyph, true);
	glyph.bufferHeight = -1;
	testCharGlyphImage("  Height = -1", font, 'A', &glyph, true);
	glyph.bufferHeight = 20;
	glyph.bytesPerLine = 0;
	testCharGlyphImage("  Linesize = 0", font, 'A', &glyph, true);
	glyph.bytesPerLine = 1;
	testCharGlyphImage("  Linesize = 1", font, 'A', &glyph, true);
	glyph.bytesPerLine = 20;

	checkpointNext("Glyph position:");
	glyph.positionX_F26_6 = -10 << 6;
	testCharGlyphImage("  X = -10", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = 10 << 6;
	testCharGlyphImage("  X = 10", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = (10 << 6) + (1 << 5);
	testCharGlyphImage("  X = 10 100000", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = (10 << 6) + 0x3F;
	testCharGlyphImage("  X = 10 111111", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = 0;
	glyph.positionY_F26_6 = -10 << 6;
	testCharGlyphImage("  Y = -10", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = 10 << 6;
	testCharGlyphImage("  Y = 10", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = (10 << 6) + (1 << 5);
	testCharGlyphImage("  Y = 10 100000", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = (10 << 6) + 0x3F;
	testCharGlyphImage("  Y = 10 111111", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = 0;

	checkpointNext("Pixel formats:");
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	testCharGlyphImage("  8 bpp", font, 'A', &glyph, true);
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_4;
	testCharGlyphImage("  4 bpp", font, 'A', &glyph, true);
	// TODO: Not sure how to make these produce an image.
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_4_REV;
	//testCharGlyphImage("  4 bpp reversed", font, 'A', &glyph, true);
	//glyph.bytesPerLine = 60;
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_24;
	//testCharGlyphImage("  24 bpp", font, 'A', &glyph, true);
	//glyph.bytesPerLine = 80;
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_32;
	//testCharGlyphImage("  32 bpp", font, 'A', &glyph, true);
	glyph.pixelFormat = -1;
	testCharGlyphImage("  Invalid", font, 'A', &glyph, true);
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	glyph.bytesPerLine = 20;

	delete [] buf;
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