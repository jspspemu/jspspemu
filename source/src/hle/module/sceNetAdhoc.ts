///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import _manager = require('../manager');
import SceKernelErrors = require('../SceKernelErrors');
import createNativeFunction = _utils.createNativeFunction;
import EmulatorContext = _context.EmulatorContext;
import MemoryPartition = _manager.MemoryPartition;
import Interop = _manager.Interop;
import Thread = _manager.Thread;

export class sceNetAdhoc {
	constructor(private context: _context.EmulatorContext) {
	}

	private partition: MemoryPartition;

	/** Initialise the adhoc library. */
	sceNetAdhocInit = createNativeFunction(0xE1D621D7, 150, 'int', '', this, () => {
		this.partition = this.context.memoryManager.kernelPartition.allocateLow(0x4000);
		return 0;
	});

	/** Terminate the adhoc library */
	sceNetAdhocTerm = createNativeFunction(0xA62C6F57, 150, 'int', '', this, () => {
		this.partition.deallocate();
		return 0;
	});

	/** */
	sceNetAdhocPollSocket = createNativeFunction(0x7A662D6B, 150, 'int', 'int/int/int/int', this, (socketAddress: number, int: number, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPollSocket"));
		return -1;
	});

	private pdps = new UidCollection<Pdp>(1);

	/** Create a PDP object. */
	sceNetAdhocPdpCreate = createNativeFunction(0x6F92741B, 150, 'int', 'byte[6]/int/uint/int', this, (mac: Uint8Array, port: number, bufsize: number, unk1: number) => {
		var pdp = new Pdp(this.context, mac, port, bufsize);
		pdp.id = this.pdps.allocate(pdp);
		return pdp.id;
	});

	/** Delete a PDP object. */
	sceNetAdhocPdpDelete = createNativeFunction(0x7F27BB5E, 150, 'int', 'int/int', this, (pdpId: number, unk1: number) => {
		var pdp = this.pdps.get(pdpId);
		pdp.dispose();

		this.pdps.remove(pdpId);
		return 0;
	});

	/** Send a PDP packet to a destination. */
	sceNetAdhocPdpSend = createNativeFunction(0xABED3790, 150, 'int', 'int/byte[6]/int/byte[]/int/int', this, (pdpId: number, destMac: Uint8Array, port: number, dataStream: Stream, timeout: number, nonblock: number) => {
		//debugger;
		var pdp = this.pdps.get(pdpId);

		var data = dataStream.readBytes(dataStream.length);
		pdp.send(port, destMac, data);

		return 0;
	});

	/** Receive a PDP packet */
	sceNetAdhocPdpRecv = createNativeFunction(0xDFE53E03, 150, 'int', 'int/byte[6]/void*/void*/void*/void*/int', this, (pdpId: number, srcMac: Uint8Array, portPtr: Stream, data: Stream, dataLengthPtr: Stream, timeout: number, nonblock: number): any => {
		var block = !nonblock;

		var pdp = this.pdps.get(pdpId);

		var recvOne = (chunk: _manager.NetPacket) => {
			srcMac.set(chunk.mac);
			data.writeBytes(chunk.payload);
			portPtr.writeInt16(pdp.port);
			dataLengthPtr.writeInt32(chunk.payload.length);
			return 0;
		};

		// block
		if (block) {
			return pdp.recvOneAsync().then(recvOne);
		} else {
			if (pdp.chunks.length <= 0) return 0x80410709; // ERROR_NET_ADHOC_NO_DATA_AVAILABLE
			return recvOne(pdp.chunks.shift());
		}
	});

	/** Get the status of all PDP objects */
	sceNetAdhocGetPdpStat = createNativeFunction(0xC7C1FC57, 150, 'int', 'void*/void*', this, (sizeStream: Stream, pdpStatStruct: Stream) => {
		var maxSize = sizeStream.sliceWithLength(0).readInt32();

		var pdps = this.pdps.list();

		var totalSize = pdps.length * PdpStatStruct.struct.length;
		sizeStream.sliceWithLength(0).writeInt32(totalSize);

		//var outStream = this.context.memory.getPointerStream(this.partition.low, this.partition.size);
		var pos = 0;
		pdps.forEach(pdp => {
			var stat = new PdpStatStruct();
			stat.nextPointer = 0;
			stat.pdpId = pdp.id;
			stat.port = pdp.port;
			stat.mac = xrange(0, 6).map(index => pdp.mac[index]);
			stat.rcvdData = pdp.getDataLength();
			//console.log("sceNetAdhocGetPdpStat:", stat);
			PdpStatStruct.struct.write(pdpStatStruct, stat);
		});
		return 0;
	});

	/** Create own game object type data. */
	sceNetAdhocGameModeCreateMaster = createNativeFunction(0x7F75C338, 150, 'int', 'byte[]', this, (data: Stream) => {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateMaster"));
		return -1;
	});

	/** Create peer game object type data. */
	sceNetAdhocGameModeCreateReplica = createNativeFunction(0x3278AB0C, 150, 'int', 'byte[6]/byte[]', this, (mac: Uint8Array, data: Stream) => {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateReplica"));
		return -1;
	});

	/** Update own game object type data. */
	sceNetAdhocGameModeUpdateMaster = createNativeFunction(0x98C204C8, 150, 'int', '', this, () => {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateMaster"));
		return -1;
	});

	/** Update peer game object type data. */
	sceNetAdhocGameModeUpdateReplica = createNativeFunction(0xFA324B4E, 150, 'int', 'int/int', this, (id: number, unk1: number) => {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateReplica"));
		return -1;
	});

	/** Delete own game object type data. */
	sceNetAdhocGameModeDeleteMaster = createNativeFunction(0xA0229362, 150, 'int', '', this, () => {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteMaster"));
		return -1;
	});

	/** Delete peer game object type data. */
	sceNetAdhocGameModeDeleteReplica = createNativeFunction(0x0B2228E9, 150, 'int', 'int', this, (id: number) => {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteReplica"));
		return -1;
	});

	/** Open a PTP (Peer To Peer) connection */
	sceNetAdhocPtpOpen = createNativeFunction(0x877F6D66, 150, 'int', 'byte[6]/int/void*/int/int/int/int/int', this, (srcmac: Uint8Array, srcport: number, destmac: Stream, destport: number, bufsize: number, delay: number, count: number, unk1: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpOpen"));
		return -1;
	});

	/** Wait for an incoming PTP connection */
	sceNetAdhocPtpListen = createNativeFunction(0xE08BDAC1, 150, 'int', 'byte[6]/int/int/int/int/int/int', this, (srcmac: Uint8Array, srcport: number, bufsize: number, delay: number, count: number, queue: number, unk1: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpListen"));
		return -1;
	});

	/** Wait for connection created by sceNetAdhocPtpOpen */
	sceNetAdhocPtpConnect = createNativeFunction(0xFC6FC07B, 150, 'int', 'int/int/int', this, (id: number, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpConnect"));
		return -1;
	});

	/** Accept an incoming PTP connection */
	sceNetAdhocPtpAccept = createNativeFunction(0x9DF81198, 150, 'int', 'int/void*/void*/int/int', this, (id:number, data: Stream, datasize: Stream, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpAccept"));
		return -1;
	});

	/** Send data */
	sceNetAdhocPtpSend = createNativeFunction(0x4DA4C788, 150, 'int', 'int/void*/void*/int/int', this, (id: number, data: Stream, datasize: Stream, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpSend"));
		return -1;
	});

	/** Receive data */
	sceNetAdhocPtpRecv = createNativeFunction(0x8BEA2B3E, 150, 'int', 'int/void*/void*/int/int', this, (id: number, data: Stream, datasize: Stream, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpRecv"));
		return -1;
	});

	/** Wait for data in the buffer to be sent */
	sceNetAdhocPtpFlush = createNativeFunction(0x9AC2EEAC, 150, 'int', 'int/int/int', this, (id: number, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpFlush"));
		return -1;
	});

	/** Close a socket */
	sceNetAdhocPtpClose = createNativeFunction(0x157E6225, 150, 'int', 'int/int', this, (id: number, unk1: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpClose"));
		return -1;
	});

	/** Get the status of all PTP objects */
	sceNetAdhocGetPtpStat = createNativeFunction(0xB9685118, 150, 'int', 'void*/void*', this, (size: Stream, stat: Stream) => {
		throw (new Error("Not implemented sceNetAdhocGetPtpStat"));
		return -1;
	});
}



class PdpRecv {
	port = 0;
	mac = new Uint8Array(6);
	data = new Uint8Array(0);
}

export class Pdp {
	id: number;
	onMessageCancel: Cancelable;
	chunks = <_manager.NetPacket[]>[];
	onChunkRecv = new Signal();

	constructor(private context: EmulatorContext, public mac: Uint8Array, public port: number, public bufsize: number) {
		this.onMessageCancel = this.context.netManager.onmessage(port).add(packet => {
			this.chunks.push(packet);
			this.onChunkRecv.dispatch();
		})
	}

	recvOneAsync() {
		return new Promise2<_manager.NetPacket>((resolve, reject) => {
			this.onChunkRecv.once(() => {
				resolve(this.chunks.shift());
			});
		});
	}

	send(port: number, destMac: Uint8Array, data: Uint8Array) {
		this.context.netManager.send(port, 'sceNetAdhocPdpSend', destMac, data);
	}

	getDataLength() {
		return this.chunks.sum(chunk => chunk.payload.length);
	}

	dispose() {
		if (this.onMessageCancel) {
			this.onMessageCancel.cancel();
			this.onMessageCancel = null;
		}
	}
}

class PdpStatStruct {
	nextPointer = 0;
	pdpId = 0;
	mac = [0, 0, 0, 0, 0, 0];
	port = 0;
	rcvdData = 0;

	static struct = StructClass.create<PdpStatStruct>(PdpStatStruct, [
		{ nextPointer: UInt32 }, // Pointer to next PDP structure in list (pdpStatStruct *next;) (uint)
		{ pdpId: Int32 }, // pdp ID
		{ mac: StructArray(Int8, 6) }, // pdp ID
		{ port: Int16 },  // Port
		{ rcvdData: UInt32 }, // Bytes received
	]);
}

/*
class ptpStatStruct { // PTP status structure
	public uint NextAddress; // Pointer to next PTP structure in list (ptpStatStruct *next;)
	public int ptpId; // ptp ID
	public fixed byte mac[6]; // MAC address
	public fixed byte peermac[6]; // Peer MAC address
	public ushort port; // Port
	public ushort peerport; // Peer Port
	public uint sentData; // Bytes sent
	public uint rcvdData; // Bytes received
	public int unk1; // Unknown
}
*/
