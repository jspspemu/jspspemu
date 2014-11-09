///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var _manager = require('../../manager');
_manager.Thread;
var Callback = _manager.Callback;
var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelCreateCallback = createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, function (name, functionCallbackAddr, argument) {
            return _this.context.callbackManager.register(new Callback(name, functionCallbackAddr, argument));
        });
        this.sceKernelDeleteCallback = createNativeFunction(0xEDBA5844, 150, 'uint', 'int', this, function (callbackId) {
            _this.context.callbackManager.remove(callbackId);
        });
        /**
         * Run all peding callbacks and return if executed any.
         * Callbacks cannot be executed inside a interrupt.
         * @return 0 no reported callbacks; 1 reported callbacks which were executed successfully.
         */
        this.sceKernelCheckCallback = createNativeFunction(0x349D6D6C, 150, 'uint', 'Thread', this, function (thread) {
            //console.warn('Not implemented ThreadManForUser.sceKernelCheckCallback');
            return _this.context.callbackManager.executePendingWithinThread(thread) ? 1 : 0;
        });
        this.sceKernelNotifyCallback = createNativeFunction(0xC11BA8C4, 150, 'uint', 'Thread/int/int', this, function (thread, callbackId, argument2) {
            return _this.context.callbackManager.notify(callbackId, argument2);
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
//# sourceMappingURL=ThreadManForUser_callbacks.js.map