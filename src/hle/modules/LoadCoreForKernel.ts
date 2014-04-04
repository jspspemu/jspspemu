module hle.modules {
	export class LoadCoreForKernel {
		constructor(private context: EmulatorContext) { }

		sceKernelIcacheClearAll = createNativeFunction(0xD8779AC6, 150, 'void', '', this, () => {
			this.context.instructionCache.invalidateAll();
		});
	}
}
