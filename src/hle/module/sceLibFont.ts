import {UidCollection} from "../../global/utils";
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {F32, I32, nativeFunction, PTR, U32} from "../utils";

export class sceLibFont {
	constructor(private context: EmulatorContext) { }

	private fontLibUid = new UidCollection<FontLib>(1);
	private fontUid = new UidCollection<Font>(1);

	@nativeFunction(0x67F17ED7, 150)
    @U32 sceFontNewLib(@PTR paramsPtr: Stream, @PTR errorCodePtr: Stream) {
        const fontLib = new FontLib();
        return this.fontLibUid.allocate(fontLib);
	}

	@nativeFunction(0x099EF33C, 150)
    @U32 sceFontFindOptimumFont(@U32 fontLibId: number, @PTR fontStylePointer: Stream, @PTR errorCodePointer: Stream) {
        const fontLib = this.fontLibUid.get(fontLibId);
        return 0;
	}

	@nativeFunction(0xA834319D, 150)
    @U32 sceFontOpen(@I32 fontLibId: number, @I32 index: number, @I32 mode:number, @PTR errorCodePointer:Stream) {
        const fontLib = this.fontLibUid.get(fontLibId);
        return this.fontUid.allocate(new Font());
	}

	@nativeFunction(0x0DA7535E, 150)
	@U32 sceFontGetFontInfo(@I32 fontId: number, @PTR fontInfoPointer: Stream) {
        const font = this.fontUid.get(fontId);
        return 0;
	}

	@nativeFunction(0x48293280, 150)
	@U32 sceFontSetResolution(@I32 fontLibId: number, @F32 horizontalResolution: number, @F32 verticalResolution: number) {
		//const font = this.fontUid.get(fontId);
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