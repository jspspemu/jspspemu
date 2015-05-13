///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');
import _manager = require('../manager');

import Callback = _manager.Callback;
import Thread = _manager.Thread;
import _gpu = require('../../core/gpu'); _gpu.PspGpuCallback;

import PspGpuCallback = _gpu.PspGpuCallback;

export class sceGe_user {
    constructor(private context: _context.EmulatorContext) {
	}

	private eDRAMMemoryWidth = 0;

	@nativeFunction(0xB77905EA, 150, 'uint', 'int')
	sceGeEdramSetAddrTranslation(size: number) {
		try { return this.eDRAMMemoryWidth; } finally { this.eDRAMMemoryWidth = size; }
	}

	@nativeFunction(0xA4FC06A4, 150, 'uint', 'Thread/void*')
	sceGeSetCallback(thread: Thread, callbackDataPtr: Stream) {
		var callbacks = this.context.gpu.callbacks;
		var info = CallbackData.struct.read(callbackDataPtr);
		return callbacks.allocate(new PspGpuCallback(thread.state, info.signalFunction, info.signalArgument, info.finishFunction, info.finishArgument));
	}

	@nativeFunction(0x05DB22CE, 150, 'uint', 'int')
	sceGeUnsetCallback(callbackId: number) {
		this.context.gpu.callbacks.remove(callbackId);
		return 0;
	}

	@nativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*')
	sceGeListEnQueue(start: number, stall: number, callbackId: number, argsPtr: Stream) {
		return this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
    }

	@nativeFunction(0x03444EB4, 150, 'uint', 'int/int')
	sceGeListSync(displayListId: number, syncType: _gpu.SyncType) {
        //console.warn('Not implemented sceGe_user.sceGeListSync');
        return this.context.gpu.listSync(displayListId, syncType);
    }

    @nativeFunction(0xE0D68148, 150, 'uint', 'int/int')
	sceGeListUpdateStallAddr(displayListId: number, stall: number) {
        //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
        return this.context.gpu.updateStallAddr(displayListId, stall);
    }

	@nativeFunction(0xB287BD61, 150, 'uint', 'int')
	sceGeDrawSync(syncType: _gpu.SyncType): any {
		var result = this.context.gpu.drawSync(syncType);
		if (result instanceof Promise2) {
			//result = Promise2.all([result, waitAsync(10)]);
			return new WaitingThreadInfo('sceGeDrawSync', this.context.gpu, <Promise2<any>>result.then(() => {
			}), AcceptCallbacks.NO, Compensate.YES);
		} else {
			return result;
		}
	}

	@nativeFunction(0x4C06E472, 150, 'uint', '')
	sceGeContinue() {
		return -1;
	}

	@nativeFunction(0xB448EC0D, 150, 'uint', 'int/void*')
	sceGeBreak(mode:number, breakAddress:Stream) {
		return -1;
	}

	@nativeFunction(0xE47E40E4, 150, 'uint', '')
	sceGeEdramGetAddr() {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetAddr', 0x04000000);
		return 0x04000000;
	}

	@nativeFunction(0x1F6752AD, 150, 'uint', '')
	sceGeEdramGetSize() {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetSize', 0x00200000);
		return 0x00200000; // 2MB
	}
}

class CallbackData {
	signalFunction:number; // GE callback for the signal interrupt alias void function(int id, void *arg) PspGeCallback;
	signalArgument:number; // GE callback argument for signal interrupt
	finishFunction:number; // GE callback for the finish interrupt alias void function(int id, void *arg) PspGeCallback;
	finishArgument:number; // GE callback argument for finish interrupt

	static struct = StructClass.create<CallbackData>(CallbackData, [
		{ signalFunction: UInt32 },
		{ signalArgument: UInt32 },
		{ finishFunction: UInt32 },
		{ finishArgument: UInt32 },
	]);
}