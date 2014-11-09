///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var _manager = require('../manager');
var _gpu = require('../../core/gpu');
_gpu.PspGpuCallback;
var PspGpuCallback = _gpu.PspGpuCallback;
var sceGe_user = (function () {
    function sceGe_user(context) {
        var _this = this;
        this.context = context;
        this.eDRAMMemoryWidth = 0;
        this.sceGeEdramSetAddrTranslation = createNativeFunction(0xB77905EA, 150, 'uint', 'int', this, function (size) {
            try {
                return _this.eDRAMMemoryWidth;
            }
            finally {
                _this.eDRAMMemoryWidth = size;
            }
        });
        this.sceGeSetCallback = createNativeFunction(0xA4FC06A4, 150, 'uint', 'Thread/void*', this, function (thread, callbackDataPtr) {
            var callbacks = _this.context.gpu.callbacks;
            var info = CallbackData.struct.read(callbackDataPtr);
            return callbacks.allocate(new PspGpuCallback(thread.state, info.signalFunction, info.signalArgument, info.finishFunction, info.finishArgument));
        });
        this.sceGeUnsetCallback = createNativeFunction(0x05DB22CE, 150, 'uint', 'int', this, function (callbackId) {
            _this.context.gpu.callbacks.remove(callbackId);
            return 0;
        });
        this.sceGeListEnQueue = createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, function (start, stall, callbackId, argsPtr) {
            return _this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
        });
        this.sceGeListSync = createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, function (displayListId, syncType) {
            //console.warn('Not implemented sceGe_user.sceGeListSync');
            return _this.context.gpu.listSync(displayListId, syncType);
        });
        this.sceGeListUpdateStallAddr = createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, function (displayListId, stall) {
            //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
            return _this.context.gpu.updateStallAddr(displayListId, stall);
        });
        this.sceGeDrawSync = createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, function (syncType) {
            var result = _this.context.gpu.drawSync(syncType);
            if (result instanceof Promise) {
                return new WaitingThreadInfo('sceGeDrawSync', _this.context.gpu, result, 0 /* NO */, 1 /* YES */);
            }
            else {
                return result;
            }
        });
        this.sceGeContinue = createNativeFunction(0x4C06E472, 150, 'uint', '', this, function () {
            return -1;
        });
        this.sceGeBreak = createNativeFunction(0xB448EC0D, 150, 'uint', 'int/void*', this, function (mode, breakAddress) {
            return -1;
        });
        this.sceGeEdramGetAddr = createNativeFunction(0xE47E40E4, 150, 'uint', '', this, function () {
            //console.warn('Not implemented sceGe_user.sceGeEdramGetAddr', 0x04000000);
            return 0x04000000;
        });
        this.sceGeEdramGetSize = createNativeFunction(0x1F6752AD, 150, 'uint', '', this, function () {
            //console.warn('Not implemented sceGe_user.sceGeEdramGetSize', 0x00200000);
            return 0x00200000; // 2MB
        });
    }
    return sceGe_user;
})();
exports.sceGe_user = sceGe_user;
var CallbackData = (function () {
    function CallbackData() {
    }
    CallbackData.struct = StructClass.create(CallbackData, [
        { signalFunction: UInt32 },
        { signalArgument: UInt32 },
        { finishFunction: UInt32 },
        { finishArgument: UInt32 },
    ]);
    return CallbackData;
})();
//# sourceMappingURL=sceGe_user.js.map