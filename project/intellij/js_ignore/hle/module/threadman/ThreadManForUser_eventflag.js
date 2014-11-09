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
        this.eventFlagUids = new UidCollection(1);
        this.sceKernelCreateEventFlag = createNativeFunction(0x55C20A00, 150, 'uint', 'string/int/int/void*', this, function (name, attributes, bitPattern, optionsPtr) {
            if (name === null)
                return 2147614721 /* ERROR_ERROR */;
            if ((attributes & 0x100) != 0 || attributes >= 0x300)
                return 2147615121 /* ERROR_KERNEL_ILLEGAL_ATTR */;
            //console.warn(sprintf('Not implemented ThreadManForUser.sceKernelCreateEventFlag("%s", %d, %08X)', name, attributes, bitPattern));
            var eventFlag = new EventFlag();
            eventFlag.name = name;
            eventFlag.attributes = attributes;
            eventFlag.initialPattern = bitPattern;
            eventFlag.currentPattern = bitPattern;
            return _this.eventFlagUids.allocate(eventFlag);
        });
        this.sceKernelSetEventFlag = createNativeFunction(0x1FB15A32, 150, 'uint', 'int/uint', this, function (id, bitPattern) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).setBits(bitPattern);
            return 0;
        });
        this.sceKernelWaitEventFlag = createNativeFunction(0x402FCF22, 150, 'uint', 'int/uint/int/void*/void*', this, function (id, bits, waitType, outBits, timeout) {
            return _this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, 0 /* NO */);
        });
        this.sceKernelWaitEventFlagCB = createNativeFunction(0x328C546A, 150, 'uint', 'int/uint/int/void*/void*', this, function (id, bits, waitType, outBits, timeout) {
            return _this._sceKernelWaitEventFlagCB(id, bits, waitType, outBits, timeout, 1 /* YES */);
        });
        this.sceKernelPollEventFlag = createNativeFunction(0x30FD48F0, 150, 'uint', 'int/uint/int/void*', this, function (id, bits, waitType, outBits) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            if ((waitType & ~EventFlagWaitTypeSet.MaskValidBits) != 0)
                return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
            if ((waitType & (32 /* Clear */ | 16 /* ClearAll */)) == (32 /* Clear */ | 16 /* ClearAll */)) {
                return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
            }
            if (bits == 0)
                return 2147615153 /* ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN */;
            if (EventFlag == null)
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            var matched = _this.eventFlagUids.get(id).poll(bits, waitType, outBits);
            return matched ? 0 : 2147615151 /* ERROR_KERNEL_EVENT_FLAG_POLL_FAILED */;
        });
        this.sceKernelDeleteEventFlag = createNativeFunction(0xEF9E4C70, 150, 'uint', 'int', this, function (id) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.remove(id);
            return 0;
        });
        this.sceKernelClearEventFlag = createNativeFunction(0x812346E4, 150, 'uint', 'int/uint', this, function (id, bitsToClear) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).clearBits(bitsToClear);
            return 0;
        });
        this.sceKernelCancelEventFlag = createNativeFunction(0xCD203292, 150, 'uint', 'int/uint/void*', this, function (id, newPattern, numWaitThreadPtr) {
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            _this.eventFlagUids.get(id).cancel(newPattern);
            return 0;
        });
        this.sceKernelReferEventFlagStatus = createNativeFunction(0xA66B0120, 150, 'uint', 'int/void*', this, function (id, infoPtr) {
            var size = infoPtr.readUInt32();
            if (size == 0)
                return 0;
            infoPtr.position = 0;
            if (!_this.eventFlagUids.has(id))
                return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
            var eventFlag = _this.eventFlagUids.get(id);
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
    }
    ThreadManForUser.prototype._sceKernelWaitEventFlagCB = function (id, bits, waitType, outBits, timeout, acceptCallbacks) {
        if (!this.eventFlagUids.has(id))
            return 2147615130 /* ERROR_KERNEL_NOT_FOUND_EVENT_FLAG */;
        var eventFlag = this.eventFlagUids.get(id);
        if ((waitType & ~(EventFlagWaitTypeSet.MaskValidBits)) != 0)
            return 2147615125 /* ERROR_KERNEL_ILLEGAL_MODE */;
        if (bits == 0)
            return 2147615153 /* ERROR_KERNEL_EVENT_FLAG_ILLEGAL_WAIT_PATTERN */;
        var timedOut = false;
        var previousPattern = eventFlag.currentPattern;
        return new WaitingThreadInfo('_sceKernelWaitEventFlagCB', eventFlag, eventFlag.waitAsync(bits, waitType, outBits, timeout, acceptCallbacks).then(function () {
            if (outBits != null)
                outBits.writeUInt32(previousPattern);
            return 0;
        }), acceptCallbacks);
    };
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
var EventFlagWaitingThread = (function () {
    function EventFlagWaitingThread(bitsToMatch, waitType, outBits, eventFlag, wakeUp) {
        this.bitsToMatch = bitsToMatch;
        this.waitType = waitType;
        this.outBits = outBits;
        this.eventFlag = eventFlag;
        this.wakeUp = wakeUp;
    }
    return EventFlagWaitingThread;
})();
var EventFlag = (function () {
    function EventFlag() {
        this.waitingThreads = new SortedSet();
    }
    EventFlag.prototype.waitAsync = function (bits, waitType, outBits, timeout, callbacks) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var waitingSemaphoreThread = new EventFlagWaitingThread(bits, waitType, outBits, _this, function () {
                _this.waitingThreads.delete(waitingSemaphoreThread);
                resolve();
                throw (new CpuBreakException());
            });
            _this.waitingThreads.add(waitingSemaphoreThread);
        }).then(function () { return 0; });
    };
    EventFlag.prototype.poll = function (bitsToMatch, waitType, outBits) {
        if (outBits != null)
            outBits.writeInt32(this.currentPattern);
        if ((waitType & 1 /* Or */) ? ((this.currentPattern & bitsToMatch) != 0) : ((this.currentPattern & bitsToMatch) == bitsToMatch)) {
            this._doClear(bitsToMatch, waitType);
            return true;
        }
        return false;
    };
    EventFlag.prototype._doClear = function (bitsToMatch, waitType) {
        if (waitType & (16 /* ClearAll */))
            this.clearBits(~0xFFFFFFFF, false);
        if (waitType & (32 /* Clear */))
            this.clearBits(~bitsToMatch, false);
    };
    EventFlag.prototype.cancel = function (newPattern) {
        this.waitingThreads.forEach(function (item) {
            item.wakeUp();
        });
    };
    EventFlag.prototype.clearBits = function (bitsToClear, doUpdateWaitingThreads) {
        if (doUpdateWaitingThreads === void 0) { doUpdateWaitingThreads = true; }
        this.currentPattern &= bitsToClear;
        if (doUpdateWaitingThreads)
            this.updateWaitingThreads();
    };
    EventFlag.prototype.setBits = function (bits, doUpdateWaitingThreads) {
        if (doUpdateWaitingThreads === void 0) { doUpdateWaitingThreads = true; }
        this.currentPattern |= bits;
        if (doUpdateWaitingThreads)
            this.updateWaitingThreads();
    };
    EventFlag.prototype.updateWaitingThreads = function () {
        var _this = this;
        this.waitingThreads.forEach(function (waitingThread) {
            if (_this.poll(waitingThread.bitsToMatch, waitingThread.waitType, waitingThread.outBits)) {
                waitingThread.wakeUp();
            }
        });
    };
    return EventFlag;
})();
var EventFlagInfo = (function () {
    function EventFlagInfo() {
    }
    EventFlagInfo.struct = StructClass.create(EventFlagInfo, [
        { size: Int32 },
        { name: Stringz(32) },
        { attributes: Int32 },
        { initialPattern: UInt32 },
        { currentPattern: UInt32 },
        { numberOfWaitingThreads: Int32 },
    ]);
    return EventFlagInfo;
})();
var EventFlagWaitTypeSet;
(function (EventFlagWaitTypeSet) {
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["And"] = 0x00] = "And";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["Or"] = 0x01] = "Or";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["ClearAll"] = 0x10] = "ClearAll";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["Clear"] = 0x20] = "Clear";
    EventFlagWaitTypeSet[EventFlagWaitTypeSet["MaskValidBits"] = EventFlagWaitTypeSet.Or | EventFlagWaitTypeSet.Clear | EventFlagWaitTypeSet.ClearAll] = "MaskValidBits";
})(EventFlagWaitTypeSet || (EventFlagWaitTypeSet = {}));
//# sourceMappingURL=ThreadManForUser_eventflag.js.map