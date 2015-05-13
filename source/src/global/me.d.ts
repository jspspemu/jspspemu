declare module MediaEngine {
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
    buffer: ME_BufferData;
    constructor(buffer: ME_BufferData);
    static alloc(size: number): MeBuffer;
    size: number;
    pointer: pointer;
    data: Uint8Array;
    datas16: Int16Array;
    free(): void;
}
export  class MeString {
    name: string;
    ptr: pointer;
    constructor(name: string);
    free(): void;
}
export  class MePacket {
    stream: MeStream;
    packet: ME_Packet;
    constructor(stream: MeStream, packet: ME_Packet);
    type: ME_MediaType;
    pts: number;
    dts: number;
    pos: number;
    duration: number;
    decodeAudioFramesAndFree(channels: number, rate: number): Int16Array[];
    decodeAudio(channels: number, rate: number): Int16Array;
    decodeAudioAndFree(channels: number, rate: number): Int16Array;
    free(): void;
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
    static alloc(stream: CustomStream): number;
    static free(id: number): void;
    constructor(name?: string);
    read(buf: Uint8Array): number;
    write(buf: Uint8Array): number;
    private _position;
    length: number;
    available: number;
    position: number;
    _read(buf: Uint8Array): number;
    _write(buf: Uint8Array): number;
    _seek(offset: number, whence: SeekType): number;
    close(): void;
}
export  class MemoryCustomStream extends CustomStream {
    data: Uint8Array;
    constructor(data: Uint8Array);
    length: number;
    read(buf: Uint8Array): number;
    write(buf: Uint8Array): number;
    close(): void;
}
export  class MeStream {
    customStream: CustomStream;
    state: ME_DecodeState;
    onclose: (stream: MeStream) => void;
    constructor(customStream: CustomStream, state: ME_DecodeState, onclose?: (stream: MeStream) => void);
    close(): void;
    readPacket(): MePacket;
    seek(timestamp: number): void;
    position: number;
    length: number;
    static open(customStream: CustomStream): MeStream;
    static openData(data: Uint8Array): MeStream;
}

}