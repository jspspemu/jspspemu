var hle;
(function (hle) {
    (function (modules) {
        var Kernel_Library = (function () {
            function Kernel_Library(context) {
                this.context = context;
                this.sceKernelCpuSuspendIntr = hle.modules.createNativeFunction(0x092968F4, 150, 'uint', '', this, function () {
                    console.warn(sprintf("sceKernelCpuSuspendIntr not implemented"));
                    return 0;
                });
                this.sceKernelCpuResumeIntr = hle.modules.createNativeFunction(0x5F10D406, 150, 'uint', '', this, function (flags) {
                    console.warn(sprintf("sceKernelCpuResumeIntr not implemented"));
                    return 0;
                });
            }
            return Kernel_Library;
        })();
        modules.Kernel_Library = Kernel_Library;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=Kernel_Library.js.map
