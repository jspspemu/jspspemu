import "../global"

import _cpu = require('./cpu');
import {NumberDictionary, Signal0} from "../global/utils";

type CpuState = _cpu.CpuState;
//import CpuState from './cpu';

export class InterruptHandler {
	enabled = false;
	address = 0;
	argument = 0;
	cpuState:CpuState = null;

	constructor(public no:number) {
	}
}

export class InterruptHandlers {
	handlers: NumberDictionary<InterruptHandler> = {};

	constructor(public pspInterrupt: PspInterrupts) {
	}

	get(handlerIndex: number) {
		if (!this.handlers[handlerIndex]) this.handlers[handlerIndex] = new InterruptHandler(handlerIndex);
		return this.handlers[handlerIndex];
	}

	remove(handlerIndex: number) {
		delete this.handlers[handlerIndex];
	}

	has(handlerIndex: number) {
		return (this.handlers[handlerIndex] !== undefined);
	}
}

export class InterruptManager {
	enabled: boolean = true;
	flags: number = 0xFFFFFFFF;
	interruptHandlers: NumberDictionary<InterruptHandlers> = {};
	event = new Signal0();
	queue = <InterruptHandler[]>[];

	suspend() {
		var currentFlags = this.flags;
		this.flags = 0;
		this.enabled = false;
		return currentFlags;
	}

	resume(value: number) {
		this.flags = value;
		this.enabled = true;
	}

	get(pspInterrupt: PspInterrupts) {
		if (!this.interruptHandlers[pspInterrupt]) this.interruptHandlers[pspInterrupt] = new InterruptHandlers(pspInterrupt);
		return this.interruptHandlers[pspInterrupt];
	}

	interrupt(pspInterrupt: PspInterrupts) {
		var interrupt = this.get(pspInterrupt);
		var handlers = interrupt.handlers;
		for (var n in handlers) {
			var handler = handlers[n];
			if (handler.enabled) {
				//debugger;
				this.queue.push(handler);
				this.execute(null);
			}
		}
	}

	execute(_state: CpuState) {
		while (this.queue.length > 0) {
			var item = this.queue.shift();
			var state = item.cpuState;
			state.preserveRegisters(() => {
				state.RA = 0x1234;
				state.setGPR(4, item.no);
				state.setGPR(5, item.argument);
				state.insideInterrupt = true;
				state.PC = item.address;
				state.startThreadStep();
				state.executeAtPC();
				//var RA = state.RA;
				//// @FIXME! @TODO: this is probably wrong, since the CpuBreakException means that a promise was yielded and we should not continue until it has been resolved!!!
				//while (state.PC != RA) {
				//	try {
				//		state.executeAtPC();
				//	} catch (e) {
				//		if (e.message != 'CpuBreakException') throw e;
				//	}
				//}
			});
		}
		//state.callPCSafe();
	}
}

export enum PspInterrupts {
	PSP_GPIO_INT = 4,
	PSP_ATA_INT = 5,
	PSP_UMD_INT = 6,
	PSP_MSCM0_INT = 7,
	PSP_WLAN_INT = 8,
	PSP_AUDIO_INT = 10,
	PSP_I2C_INT = 12,
	PSP_SIRCS_INT = 14,
	PSP_SYSTIMER0_INT = 15,
	PSP_SYSTIMER1_INT = 16,
	PSP_SYSTIMER2_INT = 17,
	PSP_SYSTIMER3_INT = 18,
	PSP_THREAD0_INT = 19,
	PSP_NAND_INT = 20,
	PSP_DMACPLUS_INT = 21,
	PSP_DMA0_INT = 22,
	PSP_DMA1_INT = 23,
	PSP_MEMLMD_INT = 24,
	PSP_GE_INT = 25,
	PSP_VBLANK_INT = 30, // 0x1E
	PSP_MECODEC_INT = 31,
	PSP_HPREMOTE_INT = 36,
	PSP_MSCM1_INT = 60,
	PSP_MSCM2_INT = 61,
	PSP_THREAD1_INT = 65,
	PSP_INTERRUPT_INT = 66,
	PSP_NUMBER_INTERRUPTS = 67,
}
