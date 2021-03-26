import { SceKernelErrors } from '../SceKernelErrors';
import {EmulatorContext} from "../../emu/context";
import {nativeFunctionEx, U32} from "../utils";

export class sceSuspendForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xEADB1BD7, 150)
    @U32 sceKernelPowerLock(@U32 lockType: number) {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	}

	@nativeFunctionEx(0x3AEE7261, 150)
    @U32 sceKernelPowerUnlock(@U32 lockType: number) {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	}

	@nativeFunctionEx(0x090CCB3F, 150)
	@U32 sceKernelPowerTick(@U32 value: number) {
		// prevent screen from turning off!
		return 0;
	}
}
