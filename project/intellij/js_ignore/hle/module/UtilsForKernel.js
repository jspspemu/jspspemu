///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var UtilsForKernel = (function () {
    function UtilsForKernel(context) {
        var _this = this;
        this.context = context;
        this.sceKernelIcacheInvalidateRange = createNativeFunction(0xC2DF770E, 150, 'void', 'uint/uint', this, function (address, size) {
            _this.context.instructionCache.invalidateRange(address, address + size);
        });
    }
    return UtilsForKernel;
})();
exports.UtilsForKernel = UtilsForKernel;
//# sourceMappingURL=UtilsForKernel.js.map