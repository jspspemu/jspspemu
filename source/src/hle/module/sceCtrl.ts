///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;
import _context = require('../../context');
import _controller = require('../../core/controller');
import _cpu = require('../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import Thread = _manager.Thread;
import SceCtrlData = _controller.SceCtrlData;

export class sceCtrl {
	constructor(private context: _context.EmulatorContext) { }

	sceCtrlPeekBufferPositive = createNativeFunction(0x3A622550, 150, 'uint', 'void*/int', this, (sceCtrlDataPtr: Stream, count: number) => {
		//console.log('sceCtrlPeekBufferPositive');
		for (var n = 0; n < count; n++) _controller.SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
		//return waitAsync(1).then(v => count);
        return count;
    });

	sceCtrlReadBufferPositive = createNativeFunction(0x1F803938, 150, 'uint', 'Thread/void*/int', this, (thread: Thread, sceCtrlDataPtr: Stream, count: number) => {
		//console.log('sceCtrlReadBufferPositive');

		for (var n = 0; n < count; n++) _controller.SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
		//return Promise.resolve(0);
		return new WaitingThreadInfo('sceCtrlReadBufferPositive', this.context.display, this.context.display.waitVblankStartAsync(thread).then(v => count), AcceptCallbacks.NO);
		//return 0;
    });

    sceCtrlSetSamplingCycle = createNativeFunction(0x6A2774F3, 150, 'uint', 'int', this, (samplingCycle: number) => {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
        return 0;
    });

    sceCtrlSetSamplingMode = createNativeFunction(0x1F4011E6, 150, 'uint', 'int', this, (samplingMode: number) => {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
        return 0;
	});

	private lastLatchData = new SceCtrlData();

	_peekLatch(currentLatchPtr: Stream) {
		var ButtonsNew = this.context.controller.data.buttons;
		var ButtonsOld = this.lastLatchData.buttons;
		var ButtonsChanged = ButtonsOld ^ ButtonsNew;

		currentLatchPtr.writeInt32(ButtonsNew & ButtonsChanged); // uiMake
		currentLatchPtr.writeInt32(ButtonsOld & ButtonsChanged); // uiBreak
		currentLatchPtr.writeInt32(ButtonsNew); // uiPress
		currentLatchPtr.writeInt32((ButtonsOld & ~ButtonsNew) & ButtonsChanged); // uiRelease

		return this.context.controller.latchSamplingCount;

	}

	sceCtrlReadLatch = createNativeFunction(0x0B588501, 150, 'uint', 'void*', this, (currentLatchPtr: Stream) => {
		try {
			return this._peekLatch(currentLatchPtr);
		} finally {
			this.lastLatchData = this.context.controller.data;
			this.context.controller.latchSamplingCount = 0;
		}
	});

	sceCtrlSetIdleCancelThreshold = createNativeFunction(0xA7144800, 150, 'uint', 'int/int', this, (idlereset: number, idleback: number) => {
		return 0;
	});
}
