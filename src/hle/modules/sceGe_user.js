var hle;
(function (hle) {
    (function (modules) {
        var sceGe_user = (function () {
            function sceGe_user(context) {
                var _this = this;
                this.context = context;
                this.sceGeEdramGetAddr = hle.modules.createNativeFunction(0xE47E40E4, 150, 'uint', '', this, function () {
                    return 0x04000000;
                });
                this.sceGeSetCallback = hle.modules.createNativeFunction(0xA4FC06A4, 150, 'uint', 'int', this, function (callbackDataPtr) {
                    //console.warn('Not implemented sceGe_user.sceGeSetCallback');
                    return 0;
                });
                this.sceGeListEnQueue = hle.modules.createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, function (start, stall, callbackId, argsPtr) {
                    return _this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
                });
                this.sceGeListSync = hle.modules.createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, function (displayListId, syncType) {
                    //console.warn('Not implemented sceGe_user.sceGeListSync');
                    return _this.context.gpu.listSync(displayListId, syncType);
                });
                this.sceGeListUpdateStallAddr = hle.modules.createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, function (displayListId, stall) {
                    //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
                    return _this.context.gpu.updateStallAddr(displayListId, stall);
                });
                this.sceGeDrawSync = hle.modules.createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, function (syncType) {
                    //console.warn('Not implemented sceGe_user.sceGeDrawSync');
                    return _this.context.gpu.drawSync(syncType);
                });
            }
            return sceGe_user;
        })();
        modules.sceGe_user = sceGe_user;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceGe_user.js.map
