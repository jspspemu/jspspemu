///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceHprm = (function () {
    function sceHprm(context) {
        this.context = context;
        this.sceHprmPeekCurrentKey = createNativeFunction(0x1910B327, 150, 'uint', 'void*', this, function (PspHprmKeysEnumKeyPtr) {
            PspHprmKeysEnumKeyPtr.writeInt32(0);
            return 0;
        });
    }
    return sceHprm;
})();
exports.sceHprm = sceHprm;
//# sourceMappingURL=sceHprm.js.map