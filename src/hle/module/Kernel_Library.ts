import {PromiseFast} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";

export class Kernel_Library {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x092968F4, 150)
	@U32 sceKernelCpuSuspendIntr() {
		return PromiseFast.resolve(this.context.interruptManager.suspend());
	}

	@nativeFunction(0x5F10D406, 150)
	@U32 sceKernelCpuResumeIntr(@THREAD thread:Thread, @U32 flags: number): any {
		this.context.interruptManager.resume(flags);
		//return 0;
		//throw(new CpuBreakException());
		//thread.state.V0 = 0;
		//throw (new CpuBreakException());
		thread.sceKernelCpuResumeIntrCount++;
		if (thread.sceKernelCpuResumeIntrCount >= 3) {
			thread.sceKernelCpuResumeIntrCount = 0;
			return PromiseFast.resolve(0);
			//return thread.delayMicrosecondsAsync(1000);
		} else {
			return PromiseFast.resolve(0);
		}
	}

	@nativeFunction(0xA089ECA4, 150)
	@U32 sceKernelMemset(@U32 address: number, @I32 value: number, @I32 size: number) {
		this.context.memory.memset(address, value, size);
		return address;
	}

	@nativeFunction(0x1839852A, 150)
	@U32 sceKernelMemcpy(@U32 dst: number, @U32 src: number, @I32 size: number) {
		this.context.memory.copy(src, dst, size);
		return dst;
	}
}
