import "../emu/global"
import {AsyncStream, Stream} from "../global/stream";
import {PromiseFast} from "../global/utils";

export function detectFormatAsync(asyncStream: AsyncStream): PromiseFast<string> {
	return asyncStream.readChunkAsync(0, 4).then((data):any => {
        const stream = Stream.fromArrayBuffer(data);
        if (stream.length < 4) {
			console.error(asyncStream);
			throw (new Error("detectFormatAsync: Buffer is too small (" + data.byteLength + ")"));
		}
        const magic = stream.readString(4);
        switch (magic) {
			case 'PK\u0001\u0002': 
			case 'PK\u0003\u0004':
			case 'PK\u0005\u0006':
				return 'zip';
			case '\u0000PBP': return 'pbp';
			case '\u007FELF': return 'elf';
			case '~PSP': return 'psp';
			case 'CISO': return 'ciso';
			case '\u0000\u0000\u0000\u0000':
				return asyncStream.readChunkAsync(0x10 * 0x800, 6).then(data => {
                    const stream = Stream.fromArrayBuffer(data);
                    const magic = stream.readString(6);
                    switch (magic) {
						case '\u0001CD001':
							return 'iso';
						default:
							throw `Unknown format. Magic: '${magic}'`;
					}
				});
			default:
				break;
		}
		throw `Unknown format. Magic: '${magic}'`;
	});
}
