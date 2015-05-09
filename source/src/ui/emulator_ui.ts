///<reference path="../global.d.ts" />

export class EmulatorUI {
	static openMessageAsync(message: string) {
		alert(message);
		return Promise2.resolve(true);
	}
}