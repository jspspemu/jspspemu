var hle;
(function (hle) {
    (function (modules) {
        var ModuleMgrForUser = (function () {
            function ModuleMgrForUser(context) {
                this.context = context;
                this.sceKernelSelfStopUnloadModule = hle.modules.createNativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int', this, function (unknown, argsize, argp) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
                    return 0;
                });
                this.sceKernelLoadModule = hle.modules.createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, function (path, flags, sceKernelLMOption) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule(%s, %d)', path, flags));
                    return 0;
                });
                this.sceKernelStartModule = hle.modules.createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, function (moduleId, argumentSize, argumentPointer, status, sceKernelSMOption) {
                    console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
                    return 0;
                });
            }
            return ModuleMgrForUser;
        })();
        modules.ModuleMgrForUser = ModuleMgrForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=ModuleMgrForUser.js.map
