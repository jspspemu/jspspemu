import {Stream} from "../../global/stream";
import {AcceptCallbacks, Compensate, PromiseFast, WaitingThreadInfo} from "../../global/utils";
import {Struct, StructUInt32} from "../../global/struct";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, PTR, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";
import {PspGpuCallback} from "../../core/gpu/gpu_core";
import {SyncType} from "../../core/gpu/gpu_state";

export class sceGe_user {
    constructor(private context: EmulatorContext) {
	}

	private eDRAMMemoryWidth = 0;

	@nativeFunctionEx(0xB77905EA, 150)
    @U32 sceGeEdramSetAddrTranslation(@I32 size: number) {
		try { return this.eDRAMMemoryWidth; } finally { this.eDRAMMemoryWidth = size; }
	}

	@nativeFunctionEx(0xA4FC06A4, 150)
    @U32 sceGeSetCallback(@THREAD thread: Thread, @PTR callbackDataPtr: Stream) {
        const callbacks = this.context.gpu.callbacks;
        const info = CallbackData.struct.read(callbackDataPtr);
        return callbacks.allocate(new PspGpuCallback(thread.state, info.signalFunction, info.signalArgument, info.finishFunction, info.finishArgument));
	}

	@nativeFunctionEx(0x05DB22CE, 150)
    @U32 sceGeUnsetCallback(@I32 callbackId: number) {
		this.context.gpu.callbacks.remove(callbackId);
		return 0;
	}

	@nativeFunctionEx(0xAB49E76A, 150)
    @U32 sceGeListEnQueue(@U32 start: number, @U32 stall: number, @I32 callbackId: number, @PTR argsPtr: Stream) {
		return this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
    }

	@nativeFunctionEx(0x03444EB4, 150)
    @U32 sceGeListSync(@I32 displayListId: number, @I32 syncType: SyncType) {
        //console.warn('Not implemented sceGe_user.sceGeListSync');
        return this.context.gpu.listSync(displayListId, syncType);
    }

    @nativeFunctionEx(0xE0D68148, 150)
    @U32 sceGeListUpdateStallAddr(@I32 displayListId: number, @I32 stall: number) {
        //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
        return this.context.gpu.updateStallAddr(displayListId, stall);
    }

	@nativeFunctionEx(0xB287BD61, 150)
	@U32 sceGeDrawSync(@I32 syncType: SyncType): any {
        const result = this.context.gpu.drawSync(syncType);
        if (PromiseFast.isPromise(result)) {
			//result = PromiseFast.all([result, waitAsync(10)]);
			return new WaitingThreadInfo('sceGeDrawSync', this.context.gpu, result, AcceptCallbacks.NO, Compensate.YES);
		} else {
			return result;
		}
	}

	@nativeFunctionEx(0x4C06E472, 150)
	@U32 sceGeContinue() {
		return -1;
	}

	@nativeFunctionEx(0xB448EC0D, 150)
	@U32 sceGeBreak(@I32 mode:number, @PTR breakAddress:Stream) {
		return -1;
	}

	@nativeFunctionEx(0xE47E40E4, 150)
	@U32 sceGeEdramGetAddr() {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetAddr', 0x04000000);
		return 0x04000000;
	}

	@nativeFunctionEx(0x1F6752AD, 150)
	@U32 sceGeEdramGetSize() {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetSize', 0x00200000);
		return 0x00200000; // 2MB
	}
}

class CallbackData extends Struct {
	@StructUInt32 signalFunction: number = 0 // GE callback for the signal interrupt alias void function(int id, void *arg) PspGeCallback;
    @StructUInt32 signalArgument: number = 0 // GE callback argument for signal interrupt
    @StructUInt32 finishFunction: number = 0 // GE callback for the finish interrupt alias void function(int id, void *arg) PspGeCallback;
    @StructUInt32 finishArgument: number = 0 // GE callback argument for finish interrupt
}