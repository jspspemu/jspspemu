import {Stream} from "../../global/stream";
import {AcceptCallbacks, WaitingThreadInfo} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, PTR, THREAD, U32} from "../utils";
import {SceCtrlData} from "../../core/controller";
import {Thread} from "../manager/thread";

export class sceCtrl {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x3A622550, 150)
    @U32 sceCtrlPeekBufferPositive(@PTR sceCtrlDataPtr: Stream, @I32 count: number) {
		//console.log('sceCtrlPeekBufferPositive');
		for (let n = 0; n < count; n++) SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
        return count;
    }

	@nativeFunction(0x1F803938, 150)
    @U32 sceCtrlReadBufferPositive(@THREAD thread: Thread, @PTR sceCtrlDataPtr: Stream, @I32 count: number) {
		//console.log('sceCtrlReadBufferPositive');

		for (let n = 0; n < count; n++) SceCtrlData.struct.write(sceCtrlDataPtr, this.context.controller.data);
		//return PromiseFast.resolve(0);
        const promise = (async () => {
            await this.context.display.waitVblankStartAsync(thread)
            return count
        })()
		return new WaitingThreadInfo('sceCtrlReadBufferPositive', this.context.display, promise, AcceptCallbacks.NO);
		//return 0;
    }

	@nativeFunction(0x6A2774F3, 150)
    @U32 sceCtrlSetSamplingCycle(@I32 samplingCycle: number) {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingCycle');
        return 0;
    }

	@nativeFunction(0x1F4011E6, 150)
    @U32 sceCtrlSetSamplingMode(@I32 samplingMode: number) {
        //console.warn('Not implemented sceCtrl.sceCtrlSetSamplingMode');
        return 0;
	}

	private lastLatchData = new SceCtrlData();

	_peekLatch(currentLatchPtr: Stream) {
        const ButtonsNew = this.context.controller.data.buttons;
        const ButtonsOld = this.lastLatchData.buttons;
        const ButtonsChanged = ButtonsOld ^ ButtonsNew;

        currentLatchPtr.writeInt32(ButtonsNew & ButtonsChanged); // uiMake
		currentLatchPtr.writeInt32(ButtonsOld & ButtonsChanged); // uiBreak
		currentLatchPtr.writeInt32(ButtonsNew); // uiPress
		currentLatchPtr.writeInt32((ButtonsOld & ~ButtonsNew) & ButtonsChanged); // uiRelease

		return this.context.controller.latchSamplingCount;
	}

	@nativeFunction(0x0B588501, 150)
	@U32 sceCtrlReadLatch(@PTR currentLatchPtr: Stream) {
		try {
			return this._peekLatch(currentLatchPtr);
		} finally {
			this.lastLatchData = this.context.controller.data;
			this.context.controller.latchSamplingCount = 0;
		}
	}

	@nativeFunction(0xA7144800, 150)
    @U32 sceCtrlSetIdleCancelThreshold(@I32 idlereset: number, @I32 idleback: number) {
		return 0;
	}
}
