var hle;
(function (hle) {
    (function (modules) {
        var InterruptManager = (function () {
            function InterruptManager(context) {
                this.context = context;
            }
            return InterruptManager;
        })();
        modules.InterruptManager = InterruptManager;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=InterruptManager.js.map
