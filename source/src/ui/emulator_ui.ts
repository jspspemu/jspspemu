import {Promise2} from "../global/utils";

export class EmulatorUI {
	static openMessageAsync(message: string) {
		alert(message);
		return Promise2.resolve(true);
	}
}