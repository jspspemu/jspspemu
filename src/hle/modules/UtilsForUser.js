var hle;
(function (hle) {
    (function (modules) {
        var UtilsForUser = (function () {
            function UtilsForUser(context) {
                this.context = context;
                this.sceKernelLibcTime = hle.modules.createNativeFunction(0x27CC57F0, 150, 'uint', '', this, function () {
                    //console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
                    return new Date().getTime() / 1000;
                });
                this.sceKernelUtilsMt19937Init = hle.modules.createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, function (memory, contextPtr, seed) {
                    console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
                    return 0;
                });
                this.sceKernelUtilsMt19937UInt = hle.modules.createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, function (memory, contextPtr) {
                    return Math.round(Math.random() * 0xFFFFFFFF);
                });
                this.sceKernelLibcGettimeofday = hle.modules.createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, function (timevalPtr, timezonePtr) {
                    if (timevalPtr) {
                        var seconds = new Date().getSeconds();
                        var microseconds = new Date().getMilliseconds() * 1000;
                        timevalPtr.writeInt32(seconds);
                        timevalPtr.writeInt32(microseconds);
                    }

                    if (timezonePtr) {
                        var minutesWest = 0;
                        var dstTime = 0;
                        timevalPtr.writeInt32(minutesWest);
                        timevalPtr.writeInt32(dstTime);
                    }

                    return 0;
                });
                this.sceKernelDcacheWritebackInvalidateRange = hle.modules.createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/int', this, function (pointer, size) {
                    return 0;
                });
                this.sceKernelDcacheWritebackAll = hle.modules.createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, function () {
                    return 0;
                });
            }
            return UtilsForUser;
        })();
        modules.UtilsForUser = UtilsForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=UtilsForUser.js.map
