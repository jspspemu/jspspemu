///<reference path="../../../global.d.ts" />

import _utils = require('../../utils');
import _context = require('../../../context');
import _cpu = require('../../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../../SceKernelErrors');
import _manager = require('../../manager'); _manager.Thread;

import CallbackManager = _manager.CallbackManager;
import Callback = _manager.Callback;
import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import CpuState = _cpu.CpuState;

import Thread = _manager.Thread;

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelCreateCallback = createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, (name: string, functionCallbackAddr: number, argument: number) => {
		return this.context.callbackManager.register(new Callback(name, functionCallbackAddr, argument));
	});

	sceKernelDeleteCallback = createNativeFunction(0xEDBA5844, 150, 'uint', 'int', this, (callbackId: number) => {
		this.context.callbackManager.remove(callbackId);
	});

	/**
	 * Run all peding callbacks and return if executed any.
	 * Callbacks cannot be executed inside a interrupt.
	 * @return 0 no reported callbacks; 1 reported callbacks which were executed successfully.
	 */
	sceKernelCheckCallback = createNativeFunction(0x349D6D6C, 150, 'uint', 'Thread', this, (thread: Thread) => {
		//console.warn('Not implemented ThreadManForUser.sceKernelCheckCallback');
		return this.context.callbackManager.executePendingWithinThread(thread) ? 1 : 0;
	});

	sceKernelNotifyCallback = createNativeFunction(0xC11BA8C4, 150, 'uint', 'Thread/int/int', this, (thread: Thread, callbackId: number, argument2: number) => {
		return this.context.callbackManager.notify(callbackId, argument2);
	});
}
