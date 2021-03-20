import * as _sceNetAdhocMatching from './sceNetAdhocMatching';
import * as _utils from '../utils';
import * as _context from '../../context';
import * as _manager from '../manager';
import { SceKernelErrors } from '../SceKernelErrors';
import nativeFunction = _utils.nativeFunction;
import EmulatorContext = _context.EmulatorContext;
import MemoryPartition = _manager.MemoryPartition;
import Thread = _manager.Thread;
import {Stream} from "../../global/stream";
import {Cancelable, UidCollection} from "../../global/utils";

export class sceNetAdhocctl {
	constructor(private context: _context.EmulatorContext) { }

	private currentState = State.Disconnected;
	private currentName = "noname";

	public ws: WebSocket;

	/** Initialise the Adhoc control library */
	@nativeFunction(0xE26F226E, 150, 'int', 'int/int/void*')
	sceNetAdhocctlInit(stacksize: number, priority: number, product: Stream) {
		this.currentState = State.Disconnected;
		return 0;
	}

	/** Terminate the Adhoc control library */
	@nativeFunction(0x9D689E13, 150, 'int', '')
	sceNetAdhocctlTerm() {
		return 0;
	}

	private connectHandlers = <Cancelable[]>[];

	/** Connect to the Adhoc control */
	@nativeFunction(0x0AD043ED, 150, 'int', 'string')
	sceNetAdhocctlConnect(name: string) {
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
	}

	/** Disconnect from the Adhoc control */
	@nativeFunction(0x34401D65, 150, 'int', '')
	sceNetAdhocctlDisconnect() {
		while (this.connectHandlers.length) this.connectHandlers.shift().cancel();
		return 0;
	}

	private handlers = new UidCollection<HandlerCallback>(1);

	@nativeFunction(0x20B317A0, 150, 'int', 'int/int')
	sceNetAdhocctlAddHandler(callback: number, parameter: number) {
		return this.handlers.allocate(new HandlerCallback(callback, parameter));
	}

	@nativeFunction(0x6402490B, 150, 'int', 'int')
	sceNetAdhocctlDelHandler(handler: number) {
		this.handlers.remove(handler);
		return 0;
	}

	@nativeFunction(0x75ECD386, 150, 'int', 'void*')
	sceNetAdhocctlGetState(stateOut: Stream) {
		stateOut.writeInt32(this.currentState);
		return 0;
	}

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

