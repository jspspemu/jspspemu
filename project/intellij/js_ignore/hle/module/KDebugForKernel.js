///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var KDebugForKernel = (function () {
    function KDebugForKernel(context) {
        this.context = context;
        this.Kprintf = createNativeFunction(0x84F370BC, 150, 'void', 'string', this, function (format) {
            console.info('Kprintf: ' + format);
        });
    }
    return KDebugForKernel;
})();
exports.KDebugForKernel = KDebugForKernel;
//# sourceMappingURL=KDebugForKernel.js.map