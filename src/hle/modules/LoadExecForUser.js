var hle;
(function (hle) {
    (function (modules) {
        var LoadExecForUser = (function () {
            function LoadExecForUser(context) {
                this.context = context;
                this.sceKernelExitGame = hle.modules.createNativeFunction(0xBD2F1094, 150, 'uint', 'HleThread', this, function (thread) {
                    console.info('sceKernelExitGame');
                    thread.stop();
                    throw (new CpuBreakException());
                    return 0;
                });
                this.sceKernelExitGame2 = hle.modules.createNativeFunction(0x05572A5F, 150, 'uint', 'EmulatorContext/CpuState', this, function (context, state) {
                    var thread = state.thread;
                    console.info('sceKernelExitGame');
                    thread.stop();
                    throw (new CpuBreakException());
                });
                this.sceKernelRegisterExitCallback = hle.modules.createNativeFunction(0x4AC57943, 150, 'uint', 'int', this, function (callbackId) {
                    console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
                    return 0;
                });
            }
            return LoadExecForUser;
        })();
        modules.LoadExecForUser = LoadExecForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=LoadExecForUser.js.map
