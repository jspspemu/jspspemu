var hle;
(function (hle) {
    (function (modules) {
        var sceWlanDrv = (function () {
            function sceWlanDrv(context) {
                this.context = context;
            }
            return sceWlanDrv;
        })();
        modules.sceWlanDrv = sceWlanDrv;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceWlanDrv.js.map
