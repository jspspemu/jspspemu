///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;
import _context = require('../../context');
import _controller = require('../../core/controller');
import _cpu = require('../../core/cpu');
import nativeFunction = _utils.nativeFunction;
import Thread = _manager.Thread;
import SceCtrlData = _controller.SceCtrlData;

export class sceCtrl {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x3A622550, 150, 'uint', 'void*/int')
	sceCtrlPeekBufferPositive(sceCtrlDataPtr: Stream, count: number) {
		//console.log('sceCtrlPeekBufferPositive');
		for (var n = 0; n < count; n++) _controller.SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
		//return waitAsync(1).then(v => count);
        return count;
    }

	@nativeFunction(0x1F803938, 150, 'uint', 'Thread/void*/int')
	sceCtrlReadBufferPositive(thread: Thread, sceCtrlDataPtr: Stream, count: number) {
		//console.log('sceCtrlReadBufferPositive');

		for (var n = 0; n < count; n++) _controller.SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
		//return Promise2.resolve(0);
		return new WaitingThreadInfo('sceCtrlReadBufferPositive', this.context.display, this.context.display.waitVblankStartAsync(thread).then(v => count), AcceptCallbacks.NO);
		//return 0;
    }

	@nativeFunction(0x6A2774F3, 150, 'uint', 'int')
    sceCtrlSetSamplingCycle(samplingCycle: number) {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
        return 0;
    }

	@nativeFunction(0x1F4011E6, 150, 'uint', 'int')
    sceCtrlSetSamplingMode(samplingMode: number) {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
        return 0;
	}

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

	@nativeFunction(0x0B588501, 150, 'uint', 'void*')
	sceCtrlReadLatch(currentLatchPtr: Stream) {
		try {
			return this._peekLatch(currentLatchPtr);
		} finally {
			this.lastLatchData = this.context.controller.data;
			this.context.controller.latchSamplingCount = 0;
		}
	}

	@nativeFunction(0xA7144800, 150, 'uint', 'int/int')
	sceCtrlSetIdleCancelThreshold(idlereset: number, idleback: number) {
		return 0;
	}
}
