﻿import {Stream} from "../../global/stream";
import {PromiseFast} from "../../global/utils";
import {Vfs} from "./vfs";
import {EmulatorContext} from "../../emu/context";

export class EmulatorVfs extends Vfs {
	output = '';
	screenshot:Uint8Array|null = null;

	constructor(public context:EmulatorContext) {
		super();
	}

	devctlAsync(command: EmulatorDevclEnum, input: Stream, output: Stream):number | PromiseFast<number> {
		switch (command) {
			case EmulatorDevclEnum.GetHasDisplay:
				if (output) output.writeInt32(0);
				//output.writeInt32(1);
				break;
			case EmulatorDevclEnum.SendOutput:
                const str = input.readString(input.length);
				this.output += str;
				this.context.onStdout.dispatch(str);
				return PromiseFast.resolve(0)
				//return 0;
			case EmulatorDevclEnum.IsEmulator:
				return 0; // Running on emulator
			case EmulatorDevclEnum.EmitScreenshot:
				this.screenshot = input.toUInt8Array();
				console.warn('emit screenshot!');
				return 0;
			default:
				throw (new Error(`Can't handle EmulatorVfs devctlAsync. Command '${command}'`));
		}

		return 0;
	}
}

export const enum EmulatorDevclEnum
{
	GetHasDisplay = 0x00000001,
	SendOutput = 0x00000002,
	IsEmulator = 0x00000003,
	SendCtrlData = 0x00000010,
	EmitScreenshot = 0x00000020,
}
