module hle.modules {
	export class Kernel_Library {
		constructor(private context: EmulatorContext) { }

		sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, () => {
			console.warn(sprintf("sceKernelCpuSuspendIntr not implemented"));
			return 0;
		});

		sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', '', this, (flags: number) => {
			console.warn(sprintf("sceKernelCpuResumeIntr not implemented"));
			return 0;
		});
	}
}
