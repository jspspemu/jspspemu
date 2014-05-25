import _utils = require('../utils');
import _context = require('../../context');
import _manager = require('../manager'); _manager.Thread;
import SceKernelErrors = require('../SceKernelErrors');
import createNativeFunction = _utils.createNativeFunction;
import EmulatorContext = _context.EmulatorContext;
import MemoryPartition = _manager.MemoryPartition;
import Interop = _manager.Interop;
import Thread = _manager.Thread;

export class sceNetAdhocMatching {
	constructor(private context: _context.EmulatorContext) { }

	private poolStat = { size: 0, maxsize: 0, freesize: 0 };

	/** Initialise the Adhoc matching library */
	sceNetAdhocMatchingInit = createNativeFunction(0x2A2A1E07, 150, 'int', 'int', this, (memSize: number) => {
		//stateOut.writeInt32(this.currentState);
		this.poolStat.size = memSize;
		this.poolStat.maxsize = memSize;
		this.poolStat.freesize = memSize;
		return 0;
	});

	/** Terminate the Adhoc matching library */
	sceNetAdhocMatchingTerm = createNativeFunction(0x7945ECDA, 150, 'int', '', this, () => {
		return 0;
	});

	private matchings = new UidCollection<Matching>(1);

	/** Create an Adhoc matching object */
	sceNetAdhocMatchingCreate = createNativeFunction(0xCA5EDA6F, 150, 'int', 'Thread/int/int/int/int/int/int/int/int/uint', this, (thread: Thread, mode: number, maxPeers: number, port: number, bufSize: number, helloDelay: number, pingDelay: number, initCount: number, msgDeplay: number, callback: number) => {
		var matching = new Matching(this.context, thread, mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDeplay, callback);
		matching.id = this.matchings.allocate(matching);
		this.context.container['matching'] = matching;
		return matching.id;
	});

	/** Select a matching target */
	sceNetAdhocMatchingSelectTarget = createNativeFunction(0x5E3D4B79, 150, 'int', 'int/void*/int/void*', this, (matchingId: number, mac:Stream, dataLength: number, dataPointer: Stream) => {
		var matching = this.matchings.get(matchingId);
		matching.selectTarget(mac.readBytes(6), (dataPointer && dataLength) ? dataPointer.readBytes(dataLength) : null);
		return 0;
	});

	sceNetAdhocMatchingCancelTarget = createNativeFunction(0xEA3C6108, 150, 'int', 'int/void*', this, (matchingId: number, mac: Stream) => {
		var matching = this.matchings.get(matchingId);
		matching.cancelTarget(mac.readBytes(6));
		return 0;
	});

	/** Delete an Adhoc matching object */
	sceNetAdhocMatchingDelete = createNativeFunction(0xF16EAF4F, 150, 'int', 'int', this, (matchingId: number) => {
		this.matchings.remove(matchingId);
		return 0;
	});

	/** Start a matching object */
	sceNetAdhocMatchingStart = createNativeFunction(0x93EF3843, 150, 'int', 'int/int/int/int/int/int/void*', this, (matchingId: number, evthPri: number, evthStack: number, inthPri: number, inthStack: number, optLen: number, optData: Stream) => {
		//throw (new Error("sceNetAdhocMatchingStart"));
		var matching = this.matchings.get(matchingId);
		matching.hello = optData.readBytes(optLen);
		matching.start();
		return 0;
	});

	/** Stop a matching object */
	sceNetAdhocMatchingStop = createNativeFunction(0x32B156B3, 150, 'int', 'int', this, (matchingId) => {
		var matching = this.matchings.get(matchingId);
		matching.stop();
		return 0;
	});
}

export class Matching {
	public id = 0;

	receivedJoinMacAddressPending = false;
	joinMac = '00:00:00:00:00:00';

	constructor(private context: EmulatorContext, private thread: Thread, public mode: number, public maxPeers: number, public port: number, public bufSize: number, public helloDelay: number, public pingDelay: number, public initCount: number, public msgDeplay: number, public callback: number) {
	}

	private static MAC_ALL = new Uint8Array([0, 0, 0, 0, 0, 0]);

	public mac = new Uint8Array([1, 2, 3, 4, 5, 6]);
	public hello = new Uint8Array(0);
	private timer = -1;

	start() {
		setInterval(() => {
			this.sendMessage(Event.Hello, Matching.MAC_ALL, this.hello);
		}, this.helloDelay / 1000);
	}

	stop() {
		clearInterval(this.timer);
	}

	selectTarget(mac: Uint8Array, data: Uint8Array) {
		var macstr = mac2string(mac);
		console.info("adhoc: selectTarget", macstr);
		if (this.receivedJoinMacAddressPending && macstr == this.joinMac) {
			this.receivedJoinMacAddressPending = false;
			this.sendMessage(Event.Accept, mac, data);
		} else {
			this.sendMessage(Event.Join, mac, data);
		}
	}

	cancelTarget(mac: Uint8Array) {
		var macstr = mac2string(mac);
		console.info("adhoc: cancelTarget", macstr);
		this.receivedJoinMacAddressPending = false;
		this.sendMessage(Event.Cancel, mac, null);
	}

	sendMessage(event: Event, tomac: Uint8Array, data: Uint8Array) {
		if (!data) data = new Uint8Array(0);
		if (event != Event.Hello) {
			console.info("adhoc: send ->", Event[event], event, ':', mac2string(tomac), ':', Stream.fromUint8Array(data).readString(data.length));
		}
		var ws = <WebSocket>this.context.container['ws'];
		if (ws) {
			ws.send(JSON.stringify({ type: Event[event], to: mac2string(tomac), payload: Stream.fromUint8Array(data).toBase64() }));
		} else {
			console.warn('not provided a websocket. Not connected to adhoc controller?');
		}
	}

	notify(event: Event, frommac: Uint8Array, data: Uint8Array) {
		if (!data) data = new Uint8Array(0);

		if (event != Event.Hello) {
			console.info("adhoc: received <-", Event[event], event, ':', mac2string(frommac), ':', Stream.fromUint8Array(data).readString(data.length));
		}

		switch (event) {
			case Event.Join:
				this.receivedJoinMacAddressPending = true;
				this.joinMac = mac2string(frommac);
				break;
		}

		var macPartition = this.context.memoryManager.kernelPartition.allocateLow(8, 'Matching.mac');
		this.context.memory.writeUint8Array(macPartition.low, frommac);
		this.context.memory.memset(macPartition.low, 0, macPartition.size);

		var dataPartition = this.context.memoryManager.kernelPartition.allocateLow(Math.max(8, MathUtils.nextAligned(data.length, 8)), 'Matching.data');
		this.context.memory.memset(dataPartition.low, 0, dataPartition.size);
		this.context.memory.writeUint8Array(dataPartition.low, data);

		//// @TODO: Enqueue callback instead of executing now?

		this.context.interop.execute(this.thread.state, this.callback, [
			this.id, event, macPartition.low, data.length, data.length ? dataPartition.low : 0
		]);

		dataPartition.deallocate();
		macPartition.deallocate();

		switch (event) {
			case Event.Accept:
				this.sendMessage(Event.Complete, frommac, data);
				break;
			case Event.Data:
				this.sendMessage(Event.DataConfirm, frommac, null);
				break;
		}

	}
}

export enum Event {
	Hello = 1, // Hello event. optdata contains data if optlen > 0.
	Join = 2, // Join request. optdata contains data if optlen > 0.
	Left = 3, // Target left matching.
	Reject = 4, // Join request rejected.
	Cancel = 5, // Join request cancelled.
	Accept = 6, // Join request accepted. optdata contains data if optlen > 0.
	Complete = 7, // Matching is complete.
	Timeout = 8, // Ping timeout event.
	Error = 9, // Error event.
	Disconnect = 10, // Peer disconnect event.
	Data = 11, // Data received event. optdata contains data if optlen > 0.
	DataConfirm = 12, // Data acknowledged event.
	DataTimeout = 13, // Data timeout event.
	InternalPing = 100, // Internal ping message.
}

