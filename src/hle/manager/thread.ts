import _cpu = require('../../core/cpu');
import _memory = require('../../core/memory');
import _display = require('../../core/display');
import _manager_memory = require('./memory');

import MemoryManager = _manager_memory.MemoryManager
import MemoryPartition = _manager_memory.MemoryPartition
import SyscallManager = _cpu.SyscallManager;
import PspDisplay = _display.PspDisplay;
import Memory = _memory.Memory;
import InstructionCache = _cpu.InstructionCache;
import CpuState = _cpu.CpuState;
import ProgramExecutor = _cpu.ProgramExecutor;
import NativeFunction = _cpu.NativeFunction;
import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;

export enum ThreadStatus {
	RUNNING = 1,
	READY   = 2,
	WAIT    = 4,
	SUSPEND = 8,
	DORMANT = 16,
	DEAD    = 32,

	WAITSUSPEND = WAIT | SUSPEND,
}

export enum PspThreadAttributes {
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
	name: string;
	status: ThreadStatus = ThreadStatus.DORMANT;
	programExecutor: ProgramExecutor;
	initialPriority: number = 10;
	entryPoint: number = 0;
	priority: number = 10;
	attributes: number = 0;
	exitStatus: number = 0x800201a2;
    running: boolean = false;
	stackPartition: MemoryPartition;
	preemptionCount: number = 0;
	info: WaitingThreadInfo<any> = null;
	waitingName: string = null;
	waitingObject: any = null;
	waitingPromise: Promise<any> = null;
	runningPromise: Promise<number> = null;
	runningStop: () => void;

	constructor(public manager: ThreadManager, memoryManager:MemoryManager, public state: CpuState, private instructionCache: InstructionCache, stackSize: number) {
        this.state.thread = this;
		this.programExecutor = new ProgramExecutor(state, instructionCache);
		this.runningPromise = new Promise((resolve, reject) => { this.runningStop = resolve; });
		this.stackPartition = memoryManager.stackPartition.allocateHigh(stackSize, name + '-stack', 0x100);
	}

	delete() {
		this.stackPartition.deallocate();
	}

	waitEndAsync() {
		return this.runningPromise;
	}

	private wakeupCount: number = 0;
	private wakeupPromise: Promise<number> = null;
	private wakeupFunc: () => void = null;

	private getWakeupPromise() {
		if (this.wakeupPromise) return this.wakeupPromise;
		this.wakeupPromise = new Promise<number>((resolve, reject) => {
			this.wakeupFunc = resolve;
		});
	}

	wakeupSleepAsync() {
		this.wakeupCount--;
		this.suspend();
		return this.getWakeupPromise();
	}

	wakeupWakeupAsync() {
		this.wakeupCount++;
		if (this.wakeupCount >= 0) {
			this.wakeupFunc();
			this.wakeupPromise = null;
			this.wakeupFunc = null;
		}
		return Promise.resolve(0);
	}

	accumulatedMicroseconds = 0;
	delayMicrosecondsAsync(delayMicroseconds: number) {
		//console.error(delayMicroseconds, this.accumulatedMicroseconds);

		var subtractAccumulatedMicroseconds = Math.min(delayMicroseconds, this.accumulatedMicroseconds);
		delayMicroseconds -= subtractAccumulatedMicroseconds;
		this.accumulatedMicroseconds -= subtractAccumulatedMicroseconds;

		//console.error(delayMicroseconds, this.accumulatedMicroseconds, subtractAccumulatedMicroseconds);

		if (delayMicroseconds <= 0.00001) {
			//console.error('none!');
			return Promise.resolve(0);
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

	suspendUntileDone(info: WaitingThreadInfo<any>) {
		this.info = info;
		this.waitingName = info.name;
		this.waitingObject = info.object;
		this._suspendUntilPromiseDone(info.promise);
	}

	suspendUntilPromiseDone(promise: Promise<any>, info:NativeFunction) {
		this.waitingName = sprintf('%s:0x%08X (Promise)', info.name, info.nid);
		this.waitingObject = info;
		this._suspendUntilPromiseDone(promise);
	}

	_suspendUntilPromiseDone(promise: Promise<any>) {
		this.waitingPromise = promise;

		this.suspend();

		//console.log(promise);

		promise.then((result: number) => {
			this.waitingPromise = null;
			this.waitingName = null;
			this.waitingObject = null;
			if (result !== undefined) this.state.V0 = result;
				
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
		this.manager.threads.add(this);
		this.manager.eventOcurred();
    }

    stop() {
		this.running = false;
		this.runningStop();
		this.manager.threads.delete(this);
		this.manager.eventOcurred();
    }

	runStep() {
		this.preemptionCount++;
		//console.error("Running: " + this.name);
		try {
			this.programExecutor.execute(10000);
			//this.programExecutor.execute(200000);
			//this.programExecutor.execute(2000000);
		} catch (e) {
			console.error(e);
			console.error(e['stack']);
			this.stop();
			throw (e);
		}
    }
}

export class ThreadManager {
    threads: DSet<Thread> = new DSet<Thread>();
    interval: number = -1;
	enqueued: boolean = false;
	running: boolean = false;
	exitPromise: Promise<any>;
	exitResolve: () => void;

	constructor(private memory: Memory, private memoryManager: MemoryManager, private display: PspDisplay, private syscallManager: SyscallManager, private instructionCache: InstructionCache) {
		this.exitPromise = new Promise((resolve, reject) => {
			this.exitResolve = resolve;
		});
    }

	create(name: string, entryPoint: number, initialPriority: number, stackSize: number = 0x1000, attributes: PspThreadAttributes = 0) {
		var thread = new Thread(this, this.memoryManager, new CpuState(this.memory, this.syscallManager), this.instructionCache, stackSize);
		thread.name = name;
		thread.entryPoint = entryPoint;
        thread.state.PC = entryPoint;
        thread.state.RA = CpuSpecialAddresses.EXIT_THREAD;
		thread.state.SP = thread.stackPartition.high;
		thread.initialPriority = initialPriority;
		thread.priority = initialPriority;
		thread.attributes = attributes;

		if ((thread.stackPartition.high & 0xFF) != 0) throw(new Error("Stack not aligned"));

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
		setImmediate(() => this.eventOcurredCallback());
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

        this.enqueued = false;
        var start = window.performance.now();

        while (true) {
            var threadCount = 0;
            var priority = 2147483648;

			this.threads.forEach((thread) => {
				if (thread.running) {
					threadCount++;
					priority = Math.min(priority, thread.priority);
				}
			});

            if (threadCount == 0) break;

			this.threads.forEach((thread) => {
				if (thread.running) {
					if (thread.priority == priority) thread.runStep();
				}
			});

            var current = window.performance.now();
			if (current - start >= 100) {
				setTimeout(() => this.eventOcurred(), 0);
                return;
			}
        }
    }

    private debugThreads() {
        var html = '';
        this.threads.forEach((thread) => {
            html += sprintf("%08X:%s:%s", thread.state.PC, thread.name, thread.running);
        });
        document.getElementById('thread_list').innerHTML = html;
    }

	startAsync() {
		this.running = true;
		this.eventOcurred();
		return Promise.resolve();
    }

    stopAsync() {
		this.running = false;
		clearInterval(this.interval);
		this.interval = -1;
		return Promise.resolve();
	}

	exitGame() {
		this.exitResolve();
	}

	waitExitGameAsync(): Promise<any> {
		return this.exitPromise;
	}
}
