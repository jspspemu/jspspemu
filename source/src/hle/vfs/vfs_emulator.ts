import _vfs = require('./vfs'); _vfs.Vfs;

import _context = require('../../context');

export class EmulatorVfs extends _vfs.Vfs {
	output = '';
	screenshot:Uint8Array = null;

	constructor(public context:_context.EmulatorContext) {
		super();
	}

	devctlAsync(command: EmulatorDevclEnum, input: Stream, output: Stream) {
		switch (command) {
			case EmulatorDevclEnum.GetHasDisplay:
				if (output) output.writeInt32(0);
				//output.writeInt32(1);
				break;
			case EmulatorDevclEnum.SendOutput:
				var str = input.readString(input.length);
				this.output += str;
				this.context.onStdout.dispatch(str);
				if (typeof $ != 'undefined') $('#output').append(str);
				//console.info();
				break;
			case EmulatorDevclEnum.IsEmulator:
				return 0; // Running on emulator
			case EmulatorDevclEnum.EmitScreenshot:
				this.screenshot = input.toUInt8Array();
				console.warn('emit screenshot!');
				return 0;
			default:
				throw (new Error("Can't handle EmulatorVfs devctlAsync. Command '" + command + "'"));
		}

		return 0;
	}
}

export enum EmulatorDevclEnum
{
	GetHasDisplay = 0x00000001,
	SendOutput = 0x00000002,
	IsEmulator = 0x00000003,
	SendCtrlData = 0x00000010,
	EmitScreenshot = 0x00000020,
}
