import {Cancelable, PromiseFast, Signal0, UidCollection} from "../../global/utils";
import {Stream} from "../../global/stream";
import {Int16, Int32, Int8, StructArray, StructClass, UInt32} from "../../global/struct";
import {xrange} from "../../global/math";
import {EmulatorContext} from "../../emu/context";
import {MemoryPartition} from "../manager/memory";
import {nativeFunction} from "../utils";
import {NetPacket} from "../manager/net";

export class sceNetAdhoc {
	constructor(private context: EmulatorContext) {
	}

	private partition: MemoryPartition;

	/** Initialise the adhoc library. */
	@nativeFunction(0xE1D621D7, 150, 'int', '')
	sceNetAdhocInit() {
		this.partition = this.context.memoryManager.kernelPartition.allocateLow(0x4000);
		return 0;
	}

	/** Terminate the adhoc library */
	@nativeFunction(0xA62C6F57, 150, 'int', '')
	sceNetAdhocTerm() {
		this.partition.deallocate();
		return 0;
	}

	/** */
	@nativeFunction(0x7A662D6B, 150, 'int', 'int/int/int/int')
	sceNetAdhocPollSocket(socketAddress: number, int: number, timeout: number, nonblock: number) {
		throw new Error("Not implemented sceNetAdhocPollSocket");
	}

	private pdps = new UidCollection<Pdp>(1);

	/** Create a PDP object. */
	@nativeFunction(0x6F92741B, 150, 'int', 'byte[6]/int/uint/int')
	sceNetAdhocPdpCreate(mac: Uint8Array, port: number, bufsize: number, unk1: number) {
        const pdp = new Pdp(this.context, mac, port, bufsize);
		pdp.id = this.pdps.allocate(pdp);
		return pdp.id;
	}

	/** Delete a PDP object. */
	@nativeFunction(0x7F27BB5E, 150, 'int', 'int/int')
	sceNetAdhocPdpDelete(pdpId: number, unk1: number) {
        const pdp = this.pdps.get(pdpId);
		pdp.dispose();
		this.pdps.remove(pdpId);
		return 0;
	}

	/** Send a PDP packet to a destination. */
	@nativeFunction(0xABED3790, 150, 'int', 'int/byte[6]/int/byte[]/int/int')
	sceNetAdhocPdpSend(pdpId: number, destMac: Uint8Array, port: number, dataStream: Stream, timeout: number, nonblock: number) {
		//debugger;
        const pdp = this.pdps.get(pdpId);
        const data = dataStream.readBytes(dataStream.length);
		pdp.send(port, destMac, data);

		return 0;
	}

	/** Receive a PDP packet */
	@nativeFunction(0xDFE53E03, 150, 'int', 'int/byte[6]/void*/void*/void*/void*/int')
	sceNetAdhocPdpRecv(pdpId: number, srcMac: Uint8Array, portPtr: Stream, data: Stream, dataLengthPtr: Stream, timeout: number, nonblock: number): any {
        const block = !nonblock;
        const pdp = this.pdps.get(pdpId);
		const recvOne = (chunk: NetPacket) => {
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
			return recvOne(pdp.chunks.shift()!);
		}
	}

	/** Get the status of all PDP objects */
	@nativeFunction(0xC7C1FC57, 150, 'int', 'void*/void*')
	sceNetAdhocGetPdpStat(sizeStream: Stream, pdpStatStruct: Stream) {
        const maxSize = sizeStream.sliceWithLength(0).readInt32();
        const pdps = this.pdps.list();
        const totalSize = pdps.length * PdpStatStruct.struct.length;
        sizeStream.sliceWithLength(0).writeInt32(totalSize);
		//const outStream = this.context.memory.getPointerStream(this.partition.low, this.partition.size);
        const pos = 0;
        pdps.forEach(pdp => {
            const stat = new PdpStatStruct();
            stat.nextPointer = 0;
			stat.pdpId = pdp.id;
			stat.port = pdp.port;
			stat.mac = xrange(0, 6).map(index => pdp.mac[index]);
			stat.rcvdData = pdp.getDataLength();
			//console.log("sceNetAdhocGetPdpStat:", stat);
			PdpStatStruct.struct.write(pdpStatStruct, stat);
		});
		return 0;
	}

	/** Create own game object type data. */
	@nativeFunction(0x7F75C338, 150, 'int', 'byte[]')
	sceNetAdhocGameModeCreateMaster(data: Stream) {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateMaster"));
	}

	/** Create peer game object type data. */
	@nativeFunction(0x3278AB0C, 150, 'int', 'byte[6]/byte[]')
	sceNetAdhocGameModeCreateReplica(mac: Uint8Array, data: Stream) {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateReplica"));
	}

	/** Update own game object type data. */
	@nativeFunction(0x98C204C8, 150, 'int', '')
	sceNetAdhocGameModeUpdateMaster() {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateMaster"));
	}

	/** Update peer game object type data. */
	@nativeFunction(0xFA324B4E, 150, 'int', 'int/int')
	sceNetAdhocGameModeUpdateReplica(id: number, unk1: number) {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateReplica"));
	}

	/** Delete own game object type data. */
	@nativeFunction(0xA0229362, 150, 'int', '')
	sceNetAdhocGameModeDeleteMaster() {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteMaster"));
	}

	/** Delete peer game object type data. */
	@nativeFunction(0x0B2228E9, 150, 'int', 'int')
	sceNetAdhocGameModeDeleteReplica(id: number) {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteReplica"));
	}

	/** Open a PTP (Peer To Peer) connection */
	@nativeFunction(0x877F6D66, 150, 'int', 'byte[6]/int/void*/int/int/int/int/int')
	sceNetAdhocPtpOpen(srcmac: Uint8Array, srcport: number, destmac: Stream, destport: number, bufsize: number, delay: number, count: number, unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpOpen"));
	}

	/** Wait for an incoming PTP connection */
	@nativeFunction(0xE08BDAC1, 150, 'int', 'byte[6]/int/int/int/int/int/int')
	sceNetAdhocPtpListen(srcmac: Uint8Array, srcport: number, bufsize: number, delay: number, count: number, queue: number, unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpListen"));
	}

	/** Wait for connection created by sceNetAdhocPtpOpen */
	@nativeFunction(0xFC6FC07B, 150, 'int', 'int/int/int')
	sceNetAdhocPtpConnect(id: number, timeout: number, nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpConnect"));
	}

	/** Accept an incoming PTP connection */
	@nativeFunction(0x9DF81198, 150, 'int', 'int/void*/void*/int/int')
	sceNetAdhocPtpAccept(id:number, data: Stream, datasize: Stream, timeout: number, nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpAccept"));
	}

	/** Send data */
	@nativeFunction(0x4DA4C788, 150, 'int', 'int/void*/void*/int/int')
	sceNetAdhocPtpSend(id: number, data: Stream, datasize: Stream, timeout: number, nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpSend"));
	}
	
	/** Receive data */
	@nativeFunction(0x8BEA2B3E, 150, 'int', 'int/void*/void*/int/int')
	sceNetAdhocPtpRecv(id: number, data: Stream, datasize: Stream, timeout: number, nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpRecv"));
	}

	/** Wait for data in the buffer to be sent */
	@nativeFunction(0x9AC2EEAC, 150, 'int', 'int/int/int')
	sceNetAdhocPtpFlush(id: number, timeout: number, nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpFlush"));
	}

	/** Close a socket */
	@nativeFunction(0x157E6225, 150, 'int', 'int/int')
	sceNetAdhocPtpClose(id: number, unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpClose"));
	}

	/** Get the status of all PTP objects */
	@nativeFunction(0xB9685118, 150, 'int', 'void*/void*')
	sceNetAdhocGetPtpStat(size: Stream, stat: Stream) {
		throw (new Error("Not implemented sceNetAdhocGetPtpStat"));
	}
}



class PdpRecv {
	port = 0;
	mac = new Uint8Array(6);
	data = new Uint8Array(0);
}

export class Pdp {
	id: number;
	onMessageCancel: Cancelable | null;
	chunks = <NetPacket[]>[];
	onChunkRecv = new Signal0();

	constructor(private context: EmulatorContext, public mac: Uint8Array, public port: number, public bufsize: number) {
		this.onMessageCancel = this.context.netManager.onmessage(port).add(packet => {
			this.chunks.push(packet);
			this.onChunkRecv.dispatch();
		})
	}

	recvOneAsync() {
		return new PromiseFast<NetPacket>((resolve, reject) => {
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
