import {EmulatorContext} from "../../emu/context";
import {nativeFunctionEx, U32, VOID} from "../utils";

export class UtilsForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xC2DF770E, 150)
	@VOID sceKernelIcacheInvalidateRange(@U32 address: number, @U32 size: number) {
		this.context.currentInstructionCache.invalidateRange(address, address + size);
	}
}
