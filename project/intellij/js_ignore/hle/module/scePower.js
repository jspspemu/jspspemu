///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var scePower = (function () {
    function scePower(context) {
        var _this = this;
        this.context = context;
        // 222/111
        // 333/166
        this.cpuMult = 511; // 222mhz
        this.pllFreq = 222;
        this.busFreq = 111; // MAX BUS: 166
        this.scePowerRegisterCallback = createNativeFunction(0x04B7766E, 150, 'int', 'int/int', this, function (slotIndex, callbackId) {
            _this.context.callbackManager.notify(callbackId, 128 /* BATTERY_EXIST */);
            return 0;
        });
        this.scePowerUnregitserCallback = createNativeFunction(0xDB9D28DD, 150, 'int', 'int', this, function (slotIndex) {
            return 0;
        });
        this.scePowerUnregisterCallback = createNativeFunction(0xDFA8BAF8, 150, 'int', 'int', this, function (slotIndex) {
            return 0;
        });
        this.scePowerSetClockFrequency = createNativeFunction(0x737486F2, 150, 'int', 'int/int/int', this, function (pllFreq, cpuFreq, busFreq) {
            return _this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
        });
        this.scePowerSetClockFrequency2 = createNativeFunction(0xEBD177D6, 150, 'int', 'int/int/int', this, function (pllFreq, cpuFreq, busFreq) {
            return _this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
        });
        this.scePowerSetClockFrequency3 = createNativeFunction(0x469989AD, 150, 'int', 'int/int/int', this, function (pllFreq, cpuFreq, busFreq) {
            return _this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
        });
        this.scePowerGetCpuClockFrequency = createNativeFunction(0xFEE03A2F, 150, 'int', '', this, function () { return _this._getCpuFreq(); });
        this.scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, function () { return _this._getCpuFreq(); });
        this.scePowerGetCpuClockFrequencyFloat = createNativeFunction(0xB1A52C83, 150, 'float', '', this, function () { return _this._getCpuFreq(); });
        this.scePowerGetBusClockFrequency = createNativeFunction(0x478FE6F5, 150, 'int', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetBusClockFrequencyInt = createNativeFunction(0xBD681969, 150, 'int', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetBusClockFrequencyFloat = createNativeFunction(0x9BADB3EB, 150, 'float', '', this, function () {
            return _this.busFreq;
        });
        this.scePowerGetPllClockFrequencyInt = createNativeFunction(0x34F9C463, 150, 'int', '', this, function () {
            return _this.pllFreq;
        });
        this.scePowerGetPllClockFrequencyFloat = createNativeFunction(0xEA382A27, 150, 'float', '', this, function () {
            return _this.pllFreq;
        });
        this.scePowerSetBusClockFrequency = createNativeFunction(0xB8D7B3FB, 150, 'int', 'int', this, function (busFreq) {
            if (!_this._isValidBusFreq(busFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            //this.busFreq = busFreq;
            _this.busFreq = 111;
            return 0;
        });
        this.scePowerSetCpuClockFrequency = createNativeFunction(0x843FBF43, 150, 'int', 'int', this, function (cpuFreq) {
            if (!_this._isValidCpuFreq(cpuFreq))
                return 2147484158 /* ERROR_INVALID_VALUE */;
            _this._setCpuFreq(cpuFreq);
            return 0;
        });
        this.scePowerGetBatteryLifePercent = createNativeFunction(0x2085D15D, 150, 'int', '', this, function () {
            return 100;
        });
        this.scePowerIsPowerOnline = createNativeFunction(0x87440F5E, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerIsBatteryExist = createNativeFunction(0x0AFD0D8B, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerIsLowBattery = createNativeFunction(0xD3075926, 150, 'int', '', this, function () {
            return 0;
        });
        this.scePowerIsBatteryCharging = createNativeFunction(0x1E490401, 150, 'int', '', this, function () {
            return 1;
        });
        this.scePowerGetBatteryLifeTime = createNativeFunction(0x8EFB3FA2, 150, 'int', '', this, function () {
            return 3 * 60;
        });
        this.scePowerGetBatteryVolt = createNativeFunction(0x483CE86B, 150, 'int', '', this, function () { return 4135; });
        this.scePowerGetBatteryTemp = createNativeFunction(0x28E12023, 150, 'int', '', this, function () { return 28; });
        this.scePowerLock = createNativeFunction(0xD6D016EF, 150, 'int', 'int', this, function (unknown) { return 0; });
        this.scePowerUnlock = createNativeFunction(0xCA3D34C1, 150, 'int', 'int', this, function (unknown) { return 0; });
        this.scePowerTick = createNativeFunction(0xEFD3C963, 150, 'int', 'int', this, function (type) { return 0; }); // all = 0, suspend = 1, display = 6
        this.scePowerGetBatteryChargingStatus = createNativeFunction(0xB4432BC8, 150, 'int', '', this, function () {
            return 128 /* BatteryExists */ | 4096 /* AcPower */ | 127 /* BatteryPower */;
        });
    }
    scePower.prototype._getCpuMult = function () {
        return 0.43444227005871 * (this.busFreq / 111);
    };
    scePower.prototype._getCpuFreq = function () {
        return this.cpuMult * this._getCpuMult();
    };
    scePower.prototype._setCpuFreq = function (cpuFreq) {
        if (cpuFreq > 222) {
        }
        else if (cpuFreq == 222) {
            this.cpuMult = 511;
        }
        else {
            this.cpuMult = Math.floor(cpuFreq / this._getCpuMult());
        }
    };
    scePower.prototype._isValidCpuFreq = function (freq) {
        return (freq >= 1 && freq <= 222);
    };
    scePower.prototype._isValidBusFreq = function (freq) {
        return (freq >= 1 && freq <= 111);
    };
    scePower.prototype._isValidPllFreq = function (freq) {
        return (freq >= 19 && freq <= 111);
    };
    scePower.prototype._scePowerSetClockFrequency = function (pllFreq, cpuFreq, busFreq) {
        if (!this._isValidCpuFreq(cpuFreq))
            return 2147484158 /* ERROR_INVALID_VALUE */;
        if (!this._isValidBusFreq(busFreq))
            return 2147484158 /* ERROR_INVALID_VALUE */;
        if (!this._isValidPllFreq(pllFreq))
            return 2147484158 /* ERROR_INVALID_VALUE */;
        this.pllFreq = pllFreq;
        this._setCpuFreq(cpuFreq);
        this.busFreq = busFreq;
        return 0;
    };
    return scePower;
})();
exports.scePower = scePower;
var CallbackStatus;
(function (CallbackStatus) {
    CallbackStatus[CallbackStatus["AC_POWER"] = 0x00001000] = "AC_POWER";
    CallbackStatus[CallbackStatus["BATTERY_EXIST"] = 0x00000080] = "BATTERY_EXIST";
    CallbackStatus[CallbackStatus["BATTERY_FULL"] = 0x00000064] = "BATTERY_FULL";
})(CallbackStatus || (CallbackStatus = {}));
var PowerFlagsSet;
(function (PowerFlagsSet) {
    PowerFlagsSet[PowerFlagsSet["PowerSwitch"] = 0x80000000] = "PowerSwitch";
    PowerFlagsSet[PowerFlagsSet["HoldSwitch"] = 0x40000000] = "HoldSwitch";
    PowerFlagsSet[PowerFlagsSet["StandBy"] = 0x00080000] = "StandBy";
    PowerFlagsSet[PowerFlagsSet["ResumeComplete"] = 0x00040000] = "ResumeComplete";
    PowerFlagsSet[PowerFlagsSet["Resuming"] = 0x00020000] = "Resuming";
    PowerFlagsSet[PowerFlagsSet["Suspending"] = 0x00010000] = "Suspending";
    PowerFlagsSet[PowerFlagsSet["AcPower"] = 0x00001000] = "AcPower";
    PowerFlagsSet[PowerFlagsSet["BatteryLow"] = 0x00000100] = "BatteryLow";
    PowerFlagsSet[PowerFlagsSet["BatteryExists"] = 0x00000080] = "BatteryExists";
    PowerFlagsSet[PowerFlagsSet["BatteryPower"] = 0x0000007F] = "BatteryPower";
})(PowerFlagsSet || (PowerFlagsSet = {}));
//# sourceMappingURL=scePower.js.map