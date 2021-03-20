import _utils = require('../../utils');
import _context = require('../../../context');
import nativeFunction = _utils.nativeFunction;
import _manager = require('../../manager'); _manager.Thread;
import Callback = _manager.Callback;
import Thread = _manager.Thread;

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint')
	sceKernelCreateCallback(name: string, functionCallbackAddr: number, argument: number) {
		return this.context.callbackManager.register(new Callback(name, functionCallbackAddr, argument));
	}

	@nativeFunction(0xEDBA5844, 150, 'uint', 'int')
	sceKernelDeleteCallback(callbackId: number) {
		this.context.callbackManager.remove(callbackId);
	}

	/**
	 * Run all peding callbacks and return if executed any.
	 * Callbacks cannot be executed inside a interrupt.
	 * @return 0 no reported callbacks; 1 reported callbacks which were executed successfully.
	 */
	@nativeFunction(0x349D6D6C, 150, 'uint', 'Thread')
	sceKernelCheckCallback(thread: Thread) {
		//console.warn('Not implemented ThreadManForUser.sceKernelCheckCallback');
		return this.context.callbackManager.executePendingWithinThread(thread) ? 1 : 0;
	}

	@nativeFunction(0xC11BA8C4, 150, 'uint', 'Thread/int/int')
	sceKernelNotifyCallback(thread: Thread, callbackId: number, argument2: number) {
		return this.context.callbackManager.notify(callbackId, argument2);
	}
}
