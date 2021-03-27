import {
	AcceptCallbacks,
	SortedSet,
	UidCollection,
	WaitingThreadInfo
} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {
    Struct,
    StructInt32,
    StructStructStringz, StructUInt32
} from "../../../global/struct";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {CPUSTATE, I32, nativeFunction, PTR, STRING, U32} from "../../utils";
import {CpuState} from "../../../core/cpu/cpu_core";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }


	private eventFlagUids = new UidCollection<EventFlag>(1);

	@nativeFunction(0x55C20A00, 150)
	@U32 sceKernelCreateEventFlag(
	    @STRING name: string,
        @I32 attributes: number,
        @I32 bitPattern: number,
        @PTR optionsPtr: Stream
    ) {
		if (name === null) return SceKernelErrors.ERROR_ERROR;
		if ((attributes & 0x100) != 0 || attributes >= 0x300) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ATTR;

		//console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
        const eventFlag = new EventFlag();
        eventFlag.name = name;
		eventFlag.attributes = attributes;
		eventFlag.initialPattern = bitPattern;
		eventFlag.currentPattern = bitPattern;
		return this.eventFlagUids.allocate(eventFlag);
	}

	@nativeFunction(0x1FB15A32, 150)
    @U32 sceKernelSetEventFlag(@I32 id: number, @U32 bitPattern: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).setBits(bitPattern);
		return 0;
	}

	private _sceKernelWaitEventFlagCB(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, acceptCallbacks: AcceptCallbacks, state: CpuState): any {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
        const eventFlag = this.eventFlagUids.get(id);

        if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
        const timedOut = false;
        const previousPattern = eventFlag.currentPattern;
        const promise = (async () => {
            await eventFlag.waitAsync(bits, waitType, outBits, timeout, acceptCallbacks, state)
            if (outBits != null) outBits.writeUInt32(previousPattern);
            return 0;
        })()
        return new WaitingThreadInfo('_sceKernelWaitEventFlagCB', eventFlag, promise, acceptCallbacks);
	}

	@nativeFunction(0x402FCF22, 150)
    @U32 sceKernelWaitEventFlag(
        @I32 id: number, @U32 bits: number,
        @I32 waitType: EventFlagWaitTypeSet,
        @PTR outBits: Stream, @PTR timeout: Stream,
        @CPUSTATE state: CpuState,
    ) {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, AcceptCallbacks.NO, state);
	}

	@nativeFunction(0x328C546A, 150)
    @U32 sceKernelWaitEventFlagCB(
        @I32 id: number, @U32 bits: number,
        @I32 waitType: EventFlagWaitTypeSet,
        @PTR outBits: Stream, @PTR timeout: Stream,
        @CPUSTATE state: CpuState,
    ) {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, AcceptCallbacks.YES, state);
	}

	@nativeFunction(0x30FD48F0, 150)
    @U32 sceKernelPollEventFlag(
        @I32 id: number, @U32 bits: number,
        @I32 waitType: EventFlagWaitTypeSet,
        @PTR outBits: Stream
    ) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if ((waitType & (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) == (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) {
			return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		}
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
		if (EventFlag == null) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;

        const matched = this.eventFlagUids.get(id).poll(bits, waitType, outBits);

        return matched ? 0 : SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_POLL_FAILED;
	}

	@nativeFunction(0xEF9E4C70, 150)
    @U32 sceKernelDeleteEventFlag(@I32 id: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.remove(id);
		return 0;
	}

	@nativeFunction(0x812346E4, 150)
    @U32 sceKernelClearEventFlag(@I32 id: number, @U32 bitsToClear: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).clearBits(bitsToClear);
		return 0;
	}

	@nativeFunction(0xCD203292, 150)
    @U32 sceKernelCancelEventFlag(@I32 id: number, @U32 newPattern: number, @PTR numWaitThreadPtr: Stream) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).cancel(newPattern);
		return 0;
	}

	@nativeFunction(0xA66B0120, 150)
    @U32 sceKernelReferEventFlagStatus(@I32 id: number, @PTR infoPtr: Stream) {
        const size = infoPtr.readUInt32();
        if (size == 0) return 0;

		infoPtr.position = 0;
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
        const eventFlag = this.eventFlagUids.get(id);
        const info = new EventFlagInfo();
        info.size = EventFlagInfo.struct.length;
		info.name = eventFlag.name;
		info.currentPattern = eventFlag.currentPattern;
		info.initialPattern = eventFlag.initialPattern;
		info.attributes = eventFlag.attributes;
		info.numberOfWaitingThreads = eventFlag.waitingThreads.length;
		EventFlagInfo.struct.write(infoPtr, info);
		console.warn('Not implemented ThreadManForUser.sceKernelReferEventFlagStatus');
		return 0;
	}
}


class EventFlagWaitingThread {
	constructor(public bitsToMatch: number, public waitType: EventFlagWaitTypeSet, public outBits: Stream, public eventFlag: EventFlag, public wakeUp: () => void) {
	}
}

class EventFlag {
	name: string = ''
	attributes: number = 0
	currentPattern: number = 0
	initialPattern: number = 0
	waitingThreads = new SortedSet<EventFlagWaitingThread>();

	waitAsync(bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: AcceptCallbacks, state: CpuState) {
		return new Promise((resolve, reject) => {
			const waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, this, () => {
				this.waitingThreads.delete(waitingSemaphoreThread);
				resolve(0);
				state.throwEndCycles();
			});
			this.waitingThreads.add(waitingSemaphoreThread);
		})
	}

	poll(bitsToMatch: number, waitType: EventFlagWaitTypeSet, outBits: Stream) {
		if (outBits != null) outBits.writeInt32(this.currentPattern);

		if (
			(waitType & EventFlagWaitTypeSet.Or)
			? ((this.currentPattern & bitsToMatch) != 0) // one or more bits of the mask
			: ((this.currentPattern & bitsToMatch) == bitsToMatch)) // all the bits of the mask
		{
			this._doClear(bitsToMatch, waitType);
			return true;
		}

		return false;
	}

	private _doClear(bitsToMatch: number, waitType: EventFlagWaitTypeSet) {
		if (waitType & (EventFlagWaitTypeSet.ClearAll)) this.clearBits(~0xFFFFFFFF, false);
		if (waitType & (EventFlagWaitTypeSet.Clear)) this.clearBits(~bitsToMatch, false);
	}

	cancel(newPattern: number) {
		this.waitingThreads.forEach(item => {
			item.wakeUp();
		});
	}

	clearBits(bitsToClear: number, doUpdateWaitingThreads = true) {
		this.currentPattern &= bitsToClear;
		if (doUpdateWaitingThreads) this.updateWaitingThreads();
	}

	setBits(bits: number, doUpdateWaitingThreads = true) {
		this.currentPattern |= bits;
		if (doUpdateWaitingThreads) this.updateWaitingThreads();
	}

	private updateWaitingThreads() {
		this.waitingThreads.forEach(waitingThread => {
			if (this.poll(waitingThread.bitsToMatch, waitingThread.waitType, waitingThread.outBits)) {
				waitingThread.wakeUp();
			}
		});
	}
}

class EventFlagInfo extends Struct {
	@StructInt32 size: number = 0
	@StructStructStringz(32) name: string = ''
    @StructInt32 attributes: number = 0 // HleEventFlag.AttributesSet
    @StructUInt32 initialPattern: number = 0
    @StructUInt32 currentPattern: number = 0
    @StructInt32 numberOfWaitingThreads: number = 0
}

enum EventFlagWaitTypeSet {
	And = 0x00,
	Or = 0x01,
	ClearAll = 0x10,
	Clear = 0x20,
	MaskValidBits = Or | Clear | ClearAll,
}
