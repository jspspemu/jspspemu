﻿import "../../emu/global"

import {Signal1, UidCollection} from "../../global/utils";
import {Interop} from "./interop";
import {Thread} from "./thread";

export class CallbackManager {
	private uids = new UidCollection<Callback>(1);
	private notifications = <CallbackNotification[]>[];
	public onAdded = new Signal1<number>();

	constructor(private interop:Interop) {
	}

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

	private normalCallbacks = <{ callback: number; args: number[] }[]>[];

	executeLater(callback: number, args: number[]) {
		this.normalCallbacks.push({ callback: callback, args: args });
	}

	notify(id: number, arg2: number) {
        const callback = this.get(id);
        //if (!callback) throw(new Error("Can't find callback by id '" + id + "'"));
		this.notifications.push(new CallbackNotification(callback, arg2));
		this.onAdded.dispatch(this.notifications.length);
	}

	executeLaterPendingWithinThread(thread: Thread) {
        // noinspection UnnecessaryLocalVariableJS
        const state = thread.state;

        while (this.normalCallbacks.length > 0) {
            const normalCallback = this.normalCallbacks.shift()!;
            this.interop.execute(state, normalCallback.callback, normalCallback.args);
		}
	}

	executePendingWithinThread(thread: Thread) {
        const state = thread.state;
        let count = 0;

        this.executeLaterPendingWithinThread(thread);

		while (this.notifications.length > 0) {
            const notification = this.notifications.shift()!

            this.interop.execute(
				state,
				notification.callback.funcptr,
				[1, notification.arg2, notification.callback.argument]
			);

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