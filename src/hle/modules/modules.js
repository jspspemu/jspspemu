var ModuleMgrForUser = (function () {
    function ModuleMgrForUser(context) {
        this.context = context;
    }
    return ModuleMgrForUser;
})();

var StdioForUser = (function () {
    function StdioForUser(context) {
        this.context = context;
        this.sceKernelStdin = createNativeFunction(0x172D316E, 150, 'int', '', this, function () {
            return 10000001;
        });
        this.sceKernelStdout = createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, function () {
            return 10000002;
        });
        this.sceKernelStderr = createNativeFunction(0xF78BA90A, 150, 'int', '', this, function () {
            return 10000003;
        });
    }
    return StdioForUser;
})();

var SysMemUserForUser = (function () {
    function SysMemUserForUser(context) {
        this.context = context;
        this.sceKernelAllocPartitionMemory = createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, function (partitionId, name, type, size, address) {
            console.warn("Not implemented SysMemUserForUser.sceKernelAllocPartitionMemory");
            return 0;
        });
    }
    return SysMemUserForUser;
})();

var sceRtc = (function () {
    function sceRtc(context) {
        this.context = context;
        this.sceRtcGetCurrentTick = createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, function (tickPtr) {
            tickPtr.writeInt32(new Date().getTime());
            tickPtr.writeInt32(0);
            return 0;
        });
        this.sceRtcGetTickResolution = createNativeFunction(0xC41C2853, 150, 'uint', '', this, function (tickPtr) {
            return 1000000;
        });
    }
    return sceRtc;
})();

var scePower = (function () {
    function scePower(context) {
        var _this = this;
        this.context = context;
        this.cpuFreq = 222;
        this.scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, function () {
            return _this.cpuFreq;
        });
    }
    return scePower;
})();
//# sourceMappingURL=modules.js.map
