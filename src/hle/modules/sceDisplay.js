var hle;
(function (hle) {
    (function (modules) {
        var sceDisplay = (function () {
            function sceDisplay(context) {
                var _this = this;
                this.context = context;
                this.sceDisplaySetMode = hle.modules.createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, function (mode, width, height) {
                    console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
                    return 0;
                });
                this.sceDisplayWaitVblank = hle.modules.createNativeFunction(0x36CDFADE, 150, 'uint', 'int', this, function (cycleNum) {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayWaitVblankCB = hle.modules.createNativeFunction(0x8EB9EC49, 150, 'uint', 'int', this, function (cycleNum) {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayWaitVblankStart = hle.modules.createNativeFunction(0x984C27E7, 150, 'uint', '', this, function () {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplayGetVcount = hle.modules.createNativeFunction(0x9C6EAAD7, 150, 'uint', '', this, function () {
                    return _this.context.display.vblankCount;
                });
                this.sceDisplayWaitVblankStartCB = hle.modules.createNativeFunction(0x46F186C3, 150, 'uint', '', this, function () {
                    return _this.context.display.waitVblankAsync();
                });
                this.sceDisplaySetFrameBuf = hle.modules.createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, function (address, bufferWidth, pixelFormat, sync) {
                    _this.context.display.address = address;
                    _this.context.display.bufferWidth = bufferWidth;
                    _this.context.display.pixelFormat = pixelFormat;
                    _this.context.display.sync = sync;
                    return 0;
                });
            }
            return sceDisplay;
        })();
        modules.sceDisplay = sceDisplay;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceDisplay.js.map
