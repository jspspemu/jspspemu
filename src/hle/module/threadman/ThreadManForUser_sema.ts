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

	private semaporesUid = new UidCollection<Semaphore>(1);

	sceKernelCreateSema = createNativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*', this, (name: string, attribute: SemaphoreAttribute, initialCount: number, maxCount: number, options: Stream) => {
		var semaphore = new Semaphore(name, attribute, initialCount, maxCount);
		var id = this.semaporesUid.allocate(semaphore);
		semaphore.id = id;
		console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d) -> %d', name, attribute, initialCount, maxCount, id));
		return id;
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

	private _sceKernelWaitSemaCB(currentThread: Thread, id: number, signal: number, timeout: Stream, acceptCallbacks: AcceptCallbacks): any {
		//console.warn(sprintf('Not implemented ThreadManForUser._sceKernelWaitSemaCB(%d, %d) :: Thread("%s")', id, signal, currentThread.name));
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
		var semaphore = this.semaporesUid.get(id);
		var promise = semaphore.waitAsync(currentThread, signal);
		if (promise) {
			return new WaitingThreadInfo('sceKernelWaitSema', semaphore, promise, acceptCallbacks);
		} else {
			return 0;
		}
	}

	sceKernelWaitSemaCB = createNativeFunction(0x6D212BAC, 150, 'int', 'Thread/int/int/void*', this, (currentThread: Thread, id: number, signal: number, timeout: Stream): any => {
		return this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, AcceptCallbacks.YES);
	});

	sceKernelWaitSema = createNativeFunction(0x4E3A1105, 150, 'int', 'Thread/int/int/void*', this, (currentThread: Thread, id: number, signal: number, timeout: Stream): any => {
		return this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, AcceptCallbacks.NO);
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

	sceKernelSignalSema = createNativeFunction(0x3F53E640, 150, 'int', 'Thread/int/int', this, (currentThread: Thread, id: number, signal: number): any => {
		//console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d) : Thread("%s")', id, signal, currentThread.name));
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
		var semaphore = this.semaporesUid.get(id);
		var previousCount = semaphore.currentCount;
		if (semaphore.currentCount + signal > semaphore.maximumCount) return SceKernelErrors.ERROR_KERNEL_SEMA_OVERFLOW;
		var awakeCount = semaphore.incrementCount(signal);
		//console.info(sprintf(': awakeCount %d, previousCount: %d, currentCountAfterSignal: %d', awakeCount, previousCount, semaphore.currentCount));
		if (awakeCount > 0) {
			return Promise.resolve(0);
		} else {
			return 0;
		}
	});

	sceKernelPollSema = createNativeFunction(0x58B1F937, 150, 'int', 'Thread/int/int', this, (currentThread: Thread, id: number, signal: number): any => {
		var semaphore = this.semaporesUid.get(id);
		if (signal <= 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_COUNT;
		if (signal > semaphore.currentCount) return SceKernelErrors.ERROR_KERNEL_SEMA_ZERO;
		semaphore.incrementCount(-signal);
		return 0;
	});
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

class WaitingSemaphoreThread {
	constructor(public expectedCount: number, public wakeUp: Function) {
	}
}

class Semaphore {
	id: number;
	currentCount: number;
	waitingSemaphoreThreadList = new SortedSet<WaitingSemaphoreThread>();

	constructor(public name: string, public attributes: SemaphoreAttribute, public initialCount: number, public maximumCount: number) {
		this.currentCount = initialCount;
	}

	get numberOfWaitingThreads() { return this.waitingSemaphoreThreadList.length; }

	incrementCount(count: number) {
		this.currentCount = Math.min(this.currentCount + count, this.maximumCount);
		return this.updatedCount();
	}

	cancel() {
		this.waitingSemaphoreThreadList.forEach(item => {
			item.wakeUp();
		});
	}

	private updatedCount() {
		var awakeCount = 0;
		this.waitingSemaphoreThreadList.forEach(item => {
			if (this.currentCount >= item.expectedCount) {
				//console.info(sprintf('Semaphore.updatedCount: %d, %d -> %d', this.currentCount, item.expectedCount, this.currentCount - item.expectedCount));
				this.currentCount -= item.expectedCount;
				item.wakeUp();
				awakeCount++;
			}
		});
		return awakeCount;
	}

	waitAsync(thread: Thread, expectedCount: number) {
		if (this.currentCount >= expectedCount) {
			this.currentCount -= expectedCount;
			return null;
		} else {
			var promise = new Promise((resolve, reject) => {
				var waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, () => {
					//console.info(sprintf('Semaphore.waitAsync() -> wakeup thread : "%s"', thread.name));
					this.waitingSemaphoreThreadList.delete(waitingSemaphoreThread);
					resolve();
				});
				this.waitingSemaphoreThreadList.add(waitingSemaphoreThread);
			});
			this.updatedCount();
			return promise;
		}
	}

	delete() {
	}
}

enum SemaphoreAttribute {
	FirstInFirstOut = 0x000,
	Priority = 0x100,
}
