///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');
_manager.Thread;
var CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
var ThreadStatus = _manager.ThreadStatus;
var PspThreadAttributes = _manager.PspThreadAttributes;
var OutOfMemoryError = _manager.OutOfMemoryError;
var console = logger.named('module.ThreadManForUser');
var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.threadUids = new UidCollection(1);
        this.sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'int', 'string/uint/int/int/int/int/Thread', this, function (name, entryPoint, initPriority, stackSize, attributes, optionPtr, currentThread) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;
            if (stackSize < 0x200)
                return 2147615124 /* ERROR_KERNEL_ILLEGAL_STACK_SIZE */;
            if (initPriority < 0x08 || initPriority > 0x77)
                return 2147615123 /* ERROR_KERNEL_ILLEGAL_PRIORITY */;
            if (!_this.context.memory.isValidAddress(entryPoint) || entryPoint == 0)
                return 2147615122 /* ERROR_KERNEL_ILLEGAL_THREAD_ENTRY_ADDR */;
            if (name.length > 31)
                name = name.substr(0, 31);
            if (stackSize > 2 * 1024 * 1024)
                return -3;
            if ((attributes & (~PspThreadAttributes.ValidMask)) != 0) {
                //console.log(sprintf('Invalid mask %08X, %08X, %08X', attributes, PspThreadAttributes.ValidMask, (attributes & (~PspThreadAttributes.ValidMask))));
                return 2147615121 /* ERROR_KERNEL_ILLEGAL_ATTR */;
            }
            attributes |= 2147483648 /* User */;
            attributes |= 255 /* LowFF */;
            try {
                stackSize = Math.max(stackSize, 0x200); // 512 byte min. (required for interrupts)
                stackSize = MathUtils.nextAligned(stackSize, 0x100); // Aligned to 256 bytes.
                var newThread = _this.context.threadManager.create(name, entryPoint, initPriority, stackSize, attributes);
                newThread.id = _this.threadUids.allocate(newThread);
                newThread.status = 16 /* DORMANT */;
                newThread.state.GP = currentThread.state.GP;
                console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d, entryPC=%08X', newThread.id, newThread.name, newThread.priority, currentThread.priority, entryPoint));
                return newThread.id;
            }
            catch (e) {
                if (e instanceof OutOfMemoryError)
                    return 2147615120 /* ERROR_KERNEL_NO_MEMORY */;
                throw (e);
            }
        });
        this.sceKernelDelayThread = createNativeFunction(0xCEADEB47, 150, 'uint', 'Thread/uint', this, function (thread, delayInMicroseconds) {
            return _this._sceKernelDelayThreadCB(thread, delayInMicroseconds, 0 /* NO */);
        });
        this.sceKernelDelayThreadCB = createNativeFunction(0x68DA9E36, 150, 'uint', 'Thread/uint', this, function (thread, delayInMicroseconds) {
            return _this._sceKernelDelayThreadCB(thread, delayInMicroseconds, 1 /* YES */);
        });
        this.sceKernelWaitThreadEndCB = createNativeFunction(0x840E8133, 150, 'uint', 'uint/void*', this, function (threadId, timeoutPtr) {
            return _this._sceKernelWaitThreadEndCB(_this.getThreadById(threadId), 1 /* YES */);
        });
        this.sceKernelWaitThreadEnd = createNativeFunction(0x278C0DF5, 150, 'uint', 'uint/void*', this, function (threadId, timeoutPtr) {
            return _this._sceKernelWaitThreadEndCB(_this.getThreadById(threadId), 0 /* NO */);
        });
        this.sceKernelGetThreadCurrentPriority = createNativeFunction(0x94AA61EE, 150, 'int', 'Thread', this, function (currentThread) { return currentThread.priority; });
        this.sceKernelStartThread = createNativeFunction(0xF475845D, 150, 'uint', 'Thread/int/int/int', this, function (currentThread, threadId, userDataLength, userDataPointer) {
            var newThread = _this.getThreadById(threadId);
            newThread.exitStatus = 2147615140 /* ERROR_KERNEL_THREAD_IS_NOT_DORMANT */;
            //if (!newThread) debugger;
            var newState = newThread.state;
            newState.setRA(268435455 /* EXIT_THREAD */);
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
        this.sceKernelChangeThreadPriority = createNativeFunction(0x71BC9871, 150, 'uint', 'Thread/int/int', this, function (currentThread, threadId, priority) {
            var thread = _this.getThreadById(threadId);
            thread.priority = priority;
            return Promise.resolve(0);
        });
        this.sceKernelExitThread = createNativeFunction(0xAA73C935, 150, 'int', 'Thread/int', this, function (currentThread, exitStatus) {
            console.info(sprintf('sceKernelExitThread: %d', exitStatus));
            currentThread.exitStatus = (exitStatus < 0) ? 2147614930 /* ERROR_KERNEL_ILLEGAL_ARGUMENT */ : exitStatus;
            currentThread.stop('sceKernelExitThread');
            throw (new CpuBreakException());
        });
        this.sceKernelGetThreadExitStatus = createNativeFunction(0x3B183E26, 150, 'int', 'int', this, function (threadId) {
            var thread = _this.getThreadById(threadId);
            return thread.exitStatus;
        });
        this.sceKernelDeleteThread = createNativeFunction(0x9FA03CD3, 150, 'int', 'int', this, function (threadId) {
            return _this._sceKernelDeleteThread(threadId);
        });
        this.sceKernelTerminateThread = createNativeFunction(0x616403BA, 150, 'int', 'int', this, function (threadId) {
            console.info(sprintf('sceKernelTerminateThread: %d', threadId));
            return _this._sceKernelTerminateThread(threadId);
        });
        this.sceKernelExitDeleteThread = createNativeFunction(0x809CE29B, 150, 'uint', 'Thread/int', this, function (currentThread, exitStatus) {
            currentThread.exitStatus = exitStatus;
            currentThread.stop('sceKernelExitDeleteThread');
            throw (new CpuBreakException());
        });
        this.sceKernelTerminateDeleteThread = createNativeFunction(0x383F7BCC, 150, 'int', 'int', this, function (threadId) {
            _this._sceKernelTerminateThread(threadId);
            _this._sceKernelDeleteThread(threadId);
            return 0;
        });
        this.sceKernelSleepThreadCB = createNativeFunction(0x82826F70, 150, 'uint', 'Thread', this, function (currentThread) {
            return currentThread.wakeupSleepAsync(1 /* YES */);
        });
        this.sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'Thread', this, function (currentThread) {
            return currentThread.wakeupSleepAsync(0 /* NO */);
        });
        this.sceKernelWakeupThread = createNativeFunction(0xD59EAD2F, 150, 'uint', 'int', this, function (threadId) {
            var thread = _this.getThreadById(threadId);
            return thread.wakeupWakeupAsync();
        });
        this.sceKernelUSec2SysClock = createNativeFunction(0x110DEC9A, 150, 'uint', 'uint/void*', this, function (microseconds, clockPtr) {
            if (clockPtr != null)
                clockPtr.writeInt64(Integer64.fromUnsignedInt(microseconds));
            return 0;
        });
        this.sceKernelGetSystemTimeLow = createNativeFunction(0x369ED59D, 150, 'uint', '', this, function () {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return _this._getCurrentMicroseconds();
        });
        this.sceKernelGetSystemTime = createNativeFunction(0xDB738F35, 150, 'uint', 'void*', this, function (timePtr) {
            if (timePtr == null)
                throw (new SceKernelException(2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */));
            timePtr.writeInt64(Integer64.fromNumber(_this._getCurrentMicroseconds()));
            return 0;
        });
        this.sceKernelGetSystemTimeWide = createNativeFunction(0x82BC5777, 150, 'long', '', this, function () {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return Integer64.fromNumber(_this._getCurrentMicroseconds());
        }, { tryCatch: false });
        this.sceKernelGetThreadId = createNativeFunction(0x293B45B8, 150, 'int', 'Thread', this, function (currentThread) {
            return currentThread.id;
        });
        this.sceKernelSuspendThread = createNativeFunction(0x9944F31F, 150, 'int', 'int', this, function (threadId) {
            _this.getThreadById(threadId).suspend();
            return 0;
        });
        this.sceKernelResumeThread = createNativeFunction(0x75156E8F, 150, 'int', 'int', this, function (threadId) {
            _this.getThreadById(threadId).resume();
            return 0;
        });
        this.sceKernelReferThreadStatus = createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, function (threadId, sceKernelThreadInfoPtr) {
            var thread = _this.getThreadById(threadId);
            var info = new SceKernelThreadInfo();
            info.size = SceKernelThreadInfo.struct.length;
            info.name = thread.name;
            info.attributes = thread.attributes;
            info.status = thread.status;
            info.threadPreemptionCount = thread.preemptionCount;
            info.entryPoint = thread.entryPoint;
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
        this.sceKernelChangeCurrentThreadAttr = createNativeFunction(0xEA748E31, 150, 'int', 'uint/uint/uint', this, function (currentThread, removeAttributes, addAttributes) {
            currentThread.attributes &= ~removeAttributes;
            currentThread.attributes |= addAttributes;
            return 0;
        });
        this.sceKernelUSec2SysClockWide = createNativeFunction(0xC8CD158C, 150, 'int', 'uint', this, function (microseconds) {
            return microseconds;
        });
    }
    ThreadManForUser.prototype.getThreadById = function (id) {
        if (id == 0)
            return this.context.threadManager.current;
        if (!this.threadUids.has(id))
            throw (new SceKernelException(2147615128 /* ERROR_KERNEL_NOT_FOUND_THREAD */));
        return this.threadUids.get(id);
    };
    ThreadManForUser.prototype._sceKernelDelayThreadCB = function (thread, delayInMicroseconds, acceptCallbacks) {
        return new WaitingThreadInfo('_sceKernelDelayThreadCB', 'microseconds:' + delayInMicroseconds, thread.delayMicrosecondsAsync(delayInMicroseconds, false), acceptCallbacks);
    };
    ThreadManForUser.prototype._sceKernelWaitThreadEndCB = function (thread, acceptCallbacks) {
        return new WaitingThreadInfo('_sceKernelWaitThreadEndCB', thread, thread.waitEndAsync().then(function () { return thread.exitStatus; }), acceptCallbacks);
    };
    ThreadManForUser.prototype._sceKernelTerminateThread = function (threadId) {
        var newThread = this.getThreadById(threadId);
        newThread.stop('_sceKernelTerminateThread');
        newThread.exitStatus = 0x800201ac;
        return 0;
    };
    ThreadManForUser.prototype._sceKernelDeleteThread = function (threadId) {
        var newThread = this.getThreadById(threadId);
        newThread.delete();
        this.threadUids.remove(threadId);
        return 0;
    };
    ThreadManForUser.prototype._getCurrentMicroseconds = function () {
        return this.context.rtc.getCurrentUnixMicroseconds();
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
var SceKernelThreadInfo = (function () {
    function SceKernelThreadInfo() {
    }
    SceKernelThreadInfo.struct = StructClass.create(SceKernelThreadInfo, [
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
    return SceKernelThreadInfo;
})();
//# sourceMappingURL=ThreadManForUser.js.map