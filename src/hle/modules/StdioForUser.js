var hle;
(function (hle) {
    (function (modules) {
        var StdioForUser = (function () {
            function StdioForUser(context) {
                this.context = context;
                this.sceKernelStdin = hle.modules.createNativeFunction(0x172D316E, 150, 'int', '', this, function () {
                    return 10000001;
                });
                this.sceKernelStdout = hle.modules.createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, function () {
                    return 10000002;
                });
                this.sceKernelStderr = hle.modules.createNativeFunction(0xF78BA90A, 150, 'int', '', this, function () {
                    return 10000003;
                });
            }
            return StdioForUser;
        })();
        modules.StdioForUser = StdioForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=StdioForUser.js.map
