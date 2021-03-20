import {PromiseFast} from "../global/utils";

export class EmulatorUI {
	static openMessageAsync(message: string) {
	    console.error(message)
		if (window.alert) window.alert(message);
		return PromiseFast.resolve(true);
	}
}