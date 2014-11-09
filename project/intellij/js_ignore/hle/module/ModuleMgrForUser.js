///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
var createNativeFunction = _utils.createNativeFunction;
var ModuleMgrForUser = (function () {
    function ModuleMgrForUser(context) {
        var _this = this;
        this.context = context;
        this.sceKernelStopModule = createNativeFunction(0xD1FF982A, 150, 'uint', '', this, function () {
            return 0;
        });
        this.sceKernelUnloadModule = createNativeFunction(0x2E0911AA, 150, 'uint', 'int', this, function (id) {
            return 0;
        });
        this.sceKernelSelfStopUnloadModule = createNativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int/Thread', this, function (unknown, argsize, argp, thread) {
            console.info("Call stack:");
            thread.state.printCallstack(_this.context.symbolLookup);
            //this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
            throw (new Error("sceKernelSelfStopUnloadModule"));
            return 0;
        });
        this.sceKernelStopUnloadSelfModule = createNativeFunction(0xCC1D3699, 150, 'uint', 'int/int/int/Thread', this, function (argsize, argp, optionsAddress, thread) {
            throw (new Error("sceKernelStopUnloadSelfModule"));
            return 0;
        });
        this.sceKernelLoadModule = createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, function (path, flags, sceKernelLMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule("%s", %d)', path, flags));
            return 0x08900000;
        });
        this.sceKernelStartModule = createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, function (moduleId, argumentSize, argumentPointer, status, sceKernelSMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
            return 0;
        });
        this.sceKernelGetModuleIdByAddress = createNativeFunction(0xD8B73127, 150, 'uint', 'uint', this, function (address) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
            return 3;
        });
        this.sceKernelGetModuleId = createNativeFunction(0xF0A26395, 150, 'uint', '', this, function () {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleId()'));
            return 4; // TODO!
        });
        this.sceKernelLoadModuleByID = createNativeFunction(0xB7F46618, 150, 'uint', 'uint/uint/void*', this, function (fileId, flags, sceKernelLMOption) {
            console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModuleByID(%d, %08X)', fileId, flags));
            return 0;
        });
    }
    return ModuleMgrForUser;
})();
exports.ModuleMgrForUser = ModuleMgrForUser;
//# sourceMappingURL=ModuleMgrForUser.js.map