module hle.modules {
	export class Kernel_Library {
		constructor(private context: EmulatorContext) { }

		sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, () => {
			return this.context.interruptManager.suspend();
		});

		sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', '', this, (flags: number) => {
			this.context.interruptManager.resume(flags);
			return 0;
		});
	}
}
