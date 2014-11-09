///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
_manager.Thread;
var _controller = require('../../core/controller');
var createNativeFunction = _utils.createNativeFunction;
var SceCtrlData = _controller.SceCtrlData;
var sceCtrl = (function () {
    function sceCtrl(context) {
        var _this = this;
        this.context = context;
        this.sceCtrlPeekBufferPositive = createNativeFunction(0x3A622550, 150, 'uint', 'void*/int', this, function (sceCtrlDataPtr, count) {
            for (var n = 0; n < count; n++)
                _controller.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);
            //return waitAsync(1).then(v => count);
            return count;
        });
        this.sceCtrlReadBufferPositive = createNativeFunction(0x1F803938, 150, 'uint', 'Thread/void*/int', this, function (thread, sceCtrlDataPtr, count) {
            //console.log('sceCtrlReadBufferPositive');
            for (var n = 0; n < count; n++)
                _controller.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);
            //return Promise.resolve(0);
            return new WaitingThreadInfo('sceCtrlReadBufferPositive', _this.context.display, _this.context.display.waitVblankStartAsync(thread).then(function (v) { return count; }), 0 /* NO */);
            //return 0;
        });
        this.sceCtrlSetSamplingCycle = createNativeFunction(0x6A2774F3, 150, 'uint', 'int', this, function (samplingCycle) {
            //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
            return 0;
        });
        this.sceCtrlSetSamplingMode = createNativeFunction(0x1F4011E6, 150, 'uint', 'int', this, function (samplingMode) {
            //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
            return 0;
        });
        this.lastLatchData = new SceCtrlData();
        this.sceCtrlReadLatch = createNativeFunction(0x0B588501, 150, 'uint', 'void*', this, function (currentLatchPtr) {
            try {
                return _this._peekLatch(currentLatchPtr);
            }
            finally {
                _this.lastLatchData = _this.context.controller.data;
                _this.context.controller.latchSamplingCount = 0;
            }
        });
        this.sceCtrlSetIdleCancelThreshold = createNativeFunction(0xA7144800, 150, 'uint', 'int/int', this, function (idlereset, idleback) {
            return 0;
        });
    }
    sceCtrl.prototype._peekLatch = function (currentLatchPtr) {
        var ButtonsNew = this.context.controller.data.buttons;
        var ButtonsOld = this.lastLatchData.buttons;
        var ButtonsChanged = ButtonsOld ^ ButtonsNew;
        currentLatchPtr.writeInt32(ButtonsNew & ButtonsChanged); // uiMake
        currentLatchPtr.writeInt32(ButtonsOld & ButtonsChanged); // uiBreak
        currentLatchPtr.writeInt32(ButtonsNew); // uiPress
        currentLatchPtr.writeInt32((ButtonsOld & ~ButtonsNew) & ButtonsChanged); // uiRelease
        return this.context.controller.latchSamplingCount;
    };
    return sceCtrl;
})();
exports.sceCtrl = sceCtrl;
//# sourceMappingURL=sceCtrl.js.map