import {Stream} from "../../../global/stream";
import {EmulatorContext} from "../../../emu/context";
import {I32, nativeFunctionEx, PTR, STRING, U32} from "../../utils";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xB7D098C6, 150)
	@U32 sceKernelCreateMutex(@STRING name: string, @I32 attribute: number, @I32 options: number) {
		return -1;
	}

	@nativeFunctionEx(0x5BF4DD27, 150)
    @U32 sceKernelLockMutexCB(@I32 mutexId:number, @I32 count:number, @PTR timeout:Stream) {
		return -1;
	}
}