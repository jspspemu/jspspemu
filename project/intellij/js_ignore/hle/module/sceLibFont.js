///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceLibFont = (function () {
    function sceLibFont(context) {
        var _this = this;
        this.context = context;
        this.fontLibUid = new UidCollection(1);
        this.fontUid = new UidCollection(1);
        this.sceFontNewLib = createNativeFunction(0x67F17ED7, 150, 'uint', 'void*/void*', this, function (paramsPtr, errorCodePtr) {
            var fontLib = new FontLib();
            return _this.fontLibUid.allocate(fontLib);
        });
        this.sceFontFindOptimumFont = createNativeFunction(0x099EF33C, 150, 'uint', 'int/void*/void*', this, function (fontLibId, fontStylePointer, errorCodePointer) {
            var fontLib = _this.fontLibUid.get(fontLibId);
            return 0;
        });
        this.sceFontOpen = createNativeFunction(0xA834319D, 150, 'uint', 'int/int/int/void*', this, function (fontLibId, index, mode, errorCodePointer) {
            var fontLib = _this.fontLibUid.get(fontLibId);
            return _this.fontUid.allocate(new Font());
        });
        this.sceFontGetFontInfo = createNativeFunction(0x0DA7535E, 150, 'uint', 'int/void*', this, function (fontId, fontInfoPointer) {
            var font = _this.fontUid.get(fontId);
            return 0;
        });
        this.sceFontSetResolution = createNativeFunction(0x48293280, 150, 'uint', 'int/float/float', this, function (fontLibId, horizontalResolution, verticalResolution) {
            //var font = this.fontUid.get(fontId);
            //FontLibrary.HorizontalResolution = HorizontalResolution;
            //FontLibrary.VerticalResolution = VerticalResolution;
            return 0;
        });
    }
    return sceLibFont;
})();
exports.sceLibFont = sceLibFont;
var FontLib = (function () {
    function FontLib() {
    }
    return FontLib;
})();
var Font = (function () {
    function Font() {
    }
    return Font;
})();
//# sourceMappingURL=sceLibFont.js.map