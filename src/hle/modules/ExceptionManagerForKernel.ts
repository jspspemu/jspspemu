module hle.modules {
	export class ExceptionManagerForKernel {
		constructor(private context: EmulatorContext) { }

		sceKernelRegisterDefaultExceptionHandler = createNativeFunction(0x565C0B0E, 150, 'uint', 'uint', this, (exceptionHandlerFunction: number) => {
			return 0;
		});
	}
}