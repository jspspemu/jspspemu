///<reference path="../../global.d.ts" />
var _cpu = require('../../core/cpu');
var _memory = require('../../core/memory');
var _display = require('../../core/display');
var _interrupt = require('../../core/interrupt');
var _manager_memory = require('./memory');
var _callback = require('./callback');
var SceKernelErrors = require('../SceKernelErrors');
var CpuState = _cpu.CpuState;
var ProgramExecutor = _cpu.ProgramExecutor;
var CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
var console = logger.named('hle.thread');
(function (ThreadStatus) {
    ThreadStatus[ThreadStatus["RUNNING"] = 1] = "RUNNING";
    ThreadStatus[ThreadStatus["READY"] = 2] = "READY";
    ThreadStatus[ThreadStatus["WAIT"] = 4] = "WAIT";
    ThreadStatus[ThreadStatus["SUSPEND"] = 8] = "SUSPEND";
    ThreadStatus[ThreadStatus["DORMANT"] = 16] = "DORMANT";
    ThreadStatus[ThreadStatus["DEAD"] = 32] = "DEAD";
    ThreadStatus[ThreadStatus["WAITSUSPEND"] = ThreadStatus.WAIT | ThreadStatus.SUSPEND] = "WAITSUSPEND";
})(exports.ThreadStatus || (exports.ThreadStatus = {}));
var ThreadStatus = exports.ThreadStatus;
(function (PspThreadAttributes) {
    PspThreadAttributes[PspThreadAttributes["None"] = 0] = "None";
    PspThreadAttributes[PspThreadAttributes["LowFF"] = 0x000000FF] = "LowFF";
    PspThreadAttributes[PspThreadAttributes["Vfpu"] = 0x00004000] = "Vfpu";
    PspThreadAttributes[PspThreadAttributes["V0x2000"] = 0x2000] = "V0x2000";
    PspThreadAttributes[PspThreadAttributes["V0x4000"] = 0x4000] = "V0x4000";
    PspThreadAttributes[PspThreadAttributes["V0x400000"] = 0x400000] = "V0x400000";
    PspThreadAttributes[PspThreadAttributes["V0x800000"] = 0x800000] = "V0x800000";
    PspThreadAttributes[PspThreadAttributes["V0xf00000"] = 0xf00000] = "V0xf00000";
    PspThreadAttributes[PspThreadAttributes["V0x8000000"] = 0x8000000] = "V0x8000000";
    PspThreadAttributes[PspThreadAttributes["V0xf000000"] = 0xf000000] = "V0xf000000";
    PspThreadAttributes[PspThreadAttributes["User"] = 0x80000000] = "User";
    PspThreadAttributes[PspThreadAttributes["UsbWlan"] = 0xa0000000] = "UsbWlan";
    PspThreadAttributes[PspThreadAttributes["Vsh"] = 0xc0000000] = "Vsh";
    //ScratchRamEnable = 0x00008000, // Allow using scratchpad memory for a thread, NOT USABLE ON V1.0
    PspThreadAttributes[PspThreadAttributes["NoFillStack"] = 0x00100000] = "NoFillStack";
    PspThreadAttributes[PspThreadAttributes["ClearStack"] = 0x00200000] = "ClearStack";
    PspThreadAttributes[PspThreadAttributes["ValidMask"] = PspThreadAttributes.LowFF | PspThreadAttributes.Vfpu | PspThreadAttributes.User | PspThreadAttributes.UsbWlan | PspThreadAttributes.Vsh | PspThreadAttributes.NoFillStack | PspThreadAttributes.ClearStack | PspThreadAttributes.V0x2000 | PspThreadAttributes.V0x4000 | PspThreadAttributes.V0x400000 | PspThreadAttributes.V0x800000 | PspThreadAttributes.V0xf00000 | PspThreadAttributes.V0x8000000 | PspThreadAttributes.V0xf000000] = "ValidMask";
})(exports.PspThreadAttributes || (exports.PspThreadAttributes = {}));
var PspThreadAttributes = exports.PspThreadAttributes;
var Thread = (function () {
    function Thread(name, manager, memoryManager, state, instructionCache, stackSize) {
        var _this = this;
        this.name = name;
        this.manager = manager;
        this.state = state;
        this.instructionCache = instructionCache;
        this.id = 0;
        this.status = 16 /* DORMANT */;
        this.initialPriority = 10;
        this.entryPoint = 0;
        this.priority = 10;
        this.attributes = 0;
        //exitStatus: number = 0x800201a2;
        this.exitStatus = 2147615138 /* ERROR_KERNEL_THREAD_ALREADY_DORMANT */;
        this.running = false;
        this.preemptionCount = 0;
        this.info = null;
        this.waitingName = null;
        this.waitingObject = null;
        this.waitingPromise = null;
        this.runningPromise = null;
        this.acceptingCallbacks = false;
        this.wakeupCount = 0;
        this.wakeupPromise = null;
        this.wakeupFunc = null;
        this.accumulatedMicroseconds = 0;
        this.state.thread = this;
        this.programExecutor = new ProgramExecutor(state, instructionCache);
        this.runningPromise = new Promise(function (resolve, reject) {
            _this.runningStop = resolve;
        });
        this.stackPartition = memoryManager.stackPartition.allocateHigh(stackSize, name + '-stack', 0x100);
    }
    Object.defineProperty(Thread.prototype, "runningOrAcceptingCallbacks", {
        get: function () {
            return this.running || this.acceptingCallbacks;
        },
        enumerable: true,
        configurable: true
    });
    Thread.prototype.delete = function () {
        this.stackPartition.deallocate();
    };
    Thread.prototype.waitEndAsync = function () {
        return this.runningPromise;
    };
    Thread.prototype.getWakeupPromise = function () {
        var _this = this;
        if (!this.wakeupPromise) {
            this.wakeupPromise = new Promise(function (resolve, reject) {
                _this.wakeupFunc = resolve;
            });
        }
        return this.wakeupPromise;
    };
    Thread.prototype.wakeupSleepAsync = function (callbacks) {
        this.wakeupCount--;
        this.suspend();
        //return new Promise((resolve, reject) => { });
        return this.getWakeupPromise();
    };
    Thread.prototype.wakeupWakeupAsync = function () {
        this.wakeupCount++;
        if (this.wakeupCount >= 0) {
            this.wakeupFunc();
            this.wakeupPromise = null;
            this.wakeupFunc = null;
        }
        return Promise.resolve(0);
    };
    Thread.prototype.delayMicrosecondsAsync = function (delayMicroseconds, allowCompensating) {
        //console.error(delayMicroseconds, this.accumulatedMicroseconds);
        //return waitAsync(delayMicroseconds / 1000).then(() => 0);
        var _this = this;
        if (allowCompensating === void 0) { allowCompensating = false; }
        this.accumulatedMicroseconds = Math.min(this.accumulatedMicroseconds, 50000); // Don't accumulate more than 50ms
        if (allowCompensating) {
            //debugger;
            var subtractAccumulatedMicroseconds = Math.min(delayMicroseconds, this.accumulatedMicroseconds);
            delayMicroseconds -= subtractAccumulatedMicroseconds;
            this.accumulatedMicroseconds -= subtractAccumulatedMicroseconds;
        }
        //console.error(delayMicroseconds, this.accumulatedMicroseconds, subtractAccumulatedMicroseconds);
        if (delayMicroseconds <= 0.00001) {
        }
        var start = performance.now();
        return waitAsync(delayMicroseconds / 1000).then(function () {
            var end = performance.now();
            var elapsedmicroseconds = (end - start) * 1000;
            _this.accumulatedMicroseconds += ((elapsedmicroseconds - delayMicroseconds) | 0);
            return 0;
        });
    };
    Thread.prototype.suspend = function () {
        //console.log('suspended ' + this.name);
        this.running = false;
        this.manager.eventOcurred();
    };
    Thread.prototype.suspendUntilDone = function (info) {
        this.info = info;
        this.waitingName = info.name;
        this.waitingObject = info.object;
        this.acceptingCallbacks = (info.callbacks == 1 /* YES */);
        this._suspendUntilPromiseDone(info.promise, info.compensate);
    };
    Thread.prototype.suspendUntilPromiseDone = function (promise, info) {
        //this.waitingName = sprintf('%s:0x%08X (Promise)', info.name, info.nid);
        this.waitingName = info.name + ':0x' + info.nid.toString(16) + ' (Promise)';
        this.waitingObject = info;
        this._suspendUntilPromiseDone(promise, 0 /* NO */);
    };
    Thread.prototype._suspendUntilPromiseDone = function (promise, compensate) {
        var _this = this;
        if (compensate == 1 /* YES */) {
            var startTime = performance.now();
        }
        this.waitingPromise = promise;
        this.suspend();
        //console.log(promise);
        promise.then(function (result) {
            _this.waitingPromise = null;
            _this.waitingName = null;
            _this.waitingObject = null;
            _this.acceptingCallbacks = false;
            if (result !== undefined)
                _this.state.V0 = result;
            if (compensate == 1 /* YES */) {
                var endTime = performance.now();
                _this.accumulatedMicroseconds += (endTime - startTime) * 1000;
            }
            //console.error('resumed ' + this.name);
            _this.resume();
        });
    };
    Thread.prototype.resume = function () {
        this.running = true;
        this.manager.eventOcurred();
    };
    Thread.prototype.start = function () {
        this.running = true;
        console.info('starting thread ', this.name);
        this.manager.threads.add(this);
        this.manager.eventOcurred();
    };
    Thread.prototype.stop = function (reason) {
        this.running = false;
        this.runningStop();
        //debugger;
        console.info('stopping thread ', this.name, 'reason:', reason);
        this.manager.threads.delete(this);
        this.manager.eventOcurred();
    };
    Thread.prototype.runStep = function () {
        this.manager.current = this;
        this.preemptionCount++;
        try {
            this.programExecutor.execute(10000);
        }
        catch (e) {
            console.error(e);
            console.error(e['stack']);
            this.stop('error:' + e);
            throw (e);
        }
    };
    return Thread;
})();
exports.Thread = Thread;
var ThreadManager = (function () {
    function ThreadManager(memory, interruptManager, callbackManager, memoryManager, display, syscallManager, instructionCache) {
        var _this = this;
        this.memory = memory;
        this.interruptManager = interruptManager;
        this.callbackManager = callbackManager;
        this.memoryManager = memoryManager;
        this.display = display;
        this.syscallManager = syscallManager;
        this.instructionCache = instructionCache;
        this.threads = new DSet();
        this.interval = -1;
        this.enqueued = false;
        this.enqueuedTime = 0;
        this.running = false;
        this.callbackAdded = null;
        this.exitPromise = new Promise(function (resolve, reject) {
            _this.exitResolve = resolve;
        });
        this.interruptManager.event.add(this.eventOcurred);
    }
    ThreadManager.prototype.create = function (name, entryPoint, initialPriority, stackSize, attributes) {
        if (stackSize === void 0) { stackSize = 0x1000; }
        if (attributes === void 0) { attributes = 0; }
        var thread = new Thread(name, this, this.memoryManager, new CpuState(this.memory, this.syscallManager), this.instructionCache, stackSize);
        thread.entryPoint = entryPoint;
        thread.state.PC = entryPoint;
        thread.state.setRA(268435455 /* EXIT_THREAD */);
        thread.state.SP = thread.stackPartition.high;
        thread.initialPriority = initialPriority;
        thread.priority = initialPriority;
        thread.attributes = attributes;
        if ((thread.stackPartition.high & 0xFF) != 0)
            throw (new Error("Stack not aligned"));
        if (!(thread.attributes & 1048576 /* NoFillStack */)) {
        }
        else if ((thread.attributes & 2097152 /* ClearStack */)) {
        }
        return thread;
    };
    ThreadManager.prototype.eventOcurred = function () {
        var _this = this;
        if (!this.running)
            return;
        if (this.enqueued)
            return;
        this.enqueued = true;
        this.enqueuedTime = performance.now();
        setImmediate(function () { return _this.eventOcurredCallback(); });
    };
    //get runningThreads() { return this.threads.filter(thread => thread.running); }
    ThreadManager.getHighestPriority = function (threads) {
        var priority = -9999;
        threads.forEach(function (thread) {
            priority = Math.max(priority, thread.priority);
        });
        return priority;
    };
    ThreadManager.prototype.eventOcurredCallback = function () {
        var _this = this;
        if (!this.running)
            return;
        var microsecondsToCompensate = Math.round((performance.now() - this.enqueuedTime) * 1000);
        //console.log('delayedTime', timeMsToCompensate);
        this.enqueued = false;
        var start = window.performance.now();
        while (true) {
            if (this.threads.elements.length > 0) {
                this.interruptManager.execute(this.threads.elements[0].state);
            }
            var callbackThreadCount = 0;
            var callbackPriority = Number.MAX_VALUE;
            var runningThreadCount = 0;
            var runningPriority = Number.MAX_VALUE;
            this.threads.forEach(function (thread) {
                if (_this.callbackManager.hasPendingCallbacks) {
                    if (thread.acceptingCallbacks) {
                        callbackThreadCount++;
                        callbackPriority = Math.min(callbackPriority, thread.priority);
                    }
                }
                if (thread.running) {
                    runningThreadCount++;
                    runningPriority = Math.min(runningPriority, thread.priority);
                }
            });
            if ((runningThreadCount == 0) && (callbackThreadCount == 0))
                break;
            if (callbackThreadCount != 0) {
                this.threads.forEach(function (thread) {
                    if (thread.acceptingCallbacks && (thread.priority == callbackPriority)) {
                        _this.callbackManager.executePendingWithinThread(thread);
                    }
                });
            }
            if (runningThreadCount != 0) {
                this.threads.forEach(function (thread) {
                    if (thread.running && (thread.priority == runningPriority)) {
                        // No callbacks?
                        _this.callbackManager.executeLaterPendingWithinThread(thread);
                        do {
                            thread.runStep();
                            if (!_this.interruptManager.enabled) {
                                console.log(thread.name, ':interrupts disabled, no thread scheduling!');
                            }
                        } while (!_this.interruptManager.enabled);
                    }
                });
            }
            var current = window.performance.now();
            if (current - start >= 100) {
                setTimeout(function () { return _this.eventOcurred(); }, 0);
                return;
            }
        }
    };
    ThreadManager.prototype.debugThreads = function () {
        var html = '';
        this.threads.forEach(function (thread) {
            html += sprintf("%08X:%s:%s", thread.state.PC, thread.name, thread.running);
        });
        document.getElementById('thread_list').innerHTML = html;
    };
    ThreadManager.prototype.startAsync = function () {
        var _this = this;
        this.running = true;
        this.eventOcurred();
        this.callbackAdded = this.callbackManager.onAdded.add(function () {
            _this.eventOcurred();
        });
        return Promise.resolve();
    };
    ThreadManager.prototype.stopAsync = function () {
        this.running = false;
        this.callbackManager.onAdded.remove(this.callbackAdded);
        clearInterval(this.interval);
        this.interval = -1;
        return Promise.resolve();
    };
    ThreadManager.prototype.exitGame = function () {
        this.exitResolve();
    };
    ThreadManager.prototype.waitExitGameAsync = function () {
        return this.exitPromise;
    };
    return ThreadManager;
})();
exports.ThreadManager = ThreadManager;
//# sourceMappingURL=thread.js.map