///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;
import _context = require('../../context');
import _display = require('../../core/display');
import _pixelformat = require('../../core/pixelformat');
import nativeFunction = _utils.nativeFunction;

import PixelFormat = _pixelformat.PixelFormat;
import PspDisplay = _display.PspDisplay;

import Thread = _manager.Thread;

type uint = number;
type int = number;

export class sceDisplay {
	constructor(private context: _context.EmulatorContext) { }

	private mode = 0;
	private width = 512;
	private height = 272;

	@nativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint')
    sceDisplaySetMode(mode: number, width: number, height: number) {
		console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
		this.mode = mode;
		this.width = width;
		this.height = height;
        return 0;
	}

	@nativeFunction(0xDEA197D4, 150, 'uint', 'void*/void*/void*')
	sceDisplayGetMode(modePtr: Stream, widthPtr: Stream, heightPtr: Stream) {
		if (modePtr) modePtr.writeInt32(this.mode);
		if (widthPtr) widthPtr.writeInt32(this.width);
		if (heightPtr) heightPtr.writeInt32(this.height);
		return 0;
	}

	_waitVblankAsync(thread: Thread, acceptCallbacks: AcceptCallbacks) {
		this.context.display.updateTime();
		return new WaitingThreadInfo('_waitVblankAsync', this.context.display, this.context.display.waitVblankAsync(thread), acceptCallbacks);
	}

	_waitVblankStartAsync(thread: Thread, acceptCallbacks: AcceptCallbacks) {
		this.context.display.updateTime();
		return new WaitingThreadInfo('_waitVblankStartAsync', this.context.display, this.context.display.waitVblankStartAsync(thread), acceptCallbacks);
	}

	@nativeFunction(0x36CDFADE, 150, 'uint', 'Thread/int', {disableInsideInterrupt: true})
    sceDisplayWaitVblank(thread: Thread, cycleNum: number) {
		return this._waitVblankAsync(thread, AcceptCallbacks.NO);
	}

	@nativeFunction(0x8EB9EC49, 150, 'uint', 'Thread/int', {disableInsideInterrupt: true})
	sceDisplayWaitVblankCB(thread: Thread, cycleNum: number) {
		return this._waitVblankAsync(thread, AcceptCallbacks.YES);
	}

	@nativeFunction(0x984C27E7, 150, 'uint', 'Thread', {disableInsideInterrupt: true})
	sceDisplayWaitVblankStart(thread: Thread) {
		return this._waitVblankAsync(thread, AcceptCallbacks.NO);
		//return this._waitVblankStartAsync(thread, AcceptCallbacks.NO);
	}

	@nativeFunction(0x46F186C3, 150, 'uint', 'Thread', {disableInsideInterrupt: true})
	sceDisplayWaitVblankStartCB(thread: Thread) {
		return this._waitVblankAsync(thread, AcceptCallbacks.YES);
		//return this._waitVblankStartAsync(thread, AcceptCallbacks.YES)
	}

	@nativeFunction(0x9C6EAAD7, 150, 'int', '')
	sceDisplayGetVcount() {
		this.context.display.updateTime();
		return this.context.display.vblankCount;
	}

	@nativeFunction(0xDBA6C4C4, 150, 'float', '')
	sceDisplayGetFramePerSec() {
		return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
	}

	@nativeFunction(0x4D4E10EC, 150, 'int', '')
	sceDisplayIsVblank() {
		return (this.context.display.secondsLeftForVblank == 0);
	}

	@nativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint')
	sceDisplaySetFrameBuf(address: uint, bufferWidth: int, pixelFormat: PixelFormat, sync: uint) {
        this.context.display.address = address;
        this.context.display.bufferWidth = bufferWidth;
        this.context.display.pixelFormat = pixelFormat;
        this.context.display.sync = sync;
        return 0;
	}

	@nativeFunction(0xEEDA2E54, 150, 'uint', 'void*/void*/void*/void*')
	sceDisplayGetFrameBuf(topaddrPtr: Stream, bufferWidthPtr: Stream, pixelFormatPtr: Stream, syncPtr: Stream) {
		if (topaddrPtr) topaddrPtr.writeInt32(this.context.display.address);
		if (bufferWidthPtr) bufferWidthPtr.writeInt32(this.context.display.bufferWidth);
		if (pixelFormatPtr) pixelFormatPtr.writeInt32(this.context.display.pixelFormat);
		if (syncPtr) syncPtr.writeInt32(this.context.display.sync);
		return 0;
	}

	@nativeFunction(0x773DD3A3, 150, 'uint', '')
	sceDisplayGetCurrentHcount() {
		this.context.display.updateTime();
		return this.context.display.hcountTotal;
	}
}

