///<reference path="../../../global.d.ts" />

import _utils = require('../../utils');
import _context = require('../../../context');
import _cpu = require('../../../core/cpu');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../../SceKernelErrors');
import _manager = require('../../manager'); _manager.Thread;

import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import CpuState = _cpu.CpuState;

import Thread = _manager.Thread;
import ThreadStatus = _manager.ThreadStatus;
import PspThreadAttributes = _manager.PspThreadAttributes;
import OutOfMemoryError = _manager.OutOfMemoryError;

var console = logger.named('module.ThreadManForUser');

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	private threadUids = new UidCollection<Thread>(1);

	@nativeFunction(0x446D8DE6, 150, 'int', 'string/uint/int/int/int/int/Thread')
	sceKernelCreateThread(name: string, entryPoint: number, initPriority: number, stackSize: number, attributes: PspThreadAttributes, optionPtr: number, currentThread: Thread) {
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
			//return Promise2.resolve(newThread.id);
		} catch (e) {
			if (e instanceof OutOfMemoryError) return SceKernelErrors.ERROR_KERNEL_NO_MEMORY;
			throw(e);
		}
	}
	
	hasThreadById(id: number) { return this.threadUids.has(id);  }

	getThreadById(id: number) {
		if (id == 0) return this.context.threadManager.current;
		return this.threadUids.get(id);
	}

	private _sceKernelDelayThreadCB(thread: Thread, delayInMicroseconds: number, acceptCallbacks: AcceptCallbacks) {
		return new WaitingThreadInfo('_sceKernelDelayThreadCB', 'microseconds:' + delayInMicroseconds, thread.delayMicrosecondsAsync(delayInMicroseconds, false), acceptCallbacks);
	}

	@nativeFunction(0xCEADEB47, 150, 'uint', 'Thread/uint')
	sceKernelDelayThread(thread:Thread, delayInMicroseconds: number) {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.NO);
	}

	@nativeFunction(0x68DA9E36, 150, 'uint', 'Thread/uint')
	sceKernelDelayThreadCB(thread: Thread, delayInMicroseconds: number) {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.YES);
	}

	private _sceKernelWaitThreadEndCB(thread: Thread, acceptCallbacks:AcceptCallbacks) {
		return new WaitingThreadInfo('_sceKernelWaitThreadEndCB', thread, thread.waitEndAsync().then(() => thread.exitStatus), acceptCallbacks);
	}

	@nativeFunction(0x840E8133, 150, 'uint', 'uint/void*')
	sceKernelWaitThreadEndCB(threadId: number, timeoutPtr: Stream):any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.YES);
	}

	@nativeFunction(0x278C0DF5, 150, 'uint', 'uint/void*')
	sceKernelWaitThreadEnd(threadId: number, timeoutPtr: Stream): any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.NO);
	}

	@nativeFunction(0x94AA61EE, 150, 'int', 'Thread')
	sceKernelGetThreadCurrentPriority(currentThread: Thread) {
		return currentThread.priority;
	}

	@nativeFunction(0xF475845D, 150, 'uint', 'Thread/int/int/int')
	sceKernelStartThread(currentThread: Thread, threadId: number, userDataLength: number, userDataPointer: number):any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var newThread = this.getThreadById(threadId);

		newThread.exitStatus = SceKernelErrors.ERROR_KERNEL_THREAD_IS_NOT_DORMANT;

		//if (!newThread) debugger;

		var newState = newThread.state;
		const memory = newState.memory;
		newState.setRA(CpuSpecialAddresses.EXIT_THREAD);

		var copiedDataAddress = ((newThread.stackPartition.high) - ((userDataLength + 0xF) & ~0xF));

		if (userDataPointer != null) {
			memory.copy(userDataPointer, copiedDataAddress, userDataLength);
			newState.gpr[4] = userDataLength;
			newState.gpr[5] = copiedDataAddress;
		} else {
			newState.gpr[4] = 0;
			newState.gpr[5] = 0;
		}
		
		var currentStack = newThread.stackPartition;
		if ((newThread.attributes & 0x00100000) == 0) { // PSP_THREAD_ATTR_NO_FILLSTACK
			memory.memset(currentStack.low, 0xFF, currentStack.size);
		}

		newState.SP = copiedDataAddress;
		
		newState.SP -= 0x100;
		newState.K0 = newState.SP;
		memory.memset(newState.K0, 0, 0x100);
		memory.sw(newState.K0 + 0xc0, newThread.id); 
		memory.sw(newState.K0 + 0xc8, currentStack.low);
		memory.sw(newState.K0 + 0xf8, 0xFFFFFFFF);
		memory.sw(newState.K0 + 0xfc, 0xFFFFFFFF);
		memory.sw(currentStack.low, newThread.id);

		console.info(sprintf('sceKernelStartThread: %d:"%s":priority=%d, currentPriority=%d, SP=%08X, GP=%08X, FP=%08X', threadId, newThread.name, newThread.priority, currentThread.priority, newState.SP, newState.GP, newState.FP));

		newThread.start();
		return Promise2.resolve(0);
	}

	@nativeFunction(0x71BC9871, 150, 'uint', 'Thread/int/int')
	sceKernelChangeThreadPriority(currentThread: Thread, threadId: number, priority: number): any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var thread = this.getThreadById(threadId);
		thread.priority = priority;
		return Promise2.resolve(0);
	}

	@nativeFunction(0xAA73C935, 150, 'int', 'Thread/int')
	sceKernelExitThread(currentThread: Thread, exitStatus: number) {
		console.info(sprintf('sceKernelExitThread: %d', exitStatus));

		currentThread.exitStatus = (exitStatus < 0) ? SceKernelErrors.ERROR_KERNEL_ILLEGAL_ARGUMENT : exitStatus;
		currentThread.stop('sceKernelExitThread');
		throw new Error('CpuBreakException');
	}

	@nativeFunction(0x3B183E26, 150, 'int', 'int')
	sceKernelGetThreadExitStatus(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var thread = this.getThreadById(threadId);
		return thread.exitStatus;
	}

	_sceKernelTerminateThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var newThread = this.getThreadById(threadId);
		newThread.stop('_sceKernelTerminateThread');
		newThread.exitStatus = 0x800201ac;
		return 0;
	}

	_sceKernelDeleteThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var newThread = this.getThreadById(threadId);
		newThread.delete();
		this.threadUids.remove(threadId);
		return 0;
	}

	@nativeFunction(0x9FA03CD3, 150, 'int', 'int')
	sceKernelDeleteThread(threadId: number) {
		return this._sceKernelDeleteThread(threadId);
	}

	@nativeFunction(0x616403BA, 150, 'int', 'int')
	sceKernelTerminateThread(threadId: number) {
		console.info(sprintf('sceKernelTerminateThread: %d', threadId));

		return this._sceKernelTerminateThread(threadId);
	}

	@nativeFunction(0x809CE29B, 150, 'uint', 'Thread/int')
	sceKernelExitDeleteThread(currentThread: Thread, exitStatus: number) {
		currentThread.exitStatus = exitStatus;
		currentThread.stop('sceKernelExitDeleteThread');
		throw new Error('CpuBreakException');
	}

	@nativeFunction(0x383F7BCC, 150, 'int', 'int')
	sceKernelTerminateDeleteThread(threadId: number) {
		this._sceKernelTerminateThread(threadId);
		this._sceKernelDeleteThread(threadId);
		return 0;
	}

	@nativeFunction(0x82826F70, 150, 'uint', 'Thread')
	sceKernelSleepThreadCB(currentThread: Thread) {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.YES);
	}

	@nativeFunction(0x9ACE131E, 150, 'uint', 'Thread')
	sceKernelSleepThread(currentThread: Thread) {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.NO);
	}

	@nativeFunction(0xD59EAD2F, 150, 'uint', 'int')
	sceKernelWakeupThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return Promise2.resolve(SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD);
		var thread = this.getThreadById(threadId);
		return thread.wakeupWakeupAsync();
	}

	_getCurrentMicroseconds() {
		return this.context.rtc.getCurrentUnixMicroseconds();
	}

	@nativeFunction(0x110DEC9A, 150, 'uint', 'uint/void*')
	sceKernelUSec2SysClock(microseconds: number, clockPtr: Stream) {
		if (clockPtr != null) clockPtr.writeInt64(Integer64.fromUnsignedInt(microseconds));
		return 0;
	}

	@nativeFunction(0x369ED59D, 150, 'uint', '')
	sceKernelGetSystemTimeLow() {
		return this._getCurrentMicroseconds();
	}

	@nativeFunction(0xDB738F35, 150, 'uint', 'void*')
	sceKernelGetSystemTime(timePtr: Stream) {
		if (timePtr == null) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
		timePtr.writeInt64(Integer64.fromNumber(this._getCurrentMicroseconds()));
		return 0;
	}

	@nativeFunction(0x82BC5777, 150, 'long', '')
	sceKernelGetSystemTimeWide() {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return Integer64.fromNumber(this._getCurrentMicroseconds());
	}

	@nativeFunction(0x293B45B8, 150, 'int', 'Thread')
	sceKernelGetThreadId(currentThread: Thread) {
		return currentThread.id
	}

	@nativeFunction(0x9944F31F, 150, 'int', 'int')
	sceKernelSuspendThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		this.getThreadById(threadId).suspend();
		return 0;
	}

	@nativeFunction(0x75156E8F, 150, 'int', 'int')
	sceKernelResumeThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		this.getThreadById(threadId).resume();
		return 0;
	}

	@nativeFunction(0x17C1684E, 150, 'int', 'int/void*')
	sceKernelReferThreadStatus(threadId: number, sceKernelThreadInfoPtr: Stream) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
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
	}

	@nativeFunction(0xEA748E31, 150, 'int', 'uint/uint/uint')
	sceKernelChangeCurrentThreadAttr(currentThread: Thread, removeAttributes: number, addAttributes: number) {
		currentThread.attributes &= ~removeAttributes;
		currentThread.attributes |= addAttributes;
		return 0;
	}

	@nativeFunction(0xC8CD158C, 150, 'int', 'uint')
	sceKernelUSec2SysClockWide(microseconds: number) {
		return microseconds;
	}
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

