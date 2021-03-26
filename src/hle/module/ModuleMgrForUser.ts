import {sprintf} from "../../global/utils";
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, PTR, STRING, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";

export class ModuleMgrForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xD1FF982A, 150)
    @U32 sceKernelStopModule() {
		return 0;
	}

	@nativeFunctionEx(0x2E0911AA, 150)
	@U32 sceKernelUnloadModule(@I32 id: number) {
		return 0;
	}

	@nativeFunctionEx(0xD675EBB8, 150)
    @U32 sceKernelSelfStopUnloadModule(@I32 unknown: number, @I32 argsize: number, @I32 argp: number, @THREAD thread: Thread) {
		console.info("Call stack:");
		thread.state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
		throw new Error("sceKernelSelfStopUnloadModule");
	}

	@nativeFunctionEx(0xCC1D3699, 150)
    @U32 sceKernelStopUnloadSelfModule(@I32 argsize: number, @I32 argp: number, @I32 optionsAddress:number, @THREAD thread: Thread) {
		throw new Error("sceKernelStopUnloadSelfModule");
	}

	@nativeFunctionEx(0x977DE386, 150)
	@U32 sceKernelLoadModule(@STRING path: string, @U32 flags: number, @PTR sceKernelLMOption: Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule("%s", %d)', path, flags));
		return 0x08900000;
	}

	@nativeFunctionEx(0x50F0C1EC, 150)
    @U32 sceKernelStartModule(@I32 moduleId: number, @I32 argumentSize: number, @U32 argumentPointer: number, @PTR status:Stream, @PTR sceKernelSMOption:Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
		return 0;
	}

	@nativeFunctionEx(0xD8B73127, 150)
    @U32 sceKernelGetModuleIdByAddress(@U32 address: number) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
		return 3;
	}

	@nativeFunctionEx(0xF0A26395, 150)
    @U32 sceKernelGetModuleId() {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleId()'));
		return 4; // TODO!
	}

	@nativeFunctionEx(0xB7F46618, 150)
    @U32 sceKernelLoadModuleByID(@U32 fileId: number, @U32 flags: number, @PTR sceKernelLMOption: Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModuleByID(%d, %08X)', fileId, flags));
		return 0;
	}
}
