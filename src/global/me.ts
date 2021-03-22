import {ProgramExitException} from "./utils";

export interface pointer {
    __pointer: string;
}
export  enum ME_MediaType {
    Unknown = -1,
    Video = 0,
    Audio = 1,
    Data = 2,
    Subtitle = 3,
    Attachment = 4,
    Nb = 5,
}
export interface ME_DecodeState {
    __ME_DecodeState: number;
}
export interface ME_Packet {
    __ME_Packet: number;
}
export interface ME_BufferData {
    __ME_BufferData: number;
}
export  class MeBuffer {
    constructor(public buffer: ME_BufferData) {
        throw new ProgramExitException('ME not implemented');
    }
    static alloc(size: number): MeBuffer {
        throw new ProgramExitException('ME not implemented');
    }
    size: number;
    pointer: pointer;
    data: Uint8Array;
    datas16: Int16Array;
    free(): void {
        throw new ProgramExitException('ME not implemented');
    }
}
export  class MeString {
    name: string;
    ptr: pointer;
    constructor(name: string) {
        throw new ProgramExitException('ME not implemented');
    }
    free(): void {
        throw new ProgramExitException('ME not implemented');
    }
}
export  class MePacket {
    stream: MeStream;
    packet: ME_Packet;
    constructor(stream: MeStream, packet: ME_Packet) {
        throw new ProgramExitException('ME not implemented');
    }
    type: ME_MediaType;
    pts: number;
    dts: number;
    pos: number;
    duration: number;
    decodeAudioFramesAndFree(channels: number, rate: number): Int16Array[] {
        throw new ProgramExitException('ME not implemented');
    }
    decodeAudio(channels: number, rate: number): Int16Array {
        throw new ProgramExitException('ME not implemented');
    }
    decodeAudioAndFree(channels: number, rate: number): Int16Array {
        throw new ProgramExitException('ME not implemented');
    }
    free(): void {
        throw new ProgramExitException('ME not implemented');
    }
}
export  enum SeekType {
    Set = 0,
    Cur = 1,
    End = 2,
    Tell = 65536,
}
export class CustomStream {
    name: string;
    static items: {
        [key: number]: CustomStream;
    };
    static lastId: number;
    static alloc(stream: CustomStream): number {
        throw new ProgramExitException('ME not implemented');
    }
    static free(id: number): void {
        throw new ProgramExitException('ME not implemented');
    }
    constructor(name?: string) {
        throw new ProgramExitException('ME not implemented');
    }
    read(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    write(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    private _position;
    length: number;
    available: number;
    position: number;
    _read(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    _write(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    _seek(offset: number, whence: SeekType): number {
        throw new ProgramExitException('ME not implemented');
    }
    close(): void {
        throw new ProgramExitException('ME not implemented');
    }
}
export  class MemoryCustomStream extends CustomStream {
    constructor(public data: Uint8Array) {
        super()
    }
    length: number;
    read(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    write(buf: Uint8Array): number {
        throw new ProgramExitException('ME not implemented');
    }
    close(): void {
        throw new ProgramExitException('ME not implemented');
    }
}
export  class MeStream {
    customStream: CustomStream;
    state: ME_DecodeState;
    onclose: (stream: MeStream) => void;
    constructor(customStream: CustomStream, state: ME_DecodeState, onclose?: (stream: MeStream) => void) {
        throw new ProgramExitException('ME not implemented');
    }
    close(): void {
        throw new ProgramExitException('ME not implemented');
    }
    readPacket(): MePacket {
        throw new ProgramExitException('ME not implemented');
    }
    seek(timestamp: number): void {
        throw new ProgramExitException('ME not implemented');
    }
    position: number;
    length: number;
    static open(customStream: CustomStream): MeStream {
        throw new ProgramExitException('ME not implemented');
    }
    static openData(data: Uint8Array): MeStream {
        throw new ProgramExitException('ME not implemented');
    }
}
