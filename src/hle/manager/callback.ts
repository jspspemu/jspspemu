import _thread = require('./thread');
import _cpu = require('../../core/cpu');
import Signal = require('../../util/Signal');

import CpuState = _cpu.CpuState;
import Thread = _thread.Thread;

export class CallbackManager {
	private uids = new UidCollection<Callback>(1);
	private notifications = <CallbackNotification[]>[];
	public onAdded = new Signal<number>();

	get hasPendingCallbacks() {
		return this.notifications.length > 0;
	}

	register(callback: Callback) {
		return this.uids.allocate(callback);
	}

	remove(id: number) {
		return this.uids.remove(id);
	}

	get(id: number) {
		return this.uids.get(id);
	}

	notify(id: number, arg2: number) {
		var callback = this.get(id);
		//if (!callback) throw(new Error("Can't find callback by id '" + id + "'"));
		this.notifications.push(new CallbackNotification(callback, arg2));
		this.onAdded.dispatch(this.notifications.length);
	}

	executePendingWithinThread(thread: Thread) {
		var state = thread.state;
		var count = 0;

		while (this.notifications.length > 0) {
			var notification = this.notifications.shift();

			state.preserveRegisters(() => {
				state.RA = 0x1234;
				state.gpr[4] = 1;
				state.gpr[5] = notification.arg2;
				state.gpr[6] = notification.callback.argument;
				state.callPCSafe(notification.callback.funcptr);
			});

			count++;
		}

		return (count > 0);
	}
}

export class CallbackNotification {
	constructor(public callback: Callback, public arg2: number) {
	}
}

export class Callback {
	public count = 0;

	constructor(public name: string, public funcptr: number, public argument: number) {
	}
}