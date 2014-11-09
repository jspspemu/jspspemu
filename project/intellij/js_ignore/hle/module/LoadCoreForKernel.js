///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var LoadCoreForKernel = (function () {
    function LoadCoreForKernel(context) {
        var _this = this;
        this.context = context;
        this.sceKernelIcacheClearAll = createNativeFunction(0xD8779AC6, 150, 'void', '', this, function () {
            _this.context.instructionCache.invalidateAll();
        });
        this.sceKernelFindModuleByUID = createNativeFunction(0xCCE4A157, 150, 'int', 'int', this, function (moduleID) {
            console.warn('Not implemented sceKernelFindModuleByUID(' + moduleID + ')');
            return 0;
        });
    }
    return LoadCoreForKernel;
})();
exports.LoadCoreForKernel = LoadCoreForKernel;
//# sourceMappingURL=LoadCoreForKernel.js.map