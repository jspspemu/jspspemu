///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceWlanDrv = (function () {
    function sceWlanDrv(context) {
        this.context = context;
        this.sceWlanGetSwitchState = createNativeFunction(0xD7763699, 150, 'bool', '', this, function () {
            return true;
        });
    }
    return sceWlanDrv;
})();
exports.sceWlanDrv = sceWlanDrv;
//# sourceMappingURL=sceWlanDrv.js.map