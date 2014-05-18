import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceNetAdhoc {
	constructor(private context: _context.EmulatorContext) { }

	/** Initialise the adhoc library. */
	sceNetAdhocInit = createNativeFunction(0xE1D621D7, 150, 'int', '', this, () => {
		return 0;
	});

	/** Terminate the adhoc library */
	sceNetAdhocTerm = createNativeFunction(0xA62C6F57, 150, 'int', '', this, () => {
		return 0;
	});

	/** */
	sceNetAdhocPollSocket = createNativeFunction(0x7A662D6B, 150, 'int', 'int/int/int/int', this, (socketAddress: number, int: number, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPollSocket"));
		return -1;
	});

	private pdps = new UidCollection(1);

	/** Create a PDP object. */
	sceNetAdhocPdpCreate = createNativeFunction(0x6F92741B, 150, 'int', 'void*/int/uint/int', this, (mac: Stream, port: number, bufsize: number, unk1: number) => {
		return this.pdps.allocate(new PDP());
	});

	/** Delete a PDP object. */
	sceNetAdhocPdpDelete = createNativeFunction(0x7F27BB5E, 150, 'int', 'int/int', this, (pdpId: number, unk1: number) => {
		this.pdps.remove(pdpId);
		return 0;
	});

	/** Send a PDP packet to a destination. */
	sceNetAdhocPdpSend = createNativeFunction(0xABED3790, 150, 'int', 'int/void*/int/void*/int/int/int', this, (pdpId: number, destMacAddr: String, port: number, data: Stream, len: number, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPdpSend"));
		return -1;
	});

	/** Receive a PDP packet */
	sceNetAdhocPdpRecv = createNativeFunction(0xDFE53E03, 150, 'int', 'int/void*/void*/void*/void*/int/int', this, (pdpId: number, srcMacAddr: Stream, portPtr: Stream, data: Stream, dataLength: Stream, timeout: number, nonblock: number) => {
		throw (new Error("Not implemented sceNetAdhocPdpRecv"));
		return -1;
	});

	/** Get the status of all PDP objects */
	sceNetAdhocGetPdpStat = createNativeFunction(0xC7C1FC57, 150, 'int', 'void*/void*', this, (size: Stream, pdpStatStruct: Stream) => {
		size.writeInt32(0);
		//throw (new Error("Not implemented sceNetAdhocGetPdpStat"));
		return 0;
	});

	/** Create own game object type data. */
	sceNetAdhocGameModeCreateMaster = createNativeFunction(0x7F75C338, 150, 'int', 'byte[]', this, (data: Stream) => {
		throw (new Error("Not implemented sceNetAdhocGameModeCreateMaster"));
		return -1;
	});

	/** Create peer game object type data. */
	sceNetAdhocGameModeCreateReplica = createNativeFunction(0x3278AB0C, 150, 'int', 'void*/byte[]', this, (mac: Stream, data: Stream) => {
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
	sceNetAdhocPtpOpen = createNativeFunction(0x877F6D66, 150, 'int', 'void*/int/void*/int/int/int/int/int', this, (srcmac: Stream, srcport: number, destmac: Stream, destport: number, bufsize: number, delay: number, count: number, unk1: number) => {
		throw (new Error("Not implemented sceNetAdhocPtpOpen"));
		return -1;
	});

	/** Wait for an incoming PTP connection */
	sceNetAdhocPtpListen = createNativeFunction(0xE08BDAC1, 150, 'int', 'void*/int/int/int/int/int/int', this, (srcmac: Stream, srcport: number, bufsize: number, delay: number, count: number, queue: number, unk1: number) => {
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

class PDP {
	dispose() { }
}

/*
class pdpStatStruct { // PDP status structure
	public uint NextPointer; // Pointer to next PDP structure in list (pdpStatStruct *next;) (uint)
	public int pdpId; // pdp ID
	public fixed byte mac[6]; // MAC address byte[6]
	public ushort port; // Port
	public uint rcvdData; // Bytes received
}

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
