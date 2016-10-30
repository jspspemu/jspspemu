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

void testShadowGlyphImage(const char *title, FontHandle f, u16 charCode, GlyphImage *glyph, bool show, int x = 0, int y = 0, int w = 20, int h = 20) {
	if (show) {
		memset(glyph->buffer, 0, 80 * 20);
	}

	int result = sceFontGetShadowGlyphImage_Clip(f, charCode, glyph, x, y, w, h);
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
	testShadowGlyphImage("  Normal", font, 'A', &glyph, true);
	testShadowGlyphImage("  NULL", 0, 'A', &glyph, true);
	testShadowGlyphImage("  Closed", fontClosed, 'A', &glyph, true);

	checkpointNext("Characters:");
	testShadowGlyphImage("  NUL", font, 0, &glyph, true);
	testShadowGlyphImage("  SOH", font, 1, &glyph, true);
	testShadowGlyphImage("  BEL", font, 7, &glyph, true);
	testShadowGlyphImage("  0xD7FF", font, 0xD7FF, &glyph, true);
	testShadowGlyphImage("  0xFFFE", font, 0xFFFE, &glyph, true);
	testShadowGlyphImage("  0xFFFF", font, 0xFFFF, &glyph, true);

	checkpointNext("Glyph info:");
	testShadowGlyphImage("  Missing", font, 'A', NULL, false);
	// Crashes.
	//glyph.buffer = NULL;
	//testShadowGlyphImage("  No buffer", font, 'A', &glyph, false);
	//glyph.buffer = buf;
	glyph.bufferWidth = 0;
	testShadowGlyphImage("  Width = 0", font, 'A', &glyph, true);
	glyph.bufferWidth = -1;
	testShadowGlyphImage("  Width = -1", font, 'A', &glyph, true);
	glyph.bufferWidth = 20;
	glyph.bufferHeight = 0;
	testShadowGlyphImage("  Height = 0", font, 'A', &glyph, true);
	glyph.bufferHeight = -1;
	testShadowGlyphImage("  Height = -1", font, 'A', &glyph, true);
	glyph.bufferHeight = 20;
	glyph.bytesPerLine = 0;
	testShadowGlyphImage("  Linesize = 0", font, 'A', &glyph, true);
	glyph.bytesPerLine = 1;
	testShadowGlyphImage("  Linesize = 1", font, 'A', &glyph, true);
	glyph.bytesPerLine = 20;

	checkpointNext("Glyph position:");
	glyph.positionX_F26_6 = -10 << 6;
	testShadowGlyphImage("  X = -10", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = 10 << 6;
	testShadowGlyphImage("  X = 10", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = (10 << 6) + (1 << 5);
	testShadowGlyphImage("  X = 10 100000", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = (10 << 6) + 0x3F;
	testShadowGlyphImage("  X = 10 111111", font, 'A', &glyph, true);
	glyph.positionX_F26_6 = 0;
	glyph.positionY_F26_6 = -10 << 6;
	testShadowGlyphImage("  Y = -10", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = 10 << 6;
	testShadowGlyphImage("  Y = 10", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = (10 << 6) + (1 << 5);
	testShadowGlyphImage("  Y = 10 100000", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = (10 << 6) + 0x3F;
	testShadowGlyphImage("  Y = 10 111111", font, 'A', &glyph, true);
	glyph.positionY_F26_6 = 0;

	checkpointNext("Pixel formats:");
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	testShadowGlyphImage("  8 bpp", font, 'A', &glyph, true);
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_4;
	testShadowGlyphImage("  4 bpp", font, 'A', &glyph, true);
	// TODO: Not sure how to make these produce an image.
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_4_REV;
	//testShadowGlyphImage("  4 bpp reversed", font, 'A', &glyph, true);
	//glyph.bytesPerLine = 60;
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_24;
	//testShadowGlyphImage("  24 bpp", font, 'A', &glyph, true);
	//glyph.bytesPerLine = 80;
	//glyph.pixelFormat = PSP_FONT_PIXELFORMAT_32;
	//testShadowGlyphImage("  32 bpp", font, 'A', &glyph, true);
	glyph.pixelFormat = -1;
	testShadowGlyphImage("  Invalid", font, 'A', &glyph, true);
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	glyph.bytesPerLine = 20;

	delete [] buf;
}

void testClipping() {
	GlyphImage glyph;
	u8 *buf = new u8[80 * 20];
	glyph.buffer = buf;
	glyph.bufferWidth = 20;
	glyph.bufferHeight = 20;
	glyph.bytesPerLine = 20;
	glyph.pixelFormat = PSP_FONT_PIXELFORMAT_8;
	glyph.positionX_F26_6 = 0;
	glyph.positionY_F26_6 = 0;

	checkpointNext("Clip x:");
	testShadowGlyphImage("  -1", font, 'A', &glyph, true, -1);
	testShadowGlyphImage("  5", font, 'A', &glyph, true, 5);

	checkpointNext("Clip y:");
	testShadowGlyphImage("  -1", font, 'A', &glyph, true, 0, -1);
	testShadowGlyphImage("  5", font, 'A', &glyph, true, 0, 5);

	checkpointNext("Clip width:");
	testShadowGlyphImage("  -2", font, 'A', &glyph, true, 0, 0, -2);
	testShadowGlyphImage("  -1", font, 'A', &glyph, true, 0, 0, -1);
	testShadowGlyphImage("  0", font, 'A', &glyph, true, 0, 0, 0);
	testShadowGlyphImage("  5", font, 'A', &glyph, true, 0, 0, 5);
	testShadowGlyphImage("  5 + 5", font, 'A', &glyph, true, 5, 0, 5);

	checkpointNext("Clip height:");
	testShadowGlyphImage("  -2", font, 'A', &glyph, true, 0, 0, 20, -2);
	testShadowGlyphImage("  -1", font, 'A', &glyph, true, 0, 0, 20, -1);
	testShadowGlyphImage("  0", font, 'A', &glyph, true, 0, 0, 20, 0);
	testShadowGlyphImage("  5", font, 'A', &glyph, true, 0, 0, 20, 5);
	testShadowGlyphImage("  5 + 5", font, 'A', &glyph, true, 0, 5, 20, 5);

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
	testClipping();

	sceFontClose(font);
	sceFontDoneLib(fontLib);

	return 0;
}