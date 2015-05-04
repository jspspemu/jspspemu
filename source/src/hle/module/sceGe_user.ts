///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
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

	sceGeEdramSetAddrTranslation = createNativeFunction(0xB77905EA, 150, 'uint', 'int', this, (size: number) => {
		try { return this.eDRAMMemoryWidth; } finally { this.eDRAMMemoryWidth = size; }
	});

	sceGeSetCallback = createNativeFunction(0xA4FC06A4, 150, 'uint', 'Thread/void*', this, (thread: Thread, callbackDataPtr: Stream) => {
		var callbacks = this.context.gpu.callbacks;
		var info = CallbackData.struct.read(callbackDataPtr);
		return callbacks.allocate(new PspGpuCallback(thread.state, info.signalFunction, info.signalArgument, info.finishFunction, info.finishArgument));
	});

	sceGeUnsetCallback = createNativeFunction(0x05DB22CE, 150, 'uint', 'int', this, (callbackId: number) => {
		this.context.gpu.callbacks.remove(callbackId);
		return 0;
	});

	sceGeListEnQueue = createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, (start: number, stall: number, callbackId: number, argsPtr: Stream) => {
		return this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
    });

	sceGeListSync = createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, (displayListId: number, syncType: _gpu.SyncType) => {
        //console.warn('Not implemented sceGe_user.sceGeListSync');
        return this.context.gpu.listSync(displayListId, syncType);
    });

    sceGeListUpdateStallAddr = createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, (displayListId: number, stall: number) => {
        //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
        return this.context.gpu.updateStallAddr(displayListId, stall);
    });

	sceGeDrawSync = createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, (syncType: _gpu.SyncType): any => {
		var result = this.context.gpu.drawSync(syncType);
		if (result instanceof Promise2) {
			return new WaitingThreadInfo('sceGeDrawSync', this.context.gpu, <Promise2<any>>result, AcceptCallbacks.NO, Compensate.YES);
		} else {
			return result;
		}
	});

	sceGeContinue = createNativeFunction(0x4C06E472, 150, 'uint', '', this, () => {
		return -1;
	});

	sceGeBreak = createNativeFunction(0xB448EC0D, 150, 'uint', 'int/void*', this, (mode:number, breakAddress:Stream) => {
		return -1;
	});

	sceGeEdramGetAddr = createNativeFunction(0xE47E40E4, 150, 'uint', '', this, () => {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetAddr', 0x04000000);
		return 0x04000000;
	});

	sceGeEdramGetSize = createNativeFunction(0x1F6752AD, 150, 'uint', '', this, () => {
		//console.warn('Not implemented sceGe_user.sceGeEdramGetSize', 0x00200000);
		return 0x00200000; // 2MB
	});
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