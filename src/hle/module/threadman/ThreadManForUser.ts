import _utils = require('../../utils');
import _context = require('../../../context');
import _cpu = require('../../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../../SceKernelErrors');
import _manager = require('../../manager'); _manager.Thread;

import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import CpuState = _cpu.CpuState;

import Thread = _manager.Thread;
import ThreadStatus = _manager.ThreadStatus;
import PspThreadAttributes = _manager.PspThreadAttributes;
import OutOfMemoryError = _manager.OutOfMemoryError;

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	private threadUids = new UidCollection<Thread>(1);

	sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'int', 'string/uint/int/int/int/int/Thread', this, (name: string, entryPoint: number, initPriority: number, stackSize: number, attributes: PspThreadAttributes, optionPtr: number, currentThread: Thread) => {
		if (name == null) return SceKernelErrors.ERROR_ERROR;
		if (stackSize < 0x200) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_STACK_SIZE;
		if (initPriority < 0x08 || initPriority > 0x77) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_PRIORITY;

		if (!this.context.memory.isValidAddress(entryPoint) || entryPoint == 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_THREAD_ENTRY_ADDR;
		if (name.length > 31) name = name.substr(0, 31);
		if (stackSize > 2 * 1024 * 1024) return -3;
		if ((attributes & (~PspThreadAttributes.ValidMask)) != 0) {
			//console.log(sprintf('Invalid mask %08X, %08X, %08X', attributes, PspThreadAttributes.ValidMask, (attributes & (~PspThreadAttributes.ValidMask))));
			return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ATTR;
		}

		attributes |= PspThreadAttributes.User;
		attributes |= PspThreadAttributes.LowFF;

		try {
			stackSize = Math.max(stackSize, 0x200); // 512 byte min. (required for interrupts)
			stackSize = MathUtils.nextAligned(stackSize, 0x100); // Aligned to 256 bytes.

			var newThread = this.context.threadManager.create(name, entryPoint, initPriority, stackSize, attributes);
			newThread.id = this.threadUids.allocate(newThread);
			newThread.status = ThreadStatus.DORMANT;

			newThread.state.GP = currentThread.state.GP;

			console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d, entryPC=%08X', newThread.id, newThread.name, newThread.priority, currentThread.priority, entryPoint));

			return newThread.id;
			//return Promise.resolve(newThread.id);
		} catch (e) {
			if (e instanceof OutOfMemoryError) return SceKernelErrors.ERROR_KERNEL_NO_MEMORY;
			throw(e);
		}
	});

	getThreadById(id: number) {
		if (id == 0) return this.context.threadManager.current;
		if (!this.threadUids.has(id)) throw (new SceKernelException(SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD));
		return this.threadUids.get(id);
	}

	private _sceKernelDelayThreadCB(thread: Thread, delayInMicroseconds: number, acceptCallbacks: AcceptCallbacks) {
		return new WaitingThreadInfo('_sceKernelDelayThreadCB', 'microseconds:' + delayInMicroseconds, thread.delayMicrosecondsAsync(delayInMicroseconds), acceptCallbacks);
	}

	sceKernelDelayThread = createNativeFunction(0xCEADEB47, 150, 'uint', 'Thread/uint', this, (thread:Thread, delayInMicroseconds: number) => {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.NO);
	});

	sceKernelDelayThreadCB = createNativeFunction(0x68DA9E36, 150, 'uint', 'Thread/uint', this, (thread: Thread, delayInMicroseconds: number) => {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.YES);
	});

	private _sceKernelWaitThreadEndCB(thread: Thread, acceptCallbacks:AcceptCallbacks) {
		return new WaitingThreadInfo('_sceKernelWaitThreadEndCB', thread, thread.waitEndAsync().then(() => 0), acceptCallbacks);

	}

	sceKernelWaitThreadEndCB = createNativeFunction(0x840E8133, 150, 'uint', 'uint/void*', this, (threadId: number, timeoutPtr: Stream):any => {
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.YES);
	});

	sceKernelWaitThreadEnd = createNativeFunction(0x278C0DF5, 150, 'uint', 'uint/void*', this, (threadId: number, timeoutPtr: Stream): any => {
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.NO);
	});

	sceKernelGetThreadCurrentPriority = createNativeFunction(0x94AA61EE, 150, 'int', 'Thread', this, (currentThread: Thread) => currentThread.priority);

	sceKernelStartThread = createNativeFunction(0xF475845D, 150, 'uint', 'Thread/int/int/int', this, (currentThread: Thread, threadId: number, userDataLength: number, userDataPointer: number):any => {
		var newThread = this.getThreadById(threadId);

		//if (!newThread) debugger;

		var newState = newThread.state;
		newState.setRA(CpuSpecialAddresses.EXIT_THREAD);

		var copiedDataAddress = ((newThread.stackPartition.high - 0x100) - ((userDataLength + 0xF) & ~0xF));

		if (userDataPointer != null) {
			newState.memory.copy(userDataPointer, copiedDataAddress, userDataLength);
			newState.gpr[4] = userDataLength;
			newState.gpr[5] = copiedDataAddress;
		}

		newState.SP = copiedDataAddress - 0x40;

		console.info(sprintf('sceKernelStartThread: %d:"%s":priority=%d, currentPriority=%d, SP=%08X, GP=%08X, FP=%08X', threadId, newThread.name, newThread.priority, currentThread.priority, newState.SP, newState.GP, newState.FP));

		newThread.start();
		return Promise.resolve(0);
	});

	sceKernelChangeThreadPriority = createNativeFunction(0x71BC9871, 150, 'uint', 'Thread/int/int', this, (currentThread: Thread, threadId: number, priority: number): any => {
		var thread = this.getThreadById(threadId);
		thread.priority = priority;
		return Promise.resolve(0);
	});

	sceKernelExitThread = createNativeFunction(0xAA73C935, 150, 'int', 'Thread/int', this, (currentThread: Thread, exitStatus: number) => {
		console.info(sprintf('sceKernelExitThread: %d', exitStatus));

		currentThread.exitStatus = exitStatus;
		currentThread.stop();
		throw (new CpuBreakException());
	});

	sceKernelGetThreadExitStatus = createNativeFunction(0x3B183E26, 150, 'int', 'int', this, (threadId: number) => {
		var thread = this.getThreadById(threadId);
		return thread.exitStatus;
	});

	_sceKernelTerminateThread(threadId: number) {
		var newThread = this.getThreadById(threadId);
		newThread.stop();
		newThread.exitStatus = 0x800201ac;
		return 0;
	}

	_sceKernelDeleteThread(threadId: number) {
		var newThread = this.getThreadById(threadId);
		newThread.delete();
		this.threadUids.remove(threadId);
		return 0;
	}

	sceKernelDeleteThread = createNativeFunction(0x9FA03CD3, 150, 'int', 'int', this, (threadId: number) => {
		return this._sceKernelDeleteThread(threadId);
	});

	sceKernelTerminateThread = createNativeFunction(0x616403BA, 150, 'int', 'int', this, (threadId: number) => {
		console.info(sprintf('sceKernelTerminateThread: %d', threadId));

		return this._sceKernelTerminateThread(threadId);
	});

	sceKernelExitDeleteThread = createNativeFunction(0x809CE29B, 150, 'uint', 'Thread/int', this, (currentThread: Thread, exitStatus: number) => {
		currentThread.exitStatus = exitStatus;
		currentThread.stop();
		throw (new CpuBreakException());
	});

	sceKernelTerminateDeleteThread = createNativeFunction(0x383F7BCC, 150, 'int', 'int', this, (threadId: number) => {
		this._sceKernelTerminateThread(threadId);
		this._sceKernelDeleteThread(threadId);
		return 0;
	});

	sceKernelSleepThreadCB = createNativeFunction(0x82826F70, 150, 'uint', 'Thread', this, (currentThread: Thread) => {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.YES);
	});

	sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'Thread', this, (currentThread: Thread) => {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.NO);
	});

	sceKernelWakeupThread = createNativeFunction(0xD59EAD2F, 150, 'uint', 'int', this, (threadId: number) => {
		var thread = this.getThreadById(threadId);
		return thread.wakeupWakeupAsync();
	});

	_getCurrentMicroseconds() {
		return this.context.rtc.getCurrentUnixMicroseconds();
	}

	sceKernelUSec2SysClock = createNativeFunction(0x110DEC9A, 150, 'uint', 'uint/void*', this, (microseconds: number, clockPtr: Stream) => {
		if (clockPtr != null) clockPtr.writeInt64(Integer64.fromUnsignedInt(microseconds));
		return 0;
	});

	sceKernelGetSystemTimeLow = createNativeFunction(0x369ED59D, 150, 'uint', '', this, () => {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return this._getCurrentMicroseconds();
	});

	sceKernelGetSystemTime = createNativeFunction(0xDB738F35, 150, 'uint', 'void*', this, (timePtr: Stream) => {
		if (timePtr == null) throw (new SceKernelException(SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT));

		timePtr.writeInt64(Integer64.fromNumber(this._getCurrentMicroseconds()));
		return 0;
	});

	sceKernelGetSystemTimeWide = createNativeFunction(0x82BC5777, 150, 'long', '', this, () => {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return Integer64.fromNumber(this._getCurrentMicroseconds());
	});

	sceKernelGetThreadId = createNativeFunction(0x293B45B8, 150, 'int', 'Thread', this, (currentThread: Thread) => {
		return currentThread.id
	});

	sceKernelSuspendThread = createNativeFunction(0x9944F31F, 150, 'int', 'int', this, (threadId: number) => {
		this.getThreadById(threadId).suspend();
		return 0;
	});

	sceKernelResumeThread = createNativeFunction(0x75156E8F, 150, 'int', 'int', this, (threadId: number) => {
		this.getThreadById(threadId).resume();
		return 0;
	});

	sceKernelReferThreadStatus = createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, (threadId: number, sceKernelThreadInfoPtr: Stream) => {
		var thread = this.getThreadById(threadId);

		var info = new SceKernelThreadInfo();

		info.size = SceKernelThreadInfo.struct.length;

		info.name = thread.name;
		info.attributes = thread.attributes;
		info.status = thread.status;
		info.threadPreemptionCount = thread.preemptionCount;
		info.entryPoint = thread.entryPoint
		info.stackPointer = thread.stackPartition.high;
		info.stackSize = thread.stackPartition.size;
		info.GP = thread.state.GP;

		info.priorityInit = thread.initialPriority;
		info.priority = thread.priority;
		info.waitType = 0;
		info.waitId = 0;
		info.wakeupCount = 0;
		info.exitStatus = thread.exitStatus;
		info.runClocksLow = 0;
		info.runClocksHigh = 0;
		info.interruptPreemptionCount = 0;
		info.threadPreemptionCount = 0;
		info.releaseCount = 0;

		SceKernelThreadInfo.struct.write(sceKernelThreadInfoPtr, info);

		return 0;
	});

	sceKernelChangeCurrentThreadAttr = createNativeFunction(0xEA748E31, 150, 'int', 'uint/uint/uint', this, (currentThread: Thread, removeAttributes: number, addAttributes: number) => {
		currentThread.attributes &= ~removeAttributes;
		currentThread.attributes |= addAttributes;
		return 0;
	});

	sceKernelUSec2SysClockWide = createNativeFunction(0xC8CD158C, 150, 'int', 'uint', this, (microseconds: number) => {
		return microseconds;
	});
}

class SceKernelThreadInfo {
    size: number;
    name: string;
    attributes: number;
	status: ThreadStatus;
    entryPoint: number;
    stackPointer: number;
    stackSize: number;
    GP: number;
    priorityInit: number;
    priority: number;
    waitType: number;
    waitId: number;
    wakeupCount: number;
    exitStatus: number;
    runClocksLow: number;
    runClocksHigh: number;
    interruptPreemptionCount: number;
    threadPreemptionCount: number;
    releaseCount: number;

    static struct = StructClass.create<SceKernelThreadInfo>(SceKernelThreadInfo, [
		{ size: Int32 },
		{ name: Stringz(32) },
		{ attributes: UInt32 },
		{ status: UInt32 },
		{ entryPoint: UInt32 },
		{ stackPointer: UInt32 },
		{ stackSize: Int32 },
		{ GP: UInt32 },
		{ priorityInit: Int32 },
		{ priority: Int32 },
		{ waitType: UInt32 },
		{ waitId: Int32 },
		{ wakeupCount: Int32 },
		{ exitStatus: Int32 },
		{ runClocksLow: Int32 },
		{ runClocksHigh: Int32 },
		{ interruptPreemptionCount: Int32 },
		{ threadPreemptionCount: Int32 },
		{ releaseCount: Int32 },
    ]);
}

