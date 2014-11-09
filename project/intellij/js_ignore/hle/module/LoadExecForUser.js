///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var _manager = require('../manager');
var console = logger.named('module.LoadExecForUser');
var LoadExecForUser = (function () {
    function LoadExecForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelExitGame = createNativeFunction(0xBD2F1094, 150, 'uint', 'Thread', this, function (thread) {
            console.info('sceKernelExitGame');
            thread.stop('sceKernelExitGame');
            _this.context.threadManager.exitGame();
            throw (new CpuBreakException());
            return 0;
        });
        this.sceKernelExitGame2 = createNativeFunction(0x05572A5F, 150, 'uint', 'Thread', this, function (thread) {
            console.info("Call stack:");
            thread.state.printCallstack(_this.context.symbolLookup);
            //this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
            console.info('sceKernelExitGame2');
            _this.context.threadManager.exitGame();
            thread.stop('sceKernelExitGame2');
            throw (new CpuBreakException());
        });
        this.sceKernelRegisterExitCallback = createNativeFunction(0x4AC57943, 150, 'uint', 'int', this, function (callbackId) {
            //console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
            return 0;
        });
    }
    return LoadExecForUser;
})();
exports.LoadExecForUser = LoadExecForUser;
//# sourceMappingURL=LoadExecForUser.js.map