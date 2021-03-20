import {EmulatorContext} from "../../context";
import {nativeFunction} from "../utils";

export class UtilsForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xC2DF770E, 150, 'void', 'uint/uint')
	sceKernelIcacheInvalidateRange(address: number, size: number) {
		this.context.currentInstructionCache.invalidateRange(address, address + size);
	}
}
