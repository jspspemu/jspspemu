var hle;
(function (hle) {
    (function (modules) {
        var sceAtrac3plus = (function () {
            function sceAtrac3plus(context) {
                this.context = context;
                this.sceAtracSetDataAndGetID = hle.modules.createNativeFunction(0x7A20E7AF, 150, 'uint', 'void*/int', this, function (dataPointer, dataLength) {
                    return 0;
                });
                this.sceAtracGetSecondBufferInfo = hle.modules.createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, function (id, puiPosition, puiDataByte) {
                    puiPosition.writeInt32(0);
                    puiDataByte.writeInt32(0);
                    return 0;
                });
            }
            return sceAtrac3plus;
        })();
        modules.sceAtrac3plus = sceAtrac3plus;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceAtrac3plus.js.map
