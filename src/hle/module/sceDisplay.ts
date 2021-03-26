import {AcceptCallbacks, logger, sprintf, WaitingThreadInfo} from "../../global/utils";
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {I32, U32, PTR, THREAD, F32, nativeFunctionEx} from "../utils";
import {Thread} from "../manager/thread";
import {PspDisplay} from "../../core/display";
import {PixelFormat} from "../../core/pixelformat";

type uint = number;
type int = number;

const console = logger.named("sceDisplay")

export class sceDisplay {
	constructor(private context: EmulatorContext) { }

	private mode = 0;
	private width = 512;
	private height = 272;

	@nativeFunctionEx(0x0E20F177, 150)
    @U32 sceDisplaySetMode(@U32 mode: number, @U32 width: number, @U32 height: number) {
		console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
		this.mode = mode;
		this.width = width;
		this.height = height;
        return 0;
	}

	@nativeFunctionEx(0xDEA197D4, 150)
    @U32 sceDisplayGetMode(@PTR modePtr: Stream, @PTR widthPtr: Stream, @PTR heightPtr: Stream) {
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

	@nativeFunctionEx(0x36CDFADE, 150, {disableInsideInterrupt: true})
    @U32 sceDisplayWaitVblank(@THREAD thread: Thread, @I32 cycleNum: number) {
		return this._waitVblankAsync(thread, AcceptCallbacks.NO);
	}

	@nativeFunctionEx(0x8EB9EC49, 150, {disableInsideInterrupt: true})
    @U32 sceDisplayWaitVblankCB(@THREAD thread: Thread, @I32 cycleNum: number) {
		return this._waitVblankAsync(thread, AcceptCallbacks.YES);
	}

	@nativeFunctionEx(0x984C27E7, 150, {disableInsideInterrupt: true})
    @U32 sceDisplayWaitVblankStart(@THREAD thread: Thread) {
		return this._waitVblankAsync(thread, AcceptCallbacks.NO);
		//return this._waitVblankStartAsync(thread, AcceptCallbacks.NO);
	}

	@nativeFunctionEx(0x46F186C3, 150, {disableInsideInterrupt: true})
    @U32 sceDisplayWaitVblankStartCB(@THREAD thread: Thread) {
		return this._waitVblankAsync(thread, AcceptCallbacks.YES);
		//return this._waitVblankStartAsync(thread, AcceptCallbacks.YES)
	}

	@nativeFunctionEx(0x9C6EAAD7, 150)
    @I32 sceDisplayGetVcount() {
		this.context.display.updateTime();
		return this.context.display.vblankCount;
	}

	@nativeFunctionEx(0xDBA6C4C4, 150)
    @F32 sceDisplayGetFramePerSec() {
		return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
	}

	@nativeFunctionEx(0x4D4E10EC, 150)
	@I32 sceDisplayIsVblank() {
		return (this.context.display.secondsLeftForVblank == 0);
	}

	@nativeFunctionEx(0x289D82FE, 150)
	@U32 sceDisplaySetFrameBuf(@U32 address: uint, @I32 bufferWidth: int, @U32 pixelFormat: PixelFormat, @U32 sync: SebufMode) {
	    //console.log('sceDisplaySetFrameBuf', sync, SebufMode[sync])
        this.context.display.address = address;
        this.context.display.bufferWidth = bufferWidth;
        this.context.display.pixelFormat = pixelFormat;
        this.context.display.sync = sync;
        return 0;
	}

	@nativeFunctionEx(0xEEDA2E54, 150)
    @U32 sceDisplayGetFrameBuf(@PTR topaddrPtr: Stream, @PTR bufferWidthPtr: Stream, @PTR pixelFormatPtr: Stream, @PTR syncPtr: Stream) {
		if (topaddrPtr) topaddrPtr.writeInt32(this.context.display.address);
		if (bufferWidthPtr) bufferWidthPtr.writeInt32(this.context.display.bufferWidth);
		if (pixelFormatPtr) pixelFormatPtr.writeInt32(this.context.display.pixelFormat);
		if (syncPtr) syncPtr.writeInt32(this.context.display.sync);
		return 0;
	}

	@nativeFunctionEx(0x773DD3A3, 150)
    @U32 sceDisplayGetCurrentHcount() {
		this.context.display.updateTime();
		return this.context.display.hcountTotal;
	}
}

enum SebufMode {
    IMMEDIATE = 0,
    NEXTFRAME = 1
}
