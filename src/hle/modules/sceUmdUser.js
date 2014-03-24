var hle;
(function (hle) {
    (function (modules) {
        var sceUmdUser = (function () {
            function sceUmdUser(context) {
                this.context = context;
                this.sceUmdRegisterUMDCallBack = hle.modules.createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, function (callbackId) {
                    console.warn('Not implemented sceUmdRegisterUMDCallBack');
                    return 0;
                });
                this.sceUmdCheckMedium = hle.modules.createNativeFunction(0x46EBB729, 150, 'uint', '', this, function () {
                    console.warn('Not implemented sceUmdCheckMedium');
                    return 0;
                });
                this.sceUmdWaitDriveStat = hle.modules.createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, function (pspUmdState) {
                    console.warn('Not implemented sceUmdWaitDriveStat');
                    return 0;
                });
                this.sceUmdWaitDriveStatCB = hle.modules.createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint', this, function (pspUmdState, timeout) {
                    console.warn('Not implemented sceUmdWaitDriveStatCB');
                    return 0;
                });
                this.sceUmdActivate = hle.modules.createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, function (mode, drive) {
                    console.warn('Not implemented sceUmdActivate');
                    return 0;
                });
                this.sceUmdGetDriveStat = hle.modules.createNativeFunction(0x6B4A146C, 150, 'uint', '', this, function () {
                    return 2 /* PSP_UMD_PRESENT */ | 16 /* PSP_UMD_READY */ | 32 /* PSP_UMD_READABLE */;
                });
            }
            return sceUmdUser;
        })();
        modules.sceUmdUser = sceUmdUser;

        var PspUmdState;
        (function (PspUmdState) {
            PspUmdState[PspUmdState["PSP_UMD_INIT"] = 0x00] = "PSP_UMD_INIT";
            PspUmdState[PspUmdState["PSP_UMD_NOT_PRESENT"] = 0x01] = "PSP_UMD_NOT_PRESENT";
            PspUmdState[PspUmdState["PSP_UMD_PRESENT"] = 0x02] = "PSP_UMD_PRESENT";
            PspUmdState[PspUmdState["PSP_UMD_CHANGED"] = 0x04] = "PSP_UMD_CHANGED";
            PspUmdState[PspUmdState["PSP_UMD_NOT_READY"] = 0x08] = "PSP_UMD_NOT_READY";
            PspUmdState[PspUmdState["PSP_UMD_READY"] = 0x10] = "PSP_UMD_READY";
            PspUmdState[PspUmdState["PSP_UMD_READABLE"] = 0x20] = "PSP_UMD_READABLE";
        })(PspUmdState || (PspUmdState = {}));
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceUmdUser.js.map
