///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var StdioForUser = (function () {
    function StdioForUser(context) {
        this.context = context;
        this.sceKernelStdin = createNativeFunction(0x172D316E, 150, 'int', '', this, function () { return 0; });
        this.sceKernelStdout = createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, function () { return 1; });
        this.sceKernelStderr = createNativeFunction(0xF78BA90A, 150, 'int', '', this, function () { return 2; });
    }
    return StdioForUser;
})();
exports.StdioForUser = StdioForUser;
//# sourceMappingURL=StdioForUser.js.map