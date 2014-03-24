var hle;
(function (hle) {
    (function (modules) {
        var sceImpose = (function () {
            function sceImpose(context) {
                this.context = context;
                this.sceImposeGetBatteryIconStatus = hle.modules.createNativeFunction(0x8C943191, 150, 'uint', 'void*/void*', this, function (isChargingPointer, iconStatusPointer) {
                    isChargingPointer.writeInt32(0);
                    iconStatusPointer.writeInt32(0);
                    return 0;
                });
            }
            return sceImpose;
        })();
        modules.sceImpose = sceImpose;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceImpose.js.map
