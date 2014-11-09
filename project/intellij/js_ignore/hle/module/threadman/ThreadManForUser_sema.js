///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');
var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.semaporesUid = new UidCollection(1);
        this.sceKernelCreateSema = createNativeFunction(0xD6DA4BA1, 150, 'int', 'string/int/int/int/void*', this, function (name, attribute, initialCount, maxCount, options) {
            var semaphore = new Semaphore(name, attribute, initialCount, maxCount);
            var id = _this.semaporesUid.allocate(semaphore);
            semaphore.id = id;
            console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateSema("%s", %d, count=%d, maxCount=%d) -> %d', name, attribute, initialCount, maxCount, id));
            return id;
        });
        this.sceKernelDeleteSema = createNativeFunction(0x28B6489C, 150, 'int', 'int', this, function (id) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            semaphore.delete();
            _this.semaporesUid.remove(id);
            return 0;
        });
        this.sceKernelCancelSema = createNativeFunction(0x8FFDF9A2, 150, 'uint', 'uint/uint/void*', this, function (id, count, numWaitingThreadsPtr) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            if (numWaitingThreadsPtr)
                numWaitingThreadsPtr.writeInt32(semaphore.numberOfWaitingThreads);
            semaphore.cancel();
            return 0;
        });
        this.sceKernelWaitSemaCB = createNativeFunction(0x6D212BAC, 150, 'int', 'Thread/int/int/void*', this, function (currentThread, id, signal, timeout) {
            return _this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, 1 /* YES */);
        });
        this.sceKernelWaitSema = createNativeFunction(0x4E3A1105, 150, 'int', 'Thread/int/int/void*', this, function (currentThread, id, signal, timeout) {
            return _this._sceKernelWaitSemaCB(currentThread, id, signal, timeout, 0 /* NO */);
        });
        this.sceKernelReferSemaStatus = createNativeFunction(0xBC6FEBC5, 150, 'int', 'int/void*', this, function (id, infoStream) {
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
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
        this.sceKernelSignalSema = createNativeFunction(0x3F53E640, 150, 'int', 'Thread/int/int', this, function (currentThread, id, signal) {
            //console.warn(sprintf('Not implemented ThreadManForUser.sceKernelSignalSema(%d, %d) : Thread("%s")', id, signal, currentThread.name));
            if (!_this.semaporesUid.has(id))
                return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
            var semaphore = _this.semaporesUid.get(id);
            var previousCount = semaphore.currentCount;
            if (semaphore.currentCount + signal > semaphore.maximumCount)
                return 2147615150 /* ERROR_KERNEL_SEMA_OVERFLOW */;
            var awakeCount = semaphore.incrementCount(signal);
            //console.info(sprintf(': awakeCount %d, previousCount: %d, currentCountAfterSignal: %d', awakeCount, previousCount, semaphore.currentCount));
            if (awakeCount > 0) {
                return Promise.resolve(0);
            }
            else {
                return 0;
            }
        });
        this.sceKernelPollSema = createNativeFunction(0x58B1F937, 150, 'int', 'Thread/int/int', this, function (currentThread, id, signal) {
            var semaphore = _this.semaporesUid.get(id);
            if (signal <= 0)
                return 2147615165 /* ERROR_KERNEL_ILLEGAL_COUNT */;
            if (signal > semaphore.currentCount)
                return 2147615149 /* ERROR_KERNEL_SEMA_ZERO */;
            semaphore.incrementCount(-signal);
            return 0;
        });
    }
    ThreadManForUser.prototype._sceKernelWaitSemaCB = function (currentThread, id, signal, timeout, acceptCallbacks) {
        //console.warn(sprintf('Not implemented ThreadManForUser._sceKernelWaitSemaCB(%d, %d) :: Thread("%s")', id, signal, currentThread.name));
        if (!this.semaporesUid.has(id))
            return 2147615129 /* ERROR_KERNEL_NOT_FOUND_SEMAPHORE */;
        var semaphore = this.semaporesUid.get(id);
        var promise = semaphore.waitAsync(currentThread, signal);
        if (promise) {
            return new WaitingThreadInfo('sceKernelWaitSema', semaphore, promise, acceptCallbacks);
        }
        else {
            return 0;
        }
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
var SceKernelSemaInfo = (function () {
    function SceKernelSemaInfo() {
    }
    SceKernelSemaInfo.struct = StructClass.create(SceKernelSemaInfo, [
        { size: Int32 },
        { name: Stringz(32) },
        { attributes: Int32 },
        { initialCount: Int32 },
        { currentCount: Int32 },
        { maximumCount: Int32 },
        { numberOfWaitingThreads: Int32 },
    ]);
    return SceKernelSemaInfo;
})();
var WaitingSemaphoreThread = (function () {
    function WaitingSemaphoreThread(expectedCount, wakeUp) {
        this.expectedCount = expectedCount;
        this.wakeUp = wakeUp;
    }
    return WaitingSemaphoreThread;
})();
var Semaphore = (function () {
    function Semaphore(name, attributes, initialCount, maximumCount) {
        this.name = name;
        this.attributes = attributes;
        this.initialCount = initialCount;
        this.maximumCount = maximumCount;
        this.waitingSemaphoreThreadList = new SortedSet();
        this.currentCount = initialCount;
    }
    Object.defineProperty(Semaphore.prototype, "numberOfWaitingThreads", {
        get: function () {
            return this.waitingSemaphoreThreadList.length;
        },
        enumerable: true,
        configurable: true
    });
    Semaphore.prototype.incrementCount = function (count) {
        this.currentCount = Math.min(this.currentCount + count, this.maximumCount);
        return this.updatedCount();
    };
    Semaphore.prototype.cancel = function () {
        this.waitingSemaphoreThreadList.forEach(function (item) {
            item.wakeUp();
        });
    };
    Semaphore.prototype.updatedCount = function () {
        var _this = this;
        var awakeCount = 0;
        this.waitingSemaphoreThreadList.forEach(function (item) {
            if (_this.currentCount >= item.expectedCount) {
                //console.info(sprintf('Semaphore.updatedCount: %d, %d -> %d', this.currentCount, item.expectedCount, this.currentCount - item.expectedCount));
                _this.currentCount -= item.expectedCount;
                item.wakeUp();
                awakeCount++;
            }
        });
        return awakeCount;
    };
    Semaphore.prototype.waitAsync = function (thread, expectedCount) {
        var _this = this;
        if (this.currentCount >= expectedCount) {
            this.currentCount -= expectedCount;
            return null;
        }
        else {
            var promise = new Promise(function (resolve, reject) {
                var waitingSemaphoreThread = new WaitingSemaphoreThread(expectedCount, function () {
                    //console.info(sprintf('Semaphore.waitAsync() -> wakeup thread : "%s"', thread.name));
                    _this.waitingSemaphoreThreadList.delete(waitingSemaphoreThread);
                    resolve();
                });
                _this.waitingSemaphoreThreadList.add(waitingSemaphoreThread);
            });
            this.updatedCount();
            return promise;
        }
    };
    Semaphore.prototype.delete = function () {
    };
    return Semaphore;
})();
var SemaphoreAttribute;
(function (SemaphoreAttribute) {
    SemaphoreAttribute[SemaphoreAttribute["FirstInFirstOut"] = 0x000] = "FirstInFirstOut";
    SemaphoreAttribute[SemaphoreAttribute["Priority"] = 0x100] = "Priority";
})(SemaphoreAttribute || (SemaphoreAttribute = {}));
//# sourceMappingURL=ThreadManForUser_sema.js.map