///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
_manager.Thread;
var createNativeFunction = _utils.createNativeFunction;
var Kernel_Library = (function () {
    function Kernel_Library(context) {
        var _this = this;
        this.context = context;
        this.sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, function () {
            return _this.context.interruptManager.suspend();
        });
        this.sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', 'Thread/uint', this, function (thread, flags) {
            _this.context.interruptManager.resume(flags);
            //return 0;
            //throw(new CpuBreakException());
            //thread.state.V0 = 0;
            //throw (new CpuBreakException());
            if (thread['sceKernelCpuResumeIntrCount'] === undefined)
                thread['sceKernelCpuResumeIntrCount'] = 0;
            thread['sceKernelCpuResumeIntrCount']++;
            if (thread['sceKernelCpuResumeIntrCount'] >= 3) {
                thread['sceKernelCpuResumeIntrCount'] = 0;
                return Promise.resolve(0);
            }
            else {
                return 0;
            }
        });
        this.sceKernelMemset = createNativeFunction(0xA089ECA4, 150, 'uint', 'uint/int/int', this, function (address, value, size) {
            _this.context.memory.memset(address, value, size);
            return address;
        });
        this.sceKernelMemcpy = createNativeFunction(0x1839852A, 150, 'uint', 'uint/uint/int', this, function (dst, src, size) {
            _this.context.memory.copy(src, dst, size);
            return dst;
        });
    }
    return Kernel_Library;
})();
exports.Kernel_Library = Kernel_Library;
//# sourceMappingURL=Kernel_Library.js.map