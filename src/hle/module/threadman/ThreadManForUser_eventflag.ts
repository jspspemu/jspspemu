import _utils = require('../../utils');
import _context = require('../../../context');
import _cpu = require('../../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../../SceKernelErrors');
import _manager = require('../../manager');
import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import CpuState = _cpu.CpuState;
import Thread = _manager.Thread;

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }


	private eventFlagUids = new UidCollection<EventFlag>(1);

	sceKernelCreateEventFlag = createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, (name: string, attributes: number, bitPattern: number, optionsPtr: Stream) => {
		if (name === null) return SceKernelErrors.ERROR_ERROR;
		if ((attributes & 0x100) != 0 || attributes >= 0x300) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ATTR;

		//console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
		var eventFlag = new EventFlag();
		eventFlag.name = name;
		eventFlag.attributes = attributes;
		eventFlag.initialPattern = bitPattern;
		eventFlag.currentPattern = bitPattern;
		return this.eventFlagUids.allocate(eventFlag);
	});

	sceKernelSetEventFlag = createNativeFunction(0x1FB15A32, 150, 'uint', 'int/uint', this, (id: number, bitPattern: number) => {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).setBits(bitPattern);
		return 0;
	});

	private _sceKernelWaitEventFlagCB(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: boolean): any {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		var eventFlag = this.eventFlagUids.get(id);

		if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
		var timedOut = false;
		var previousPattern = eventFlag.currentPattern;
		return new WaitingThreadInfo('_sceKernelWaitEventFlagCB', eventFlag, eventFlag.waitAsync(bits, waitType, outBits, timeout, callbacks).then(() => {
			if (outBits != null) outBits.writeUInt32(previousPattern);
			return 0;
		}));
	}

	sceKernelWaitEventFlag = createNativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) => {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, false);
	});

	sceKernelWaitEventFlagCB = createNativeFunction(0x328C546A, 150, 'uint', 'int/uint/int/void*/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) => {
		return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, true);
	});

	sceKernelPollEventFlag = createNativeFunction(0x30FD48F0, 150, 'uint', 'int/uint/int/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream) => {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		if ((waitType & (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) == (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) {
			return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
		}
		if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
		if (EventFlag == null) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;

		var matched = this.eventFlagUids.get(id).poll(bits, waitType, outBits);

		return matched ? 0 : SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_POLL_FAILED;
	});

	sceKernelDeleteEventFlag = createNativeFunction(0xEF9E4C70, 150, 'uint', 'int', this, (id: number) => {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.remove(id);
		return 0;
	});

	sceKernelClearEventFlag = createNativeFunction(0x812346E4, 150, 'uint', 'int/uint', this, (id: number, bitsToClear: number) => {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).clearBits(bitsToClear);
		return 0;
	});

	sceKernelCancelEventFlag = createNativeFunction(0xCD203292, 150, 'uint', 'int/uint/void*', this, (id: number, newPattern: number, numWaitThreadPtr: Stream) => {
		if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
		this.eventFlagUids.get(id).cancel(newPattern);
		return 0;
	});

	sceKernelReferEventFlagStatus = createNativeFunction(0xA66B0120, 150, 'uint', 'int/void*', this, (id: number, infoPtr: Stream) => {
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
	});

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

	waitAsync(bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: boolean) {
		return new Promise((resolve, reject) => {
			var waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, this, () => {
				this.waitingThreads.delete(waitingSemaphoreThread);
				resolve();
				throw (new CpuBreakException());
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
