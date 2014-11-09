///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _memory = require('../../core/memory');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var UtilsForUser = (function () {
    function UtilsForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelLibcClock = createNativeFunction(0x91E4F6A7, 150, 'uint', '', this, function () {
            return _this.context.rtc.getClockMicroseconds();
        });
        this.sceKernelLibcTime = createNativeFunction(0x27CC57F0, 150, 'uint', 'void*', this, function (pointer) {
            //console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
            if (pointer == Stream.INVALID)
                return 0;
            var result = (_this.context.rtc.getCurrentUnixSeconds()) | 0;
            if (pointer)
                pointer.writeInt32(result);
            return result;
        });
        this.sceKernelGetGPI = createNativeFunction(0x37FB5C42, 150, 'uint', '', this, function () {
            return 0;
        });
        this.sceKernelUtilsMt19937Init = createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, function (memory, contextPtr, seed) {
            console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
            return 0;
        });
        this.sceKernelUtilsMt19937UInt = createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, function (memory, contextPtr) {
            return Math.round(Math.random() * 0xFFFFFFFF);
        });
        this.sceKernelLibcGettimeofday = createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, function (timevalPtr, timezonePtr) {
            if (timevalPtr) {
                var totalMilliseconds = Date.now();
                var totalSeconds = Math.floor(totalMilliseconds / 1000);
                var milliseconds = Math.floor(totalMilliseconds % 1000);
                var microseconds = milliseconds * 1000;
                timevalPtr.writeInt32(totalSeconds);
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
        this.sceKernelDcacheWritebackInvalidateRange = createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147483907 /* ERROR_INVALID_POINTER */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheWritebackRange = createNativeFunction(0x3EE30821, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147483907 /* ERROR_INVALID_POINTER */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheWritebackAll = createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, function () {
            _this.context.memory.invalidateDataAll.dispatch();
            return 0;
        });
        this.sceKernelDcacheInvalidateRange = createNativeFunction(0xBFA98062, 150, 'uint', 'uint/uint', this, function (pointer, size) {
            if (!MathUtils.isAlignedTo(size, 4))
                return 2147615820 /* ERROR_KERNEL_NOT_CACHE_ALIGNED */;
            //if (!this.context.memory.isValidAddress(pointer + size)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
            if (size > 0x7FFFFFFF)
                return 2147483908 /* ERROR_INVALID_SIZE */;
            if (pointer >= 0x80000000)
                return 2147614931 /* ERROR_KERNEL_ILLEGAL_ADDR */;
            if (!MathUtils.isAlignedTo(pointer, 4))
                return 2147615820 /* ERROR_KERNEL_NOT_CACHE_ALIGNED */;
            _this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
            return 0;
        });
        this.sceKernelDcacheWritebackInvalidateAll = createNativeFunction(0xB435DEC5, 150, 'uint', '', this, function () {
            _this.context.memory.invalidateDataAll.dispatch();
            return 0;
        });
        this.sceKernelSetGPO = createNativeFunction(0x6AD345D7, 150, 'uint', 'int', this, function (value) {
            return 0;
        });
    }
    return UtilsForUser;
})();
exports.UtilsForUser = UtilsForUser;
//# sourceMappingURL=UtilsForUser.js.map