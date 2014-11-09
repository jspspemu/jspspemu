///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _context = require('../../context');
var _manager = require('../manager');
var createNativeFunction = _utils.createNativeFunction;
var sceNetAdhocctl = (function () {
    function sceNetAdhocctl(context) {
        var _this = this;
        this.context = context;
        this.currentState = 0 /* Disconnected */;
        this.currentName = "noname";
        /** Initialise the Adhoc control library */
        this.sceNetAdhocctlInit = createNativeFunction(0xE26F226E, 150, 'int', 'int/int/void*', this, function (stacksize, priority, product) {
            _this.currentState = 0 /* Disconnected */;
            return 0;
        });
        /** Terminate the Adhoc control library */
        this.sceNetAdhocctlTerm = createNativeFunction(0x9D689E13, 150, 'int', '', this, function () {
            return 0;
        });
        this.connectHandlers = [];
        /** Connect to the Adhoc control */
        this.sceNetAdhocctlConnect = createNativeFunction(0x0AD043ED, 150, 'int', 'string', this, function (name) {
            _this.currentName = name;
            _this.connectHandlers.push(_this.context.netManager.onopen.add(function () {
                _this.currentState = 1 /* Connected */;
                _this._notifyAdhocctlHandler(1 /* Connected */);
            }));
            _this.connectHandlers.push(_this.context.netManager.onclose.add(function () {
                _this.currentState = 0 /* Disconnected */;
                _this._notifyAdhocctlHandler(2 /* Disconnected */);
            }));
            if (_this.context.netManager.connected) {
                _this.currentState = 1 /* Connected */;
                _this._notifyAdhocctlHandler(1 /* Connected */);
            }
            _this.context.netManager.connectOnce();
            return 0;
        });
        /** Disconnect from the Adhoc control */
        this.sceNetAdhocctlDisconnect = createNativeFunction(0x34401D65, 150, 'int', '', this, function () {
            while (_this.connectHandlers.length)
                _this.connectHandlers.shift().cancel();
            return 0;
        });
        this.handlers = new UidCollection(1);
        this.sceNetAdhocctlAddHandler = createNativeFunction(0x20B317A0, 150, 'int', 'int/int', this, function (callback, parameter) {
            return _this.handlers.allocate(new HandlerCallback(callback, parameter));
        });
        this.sceNetAdhocctlDelHandler = createNativeFunction(0x6402490B, 150, 'int', 'int', this, function (handler) {
            _this.handlers.remove(handler);
            return 0;
        });
        this.sceNetAdhocctlGetState = createNativeFunction(0x75ECD386, 150, 'int', 'void*', this, function (stateOut) {
            stateOut.writeInt32(_this.currentState);
            return 0;
        });
    }
    sceNetAdhocctl.prototype._notifyAdhocctlHandler = function (event, error) {
        var _this = this;
        if (error === void 0) { error = 0; }
        this.handlers.list().forEach(function (callback) {
            _this.context.callbackManager.executeLater(callback.callback, [event, error, callback.argument]);
            //this.context.interop.execute(this.context.threadManager.current.state, callback.callback, [event, error, callback.argument]);
        });
    };
    return sceNetAdhocctl;
})();
exports.sceNetAdhocctl = sceNetAdhocctl;
var HandlerCallback = (function () {
    function HandlerCallback(callback, argument) {
        this.callback = callback;
        this.argument = argument;
    }
    return HandlerCallback;
})();
var State;
(function (State) {
    State[State["Disconnected"] = 0] = "Disconnected";
    State[State["Connected"] = 1] = "Connected";
    State[State["Scan"] = 2] = "Scan";
    State[State["Game"] = 3] = "Game";
    State[State["Discover"] = 4] = "Discover";
    State[State["Wol"] = 5] = "Wol";
})(State || (State = {}));
var Mode;
(function (Mode) {
    Mode[Mode["Normal"] = 0] = "Normal";
    Mode[Mode["GameMode"] = 1] = "GameMode";
    Mode[Mode["None"] = -1] = "None";
})(Mode || (Mode = {}));
var Event;
(function (Event) {
    Event[Event["Error"] = 0] = "Error";
    Event[Event["Connected"] = 1] = "Connected";
    Event[Event["Disconnected"] = 2] = "Disconnected";
    Event[Event["Scan"] = 3] = "Scan";
    Event[Event["Game"] = 4] = "Game";
    Event[Event["Discover"] = 5] = "Discover";
    Event[Event["Wol"] = 6] = "Wol";
    Event[Event["WolInterrupted"] = 7] = "WolInterrupted";
})(Event || (Event = {}));
var NICK_NAME_LENGTH = 128;
var GROUP_NAME_LENGTH = 8;
var IBSS_NAME_LENGTH = 6;
var ADHOC_ID_LENGTH = 9;
var MAX_GAME_MODE_MACS = 16;
//# sourceMappingURL=sceNetAdhocctl.js.map