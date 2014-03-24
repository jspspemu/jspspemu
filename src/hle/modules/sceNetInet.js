var hle;
(function (hle) {
    (function (modules) {
        var sceNetInet = (function () {
            function sceNetInet(context) {
                this.context = context;
            }
            return sceNetInet;
        })();
        modules.sceNetInet = sceNetInet;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceNetInet.js.map
