import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class scePower {
    constructor(private context: _context.EmulatorContext) { }

	private cpuFreq = 222;
	private pllFreq = 222;
	private busFreq = 111;

	scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, () => this.cpuFreq);
	scePowerRegisterCallback = createNativeFunction(0x04B7766E, 150, 'int', '', this, (slotIndex: number, callbackId: number) => {
		console.warn("Not implemented scePowerRegisterCallback");
		return 0;
	});

	scePowerSetClockFrequency = createNativeFunction(0x737486F2, 150, 'int', 'int/int/int', this, (pllFrequency: number, cpuFrequency: number, busFrequency: number) => {
		this.pllFreq = pllFrequency;
		this.cpuFreq = cpuFrequency;
		this.busFreq = busFrequency;
		return 0;
	});

	scePowerGetCpuClockFrequency = createNativeFunction(0xFEE03A2F, 150, 'int', '', this, () => {
		return this.cpuFreq;
	});

	scePowerGetBusClockFrequency = createNativeFunction(0x478FE6F5, 150, 'int', '', this, () => {
		return this.busFreq;
	});

	scePowerSetBusClockFrequency = createNativeFunction(0xB8D7B3FB, 150, 'int', 'int', this, (busFrequency: number) => {
		this.busFreq = busFrequency;
		return 0;
	});

	scePowerSetCpuClockFrequency = createNativeFunction(0x843FBF43, 150, 'int', 'int', this, (cpuFrequency: number) => {
		this.cpuFreq = cpuFrequency;
		return 0;
	});

	scePowerGetBatteryLifePercent = createNativeFunction(0x2085D15D, 150, 'int', '', this, () => {
		return 100;
	});

	scePowerIsPowerOnline = createNativeFunction(0x87440F5E, 150, 'int', '', this, () => {
		return 1;
	});

	scePowerIsBatteryExist = createNativeFunction(0x0AFD0D8B, 150, 'int', '', this, () => {
		return 1;
	});

	scePowerIsLowBattery = createNativeFunction(0xD3075926, 150, 'int', '', this, () => {
		return 0;
	});

	scePowerIsBatteryCharging = createNativeFunction(0x1E490401, 150, 'int', '', this, () => {
		return 1;
	});

	scePowerGetBatteryLifeTime = createNativeFunction(0x8EFB3FA2, 150, 'int', '', this, () => {
		return 3 * 60;
	});

	scePowerGetBatteryVolt = createNativeFunction(0x483CE86B, 150, 'int', '', this, () => {
		return 4135;
	});

	scePowerGetBatteryTemp = createNativeFunction(0x28E12023, 150, 'int', '', this, () => {
		return 28;
	});

	scePowerLock = createNativeFunction(0xD6D016EF, 150, 'int', 'int', this, (unknown: number) => {
		return 0;
	});

	scePowerUnlock = createNativeFunction(0xCA3D34C1, 150, 'int', 'int', this, (unknown: number) => {
		return 0;
	});

	scePowerTick = createNativeFunction(0xEFD3C963, 150, 'int', 'int', this, (type: number) => {
		// all = 0, suspend = 1, display = 6
		return 0;
	});
}
