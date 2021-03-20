import {sprintf} from "../../global/utils";
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";
import {Thread} from "../manager/thread";

export class ModuleMgrForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xD1FF982A, 150, 'uint', '')
	sceKernelStopModule() {
		return 0;
	}

	@nativeFunction(0x2E0911AA, 150, 'uint', 'int')
	sceKernelUnloadModule(id: number) {
		return 0;
	}

	@nativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int/Thread')
	sceKernelSelfStopUnloadModule(unknown: number, argsize: number, argp: number, thread: Thread) {
		console.info("Call stack:");
		thread.state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
		throw new Error("sceKernelSelfStopUnloadModule");
	}

	@nativeFunction(0xCC1D3699, 150, 'uint', 'int/int/int/Thread')
	sceKernelStopUnloadSelfModule(argsize: number, argp: number, optionsAddress:number, thread: Thread) {
		throw new Error("sceKernelStopUnloadSelfModule");
	}

	@nativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*')
	sceKernelLoadModule(path: string, flags: number, sceKernelLMOption: Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule("%s", %d)', path, flags));
		return 0x08900000;
	}

	@nativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*')
	sceKernelStartModule(moduleId: number, argumentSize: number, argumentPointer: number, status:Stream, sceKernelSMOption:Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
		return 0;
	}

	@nativeFunction(0xD8B73127, 150, 'uint', 'uint')
	sceKernelGetModuleIdByAddress(address: number) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
		return 3;
	}

	@nativeFunction(0xF0A26395, 150, 'uint', '')
	sceKernelGetModuleId() {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleId()'));
		return 4; // TODO!
	}

	@nativeFunction(0xB7F46618, 150, 'uint', 'uint/uint/void*')
	sceKernelLoadModuleByID(fileId: number, flags: number, sceKernelLMOption: Stream) {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModuleByID(%d, %08X)', fileId, flags));
		return 0;
	}
}
