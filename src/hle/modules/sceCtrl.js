var hle;
(function (hle) {
    (function (modules) {
        var sceCtrl = (function () {
            function sceCtrl(context) {
                var _this = this;
                this.context = context;
                this.sceCtrlPeekBufferPositive = hle.modules.createNativeFunction(0x3A622550, 150, 'uint', 'void*/int', this, function (sceCtrlDataPtr, count) {
                    core.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);
                    return 0;
                });
                this.sceCtrlReadBufferPositive = hle.modules.createNativeFunction(0x1F803938, 150, 'uint', 'CpuState/void*/int', this, function (state, sceCtrlDataPtr, count) {
                    core.SceCtrlData.struct.write(sceCtrlDataPtr, _this.context.controller.data);

                    return _this.context.display.waitVblankAsync();
                });
                this.sceCtrlSetSamplingCycle = hle.modules.createNativeFunction(0x6A2774F3, 150, 'uint', 'int', this, function (samplingCycle) {
                    console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
                    return 0;
                });
                this.sceCtrlSetSamplingMode = hle.modules.createNativeFunction(0x1F4011E6, 150, 'uint', 'int', this, function (samplingMode) {
                    console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
                    return 0;
                });
            }
            return sceCtrl;
        })();
        modules.sceCtrl = sceCtrl;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceCtrl.js.map
