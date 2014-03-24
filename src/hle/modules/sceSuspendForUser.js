var hle;
(function (hle) {
    (function (modules) {
        var sceSuspendForUser = (function () {
            function sceSuspendForUser(context) {
                this.context = context;
            }
            return sceSuspendForUser;
        })();
        modules.sceSuspendForUser = sceSuspendForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceSuspendForUser.js.map
