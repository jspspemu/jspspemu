///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var ExceptionManagerForKernel = (function () {
    function ExceptionManagerForKernel(context) {
        this.context = context;
        this.sceKernelRegisterDefaultExceptionHandler = createNativeFunction(0x565C0B0E, 150, 'uint', 'uint', this, function (exceptionHandlerFunction) {
            return 0;
        });
    }
    return ExceptionManagerForKernel;
})();
exports.ExceptionManagerForKernel = ExceptionManagerForKernel;
//# sourceMappingURL=ExceptionManagerForKernel.js.map