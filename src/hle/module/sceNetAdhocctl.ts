import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceNetAdhocctl {
	constructor(private context: _context.EmulatorContext) { }

	private currentState = State.Disconnected;
	private currentName = "noname";

	/** Initialise the Adhoc control library */
	sceNetAdhocctlInit = createNativeFunction(0xE26F226E, 150, 'int', 'int/int/void*', this, (stacksize: number, priority: number, product: Stream) => {
		this.currentState = State.Disconnected;
		return 0;
	});

	/** Terminate the Adhoc control library */
	sceNetAdhocctlTerm = createNativeFunction(0x9D689E13, 150, 'int', '', this, () => {
		return 0;
	});

	/** Connect to the Adhoc control */
	sceNetAdhocctlConnect = createNativeFunction(0x0AD043ED, 150, 'int', 'string', this, (name: string) => {
		this.currentName = name;
		this.currentState = State.Connected;
		this._notifyAdhocctlHandler(Event.Connected);
		return 0;
	});

	private handlers = new UidCollection<HandlerCallback>(1);

	sceNetAdhocctlAddHandler = createNativeFunction(0x20B317A0, 150, 'int', 'int/int', this, (callback: number, parameter: number) => {
		return this.handlers.allocate(new HandlerCallback(callback, parameter));
	});

	sceNetAdhocctlGetState = createNativeFunction(0x75ECD386, 150, 'int', 'void*', this, (stateOut: Stream) => {
		stateOut.writeInt32(this.currentState);
		return 0;
	});

	private _notifyAdhocctlHandler(event: Event, error = <SceKernelErrors>0) {
		this.handlers.list().forEach(callback => {
			var state = this.context.threadManager.current.state;
			this.context.interop.execute(state, callback.callback, [event, error, callback.argument]);
		});
	}
}

class HandlerCallback {
	constructor(public callback: number, public argument: number) {
	}
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

var NICK_NAME_LENGTH = 128;
var GROUP_NAME_LENGTH = 8;
var IBSS_NAME_LENGTH = 6;
var ADHOC_ID_LENGTH = 9;
var MAX_GAME_MODE_MACS = 16;
