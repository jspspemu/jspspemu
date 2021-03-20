import * as _utils from '../../utils';
import * as _context from '../../../context';
import nativeFunction = _utils.nativeFunction;
import {
	AcceptCallbacks,
	PromiseFast,
	SortedSet,
	throwEndCycles,
	UidCollection,
	WaitingThreadInfo
} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {Int32, Stringz, StructClass, UInt32} from "../../../global/struct";
import {SceKernelErrors} from "../../SceKernelErrors";

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }


	private eventFlagUids = new UidCollection<EventFlag>(1);

	@nativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*')
	sceKernelCreateEventFlag(name: string, attributes: number, bitPattern: number, optionsPtr: Stream) {
		if (name === null) return SceKernelErrors.ERROR_ERROR;
		if ((attributes & 0x100) != 0 || attributes >= 0x300) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ATTR;

		//console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
		var eventFlag = new EventFlag();
		eventFlag.name = name;
		eventFlag.attributes = attributes;
		eventFlag.initialPattern = bitPattern;
		eventFlag.currentPattern = bitPattern;
		return this.eventFlagUids.allocate(eventFlag);
	}

	@nativeFunction(0x1FB15A32, 150, 'uint', 'int/uint')
	sceKernelSetEventFlag(id: number, bitPattern: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).setBits(bitPattern);
		return 0;
	}

	private _sceKernelWaitEventFlagCB(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, acceptCallbacks: AcceptCallbacks): any {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		var eventFlag = this.eventFlagUids.get(id);

		if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
		var timedOut = false;
		var previousPattern = eventFlag.currentPattern;
		return new WaitingThreadInfo('_sceKernelWaitEventFlagCB', eventFlag, eventFlag.waitAsync(bits, waitType, outBits, timeout, acceptCallbacks).then(() => {
			if (outBits != null) outBits.writeUInt32(previousPattern);
			return 0;
		}), acceptCallbacks);
	}

	@nativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*')
	sceKernelWaitEventFlag(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, AcceptCallbacks.NO);
	}

	@nativeFunction(0x328C546A, 150, 'uint', 'int/uint/int/void*/void*')
	sceKernelWaitEventFlagCB(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, AcceptCallbacks.YES);
	}

	@nativeFunction(0x30FD48F0, 150, 'uint', 'int/uint/int/void*')
	sceKernelPollEventFlag(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if ((waitType & (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) == (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) {
			return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		}
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
		if (EventFlag == null) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;

		var matched = this.eventFlagUids.get(id).poll(bits, waitType, outBits);

		return matched ? 0 : SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_POLL_FAILED;
	}

	@nativeFunction(0xEF9E4C70, 150, 'uint', 'int')
	sceKernelDeleteEventFlag(id: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.remove(id);
		return 0;
	}

	@nativeFunction(0x812346E4, 150, 'uint', 'int/uint')
	sceKernelClearEventFlag(id: number, bitsToClear: number) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).clearBits(bitsToClear);
		return 0;
	}

	@nativeFunction(0xCD203292, 150, 'uint', 'int/uint/void*')
	sceKernelCancelEventFlag(id: number, newPattern: number, numWaitThreadPtr: Stream) {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).cancel(newPattern);
		return 0;
	}

	@nativeFunction(0xA66B0120, 150, 'uint', 'int/void*')
	sceKernelReferEventFlagStatus(id: number, infoPtr: Stream) {
		var size = infoPtr.readUInt32();
		if (size == 0) return 0;

		infoPtr.position = 0;
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		var eventFlag = this.eventFlagUids.get(id);
		var info = new EventFlagInfo();
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
	name: string;
	attributes: number;
	currentPattern: number;
	initialPattern: number;
	waitingThreads = new SortedSet<EventFlagWaitingThread>();

	waitAsync(bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: AcceptCallbacks) {
		return new PromiseFast((resolve, reject) => {
			var waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, this, () => {
				this.waitingThreads.delete(waitingSemaphoreThread);
				resolve();
				throwEndCycles();
			});
			this.waitingThreads.add(waitingSemaphoreThread);
		}).then(() => 0);
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

class EventFlagInfo {
	size: number;
	name: string;
	attributes: number; // HleEventFlag.AttributesSet
	initialPattern: number;
	currentPattern: number;
	numberOfWaitingThreads: number;

	static struct = StructClass.create<EventFlagInfo>(EventFlagInfo, [
		{ size: Int32 },
		{ name: Stringz(32) },
		{ attributes: Int32 },
		{ initialPattern: UInt32 },
		{ currentPattern: UInt32 },
		{ numberOfWaitingThreads: Int32 },
	]);
}

enum EventFlagWaitTypeSet {
	And = 0x00,
	Or = 0x01,
	ClearAll = 0x10,
	Clear = 0x20,
	MaskValidBits = Or | Clear | ClearAll,
}
