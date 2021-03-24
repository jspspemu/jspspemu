/** license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
'use strict';

class Huffman {
    constructor(public data: Uint32Array, public max: number, public min: number) {
    }

    static buildHuffmanTable(lengths: Uint8Array): Huffman {
        const listSize = lengths.length
        let maxCodeLength = 0
        let minCodeLength = Number.POSITIVE_INFINITY
        
        for (let i = 0, il = listSize; i < il; ++i) {
            if (lengths[i] > maxCodeLength) maxCodeLength = lengths[i]
            if (lengths[i] < minCodeLength) minCodeLength = lengths[i]
        }

        const size = 1 << maxCodeLength
        const table = new Uint32Array(size)

        for (let bitLength = 1, code = 0, skip = 2; bitLength <= maxCodeLength;) {
            for (let i = 0; i < listSize; ++i) {
                if (lengths[i] === bitLength) {
                    let reversed = 0 
                    for (let rtemp = code, j = 0; j < bitLength; ++j) {
                        reversed = (reversed << 1) | (rtemp & 1)
                        rtemp >>= 1
                    }
                    const value = (bitLength << 16) | i;
                    for (let j = reversed; j < size; j += skip) table[j] = value
                    ++code
                }
            }
            ++bitLength
            code <<= 1
            skip <<= 1
        }

        return new Huffman(table, maxCodeLength, minCodeLength)
    }
}

const ZLIB_RAW_INFLATE_BUFFER_SIZE = 0x8000

class RawInflate {
    buffer: Uint8Array = new Uint8Array(0)
    blocks: Uint8Array[] = []
    currentLitlenTable?: Huffman
    bufferSize = ZLIB_RAW_INFLATE_BUFFER_SIZE
    ip = 0
    bitsbuf = 0
    bitsbuflen = 0
    output = new Uint8Array(this.bufferSize)
    op = 0
    bfinal = false

    constructor(public input: Uint8Array) {
    }

    decompress() {
        while (!this.bfinal) {
            this.parseBlock()
        }

        return this.concatBufferDynamic()
    }

    static Order = new Uint16Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
    static LengthCodeTable = new Uint16Array([
        0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000a, 0x000b,
        0x000d, 0x000f, 0x0011, 0x0013, 0x0017, 0x001b, 0x001f, 0x0023, 0x002b,
        0x0033, 0x003b, 0x0043, 0x0053, 0x0063, 0x0073, 0x0083, 0x00a3, 0x00c3,
        0x00e3, 0x0102, 0x0102, 0x0102
    ])
    static LengthExtraTable = new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
        5, 5, 0, 0, 0
    ])
    static DistCodeTable = new Uint16Array([
        0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0007, 0x0009, 0x000d, 0x0011,
        0x0019, 0x0021, 0x0031, 0x0041, 0x0061, 0x0081, 0x00c1, 0x0101, 0x0181,
        0x0201, 0x0301, 0x0401, 0x0601, 0x0801, 0x0c01, 0x1001, 0x1801, 0x2001,
        0x3001, 0x4001, 0x6001
    ])
    static DistExtraTable = new Uint8Array([
        0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
        11, 12, 12, 13, 13
    ])

    static FixedLiteralLengthTable = (() => {
        const lengths = new Uint8Array(288)
        for (let i = 0, il = lengths.length; i < il; ++i) lengths[i] = (i <= 143) ? 8 : (i <= 255) ? 9 : (i <= 279) ? 7 : 8
        return Huffman.buildHuffmanTable(lengths)
    })()

    static FixedDistanceTable = (() => {
        const lengths = new Uint8Array(30)
        for (let i = 0, il = lengths.length; i < il; ++i) lengths[i] = 5
        return Huffman.buildHuffmanTable(lengths)
    })()
    
    parseBlock() {
        let hdr = this.readBits(3)
        if (hdr & 0x1) this.bfinal = true
        hdr >>>= 1
        switch (hdr) {
            case 0: this.parseUncompressedBlock(); break
            case 1: this.parseFixedHuffmanBlock(); break
            case 2: this.parseDynamicHuffmanBlock(); break
            default: throw new Error(`unknown BTYPE: ${hdr}`)
        }
    }

    readBits(length: number) {
        let bitsbuf = this.bitsbuf
        let bitsbuflen = this.bitsbuflen
        const input = this.input
        let ip = this.ip
        const inputLength = input.length
        if (ip + ((length - bitsbuflen + 7) >> 3) >= inputLength) throw new Error('input buffer is broken')
        while (bitsbuflen < length) {
            bitsbuf |= input[ip++] << bitsbuflen
            bitsbuflen += 8
        }
        const octet = bitsbuf & ((1 << length) - 1)
        bitsbuf >>>= length
        bitsbuflen -= length
    
        this.bitsbuf = bitsbuf
        this.bitsbuflen = bitsbuflen
        this.ip = ip
    
        return octet
    }
    
    readCodeByTable(table: Huffman) {
        let bitsbuf = this.bitsbuf
        let bitsbuflen = this.bitsbuflen
        let ip = this.ip
        const input = this.input
        const inputLength = input.length
        const codeTable = table.data
        const maxCodeLength: number = table.max
        while (bitsbuflen < maxCodeLength) {
            if (ip >= inputLength) break
            bitsbuf |= input[ip++] << bitsbuflen
            bitsbuflen += 8
        }
        const codeWithLength = codeTable[bitsbuf & ((1 << maxCodeLength) - 1)]
        const codeLength = codeWithLength >>> 16
        if (codeLength > bitsbuflen) throw new Error(`invalid code length: ${codeLength}`)
        this.bitsbuf = bitsbuf >> codeLength
        this.bitsbuflen = bitsbuflen - codeLength
        this.ip = ip
        return codeWithLength & 0xffff
    }
    
    parseUncompressedBlock() {
        const input = this.input
        let ip = this.ip
        let output = this.output
        let op = this.op
        const inputLength = input.length
        this.bitsbuf = 0
        this.bitsbuflen = 0
        if (ip + 1 >= inputLength) throw new Error('invalid uncompressed block header: LEN')
        const len = input[ip++] | (input[ip++] << 8)
        if (ip + 1 >= inputLength) throw new Error('invalid uncompressed block header: NLEN')
        const nlen = input[ip++] | (input[ip++] << 8)
        if (len === ~nlen) throw new Error('invalid uncompressed block header: length verify')
        if (ip + len > input.length) throw new Error('input buffer is broken')
        while (op + len > output.length) output = this.expandBufferAdaptive(2)
        output.set(input.subarray(ip, ip + len), op)
        op += len
        ip += len
        this.ip = ip
        this.op = op
        this.output = output
    }
    
    parseFixedHuffmanBlock() {
        this.decodeHuffmanAdaptive(RawInflate.FixedLiteralLengthTable, RawInflate.FixedDistanceTable);
    }
    
    parseDynamicHuffmanBlock() {
        const hlit = this.readBits(5) + 257;
        const hdist = this.readBits(5) + 1;
        const hclen = this.readBits(4) + 4;
        const codeLengths = new Uint8Array(RawInflate.Order.length);
        let prev = 0

        for (let i = 0; i < hclen; ++i) codeLengths[RawInflate.Order[i]] = this.readBits(3)

        const codeLengthsTable = Huffman.buildHuffmanTable(codeLengths);
        const lengthTable = new Uint8Array(hlit + hdist)
        for (let i = 0, il = hlit + hdist; i < il;) {
            const code = this.readCodeByTable(codeLengthsTable);
            switch (code) {
                case 16: {
                    let repeat = 3 + this.readBits(2)
                    while (repeat--) lengthTable[i++] = prev
                    break
                }
                case 17: {
                    let repeat = 3 + this.readBits(3)
                    while (repeat--) lengthTable[i++] = 0
                    prev = 0
                    break
                }
                case 18: {
                    let repeat = 11 + this.readBits(7)
                    while (repeat--) lengthTable[i++] = 0
                    prev = 0
                    break
                }
                default:
                    lengthTable[i++] = code
                    prev = code
                    break
            }
        }
    
        const litlenTable = Huffman.buildHuffmanTable(lengthTable.subarray(0, hlit))
        const distTable = Huffman.buildHuffmanTable(lengthTable.subarray(hlit))

        this.decodeHuffmanAdaptive(litlenTable, distTable)
    }
    decodeHuffmanAdaptive(litlen: Huffman, dist: Huffman) {
        let output = this.output
        let op = this.op
        let code = 0
        let olength = output.length
        this.currentLitlenTable = litlen
        const lengthCodeTable = RawInflate.LengthCodeTable
        const lengthExtraTable = RawInflate.LengthExtraTable
        const distCodeTable = RawInflate.DistCodeTable
        const distExtraTable = RawInflate.DistExtraTable

        while ((code = this.readCodeByTable(litlen)) !== 256) {
            if (code < 256) {
                if (op >= olength) {
                    output = this.expandBufferAdaptive()
                    olength = output.length
                }
                output[op++] = code
                continue
            }
    
            const ti = code - 257
            let codeLength = lengthCodeTable[ti]
            if (lengthExtraTable[ti] > 0) codeLength += this.readBits(lengthExtraTable[ti])

            code = this.readCodeByTable(dist)
            let codeDist = distCodeTable[code]
            if (distExtraTable[code] > 0) codeDist += this.readBits(distExtraTable[code])

            if (op + codeLength > olength) {
                output = this.expandBufferAdaptive()
                olength = output.length
            }

            while (codeLength--) output[op] = output[(op++) - codeDist]
        }
    
        while (this.bitsbuflen >= 8) {
            this.bitsbuflen -= 8
            this.ip--
        }
        this.op = op
    }

    expandBufferAdaptive(ratio: number = (this.input.length / this.ip + 1) | 0) {
        const input = this.input;
        const output = this.output;

        let newSize: number
        if (ratio < 2) {
            const maxHuffCode = (input.length - this.ip) / this.currentLitlenTable!.min
            const maxInflateSize = (maxHuffCode / 2 * 258) | 0
            newSize = (maxInflateSize < output.length) ? (output.length + maxInflateSize) : (output.length << 1)
        } else {
            newSize = output.length * ratio;
        }
    
        const buffer = new Uint8Array(newSize)
        buffer.set(output)

        this.output = buffer
    
        return this.output
    }

    concatBufferDynamic() {
        let buffer;
        const op = this.op;
        buffer = this.output.subarray(0, op);
        this.buffer = buffer;
        return this.buffer;
    }
}

export function zlib_inflate_raw(data: Uint8Array): Uint8Array {
    return new RawInflate(data).decompress()
}
