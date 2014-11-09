///<reference path="../../global.d.ts" />
var _thread = require('./thread');
var _interop = require('./interop');
var _cpu = require('../../core/cpu');
var CallbackManager = (function () {
    function CallbackManager(interop) {
        this.interop = interop;
        this.uids = new UidCollection(1);
        this.notifications = [];
        this.onAdded = new Signal();
        this.normalCallbacks = [];
    }
    Object.defineProperty(CallbackManager.prototype, "hasPendingCallbacks", {
        get: function () {
            return this.notifications.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    CallbackManager.prototype.register = function (callback) {
        return this.uids.allocate(callback);
    };
    CallbackManager.prototype.remove = function (id) {
        return this.uids.remove(id);
    };
    CallbackManager.prototype.get = function (id) {
        return this.uids.get(id);
    };
    CallbackManager.prototype.executeLater = function (callback, args) {
        this.normalCallbacks.push({ callback: callback, args: args });
    };
    CallbackManager.prototype.notify = function (id, arg2) {
        var callback = this.get(id);
        //if (!callback) throw(new Error("Can't find callback by id '" + id + "'"));
        this.notifications.push(new CallbackNotification(callback, arg2));
        this.onAdded.dispatch(this.notifications.length);
    };
    CallbackManager.prototype.executeLaterPendingWithinThread = function (thread) {
        var state = thread.state;
        while (this.normalCallbacks.length > 0) {
            var normalCallback = this.normalCallbacks.shift();
            this.interop.execute(state, normalCallback.callback, normalCallback.args);
        }
    };
    CallbackManager.prototype.executePendingWithinThread = function (thread) {
        var state = thread.state;
        var count = 0;
        this.executeLaterPendingWithinThread(thread);
        while (this.notifications.length > 0) {
            var notification = this.notifications.shift();
            this.interop.execute(state, notification.callback.funcptr, [1, notification.arg2, notification.callback.argument]);
            count++;
        }
        return (count > 0);
    };
    return CallbackManager;
})();
exports.CallbackManager = CallbackManager;
var CallbackNotification = (function () {
    function CallbackNotification(callback, arg2) {
        this.callback = callback;
        this.arg2 = arg2;
    }
    return CallbackNotification;
})();
exports.CallbackNotification = CallbackNotification;
var Callback = (function () {
    function Callback(name, funcptr, argument) {
        this.name = name;
        this.funcptr = funcptr;
        this.argument = argument;
        this.count = 0;
    }
    return Callback;
})();
exports.Callback = Callback;
//# sourceMappingURL=callback.js.map