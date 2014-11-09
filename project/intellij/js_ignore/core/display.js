///<reference path="../global.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var memory = require('./memory');
var pixelformat = require('./pixelformat');
var _interrupt = require('./interrupt');
var PspInterrupts = _interrupt.PspInterrupts;
var Memory = memory.Memory;
var PixelFormat = pixelformat.PixelFormat;
var PixelConverter = pixelformat.PixelConverter;
var BasePspDisplay = (function () {
    function BasePspDisplay() {
        this.address = Memory.DEFAULT_FRAME_ADDRESS;
        this.bufferWidth = 512;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.sync = 1;
    }
    return BasePspDisplay;
})();
exports.BasePspDisplay = BasePspDisplay;
var DummyPspDisplay = (function (_super) {
    __extends(DummyPspDisplay, _super);
    function DummyPspDisplay() {
        _super.call(this);
        this.vblankCount = 0;
        this.hcountTotal = 0;
        this.secondsLeftForVblank = 0.1;
        this.secondsLeftForVblankStart = 0.1;
        this.vblank = new Signal();
    }
    DummyPspDisplay.prototype.updateTime = function () {
    };
    DummyPspDisplay.prototype.waitVblankAsync = function (waiter) {
        return waiter.delayMicrosecondsAsync(20000, true);
    };
    DummyPspDisplay.prototype.waitVblankStartAsync = function (waiter) {
        return waiter.delayMicrosecondsAsync(20000, true);
    };
    DummyPspDisplay.prototype.setEnabledDisplay = function (enable) {
    };
    DummyPspDisplay.prototype.startAsync = function () {
        return Promise.resolve();
    };
    DummyPspDisplay.prototype.stopAsync = function () {
        return Promise.resolve();
    };
    return DummyPspDisplay;
})(BasePspDisplay);
exports.DummyPspDisplay = DummyPspDisplay;
var PspDisplay = (function (_super) {
    __extends(PspDisplay, _super);
    function PspDisplay(memory, interruptManager, canvas, webglcanvas) {
        _super.call(this);
        this.memory = memory;
        this.interruptManager = interruptManager;
        this.canvas = canvas;
        this.webglcanvas = webglcanvas;
        this.vblank = new Signal();
        this.interval = -1;
        this.enabled = true;
        this._hcount = 0;
        this.hcountTotal = 0;
        this.hcountCurrent = 0;
        this.vblankCount = 0;
        this.isInVblank = false;
        this.rowsLeftForVblank = 0;
        this.secondsLeftForVblank = 0;
        this.rowsLeftForVblankStart = 0;
        this.secondsLeftForVblankStart = 0;
        this.mustWaitVBlank = true;
        this.lastTimeVblank = 0;
        this.context = this.canvas.getContext('2d');
        this.imageData = this.context.createImageData(512, 272);
        this.setEnabledDisplay(true);
    }
    PspDisplay.prototype.getCurrentMs = function () {
        return performance.now();
    };
    PspDisplay.prototype.updateTime = function () {
        this.currentMs = this.getCurrentMs();
        this.elapsedSeconds = (this.currentMs - this.startTime) / 1000;
        this.hcountTotal = (this.elapsedSeconds * PspDisplay.HORIZONTAL_SYNC_HZ) | 0;
        this.hcountCurrent = (((this.elapsedSeconds % 1.00002) * PspDisplay.HORIZONTAL_SYNC_HZ) | 0) % PspDisplay.NUMBER_OF_ROWS;
        this.vblankCount = (this.elapsedSeconds * PspDisplay.VERTICAL_SYNC_HZ) | 0;
        //console.log(this.elapsedSeconds);
        if (this.hcountCurrent >= PspDisplay.VSYNC_ROW) {
            this.isInVblank = true;
            this.rowsLeftForVblank = 0;
            this.rowsLeftForVblankStart = (PspDisplay.NUMBER_OF_ROWS - this.hcountCurrent) + PspDisplay.VSYNC_ROW;
        }
        else {
            this.isInVblank = false;
            this.rowsLeftForVblank = PspDisplay.VSYNC_ROW - this.hcountCurrent;
            this.rowsLeftForVblankStart = this.rowsLeftForVblank;
        }
        this.secondsLeftForVblank = this.rowsLeftForVblank * PspDisplay.HORIZONTAL_SECONDS;
        this.secondsLeftForVblankStart = this.rowsLeftForVblankStart * PspDisplay.HORIZONTAL_SECONDS;
    };
    PspDisplay.prototype.update = function () {
        if (!this.context || !this.imageData)
            return;
        if (!this.enabled)
            return;
        var count = 512 * 272;
        var imageData = this.imageData;
        var w8 = imageData.data;
        var baseAddress = this.address & 0x0FFFFFFF;
        PixelConverter.decode(this.pixelFormat, this.memory.buffer, baseAddress, w8, 0, count, false);
        this.context.putImageData(imageData, 0, 0);
    };
    PspDisplay.prototype.setEnabledDisplay = function (enable) {
        this.enabled = enable;
        this.canvas.style.display = enable ? 'block' : 'none';
        this.webglcanvas.style.display = !enable ? 'block' : 'none';
    };
    PspDisplay.prototype.startAsync = function () {
        var _this = this;
        this.startTime = this.getCurrentMs();
        this.updateTime();
        //$(this.canvas).focus();
        this.interval = setInterval(function () {
            _this.updateTime();
            _this.vblankCount++;
            _this.update();
            _this.vblank.dispatch(_this.vblankCount);
            _this.interruptManager.interrupt(30 /* PSP_VBLANK_INT */);
        }, 1000 / PspDisplay.VERTICAL_SYNC_HZ);
        return Promise.resolve();
    };
    PspDisplay.prototype.stopAsync = function () {
        clearInterval(this.interval);
        this.interval = -1;
        return Promise.resolve();
    };
    //mustWaitVBlank = false;
    PspDisplay.prototype.checkVblankThrottle = function () {
        var currentTime = performance.now();
        if ((currentTime - this.lastTimeVblank) >= (PspDisplay.VERTICAL_SECONDS * 1000)) {
            this.lastTimeVblank = currentTime;
            return true;
        }
        return false;
    };
    PspDisplay.prototype.waitVblankAsync = function (waiter) {
        this.updateTime();
        if (!this.mustWaitVBlank)
            return Promise.resolve(0);
        if (this.checkVblankThrottle())
            return Promise.resolve(0);
        return waiter.delayMicrosecondsAsync(this.secondsLeftForVblank * 1000000, true);
    };
    PspDisplay.prototype.waitVblankStartAsync = function (waiter) {
        this.updateTime();
        if (!this.mustWaitVBlank)
            return Promise.resolve(0);
        if (this.checkVblankThrottle())
            return Promise.resolve(0);
        return waiter.delayMicrosecondsAsync(this.secondsLeftForVblankStart * 1000000, true);
    };
    PspDisplay.PROCESSED_PIXELS_PER_SECOND = 9000000; // hz
    PspDisplay.CYCLES_PER_PIXEL = 1;
    PspDisplay.PIXELS_IN_A_ROW = 525;
    PspDisplay.VSYNC_ROW = 272;
    //static VSYNC_ROW = 100;
    PspDisplay.NUMBER_OF_ROWS = 286;
    PspDisplay.HCOUNT_PER_VBLANK = 285.72;
    PspDisplay.HORIZONTAL_SYNC_HZ = (PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL) / PspDisplay.PIXELS_IN_A_ROW; // 17142.85714285714
    PspDisplay.HORIZONTAL_SECONDS = 1 / PspDisplay.HORIZONTAL_SYNC_HZ; // 5.8333333333333E-5
    PspDisplay.VERTICAL_SYNC_HZ = PspDisplay.HORIZONTAL_SYNC_HZ / PspDisplay.HCOUNT_PER_VBLANK; // 59.998800024
    PspDisplay.VERTICAL_SECONDS = 1 / PspDisplay.VERTICAL_SYNC_HZ; // 0.016667
    return PspDisplay;
})(BasePspDisplay);
exports.PspDisplay = PspDisplay;
//# sourceMappingURL=display.js.map