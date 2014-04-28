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

	private threadUids = new UidCollection<Thread>(1);

	sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'uint', 'HleThread/string/uint/int/int/int/int', this, (currentThread: Thread, name: string, entryPoint: number, initPriority: number, stackSize: number, attribute: number, optionPtr: number) => {
		//var stackPartition = this.context.memoryManager.stackPartition;
		var newThread = this.context.threadManager.create(name, entryPoint, initPriority, stackSize);
		newThread.id = this.threadUids.allocate(newThread);

		console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d', newThread.id, newThread.name, newThread.priority, currentThread.priority));

		return newThread.id;
	});

	_sceKernelDelayThreadCB(delayInMicroseconds: number) {
		return new WaitingThreadInfo('_sceKernelDelayThreadCB', 'microseconds:' + delayInMicroseconds, PromiseUtils.delayAsync(delayInMicroseconds / 1000));
	}

	sceKernelDelayThread = createNativeFunction(0xCEADEB47, 150, 'uint', 'uint', this, (delayInMicroseconds: number) => {
		return this._sceKernelDelayThreadCB(delayInMicroseconds);
	});

	sceKernelDelayThreadCB = createNativeFunction(0x68DA9E36, 150, 'uint', 'uint', this, (delayInMicroseconds: number) => {
		return this._sceKernelDelayThreadCB(delayInMicroseconds);
	});

	sceKernelWaitThreadEndCB = createNativeFunction(0x840E8133, 150, 'uint', 'uint/void*', this, (threadId: number, timeoutPtr: Stream) => {
		var newThread = this.threadUids.get(threadId);

		return newThread.waitEndAsync().then(() => 0);
	});

	sceKernelWaitThreadEnd = createNativeFunction(0x278C0DF5, 150, 'uint', 'uint/void*', this, (threadId: number, timeoutPtr: Stream) => {
		var newThread = this.threadUids.get(threadId);

		return newThread.waitEndAsync().then(() => 0);
	});

	sceKernelGetThreadCurrentPriority = createNativeFunction(0x94AA61EE, 150, 'int', 'HleThread', this, (currentThread: Thread) => currentThread.priority);

	sceKernelStartThread = createNativeFunction(0xF475845D, 150, 'uint', 'HleThread/int/int/int', this, (currentThread: Thread, threadId: number, userDataLength: number, userDataPointer: number) => {
		var newThread = this.threadUids.get(threadId);

		var newState = newThread.state;
		newState.GP = currentThread.state.GP;
		newState.RA = CpuSpecialAddresses.EXIT_THREAD;

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

	sceKernelChangeThreadPriority = createNativeFunction(0x71BC9871, 150, 'uint', 'HleThread/int/int', this, (currentThread: Thread, threadId: number, priority: number): any => {
		if (!this.threadUids.has(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var thread = this.threadUids.get(threadId);
		thread.priority = priority;
		return Promise.resolve(0);
	});

	sceKernelExitThread = createNativeFunction(0xAA73C935, 150, 'int', 'HleThread/int', this, (currentThread: Thread, exitStatus: number) => {
		console.info(sprintf('sceKernelExitThread: %d', exitStatus));

		currentThread.exitStatus = exitStatus;
		currentThread.stop();
		throw (new CpuBreakException());
	});

	_sceKernelTerminateThread(threadId: number) {
		var newThread = this.threadUids.get(threadId);
		newThread.stop();
		newThread.exitStatus = 0x800201ac;
		return 0;
	}

	_sceKernelDeleteThread(threadId: number) {
		var newThread = this.threadUids.get(threadId);
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

	sceKernelExitDeleteThread = createNativeFunction(0x809CE29B, 150, 'uint', 'CpuState/int', this, (state: CpuState, exitStatus: number) => {
		var currentThread = (<Thread>state.thread);
		currentThread.exitStatus = exitStatus;
		currentThread.stop();
		throw (new CpuBreakException());
	});

	sceKernelTerminateDeleteThread = createNativeFunction(0x383F7BCC, 150, 'int', 'int', this, (threadId: number) => {
		this._sceKernelTerminateThread(threadId);
		this._sceKernelDeleteThread(threadId);
		return 0;
	});


	sceKernelCreateCallback = createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, (name: string, functionCallbackAddr: number, argument: number) => {
		console.warn('Not implemented ThreadManForUser.sceKernelCreateCallback');
		return 0;
	});

	sceKernelSleepThreadCB = createNativeFunction(0x82826F70, 150, 'uint', 'HleThread', this, (currentThread: Thread) => {
		return currentThread.wakeupSleepAsync();
	});

	sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'HleThread', this, (currentThread: Thread) => {
		return currentThread.wakeupSleepAsync();
	});

	sceKernelWakeupThread = createNativeFunction(0xD59EAD2F, 150, 'uint', 'int', this, (threadId: number) => {
		var thread = this.threadUids.get(threadId);
		return thread.wakeupWakeupAsync();
	});

	_getCurrentMicroseconds() {
		return new Date().getTime() * 1000;
		//return window.performance.now() * 1000;
	}

	sceKernelGetSystemTimeLow = createNativeFunction(0x369ED59D, 150, 'uint', '', this, () => {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return this._getCurrentMicroseconds();
	});

	sceKernelGetSystemTimeWide = createNativeFunction(0x82BC5777, 150, 'long', '', this, () => {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return Integer64.fromNumber(this._getCurrentMicroseconds());
	});

	sceKernelGetThreadId = createNativeFunction(0x293B45B8, 150, 'int', 'HleThread', this, (currentThread: Thread) => currentThread.id);

	sceKernelReferThreadStatus = createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, (threadId: number, sceKernelThreadInfoPtr: Stream) => {
		if (!this.threadUids.has(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		var thread = this.threadUids.get(threadId);
		var sceKernelThreadInfo = new SceKernelThreadInfo();
		sceKernelThreadInfo.size = SceKernelThreadInfo.struct.length;
		sceKernelThreadInfo.name = thread.name;
		//console.log(thread.state.GP);
		sceKernelThreadInfo.GP = thread.state.GP;
		sceKernelThreadInfo.priorityInit = thread.initialPriority;
		sceKernelThreadInfo.priority = thread.priority;
		SceKernelThreadInfo.struct.write(sceKernelThreadInfoPtr, sceKernelThreadInfo);
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
    status: number;
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

