///<reference path="../../global.d.ts" />

import _sceNetAdhocMatching = require('./sceNetAdhocMatching');
import _utils = require('../utils');
import _context = require('../../context');
import _manager = require('../manager');
import SceKernelErrors = require('../SceKernelErrors');
import createNativeFunction = _utils.createNativeFunction;
import EmulatorContext = _context.EmulatorContext;
import MemoryPartition = _manager.MemoryPartition;
import Interop = _manager.Interop;
import Thread = _manager.Thread;

export class sceNetAdhocctl {
	constructor(private context: _context.EmulatorContext) { }

	private currentState = State.Disconnected;
	private currentName = "noname";

	public ws: WebSocket;

	/** Initialise the Adhoc control library */
	sceNetAdhocctlInit = createNativeFunction(0xE26F226E, 150, 'int', 'int/int/void*', this, (stacksize: number, priority: number, product: Stream) => {
		this.currentState = State.Disconnected;
		return 0;
	});

	/** Terminate the Adhoc control library */
	sceNetAdhocctlTerm = createNativeFunction(0x9D689E13, 150, 'int', '', this, () => {
		return 0;
	});

	private connectHandlers = <Cancelable[]>[];

	/** Connect to the Adhoc control */
	sceNetAdhocctlConnect = createNativeFunction(0x0AD043ED, 150, 'int', 'string', this, (name: string) => {
		this.currentName = name;

		this.connectHandlers.push(this.context.netManager.onopen.add(() => {
			this.currentState = State.Connected;
			this._notifyAdhocctlHandler(Event.Connected);
		}));
		this.connectHandlers.push(this.context.netManager.onclose.add(() => {
			this.currentState = State.Disconnected;
			this._notifyAdhocctlHandler(Event.Disconnected);
		}));
		if (this.context.netManager.connected) {
			this.currentState = State.Connected;
			this._notifyAdhocctlHandler(Event.Connected);
		}
		this.context.netManager.connectOnce();
		return 0;
	});

	/** Disconnect from the Adhoc control */
	sceNetAdhocctlDisconnect = createNativeFunction(0x34401D65, 150, 'int', '', this, () => {
		while (this.connectHandlers.length) this.connectHandlers.shift().cancel();
		return 0;
	});

	private handlers = new UidCollection<HandlerCallback>(1);

	sceNetAdhocctlAddHandler = createNativeFunction(0x20B317A0, 150, 'int', 'int/int', this, (callback: number, parameter: number) => {
		return this.handlers.allocate(new HandlerCallback(callback, parameter));
	});

	sceNetAdhocctlDelHandler = createNativeFunction(0x6402490B, 150, 'int', 'int', this, (handler: number) => {
		this.handlers.remove(handler);
		return 0;
	});

	sceNetAdhocctlGetState = createNativeFunction(0x75ECD386, 150, 'int', 'void*', this, (stateOut: Stream) => {
		stateOut.writeInt32(this.currentState);
		return 0;
	});

	private _notifyAdhocctlHandler(event: Event, error = <SceKernelErrors>0) {
		this.handlers.list().forEach(callback => {
			this.context.callbackManager.executeLater(callback.callback, [event, error, callback.argument]);
			//this.context.interop.execute(this.context.threadManager.current.state, callback.callback, [event, error, callback.argument]);
		});
	}
}

class HandlerCallback {
	constructor(public callback: number, public argument: number) {
	}
}


enum State {
	Disconnected = 0,
	Connected = 1,
	Scan = 2,
	Game = 3,
	Discover = 4,
	Wol = 5,
}

enum Mode {
	Normal = 0,
	GameMode = 1,
	None = -1,
}


enum Event {
	Error = 0,
	Connected = 1,
	Disconnected = 2,
	Scan = 3,
	Game = 4,
	Discover = 5,
	Wol = 6,
	WolInterrupted = 7,
}


var NICK_NAME_LENGTH = 128;
var GROUP_NAME_LENGTH = 8;
var IBSS_NAME_LENGTH = 6;
var ADHOC_ID_LENGTH = 9;
var MAX_GAME_MODE_MACS = 16;

