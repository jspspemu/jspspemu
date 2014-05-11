import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

import _gpu = require('../../core/gpu');

export class sceGe_user {
    constructor(private context: _context.EmulatorContext) {
    }

    sceGeSetCallback = createNativeFunction(0xA4FC06A4, 150, 'uint', 'int', this, (callbackDataPtr: number) => {
        //console.warn('Not implemented sceGe_user.sceGeSetCallback');
        return 0;
	});

	sceGeUnsetCallback = createNativeFunction(0x05DB22CE, 150, 'uint', 'int', this, (callbackId: number) => {
		//console.warn('Not implemented sceGe_user.sceGeSetCallback');
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

	sceGeDrawSync = createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, (syncType: _gpu.SyncType) => {
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		if (syncType == _gpu.SyncType.Peek) throw(new Error("Not implemented SyncType.Peek"));
        return this.context.gpu.drawSync(syncType);
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
