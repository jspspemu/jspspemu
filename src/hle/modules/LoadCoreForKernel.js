var hle;
(function (hle) {
    (function (modules) {
        var LoadCoreForKernel = (function () {
            function LoadCoreForKernel(context) {
                this.context = context;
            }
            return LoadCoreForKernel;
        })();
        modules.LoadCoreForKernel = LoadCoreForKernel;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=LoadCoreForKernel.js.map
