///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
_manager.Thread;
var _display = require('../../core/display');
var _pixelformat = require('../../core/pixelformat');
var createNativeFunction = _utils.createNativeFunction;
var PspDisplay = _display.PspDisplay;
var sceDisplay = (function () {
    function sceDisplay(context) {
        var _this = this;
        this.context = context;
        this.mode = 0;
        this.width = 512;
        this.height = 272;
        this.sceDisplaySetMode = createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, function (mode, width, height) {
            console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
            _this.mode = mode;
            _this.width = width;
            _this.height = height;
            return 0;
        }, { tryCatch: false });
        this.sceDisplayGetMode = createNativeFunction(0xDEA197D4, 150, 'uint', 'void*/void*/void*', this, function (modePtr, widthPtr, heightPtr) {
            if (modePtr)
                modePtr.writeInt32(_this.mode);
            if (widthPtr)
                widthPtr.writeInt32(_this.width);
            if (heightPtr)
                heightPtr.writeInt32(_this.height);
            return 0;
        }, { tryCatch: false });
        this.sceDisplayWaitVblank = createNativeFunction(0x36CDFADE, 150, 'uint', 'Thread/int', this, function (thread, cycleNum) {
            return _this._waitVblankAsync(thread, 0 /* NO */);
        }, { tryCatch: false });
        this.sceDisplayWaitVblankCB = createNativeFunction(0x8EB9EC49, 150, 'uint', 'Thread/int', this, function (thread, cycleNum) {
            return _this._waitVblankAsync(thread, 1 /* YES */);
        }, { tryCatch: false });
        this.sceDisplayWaitVblankStart = createNativeFunction(0x984C27E7, 150, 'uint', 'Thread', this, function (thread) {
            return _this._waitVblankStartAsync(thread, 0 /* NO */);
        }, { tryCatch: false });
        this.sceDisplayWaitVblankStartCB = createNativeFunction(0x46F186C3, 150, 'uint', 'Thread', this, function (thread) {
            return _this._waitVblankStartAsync(thread, 1 /* YES */);
        }, { tryCatch: false });
        this.sceDisplayGetVcount = createNativeFunction(0x9C6EAAD7, 150, 'int', '', this, function () {
            _this.context.display.updateTime();
            return _this.context.display.vblankCount;
        }, { tryCatch: false });
        this.sceDisplayGetFramePerSec = createNativeFunction(0xDBA6C4C4, 150, 'float', '', this, function () {
            return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
        }, { tryCatch: false });
        this.sceDisplayIsVblank = createNativeFunction(0x4D4E10EC, 150, 'int', '', this, function () {
            return (_this.context.display.secondsLeftForVblank == 0);
        }, { tryCatch: false });
        this.sceDisplaySetFrameBuf = createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, function (address, bufferWidth, pixelFormat, sync) {
            _this.context.display.address = address;
            _this.context.display.bufferWidth = bufferWidth;
            _this.context.display.pixelFormat = pixelFormat;
            _this.context.display.sync = sync;
            return 0;
        }, { tryCatch: false });
        this.sceDisplayGetFrameBuf = createNativeFunction(0xEEDA2E54, 150, 'uint', 'void*/void*/void*/void*', this, function (topaddrPtr, bufferWidthPtr, pixelFormatPtr, syncPtr) {
            if (topaddrPtr)
                topaddrPtr.writeInt32(_this.context.display.address);
            if (bufferWidthPtr)
                bufferWidthPtr.writeInt32(_this.context.display.bufferWidth);
            if (pixelFormatPtr)
                pixelFormatPtr.writeInt32(_this.context.display.pixelFormat);
            if (syncPtr)
                syncPtr.writeInt32(_this.context.display.sync);
            return 0;
        }, { tryCatch: false });
        this.sceDisplayGetCurrentHcount = createNativeFunction(0x773DD3A3, 150, 'uint', '', this, function () {
            _this.context.display.updateTime();
            return _this.context.display.hcountTotal;
        }, { tryCatch: false });
    }
    sceDisplay.prototype._waitVblankAsync = function (thread, acceptCallbacks) {
        this.context.display.updateTime();
        return new WaitingThreadInfo('_waitVblankAsync', this.context.display, this.context.display.waitVblankAsync(thread), acceptCallbacks);
    };
    sceDisplay.prototype._waitVblankStartAsync = function (thread, acceptCallbacks) {
        this.context.display.updateTime();
        return new WaitingThreadInfo('_waitVblankStartAsync', this.context.display, this.context.display.waitVblankStartAsync(thread), acceptCallbacks);
    };
    return sceDisplay;
})();
exports.sceDisplay = sceDisplay;
//# sourceMappingURL=sceDisplay.js.map