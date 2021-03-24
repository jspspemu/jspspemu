import {AcceptCallbacks, PromiseFast, SortedSet, sprintf, UidCollection, WaitingThreadInfo} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {Int32, Stringz, StructClass} from "../../../global/struct";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {nativeFunction} from "../../utils";
import {Thread} from "../../manager/thread";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	private semaporesUid = new UidCollection<Semaphore>(1);

	@nativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*')
	sceKernelCreateSema(name: string, attribute: SemaphoreAttribute, initialCount: number, maxCount: number, options: Stream) {
        const semaphore = new Semaphore(name, attribute, initialCount, maxCount);
        const id = this.semaporesUid.allocate(semaphore);
        semaphore.id = id;
		console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d) -> %d', name, attribute, initialCount, maxCount, id));
		return id;
	}

	@nativeFunction(0x28B6489C, 150, 'int', 'int')
	sceKernelDeleteSema(id: number) {
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
        const semaphore = this.semaporesUid.get(id);
        semaphore.delete();
		this.semaporesUid.remove(id);
		return 0;
	}

	@nativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*')
	sceKernelCancelSema(id: number, count: number, numWaitingThreadsPtr: Stream) {
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
        const semaphore = this.semaporesUid.get(id);
        if (numWaitingThreadsPtr) numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
		semaphore.cancel();
		return 0;
	}

	private _sceKernelWaitSemaCB(currentThread: Thread, id: number, signal: number, timeout: Stream, acceptCallbacks: AcceptCallbacks): any {

		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
        const semaphore = this.semaporesUid.get(id);
        const promise = semaphore.waitAsync(currentThread, signal);
        if (promise) {
			return new WaitingThreadInfo('sceKernelWaitSema', semaphore, promise, acceptCallbacks);
		} else {
			return 0;
		}
	}

	@nativeFunction(0x6D212BAC, 150, 'int', 'Thread/int/int/void*')
	sceKernelWaitSemaCB(currentThread: Thread, id: number, signal: number, timeout: Stream): any {
		return this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, AcceptCallbacks.YES);
	}

	@nativeFunction(0x4E3A1105, 150, 'int', 'Thread/int/int/void*')
	sceKernelWaitSema(currentThread: Thread, id: number, signal: number, timeout: Stream): any {
		return this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, AcceptCallbacks.NO);
	}

	@nativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*')
	sceKernelReferSemaStatus(id: number, infoStream: Stream) {
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
        const semaphore = this.semaporesUid.get(id);
        const semaphoreInfo = new SceKernelSemaInfo();
        semaphoreInfo.size = SceKernelSemaInfo.struct.length;
		semaphoreInfo.attributes = semaphore.attributes;
		semaphoreInfo.currentCount = semaphore.currentCount;
		semaphoreInfo.initialCount = semaphore.initialCount;
		semaphoreInfo.maximumCount = semaphore.maximumCount;
		semaphoreInfo.name = semaphore.name;
		semaphoreInfo.numberOfWaitingThreads = semaphore.numberOfWaitingThreads;
		SceKernelSemaInfo.struct.write(infoStream, semaphoreInfo);
		return 0;
	}

	@nativeFunction(0x3F53E640, 150, 'int', 'Thread/int/int')
	sceKernelSignalSema(currentThread: Thread, id: number, signal: number): any {
		if (!this.semaporesUid.has(id)) return SceKernelErrors.ERROR_KERNEL_NOT_FOUND_SEMAPHORE;
        const semaphore = this.semaporesUid.get(id);
        const previousCount = semaphore.currentCount;
        if (semaphore.currentCount + signal > semaphore.maximumCount) return SceKernelErrors.ERROR_KERNEL_SEMA_OVERFLOW;
        const awakeCount = semaphore.incrementCount(signal);
        if (awakeCount > 0) {
			return PromiseFast.resolve(0);
		} else {
			return 0;
		}
	}

	@nativeFunction(0x58B1F937, 150, 'int', 'Thread/int/int')
	sceKernelPollSema(currentThread: Thread, id: number, signal: number): any {
        const semaphore = this.semaporesUid.get(id);
        if (signal <= 0) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_COUNT;
		if (signal > semaphore.currentCount) return SceKernelErrors.ERROR_KERNEL_SEMA_ZERO;
		semaphore.incrementCount(-signal);
		return 0;
	}
}

class SceKernelSemaInfo {
	size: number = 0
	name: string = ''
	attributes: SemaphoreAttribute = SemaphoreAttribute.FirstInFirstOut
	initialCount: number = 0
	currentCount: number = 0
	maximumCount: number = 0
	numberOfWaitingThreads: number = 0

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
	id: number = 0
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
        let awakeCount = 0;
        this.waitingSemaphoreThreadList.forEach(item => {
			if (this.currentCount >= item.expectedCount) {
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
			const promise = new PromiseFast((resolve, reject) => {
                const waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, () => {
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
