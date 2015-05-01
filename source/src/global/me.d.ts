declare module MediaEngine {
	export class Atrac3Decoder {
		constructor();
		channels: number;
		decodedSamples: number;
		initWithHeader(data: Uint8Array): void;
		decode(data: Uint8Array): Uint16Array;
		destroy():void;
	}
}
