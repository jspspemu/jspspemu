import _vfs = require('./vfs'); _vfs.Vfs;

export class EmulatorVfs extends _vfs.Vfs {
	output = '';

	devctlAsync(command: EmulatorDevclEnum, input: Stream, output: Stream) {
		switch (command) {
			case EmulatorDevclEnum.GetHasDisplay:
				output.writeInt32(0);
				//output.writeInt32(1);
				break;
			case EmulatorDevclEnum.SendOutput:
				var str = input.readString(input.length);
				this.output += str;
				$('#output').append(str);
				//console.info();
				break;
			case EmulatorDevclEnum.IsEmulator:
				//return Promise.resolve(1);
				//output.writeInt32(1);
				break;
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
