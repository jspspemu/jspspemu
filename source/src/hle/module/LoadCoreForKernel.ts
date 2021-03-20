import {EmulatorContext} from "../../context";
import {nativeFunction} from "../utils";

export class LoadCoreForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xD8779AC6, 150, 'void', '')
	sceKernelIcacheClearAll() {
		this.context.currentInstructionCache.invalidateAll();
	}

	@nativeFunction(0xCCE4A157, 150, 'int', 'int')
	sceKernelFindModuleByUID(moduleID: number) {
		console.warn('Not implemented sceKernelFindModuleByUID(' + moduleID + ')');
		return 0;
	}
}
