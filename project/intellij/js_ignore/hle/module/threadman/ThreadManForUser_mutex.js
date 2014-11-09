///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var _manager = require('../../manager');
var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        this.context = context;
        this.sceKernelCreateMutex = createNativeFunction(0xB7D098C6, 150, 'int', 'string/int/int', this, function (name, attribute, options) {
            return -1;
        });
        this.sceKernelLockMutexCB = createNativeFunction(0x5BF4DD27, 150, 'int', 'int/int/void*', this, function (mutexId, count, timeout) {
            return -1;
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
//# sourceMappingURL=ThreadManForUser_mutex.js.map