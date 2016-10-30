#ifndef __LIBFONT_H
	#define __LIBFONT_H

	typedef void *(*FontAllocFunc)(void *arg, u32 size);
	typedef void (*FontFreeFunc)(void *arg, void *ptr);
	typedef u32 (*FontOpenFunc)(void *arg, const char *filename, int *errorCode);
	typedef int (*FontCloseFunc)(void *arg, u32 handle);
	typedef u32 (*FontReadFunc)(void *arg, int handle, void *ptr, u32 size, u32 count, int *errorCode);
	typedef int (*FontSeekFunc)(void *arg, int handle, u32 pos);

	typedef struct {
		u32* userDataAddr;
		u32  numFonts;
		u32* cacheDataAddr;

		// Driver callbacks.
		FontAllocFunc allocFuncAddr;
		FontFreeFunc freeFuncAddr;
		FontOpenFunc openFuncAddr;
		FontCloseFunc closeFuncAddr;
		FontReadFunc readFuncAddr;
		FontSeekFunc seekFuncAddr;
		u32* errorFuncAddr;
		u32* ioFinishFuncAddr;
	} FontNewLibParams;

	typedef struct {
		FontNewLibParams params;
		void *fontInfo1; // 2c
		void *fontInfo2;
		u16 unk1;
		u16 unk2;
		float hRes; // 38
		float vRes;
		int internalFontCount;
		void *internalFontInfo;
		u16 altCharCode; // 48
		u16 unk5; // 50
	} FontLibrary;

	typedef FontLibrary *FontLibraryHandle;
	typedef u32 FontHandle;

	typedef enum {
		FONT_FAMILY_SANS_SERIF = 1,
		FONT_FAMILY_SERIF      = 2,
	} Family;
	
	typedef enum {
		FONT_STYLE_REGULAR     = 1,
		FONT_STYLE_ITALIC      = 2,
		FONT_STYLE_BOLD        = 5,
		FONT_STYLE_BOLD_ITALIC = 6,
		FONT_STYLE_DB          = 103, // Demi-Bold / semi-bold
	} Style;
	
	typedef enum {
		FONT_LANGUAGE_JAPANESE = 1,
		FONT_LANGUAGE_LATIN    = 2,
		FONT_LANGUAGE_KOREAN   = 3,
	} Language;
	
	typedef enum {
		PSP_FONT_PIXELFORMAT_4 = 0, // 2 pixels packed in 1 byte (natural order)
		PSP_FONT_PIXELFORMAT_4_REV = 1, // 2 pixels packed in 1 byte (reversed order)
		PSP_FONT_PIXELFORMAT_8 = 2, // 1 pixel in 1 byte
		PSP_FONT_PIXELFORMAT_24 = 3, // 1 pixel in 3 bytes (RGB)
		PSP_FONT_PIXELFORMAT_32 = 4, // 1 pixel in 4 bytes (RGBA)
	} FontPixelFormat;

	typedef struct {
		int pixelFormat;
		int positionX_F26_6;
		int positionY_F26_6;
		short bufferWidth;
		short bufferHeight;
		short bytesPerLine;
		short __padding;
		void* buffer;
	} GlyphImage;

	typedef struct {
		float  fontH;
		float  fontV;
		float  fontHRes;
		float  fontVRes;
		float  fontWeight;
		u16    fontFamily;
		u16    fontStyle;
		// Check.
		u16    fontStyleSub;
		u16    fontLanguage;
		u16    fontRegion;
		u16    fontCountry;
		char   fontName[64];
		char   fontFileName[64];
		u32    fontAttributes;
		u32    fontExpire;
	} FontStyle;

	typedef struct {
		// Glyph metrics (in 26.6 signed fixed-point).
		u32 maxGlyphWidthI;
		u32 maxGlyphHeightI;
		u32 maxGlyphAscenderI;
		u32 maxGlyphDescenderI;
		u32 maxGlyphLeftXI;
		u32 maxGlyphBaseYI;
		u32 minGlyphCenterXI;
		u32 maxGlyphTopYI;
		u32 maxGlyphAdvanceXI;
		u32 maxGlyphAdvanceYI;

		// Glyph metrics (replicated as float).
		float maxGlyphWidthF;
		float maxGlyphHeightF;
		float maxGlyphAscenderF;
		float maxGlyphDescenderF;
		float maxGlyphLeftXF;
		float maxGlyphBaseYF;
		float minGlyphCenterXF;
		float maxGlyphTopYF;
		float maxGlyphAdvanceXF;
		float maxGlyphAdvanceYF;
		
		// Bitmap dimensions.
		short maxGlyphWidth;
		short maxGlyphHeight;
		u32  charMapLength;   // Number of elements in the font's charmap.
		u32  shadowMapLength; // Number of elements in the font's shadow charmap.
		
		// Font style (used by font comparison functions).
		FontStyle fontStyle;
		
		u8 BPP; // Font's BPP.
		u8 pad[3];
	} FontInfo;
	
	typedef struct {
		u32 bitmapWidth;
		u32 bitmapHeight;
		u32 bitmapLeft;
		u32 bitmapTop;
		// Glyph metrics (in 26.6 signed fixed-point).
		u32 sfp26Width;
		u32 sfp26Height;
		int sfp26Ascender;
		int sfp26Descender;
		int sfp26BearingHX;
		int sfp26BearingHY;
		int sfp26BearingVX;
		int sfp26BearingVY;
		int sfp26AdvanceH;
		int sfp26AdvanceV;
		short shadowFlags;
		short shadowId;
	} FontCharInfo;

	typedef struct {
		short width;
		short height;
	} FontImageRect;

	/**
	 * Creates a new font library.
	 *
	 * @param  params     Parameters of the new library.
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return FontLibraryHandle
	 */
	FontLibraryHandle sceFontNewLib(FontNewLibParams *params, uint *errorCode);

	/**
	 * Releases the font library.
	 *
	 * @param  libHandle  Handle of the library.
	 *
	 * @return 0 on success
	 */
	int sceFontDoneLib(FontLibraryHandle libHandle);
	
	/**
	 * Opens a new font.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  index      Index of the font.
	 * @param  mode       Mode for opening the font.
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return FontHandle
	 */
	FontHandle sceFontOpen(FontLibraryHandle libHandle, int index, int mode, uint *errorCode);

	/**
	 * Opens a new font from memory.
	 *
	 * @param  libHandle         Handle of the library.
	 * @param  memoryFontAddr    Index of the font.
	 * @param  memoryFontLength  Mode for opening the font.
	 * @param  errorCode         Pointer to store any error code.
	 *
	 * @return FontHandle
	 */
	FontHandle sceFontOpenUserMemory(FontLibraryHandle libHandle, const void *memoryFontAddr, int memoryFontLength, uint *errorCode);
	
	/**
	 * Opens a new font from a file.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  fileName   Path to the font file to open.
	 * @param  mode       Mode for opening the font.
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return FontHandle
	 */
	FontHandle sceFontOpenUserFile(FontLibraryHandle libHandle, const char *fileName, int mode, uint *errorCode);

	/**
	 * Closes the specified font file.
	 *
	 * @param  fontHandle  Handle of the font.
	 *
	 * @return 0 on success.
	 */
	int sceFontClose(FontHandle fontHandle);

	/**
	 * Returns the number of available fonts.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return Number of fonts
	 */
	int sceFontGetNumFontList(FontLibraryHandle libHandle, uint *errorCode);

	/**
	 * Returns a font index that best matches the specified FontStyle.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  fontStyle  Family, style and 
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return Font index
	 */
	int sceFontFindOptimumFont(FontLibraryHandle libHandle, FontStyle *fontStyle, uint *errorCode);

	/**
	 * Returns a font index that best matches the specified FontStyle.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  fontStyle  Family, style and language.
	 * @param  errorCode  Pointer to store any error code.
	 *
	 * @return Font index
	 */
	int sceFontFindFont(FontLibraryHandle libHandle, FontStyle *fontStyle, uint *errorCode);

	/**
	 * Obtains the FontInfo of a FontHandle.
	 *
	 * @param  fontHandle  Font Handle to get the information from.
	 * @param  fontInfo    Pointer to a FontInfo structure that will hold the information.
	 *
	 * @return 0 on success
	 */
	int sceFontGetFontInfo(FontHandle fontHandle, FontInfo *fontInfo);
	
	/**
	 * Obtains the FontInfo of a Font with its index.
	 *
	 * @param  libHandle  Handle of the library.
	 * @param  fontInfo   Pointer to a FontInfo structure that will hold the information.
	 * @param  fontIndex  Index of the font to get the information from.
	 *
	 * @return 0 on success
	 */
	int sceFontGetFontInfoByIndexNumber(FontLibraryHandle libHandle, FontStyle *fontStyle, int fontIndex);

	int sceFontGetFontList(FontLibraryHandle libHandle, FontStyle *fontStyleList, int numFonts);
	int sceFontGetCharImageRect(FontHandle FontHandle, ushort CharCode, FontImageRect *rect);
	int sceFontGetCharGlyphImage(FontHandle FontHandle, ushort CharCode, GlyphImage *GlyphImagePointer);
	int sceFontGetCharGlyphImage_Clip(FontHandle FontHandle, ushort CharCode, GlyphImage *GlyphImagePointer, int clipXPos, int clipYPos, int clipWidth, int clipHeight);
	int sceFontGetCharInfo(FontHandle FontHandle, ushort charCode, FontCharInfo *charInfo);
	int sceFontSetAltCharacterCode(FontLibraryHandle libHandle, int charCode);
	int sceFontSetResolution(FontLibraryHandle libHandle, float hRes, float vRes);
	int sceFontGetShadowImageRect(FontHandle FontHandle, ushort CharCode, FontImageRect *rect);
	int sceFontGetShadowGlyphImage(FontHandle FontHandle, ushort CharCode, GlyphImage *GlyphImagePointer);
	int sceFontGetShadowGlyphImage_Clip(FontHandle FontHandle, ushort CharCode, GlyphImage *GlyphImagePointer, int clipXPos, int clipYPos, int clipWidth, int clipHeight);
	int sceFontGetShadowInfo(FontHandle FontHandle, ushort charCode, FontCharInfo *charInfo);

	float sceFontPixelToPointH(FontLibraryHandle fontLibHandle, float fontPixelsH, uint *errorCode);
	float sceFontPixelToPointV(FontLibraryHandle fontLibHandle, float fontPixelsH, uint *errorCode);
	float sceFontPointToPixelH(FontLibraryHandle fontLibHandle, float fontPixelsH, uint *errorCode);
	float sceFontPointToPixelV(FontLibraryHandle fontLibHandle, float fontPixelsH, uint *errorCode);
#endif