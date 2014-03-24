var hle;
(function (hle) {
    (function (modules) {
        var sceNetApctl = (function () {
            function sceNetApctl(context) {
                this.context = context;
            }
            return sceNetApctl;
        })();
        modules.sceNetApctl = sceNetApctl;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceNetApctl.js.map
