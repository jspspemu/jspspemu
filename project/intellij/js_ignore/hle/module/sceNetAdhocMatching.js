///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _context = require('../../context');
var _manager = require('../manager');
_manager.Thread;
var createNativeFunction = _utils.createNativeFunction;
var sceNetAdhocMatching = (function () {
    function sceNetAdhocMatching(context) {
        var _this = this;
        this.context = context;
        this.poolStat = { size: 0, maxsize: 0, freesize: 0 };
        /** Initialise the Adhoc matching library */
        this.sceNetAdhocMatchingInit = createNativeFunction(0x2A2A1E07, 150, 'int', 'int', this, function (memSize) {
            //stateOut.writeInt32(this.currentState);
            _this.poolStat.size = memSize;
            _this.poolStat.maxsize = memSize;
            _this.poolStat.freesize = memSize;
            return 0;
        });
        /** Terminate the Adhoc matching library */
        this.sceNetAdhocMatchingTerm = createNativeFunction(0x7945ECDA, 150, 'int', '', this, function () {
            return 0;
        });
        this.matchings = new UidCollection(1);
        /** Create an Adhoc matching object */
        this.sceNetAdhocMatchingCreate = createNativeFunction(0xCA5EDA6F, 150, 'int', 'Thread/int/int/int/int/int/int/int/int/uint', this, function (thread, mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDelay, callback) {
            var matching = new Matching(_this.context, thread, mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDelay, callback);
            matching.id = _this.matchings.allocate(matching);
            return matching.id;
        });
        /** Select a matching target */
        this.sceNetAdhocMatchingSelectTarget = createNativeFunction(0x5E3D4B79, 150, 'int', 'int/void*/int/void*', this, function (matchingId, macStream, dataLength, dataPointer) {
            var matching = _this.matchings.get(matchingId);
            var mac = macStream.readBytes(6);
            matching.selectTarget(mac, (dataPointer && dataLength) ? dataPointer.readBytes(dataLength) : null);
            return 0;
        });
        this.sceNetAdhocMatchingCancelTarget = createNativeFunction(0xEA3C6108, 150, 'int', 'int/void*', this, function (matchingId, mac) {
            var matching = _this.matchings.get(matchingId);
            matching.cancelTarget(mac.readBytes(6));
            return 0;
        });
        /** Delete an Adhoc matching object */
        this.sceNetAdhocMatchingDelete = createNativeFunction(0xF16EAF4F, 150, 'int', 'int', this, function (matchingId) {
            _this.matchings.remove(matchingId);
            return 0;
        });
        /** Start a matching object */
        this.sceNetAdhocMatchingStart = createNativeFunction(0x93EF3843, 150, 'int', 'int/int/int/int/int/int/void*', this, function (matchingId, evthPri, evthStack, inthPri, inthStack, optLen, optData) {
            //throw (new Error("sceNetAdhocMatchingStart"));
            var matching = _this.matchings.get(matchingId);
            matching.hello = optData.readBytes(optLen);
            matching.start();
            return 0;
        });
        /** Stop a matching object */
        this.sceNetAdhocMatchingStop = createNativeFunction(0x32B156B3, 150, 'int', 'int', this, function (matchingId) {
            var matching = _this.matchings.get(matchingId);
            matching.stop();
            return 0;
        });
    }
    return sceNetAdhocMatching;
})();
exports.sceNetAdhocMatching = sceNetAdhocMatching;
(function (State) {
    State[State["START"] = 0] = "START";
    State[State["JOIN_WAIT_RESPONSE"] = 1] = "JOIN_WAIT_RESPONSE";
    State[State["JOIN_WAIT_COMPLETE"] = 2] = "JOIN_WAIT_COMPLETE";
    State[State["COMPLETED"] = 3] = "COMPLETED";
})(exports.State || (exports.State = {}));
var State = exports.State;
var Matching = (function () {
    function Matching(context, thread, mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDelay, callback) {
        this.context = context;
        this.thread = thread;
        this.mode = mode;
        this.maxPeers = maxPeers;
        this.port = port;
        this.bufSize = bufSize;
        this.helloDelay = helloDelay;
        this.pingDelay = pingDelay;
        this.initCount = initCount;
        this.msgDelay = msgDelay;
        this.callback = callback;
        this.id = 0;
        this.joinMac = '00:00:00:00:00:00';
        this.mac = new Uint8Array([1, 2, 3, 4, 5, 6]);
        this.hello = new Uint8Array(0);
        this.helloTimer = -1;
        this.dataTimer = -1;
        this.onMessageCancelable = null;
        this.state = 0 /* START */;
        this.messageQueue = [];
    }
    Matching.prototype.sendHello = function () {
        if (this.state != 0 /* START */)
            return;
        this.sendMessage(1 /* Hello */, Matching.MAC_ALL, this.hello);
    };
    Matching.prototype.start = function () {
        var _this = this;
        this.onMessageCancelable = this.context.netManager.onmessage(this.port).add(function (packet) {
            _this.notify(Event[packet.type], packet.mac, packet.payload);
        });
        this.helloTimer = setInterval(function () {
            _this.sendHello();
        }, this.helloDelay / 1000);
        this.sendHello();
        this.dataTimer = setInterval(function () {
        }, this.msgDelay / 1000);
    };
    Matching.prototype.stop = function () {
        clearInterval(this.helloTimer);
        clearInterval(this.dataTimer);
        if (this.onMessageCancelable) {
            this.onMessageCancelable.cancel();
            this.onMessageCancelable = null;
        }
    };
    Matching.prototype.selectTarget = function (mac, data) {
        var macstr = mac2string(mac);
        console.info("net.adhoc: selectTarget", macstr);
        // Accept
        if ((this.state == 1 /* JOIN_WAIT_RESPONSE */) && (macstr == this.joinMac)) {
            this.state = 2 /* JOIN_WAIT_COMPLETE */;
            this.sendMessage(6 /* Accept */, mac, data);
        }
        else {
            this.state = 1 /* JOIN_WAIT_RESPONSE */;
            this.sendMessage(2 /* Join */, mac, data);
        }
    };
    Matching.prototype.cancelTarget = function (mac) {
        // Cancel
        var macstr = mac2string(mac);
        console.info("net.adhoc: cancelTarget", macstr);
        this.state = 0 /* START */;
        this.sendMessage(5 /* Cancel */, mac, null);
    };
    Matching.prototype.sendMessage = function (event, tomac, data) {
        //this.messageQueue.push({ event: event, tomac: ArrayBufferUtils.cloneBytes(tomac), data: ArrayBufferUtils.cloneBytes(data) });
        if (!data)
            data = new Uint8Array(0);
        if (event != 1 /* Hello */) {
            console.info("net.adhoc: send ->", Event[event], event, ':', mac2string(tomac), ':', Stream.fromUint8Array(data).readString(data.length));
        }
        this.context.netManager.send(this.port, Event[event], tomac, data);
    };
    Matching.prototype.notify = function (event, frommac, data) {
        if (!data)
            data = new Uint8Array(0);
        if (event != 1 /* Hello */) {
            console.info("net.adhoc: received <-", Event[event], event, ':', mac2string(frommac), ':', Stream.fromUint8Array(data).readString(data.length));
        }
        switch (event) {
            case 2 /* Join */:
                this.state = 1 /* JOIN_WAIT_RESPONSE */;
                this.joinMac = mac2string(frommac);
                break;
        }
        var macPartition = this.context.memoryManager.kernelPartition.allocateLow(8, 'Matching.mac');
        this.context.memory.memset(macPartition.low, 0, macPartition.size);
        this.context.memory.writeUint8Array(macPartition.low, frommac);
        var dataPartition = this.context.memoryManager.kernelPartition.allocateLow(Math.max(8, MathUtils.nextAligned(data.length, 8)), 'Matching.data');
        this.context.memory.memset(dataPartition.low, 0, dataPartition.size);
        this.context.memory.writeUint8Array(dataPartition.low, data);
        //// @TODO: Enqueue callback instead of executing now?
        this.context.callbackManager.executeLater(this.callback, [
            this.id,
            event,
            macPartition.low,
            data.length,
            data.length ? dataPartition.low : 0
        ]);
        //this.context.interop.execute(this.thread.state, this.callback, [
        //	this.id, event, macPartition.low, data.length, data.length ? dataPartition.low : 0
        //]);
        dataPartition.deallocate();
        macPartition.deallocate();
        switch (event) {
            case 6 /* Accept */:
                this.sendMessage(7 /* Complete */, frommac, data);
                this.state = 2 /* JOIN_WAIT_COMPLETE */;
                break;
            case 7 /* Complete */:
                if (this.state == 2 /* JOIN_WAIT_COMPLETE */) {
                    this.sendMessage(7 /* Complete */, frommac, data);
                    this.state = 3 /* COMPLETED */;
                }
                break;
            case 11 /* Data */:
                this.sendMessage(12 /* DataConfirm */, frommac, null);
                break;
            case 10 /* Disconnect */:
            case 3 /* Left */:
                this.state = 0 /* START */;
                break;
        }
    };
    Matching.MAC_ALL = new Uint8Array([0, 0, 0, 0, 0, 0]);
    return Matching;
})();
exports.Matching = Matching;
(function (Event) {
    Event[Event["Hello"] = 1] = "Hello";
    Event[Event["Join"] = 2] = "Join";
    Event[Event["Left"] = 3] = "Left";
    Event[Event["Reject"] = 4] = "Reject";
    Event[Event["Cancel"] = 5] = "Cancel";
    Event[Event["Accept"] = 6] = "Accept";
    Event[Event["Complete"] = 7] = "Complete";
    Event[Event["Timeout"] = 8] = "Timeout";
    Event[Event["Error"] = 9] = "Error";
    Event[Event["Disconnect"] = 10] = "Disconnect";
    Event[Event["Data"] = 11] = "Data";
    Event[Event["DataConfirm"] = 12] = "DataConfirm";
    Event[Event["DataTimeout"] = 13] = "DataTimeout";
})(exports.Event || (exports.Event = {}));
var Event = exports.Event;
(function (Mode) {
    Mode[Mode["Host"] = 1] = "Host";
    Mode[Mode["Client"] = 2] = "Client";
    Mode[Mode["Ptp"] = 3] = "Ptp";
})(exports.Mode || (exports.Mode = {}));
var Mode = exports.Mode;
//# sourceMappingURL=sceNetAdhocMatching.js.map