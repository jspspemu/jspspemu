var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var core;
(function (core) {
    (function (PixelFormat) {
        PixelFormat[PixelFormat["NONE"] = -1] = "NONE";
        PixelFormat[PixelFormat["RGBA_5650"] = 0] = "RGBA_5650";
        PixelFormat[PixelFormat["RGBA_5551"] = 1] = "RGBA_5551";
        PixelFormat[PixelFormat["RGBA_4444"] = 2] = "RGBA_4444";
        PixelFormat[PixelFormat["RGBA_8888"] = 3] = "RGBA_8888";
        PixelFormat[PixelFormat["PALETTE_T4"] = 4] = "PALETTE_T4";
        PixelFormat[PixelFormat["PALETTE_T8"] = 5] = "PALETTE_T8";
        PixelFormat[PixelFormat["PALETTE_T16"] = 6] = "PALETTE_T16";
        PixelFormat[PixelFormat["PALETTE_T32"] = 7] = "PALETTE_T32";
        PixelFormat[PixelFormat["COMPRESSED_DXT1"] = 8] = "COMPRESSED_DXT1";
        PixelFormat[PixelFormat["COMPRESSED_DXT3"] = 9] = "COMPRESSED_DXT3";
        PixelFormat[PixelFormat["COMPRESSED_DXT5"] = 10] = "COMPRESSED_DXT5";
    })(core.PixelFormat || (core.PixelFormat = {}));
    var PixelFormat = core.PixelFormat;

    var BasePspDisplay = (function () {
        function BasePspDisplay() {
            this.address = core.Memory.DEFAULT_FRAME_ADDRESS;
        }
        return BasePspDisplay;
    })();
    core.BasePspDisplay = BasePspDisplay;

    var DummyPspDisplay = (function (_super) {
        __extends(DummyPspDisplay, _super);
        function DummyPspDisplay() {
            _super.call(this);
        }
        DummyPspDisplay.prototype.waitVblankAsync = function () {
            return new Promise(function (resolve) {
                setTimeout(resolve, 20);
            });
        };

        DummyPspDisplay.prototype.startAsync = function () {
            return Promise.resolve();
        };

        DummyPspDisplay.prototype.stopAsync = function () {
            return Promise.resolve();
        };
        return DummyPspDisplay;
    })(BasePspDisplay);
    core.DummyPspDisplay = DummyPspDisplay;

    var PspDisplay = (function (_super) {
        __extends(PspDisplay, _super);
        function PspDisplay(memory, canvas) {
            _super.call(this);
            this.memory = memory;
            this.canvas = canvas;
            this.vblank = new Signal();
            this.interval = -1;
            this.vblankCount = 0;
            this.context = this.canvas.getContext('2d');
            this.imageData = this.context.createImageData(512, 272);
        }
        PspDisplay.prototype.update = function () {
            if (!this.context || !this.imageData)
                return;

            var count = 0;

            var imageData = this.imageData;
            var w8 = imageData.data;

            var baseAddress = this.address & 0x0FFFFFFF;

            var from8 = this.memory.u8;
            var from16 = this.memory.u16;

            switch (this.pixelFormat) {
                default:
                case 3 /* RGBA_8888 */:
                    this.update8888(w8, from8, baseAddress);
                    break;
                case 1 /* RGBA_5551 */:
                    this.update5551(w8, from16, baseAddress >> 1);
                    break;
            }

            this.context.putImageData(imageData, 0, 0);
        };

        PspDisplay.prototype.update5551 = function (w8, from16, inn) {
            for (var n = 0; n < 512 * 272 * 4; n += 4) {
                var it = from16[inn++];
                w8[n + 0] = BitUtils.extractScale(it, 0, 5, 0xFF);
                w8[n + 1] = BitUtils.extractScale(it, 5, 5, 0xFF);
                w8[n + 2] = BitUtils.extractScale(it, 10, 5, 0xFF);
                w8[n + 3] = 0xFF;
            }
        };

        PspDisplay.prototype.update8888 = function (w8, from8, inn) {
            for (var n = 0; n < 512 * 272 * 4; n += 4) {
                w8[n + 0] = from8[inn + n + 0];
                w8[n + 1] = from8[inn + n + 1];
                w8[n + 2] = from8[inn + n + 2];
                w8[n + 3] = 0xFF;
            }
        };

        PspDisplay.prototype.startAsync = function () {
            var _this = this;
            //$(this.canvas).focus();
            this.interval = setInterval(function () {
                _this.vblankCount++;
                _this.update();
                _this.vblank.dispatch();
            }, 1000 / 59.999);
            return Promise.resolve();
        };

        PspDisplay.prototype.stopAsync = function () {
            clearInterval(this.interval);
            this.interval = -1;
            return Promise.resolve();
        };

        PspDisplay.prototype.waitVblankAsync = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.vblank.once(function () {
                    resolve(0);
                });
            });
        };
        return PspDisplay;
    })(BasePspDisplay);
    core.PspDisplay = PspDisplay;
})(core || (core = {}));
//# sourceMappingURL=display.js.map
