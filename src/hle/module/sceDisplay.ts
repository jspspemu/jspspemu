import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;
import _context = require('../../context');
import _display = require('../../core/display');
import _pixelformat = require('../../core/pixelformat');
import createNativeFunction = _utils.createNativeFunction;

import PixelFormat = _pixelformat.PixelFormat;
import PspDisplay = _display.PspDisplay;

import Thread = _manager.Thread;

export class sceDisplay {
	constructor(private context: _context.EmulatorContext) { }

	private mode = 0;
	private width = 512;
	private height = 272;

    sceDisplaySetMode = createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, (mode: number, width: number, height: number) => {
		console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
		this.mode = mode;
		this.width = width;
		this.height = height;
        return 0;
	});

	sceDisplayGetMode = createNativeFunction(0xDEA197D4, 150, 'uint', 'void*/void*/void*', this, (modePtr: Stream, widthPtr: Stream, heightPtr: Stream) => {
		if (modePtr) modePtr.writeInt32(this.mode);
		if (widthPtr) widthPtr.writeInt32(this.width);
		if (heightPtr) heightPtr.writeInt32(this.height);
		return 0;
	});

	_waitVblankAsync(thread: Thread, acceptCallbacks: AcceptCallbacks) {
		this.context.display.updateTime();
		return new WaitingThreadInfo('_waitVblankAsync', this.context.display, this.context.display.waitVblankAsync(thread), acceptCallbacks);
	}

	_waitVblankStartAsync(thread: Thread, acceptCallbacks: AcceptCallbacks) {
		this.context.display.updateTime();
		return new WaitingThreadInfo('_waitVblankStartAsync', this.context.display, this.context.display.waitVblankStartAsync(thread), acceptCallbacks);
	}

    sceDisplayWaitVblank = createNativeFunction(0x36CDFADE, 150, 'uint', 'Thread/int', this, (thread:Thread, cycleNum: number) => {
		return this._waitVblankAsync(thread, AcceptCallbacks.NO);
	});

	sceDisplayWaitVblankCB = createNativeFunction(0x8EB9EC49, 150, 'uint', 'Thread/int', this, (thread: Thread, cycleNum: number) => {
		return this._waitVblankAsync(thread, AcceptCallbacks.YES);
	});

	sceDisplayWaitVblankStart = createNativeFunction(0x984C27E7, 150, 'uint', 'Thread', this, (thread: Thread) => {
		return this._waitVblankStartAsync(thread, AcceptCallbacks.NO);
	});

	sceDisplayWaitVblankStartCB = createNativeFunction(0x46F186C3, 150, 'uint', 'Thread', this, (thread: Thread) => {
		return this._waitVblankStartAsync(thread, AcceptCallbacks.YES)
	});

	sceDisplayGetVcount = createNativeFunction(0x9C6EAAD7, 150, 'uint', '', this, () => {
		this.context.display.updateTime();
		return this.context.display.vblankCount;
	});

	sceDisplayGetFramePerSec = createNativeFunction(0xDBA6C4C4, 150, 'float', '', this, () => {
		return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
	});

	sceDisplayIsVblank = createNativeFunction(0x4D4E10EC, 150, 'int', '', this, () => {
		return (this.context.display.secondsLeftForVblank == 0);
	});

	sceDisplaySetFrameBuf = createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, (address: number, bufferWidth: number, pixelFormat: PixelFormat, sync: number) => {
        this.context.display.address = address;
        this.context.display.bufferWidth = bufferWidth;
        this.context.display.pixelFormat = pixelFormat;
        this.context.display.sync = sync;
        return 0;
	});

	sceDisplayGetFrameBuf = createNativeFunction(0xEEDA2E54, 150, 'uint', 'void*/void*/void*/void*', this, (topaddrPtr: Stream, bufferWidthPtr: Stream, pixelFormatPtr: Stream, syncPtr: Stream) => {
		if (topaddrPtr) topaddrPtr.writeInt32(this.context.display.address);
		if (bufferWidthPtr) bufferWidthPtr.writeInt32(this.context.display.bufferWidth);
		if (pixelFormatPtr) pixelFormatPtr.writeInt32(this.context.display.pixelFormat);
		if (syncPtr) syncPtr.writeInt32(this.context.display.sync);
		return 0;
	});


	sceDisplayGetCurrentHcount = createNativeFunction(0x773DD3A3, 150, 'uint', '', this, () => {
		this.context.display.updateTime();
		return this.context.display.hcountTotal;
	});
}

