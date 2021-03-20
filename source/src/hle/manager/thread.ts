import _cpu = require('../../core/cpu');
import _memory = require('../../core/memory');
import _display = require('../../core/display');
import _interrupt = require('../../core/interrupt');
import _manager_memory = require('./memory');
import _callback = require('./callback');
import SceKernelErrors = require('../SceKernelErrors');

import CallbackManager = _callback.CallbackManager;
import MemoryManager = _manager_memory.MemoryManager;
import InterruptManager = _interrupt.InterruptManager;

import MemoryPartition = _manager_memory.MemoryPartition;
import SyscallManager = _cpu.SyscallManager;
import PspDisplay = _display.PspDisplay;
import Memory = _memory.Memory;
import CpuState = _cpu.CpuState;
import NativeFunction = _cpu.NativeFunction;
import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import {
	AcceptCallbacks,
	Compensate,
	DSet,
	logger,
	Microtask,
	Promise2,
	sprintf,
	WaitingThreadInfo
} from "../../global/utils";
import {waitAsync} from "../../global/async";
import {Integer64} from "../../global/int64";

var console = logger.named('hle.thread');

export const enum ThreadStatus {
	RUNNING = 1,
	READY = 2,
	WAIT = 4,
	SUSPEND = 8,
	DORMANT = 16,
	DEAD = 32,

	WAITSUSPEND = WAIT | SUSPEND,
}

export const enum PspThreadAttributes {
	None = 0,
	LowFF = 0x000000FF,
	Vfpu = 0x00004000, // Enable VFPU access for the thread.
	V0x2000 = 0x2000,
	V0x4000 = 0x4000,
	V0x400000 = 0x400000,
	V0x800000 = 0x800000,
	V0xf00000 = 0xf00000,
	V0x8000000 = 0x8000000,
	V0xf000000 = 0xf000000,
	User = 0x80000000, // Start the thread in user mode (done automatically if the thread creating it is in user mode).
	UsbWlan = 0xa0000000, // Thread is part of the USB/WLAN API.
	Vsh = 0xc0000000, // Thread is part of the VSH API.
	//ScratchRamEnable = 0x00008000, // Allow using scratchpad memory for a thread, NOT USABLE ON V1.0
	NoFillStack = 0x00100000, // Disables filling the stack with 0xFF on creation
	ClearStack = 0x00200000, // Clear the stack when the thread is deleted
	ValidMask = LowFF | Vfpu | User | UsbWlan | Vsh | /*ScratchRamEnable |*/ NoFillStack | ClearStack | V0x2000 | V0x4000 | V0x400000 | V0x800000 | V0xf00000 | V0x8000000 | V0xf000000,
}

export class Thread {
    id: number = 0;
	status: ThreadStatus = ThreadStatus.DORMANT;
	initialPriority: number = 10;
	entryPoint: number = 0;
	priority: number = 10;
	attributes: number = 0;
	sceKernelCpuResumeIntrCount: number = 0;
	//exitStatus: number = 0x800201a2;
	exitStatus: number = SceKernelErrors.ERROR_KERNEL_THREAD_ALREADY_DORMANT;
    running: boolean = false;
	stackPartition: MemoryPartition;
	preemptionCount: number = 0;
	info: WaitingThreadInfo<any> = null;
	waitingName: string = null;
	waitingObject: any = null;
	waitingPromise: Promise2<any> = null;
	runningPromise: Promise2<number> = null;
	runningStop: () => void;
	acceptingCallbacks = false;

	get runningOrAcceptingCallbacks() {
		return this.running || this.acceptingCallbacks;
	}

	constructor(public name: string, public manager: ThreadManager, memoryManager: MemoryManager, public state: CpuState, stackSize: number) {
        this.state.thread = this;
		this.runningPromise = new Promise2<any>((resolve, reject) => { this.runningStop = resolve; });
		this.stackPartition = memoryManager.stackPartition.allocateHigh(stackSize, name + '-stack', 0x100);
	}

	delete() {
		this.stackPartition.deallocate();
	}

	waitEndAsync() {
		return this.runningPromise;
	}

	private wakeupCount: number = 0;
	private wakeupPromise: Promise2<number> = null;
	private wakeupFunc: () => void = null;

	private getWakeupPromise() {
		if (!this.wakeupPromise) {
			this.wakeupPromise = new Promise2<number>((resolve, reject) => {
				this.wakeupFunc = resolve;
			});
		}
		return this.wakeupPromise;
	}

	wakeupSleepAsync(callbacks: AcceptCallbacks) {
		this.wakeupCount--;
		this.suspend();
		//return new Promise2((resolve, reject) => { });
		return this.getWakeupPromise();
	}

	wakeupWakeupAsync() {
		this.wakeupCount++;
		if (this.wakeupCount >= 0) {
			this.wakeupFunc();
			this.wakeupPromise = null;
			this.wakeupFunc = null;
		}
		return Promise2.resolve(0);
	}

	accumulatedMicroseconds = 0;
	delayMicrosecondsAsync(delayMicroseconds: number, allowCompensating = false) {
		//console.error(delayMicroseconds, this.accumulatedMicroseconds);
		//return waitAsync(delayMicroseconds / 1000).then(() => 0);


		this.accumulatedMicroseconds = Math.min(this.accumulatedMicroseconds, 50000); // Don't accumulate more than 50ms

		if (allowCompensating) {
			//debugger;
			var subtractAccumulatedMicroseconds = Math.min(delayMicroseconds, this.accumulatedMicroseconds);
			delayMicroseconds -= subtractAccumulatedMicroseconds;
			this.accumulatedMicroseconds -= subtractAccumulatedMicroseconds;
		}

		//console.error(delayMicroseconds, this.accumulatedMicroseconds, subtractAccumulatedMicroseconds);

		if (delayMicroseconds <= 0.00001) {
			//console.error('none!');
			//return Promise2.resolve(0);
		}

		var start = performance.now();
		return waitAsync(delayMicroseconds / 1000).then(() => {
			var end = performance.now();
			var elapsedmicroseconds = (end - start) * 1000;

			this.accumulatedMicroseconds += ((elapsedmicroseconds - delayMicroseconds) | 0);

			return 0;
		});
	}

	suspend() {
		//console.log('suspended ' + this.name);
        this.running = false;
        this.manager.eventOcurred();
	}

	suspendUntilDone(info: WaitingThreadInfo<any>) {
		this.info = info;
		this.waitingName = info.name;
		this.waitingObject = info.object;
		this.acceptingCallbacks = (info.callbacks == AcceptCallbacks.YES);
		this._suspendUntilPromiseDone(info.promise, info.compensate);
	}

	suspendUntilPromiseDone(promise: Promise2<any>, info: NativeFunction) {
		//this.waitingName = sprintf('%s:0x%08X (Promise2)', info.name, info.nid);
		this.waitingName = info.name + ':0x' + info.nid.toString(16) + ' (Promise2)';
		this.waitingObject = info;
		this._suspendUntilPromiseDone(promise, Compensate.NO);
	}

	_suspendUntilPromiseDone(promise: Promise2<any>, compensate: Compensate) {

		if (compensate == Compensate.YES) {
			var startTime = performance.now();
		}

		this.waitingPromise = promise;

		this.suspend();

		//console.log(promise);

		promise.then((result: any) => {
			this.waitingPromise = null;
			this.waitingName = null;
			this.waitingObject = null;
			this.acceptingCallbacks = false;
			if (result !== undefined) {
				if (result instanceof Integer64) {
					this.state.V0 = result.low;
					this.state.V1 = result.high;
				} else {
					this.state.V0 = result;
				}
			}

			if (compensate == Compensate.YES) {
				var endTime = performance.now();
				this.accumulatedMicroseconds += (endTime - startTime) * 1000;
			}

			//console.error('resumed ' + this.name);
            this.resume();
        });
    }

    resume() {
        this.running = true;
        this.manager.eventOcurred();
    }

    start() {
		this.running = true;
		console.info('starting thread ', this.name);
		this.manager.threads.add(this);
		this.manager.eventOcurred();
    }

    stop(reason: string) {
		this.running = false;
		this.runningStop();
		//debugger;
		console.info('stopping thread ', this.name, 'reason:', reason);
		this.manager.threads.delete(this);
		this.manager.eventOcurred();
    }

	runStep() {
		this.manager.current = this;

		this.preemptionCount++;

		this.state.startThreadStep();		
		this.state.executeAtPC();
    }
}

export class ThreadManager {
    threads: DSet<Thread> = new DSet<Thread>();
    interval: number = -1;
	enqueued: boolean = false;
	enqueuedTime = 0;
	running: boolean = false;
	exitPromise: Promise2<any>;
	exitResolve: () => void;
	current: Thread;
	private rootCpuState: CpuState;

	constructor(private memory: Memory, private interruptManager: InterruptManager, private callbackManager: CallbackManager, private memoryManager: MemoryManager, private display: PspDisplay, private syscallManager: SyscallManager) {
		this.rootCpuState = new CpuState(this.memory, this.syscallManager);
		this.exitPromise = new Promise2((resolve, reject) => {
			this.exitResolve = resolve;
		});
		this.interruptManager.event.add(this.eventOcurred);
    }

	create(name: string, entryPoint: number, initialPriority: number, stackSize: number = 0x1000, attributes: PspThreadAttributes = 0) {
		var thread = new Thread(name, this, this.memoryManager, this.rootCpuState.clone(), stackSize);
		thread.entryPoint = entryPoint;
        thread.state.PC = entryPoint;
        thread.state.setRA(CpuSpecialAddresses.EXIT_THREAD);
		thread.state.SP = thread.stackPartition.high;
		thread.initialPriority = initialPriority;
		thread.priority = initialPriority;
		thread.attributes = attributes;

		if ((thread.stackPartition.high & 0xFF) != 0) throw (new Error("Stack not aligned"));

		if (!(thread.attributes & PspThreadAttributes.NoFillStack)) {
			//this.memory.memset(thread.stackPartition.low, 0xFF, thread.stackPartition.size);
		} else if ((thread.attributes & PspThreadAttributes.ClearStack)) {
			//this.memory.memset(thread.stackPartition.low, 0x00, thread.stackPartition.size);
		}

        return thread;
    }

	eventOcurred() {
		if (!this.running) return;
        if (this.enqueued) return;
		this.enqueued = true;
		this.enqueuedTime = performance.now();
		Microtask.queue(() => this.eventOcurredCallback());
    }

    //get runningThreads() { return this.threads.filter(thread => thread.running); }

    private static getHighestPriority(threads: Thread[]) {
        var priority = -9999;
        threads.forEach(thread => {
            priority = Math.max(priority, thread.priority);
        });
        return priority;
    }

	eventOcurredCallback() {
		if (!this.running) return;

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

			this.threads.forEach((thread) => {
				if (this.callbackManager.hasPendingCallbacks) {
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

			if ((runningThreadCount == 0) && (callbackThreadCount == 0)) break;

			if (callbackThreadCount != 0) {
				this.threads.forEach((thread) => {
					if (thread.acceptingCallbacks && (thread.priority == callbackPriority)) {
						this.callbackManager.executePendingWithinThread(thread);
					}
				});
			}

			if (runningThreadCount != 0) {
				this.threads.forEach((thread) => {
					if (thread.running && (thread.priority == runningPriority)) {
						// No callbacks?
						this.callbackManager.executeLaterPendingWithinThread(thread);
						this.runThreadStep(thread);
					}
				});
			}
			
			//Microtask.execute(); // causes game to freeze

            var current = window.performance.now();
			if (current - start >= 100) {
				setTimeout(() => this.eventOcurred(), 0);
                return;
			}
        }
    }

	private runThreadStep(thread: Thread) {
		try {
			do {
				thread.runStep();
				if (!this.interruptManager.enabled) {
					console.log(thread.name, ':interrupts disabled, no thread scheduling!');
				}
			} while (!this.interruptManager.enabled);
		} catch (e) {
			//console.groupEnd();
			//console.log(e);
			//console.log(e['stack']);
			//debugger;
			if (e.message == 'CpuBreakException') return;
			var estack = e['stack'] || e;
			console.error(estack);
			alert(estack);
			thread.stop('error:' + estack);
			throw (e);
		}
	}

    private debugThreads() {
        var html = '';
        this.threads.forEach((thread) => {
            html += sprintf("%08X:%s:%s", thread.state.PC, thread.name, thread.running);
        });
        document.getElementById('thread_list').innerHTML = html;
    }

	private callbackAdded: any = null;
	startAsync() {
		this.running = true;
		this.eventOcurred();
		this.callbackAdded = this.callbackManager.onAdded.add(() => {
			this.eventOcurred();
		});
		return Promise2.resolve();
    }

    stopAsync() {
		this.running = false;
		this.callbackManager.onAdded.remove(this.callbackAdded);
		clearInterval(this.interval);
		this.interval = -1;
		return Promise2.resolve();
	}

	exitGame() {
		this.exitResolve();
	}

	waitExitGameAsync(): Promise2<any> {
		return this.exitPromise;
	}
}
