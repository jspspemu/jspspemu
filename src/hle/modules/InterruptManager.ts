module hle.modules {
	export class InterruptManager {
		constructor(private context: EmulatorContext) { }

		sceKernelRegisterSubIntrHandler = createNativeFunction(0xCA04A2B9, 150, 'uint', 'int/int/uint/uint', this, (interrupt: core.PspInterrupts, handlerIndex: number, callbackAddress: number, callbackArgument: number) => {
			var interruptManager = this.context.interruptManager;
			var itnerruptHandler: core.InterruptHandler = interruptManager.get(interrupt).get(handlerIndex);
			itnerruptHandler.address = callbackAddress;
			itnerruptHandler.argument = callbackArgument;
			return 0;
		});

		sceKernelEnableSubIntr = createNativeFunction(0xFB8E22EC, 150, 'uint', 'int/int', this, (interrupt: core.PspInterrupts, handlerIndex: number) => {
			var interruptManager = this.context.interruptManager;

			if (interrupt >= core.PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
			if (!interruptManager.get(interrupt).has(handlerIndex)) return -1;

			interruptManager.get(interrupt).get(handlerIndex).enabled = true;
			return 0;
		});

		sceKernelReleaseSubIntrHandler = createNativeFunction(0xD61E6961, 150, 'uint', 'int/int', this, (pspInterrupt: core.PspInterrupts, handlerIndex: number) => {
			var interruptManager = this.context.interruptManager;

			if (pspInterrupt >= core.PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
			if (!interruptManager.get(pspInterrupt).has(handlerIndex)) return -1;

			interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
			return 0;
		});
	}
}

