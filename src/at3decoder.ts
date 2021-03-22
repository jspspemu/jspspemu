///<reference path="../node_modules/@types/node/index.d.ts" />
///<reference path="../node_modules/@types/jsdom/ts3.5/index.d.ts" />

import {Atrac3PlusUtil, AtracFileInfo} from "./me/atrac3plus/Atrac3PlusUtil";
import * as fs from "fs";
import {GrowableStream, MemoryAsyncStream, Stream} from "./global/stream";
import {Atrac3plusDecoder} from "./me/atrac3plus/Atrac3plusDecoder";
import {IMemory} from "./me/MeUtils";

type Int = number

//const fileName = "c:\\temp\\bgm01.at3"
const fileName = "c:\\temp\\bgm012.at3"
const s = fs.readFileSync(fileName)
const info = new AtracFileInfo()
Atrac3PlusUtil.analyzeRiffFile(Stream.fromUint8Array(s), 0, s.length, info)
console.info(info)

const out = new GrowableStream()
const decoder = new Atrac3plusDecoder()
const nchannels = 1
decoder.init(info.atracBytesPerFrame, info.atracChannels, nchannels, 0)

class MyMemory implements IMemory {
    constructor(public s: Uint8Array) {
    }

    read8(addr: Int): Int {
        return this.s[addr]
    }
}

const mem = new MyMemory(s);

let ipos = info.inputFileDataOffset
while (true) {
    const res = decoder.decode(mem, ipos, s.length, out)
    console.log(`res: ${res}`)
    if (res <= 10) break
    ipos += info.atracBytesPerFrame
}
fs.writeFileSync("c:/temp/jspspemu.atrac3plus.raw", out.toByteArray())
