///<reference path="../global.d.ts" />
var InterruptHandler = (function () {
    function InterruptHandler(no) {
        this.no = no;
        this.enabled = false;
        this.address = 0;
        this.argument = 0;
        this.cpuState = null;
    }
    return InterruptHandler;
})();
exports.InterruptHandler = InterruptHandler;
var InterruptHandlers = (function () {
    function InterruptHandlers(pspInterrupt) {
        this.pspInterrupt = pspInterrupt;
        this.handlers = {};
    }
    InterruptHandlers.prototype.get = function (handlerIndex) {
        if (!this.handlers[handlerIndex])
            this.handlers[handlerIndex] = new InterruptHandler(handlerIndex);
        return this.handlers[handlerIndex];
    };
    InterruptHandlers.prototype.remove = function (handlerIndex) {
        delete this.handlers[handlerIndex];
    };
    InterruptHandlers.prototype.has = function (handlerIndex) {
        return (this.handlers[handlerIndex] !== undefined);
    };
    return InterruptHandlers;
})();
exports.InterruptHandlers = InterruptHandlers;
var InterruptManager = (function () {
    function InterruptManager() {
        this.enabled = true;
        this.flags = 0xFFFFFFFF;
        this.interruptHandlers = {};
        this.event = new Signal();
        this.queue = [];
    }
    InterruptManager.prototype.suspend = function () {
        var currentFlags = this.flags;
        this.flags = 0;
        this.enabled = false;
        return currentFlags;
    };
    InterruptManager.prototype.resume = function (value) {
        this.flags = value;
        this.enabled = true;
    };
    InterruptManager.prototype.get = function (pspInterrupt) {
        if (!this.interruptHandlers[pspInterrupt])
            this.interruptHandlers[pspInterrupt] = new InterruptHandlers(pspInterrupt);
        return this.interruptHandlers[pspInterrupt];
    };
    InterruptManager.prototype.interrupt = function (pspInterrupt) {
        var interrupt = this.get(pspInterrupt);
        var handlers = interrupt.handlers;
        for (var n in handlers) {
            var handler = handlers[n];
            if (handler.enabled) {
                //debugger;
                this.queue.push(handler);
                this.execute(null);
            }
        }
    };
    InterruptManager.prototype.execute = function (_state) {
        while (this.queue.length > 0) {
            var item = this.queue.shift();
            var state = item.cpuState;
            state.preserveRegisters(function () {
                state.gpr[4] = item.no;
                state.gpr[5] = item.argument;
                state.callPCSafe(item.address);
            });
        }
        //state.callPCSafe();
    };
    return InterruptManager;
})();
exports.InterruptManager = InterruptManager;
(function (PspInterrupts) {
    PspInterrupts[PspInterrupts["PSP_GPIO_INT"] = 4] = "PSP_GPIO_INT";
    PspInterrupts[PspInterrupts["PSP_ATA_INT"] = 5] = "PSP_ATA_INT";
    PspInterrupts[PspInterrupts["PSP_UMD_INT"] = 6] = "PSP_UMD_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM0_INT"] = 7] = "PSP_MSCM0_INT";
    PspInterrupts[PspInterrupts["PSP_WLAN_INT"] = 8] = "PSP_WLAN_INT";
    PspInterrupts[PspInterrupts["PSP_AUDIO_INT"] = 10] = "PSP_AUDIO_INT";
    PspInterrupts[PspInterrupts["PSP_I2C_INT"] = 12] = "PSP_I2C_INT";
    PspInterrupts[PspInterrupts["PSP_SIRCS_INT"] = 14] = "PSP_SIRCS_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER0_INT"] = 15] = "PSP_SYSTIMER0_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER1_INT"] = 16] = "PSP_SYSTIMER1_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER2_INT"] = 17] = "PSP_SYSTIMER2_INT";
    PspInterrupts[PspInterrupts["PSP_SYSTIMER3_INT"] = 18] = "PSP_SYSTIMER3_INT";
    PspInterrupts[PspInterrupts["PSP_THREAD0_INT"] = 19] = "PSP_THREAD0_INT";
    PspInterrupts[PspInterrupts["PSP_NAND_INT"] = 20] = "PSP_NAND_INT";
    PspInterrupts[PspInterrupts["PSP_DMACPLUS_INT"] = 21] = "PSP_DMACPLUS_INT";
    PspInterrupts[PspInterrupts["PSP_DMA0_INT"] = 22] = "PSP_DMA0_INT";
    PspInterrupts[PspInterrupts["PSP_DMA1_INT"] = 23] = "PSP_DMA1_INT";
    PspInterrupts[PspInterrupts["PSP_MEMLMD_INT"] = 24] = "PSP_MEMLMD_INT";
    PspInterrupts[PspInterrupts["PSP_GE_INT"] = 25] = "PSP_GE_INT";
    PspInterrupts[PspInterrupts["PSP_VBLANK_INT"] = 30] = "PSP_VBLANK_INT";
    PspInterrupts[PspInterrupts["PSP_MECODEC_INT"] = 31] = "PSP_MECODEC_INT";
    PspInterrupts[PspInterrupts["PSP_HPREMOTE_INT"] = 36] = "PSP_HPREMOTE_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM1_INT"] = 60] = "PSP_MSCM1_INT";
    PspInterrupts[PspInterrupts["PSP_MSCM2_INT"] = 61] = "PSP_MSCM2_INT";
    PspInterrupts[PspInterrupts["PSP_THREAD1_INT"] = 65] = "PSP_THREAD1_INT";
    PspInterrupts[PspInterrupts["PSP_INTERRUPT_INT"] = 66] = "PSP_INTERRUPT_INT";
    PspInterrupts[PspInterrupts["PSP_NUMBER_INTERRUPTS"] = 67] = "PSP_NUMBER_INTERRUPTS";
})(exports.PspInterrupts || (exports.PspInterrupts = {}));
var PspInterrupts = exports.PspInterrupts;
//# sourceMappingURL=interrupt.js.map