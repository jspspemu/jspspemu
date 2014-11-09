///<reference path="../global.d.ts" />
var PspRtc = (function () {
    function PspRtc() {
    }
    PspRtc.prototype.getCurrentUnixSeconds = function () {
        return new Date().getTime() / 1000;
    };
    PspRtc.prototype.getCurrentUnixMicroseconds = function () {
        return new Date().getTime() * 1000;
    };
    PspRtc.prototype.getClockMicroseconds = function () {
        return (performance.now() * 1000) >>> 0;
    };
    PspRtc.prototype.getDayOfWeek = function (year, month, day) {
        return new Date(year, month - 1, day).getDay();
    };
    PspRtc.prototype.getDaysInMonth = function (year, month) {
        return new Date(year, month, 0).getDate();
    };
    return PspRtc;
})();
exports.PspRtc = PspRtc;
//# sourceMappingURL=rtc.js.map