import "../global"
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
		var chunkSize = stream.readInt32();
		var chunkStream = stream.readStream(chunkSize);
		var chunkType = chunkStream.readString(4);
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
			var type = stream.readString(4);
			var length = stream.readInt32();
			var data = stream.readStream(length);
			console.info('subchunk', type, length, data);
			if (this.handlers[type] === undefined) throw (new Error("Don't know how to handle subchunk '" + type + "'"));
			(this.handlers[type])(data);
		}
	}

	static fromStreamWithHandlers(stream: Stream, handlers: StringDictionary<RiffSubchunkHandler>) {
		var riff = new Riff();
		for (var handlerName in handlers) riff.addHandler(handlerName, handlers[handlerName]);
		riff.load(stream);
		return riff;
	}
}
