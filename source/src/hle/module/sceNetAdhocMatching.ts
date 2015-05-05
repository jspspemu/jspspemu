///<reference path="../../global.d.ts" />

import _sceNetAdhoc = require('./sceNetAdhoc');
import _utils = require('../utils');
import _context = require('../../context');
import _manager = require('../manager'); _manager.Thread;
import SceKernelErrors = require('../SceKernelErrors');
import nativeFunction = _utils.nativeFunction;
import EmulatorContext = _context.EmulatorContext;
import MemoryPartition = _manager.MemoryPartition;
import Interop = _manager.Interop;
import Thread = _manager.Thread;

export class sceNetAdhocMatching {
	constructor(private context: _context.EmulatorContext) {
	}

	private poolStat = { size: 0, maxsize: 0, freesize: 0 };

	/** Initialise the Adhoc matching library */
	@nativeFunction(0x2A2A1E07, 150, 'int', 'int')
	sceNetAdhocMatchingInit(memSize: number) {
		//stateOut.writeInt32(this.currentState);
		this.poolStat.size = memSize;
		this.poolStat.maxsize = memSize;
		this.poolStat.freesize = memSize;
		return 0;
	}

	/** Terminate the Adhoc matching library */
	@nativeFunction(0x7945ECDA, 150, 'int', '')
	sceNetAdhocMatchingTerm() {
		return 0;
	}

	private matchings = new UidCollection<Matching>(1);

	/** Create an Adhoc matching object */
	@nativeFunction(0xCA5EDA6F, 150, 'int', 'Thread/int/int/int/int/int/int/int/int/uint')
	sceNetAdhocMatchingCreate(thread: Thread, mode: Mode, maxPeers: number, port: number, bufSize: number, helloDelay: number, pingDelay: number, initCount: number, msgDelay: number, callback: number) {
		var matching = new Matching(this.context, thread, mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDelay, callback);
		matching.id = this.matchings.allocate(matching);
		return matching.id;
	}

	/** Select a matching target */
	@nativeFunction(0x5E3D4B79, 150, 'int', 'int/void*/int/void*')
	sceNetAdhocMatchingSelectTarget(matchingId: number, macStream:Stream, dataLength: number, dataPointer: Stream) {
		var matching = this.matchings.get(matchingId);
		var mac = macStream.readBytes(6);
		matching.selectTarget(mac, (dataPointer && dataLength) ? dataPointer.readBytes(dataLength) : null);
		return 0;
	}

	@nativeFunction(0xEA3C6108, 150, 'int', 'int/void*')
	sceNetAdhocMatchingCancelTarget(matchingId: number, mac: Stream) {
		var matching = this.matchings.get(matchingId);
		matching.cancelTarget(mac.readBytes(6));
		return 0;
	}

	/** Delete an Adhoc matching object */
	@nativeFunction(0xF16EAF4F, 150, 'int', 'int')
	sceNetAdhocMatchingDelete(matchingId: number) {
		this.matchings.remove(matchingId);
		return 0;
	}

	/** Start a matching object */
	@nativeFunction(0x93EF3843, 150, 'int', 'int/int/int/int/int/int/void*')
	sceNetAdhocMatchingStart(matchingId: number, evthPri: number, evthStack: number, inthPri: number, inthStack: number, optLen: number, optData: Stream) {
		//throw (new Error("sceNetAdhocMatchingStart"));
		var matching = this.matchings.get(matchingId);
		matching.hello = optData.readBytes(optLen);
		matching.start();
		return 0;
	}

	/** Stop a matching object */
	@nativeFunction(0x32B156B3, 150, 'int', 'int')
	sceNetAdhocMatchingStop(matchingId:number) {
		var matching = this.matchings.get(matchingId);
		matching.stop();
		return 0;
	}
}

export enum State {
	START,
	JOIN_WAIT_RESPONSE,
	JOIN_WAIT_COMPLETE,
	COMPLETED,
}

export class Matching {
	public id = 0;

	joinMac = '00:00:00:00:00:00';

	constructor(private context: EmulatorContext, private thread: Thread, public mode: number, public maxPeers: number, public port: number, public bufSize: number, public helloDelay: number, public pingDelay: number, public initCount: number, public msgDelay: number, public callback: number) {
	}

	private static MAC_ALL = new Uint8Array([0, 0, 0, 0, 0, 0]);

	public mac = new Uint8Array([1, 2, 3, 4, 5, 6]);
	public hello = new Uint8Array(0);
	private helloTimer = -1;
	private dataTimer = -1;
	private onMessageCancelable: Cancelable = null;
	private state = State.START;

	private sendHello() {
		if (this.state != State.START) return;
		this.sendMessage(Event.Hello, Matching.MAC_ALL, this.hello);
	}

	start() {
		this.onMessageCancelable = this.context.netManager.onmessage(this.port).add(packet => {
			this.notify((<any>Event)[packet.type], packet.mac, packet.payload);
		})

		this.helloTimer = setInterval(() => { this.sendHello(); }, this.helloDelay / 1000);
		this.sendHello();

		this.dataTimer = setInterval(() => {
		}, this.msgDelay / 1000);
	}

	stop() {
		clearInterval(this.helloTimer);
		clearInterval(this.dataTimer);

		if (this.onMessageCancelable) {
			this.onMessageCancelable.cancel();
			this.onMessageCancelable = null;
		}
	}

	selectTarget(mac: Uint8Array, data: Uint8Array) {
		var macstr = mac2string(mac);
		console.info("net.adhoc: selectTarget", macstr);
		// Accept
		if ((this.state == State.JOIN_WAIT_RESPONSE) && (macstr == this.joinMac)) {
			this.state = State.JOIN_WAIT_COMPLETE;
			this.sendMessage(Event.Accept, mac, data);
		}
		// Send a Join request
		else {
			this.state = State.JOIN_WAIT_RESPONSE;
			this.sendMessage(Event.Join, mac, data);
		}
	}

	cancelTarget(mac: Uint8Array) {
		// Cancel
		var macstr = mac2string(mac);
		console.info("net.adhoc: cancelTarget", macstr);
		this.state = State.START;
		this.sendMessage(Event.Cancel, mac, null);
	}

	//private messageQueue = [];

	sendMessage(event: Event, tomac: Uint8Array, data: Uint8Array) {
		//this.messageQueue.push({ event: event, tomac: ArrayBufferUtils.cloneBytes(tomac), data: ArrayBufferUtils.cloneBytes(data) });
		if (!data) data = new Uint8Array(0);
		if (event != Event.Hello) {
			console.info("net.adhoc: send ->", Event[event], event, ':', mac2string(tomac), ':', Stream.fromUint8Array(data).readString(data.length));
		}

		this.context.netManager.send(this.port, Event[event], tomac, data);
	}

	notify(event: Event, frommac: Uint8Array, data: Uint8Array) {
		if (!data) data = new Uint8Array(0);

		if (event != Event.Hello) {
			console.info("net.adhoc: received <-", Event[event], event, ':', mac2string(frommac), ':', Stream.fromUint8Array(data).readString(data.length));
		}

		switch (event) {
			case Event.Join:
				this.state = State.JOIN_WAIT_RESPONSE;
				this.joinMac = mac2string(frommac);
				break;
		}

		var macPartition = this.context.memoryManager.kernelPartition.allocateLow(8, 'Matching.mac');
		this.context.memory.memset(macPartition.low, 0, macPartition.size);
		this.context.memory.writeUint8Array(macPartition.low, frommac);

		var dataPartition = this.context.memoryManager.kernelPartition.allocateLow(Math.max(8, MathUtils.nextAligned(data.length, 8)), 'Matching.data');
		this.context.memory.memset(dataPartition.low, 0, dataPartition.size);
		this.context.memory.writeUint8Array(dataPartition.low, data);

		//// @TODO: Enqueue callback instead of executing now?

		this.context.callbackManager.executeLater(this.callback, [
			this.id, event, macPartition.low, data.length, data.length ? dataPartition.low : 0
		]);
		//this.context.interop.execute(this.thread.state, this.callback, [
		//	this.id, event, macPartition.low, data.length, data.length ? dataPartition.low : 0
		//]);

		dataPartition.deallocate();
		macPartition.deallocate();

		switch (event) {
			case Event.Accept:
				this.sendMessage(Event.Complete, frommac, data);
				this.state = State.JOIN_WAIT_COMPLETE;
				break;
			case Event.Complete:
				if (this.state == State.JOIN_WAIT_COMPLETE) {
					this.sendMessage(Event.Complete, frommac, data);
					this.state = State.COMPLETED;
				}
				break;
			case Event.Data:
				this.sendMessage(Event.DataConfirm, frommac, null);
				break;
			case Event.Disconnect:
			case Event.Left:
				this.state = State.START;
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
	//InternalPing = 100, // Internal ping message.
}

export enum Mode {
	Host = 1,
	Client = 2,
	Ptp = 3,
}