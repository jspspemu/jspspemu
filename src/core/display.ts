import memory = require('./memory');
import pixelformat = require('./pixelformat');
import _interrupt = require('./interrupt');
import Signal = require('../util/Signal');

import InterruptManager = _interrupt.InterruptManager;
import PspInterrupts = _interrupt.PspInterrupts;
import Memory = memory.Memory;
import PixelFormat = pixelformat.PixelFormat;
import PixelConverter = pixelformat.PixelConverter;

export interface ThreadWaiter {
	delayMicrosecondsAsync(delayMicroseconds: number): Promise<number>;
}

export interface IPspDisplay {
	address: number;
	bufferWidth: number;
	pixelFormat: PixelFormat;
	sync: number;
	startAsync(): Promise<void>;
	stopAsync(): Promise<void>;
	waitVblankAsync(waiter: ThreadWaiter): Promise<number>;
	waitVblankStartAsync(waiter: ThreadWaiter): Promise<number>;
	setEnabledDisplay(enable: boolean): void;
	updateTime(): void;
	vblankCount: number;
	hcountTotal: number;
	secondsLeftForVblank: number;
	secondsLeftForVblankStart: number;
	vblank: Signal<number>;
}

export class BasePspDisplay {
	address = Memory.DEFAULT_FRAME_ADDRESS;
	bufferWidth = 512;
	pixelFormat = PixelFormat.RGBA_8888;
	sync = 1;
}

export class DummyPspDisplay extends BasePspDisplay implements IPspDisplay {
	vblankCount: number = 0;
	hcountTotal = 0;
	secondsLeftForVblank = 0.1;
	secondsLeftForVblankStart = 0.1;
	vblank = new Signal();

	constructor() {
		super();
	}

	updateTime() {
	}

	waitVblankAsync(waiter: ThreadWaiter) {
		return waiter.delayMicrosecondsAsync(20000);
	}

	waitVblankStartAsync(waiter: ThreadWaiter) {
		return waiter.delayMicrosecondsAsync(20000);
	}

	setEnabledDisplay(enable: boolean) {
	}

	startAsync() {
		return Promise.resolve();
	}

	stopAsync() {
		return Promise.resolve();
	}
}

export class PspDisplay extends BasePspDisplay implements IPspDisplay {
	private context: CanvasRenderingContext2D;
	vblank = new Signal<number>();
	private imageData: ImageData;
	private interval: number = -1;
	private enabled: boolean = true;
	private _hcount: number = 0;
	private startTime: number;

	static PROCESSED_PIXELS_PER_SECOND = 9000000; // hz
	static CYCLES_PER_PIXEL = 1;
	static PIXELS_IN_A_ROW = 525;

	static VSYNC_ROW = 272;
	//static VSYNC_ROW = 100;

	static NUMBER_OF_ROWS = 286;
	static HCOUNT_PER_VBLANK = 285.72;

	static HORIZONTAL_SYNC_HZ = (PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL) / PspDisplay.PIXELS_IN_A_ROW; // 17142.85714285714
	static HORIZONTAL_SECONDS = 1 / PspDisplay.HORIZONTAL_SYNC_HZ; // 5.8333333333333E-5

	static VERTICAL_SYNC_HZ = PspDisplay.HORIZONTAL_SYNC_HZ / PspDisplay.HCOUNT_PER_VBLANK; // 59.998800024
	static VERTICAL_SECONDS = 1 / PspDisplay.VERTICAL_SYNC_HZ; // 0.016667

	private currentMs;
	private elapsedSeconds;
	hcountTotal = 0;
	hcountCurrent = 0;
	vblankCount = 0;
	private isInVblank = false;

	private rowsLeftForVblank = 0;
	secondsLeftForVblank = 0;

	private rowsLeftForVblankStart = 0;
	secondsLeftForVblankStart = 0;

	private getCurrentMs() {
		return performance.now();
	}

	updateTime() {
		this.currentMs = this.getCurrentMs();
		this.elapsedSeconds = (this.currentMs - this.startTime) / 1000;
		this.hcountTotal = (this.elapsedSeconds * PspDisplay.HORIZONTAL_SYNC_HZ) | 0;
		this.hcountCurrent = (((this.elapsedSeconds % 1.00002) * PspDisplay.HORIZONTAL_SYNC_HZ) | 0) % PspDisplay.NUMBER_OF_ROWS;
		this.vblankCount = (this.elapsedSeconds * PspDisplay.VERTICAL_SYNC_HZ) | 0;
		if (this.hcountCurrent >= PspDisplay.VSYNC_ROW) {
			this.isInVblank = true;
			this.rowsLeftForVblank = 0;
			this.rowsLeftForVblankStart = (PspDisplay.NUMBER_OF_ROWS - this.hcountCurrent) + PspDisplay.VSYNC_ROW;
		} else {
			this.isInVblank = false;
			this.rowsLeftForVblank = PspDisplay.VSYNC_ROW - this.hcountCurrent;
			this.rowsLeftForVblankStart = this.rowsLeftForVblank;
		}
		this.secondsLeftForVblank = this.rowsLeftForVblank * PspDisplay.HORIZONTAL_SECONDS;
		this.secondsLeftForVblankStart = this.rowsLeftForVblankStart * PspDisplay.HORIZONTAL_SECONDS;
	}

	constructor(public memory: Memory, private interruptManager: InterruptManager, public canvas: HTMLCanvasElement, private webglcanvas: HTMLCanvasElement) {
		super();
		this.context = this.canvas.getContext('2d');
		this.imageData = this.context.createImageData(512, 272);
		this.setEnabledDisplay(true);
	}

	update() {
		if (!this.context || !this.imageData) return;
		if (!this.enabled) return;

		var count = 512 * 272;
		var imageData = this.imageData;
		var w8 = imageData.data;
		var baseAddress = this.address & 0x0FFFFFFF;

		PixelConverter.decode(this.pixelFormat, this.memory.buffer, baseAddress, w8, 0, count, false);
		this.context.putImageData(imageData, 0, 0);
	}

	setEnabledDisplay(enable: boolean) {
		this.enabled = enable;
		this.canvas.style.display = enable ? 'block' : 'none';
		this.webglcanvas.style.display = !enable ? 'block' : 'none';
	}

	startAsync() {
		this.startTime = this.currentMs;
		this.updateTime();

		//$(this.canvas).focus();
		this.interval = setInterval(() => {
			this.updateTime();
			this.vblankCount++;
			this.update();
			this.vblank.dispatch(this.vblankCount);
			this.interruptManager.interrupt(PspInterrupts.PSP_VBLANK_INT);
		}, 1000 / PspDisplay.VERTICAL_SYNC_HZ);
		return Promise.resolve();
	}

	stopAsync() {
		clearInterval(this.interval);
		this.interval = -1;
		return Promise.resolve();
	}

	mustWaitVBlank = true;
	lastTimeVblank = 0;
	//mustWaitVBlank = false;

	private checkVblankThrottle() {
		var currentTime = performance.now();
		if ((currentTime - this.lastTimeVblank) >= (PspDisplay.VERTICAL_SECONDS * 1000)) {
			this.lastTimeVblank = currentTime;
			return true;
		}
		return false;
	}

	waitVblankAsync(waiter: ThreadWaiter) {
		this.updateTime();
		if (!this.mustWaitVBlank) return Promise.resolve(0);
		if (this.checkVblankThrottle()) return Promise.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblank * 1000000);
	}

	waitVblankStartAsync(waiter: ThreadWaiter) {
		this.updateTime();
		if (!this.mustWaitVBlank) return Promise.resolve(0);
		if (this.checkVblankThrottle()) return Promise.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblankStart * 1000000);
	}
}
