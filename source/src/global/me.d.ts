declare module MediaEngine {
	enum MediaType {
		Unknown = -1,
		Video = 0,
		Audio = 1,
		Data = 2,
		Subtitle = 3,
		Attachment = 4,
		Nb = 5,
	}

	export class MeBuffer {
		static alloc(size: number): MeBuffer;
		size: number;
		data: Uint8Array;
		datas16: Int16Array;
		free():void;
	}
	
	export class MePacket {
		type: MediaType;
		decodeAudio(channels: number, rate: number): Int16Array;
		decodeAudioAndFree(channels: number, rate: number): Int16Array;
		free():void;
	}
	
	export class MeStream {
		close(): void;
		readPacket(): MePacket;
		static open(name: string, onclose?: (stream: MeStream) => void): MeStream;
		static openData(data: Uint8Array, onclose?: (stream: MeStream) => void): MeStream;
	}	
}

