import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class scePower {
    constructor(private context: _context.EmulatorContext) { }

	// 222/111
	// 333/166

	private cpuMult = 511; // 222mhz
	private pllFreq = 222;
	private busFreq = 111; // MAX BUS: 166

	_getCpuMult() {
		return 0.43444227005871 * (this.busFreq / 111);
	}

	_getCpuFreq() {
		return this.cpuMult * this._getCpuMult();
	}

	_setCpuFreq(cpuFreq: number) {
		if (cpuFreq > 222) { // TODO: necessary until integer arithmetic to avoid it failing
			// do nothing
		} else if (cpuFreq == 222) {
			this.cpuMult = 511;
		} else {
			this.cpuMult = Math.floor(cpuFreq / this._getCpuMult());
		}
	}

	scePowerRegisterCallback = createNativeFunction(0x04B7766E, 150, 'int', 'int/int', this, (slotIndex: number, callbackId: number) => {
		this.context.callbackManager.notify(callbackId, CallbackStatus.BATTERY_EXIST);
		return 0;
	});

	scePowerUnregitserCallback = createNativeFunction(0xDB9D28DD, 150, 'int', 'int', this, (slotIndex: number) => {
		return 0;
	});

	scePowerUnregisterCallback = createNativeFunction(0xDFA8BAF8, 150, 'int', 'int', this, (slotIndex: number) => {
		return 0;
	});

	_isValidCpuFreq(freq: number) {
		return (freq >= 1 && freq <= 222);
	}

	_isValidBusFreq(freq: number) {
		return (freq >= 1 && freq <= 111);
	}

	_isValidPllFreq(freq: number) {
		return (freq >= 19 && freq <= 111);
	}

	scePowerSetClockFrequency = createNativeFunction(0x737486F2, 150, 'int', 'int/int/int', this, (pllFreq: number, cpuFreq: number, busFreq: number) => {
		if (!this._isValidCpuFreq(cpuFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		if (!this._isValidBusFreq(busFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		if (!this._isValidPllFreq(pllFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		this.pllFreq = pllFreq;
		this._setCpuFreq(cpuFreq);
		this.busFreq = busFreq;
		return 0;
	});

	scePowerGetCpuClockFrequency = createNativeFunction(0xFEE03A2F, 150, 'int', '', this, () => this._getCpuFreq());
	scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, () => this._getCpuFreq());
	scePowerGetCpuClockFrequencyFloat = createNativeFunction(0xB1A52C83, 150, 'float', '', this, () => this._getCpuFreq());

	scePowerGetBusClockFrequency = createNativeFunction(0x478FE6F5, 150, 'int', '', this, () => { return this.busFreq; });
	scePowerGetBusClockFrequencyInt = createNativeFunction(0xBD681969, 150, 'int', '', this, () => { return this.busFreq; });
	scePowerGetBusClockFrequencyFloat = createNativeFunction(0x9BADB3EB, 150, 'float', '', this, () => { return this.busFreq; });

	scePowerGetPllClockFrequencyInt = createNativeFunction(0x34F9C463, 150, 'int', '', this, () => { return this.pllFreq; });
	scePowerGetPllClockFrequencyFloat = createNativeFunction(0xEA382A27, 150, 'float', '', this, () => { return this.pllFreq; });

	scePowerSetBusClockFrequency = createNativeFunction(0xB8D7B3FB, 150, 'int', 'int', this, (busFreq: number) => {
		if (!this._isValidBusFreq(busFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		//this.busFreq = busFreq;
		this.busFreq = 111;
		return 0;
	});

	scePowerSetCpuClockFrequency = createNativeFunction(0x843FBF43, 150, 'int', 'int', this, (cpuFreq: number) => {
		if (!this._isValidCpuFreq(cpuFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		this._setCpuFreq(cpuFreq);
		return 0;
	});

	scePowerGetBatteryLifePercent = createNativeFunction(0x2085D15D, 150, 'int', '', this, () => { return 100; });
	scePowerIsPowerOnline = createNativeFunction(0x87440F5E, 150, 'int', '', this, () => { return 1; });
	scePowerIsBatteryExist = createNativeFunction(0x0AFD0D8B, 150, 'int', '', this, () => { return 1; });
	scePowerIsLowBattery = createNativeFunction(0xD3075926, 150, 'int', '', this, () => { return 0; });
	scePowerIsBatteryCharging = createNativeFunction(0x1E490401, 150, 'int', '', this, () => { return 1; });
	scePowerGetBatteryLifeTime = createNativeFunction(0x8EFB3FA2, 150, 'int', '', this, () => { return 3 * 60; });
	scePowerGetBatteryVolt = createNativeFunction(0x483CE86B, 150, 'int', '', this, () => 4135);
	scePowerGetBatteryTemp = createNativeFunction(0x28E12023, 150, 'int', '', this, () => 28);
	scePowerLock = createNativeFunction(0xD6D016EF, 150, 'int', 'int', this, (unknown: number) => 0);
	scePowerUnlock = createNativeFunction(0xCA3D34C1, 150, 'int', 'int', this, (unknown: number) => 0);
	scePowerTick = createNativeFunction(0xEFD3C963, 150, 'int', 'int', this, (type: number) => 0); // all = 0, suspend = 1, display = 6

	scePowerGetBatteryChargingStatus = createNativeFunction(0xB4432BC8, 150, 'int', '', this, () => {
		return PowerFlagsSet.BatteryExists | PowerFlagsSet.AcPower | PowerFlagsSet.BatteryPower;
	});
}

enum CallbackStatus {
	AC_POWER = 0x00001000,
	BATTERY_EXIST = 0x00000080,
	BATTERY_FULL = 0x00000064,
}

enum PowerFlagsSet {
	PowerSwitch = 0x80000000, // PSP_POWER_CB_POWER_SWITCH - Indicates the power switch it pushed, putting the unit into suspend mode
	HoldSwitch = 0x40000000, // PSP_POWER_CB_HOLD_SWITCH - Indicates the hold switch is on
	StandBy = 0x00080000, // PSP_POWER_CB_STANDBY - What is standby mode?
	ResumeComplete = 0x00040000, // PSP_POWER_CB_RESUME_COMPLETE - Indicates the resume process has been completed (only seems to be triggered when another event happens)
	Resuming = 0x00020000, // PSP_POWER_CB_RESUMING - Indicates the unit is resuming from suspend mode
	Suspending = 0x00010000, // PSP_POWER_CB_SUSPENDING - Indicates the unit is suspending, seems to occur due to inactivity
	AcPower = 0x00001000, // PSP_POWER_CB_AC_POWER - Indicates the unit is plugged into an AC outlet
	BatteryLow = 0x00000100, // PSP_POWER_CB_BATTERY_LOW - Indicates the battery charge level is low
	BatteryExists = 0x00000080, // PSP_POWER_CB_BATTERY_EXIST - Indicates there is a battery present in the unit
	BatteryPower = 0x0000007F, // PSP_POWER_CB_BATTPOWER - Unknown
}