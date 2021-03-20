import { SceKernelErrors } from '../SceKernelErrors';
import {EmulatorContext} from "../../context";
import {nativeFunction} from "../utils";

export class sceSuspendForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xEADB1BD7, 150, 'uint', 'uint')
	sceKernelPowerLock(lockType: number) {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	}

	@nativeFunction(0x3AEE7261, 150, 'uint', 'uint')
	sceKernelPowerUnlock(lockType: number) {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	}

	@nativeFunction(0x090CCB3F, 150, 'uint', 'uint')
	sceKernelPowerTick(value: number) {
		// prevent screen from turning off!
		return 0;
	}
}
