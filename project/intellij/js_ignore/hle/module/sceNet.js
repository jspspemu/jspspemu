///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceNet = (function () {
    function sceNet(context) {
        var _this = this;
        this.context = context;
        this.sceNetInit = createNativeFunction(0x39AF39A6, 150, 'int', 'int/int/int/int/int', this, function (memoryPoolSize, calloutprio, calloutstack, netintrprio, netintrstack) {
            _this.context.container['mac'] = new Uint8Array(xrange(0, 6).map(function (index) { return Math.random() * 255; }));
            return 0;
        });
        this.sceNetTerm = createNativeFunction(0x281928A9, 150, 'int', '', this, function () {
            return 0;
        });
        this.sceNetFreeThreadinfo = createNativeFunction(0x50647530, 150, 'int', 'int', this, function (threadId) {
            throw (new Error("Not implemented"));
            return -1;
        });
        this.sceNetThreadAbort = createNativeFunction(0xAD6844c6, 150, 'int', 'int', this, function (threadId) {
            throw (new Error("Not implemented"));
            return -1;
        });
        /** Convert string to a Mac address **/
        this.sceNetEtherStrton = createNativeFunction(0xD27961C9, 150, 'int', 'string/byte[6]', this, function (string, mac) {
            mac.set(string2mac(string));
            return 0;
        });
        /** Convert Mac address to a string **/
        this.sceNetEtherNtostr = createNativeFunction(0x89360950, 150, 'int', 'byte[6]/void*', this, function (mac, outputAddress) {
            outputAddress.writeStringz(mac2string(mac));
            return 0;
        });
        /** Retrieve the local Mac address **/
        this.sceNetGetLocalEtherAddr = createNativeFunction(0x0BF0A3AE, 150, 'int', 'byte[6]', this, function (macOut) {
            console.info("sceNetGetLocalEtherAddr: ", mac2string(_this.context.netManager.mac));
            macOut.set(_this.context.netManager.mac);
            return 0;
        });
        this.sceNetGetMallocStat = createNativeFunction(0xCC393E48, 150, 'int', 'void*', this, function (statPtr) {
            throw (new Error("Not implemented"));
            return -1;
        });
    }
    return sceNet;
})();
exports.sceNet = sceNet;
//# sourceMappingURL=sceNet.js.map