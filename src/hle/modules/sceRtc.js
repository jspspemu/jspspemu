var hle;
(function (hle) {
    (function (modules) {
        var sceRtc = (function () {
            function sceRtc(context) {
                this.context = context;
                this.sceRtcGetCurrentTick = hle.modules.createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, function (tickPtr) {
                    tickPtr.writeInt32(new Date().getTime());
                    tickPtr.writeInt32(0);
                    return 0;
                });
                this.sceRtcGetDayOfWeek = hle.modules.createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, function (year, month, day) {
                    return new Date(year, month, day).getDay();
                });
                this.sceRtcGetDaysInMonth = hle.modules.createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, function (year, month) {
                    return new Date(year, month, 0).getDate();
                });
                this.sceRtcGetTickResolution = hle.modules.createNativeFunction(0xC41C2853, 150, 'uint', '', this, function (tickPtr) {
                    return 1000000;
                });
                this.sceRtcSetTick = hle.modules.createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, function (date, ticks) {
                    throw (new TypeError("Not implemented sceRtcSetTick"));
                });
                this.sceRtcGetTick = hle.modules.createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, function (date, ticks) {
                    throw (new TypeError("Not implemented sceRtcGetTick"));
                });
            }
            return sceRtc;
        })();
        modules.sceRtc = sceRtc;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceRtc.js.map
