///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var sceDmac = (function () {
    function sceDmac(context) {
        var _this = this;
        this.context = context;
        this.sceDmacMemcpy = createNativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
            return _this._sceDmacMemcpy(destination, source, size);
        });
        this.sceDmacTryMemcpy = createNativeFunction(0xD97F94D8, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
            return _this._sceDmacMemcpy(destination, source, size);
        });
    }
    sceDmac.prototype._sceDmacMemcpy = function (destination, source, size) {
        if (size == 0)
            return 2147483908 /* ERROR_INVALID_SIZE */;
        if (destination == 0)
            return 2147483907 /* ERROR_INVALID_POINTER */;
        if (source == 0)
            return 2147483907 /* ERROR_INVALID_POINTER */;
        this.context.memory.copy(source, destination, size);
        return Promise.resolve(0);
    };
    return sceDmac;
})();
exports.sceDmac = sceDmac;
//# sourceMappingURL=sceDmac.js.map