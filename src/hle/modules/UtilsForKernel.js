var hle;
(function (hle) {
    (function (modules) {
        var UtilsForKernel = (function () {
            function UtilsForKernel(context) {
                var _this = this;
                this.context = context;
                this.sceKernelIcacheInvalidateRange = hle.modules.createNativeFunction(0xC2DF770E, 150, 'void', 'uint/uint', this, function (address, size) {
                    _this.context.instructionCache.invalidateRange(address, address + size);
                });
            }
            return UtilsForKernel;
        })();
        modules.UtilsForKernel = UtilsForKernel;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=UtilsForKernel.js.map
