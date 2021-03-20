import "../global"

import * as memory from './memory';
import * as pixelformat from './pixelformat';
import * as _interrupt from './interrupt';

import InterruptManager = _interrupt.InterruptManager;
import PspInterrupts = _interrupt.PspInterrupts;
import Memory = memory.Memory;
import PixelFormat = pixelformat.PixelFormat;
import PixelConverter = pixelformat.PixelConverter;
import {ArrayBufferUtils, Promise2, Signal1} from "../global/utils";

export interface ThreadWaiter {
	delayMicrosecondsAsync(delayMicroseconds: number, allowcompensating:boolean): Promise2<number>;
}

export interface IPspDisplay {
	address: number;
	bufferWidth: number;
	pixelFormat: PixelFormat;
	sync: number;
	startAsync(): Promise2<void>;
	stopAsync(): Promise2<void>;
	waitVblankAsync(waiter: ThreadWaiter): Promise2<number>;
	waitVblankStartAsync(waiter: ThreadWaiter): Promise2<number>;
	setEnabledDisplay(enable: boolean): void;
	updateTime(): void;
	vblankCount: number;
	hcountTotal: number;
	secondsLeftForVblank: number;
	secondsLeftForVblankStart: number;
	vblank: Signal1<number>;
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
	vblank = new Signal1<number>();

	constructor() {
		super();
	}

	updateTime() {
	}

	waitVblankAsync(waiter: ThreadWaiter) {
		return waiter.delayMicrosecondsAsync(20000, true);
	}

	waitVblankStartAsync(waiter: ThreadWaiter) {
		return waiter.delayMicrosecondsAsync(20000, true);
	}

	setEnabledDisplay(enable: boolean) {
	}

	startAsync():Promise2<any> {
		return Promise2.resolve();
	}

	stopAsync():Promise2<any> {
		return Promise2.resolve();
	}
}

export class PspDisplay extends BasePspDisplay implements IPspDisplay {
	private context: CanvasRenderingContext2D;
	vblank = new Signal1<number>();
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

	private currentMs:number;
	private elapsedSeconds:number;
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
		//console.log(this.elapsedSeconds);
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
		if (this.canvas) {
			console.warn('Canvas');
			this.context = <CanvasRenderingContext2D>this.canvas.getContext('2d');
			this.imageData = this.context.createImageData(512, 272);
			this.setEnabledDisplay(true);
		} else {
			console.warn('NO Canvas');
			this.context = null;
			this.setEnabledDisplay(false);
		}
	}

	update() {
		if (!this.context || !this.imageData) return;
		if (!this.enabled) return;

		var imageData = this.imageData;
		//var w8 = <Uint8ClampedArray><any>imageData.data;
		var w8 = <Uint8Array><any>imageData.data;
		var w32 = ArrayBufferUtils.uint8ToUint32(w8);
		var baseAddress = this.address & 0x0FFFFFFF;

		PixelConverter.decode(this.pixelFormat, this.memory.getPointerU8Array(baseAddress), w32, false);
		this.context.putImageData(imageData, 0, 0);
	}

	setEnabledDisplay(enable: boolean) {
		//console.log('display.setEnabledDisplay:' + enable);
		this.enabled = enable;
		if (this.canvas) this.canvas.style.display = enable ? 'block' : 'none';
		if (this.webglcanvas) this.webglcanvas.style.display = !enable ? 'block' : 'none';

		//this.canvas.style.display = 'none';
		//this.webglcanvas.style.display = 'block';
	}

	startAsync() {
		this.startTime = this.getCurrentMs();
		this.updateTime();

		this.interval = setInterval(() => {
			this.updateTime();
			this.vblankCount++;
			this.update();
			this.vblank.dispatch(this.vblankCount);
			this.interruptManager.interrupt(PspInterrupts.PSP_VBLANK_INT);
		}, 1000 / PspDisplay.VERTICAL_SYNC_HZ) as any;
		return Promise2.resolve();
	}

	stopAsync() {
		clearInterval(this.interval);
		this.interval = -1;
		return Promise2.resolve();
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

	waitVblankAsync(waiter: ThreadWaiter):Promise2<number> {
		this.updateTime();
		if (!this.mustWaitVBlank) return Promise2.resolve(0);
		if (this.checkVblankThrottle()) return Promise2.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblank * 1000000, true);
	}

	waitVblankStartAsync(waiter: ThreadWaiter):Promise2<number> {
		this.updateTime();
		if (!this.mustWaitVBlank) return Promise2.resolve(0);
		if (this.checkVblankThrottle()) return Promise2.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblankStart * 1000000, true);
	}
}
