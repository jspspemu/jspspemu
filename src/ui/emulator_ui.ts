import {PromiseFast} from "../global/utils";

export class EmulatorUI {
	static openMessageAsync(message: string) {
		alert(message);
		return PromiseFast.resolve(true);
	}
}