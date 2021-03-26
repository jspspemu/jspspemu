import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, VOID} from "../utils";

export class LoadCoreForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xD8779AC6, 150)
	@VOID sceKernelIcacheClearAll() {
		this.context.currentInstructionCache.invalidateAll();
	}

	@nativeFunctionEx(0xCCE4A157, 150)
	@I32 sceKernelFindModuleByUID(@I32 moduleID: number) {
		console.warn(`Not implemented sceKernelFindModuleByUID(${moduleID})`)
		return 0;
	}
}
