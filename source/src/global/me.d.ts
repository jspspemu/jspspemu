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
    decodeAudioFramesAndFree(channels: number, rate: number): Int16Array[];
    decodeAudio(channels: number, rate: number): Int16Array;
    decodeAudioAndFree(channels: number, rate: number): Int16Array;
    free(): void;
}
export  class MeStream {
    state: ME_DecodeState;
    onclose: (stream: MeStream) => void;
    constructor(state: ME_DecodeState, onclose?: (stream: MeStream) => void);
    close(): void;
    readPacket(): MePacket;
    static open(name: string, onclose?: (stream: MeStream) => void): MeStream;
    private static index;
    static openData(data: Uint8Array, onclose?: (stream: MeStream) => void): MeStream;
}

}