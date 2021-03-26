import {EmulatorContext} from "../../../emu/context";
import {I32, nativeFunctionEx, STRING, THREAD, U32} from "../../utils";
import {Callback} from "../../manager/callback";
import {Thread} from "../../manager/thread";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xE81CAF8F, 150)
	@U32 sceKernelCreateCallback(@STRING name: string, @I32 functionCallbackAddr: number, @U32 argument: number) {
		return this.context.callbackManager.register(new Callback(name, functionCallbackAddr, argument));
	}

	@nativeFunctionEx(0xEDBA5844, 150)
	@U32 sceKernelDeleteCallback(@I32 callbackId: number) {
		this.context.callbackManager.remove(callbackId);
	}

	/**
	 * Run all peding callbacks and return if executed any.
	 * Callbacks cannot be executed inside a interrupt.
	 * @return 0 no reported callbacks; 1 reported callbacks which were executed successfully.
	 */
	@nativeFunctionEx(0x349D6D6C, 150)
	@U32 sceKernelCheckCallback(@THREAD thread: Thread) {
		//console.warn('Not implemented ThreadManForUser.sceKernelCheckCallback');
		return this.context.callbackManager.executePendingWithinThread(thread) ? 1 : 0;
	}

	@nativeFunctionEx(0xC11BA8C4, 150)
	@U32 sceKernelNotifyCallback(@THREAD thread: Thread, @I32 callbackId: number, @I32 argument2: number) {
		return this.context.callbackManager.notify(callbackId, argument2);
	}
}
