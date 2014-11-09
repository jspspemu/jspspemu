///<reference path="../../global.d.ts" />
var _cpu = require('../../core/cpu');
_cpu.CpuState;
var Interop = (function () {
    function Interop() {
    }
    Interop.prototype.execute = function (state, address, gprArray) {
        state.preserveRegisters(function () {
            state.setRA(0x1234);
            for (var n = 0; n < gprArray.length; n++) {
                state.gpr[4 + n] = gprArray[n];
            }
            state.callPCSafe(address);
        });
    };
    return Interop;
})();
exports.Interop = Interop;
//# sourceMappingURL=interop.js.map