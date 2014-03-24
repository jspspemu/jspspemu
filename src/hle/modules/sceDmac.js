var hle;
(function (hle) {
    (function (modules) {
        var sceDmac = (function () {
            function sceDmac(context) {
                var _this = this;
                this.context = context;
                this.sceDmacMemcpy = hle.modules.createNativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int', this, function (destination, source, size) {
                    _this.context.memory.copy(source, destination, size);
                    return 0;
                });
            }
            return sceDmac;
        })();
        modules.sceDmac = sceDmac;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceDmac.js.map
