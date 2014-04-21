module hle.modules {
    export class ThreadManForUser {
        constructor(private context: EmulatorContext) { }

        private threadUids = new UidCollection<Thread>(1);

		sceKernelCreateThread = createNativeFunction(0x446D8DE6, 150, 'uint', 'HleThread/string/uint/int/int/int/int', this, (currentThread:Thread, name: string, entryPoint: number, initPriority: number, stackSize: number, attribute: number, optionPtr: number) => {
            //var stackPartition = this.context.memoryManager.stackPartition;
			var newThread = this.context.threadManager.create(name, entryPoint, initPriority, stackSize);
			newThread.id = this.threadUids.allocate(newThread);

			console.info(sprintf('sceKernelCreateThread: %d:"%s":priority=%d, currentPriority=%d', newThread.id, newThread.name, newThread.priority, currentThread.priority));

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

		sceKernelChangeThreadPriority = createNativeFunction(0x71BC9871, 150, 'uint', 'HleThread/int/int', this, (currentThread: Thread, threadId: number, priority: number) => {
			var thread = this.threadUids.get(threadId);
			thread.priority = priority;
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
			return new Promise((resolve, reject) => {
			});
        });

		sceKernelSleepThread = createNativeFunction(0x9ACE131E, 150, 'uint', 'CpuState', this, (state: core.cpu.CpuState) => {
            var currentThread = (<Thread>state.thread);
			return new Promise((resolve, reject) => {
			});
		});

		private eventFlagUids = new UidCollection<EventFlag>(1);

		sceKernelCreateEventFlag = createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, (name: string, attributes: number, bitPattern: number, optionsPtr: Stream) => {
			if (name === null) return SceKernelErrors.ERROR_ERROR;
			if ((attributes & 0x100) != 0 || attributes >= 0x300) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ATTR;

			//console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
			var eventFlag = new EventFlag();
			eventFlag.name = name;
			eventFlag.attributes = attributes;
			eventFlag.initialPattern = bitPattern;
			eventFlag.currentPattern = bitPattern;
			return this.eventFlagUids.allocate(eventFlag);
		});

		sceKernelSetEventFlag = createNativeFunction(0x1FB15A32, 150, 'uint', 'int/uint', this, (id: number, bitPattern: number) => {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			this.eventFlagUids.get(id).setBits(bitPattern);
			return 0;
		});

		private _sceKernelWaitEventFlagCB(id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: boolean): any {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			var eventFlag = this.eventFlagUids.get(id);

			if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
			if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
			var timedOut = false;
			var previousPattern = eventFlag.currentPattern;
			return eventFlag.waitAsync(bits, waitType, outBits, timeout, callbacks).then(() => {
				if (outBits != null) outBits.writeUInt32(previousPattern);
				return 0;
			});
		}

		sceKernelWaitEventFlag = createNativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) => {
			return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, false);
		});

		sceKernelWaitEventFlagCB = createNativeFunction(0x328C546A, 150, 'uint', 'int/uint/int/void*/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream) => {
			return this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, true);
		});

		sceKernelPollEventFlag = createNativeFunction(0x30FD48F0, 150, 'uint', 'int/uint/int/void*', this, (id: number, bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream) => {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
			if ((waitType & (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) == (EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll)) {
				return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MODE;
			}
			if (bits == 0) return SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN;
			if (EventFlag == null) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;

			var matched = this.eventFlagUids.get(id).poll(bits, waitType, outBits);

			return matched ? 0 : SceKernelErrors.ERROR_KERNEL_EVENT_FLAG_POLL_FAILED;
		});

		sceKernelDeleteEventFlag = createNativeFunction(0xEF9E4C70, 150, 'uint', 'int', this, (id: number) => {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			this.eventFlagUids.remove(id);
			return 0;
		});

		sceKernelClearEventFlag = createNativeFunction(0x812346E4, 150, 'uint', 'int/uint', this, (id: number, bitsToClear: number) => {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			this.eventFlagUids.get(id).clearBits(bitsToClear);
			return 0;
		});

		sceKernelCancelEventFlag = createNativeFunction(0xCD203292, 150, 'uint', 'int/uint/void*', this, (id: number, newPattern: number, numWaitThreadPtr: Stream) => {
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			this.eventFlagUids.get(id).cancel(newPattern);
			return 0;
		});

		sceKernelReferEventFlagStatus = createNativeFunction(0xA66B0120, 150, 'uint', 'int/void*', this, (id: number, infoPtr: Stream) => {
			var size = infoPtr.readUInt32();
			if (size == 0) return 0;

			infoPtr.position = 0;
			if (!this.eventFlagUids.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_EVENT_FLAG;
			var eventFlag = this.eventFlagUids.get(id);
			var info = new EventFlagInfo();
			info.size = EventFlagInfo.struct.length;
			info.name = eventFlag.name;
			info.currentPattern = eventFlag.currentPattern;
			info.initialPattern = eventFlag.initialPattern;
			info.attributes = eventFlag.attributes;
			info.numberOfWaitingThreads = eventFlag.waitingThreads.length;
			EventFlagInfo.struct.write(infoPtr, info);
			console.warn('Not implemented ThreadManForUser.sceKernelReferEventFlagStatus');
			return 0;
		});

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
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
			var semaphore = this.semaporesUid.get(id);
			semaphore.delete();
			this.semaporesUid.remove(id);
			return 0;
		});

		sceKernelCancelSema = createNativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*', this, (id: number, count: number, numWaitingThreadsPtr: Stream) => {
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
			var semaphore = this.semaporesUid.get(id);
			if (numWaitingThreadsPtr) numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
			semaphore.cancel();
			return 0;
		});

		sceKernelWaitSemaCB = createNativeFunction(0x6D212BAC, 150, 'int', 'int/int/void*', this, (id: number, signal: number, timeout: Stream):any => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelWaitSemaCB(%d, %d)', id, signal));
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
			return this.semaporesUid.get(id).waitAsync(signal);
		});

		sceKernelWaitSema = createNativeFunction(0x4E3A1105, 150, 'int', 'int/int/void*', this, (id: number, signal: number, timeout: Stream): any => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelWaitSema(%d, %d)', id, signal));
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
			return this.semaporesUid.get(id).waitAsync(signal);
		});

		sceKernelReferSemaStatus = createNativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*', this, (id: number, infoStream: Stream) => {
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
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
			return 0;
		});

		sceKernelSignalSema = createNativeFunction(0x3F53E640, 150, 'int', 'int/int', this, (id: number, signal: number) => {
			console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d)', id, signal));
			if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
			var semaphore = this.semaporesUid.get(id);
			if (semaphore.currentCount + signal > semaphore.maximumCount) return SceKernelErrors.ERROR_KERNEL_SEMA_OVERFLOW;
			semaphore.incrementCount(signal);
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

	enum SemaphoreAttribute {
		FirstInFirstOut = 0x000,
		Priority = 0x100,
	}

	class EventFlagWaitingThread {
		constructor(public bitsToMatch: number, public waitType: EventFlagWaitTypeSet, public outBits: Stream, public eventFlag: EventFlag, public wakeUp: () => void) {
		}
	}

	class EventFlag {
		name: string;
		attributes: number;
		currentPattern: number;
		initialPattern: number;
		waitingThreads = new SortedSet<EventFlagWaitingThread>();

		waitAsync(bits: number, waitType: EventFlagWaitTypeSet, outBits: Stream, timeout: Stream, callbacks: boolean) {
			return new Promise((resolve, reject) => {
				var waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, this, () => {
					this.waitingThreads.delete(waitingSemaphoreThread);
					resolve();
				});
				this.waitingThreads.add(waitingSemaphoreThread);
			}).then(() => 0);
		}

		poll(bitsToMatch: number, waitType: EventFlagWaitTypeSet, outBits: Stream) {
			if (outBits != null) outBits.writeInt32(this.currentPattern);

			if (
				(waitType & EventFlagWaitTypeSet.Or)
				? ((this.currentPattern & bitsToMatch) != 0) // one or more bits of the mask
				: ((this.currentPattern & bitsToMatch) == bitsToMatch)) // all the bits of the mask
			{
				this._doClear(bitsToMatch, waitType);
				return true;
			}

			return false;
		}

		private _doClear(bitsToMatch: number, waitType: EventFlagWaitTypeSet) {
			if (waitType & (EventFlagWaitTypeSet.ClearAll)) this.clearBits(~0xFFFFFFFF, false);
			if (waitType & (EventFlagWaitTypeSet.Clear)) this.clearBits(~bitsToMatch, false);
		}

		cancel(newPattern: number) {
			this.waitingThreads.forEach(item => {
				item.wakeUp();
			});
		}

		clearBits(bitsToClear:number, doUpdateWaitingThreads = true) {
			this.currentPattern &= bitsToClear;
			if (doUpdateWaitingThreads) this.updateWaitingThreads();
		}

		setBits(bits: number, doUpdateWaitingThreads = true) {
			this.currentPattern |= bits;
			if (doUpdateWaitingThreads) this.updateWaitingThreads();
		}

		private updateWaitingThreads() {
			this.waitingThreads.forEach(waitingThread => {
				if (this.poll(waitingThread.bitsToMatch, waitingThread.waitType, waitingThread.outBits)) {
					waitingThread.wakeUp();
				}
			});
		}
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
			{ size: Int32 },
			{ name: Stringz(32) },
			{ attributes: Int32 },
			{ initialCount: Int32 },
			{ currentCount: Int32 },
			{ maximumCount: Int32 },
			{ numberOfWaitingThreads: Int32 },
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

	class EventFlagInfo {
		size: number;
		name: string;
		attributes: number; // HleEventFlag.AttributesSet
		initialPattern: number;
		currentPattern: number;
		numberOfWaitingThreads: number;

		static struct = StructClass.create<EventFlagInfo>(EventFlagInfo, [
			{ size: Int32 },
			{ name: Stringz(32) },
			{ attributes: Int32 },
			{ initialPattern: UInt32 },
			{ currentPattern: UInt32 },
			{ numberOfWaitingThreads: Int32 },
		]);
	}

	enum EventFlagWaitTypeSet {
		And = 0x00,
		Or = 0x01,
		ClearAll = 0x10,
		Clear = 0x20,
		MaskValidBits = Or | Clear | ClearAll,
	}
}
