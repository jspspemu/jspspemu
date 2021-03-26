import {
	AcceptCallbacks,
	logger,
	PromiseFast,
	sprintf,
	throwEndCycles,
	UidCollection,
	WaitingThreadInfo
} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {
    Struct,
    StructInt32,
    StructStructStringz,
    StructUInt32
} from "../../../global/struct";
import {MathUtils} from "../../../global/math";
import {Integer64} from "../../../global/int64";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {PspThreadAttributes, Thread, ThreadStatus} from "../../manager/thread";
import {I32, I64, nativeFunction, PTR, STRING, THREAD, U32} from "../../utils";
import {OutOfMemoryError} from "../../manager/memory";
import {CpuSpecialAddresses} from "../../../core/cpu/cpu_core";

const console = logger.named('module.ThreadManForUser');

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	private threadUids = new UidCollection<Thread>(1);

	@nativeFunction(0x446D8DE6, 150)
    @I32 sceKernelCreateThread(
        @STRING name: string,
        @U32 entryPoint: number, @I32 initPriority: number, @I32 stackSize: number,
        @I32 attributes: PspThreadAttributes, @I32 optionPtr: number,
        @THREAD currentThread: Thread
    ) {
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

            const newThread = this.context.threadManager.create(name, entryPoint, initPriority, stackSize, attributes);
            newThread.id = this.threadUids.allocate(newThread);
			newThread.status = ThreadStatus.DORMANT;

			newThread.state.GP = currentThread.state.GP;

			console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d, entryPC=%08X', newThread.id, newThread.name, newThread.priority, currentThread.priority, entryPoint));

			return newThread.id;
			//return PromiseFast.resolve(newThread.id);
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
		return new WaitingThreadInfo('_sceKernelDelayThreadCB', `microseconds:${delayInMicroseconds}`, thread.delayMicrosecondsAsync(delayInMicroseconds, false), acceptCallbacks);
	}

	@nativeFunction(0xCEADEB47, 150)
    @U32 sceKernelDelayThread(@THREAD thread: Thread, @U32 delayInMicroseconds: number) {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.NO);
	}

	@nativeFunction(0x68DA9E36, 150)
    @U32 sceKernelDelayThreadCB(@THREAD thread: Thread, @U32 delayInMicroseconds: number) {
		return this._sceKernelDelayThreadCB(thread, delayInMicroseconds, AcceptCallbacks.YES);
	}

	private _sceKernelWaitThreadEndCB(thread: Thread, acceptCallbacks:AcceptCallbacks) {
		return new WaitingThreadInfo('_sceKernelWaitThreadEndCB', thread, (async () => {
            await thread.waitEndAsync()
            return thread.exitStatus
        })(), acceptCallbacks);
	}

	@nativeFunction(0x840E8133, 150)
    @U32 sceKernelWaitThreadEndCB(@U32 threadId: number, @PTR timeoutPtr: Stream):any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.YES);
	}

	@nativeFunction(0x278C0DF5, 150)
    @U32 sceKernelWaitThreadEnd(@U32 threadId: number, @PTR timeoutPtr: Stream): any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		return this._sceKernelWaitThreadEndCB(this.getThreadById(threadId), AcceptCallbacks.NO);
	}

	@nativeFunction(0x94AA61EE, 150)
    @I32 sceKernelGetThreadCurrentPriority(@THREAD currentThread: Thread) {
		return currentThread.priority;
	}

	@nativeFunction(0xF475845D, 150)
    @U32 sceKernelStartThread(@THREAD currentThread: Thread, @I32 threadId: number, @I32 userDataLength: number, @I32 userDataPointer: number):any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const newThread = this.getThreadById(threadId);

        newThread.exitStatus = SceKernelErrors.ERROR_KERNEL_THREAD_IS_NOT_DORMANT;

		//if (!newThread) debugger;

        const newState = newThread.state;
        const memory = newState.memory;
        const currentStack = newThread.stackPartition;
        newState.setRA(CpuSpecialAddresses.EXIT_THREAD);

		if ((newThread.attributes & 0x00100000) == 0) { // PSP_THREAD_ATTR_NO_FILLSTACK
			memory.memset(currentStack.low, 0xFF, currentStack.size);
		}

        const copiedDataAddress = ((newThread.stackPartition.high) - ((userDataLength + 0xF) & ~0xF));

        if (userDataPointer != null) {
			memory.copy(userDataPointer, copiedDataAddress, userDataLength);
			newState.setGPR(4, userDataLength);
			newState.setGPR(5, copiedDataAddress);
		} else {
			newState.setGPR(4, 0);
			newState.setGPR(5, 0);
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
		return PromiseFast.resolve(0);
	}

	@nativeFunction(0x71BC9871, 150)
    @U32 sceKernelChangeThreadPriority(@THREAD currentThread: Thread, @I32 threadId: number, @I32 priority: number): any {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const thread = this.getThreadById(threadId);
        thread.priority = priority;
		return PromiseFast.resolve(0);
	}

	@nativeFunction(0xAA73C935, 150)
    @I32 sceKernelExitThread(@THREAD currentThread: Thread, @I32 exitStatus: number) {
		console.info(sprintf('sceKernelExitThread: %d', exitStatus));

		currentThread.exitStatus = (exitStatus < 0) ? SceKernelErrors.ERROR_KERNEL_ILLEGAL_ARGUMENT : exitStatus;
		currentThread.stop('sceKernelExitThread');
		throwEndCycles();
	}

	@nativeFunction(0x3B183E26, 150)
    @I32 sceKernelGetThreadExitStatus(@I32 threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const thread = this.getThreadById(threadId);
        return thread.exitStatus;
	}

	_sceKernelTerminateThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const newThread = this.getThreadById(threadId);
        newThread.stop('_sceKernelTerminateThread');
		newThread.exitStatus = 0x800201ac;
		return 0;
	}

	_sceKernelDeleteThread(threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const newThread = this.getThreadById(threadId);
        newThread.delete();
		this.threadUids.remove(threadId);
		return 0;
	}

	@nativeFunction(0x9FA03CD3, 150)
    @I32 sceKernelDeleteThread(@I32 threadId: number) {
		return this._sceKernelDeleteThread(threadId);
	}

	@nativeFunction(0x616403BA, 150)
    @I32 sceKernelTerminateThread(@I32 threadId: number) {
		console.info(sprintf('sceKernelTerminateThread: %d', threadId));

		return this._sceKernelTerminateThread(threadId);
	}

	@nativeFunction(0x809CE29B, 150)
    @U32 sceKernelExitDeleteThread(@THREAD currentThread: Thread, @I32 exitStatus: number) {
		currentThread.exitStatus = exitStatus;
		currentThread.stop('sceKernelExitDeleteThread');
		throwEndCycles();
	}

	@nativeFunction(0x383F7BCC, 150)
    @I32 sceKernelTerminateDeleteThread(@I32 threadId: number) {
		this._sceKernelTerminateThread(threadId);
		this._sceKernelDeleteThread(threadId);
		return 0;
	}

	@nativeFunction(0x82826F70, 150)
    @U32 sceKernelSleepThreadCB(@THREAD currentThread: Thread) {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.YES);
	}

	@nativeFunction(0x9ACE131E, 150)
    @U32 sceKernelSleepThread(@THREAD currentThread: Thread) {
		return currentThread.wakeupSleepAsync(AcceptCallbacks.NO);
	}

	@nativeFunction(0xD59EAD2F, 150)
    @U32 sceKernelWakeupThread(@I32 threadId: number) {
		if (!this.hasThreadById(threadId)) return PromiseFast.resolve(SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD);
        const thread = this.getThreadById(threadId);
        return thread.wakeupWakeupAsync();
	}

	_getCurrentMicroseconds() {
		return this.context.rtc.getCurrentUnixMicroseconds();
	}

	@nativeFunction(0x110DEC9A, 150)
    @U32 sceKernelUSec2SysClock(@U32 microseconds: number, @PTR clockPtr: Stream) {
		if (clockPtr != null) clockPtr.writeInt64(Integer64.fromUnsignedInt(microseconds));
		return 0;
	}

	@nativeFunction(0x369ED59D, 150)
    @U32 sceKernelGetSystemTimeLow() {
		return this._getCurrentMicroseconds();
	}

	@nativeFunction(0xDB738F35, 150)
    @U32 sceKernelGetSystemTime(@PTR timePtr: Stream) {
		if (timePtr == null) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
		timePtr.writeInt64(Integer64.fromNumber(this._getCurrentMicroseconds()));
		return 0;
	}

	@nativeFunction(0x82BC5777, 150)
    @I64 sceKernelGetSystemTimeWide() {
		//console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
		return Integer64.fromNumber(this._getCurrentMicroseconds());
	}

    @I32 @nativeFunction(0x293B45B8, 150)
	sceKernelGetThreadId(@THREAD currentThread: Thread) {
		return currentThread.id
	}

	@nativeFunction(0x9944F31F, 150)
    @I32 sceKernelSuspendThread(@I32 threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		this.getThreadById(threadId).suspend();
		return 0;
	}

	@nativeFunction(0x75156E8F, 150)
    @I32 sceKernelResumeThread(@I32 threadId: number) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
		this.getThreadById(threadId).resume();
		return 0;
	}

	@nativeFunction(0x17C1684E, 150)
    @I32 sceKernelReferThreadStatus(@I32 threadId: number, @PTR sceKernelThreadInfoPtr: Stream) {
		if (!this.hasThreadById(threadId)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_THREAD;
        const thread = this.getThreadById(threadId);

        const info = new SceKernelThreadInfo();

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

	@nativeFunction(0xEA748E31, 150)
    @I32 sceKernelChangeCurrentThreadAttr(@THREAD currentThread: Thread, @U32 removeAttributes: number, @U32 addAttributes: number) {
		currentThread.attributes &= ~removeAttributes;
		currentThread.attributes |= addAttributes;
		return 0;
	}

	@nativeFunction(0xC8CD158C, 150)
    @I32 sceKernelUSec2SysClockWide(@U32 microseconds: number) {
		return microseconds;
	}
}

class SceKernelThreadInfo extends Struct {
    @StructInt32 size: number = 0
    @StructStructStringz(32) name: string = ''
    @StructUInt32 attributes: number = 0
    @StructUInt32 status: ThreadStatus = ThreadStatus.RUNNING
    @StructUInt32 entryPoint: number = 0
    @StructUInt32 stackPointer: number = 0
    @StructInt32 stackSize: number = 0
    @StructUInt32 GP: number = 0
    @StructInt32 priorityInit: number = 0
    @StructInt32 priority: number = 0
    @StructUInt32 waitType: number = 0
    @StructInt32 waitId: number = 0
    @StructInt32 wakeupCount: number = 0
    @StructInt32 exitStatus: number = 0
    @StructInt32 runClocksLow: number = 0
    @StructInt32 runClocksHigh: number = 0
    @StructInt32 interruptPreemptionCount: number = 0
    @StructInt32 threadPreemptionCount: number = 0
    @StructInt32 releaseCount: number = 0
}

