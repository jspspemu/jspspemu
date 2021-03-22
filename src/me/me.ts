/*
import {Atrac3plusDecoder} from "./atrac3plus/Atrac3plusDecoder";

export class MeStream {
    constructor(public decoder: Atrac3plusDecoder) {
    }

    static open(bytes: Uint8Array): MeStream {
        const decoder = new Atrac3plusDecoder()
        const atracBytesPerFrame = 0x0230
        const atracChannels = 2
        const outputChannels = 2
        decoder.init(atracBytesPerFrame, atracChannels, outputChannels, 0)
        decoder.decode()
        return new MeStream(decoder)
    }

    close() {
        throw new Error("MeStream unimplemented")
    }

    seek(offset: number) {
        throw new Error("MeStream unimplemented")
    }

    readPacket(): MePacket {
        throw new Error("MeStream unimplemented")
    }
}

export class MePacket {
    free() {
        throw new Error("MeStream unimplemented")
    }

    decodeAudio(channels: number, rate: number): Int16Array {
        throw new Error("MeStream unimplemented")
    }
}
*/
