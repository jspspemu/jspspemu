import {Stream} from "../../../global/stream";
import {EmulatorContext} from "../../../context";
import {nativeFunction} from "../../utils";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xB7D098C6, 150, 'int', 'string/int/int')
	sceKernelCreateMutex(name: string, attribute: number, options: number) {
		return -1;
	}

	@nativeFunction(0x5BF4DD27, 150, 'int', 'int/int/void*')
	sceKernelLockMutexCB(mutexId:number, count:number, timeout:Stream) {
		return -1;
	}
}