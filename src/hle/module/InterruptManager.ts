import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import _interrupt = require('../../core/interrupt');

import Thread = _manager.Thread;

import InterruptHandler = _interrupt.InterruptHandler;
import PspInterrupts = _interrupt.PspInterrupts;
import createNativeFunction = _utils.createNativeFunction;

export class InterruptManager {
	constructor(private context: _context.EmulatorContext) {
		this.context.display.vblank.add(() => {
			//this.context.callbackManager.notify(
		});
	}

	sceKernelRegisterSubIntrHandler = createNativeFunction(0xCA04A2B9, 150, 'uint', 'Thread/int/int/uint/uint', this, (thread:Thread, interrupt: PspInterrupts, handlerIndex: number, callbackAddress: number, callbackArgument: number) => {
		var interruptManager = this.context.interruptManager;
		var interruptHandler: InterruptHandler = interruptManager.get(interrupt).get(handlerIndex);
		interruptHandler.address = callbackAddress;
		interruptHandler.argument = callbackArgument;
		interruptHandler.cpuState = thread.state;
		return 0;
	});

	sceKernelEnableSubIntr = createNativeFunction(0xFB8E22EC, 150, 'uint', 'int/int', this, (interrupt: PspInterrupts, handlerIndex: number) => {
		var interruptManager = this.context.interruptManager;

		if (interrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(interrupt).has(handlerIndex)) return -1;

		interruptManager.get(interrupt).get(handlerIndex).enabled = true;
		return 0;
	});

	sceKernelReleaseSubIntrHandler = createNativeFunction(0xD61E6961, 150, 'uint', 'int/int', this, (pspInterrupt: PspInterrupts, handlerIndex: number) => {
		var interruptManager = this.context.interruptManager;

		if (pspInterrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(pspInterrupt).has(handlerIndex)) return -1;

		interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
		return 0;
	});
}

