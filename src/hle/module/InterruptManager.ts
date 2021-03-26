import {addressToHex} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";
import {InterruptHandler, PspInterrupts} from "../../core/interrupt";

export class InterruptManager {
	constructor(private context: EmulatorContext) {
		this.context.display.vblank.add(() => {
			//this.context.callbackManager.notify(
		});
	}

	@nativeFunction(0xCA04A2B9, 150)
	@U32 sceKernelRegisterSubIntrHandler(
	    @THREAD thread:Thread,
        @I32 interrupt: PspInterrupts,
        @I32 handlerIndex: number,
        @U32 callbackAddress: number,
        @U32 callbackArgument: number
    ) {
        const interruptManager = this.context.interruptManager;
        const interruptHandler: InterruptHandler = interruptManager.get(interrupt).get(handlerIndex);

        console.info(`sceKernelRegisterSubIntrHandler: ${PspInterrupts[interrupt]}: ${handlerIndex}: ${addressToHex(callbackAddress)}: ${addressToHex(callbackArgument)}`);
		interruptHandler.address = callbackAddress;
		interruptHandler.argument = callbackArgument;
		interruptHandler.cpuState = thread.state;
		return 0;
	}

	@nativeFunction(0xFB8E22EC, 150)
	@U32 sceKernelEnableSubIntr(@I32 interrupt: PspInterrupts, @I32 handlerIndex: number) {
        const interruptManager = this.context.interruptManager;

        if (interrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(interrupt).has(handlerIndex)) return -1;

		interruptManager.get(interrupt).get(handlerIndex).enabled = true;
		return 0;
	}

	@nativeFunction(0xD61E6961, 150)
	@U32 sceKernelReleaseSubIntrHandler(@I32 pspInterrupt: PspInterrupts, @I32 handlerIndex: number) {
        const interruptManager = this.context.interruptManager;

        if (pspInterrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(pspInterrupt).has(handlerIndex)) return -1;

		interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
		return 0;
	}
}

