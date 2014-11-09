///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var _structs = require('../structs');
var ScePspDateTime = _structs.ScePspDateTime;
var sceRtc = (function () {
    function sceRtc(context) {
        var _this = this;
        this.context = context;
        this.sceRtcGetCurrentTick = createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, function (tickPtr) {
            tickPtr.writeUInt64(_structs.ScePspDateTime.fromDate(new Date()).getTotalMicroseconds());
            return 0;
        });
        this.sceRtcGetDayOfWeek = createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, function (year, month, day) {
            return _this.context.rtc.getDayOfWeek(year, month, day);
        });
        this.sceRtcGetDaysInMonth = createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, function (year, month) {
            return _this.context.rtc.getDaysInMonth(year, month);
        });
        this.sceRtcGetTickResolution = createNativeFunction(0xC41C2853, 150, 'uint', 'void*', this, function (tickPtr) {
            return 1000000;
        });
        this.sceRtcSetTick = createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, function (datePtr, ticksPtr) {
            var ticks = ticksPtr.readInt64();
            datePtr.writeStruct(_structs.ScePspDateTime.struct, _structs.ScePspDateTime.fromTicks(ticks));
            return 0;
        });
        this.sceRtcGetTick = createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, function (datePtr, ticksPtr) {
            try {
                var date = _structs.ScePspDateTime.struct.read(datePtr);
                ticksPtr.writeUInt64(date.getTotalMicroseconds());
                return 0;
            }
            catch (e) {
                return 2147484158 /* ERROR_INVALID_VALUE */;
            }
        });
        this.sceRtcGetCurrentClock = createNativeFunction(0x4CFA57B0, 150, 'int', 'uint/int', this, function (dateAddress, timezone) {
            //var currentDate = this.context.rtc.getCurrentUnixMicroseconds();
            //currentDate += timezone * 60 * 1000000;
            var date = new Date();
            var pointer = _this.context.memory.getPointerPointer(ScePspDateTime.struct, dateAddress);
            pointer.write(ScePspDateTime.fromDate(new Date()));
            return 0;
        });
    }
    return sceRtc;
})();
exports.sceRtc = sceRtc;
//# sourceMappingURL=sceRtc.js.map