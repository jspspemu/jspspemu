module hle.modules {
    export class scePower {
        constructor(private context: EmulatorContext) { }

        private cpuFreq = 222;

		scePowerGetCpuClockFrequencyInt = createNativeFunction(0xFDB5BFE9, 150, 'int', '', this, () => this.cpuFreq);
		scePowerRegisterCallback = createNativeFunction(0x04B7766E, 150, 'int', '', this, (slotIndex: number, callbackId: number) => {
			console.warn("Not implemented scePowerRegisterCallback");
			return 0;
		});
    }
}
