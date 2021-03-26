import "../emu/global"

import {ArrayBufferUtils, logger, PromiseFast, Signal1} from "../global/utils";
import {PixelConverter, PixelFormat} from "./pixelformat";
import {Memory} from "./memory";
import {InterruptManager, PspInterrupts} from "./interrupt";

export interface ThreadWaiter {
	delayMicrosecondsAsync(delayMicroseconds: number, allowcompensating:boolean): PromiseFast<number>;
}

export interface IPspDisplay {
	address: number;
	bufferWidth: number;
	pixelFormat: PixelFormat;
	sync: number;
	waitVblankAsync(waiter: ThreadWaiter): PromiseFast<number>;
	waitVblankStartAsync(waiter: ThreadWaiter): PromiseFast<number>;
	setEnabledDisplay(enable: boolean): void;
	updateTime(): void;
	vblankCount: number;
	hcountTotal: number;
	secondsLeftForVblank: number;
	secondsLeftForVblankStart: number;
	vblank: Signal1<number>;
}

export class BasePspDisplay {
	address = Memory.DEFAULT_FRAME_ADDRESS
	bufferWidth = 512
	pixelFormat = PixelFormat.RGBA_8888
	sync = 1
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
}

const console = logger.named('display')

export class PspDisplay extends BasePspDisplay implements IPspDisplay {
	private context: CanvasRenderingContext2D|null;
	vblank = new Signal1<number>();
    // @ts-ignore
	private imageData: ImageData;
	private enabled: boolean = true;
	private _hcount: number = 0;
	private startTime: number = 0;

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

	private currentMs:number = 0;
	private elapsedSeconds:number = 0
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
            console.info('Canvas');
			this.context = <CanvasRenderingContext2D>this.canvas.getContext('2d');
			this.imageData = this.context.createImageData(512, 272);
			this.setEnabledDisplay(true);
		} else {
            console.info('NO Canvas');
			this.context = null;
			this.setEnabledDisplay(false);
		}
	}

	update() {
		if (!this.context || !this.imageData) return;
		if (!this.enabled) return;

        const imageData = this.imageData;
        //const w8 = <Uint8ClampedArray><any>imageData.data;
        const w8 = <Uint8Array><any>imageData.data;
        const w32 = ArrayBufferUtils.uint8ToUint32(w8);
        const baseAddress = this.address & 0x0FFFFFFF;

        PixelConverter.decode(this.pixelFormat, this.memory.getPointerU8Array(baseAddress), w32, false);
		this.context.putImageData(imageData, 0, 0);
	}

	setEnabledDisplay(enable: boolean) {
		//console.log(`display.setEnabledDisplay:${enable}`);
		this.enabled = enable;
		if (this.canvas) this.canvas.style.display = enable ? 'block' : 'none';
		if (this.webglcanvas) this.webglcanvas.style.display = !enable ? 'block' : 'none';

		//this.canvas.style.display = 'none';
		//this.webglcanvas.style.display = 'block';
	}

	register() {
        this.startTime = this.getCurrentMs();
        this.updateTime();
    }

    unregister() {
    }

    frameLastMs = 0
    frameCccumulatedMs = 0

    frame() {
	    const MAX_SIMULATE_FRAMES = 2
	    const VBLANK_MS = 1000 / PspDisplay.VERTICAL_SYNC_HZ
        const currentMs = this.getCurrentMs()
        if (this.frameLastMs == 0) this.frameLastMs = currentMs
        const elapsedMs = currentMs - this.frameLastMs
        this.frameLastMs = currentMs
        this.frameCccumulatedMs += elapsedMs

        this.frameCccumulatedMs = Math.min(this.frameCccumulatedMs, VBLANK_MS * MAX_SIMULATE_FRAMES)

        while (this.frameCccumulatedMs >= VBLANK_MS) {
            this.frameCccumulatedMs -= VBLANK_MS
            this.updateTime();
            this.vblankCount++;
            this.update();
            this.vblank.dispatch(this.vblankCount);
            this.interruptManager.interrupt(PspInterrupts.PSP_VBLANK_INT);
        }
    }

	mustWaitVBlank = true;
	lastTimeVblank = 0;
	//mustWaitVBlank = false;

	private checkVblankThrottle() {
        const currentTime = performance.now();
        if ((currentTime - this.lastTimeVblank) >= (PspDisplay.VERTICAL_SECONDS * 1000)) {
			this.lastTimeVblank = currentTime;
			return true;
		}
		return false;
	}

	waitVblankAsync(waiter: ThreadWaiter):PromiseFast<number> {
		this.updateTime();
		if (!this.mustWaitVBlank) return PromiseFast.resolve(0);
		if (this.checkVblankThrottle()) return PromiseFast.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblank * 1000000, true);
	}

	waitVblankStartAsync(waiter: ThreadWaiter):PromiseFast<number> {
		this.updateTime();
		if (!this.mustWaitVBlank) return PromiseFast.resolve(0);
		if (this.checkVblankThrottle()) return PromiseFast.resolve(0);
		return waiter.delayMicrosecondsAsync(this.secondsLeftForVblankStart * 1000000, true);
	}
}
