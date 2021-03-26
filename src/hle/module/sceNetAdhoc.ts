import {Cancelable, PromiseFast, Signal0, UidCollection} from "../../global/utils";
import {Stream} from "../../global/stream";
import {
    Int8, Struct,
    StructInt16,
    StructInt32,
    StructStructArray,
    StructUInt32
} from "../../global/struct";
import {xrange} from "../../global/math";
import {EmulatorContext} from "../../emu/context";
import {MemoryPartition} from "../manager/memory";
import {BYTES, FBYTES, I32, nativeFunctionEx, PTR, U32} from "../utils";
import {NetPacket} from "../manager/net";

export class sceNetAdhoc {
	constructor(private context: EmulatorContext) {
	}

	// @ts-ignore
    private partition: MemoryPartition;

	/** Initialise the adhoc library. */
	@nativeFunctionEx(0xE1D621D7, 150)
	@I32 sceNetAdhocInit() {
		this.partition = this.context.memoryManager.kernelPartition.allocateLow(0x4000);
		return 0;
	}

	/** Terminate the adhoc library */
	@nativeFunctionEx(0xA62C6F57, 150)
    @I32 sceNetAdhocTerm() {
		this.partition.deallocate();
		return 0;
	}

	/** */
	@nativeFunctionEx(0x7A662D6B, 150)
    @I32 sceNetAdhocPollSocket(@I32 socketAddress: number, @I32 int: number, @I32 timeout: number, @I32 nonblock: number) {
		throw new Error("Not implemented sceNetAdhocPollSocket");
	}

	private pdps = new UidCollection<Pdp>(1);

	/** Create a PDP object. */
	@nativeFunctionEx(0x6F92741B, 150)
    @I32 sceNetAdhocPdpCreate(@FBYTES(6) mac: Uint8Array, @I32 port: number, @U32 bufsize: number, @I32 unk1: number) {
        const pdp = new Pdp(this.context, mac, port, bufsize);
		pdp.id = this.pdps.allocate(pdp);
		return pdp.id;
	}

	/** Delete a PDP object. */
	@nativeFunctionEx(0x7F27BB5E, 150)
    @I32 sceNetAdhocPdpDelete(@I32 pdpId: number, @I32 unk1: number) {
        const pdp = this.pdps.get(pdpId);
		pdp.dispose();
		this.pdps.remove(pdpId);
		return 0;
	}

	/** Send a PDP packet to a destination. */
	@nativeFunctionEx(0xABED3790, 150)
    @I32 sceNetAdhocPdpSend(@I32 pdpId: number, @FBYTES(6) destMac: Uint8Array, @I32 port: number, @FBYTES(6) dataStream: Stream, @I32 timeout: number, @I32 nonblock: number) {
		//debugger;
        const pdp = this.pdps.get(pdpId);
        const data = dataStream.readBytes(dataStream.length);
		pdp.send(port, destMac, data);

		return 0;
	}

	/** Receive a PDP packet */
	@nativeFunctionEx(0xDFE53E03, 150)
    @I32 async sceNetAdhocPdpRecv(@I32 pdpId: number, @FBYTES(6) srcMac: Uint8Array, @PTR portPtr: Stream, @PTR data: Stream, @PTR dataLengthPtr: Stream, @I32 timeout: number, @I32 nonblock: number) {
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
            const data = await pdp.recvOneAsync()
			return recvOne(data)
		} else {
			if (pdp.chunks.length <= 0) return 0x80410709; // ERROR_NET_ADHOC_NO_DATA_AVAILABLE
			return recvOne(pdp.chunks.shift()!);
		}
	}

	/** Get the status of all PDP objects */
	@nativeFunctionEx(0xC7C1FC57, 150)
    @I32 sceNetAdhocGetPdpStat(@PTR sizeStream: Stream, @PTR pdpStatStruct: Stream) {
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
	@nativeFunctionEx(0x7F75C338, 150)
    @I32 sceNetAdhocGameModeCreateMaster(@BYTES data: Stream) {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateMaster"));
	}

	/** Create peer game object type data. */
	@nativeFunctionEx(0x3278AB0C, 150)
    @I32 sceNetAdhocGameModeCreateReplica(@FBYTES(6) mac: Uint8Array, @BYTES data: Stream) {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateReplica"));
	}

	/** Update own game object type data. */
	@nativeFunctionEx(0x98C204C8, 150)
    @I32 sceNetAdhocGameModeUpdateMaster() {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateMaster"));
	}

	/** Update peer game object type data. */
	@nativeFunctionEx(0xFA324B4E, 150)
    @I32 sceNetAdhocGameModeUpdateReplica(@I32 id: number, @I32 unk1: number) {
		throw (new Error("Not implemented sceNetAdhocGameModeUpdateReplica"));
	}

	/** Delete own game object type data. */
	@nativeFunctionEx(0xA0229362, 150)
    @I32 sceNetAdhocGameModeDeleteMaster() {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteMaster"));
	}

	/** Delete peer game object type data. */
	@nativeFunctionEx(0x0B2228E9, 150)
    @I32 sceNetAdhocGameModeDeleteReplica(@I32 id: number) {
		throw (new Error("Not implemented sceNetAdhocGameModeDeleteReplica"));
	}

	/** Open a PTP (Peer To Peer) connection */
	@nativeFunctionEx(0x877F6D66, 150)
    @I32 sceNetAdhocPtpOpen(@FBYTES(6) srcmac: Uint8Array, @I32 srcport: number, @PTR destmac: Stream, @I32 destport: number, @I32 bufsize: number, @I32 delay: number, @I32 count: number, @I32 unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpOpen"));
	}

	/** Wait for an incoming PTP connection */
	@nativeFunctionEx(0xE08BDAC1, 150)
    @I32 sceNetAdhocPtpListen(@FBYTES(6) srcmac: Uint8Array, @I32 srcport: number, @I32 bufsize: number, @I32 delay: number, @I32 count: number, @I32 queue: number, @I32 unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpListen"));
	}

	/** Wait for connection created by sceNetAdhocPtpOpen */
	@nativeFunctionEx(0xFC6FC07B, 150)
    @I32 sceNetAdhocPtpConnect(@I32 id: number, @I32 timeout: number, @I32 nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpConnect"));
	}

	/** Accept an incoming PTP connection */
	@nativeFunctionEx(0x9DF81198, 150)
    @I32 sceNetAdhocPtpAccept(@I32 id: number, @PTR data: Stream, @PTR datasize: Stream, @I32 timeout: number, @I32 nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpAccept"));
	}

	/** Send data */
	@nativeFunctionEx(0x4DA4C788, 150)
    @I32 sceNetAdhocPtpSend(@I32 id: number, @PTR data: Stream, @PTR datasize: Stream, @I32 timeout: number, @I32 nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpSend"));
	}
	
	/** Receive data */
	@nativeFunctionEx(0x8BEA2B3E, 150)
    @I32 sceNetAdhocPtpRecv(@I32 id: number, @PTR data: Stream, @PTR datasize: Stream, @I32 timeout: number, @I32 nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpRecv"));
	}

	/** Wait for data in the buffer to be sent */
	@nativeFunctionEx(0x9AC2EEAC, 150)
    @I32 sceNetAdhocPtpFlush(@I32 id: number, @I32 timeout: number, @I32 nonblock: number) {
		throw (new Error("Not implemented sceNetAdhocPtpFlush"));
	}

	/** Close a socket */
	@nativeFunctionEx(0x157E6225, 150)
    @I32 sceNetAdhocPtpClose(@I32 id: number, @I32 unk1: number) {
		throw (new Error("Not implemented sceNetAdhocPtpClose"));
	}

	/** Get the status of all PTP objects */
	@nativeFunctionEx(0xB9685118, 150)
    @I32 sceNetAdhocGetPtpStat(@PTR size: Stream, @PTR stat: Stream) {
		throw (new Error("Not implemented sceNetAdhocGetPtpStat"));
	}
}



class PdpRecv {
	port = 0;
	mac = new Uint8Array(6);
	data = new Uint8Array(0);
}

export class Pdp {
	id: number = 0
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

class PdpStatStruct extends Struct {
	@StructUInt32 nextPointer = 0
    @StructInt32 pdpId = 0
	@StructStructArray(Int8, 6) mac = [0, 0, 0, 0, 0, 0]
	@StructInt16 port = 0
    @StructUInt32 rcvdData = 0
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
