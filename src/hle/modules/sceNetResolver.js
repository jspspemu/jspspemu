var hle;
(function (hle) {
    (function (modules) {
        var sceNetResolver = (function () {
            function sceNetResolver(context) {
                this.context = context;
            }
            return sceNetResolver;
        })();
        modules.sceNetResolver = sceNetResolver;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceNetResolver.js.map
