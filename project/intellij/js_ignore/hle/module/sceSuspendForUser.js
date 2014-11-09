///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var sceSuspendForUser = (function () {
    function sceSuspendForUser(context) {
        this.context = context;
        this.sceKernelPowerLock = createNativeFunction(0xEADB1BD7, 150, 'uint', 'uint', this, function (lockType) {
            if (lockType != 0)
                return 2147483911 /* ERROR_INVALID_MODE */;
            return 0;
        });
        this.sceKernelPowerUnlock = createNativeFunction(0x3AEE7261, 150, 'uint', 'uint', this, function (lockType) {
            if (lockType != 0)
                return 2147483911 /* ERROR_INVALID_MODE */;
            return 0;
        });
        this.sceKernelPowerTick = createNativeFunction(0x090CCB3F, 150, 'uint', 'uint', this, function (value) {
            // prevent screen from turning off!
            return 0;
        });
    }
    return sceSuspendForUser;
})();
exports.sceSuspendForUser = sceSuspendForUser;
//# sourceMappingURL=sceSuspendForUser.js.map