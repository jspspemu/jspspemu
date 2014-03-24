module hle.modules {
    export class ThreadManForUser {
        constructor(private context: EmulatorContext) { }

        private threadUids = new UidCollection<Thread>(1);

        sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'uint', 'string/uint/int/int/int/int', this, (name: string, entryPoint: number, initPriority: number, stackSize: number, attribute: number, optionPtr: number) => {
            var stackPartition = this.context.memoryManager.stackPartition;
            var newThread = this.context.threadManager.create(name, entryPoint, initPriority, stackSize);
            newThread.id = this.threadUids.allocate(newThread);
            return newThread.id;
		});

		sceKernelDelayThread = createNativeFunction(0xCEADEB47, 150, 'uint', 'uint', this, (delayInMicroseconds: number) => {
			return PromiseUtils.delayAsync(delayInMicroseconds / 1000);
		});

		sceKernelDelayThreadCB = createNativeFunction(0x68DA9E36, 150, 'uint', 'uint', this, (delayInMicroseconds: number) => {
			return PromiseUtils.delayAsync(delayInMicroseconds / 1000);
		});

		sceKernelGetThreadCurrentPriority = createNativeFunction(0x94AA61EE, 150, 'int', 'HleThread', this, (currentThread: Thread) => currentThread.priority);

		sceKernelStartThread = createNativeFunction(0xF475845D, 150, 'uint', 'HleThread/int/int/int', this, (currentThread: Thread, threadId: number, userDataLength: number, userDataPointer: number) => {
			var newThread = this.threadUids.get(threadId);

			console.info(sprintf('sceKernelStartThread: %d:"%s"', threadId, newThread.name));

			var newState = newThread.state;
			newState.GP = currentThread.state.GP;
			newState.RA = CpuSpecialAddresses.EXIT_THREAD;
			if (userDataPointer != null) {
				newState.SP -= userDataLength;
				newState.memory.copy(userDataPointer, newState.SP, userDataLength);
				newState.gpr[4] = userDataLength;
				newState.gpr[5] = newState.SP;
            }
			newThread.start();
            return Promise.resolve(0);
		});

		sceKernelDeleteThread = createNativeFunction(0x9FA03CD3, 150, 'int', 'int', this, (threadId: number) => {
			var newThread = this.threadUids.get(threadId);
			this.threadUids.remove(threadId);
			return 0;
		});

		sceKernelExitThread = createNativeFunction(0xAA73C935, 150, 'int', 'HleThread/int', this, (currentThread: hle.Thread, exitStatus: number) => {
			console.info(sprintf('sceKernelExitThread: %d', exitStatus));

			currentThread.exitStatus = exitStatus;
			currentThread.stop();
			throw (new CpuBreakException());
		});

		sceKernelTerminateThread = createNativeFunction(0x616403BA, 150, 'int', 'int', this, (threadId: number) => {
			console.info(sprintf('sceKernelTerminateThread: %d', threadId));

			var newThread = this.threadUids.get(threadId);
			newThread.stop();
			newThread.exitStatus = 0x800201ac;
			return 0;
		});

		sceKernelExitDeleteThread = createNativeFunction(0x809CE29B, 150, 'uint', 'CpuState/int', this, (state: core.cpu.CpuState, exitStatus: number) => {
            var currentThread = (<Thread>state.thread);
            currentThread.exitStatus = exitStatus;
            currentThread.stop();
            throw (new CpuBreakException());
        });

        sceKernelCreateCallback = createNativeFunction(0xE81CAF8F, 150, 'uint', 'string/int/uint', this, (name: string, functionCallbackAddr: number, argument: number) => {
            console.warn('Not implemented ThreadManForUser.sceKernelCreateCallback');
            return 0;
        });

		sceKernelSleepThreadCB = createNativeFunction(0x82826F70, 150, 'uint', 'HleThread/CpuState', this, (currentThread: Thread, state: core.cpu.CpuState) => {
            currentThread.suspend();
            return Promise.resolve(0);
        });

		sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'CpuState', this, (state: core.cpu.CpuState) => {
            var currentThread = (<Thread>state.thread);
            currentThread.suspend();
			return Promise.resolve(0);
		});

		private eventFlagUids = new UidCollection<EventFlag>(1);

        sceKernelCreateEventFlag = createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, (name: string, attributes: number, bitPattern: number, optionsPtr: Stream) => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
			var eventFlag = new EventFlag();
			eventFlag.name = name;
			eventFlag.attributes = attributes;
			eventFlag.bitPattern = bitPattern;
			return this.eventFlagUids.allocate(eventFlag);
		});

		//sceKernelWaitEventFlag = createNativeFunction(0x402FCF22, 150, 'uint', 'string/int/int/void*', this, (name: string, attributes: number, bitPattern: number, optionsPtr: Stream) => {

		//[HlePspFunction(NID = 0x402FCF22, FirmwareVersion = 150)]
		//public int sceKernelWaitEventFlag(HleEventFlag EventFlag, uint Bits, EventFlagWaitTypeSet WaitType, uint * OutBits, uint * Timeout)
		//{


        sceKernelGetSystemTimeLow = createNativeFunction(0x369ED59D, 150, 'uint', '', this, () => {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return new Date().getTime() * 1000;
        });

        sceKernelGetSystemTimeWide = createNativeFunction(0x82BC5777, 150, 'long', '', this, () => {
            //console.warn('Not implemented ThreadManForUser.sceKernelGetSystemTimeLow');
            return new Date().getTime() * 1000;
        });

        sceKernelGetThreadId = createNativeFunction(0x293B45B8, 150, 'int', 'HleThread', this, (currentThread: Thread) => currentThread.id);

        sceKernelReferThreadStatus = createNativeFunction(0x17C1684E, 150, 'int', 'int/void*', this, (threadId: number, sceKernelThreadInfoPtr: Stream) => {
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

		private semaporesUid = new UidCollection<Semaphore>(1);

		sceKernelCreateSema = createNativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*', this, (name: string, attribute: SemaphoreAttribute, initialCount: number, maxCount: number, options: Stream) => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d)', name, attribute, initialCount, maxCount));
			return this.semaporesUid.allocate(new Semaphore(name, attribute, initialCount, maxCount));
		});

		sceKernelDeleteSema = createNativeFunction(0x28B6489C, 150, 'int', 'int', this, (id: number) => {
			var semaphore = this.semaporesUid.get(id);
			semaphore.delete();
			this.semaporesUid.remove(id);
			return 0;
		});

		sceKernelCancelSema = createNativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*', this, (id: number, count: number, numWaitingThreadsPtr: Stream) => {
			var semaphore = this.semaporesUid.get(id);
			if (numWaitingThreadsPtr) numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
			semaphore.cancel();
			return 0;
		});

		sceKernelWaitSema = createNativeFunction(0x4E3A1105, 150, 'int', 'int/int/void*', this, (id: number, signal: number, timeout: Stream) => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelWaitSema(%d, %d)', id, signal));
			return this.semaporesUid.get(id).waitAsync(signal);
		});

		sceKernelReferSemaStatus = createNativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*', this, (id: number, infoStream: Stream) => {
			var semaphore = this.semaporesUid.get(id);
			var semaphoreInfo = new SceKernelSemaInfo();
			semaphoreInfo.size = SceKernelSemaInfo.struct.length;
			semaphoreInfo.attributes = semaphore.attributes;
			semaphoreInfo.currentCount = semaphore.currentCount;
			semaphoreInfo.initialCount = semaphore.initialCount;
			semaphoreInfo.maximumCount = semaphore.maximumCount;
			semaphoreInfo.name = semaphore.name;
			semaphoreInfo.numberOfWaitingThreads = semaphore.numberOfWaitingThreads;
			SceKernelSemaInfo.struct.write(infoStream, semaphoreInfo);
		});

		sceKernelSignalSema = createNativeFunction(0x3F53E640, 150, 'int', 'int/int', this, (id: number, signal: number) => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d)', id, signal));
			this.semaporesUid.get(id).incrementCount(signal);
			return 0;
		});
	}

	class WaitingSemaphoreThread {
		constructor(public expectedCount: number, public wakeUp: Function) {
		}
	}

	class Semaphore {
		currentCount: number;
		waitingSemaphoreThreadList = new SortedSet<WaitingSemaphoreThread>();

		constructor(public name: string, public attributes: SemaphoreAttribute, public initialCount: number, public maximumCount: number) {
			this.currentCount = initialCount;
		}

		get numberOfWaitingThreads() { return this.waitingSemaphoreThreadList.length; }

		incrementCount(count: number) {
			this.currentCount = Math.min(this.currentCount + count, this.maximumCount);
			this.updatedCount();
		}

		cancel() {
			this.waitingSemaphoreThreadList.forEach(item => {
				item.wakeUp();
			});
		}

		private updatedCount() {
			this.waitingSemaphoreThreadList.forEach(item => {
				if (this.currentCount >= item.expectedCount) {
					this.currentCount -= item.expectedCount;
					item.wakeUp();
				}
			});
		}

		waitAsync(expectedCount: number) {
			var promise = new Promise((resolve, reject) => {
				var waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, () => {
					this.waitingSemaphoreThreadList.delete(waitingSemaphoreThread);
					resolve();
				});
				this.waitingSemaphoreThreadList.add(waitingSemaphoreThread);
			});
			this.updatedCount();
			return promise;
		}

		delete() {
		}
	}

	enum SemaphoreAttribute {// : uint
		FirstInFirstOut = 0x000,
		Priority = 0x100,
	}

	class EventFlag {
		name: string;
		attributes: number;
		bitPattern: number;
	}

	class SceKernelSemaInfo {
		size: number;
		name: string;
		attributes: SemaphoreAttribute;
		initialCount: number;
		currentCount: number;
		maximumCount: number;
		numberOfWaitingThreads: number;

		static struct = StructClass.create<SceKernelSemaInfo>(SceKernelSemaInfo, [
			{ type: Int32, name: 'size' },
			{ type: Stringz(32), name: 'name' },
			{ type: Int32, name: 'attributes' },
			{ type: Int32, name: 'initialCount' },
			{ type: Int32, name: 'currentCount' },
			{ type: Int32, name: 'maximumCount' },
			{ type: Int32, name: 'numberOfWaitingThreads' },
		]);
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
            { type: Int32, name: 'size' },
            { type: Stringz(32), name: 'name' },
            { type: UInt32, name: 'attributes' },
            { type: UInt32, name: 'status' },
            { type: UInt32, name: 'entryPoint' },
            { type: UInt32, name: 'stackPointer' },
            { type: Int32, name: 'stackSize' },
            { type: UInt32, name: 'GP' },
            { type: Int32, name: 'priorityInit' },
            { type: Int32, name: 'priority' },
            { type: UInt32, name: 'waitType' },
            { type: Int32, name: 'waitId' },
            { type: Int32, name: 'wakeupCount' },
            { type: Int32, name: 'exitStatus' },
            { type: Int32, name: 'runClocksLow' },
            { type: Int32, name: 'runClocksHigh' },
            { type: Int32, name: 'interruptPreemptionCount' },
            { type: Int32, name: 'threadPreemptionCount' },
            { type: Int32, name: 'releaseCount' },
        ]);
    }
}
