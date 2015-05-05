///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
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

	@nativeFunction(0x04B7766E, 150, 'int', 'int/int')
	scePowerRegisterCallback(slotIndex: number, callbackId: number) {
		this.context.callbackManager.notify(callbackId, CallbackStatus.BATTERY_EXIST);
		return 0;
	}

	@nativeFunction(0xDB9D28DD, 150, 'int', 'int')
	scePowerUnregitserCallback(slotIndex: number) {
		return 0;
	}

	@nativeFunction(0xDFA8BAF8, 150, 'int', 'int')
	scePowerUnregisterCallback(slotIndex: number) {
		return 0;
	}

	_isValidCpuFreq(freq: number) {
		return (freq >= 1 && freq <= 222);
	}

	_isValidBusFreq(freq: number) {
		return (freq >= 1 && freq <= 111);
	}

	_isValidPllFreq(freq: number) {
		return (freq >= 19 && freq <= 111);
	}

	_scePowerSetClockFrequency(pllFreq: number, cpuFreq: number, busFreq: number) {
		if (!this._isValidCpuFreq(cpuFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		if (!this._isValidBusFreq(busFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		if (!this._isValidPllFreq(pllFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		this.pllFreq = pllFreq;
		this._setCpuFreq(cpuFreq);
		this.busFreq = busFreq;
		return 0;
	}

	@nativeFunction(0x737486F2, 150, 'int', 'int/int/int')
	scePowerSetClockFrequency(pllFreq: number, cpuFreq: number, busFreq: number) {
		return this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
	}

	@nativeFunction(0xEBD177D6, 150, 'int', 'int/int/int')
	scePowerSetClockFrequency2(pllFreq: number, cpuFreq: number, busFreq: number) {
		return this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
	}

	@nativeFunction(0x469989AD, 150, 'int', 'int/int/int')
	scePowerSetClockFrequency3(pllFreq: number, cpuFreq: number, busFreq: number) {
		return this._scePowerSetClockFrequency(pllFreq, cpuFreq, busFreq);
	}
	

	@nativeFunction(0xFEE03A2F, 150, 'int', '')
	scePowerGetCpuClockFrequency() { return this._getCpuFreq(); }
	@nativeFunction(0xFDB5BFE9, 150, 'int', '')
	scePowerGetCpuClockFrequencyInt() { return this._getCpuFreq(); }
	@nativeFunction(0xB1A52C83, 150, 'float', '')
	scePowerGetCpuClockFrequencyFloat() { return this._getCpuFreq(); }

	@nativeFunction(0x478FE6F5, 150, 'int', '')
	scePowerGetBusClockFrequency() { return this.busFreq; }
	@nativeFunction(0xBD681969, 150, 'int', '')
	scePowerGetBusClockFrequencyInt() { return this.busFreq; }
	@nativeFunction(0x9BADB3EB, 150, 'float', '')
	scePowerGetBusClockFrequencyFloat() { return this.busFreq; }

	@nativeFunction(0x34F9C463, 150, 'int', '')
	scePowerGetPllClockFrequencyInt() { return this.pllFreq; }
	@nativeFunction(0xEA382A27, 150, 'float', '')
	scePowerGetPllClockFrequencyFloat() { return this.pllFreq; }

	@nativeFunction(0xB8D7B3FB, 150, 'int', 'int')
	scePowerSetBusClockFrequency(busFreq: number) {
		if (!this._isValidBusFreq(busFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		//this.busFreq = busFreq;
		this.busFreq = 111;
		return 0;
	}

	@nativeFunction(0x843FBF43, 150, 'int', 'int')
	scePowerSetCpuClockFrequency(cpuFreq: number) {
		if (!this._isValidCpuFreq(cpuFreq)) return SceKernelErrors.ERROR_INVALID_VALUE;
		this._setCpuFreq(cpuFreq);
		return 0;
	}

	@nativeFunction(0x2085D15D, 150, 'int', '')
	scePowerGetBatteryLifePercent() { return 100; }
	
	@nativeFunction(0x87440F5E, 150, 'int', '')
	scePowerIsPowerOnline() { return 1; }
	
	@nativeFunction(0x0AFD0D8B, 150, 'int', '')
	scePowerIsBatteryExist() { return 1; }
	
	@nativeFunction(0xD3075926, 150, 'int', '')
	scePowerIsLowBattery() { return 0; }
	
	@nativeFunction(0x1E490401, 150, 'int', '')
	scePowerIsBatteryCharging() { return 1; }
	
	@nativeFunction(0x8EFB3FA2, 150, 'int', '')
	scePowerGetBatteryLifeTime() { return 3 * 60; }
	
	@nativeFunction(0x483CE86B, 150, 'int', '')
	scePowerGetBatteryVolt() { return 4135; }
	@nativeFunction(0x28E12023, 150, 'int', '')
	scePowerGetBatteryTemp() { return 28; }
	@nativeFunction(0xD6D016EF, 150, 'int', 'int')
	scePowerLock(unknown: number) { return 0; }
	@nativeFunction(0xCA3D34C1, 150, 'int', 'int')
	scePowerUnlock(unknown: number) { return 0; }
	@nativeFunction(0xEFD3C963, 150, 'int', 'int')
	scePowerTick(type: number) { return 0; } // all = 0, suspend = 1, display = 6

	@nativeFunction(0xB4432BC8, 150, 'int', '')
	scePowerGetBatteryChargingStatus() {
		return PowerFlagsSet.BatteryExists | PowerFlagsSet.AcPower | PowerFlagsSet.BatteryPower;
	}
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