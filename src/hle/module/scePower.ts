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
}
