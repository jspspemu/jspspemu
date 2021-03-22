import "../emu/global"
import {Stream} from "../global/stream";
import {StringDictionary} from "../global/utils";

export interface RiffSubchunkHandler {
	(stream:Stream): void;
}

export class Riff {
	constructor() {
	}

	private handlers = <StringDictionary<RiffSubchunkHandler>>{};

	addHandler(name: string, handler: RiffSubchunkHandler) {
		this.handlers[name] = handler;
	}

	load(stream: Stream) {
		if (stream.readString(4) != 'RIFF') throw (new Error("Not a riff file"));
        const chunkSize = stream.readInt32();
        const chunkStream = stream.readStream(chunkSize);
        const chunkType = chunkStream.readString(4);
        switch (chunkType) {
			case 'WAVE':
				this.loadWave(chunkStream);
				break;
			default:
				throw(new Error("Don't know how to handle chunk '" + chunkType + "'"));
		}
	}

	private loadWave(stream: Stream) {
		while (stream.available > 0) {
            const type = stream.readString(4);
            const length = stream.readInt32();
            const data = stream.readStream(length);
            console.info('subchunk', type, length, data);
			if (this.handlers[type] === undefined) throw (new Error("Don't know how to handle subchunk '" + type + "'"));
			(this.handlers[type])(data);
		}
	}

	static fromStreamWithHandlers(stream: Stream, handlers: StringDictionary<RiffSubchunkHandler>) {
        const riff = new Riff();
        for (const handlerName in handlers) riff.addHandler(handlerName, handlers[handlerName]);
		riff.load(stream);
		return riff;
	}
}
