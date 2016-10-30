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

void schedfStyle(FontStyle *style) {
	schedf("Font Style: h=%f (%f), v=%f (%f), w=%f", style->fontH, style->fontHRes, style->fontV, style->fontVRes, style->fontWeight);
	schedf(", family=%d, style=%d / %d", style->fontFamily, style->fontStyle, style->fontStyleSub);
	schedf(", lang=%d, reg=%d, country=%d", style->fontLanguage, style->fontRegion, style->fontCountry);
	schedf(", name=%s, file=%s", style->fontName, style->fontFileName);
	schedf(", attr=%08x, exp=%d\n", style->fontAttributes, style->fontExpire);
}

void schedfInfo(FontInfo *info) {
	schedf("Font Info: maxGlyphWidthI: %d", info->maxGlyphWidthI);
	schedf(", maxGlyphHeightI: %d", info->maxGlyphHeightI);
	schedf(", maxGlyphAscenderI: %d", info->maxGlyphAscenderI);
	schedf(", maxGlyphDescenderI: %d", info->maxGlyphDescenderI);
	schedf(", maxGlyphLeftXI: %d", info->maxGlyphLeftXI);
	schedf(", maxGlyphBaseYI: %d", info->maxGlyphBaseYI);
	schedf(", minGlyphCenterXI: %d", info->minGlyphCenterXI);
	schedf(", maxGlyphTopYI: %d", info->maxGlyphTopYI);
	schedf(", maxGlyphAdvanceXI: %d", info->maxGlyphAdvanceXI);
	schedf(", maxGlyphAdvanceYI: %d", info->maxGlyphAdvanceYI);

	schedf(", maxGlyphWidthF: %f", info->maxGlyphWidthF);
	schedf(", maxGlyphHeightF: %f", info->maxGlyphHeightF);
	schedf(", maxGlyphAscenderF: %f", info->maxGlyphAscenderF);
	schedf(", maxGlyphDescenderF: %f", info->maxGlyphDescenderF);
	schedf(", maxGlyphLeftXF: %f", info->maxGlyphLeftXF);
	schedf(", maxGlyphBaseYF: %f", info->maxGlyphBaseYF);
	schedf(", minGlyphCenterXF: %f", info->minGlyphCenterXF);
	schedf(", maxGlyphTopYF: %f", info->maxGlyphTopYF);
	schedf(", maxGlyphAdvanceXF: %f", info->maxGlyphAdvanceXF);
	schedf(", maxGlyphAdvanceYF: %f", info->maxGlyphAdvanceYF);
		
	schedf(", maxGlyphWidth: %d, maxGlyphHeight: %d", info->maxGlyphWidth, info->maxGlyphHeight);
	schedf(", charMapLength: %d, shadowMapLength: %d", info->charMapLength, info->shadowMapLength);

	schedf(", pad0=%02x, pad1=%02x, pad2=%02x", info->pad[0], info->pad[1], info->pad[2]);

	schedf(", BPP: %d\n", info->BPP);
	schedfStyle(&info->fontStyle);
}

void testFontInfo(const char *title, FontHandle f, FontInfo *fontInfo) {
	if (fontInfo) {
		memset(fontInfo, 0xdd, sizeof(FontInfo));
	}
	int result = sceFontGetFontInfo(f, fontInfo);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: OK ", title);
		schedfInfo(fontInfo);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

void testFont() {
	FontInfo fontInfo;

	checkpointNext("Fonts:");
	testFontInfo("  Normal", font, &fontInfo);
	testFontInfo("  NULL", 0, &fontInfo);
	testFontInfo("  Closed", fontClosed, &fontInfo);

	checkpointNext("Info:");
	testFontInfo("  Missing", font, NULL);

	u32 data[69];
	memset(data, 0xdd, sizeof(data));
	sceFontGetFontInfo(font, (FontInfo *)data);
	checkpoint("  Data size: %08x %08x %08x %08x", data[65], data[66], data[67], data[68]);
}

extern "C" int main(int argc, char *argv[]) {
	if (!loadFontModule()) {
		return 1;
	}
	if (!loadFontHandles()) {
		return 1;
	}

	testFont();

	sceFontClose(font);
	sceFontDoneLib(fontLib);

	return 0;
}