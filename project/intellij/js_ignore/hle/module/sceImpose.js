///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceImpose = (function () {
    function sceImpose(context) {
        var _this = this;
        this.context = context;
        this.sceImposeGetBatteryIconStatus = createNativeFunction(0x8C943191, 150, 'uint', 'void*/void*', this, function (isChargingPointer, iconStatusPointer) {
            isChargingPointer.writeInt32(0 /* NotCharging */);
            iconStatusPointer.writeInt32(3 /* FullyFilled */);
            return 0;
        });
        this.sceImposeSetLanguageMode = createNativeFunction(0x36AA6E91, 150, 'uint', 'uint/uint', this, function (language, buttonPreference) {
            _this.context.config.language = language;
            _this.context.config.buttonPreference = buttonPreference;
            return 0;
        });
        this.sceImposeGetLanguageMode = createNativeFunction(0x24FD7BCF, 150, 'uint', 'void*/void*', this, function (languagePtr, buttonPreferencePtr) {
            languagePtr.writeUInt32(_this.context.config.language);
            buttonPreferencePtr.writeUInt32(_this.context.config.buttonPreference);
            return 0;
        });
    }
    return sceImpose;
})();
exports.sceImpose = sceImpose;
var ChargingEnum;
(function (ChargingEnum) {
    ChargingEnum[ChargingEnum["NotCharging"] = 0] = "NotCharging";
    ChargingEnum[ChargingEnum["Charging"] = 1] = "Charging";
})(ChargingEnum || (ChargingEnum = {}));
var BatteryStatusEnum;
(function (BatteryStatusEnum) {
    BatteryStatusEnum[BatteryStatusEnum["VeryLow"] = 0] = "VeryLow";
    BatteryStatusEnum[BatteryStatusEnum["Low"] = 1] = "Low";
    BatteryStatusEnum[BatteryStatusEnum["PartiallyFilled"] = 2] = "PartiallyFilled";
    BatteryStatusEnum[BatteryStatusEnum["FullyFilled"] = 3] = "FullyFilled";
})(BatteryStatusEnum || (BatteryStatusEnum = {}));
//# sourceMappingURL=sceImpose.js.map