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
        throw new Error();
    }
    static alloc(size: number): MeBuffer {
        throw new Error();
    }
    size: number;
    pointer: pointer;
    data: Uint8Array;
    datas16: Int16Array;
    free(): void {
        throw new Error();
    }
}
export  class MeString {
    name: string;
    ptr: pointer;
    constructor(name: string) {
        throw new Error();
    }
    free(): void {
        throw new Error();
    }
}
export  class MePacket {
    stream: MeStream;
    packet: ME_Packet;
    constructor(stream: MeStream, packet: ME_Packet) {
        throw new Error();
    }
    type: ME_MediaType;
    pts: number;
    dts: number;
    pos: number;
    duration: number;
    decodeAudioFramesAndFree(channels: number, rate: number): Int16Array[] {
        throw new Error();
    }
    decodeAudio(channels: number, rate: number): Int16Array {
        throw new Error();
    }
    decodeAudioAndFree(channels: number, rate: number): Int16Array {
        throw new Error();
    }
    free(): void {
        throw new Error();
    }
}
export  enum SeekType {
    Set = 0,
    Cur = 1,
    End = 2,
    Tell = 65536,
}
export  class CustomStream {
    name: string;
    static items: {
        [key: number]: CustomStream;
    };
    static lastId: number;
    static alloc(stream: CustomStream): number {
        throw new Error();
    }
    static free(id: number): void {
        throw new Error();
    }
    constructor(name?: string) {
        throw new Error();
    }
    read(buf: Uint8Array): number {
        throw new Error();
    }
    write(buf: Uint8Array): number {
        throw new Error();
    }
    private _position;
    length: number;
    available: number;
    position: number;
    _read(buf: Uint8Array): number {
        throw new Error();
    }
    _write(buf: Uint8Array): number {
        throw new Error();
    }
    _seek(offset: number, whence: SeekType): number {
        throw new Error();
    }
    close(): void {
        throw new Error();
    }
}
export  class MemoryCustomStream extends CustomStream {
    constructor(public data: Uint8Array) {
        super()
    }
    length: number;
    read(buf: Uint8Array): number {
        throw new Error();
    }
    write(buf: Uint8Array): number {
        throw new Error();
    }
    close(): void {
        throw new Error();
    }
}
export  class MeStream {
    customStream: CustomStream;
    state: ME_DecodeState;
    onclose: (stream: MeStream) => void;
    constructor(customStream: CustomStream, state: ME_DecodeState, onclose?: (stream: MeStream) => void) {
        throw new Error();
    }
    close(): void {
        throw new Error();
    }
    readPacket(): MePacket {
        throw new Error();
    }
    seek(timestamp: number): void {
        throw new Error();
    }
    position: number;
    length: number;
    static open(customStream: CustomStream): MeStream {
        throw new Error();
    }
    static openData(data: Uint8Array): MeStream {
        throw new Error();
    }
}
