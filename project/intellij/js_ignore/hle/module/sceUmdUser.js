///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var sceUmdUser = (function () {
    function sceUmdUser(context) {
        var _this = this;
        this.context = context;
        this.callbackIds = [];
        this.signal = new Signal();
        this.sceUmdRegisterUMDCallBack = createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, function (callbackId) {
            _this.callbackIds.push(callbackId);
            return 0;
        });
        this.sceUmdUnRegisterUMDCallBack = createNativeFunction(0xBD2BDE07, 150, 'uint', 'int', this, function (callbackId) {
            if (!_this.callbackIds.contains(callbackId))
                return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;
            _this.callbackIds.remove(callbackId);
            return 0;
        });
        this.sceUmdCheckMedium = createNativeFunction(0x46EBB729, 150, 'uint', '', this, function () {
            return 1 /* Inserted */;
        });
        this.sceUmdWaitDriveStat = createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, function (pspUmdState) {
            return _this._sceUmdWaitDriveStat(pspUmdState, 0 /* NO */);
        });
        this.sceUmdWaitDriveStatCB = createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint/uint', this, function (pspUmdState, timeout) {
            return _this._sceUmdWaitDriveStat(pspUmdState, 1 /* YES */);
        });
        this.sceUmdActivate = createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, function (mode, drive) {
            _this._notify(32 /* PSP_UMD_READABLE */ | 16 /* PSP_UMD_READY */ | 2 /* PSP_UMD_PRESENT */);
            return 0;
        });
        this.sceUmdDeactivate = createNativeFunction(0xE83742BA, 150, 'uint', 'int/string', this, function (mode, drive) {
            _this._notify(32 /* PSP_UMD_READABLE */ | 16 /* PSP_UMD_READY */ | 2 /* PSP_UMD_PRESENT */);
            return 0;
        });
        this.sceUmdGetDriveStat = createNativeFunction(0x6B4A146C, 150, 'uint', '', this, function () {
            return 2 /* PSP_UMD_PRESENT */ | 16 /* PSP_UMD_READY */ | 32 /* PSP_UMD_READABLE */;
        });
        this.sceUmdWaitDriveStatWithTimer = createNativeFunction(0x56202973, 150, 'uint', 'uint/uint', this, function (state, timeout) {
            return Promise.resolve(0);
        });
        this.sceUmdGetErrorStat = createNativeFunction(0x20628E6F, 150, 'uint', '', this, function () {
            console.warn('called sceUmdGetErrorStat!');
            return Promise.resolve(0);
        });
    }
    sceUmdUser.prototype._sceUmdWaitDriveStat = function (pspUmdState, acceptCallbacks) {
        this.context.callbackManager.executePendingWithinThread(this.context.threadManager.current);
        return 0;
        /*
        return new WaitingThreadInfo('sceUmdWaitDriveStatCB', this, new Promise((resolve, reject) => {
            var signalCallback = this.signal.add((result) => {
                this.signal.remove(signalCallback);
                resolve();
            });
        }), AcceptCallbacks.YES);
        */
    };
    sceUmdUser.prototype._notify = function (data) {
        var _this = this;
        this.signal.dispatch(data);
        this.callbackIds.forEach(function (callbackId) {
            //var state = this.context.threadManager.current.state;
            _this.context.callbackManager.notify(callbackId, data);
        });
    };
    return sceUmdUser;
})();
exports.sceUmdUser = sceUmdUser;
var UmdCheckMedium;
(function (UmdCheckMedium) {
    UmdCheckMedium[UmdCheckMedium["NoDisc"] = 0] = "NoDisc";
    UmdCheckMedium[UmdCheckMedium["Inserted"] = 1] = "Inserted";
})(UmdCheckMedium || (UmdCheckMedium = {}));
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
//# sourceMappingURL=sceUmdUser.js.map