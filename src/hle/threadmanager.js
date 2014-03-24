var hle;
(function (hle) {
    var Thread = (function () {
        function Thread(manager, state, instructionCache) {
            this.manager = manager;
            this.state = state;
            this.instructionCache = instructionCache;
            this.id = 0;
            this.initialPriority = 10;
            this.priority = 10;
            this.exitStatus = 0;
            this.running = false;
            this.state.thread = this;
            this.programExecutor = new ProgramExecutor(state, instructionCache);
        }
        Thread.prototype.suspend = function () {
            this.running = false;
            this.manager.eventOcurred();
        };

        Thread.prototype.suspendUntilPromiseDone = function (promise) {
            var _this = this;
            this.suspend();

            promise.then(function (result) {
                if (result !== undefined)
                    _this.state.V0 = result;
                _this.resume();
            });
        };

        Thread.prototype.resume = function () {
            this.running = true;
            this.manager.eventOcurred();
        };

        Thread.prototype.start = function () {
            this.running = true;
            this.manager.threads.add(this);
            this.manager.eventOcurred();
        };

        Thread.prototype.stop = function () {
            this.running = false;
            this.manager.threads.delete(this);
            this.manager.eventOcurred();
        };

        Thread.prototype.runStep = function () {
            try  {
                this.programExecutor.execute(10000);
            } catch (e) {
                this.stop();
                throw (e);
            }
            //this.programExecutor.execute(200000);
        };
        return Thread;
    })();
    hle.Thread = Thread;

    var ThreadManager = (function () {
        function ThreadManager(memory, memoryManager, display, syscallManager, instructionCache) {
            this.memory = memory;
            this.memoryManager = memoryManager;
            this.display = display;
            this.syscallManager = syscallManager;
            this.instructionCache = instructionCache;
            this.threads = new DSet();
            this.interval = -1;
            this.enqueued = false;
            this.running = false;
        }
        ThreadManager.prototype.create = function (name, entryPoint, initialPriority, stackSize) {
            if (typeof stackSize === "undefined") { stackSize = 0x1000; }
            var thread = new Thread(this, new core.cpu.CpuState(this.memory, this.syscallManager), this.instructionCache);
            thread.name = name;
            thread.state.PC = entryPoint;
            thread.state.RA = 268435455 /* EXIT_THREAD */;
            thread.state.SP = this.memoryManager.stackPartition.allocateHigh(stackSize).high;
            thread.initialPriority = initialPriority;
            thread.priority = initialPriority;
            return thread;
        };

        ThreadManager.prototype.eventOcurred = function () {
            var _this = this;
            if (!this.running)
                return;
            if (this.enqueued)
                return;
            this.enqueued = true;
            setImmediate(function () {
                return _this.eventOcurredCallback();
            });
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

            this.enqueued = false;
            var start = window.performance.now();

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

                this.threads.forEach(function (thread) {
                    if (thread.running) {
                        threadCount++;
                        priority = Math.min(priority, thread.priority);
                    }
                });

                if (threadCount == 0)
                    break;

                this.threads.forEach(function (thread) {
                    if (thread.running) {
                        if (thread.priority == priority)
                            thread.runStep();
                    }
                });

                var current = window.performance.now();
                if (current - start >= 100) {
                    setTimeout(function () {
                        return _this.eventOcurred();
                    }, 100);
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
            this.running = true;
            this.eventOcurred();
            return Promise.resolve();
        };

        ThreadManager.prototype.stopAsync = function () {
            this.running = false;
            clearInterval(this.interval);
            this.interval = -1;
            return Promise.resolve();
        };
        return ThreadManager;
    })();
    hle.ThreadManager = ThreadManager;
})(hle || (hle = {}));
//# sourceMappingURL=threadmanager.js.map
