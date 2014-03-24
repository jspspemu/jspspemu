module hle {
    export class Thread {
        id: number = 0;
        name: string;
		programExecutor: ProgramExecutor;
		initialPriority: number = 10;
        priority: number = 10;
        exitStatus: number = 0;
        running: boolean = false;

        constructor(public manager: ThreadManager, public state: core.cpu.CpuState, private instructionCache: InstructionCache) {
            this.state.thread = this;
            this.programExecutor = new ProgramExecutor(state, instructionCache);
        }

        suspend() {
            this.running = false;
            this.manager.eventOcurred();
        }

        suspendUntilPromiseDone(promise: Promise<any>) {
            this.suspend();

            promise.then((result: number) => {
                if (result !== undefined) this.state.V0 = result;
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
			this.manager.threads.delete(this);
			this.manager.eventOcurred();
        }

		runStep() {
			try {
				this.programExecutor.execute(10000);
			} catch (e) {
				this.stop();
				throw (e);
			}
            //this.programExecutor.execute(200000);
        }
    }

    export class ThreadManager {
        threads: DSet<Thread> = new DSet<Thread>();
        interval: number = -1;
		enqueued: boolean = false;
		running: boolean = false;

		constructor(private memory: core.Memory, private memoryManager: hle.MemoryManager, private display: core.PspDisplay, private syscallManager: core.ISyscallManager, private instructionCache: InstructionCache) {
        }

        create(name: string, entryPoint: number, initialPriority: number, stackSize: number = 0x1000) {
            var thread = new Thread(this, new core.cpu.CpuState(this.memory, this.syscallManager), this.instructionCache);
            thread.name = name;
            thread.state.PC = entryPoint;
            thread.state.RA = CpuSpecialAddresses.EXIT_THREAD;
			thread.state.SP = this.memoryManager.stackPartition.allocateHigh(stackSize).high;
			thread.initialPriority = initialPriority;
            thread.priority = initialPriority;
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

            //this.debugThreads();

            //console.log('eventOcurredCallback');

            while (true) {
                /*
                var runningThreads = this.runningThreads;
                if (runningThreads.length == 0) break;

                //var priority = HleThreadManager.getHighestPriority(runningThreads);
                //runningThreads.filter(thread => thread.priority == priority).forEach((thread) => thread.runStep());
                runningThreads.forEach((thread) => thread.runStep());
                */

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
                    setTimeout(() => this.eventOcurred(), 100);
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
    }
}
