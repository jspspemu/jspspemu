///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
var _interrupt = require('../../core/interrupt');
var PspInterrupts = _interrupt.PspInterrupts;
var createNativeFunction = _utils.createNativeFunction;
var InterruptManager = (function () {
    function InterruptManager(context) {
        var _this = this;
        this.context = context;
        this.sceKernelRegisterSubIntrHandler = createNativeFunction(0xCA04A2B9, 150, 'uint', 'Thread/int/int/uint/uint', this, function (thread, interrupt, handlerIndex, callbackAddress, callbackArgument) {
            var interruptManager = _this.context.interruptManager;
            var interruptHandler = interruptManager.get(interrupt).get(handlerIndex);
            interruptHandler.address = callbackAddress;
            interruptHandler.argument = callbackArgument;
            interruptHandler.cpuState = thread.state;
            return 0;
        });
        this.sceKernelEnableSubIntr = createNativeFunction(0xFB8E22EC, 150, 'uint', 'int/int', this, function (interrupt, handlerIndex) {
            var interruptManager = _this.context.interruptManager;
            if (interrupt >= 67 /* PSP_NUMBER_INTERRUPTS */)
                return -1;
            if (!interruptManager.get(interrupt).has(handlerIndex))
                return -1;
            interruptManager.get(interrupt).get(handlerIndex).enabled = true;
            return 0;
        });
        this.sceKernelReleaseSubIntrHandler = createNativeFunction(0xD61E6961, 150, 'uint', 'int/int', this, function (pspInterrupt, handlerIndex) {
            var interruptManager = _this.context.interruptManager;
            if (pspInterrupt >= 67 /* PSP_NUMBER_INTERRUPTS */)
                return -1;
            if (!interruptManager.get(pspInterrupt).has(handlerIndex))
                return -1;
            interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
            return 0;
        });
        this.context.display.vblank.add(function () {
            //this.context.callbackManager.notify(
        });
    }
    return InterruptManager;
})();
exports.InterruptManager = InterruptManager;
//# sourceMappingURL=InterruptManager.js.map