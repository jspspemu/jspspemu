var hle;
(function (hle) {
    (function (modules) {
        var scePower = (function () {
            function scePower(context) {
                var _this = this;
                this.context = context;
                this.cpuFreq = 222;
                this.scePowerGetCpuClockFrequencyInt = hle.modules.createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, function () {
                    return _this.cpuFreq;
                });
                this.scePowerRegisterCallback = hle.modules.createNativeFunction(0x04B7766E, 150, 'int', '', this, function (slotIndex, callbackId) {
                    console.warn("Not implemented scePowerRegisterCallback");
                    return 0;
                });
            }
            return scePower;
        })();
        modules.scePower = scePower;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=scePower.js.map
