var hle;
(function (hle) {
    (function (modules) {
        var sceNet = (function () {
            function sceNet(context) {
                this.context = context;
            }
            return sceNet;
        })();
        modules.sceNet = sceNet;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceNet.js.map
