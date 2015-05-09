///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import _interrupt = require('../../core/interrupt');

import Thread = _manager.Thread;

import InterruptHandler = _interrupt.InterruptHandler;
import PspInterrupts = _interrupt.PspInterrupts;
import nativeFunction = _utils.nativeFunction;

export class InterruptManager {
	constructor(private context: _context.EmulatorContext) {
		this.context.display.vblank.add(() => {
			//this.context.callbackManager.notify(
		});
	}

	@nativeFunction(0xCA04A2B9, 150, 'uint', 'Thread/int/int/uint/uint')
	sceKernelRegisterSubIntrHandler(thread:Thread, interrupt: PspInterrupts, handlerIndex: number, callbackAddress: number, callbackArgument: number) {
		var interruptManager = this.context.interruptManager;
		var interruptHandler: InterruptHandler = interruptManager.get(interrupt).get(handlerIndex);
		
		console.info(`sceKernelRegisterSubIntrHandler: ${PspInterrupts[interrupt]}: ${handlerIndex}: ${addressToHex(callbackAddress)}: ${addressToHex(callbackArgument)}`);
		interruptHandler.address = callbackAddress;
		interruptHandler.argument = callbackArgument;
		interruptHandler.cpuState = thread.state;
		return 0;
	}

	@nativeFunction(0xFB8E22EC, 150, 'uint', 'int/int')
	sceKernelEnableSubIntr(interrupt: PspInterrupts, handlerIndex: number) {
		var interruptManager = this.context.interruptManager;

		if (interrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(interrupt).has(handlerIndex)) return -1;

		interruptManager.get(interrupt).get(handlerIndex).enabled = true;
		return 0;
	}

	@nativeFunction(0xD61E6961, 150, 'uint', 'int/int')
	sceKernelReleaseSubIntrHandler(pspInterrupt: PspInterrupts, handlerIndex: number) {
		var interruptManager = this.context.interruptManager;

		if (pspInterrupt >= PspInterrupts.PSP_NUMBER_INTERRUPTS) return -1;
		if (!interruptManager.get(pspInterrupt).has(handlerIndex)) return -1;

		interruptManager.get(pspInterrupt).get(handlerIndex).enabled = false;
		return 0;
	}
}

