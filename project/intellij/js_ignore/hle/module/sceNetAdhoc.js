///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _context = require('../../context');
var _manager = require('../manager');
var createNativeFunction = _utils.createNativeFunction;
var sceNetAdhoc = (function () {
    function sceNetAdhoc(context) {
        var _this = this;
        this.context = context;
        /** Initialise the adhoc library. */
        this.sceNetAdhocInit = createNativeFunction(0xE1D621D7, 150, 'int', '', this, function () {
            _this.partition = _this.context.memoryManager.kernelPartition.allocateLow(0x4000);
            return 0;
        });
        /** Terminate the adhoc library */
        this.sceNetAdhocTerm = createNativeFunction(0xA62C6F57, 150, 'int', '', this, function () {
            _this.partition.deallocate();
            return 0;
        });
        /** */
        this.sceNetAdhocPollSocket = createNativeFunction(0x7A662D6B, 150, 'int', 'int/int/int/int', this, function (socketAddress, int, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPollSocket"));
            return -1;
        });
        this.pdps = new UidCollection(1);
        /** Create a PDP object. */
        this.sceNetAdhocPdpCreate = createNativeFunction(0x6F92741B, 150, 'int', 'byte[6]/int/uint/int', this, function (mac, port, bufsize, unk1) {
            var pdp = new Pdp(_this.context, mac, port, bufsize);
            pdp.id = _this.pdps.allocate(pdp);
            return pdp.id;
        });
        /** Delete a PDP object. */
        this.sceNetAdhocPdpDelete = createNativeFunction(0x7F27BB5E, 150, 'int', 'int/int', this, function (pdpId, unk1) {
            var pdp = _this.pdps.get(pdpId);
            pdp.dispose();
            _this.pdps.remove(pdpId);
            return 0;
        });
        /** Send a PDP packet to a destination. */
        this.sceNetAdhocPdpSend = createNativeFunction(0xABED3790, 150, 'int', 'int/byte[6]/int/byte[]/int/int', this, function (pdpId, destMac, port, dataStream, timeout, nonblock) {
            //debugger;
            var pdp = _this.pdps.get(pdpId);
            var data = dataStream.readBytes(dataStream.length);
            pdp.send(port, destMac, data);
            return 0;
        });
        /** Receive a PDP packet */
        this.sceNetAdhocPdpRecv = createNativeFunction(0xDFE53E03, 150, 'int', 'int/byte[6]/void*/void*/void*/void*/int', this, function (pdpId, srcMac, portPtr, data, dataLengthPtr, timeout, nonblock) {
            var block = !nonblock;
            var pdp = _this.pdps.get(pdpId);
            var recvOne = function (chunk) {
                srcMac.set(chunk.mac);
                data.writeBytes(chunk.payload);
                portPtr.writeInt16(pdp.port);
                dataLengthPtr.writeInt32(chunk.payload.length);
                return 0;
            };
            // block
            if (block) {
                return pdp.recvOneAsync().then(recvOne);
            }
            else {
                if (pdp.chunks.length <= 0)
                    return 0x80410709; // ERROR_NET_ADHOC_NO_DATA_AVAILABLE
                return recvOne(pdp.chunks.shift());
            }
        });
        /** Get the status of all PDP objects */
        this.sceNetAdhocGetPdpStat = createNativeFunction(0xC7C1FC57, 150, 'int', 'void*/void*', this, function (sizeStream, pdpStatStruct) {
            var maxSize = sizeStream.sliceWithLength(0).readInt32();
            var pdps = _this.pdps.list();
            var totalSize = pdps.length * PdpStatStruct.struct.length;
            sizeStream.sliceWithLength(0).writeInt32(totalSize);
            //var outStream = this.context.memory.getPointerStream(this.partition.low, this.partition.size);
            var pos = 0;
            pdps.forEach(function (pdp) {
                var stat = new PdpStatStruct();
                stat.nextPointer = 0;
                stat.pdpId = pdp.id;
                stat.port = pdp.port;
                stat.mac = xrange(0, 6).map(function (index) { return pdp.mac[index]; });
                stat.rcvdData = pdp.getDataLength();
                //console.log("sceNetAdhocGetPdpStat:", stat);
                PdpStatStruct.struct.write(pdpStatStruct, stat);
            });
            return 0;
        });
        /** Create own game object type data. */
        this.sceNetAdhocGameModeCreateMaster = createNativeFunction(0x7F75C338, 150, 'int', 'byte[]', this, function (data) {
            throw (new Error("Not implemented sceNetAdhocGameModeCreateMaster"));
            return -1;
        });
        /** Create peer game object type data. */
        this.sceNetAdhocGameModeCreateReplica = createNativeFunction(0x3278AB0C, 150, 'int', 'byte[6]/byte[]', this, function (mac, data) {
            throw (new Error("Not implemented sceNetAdhocGameModeCreateReplica"));
            return -1;
        });
        /** Update own game object type data. */
        this.sceNetAdhocGameModeUpdateMaster = createNativeFunction(0x98C204C8, 150, 'int', '', this, function () {
            throw (new Error("Not implemented sceNetAdhocGameModeUpdateMaster"));
            return -1;
        });
        /** Update peer game object type data. */
        this.sceNetAdhocGameModeUpdateReplica = createNativeFunction(0xFA324B4E, 150, 'int', 'int/int', this, function (id, unk1) {
            throw (new Error("Not implemented sceNetAdhocGameModeUpdateReplica"));
            return -1;
        });
        /** Delete own game object type data. */
        this.sceNetAdhocGameModeDeleteMaster = createNativeFunction(0xA0229362, 150, 'int', '', this, function () {
            throw (new Error("Not implemented sceNetAdhocGameModeDeleteMaster"));
            return -1;
        });
        /** Delete peer game object type data. */
        this.sceNetAdhocGameModeDeleteReplica = createNativeFunction(0x0B2228E9, 150, 'int', 'int', this, function (id) {
            throw (new Error("Not implemented sceNetAdhocGameModeDeleteReplica"));
            return -1;
        });
        /** Open a PTP (Peer To Peer) connection */
        this.sceNetAdhocPtpOpen = createNativeFunction(0x877F6D66, 150, 'int', 'byte[6]/int/void*/int/int/int/int/int', this, function (srcmac, srcport, destmac, destport, bufsize, delay, count, unk1) {
            throw (new Error("Not implemented sceNetAdhocPtpOpen"));
            return -1;
        });
        /** Wait for an incoming PTP connection */
        this.sceNetAdhocPtpListen = createNativeFunction(0xE08BDAC1, 150, 'int', 'byte[6]/int/int/int/int/int/int', this, function (srcmac, srcport, bufsize, delay, count, queue, unk1) {
            throw (new Error("Not implemented sceNetAdhocPtpListen"));
            return -1;
        });
        /** Wait for connection created by sceNetAdhocPtpOpen */
        this.sceNetAdhocPtpConnect = createNativeFunction(0xFC6FC07B, 150, 'int', 'int/int/int', this, function (id, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPtpConnect"));
            return -1;
        });
        /** Accept an incoming PTP connection */
        this.sceNetAdhocPtpAccept = createNativeFunction(0x9DF81198, 150, 'int', 'int/void*/void*/int/int', this, function (id, data, datasize, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPtpAccept"));
            return -1;
        });
        /** Send data */
        this.sceNetAdhocPtpSend = createNativeFunction(0x4DA4C788, 150, 'int', 'int/void*/void*/int/int', this, function (id, data, datasize, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPtpSend"));
            return -1;
        });
        /** Receive data */
        this.sceNetAdhocPtpRecv = createNativeFunction(0x8BEA2B3E, 150, 'int', 'int/void*/void*/int/int', this, function (id, data, datasize, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPtpRecv"));
            return -1;
        });
        /** Wait for data in the buffer to be sent */
        this.sceNetAdhocPtpFlush = createNativeFunction(0x9AC2EEAC, 150, 'int', 'int/int/int', this, function (id, timeout, nonblock) {
            throw (new Error("Not implemented sceNetAdhocPtpFlush"));
            return -1;
        });
        /** Close a socket */
        this.sceNetAdhocPtpClose = createNativeFunction(0x157E6225, 150, 'int', 'int/int', this, function (id, unk1) {
            throw (new Error("Not implemented sceNetAdhocPtpClose"));
            return -1;
        });
        /** Get the status of all PTP objects */
        this.sceNetAdhocGetPtpStat = createNativeFunction(0xB9685118, 150, 'int', 'void*/void*', this, function (size, stat) {
            throw (new Error("Not implemented sceNetAdhocGetPtpStat"));
            return -1;
        });
    }
    return sceNetAdhoc;
})();
exports.sceNetAdhoc = sceNetAdhoc;
var PdpRecv = (function () {
    function PdpRecv() {
        this.port = 0;
        this.mac = new Uint8Array(6);
        this.data = new Uint8Array(0);
    }
    return PdpRecv;
})();
var Pdp = (function () {
    function Pdp(context, mac, port, bufsize) {
        var _this = this;
        this.context = context;
        this.mac = mac;
        this.port = port;
        this.bufsize = bufsize;
        this.chunks = [];
        this.onChunkRecv = new Signal();
        this.onMessageCancel = this.context.netManager.onmessage(port).add(function (packet) {
            _this.chunks.push(packet);
            _this.onChunkRecv.dispatch();
        });
    }
    Pdp.prototype.recvOneAsync = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.onChunkRecv.once(function () {
                resolve(_this.chunks.shift());
            });
        });
    };
    Pdp.prototype.send = function (port, destMac, data) {
        this.context.netManager.send(port, 'sceNetAdhocPdpSend', destMac, data);
    };
    Pdp.prototype.getDataLength = function () {
        return this.chunks.sum(function (chunk) { return chunk.payload.length; });
    };
    Pdp.prototype.dispose = function () {
        if (this.onMessageCancel) {
            this.onMessageCancel.cancel();
            this.onMessageCancel = null;
        }
    };
    return Pdp;
})();
exports.Pdp = Pdp;
var PdpStatStruct = (function () {
    function PdpStatStruct() {
        this.nextPointer = 0;
        this.pdpId = 0;
        this.mac = [0, 0, 0, 0, 0, 0];
        this.port = 0;
        this.rcvdData = 0;
    }
    PdpStatStruct.struct = StructClass.create(PdpStatStruct, [
        { nextPointer: UInt32 },
        { pdpId: Int32 },
        { mac: StructArray(Int8, 6) },
        { port: Int16 },
        { rcvdData: UInt32 },
    ]);
    return PdpStatStruct;
})();
//# sourceMappingURL=sceNetAdhoc.js.map