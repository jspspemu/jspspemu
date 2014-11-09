///<reference path="../../global.d.ts" />
var NetManager = (function () {
    function NetManager() {
        this.connected = false;
        this.ws = null;
        this._onmessageSignals = {};
        this.onopen = new Signal();
        this.onclose = new Signal();
        this.mac = new Uint8Array(6);
    }
    NetManager.prototype.onmessage = function (port) {
        if (!this._onmessageSignals[port])
            this._onmessageSignals[port] = new Signal();
        return this._onmessageSignals[port];
    };
    NetManager.prototype.connectOnce = function () {
        var _this = this;
        if (this.ws)
            return;
        this.ws = new WebSocket('ws://' + location.host + '/adhoc', 'adhoc');
        this.ws.onopen = function (e) {
        };
        this.ws.onclose = function (e) {
            _this.connected = false;
            _this.onclose.dispatch();
            setTimeout(function () {
                _this.ws = null;
                _this.connectOnce();
            }, 5000);
        };
        this.ws.onmessage = function (e) {
            var info = JSON.parse(e.data);
            if (info.from == 'ff:ff:ff:ff:ff:ff') {
                console.info('NetManager: from_server:', info);
                switch (info.type) {
                    case 'setid':
                        _this.mac = string2mac(info.payload);
                        _this.connected = true;
                        _this.onopen.dispatch();
                        break;
                }
            }
            else {
                var packet = {
                    port: info.port,
                    type: info.type,
                    mac: string2mac(info.from),
                    payload: Stream.fromBase64(info.payload).toUInt8Array(),
                };
                //console.info('NetManager: from_user:', { port: info.port, type: info.type, mac: info.from, payload: Stream.fromBase64(info.payload).toStringAll() });
                _this.onmessage(info.port).dispatch(packet);
            }
        };
        this.ws.onerror = function (e) {
            _this.connected = false;
            console.error(e);
            setTimeout(function () {
                _this.connectOnce();
                _this.ws = null;
            }, 10000);
        };
    };
    NetManager.prototype.send = function (port, type, toMac, data) {
        this.connectOnce();
        //console.info('NetManager: send:', { type: type, port: port, to: mac2string(toMac), payload: Stream.fromUint8Array(data).toStringAll() });
        this.ws.send(JSON.stringify({ type: type, port: port, to: mac2string(toMac), payload: Stream.fromUint8Array(data).toBase64() }));
    };
    return NetManager;
})();
exports.NetManager = NetManager;
//# sourceMappingURL=net.js.map