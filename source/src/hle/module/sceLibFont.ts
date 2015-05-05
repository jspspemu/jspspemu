///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceLibFont {
	constructor(private context: _context.EmulatorContext) { }

	private fontLibUid = new UidCollection<FontLib>(1);
	private fontUid = new UidCollection<Font>(1);

	@nativeFunction(0x67F17ED7, 150, 'uint', 'void*/void*')
	sceFontNewLib(paramsPtr: Stream, errorCodePtr: Stream) {
		var fontLib = new FontLib();
		return this.fontLibUid.allocate(fontLib);
	}

	@nativeFunction(0x099EF33C, 150, 'uint', 'int/void*/void*')
	sceFontFindOptimumFont(fontLibId: number, fontStylePointer: Stream, errorCodePointer: Stream) {
		var fontLib = this.fontLibUid.get(fontLibId);
		return 0;
	}

	@nativeFunction(0xA834319D, 150, 'uint', 'int/int/int/void*')
	sceFontOpen(fontLibId: number, index: number, mode:number, errorCodePointer:Stream) {
		var fontLib = this.fontLibUid.get(fontLibId);
		return this.fontUid.allocate(new Font());
	}

	@nativeFunction(0x0DA7535E, 150, 'uint', 'int/void*')
	sceFontGetFontInfo(fontId: number, fontInfoPointer: Stream) {
		var font = this.fontUid.get(fontId);
		return 0;
	}

	@nativeFunction(0x48293280, 150, 'uint', 'int/float/float')
	sceFontSetResolution(fontLibId: number, horizontalResolution: number, verticalResolution: number) {
		//var font = this.fontUid.get(fontId);
		//FontLibrary.HorizontalResolution = HorizontalResolution;
		//FontLibrary.VerticalResolution = VerticalResolution;
		return 0;
	}
}

class FontLib {
}

class Font {
}

/*
class FontInfo {
	private Fixed26_6 MaxGlyphWidthI;
	private Fixed26_6 MaxGlyphHeightI;
	private Fixed26_6 MaxGlyphAscenderI;
	private Fixed26_6 MaxGlyphDescenderI;
	private Fixed26_6 MaxGlyphLeftXI;
	private Fixed26_6 MaxGlyphBaseYI;
	private Fixed26_6 MinGlyphCenterXI;
	private Fixed26_6 MaxGlyphTopYI;
	private Fixed26_6 MaxGlyphAdvanceXI;
	private Fixed26_6 MaxGlyphAdvanceYI;

	private float MaxGlyphWidthF;
	private float MaxGlyphHeightF;
	private float MaxGlyphAscenderF;
	private float MaxGlyphDescenderF;
	private float MaxGlyphLeftXF;
	private float MaxGlyphBaseYF;
	private float MinGlyphCenterXF;
	private float MaxGlyphTopYF;
	private float MaxGlyphAdvanceXF;
	private float MaxGlyphAdvanceYF;

	public float MaxGlyphAscender { set { MaxGlyphAscenderI = MaxGlyphAscenderF = value; } get { return MaxGlyphAscenderF; } }
	public float MaxGlyphDescender { set { MaxGlyphDescenderI = MaxGlyphDescenderF = value; } get { return MaxGlyphDescenderF; } }
	public float MaxGlyphLeftX { set { MaxGlyphLeftXI = MaxGlyphLeftXF = value; } get { return MaxGlyphLeftXF; } }
	public float MaxGlyphBaseY { set { MaxGlyphBaseYI = MaxGlyphBaseYF = value; } get { return MaxGlyphBaseYF; } }
	public float MinGlyphCenterX { set { MinGlyphCenterXI = MinGlyphCenterXF = value; } get { return MinGlyphCenterXF; } }
	public float MaxGlyphTopY { set { MaxGlyphTopYI = MaxGlyphTopYF = value; } get { return MaxGlyphTopYF; } }
	public float MaxGlyphAdvanceX { set { MaxGlyphAdvanceXI = MaxGlyphAdvanceXF = value; } get { return MaxGlyphAdvanceXF; } }
	public float MaxGlyphAdvanceY { set { MaxGlyphAdvanceYI = MaxGlyphAdvanceYF = value; } get { return MaxGlyphAdvanceYF; } }

	public ushort MaxGlyphWidth { set { MaxGlyphWidthI = MaxGlyphWidthF = _MaxGlyphWidth = value; } get { return _MaxGlyphWidth; } }
	public ushort MaxGlyphHeight { set { MaxGlyphHeightI = MaxGlyphHeightF = _MaxGlyphHeight = value; } get { return _MaxGlyphHeight; } }

	#region Bitmap dimensions.
/// <summary>
/// 
/// </summary>
private ushort _MaxGlyphWidth;

	/// <summary>
	/// 
	/// </summary>
	private ushort _MaxGlyphHeight;

	/// <summary>
	/// Number of elements in the font's charmap.
	/// </summary>
	public uint CharMapLength;

	/// <summary>
	/// Number of elements in the font's shadow charmap.
	/// </summary>
	public uint ShadowMapLength;

	/// <summary>
	/// Font style (used by font comparison functions).
	/// </summary>
	public FontStyle FontStyle;
	#endregion

	/// <summary>
	/// Font's BPP. = 4
	/// </summary>
	public byte BPP;

	/// <summary>
	/// Padding.
	/// </summary>
	public fixed byte Pad[3];
}
*/