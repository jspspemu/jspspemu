import {logger, sprintf} from "../global/utils";
import {Stream} from "../global/stream";
import {ArrayUtils} from "../global/math";

const log = logger.named("MeUtils")

type Int = number
type Float = number
type Double = number

export interface IMemory {
    read8(addr: Int): Int
}

export class CodecUtils {
    private static convertSampleFloatToInt16(sample: Float): Int {
        return Math.min(Math.max(Math.floor(sample * 32768 + 0.5), -32768), 32767) & 0xFFFF
    }

    static writeOutput(
        samples: Array<Float32Array>,
        output: Stream,
        numberOfSamples: Int,
        decodedChannels: Int,
        outputChannels: Int
    ) {
        switch (outputChannels) {
            case 1: {
                for (let i = 0; i < numberOfSamples; i++) {
                    const sample = this.convertSampleFloatToInt16(samples[0][i])
                    output.writeInt16LE(sample)
                }
                break;
            }
            case 2: {
                if (decodedChannels == 1) {
                    // Convert decoded mono into output stereo
                    for (let i = 0; i < numberOfSamples; i++) {
                        const sample = this.convertSampleFloatToInt16(samples[0][i])
                        output.writeInt16LE(sample)
                        output.writeInt16LE(sample)
                    }
                } else {
                    for (let i = 0; i < numberOfSamples; i++) {
                        const lsample = this.convertSampleFloatToInt16(samples[0][i])
                        const rsample = this.convertSampleFloatToInt16(samples[1][i])
                        output.writeInt16LE(lsample)
                        output.writeInt16LE(rsample)
                    }
                }
                break;
            }
        }
    }

    static avLog2(n: Int): Int {
        return (n == 0) ? 0 : 31 - Math.clz32(n)
    }
}

export interface IBitReader {
    read1(): Int
    readBool(): Boolean
    read(n: Int): Int
    peek(n: Int): Int
    skip(n: Int): void
}

export class BitBuffer implements IBitReader {
    constructor(private length: Int) {
    }

    // Store bits as ints for faster reading
    private bits: Int32Array = new Int32Array(this.length)
    private readIndex: Int = 0
    private writeIndex: Int = 0
    bitsRead: Int = 0
    bitsWritten: Int = 0

    get bytesRead() { return this.bitsRead >>> 3 }
    get bytesWritten() { return this.bitsWritten >>> 3 }

    read1(): Int {
        this.bitsRead++
        const bit = this.bits[this.readIndex]
        this.readIndex++
        if (this.readIndex >= this.bits.length) this.readIndex = 0
        return bit
    }

    read(_n: Int): Int {
        let n = _n;
        let value = 0;
        while (n > 0) {
            value = (value << 1) + this.read1()
            n--
        }
        return value
    }

    skip(n: Int) {
        this.bitsRead += n
        this.readIndex += n
        while (this.readIndex < 0) this.readIndex += this.bits.length
        while (this.readIndex >= this.bits.length) this.readIndex -= this.bits.length
    }

    writeBit(n: Int) {
        this.bits[this.writeIndex] = n
        this.writeIndex++
        this.bitsWritten++
        if (this.writeIndex >= this.bits.length) this.writeIndex = 0
    }

    writeByte(n: Int) {
        for (let bit = 7; bit >= 0; bit--) {
            this.writeBit((n >> bit) & 0x1)
        }
    }

    readBool(): Boolean { return this.read1() != 0 }

    peek(n: Int): Int {
        const read = this.read(n)
        this.skip(-n)
        return read
    }

    toString(): string {
        return sprintf("BitBuffer readIndex=%d, writeIndex=%d, readCount=%d", this.readIndex, this.writeIndex, this.bitsRead)
    }
}

export class BitReader implements IBitReader {
    constructor(
        public mem: IMemory,
        private addr: Int,
        private size: Int
    ) {
    }

    private initialAddr: Int = this.addr
    private initialSize: Int = this.size
    private bits: Int = 0
    private value: Int = 0
    private direction: Int = 1

    get bitsLeft(): Int { return (this.size << 3) + this.bits }

    get bytesRead(): Int {
        let bytesRead = this.addr - this.initialAddr;
        if (this.bits == 8) bytesRead--
        return bytesRead
    }

    get bitsRead(): Int { return (this.addr - this.initialAddr) * 8 - this.bits }

    readBool(): Boolean { return this.read1() != 0 }

    read1(): Int {
        if (this.bits <= 0) {
            this.value = this.mem.read8(this.addr)
            this.addr += this.direction
            this.size--
            this.bits = 8
        }
        const bit = this.value >> 7
        this.bits--
        this.value = (this.value << 1) & 0xFF

        return bit
    }

    read(_n: Int): Int {
        let n = _n;
        let read: Int;
        if (n <= this.bits) {
            read = this.value >> (8 - n)
            this.bits -= n
            this.value = (this.value << n) & 0xFF
        } else {
            read = 0
            while (n > 0) {
                read = (read << 1) + this.read1()
                n--
            }
        }

        return read
    }

    readByte(): Int {
        if (this.bits == 8) {
            this.bits = 0
            return this.value
        }
        if (this.bits > 0) {
            this.skip(this.bits)
        }
        const read = this.mem.read8(this.addr)
        this.addr += this.direction
        this.size--

        return read
    }

    peek(n: Int): Int {
        const read = this.read(n)
        this.skip(-n)
        return read
    }

    skip(n: Int) {
        this.bits -= n
        if (n >= 0) {
            while (this.bits < 0) {
                this.addr += this.direction
                this.size--
                this.bits += 8
            }
        } else {
            while (this.bits > 8) {
                this.addr -= this.direction
                this.size++
                this.bits -= 8
            }
        }

        if (this.bits > 0) {
            this.value = this.mem.read8(this.addr - this.direction)
            this.value = (this.value << (8 - this.bits)) & 0xFF
        }
    }

    seek(n: Int) {
        this.addr = this.initialAddr + n
        this.size = this.initialSize - n
        this.bits = 0
    }

    setDirection(direction: Int) {
        this.direction = direction
        this.bits = 0
    }

    byteAlign() {
        if (this.bits > 0 && this.bits < 8) {
            this.skip(this.bits)
        }
    }

    toString(): string {
        return sprintf("BitReader addr=0x%08X, bits=%d, size=0x%X, bits read %d", this.addr, this.bits, this.size, this.bitsRead)
    }
}

// Template for the Discrete Cosine Transform for 32 samples
export class Dct32 {
    /* tab[i][j] = 1.0 / (2.0 * cos(pi*(2*k+1) / 2^(6 - j))) */

    /* cos(i*pi/64) */

    static COS0_0 = (0.50060299823519630134 / 2)
    static COS0_1 = (0.50547095989754365998 / 2)
    static COS0_2 = (0.51544730992262454697 / 2)
    static COS0_3 = (0.53104259108978417447 / 2)
    static COS0_4 = (0.55310389603444452782 / 2)
    static COS0_5 = (0.58293496820613387367 / 2)
    static COS0_6 = (0.62250412303566481615 / 2)
    static COS0_7 = (0.67480834145500574602 / 2)
    static COS0_8 = (0.74453627100229844977 / 2)
    static COS0_9 = (0.83934964541552703873 / 2)
    static COS0_10 = (0.97256823786196069369 / 2)
    static COS0_11 = (1.16943993343288495515 / 4)
    static COS0_12 = (1.48416461631416627724 / 4)
    static COS0_13 = (2.05778100995341155085 / 8)
    static COS0_14 = (3.40760841846871878570 / 8)
    static COS0_15 = (10.19000812354805681150 / 32)

    static COS1_0 = (0.50241928618815570551 / 2)
    static COS1_1 = (0.52249861493968888062 / 2)
    static COS1_2 = (0.56694403481635770368 / 2)
    static COS1_3 = (0.64682178335999012954 / 2)
    static COS1_4 = (0.78815462345125022473 / 2)
    static COS1_5 = (1.06067768599034747134 / 4)
    static COS1_6 = (1.72244709823833392782 / 4)
    static COS1_7 = (5.10114861868916385802 / 16)

    static COS2_0 = (0.50979557910415916894 / 2)
    static COS2_1 = (0.60134488693504528054 / 2)
    static COS2_2 = (0.89997622313641570463 / 2)
    static COS2_3 = (2.56291544774150617881 / 8)

    static COS3_0 = (0.54119610014619698439 / 2)
    static COS3_1 = (1.30656296487637652785 / 4)

    static COS4_0 = (0.70710678118654752439 / 2)

    // butterfly operator
    private static BF(_val: Float32Array, a: Int, b: Int, c: Float, s: Int) {
        const tmp0 = _val[a] + _val[b]
        const tmp1 = _val[a] - _val[b]
        _val[a] = tmp0
        _val[b] = tmp1 * c * (1 << s)
    }

    private static BF0(tab: Float32Array, tabOffset: Int, _val: Float32Array, a: Int, b: Int, c: Float, s: Int) {
        const tmp0 = tab[tabOffset + a] + tab[tabOffset + b]
        const tmp1 = tab[tabOffset + a] - tab[tabOffset + b]
        _val[a] = tmp0
        _val[b] = tmp1 * c * (1 << s)
    }

    private static BF1(_val: Float32Array, a: Int, b: Int, c: Int, d: Int) {
        this.BF(_val, a, b, this.COS4_0, 1)
        this.BF(_val, c, d, -this.COS4_0, 1)
            _val[c] += _val[d]
    }

    private static BF2(_val: Float32Array, a: Int, b: Int, c: Int, d: Int) {
        this.BF(_val, a, b, this.COS4_0, 1)
        this.BF(_val, c, d, -this.COS4_0, 1)
        _val[c] += _val[d]
        _val[a] += _val[c]
        _val[c] += _val[b]
        _val[b] += _val[d]
    }

    private static ADD(_val: Float32Array, a: Int, b: Int) {
        _val[a] += _val[b]
    }

    // DCT32 without 1/sqrt(2) coef zero scaling.
    static dct32(out: Float32Array, outOffset: Int, tab: Float32Array, tabOffset: Int) {
        const _val = new Float32Array(32)

        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 0, 31, this.COS0_0, 1)
        this.BF0(tab, tabOffset, _val, 15, 16, this.COS0_15, 5)
        /* pass 2 */
        this.BF(_val, 0, 15, this.COS1_0, 1)
        this.BF(_val, 16, 31, -this.COS1_0, 1)
        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 7, 24, this.COS0_7, 1)
        this.BF0(tab, tabOffset, _val, 8, 23, this.COS0_8, 1)
        /* pass 2 */
        this.BF(_val, 7, 8, this.COS1_7, 4)
        this.BF(_val, 23, 24, -this.COS1_7, 4)
        /* pass 3 */
        this.BF(_val, 0, 7, this.COS2_0, 1)
        this.BF(_val, 8, 15, -this.COS2_0, 1)
        this.BF(_val, 16, 23, this.COS2_0, 1)
        this.BF(_val, 24, 31, -this.COS2_0, 1)
        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 3, 28, this.COS0_3, 1)
        this.BF0(tab, tabOffset, _val, 12, 19, this.COS0_12, 2)
        /* pass 2 */
        this.BF(_val, 3, 12, this.COS1_3, 1)
        this.BF(_val, 19, 28, -this.COS1_3, 1)
        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 4, 27, this.COS0_4, 1)
        this.BF0(tab, tabOffset, _val, 11, 20, this.COS0_11, 2)
        /* pass 2 */
        this.BF(_val, 4, 11, this.COS1_4, 1)
        this.BF(_val, 20, 27, -this.COS1_4, 1)
        /* pass 3 */
        this.BF(_val, 3, 4, this.COS2_3, 3)
        this.BF(_val, 11, 12, -this.COS2_3, 3)
        this.BF(_val, 19, 20, this.COS2_3, 3)
        this.BF(_val, 27, 28, -this.COS2_3, 3)
        /* pass 4 */
        this.BF(_val, 0, 3, this.COS3_0, 1)
        this.BF(_val, 4, 7, -this.COS3_0, 1)
        this.BF(_val, 8, 11, this.COS3_0, 1)
        this.BF(_val, 12, 15, -this.COS3_0, 1)
        this.BF(_val, 16, 19, this.COS3_0, 1)
        this.BF(_val, 20, 23, -this.COS3_0, 1)
        this.BF(_val, 24, 27, this.COS3_0, 1)
        this.BF(_val, 28, 31, -this.COS3_0, 1)

        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 1, 30, this.COS0_1, 1)
        this.BF0(tab, tabOffset, _val, 14, 17, this.COS0_14, 3)
        /* pass 2 */
        this.BF(_val, 1, 14, this.COS1_1, 1)
        this.BF(_val, 17, 30, -this.COS1_1, 1)
        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 6, 25, this.COS0_6, 1)
        this.BF0(tab, tabOffset, _val, 9, 22, this.COS0_9, 1)
        /* pass 2 */
        this.BF(_val, 6, 9, this.COS1_6, 2)
        this.BF(_val, 22, 25, -this.COS1_6, 2)
        /* pass 3 */
        this.BF(_val, 1, 6, this.COS2_1, 1)
        this.BF(_val, 9, 14, -this.COS2_1, 1)
        this.BF(_val, 17, 22, this.COS2_1, 1)
        this.BF(_val, 25, 30, -this.COS2_1, 1)

        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 2, 29, this.COS0_2, 1)
        this.BF0(tab, tabOffset, _val, 13, 18, this.COS0_13, 3)
        /* pass 2 */
        this.BF(_val, 2, 13, this.COS1_2, 1)
        this.BF(_val, 18, 29, -this.COS1_2, 1)
        /* pass 1 */
        this.BF0(tab, tabOffset, _val, 5, 26, this.COS0_5, 1)
        this.BF0(tab, tabOffset, _val, 10, 21, this.COS0_10, 1)
        /* pass 2 */
        this.BF(_val, 5, 10, this.COS1_5, 2)
        this.BF(_val, 21, 26, -this.COS1_5, 2)
        /* pass 3 */
        this.BF(_val, 2, 5, this.COS2_2, 1)
        this.BF(_val, 10, 13, -this.COS2_2, 1)
        this.BF(_val, 18, 21, this.COS2_2, 1)
        this.BF(_val, 26, 29, -this.COS2_2, 1)
        /* pass 4 */
        this.BF(_val, 1, 2, this.COS3_1, 2)
        this.BF(_val, 5, 6, -this.COS3_1, 2)
        this.BF(_val, 9, 10, this.COS3_1, 2)
        this.BF(_val, 13, 14, -this.COS3_1, 2)
        this.BF(_val, 17, 18, this.COS3_1, 2)
        this.BF(_val, 21, 22, -this.COS3_1, 2)
        this.BF(_val, 25, 26, this.COS3_1, 2)
        this.BF(_val, 29, 30, -this.COS3_1, 2)

        /* pass 5 */
        this.BF1(_val, 0, 1, 2, 3)
        this.BF2(_val, 4, 5, 6, 7)
        this.BF1(_val, 8, 9, 10, 11)
        this.BF2(_val, 12, 13, 14, 15)
        this.BF1(_val, 16, 17, 18, 19)
        this.BF2(_val, 20, 21, 22, 23)
        this.BF1(_val, 24, 25, 26, 27)
        this.BF2(_val, 28, 29, 30, 31)

        /* pass 6 */

        this.ADD(_val, 8, 12)
        this.ADD(_val, 12, 10)
        this.ADD(_val, 10, 14)
        this.ADD(_val, 14, 9)
        this.ADD(_val, 9, 13)
        this.ADD(_val, 13, 11)
        this.ADD(_val, 11, 15)

        out[outOffset + 0] = _val[0]
        out[outOffset + 16] = _val[1]
        out[outOffset + 8] = _val[2]
        out[outOffset + 24] = _val[3]
        out[outOffset + 4] = _val[4]
        out[outOffset + 20] = _val[5]
        out[outOffset + 12] = _val[6]
        out[outOffset + 28] = _val[7]
        out[outOffset + 2] = _val[8]
        out[outOffset + 18] = _val[9]
        out[outOffset + 10] = _val[10]
        out[outOffset + 26] = _val[11]
        out[outOffset + 6] = _val[12]
        out[outOffset + 22] = _val[13]
        out[outOffset + 14] = _val[14]
        out[outOffset + 30] = _val[15]

        this.ADD(_val, 24, 28)
        this.ADD(_val, 28, 26)
        this.ADD(_val, 26, 30)
        this.ADD(_val, 30, 25)
        this.ADD(_val, 25, 29)
        this.ADD(_val, 29, 27)
        this.ADD(_val, 27, 31)

        out[outOffset + 1] = _val[16] + _val[24]
        out[outOffset + 17] = _val[17] + _val[25]
        out[outOffset + 9] = _val[18] + _val[26]
        out[outOffset + 25] = _val[19] + _val[27]
        out[outOffset + 5] = _val[20] + _val[28]
        out[outOffset + 21] = _val[21] + _val[29]
        out[outOffset + 13] = _val[22] + _val[30]
        out[outOffset + 29] = _val[23] + _val[31]
        out[outOffset + 3] = _val[24] + _val[20]
        out[outOffset + 19] = _val[25] + _val[21]
        out[outOffset + 11] = _val[26] + _val[22]
        out[outOffset + 27] = _val[27] + _val[23]
        out[outOffset + 7] = _val[28] + _val[18]
        out[outOffset + 23] = _val[29] + _val[19]
        out[outOffset + 15] = _val[30] + _val[17]
        out[outOffset + 31] = _val[31]
    }
}


export class SineWin {
    static ff_sine_64 = new Float32Array(64)
    static ff_sine_128 = new Float32Array(128)
    static ff_sine_512 = new Float32Array(512)
    static ff_sine_1024 = new Float32Array(1024)

    private static sineWindowInit(window: Float32Array) {
        const n = window.length
        for (let i = 0; i < n; i++) {
            window[i] = Math.sin((i + 0.5) * (Math.PI / (2.0 * n)))
        }
    }

    static initFfSineWindows() {
        this.sineWindowInit(this.ff_sine_64)
        this.sineWindowInit(this.ff_sine_128)
        this.sineWindowInit(this.ff_sine_512)
        this.sineWindowInit(this.ff_sine_1024)
    }
}

export class FloatDSP {
    static vectorFmul(dst: Float32Array, dstOffset: Int, src0: Float32Array, src0Offset: Int, src1: Float32Array, src1Offset: Int, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] = src0[src0Offset + i] * src1[src1Offset + i]
        }
    }

    static vectorFmacScalar(dst: Float32Array, dstOffset: Int, src: Float32Array, srcOffset: Int, mul: Float, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] += src[srcOffset + i] * mul
        }
    }

    static vectorFmulScalar(dst: Float32Array, dstOffset: Int, src: Float32Array, srcOffset: Int, mul: Float, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] = src[srcOffset + i] * mul
        }
    }

    static vectorDmulScalar(dst: Float64Array, dstOffset: Int, src: Float64Array, srcOffset: Int, mul: Double, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] = src[srcOffset + i] * mul
        }
    }

    static vectorFmulWindow(dst: Float32Array, dstOffset: Int, src0: Float32Array, src0Offset: Int, src1: Float32Array, src1Offset: Int, win: Float32Array, winOffset: Int, len: Int) {
        dstOffset += len
        winOffset += len
        src0Offset += len
        let i = -len;
        let j = len - 1;
        while (i < 0) {
            const s0 = src0[src0Offset + i]
            const s1 = src1[src1Offset + j]
            const wi = win[winOffset + i]
            const wj = win[winOffset + j]
            dst[dstOffset + i] = s0 * wj - s1 * wi
            dst[dstOffset + j] = s0 * wi + s1 * wj
            i++
            j--
        }
    }

    static vectorFmulAdd(dst: Float32Array, dstOffset: Int, src0: Float32Array, src0Offset: Int, src1: Float32Array, src1Offset: Int, src2: Float32Array, src2Offset: Int, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] = src0[src0Offset + i] * src1[src1Offset + i] + src2[src2Offset + i]
        }
    }

    static vectorFmulReverse(dst: Float32Array, dstOffset: Int, src0: Float32Array, src0Offset: Int, src1: Float32Array, src1Offset: Int, len: Int) {
        for (let i = 0; i < len; i++) {
            dst[dstOffset + i] = src0[src0Offset + i] * src1[src1Offset + len - 1 - i]
        }
    }

    static butterflies(v1: Float32Array, v1Offset: Int, v2: Float32Array, v2Offset: Int, len: Int) {
        for (let i = 0; i < len; i++) {
            const t = v1[v1Offset + i] - v2[v2Offset + i]
            v1[v1Offset + i] += v2[v2Offset + i]
            v2[v2Offset + i] = t
        }
    }

    static scalarproduct(v1: Float32Array, v1Offset: Int, v2: Float32Array, v2Offset: Int, len: Int): Float {
        let p = 0;

        for (let i = 0; i < len; i++) {
            p += v1[v1Offset + i] * v2[v2Offset + i]
        }

        return p
    }
}

class VLCcode {
    bits: Int = 0
    symbol: Int = 0
    code: Int = 0

    compareTo(o: VLCcode): Int { return (this.code >>> 1) - (o.code >>> 1) }
}

export class VLC {
    bits: Int = 0
    table?: Int32Array[]
    tableSize: Int = 0
    tableAllocated: Int = 0

    initVLCSparse3(bits: Int32Array, codes: Int32Array, symbols: Int32Array): Int {
        return this.initVLCSparse(bits.length, codes.length, bits, codes, symbols)
    }

    initVLCSparse(nbBits: Int, nbCodes: Int, bits: Int32Array, codes: Int32Array, symbols?: Int32Array): Int {
        const buf = new Array<VLCcode>(nbCodes + 1)

        this.bits = nbBits

        let j = 0
        for (let i = 0; i < nbCodes; i++) {
            const vlCcode = new VLCcode()
            buf[j] = vlCcode
            vlCcode.bits = bits[i]
            if (vlCcode.bits <= nbBits) {
                continue
            }
            if (vlCcode.bits > 3 * nbBits || vlCcode.bits > 32) {
                log.error("Too long VLC (%d) in initVLC".format(vlCcode.bits))
                return -1
            }
            vlCcode.code = codes[i]
            if (vlCcode.code >= 1 << vlCcode.bits) {
                log.error("Invalid code in initVLC")
                return -1
            }
            vlCcode.code = vlCcode.code << (32 - vlCcode.bits)
            if (symbols != null) {
                vlCcode.symbol = symbols[i]
            } else {
                vlCcode.symbol = i
            }
            j++
        }

        this.Arrays_sort(buf, 0, j)

        for (let i = 0; i < nbCodes; i++) {
            const vlCcode = new VLCcode()
            buf[j] = vlCcode
            vlCcode.bits = bits[i]
            if (!(vlCcode.bits != 0 && vlCcode.bits <= nbBits)) {
                continue
            }
            vlCcode.code = codes[i]
            vlCcode.code = vlCcode.code << (32 - vlCcode.bits)
            if (symbols != null) {
                vlCcode.symbol = symbols[i]
            } else {
                vlCcode.symbol = i
            }
            j++
        }

        nbCodes = j

        return this.buildTable(nbBits, nbCodes, buf as Array<VLCcode>, 0)
    }

    private Arrays_sort<T>(buf: T[], fromIndex: Int, toIndex: Int) {
        const sorted = buf.copyOfRange(fromIndex, toIndex).sortedArray()
        arraycopy(sorted, 0, buf, fromIndex, toIndex - fromIndex)
    }

    private buildTable(tableNbBits: Int, nbCodes: Int, codes: Array<VLCcode>, codeOffset: Int): Int {
        const tableSize = 1 << tableNbBits
        if (tableNbBits > 30) {
            return -1
        }

        const tableIndex = this.allocTable(tableSize)
        if (tableIndex < 0) {
            return tableIndex
        }

        // first pass: map codes and compute auxiliary table sizes
        {
            var i = 0
            while (i < nbCodes) {
                var n = codes[codeOffset + i].bits
                var code = codes[codeOffset + i].code
                const symbol = codes[codeOffset + i].symbol
                if (n <= tableNbBits) {
                    // no need to add another table
                    var j = code >>> (32 - tableNbBits)
                    const nb = 1 << (tableNbBits - n)
                    const inc = 1
                    for (let k = 0; k < nb; k++) {
                        const bits = this.table!![tableIndex + j][1]
                        if (bits != 0 && bits != n) {
                            log.error("incorrect codes")
                            return -1
                        }
                        this.table!![tableIndex + j][1] = n //bits
                        this.table!![tableIndex + j][0] = symbol
                        j += inc
                    }
                } else {
                    // fill auxiliary table recursively
                    n -= tableNbBits
                    const codePrefix = code >>> (32 - tableNbBits)
                    let subtableBits = n;
                    codes[codeOffset + i].bits = n
                    codes[codeOffset + i].code = code << tableNbBits
                    let k: Int;
                    k = i + 1
                    while (k < nbCodes) {
                        n = codes[codeOffset + k].bits - tableNbBits
                        if (n <= 0) {
                            break
                        }
                        code = codes[codeOffset + k].code
                        if ((code >>> (32 - tableNbBits)) != codePrefix) {
                            break
                        }
                        codes[codeOffset + k].bits = n
                        codes[codeOffset + k].code = code << tableNbBits
                        subtableBits = Math.max(subtableBits, n)
                        k++
                    }
                    subtableBits = Math.min(subtableBits, tableNbBits)
                    this.table!![tableIndex + codePrefix][1] = -subtableBits
                    const index = this.buildTable(subtableBits, k - i, codes, codeOffset + i)
                    if (index < 0) {
                        return index
                    }
                    this.table!![tableIndex + codePrefix][0] = index //code
                    i = k - 1
                }
                i++
            }
        }

        for (let i = 0; i < tableSize; i++) {
            if (this.table!![tableIndex + i][1] == 0) { //bits
                this.table!![tableIndex + i][0] = -1 //codes
            }
        }

        return tableIndex
    }

    private allocTable(size: Int): Int {
        const index = this.tableSize

        this.tableSize += size
        this.tableAllocated = this.tableSize
        const newTable = ArrayUtils.create(this.tableAllocated, _ => new Int32Array(2))
        if (this.table != null) {
            for (let i = 0; i < index; i++) {
                newTable[i][0] = this.table!![i][0]
                newTable[i][1] = this.table!![i][1]
            }
        }
        this.table = newTable

        return index
    }

    /**
     * Parse a vlc code.
     * @param bits is the number of bits which will be read at once, must be
     * identical to nb_bits in init_vlc()
     * @param maxDepth is the number of times bits bits must be read to completely
     * read the longest vlc code
     * = (max_vlc_length + bits - 1) / bits
     */
    getVLC2(br: IBitReader, maxDepth: Int = 1): Int {
        var nbBits: Int
        var index = br.peek(this.bits)
        var code = this.table!![index][0]
        var n = this.table!![index][1]

        if (maxDepth > 1 && n < 0) {
            br.skip(this.bits)

            nbBits = -n

            index = br.peek(nbBits) + code
            code = this.table!![index][0]
            n = this.table!![index][1]
            if (maxDepth > 2 && n < 0) {
                br.skip(nbBits)

                nbBits = -n

                index = br.peek(nbBits) + code
                code = this.table!![index][0]
                n = this.table!![index][1]
            }
        }
        br.skip(n)

        return code
    }
}

export class FFT {
	nbits: Int = 0
	inverse: Boolean = false
	revtab = new Int32Array(0)
	tmpBuf = new Float32Array(0)
	mdctSize: Int = 0 // size of MDCT (i.e. number of input data * 2)
	mdctBits: Int = 0 // n = 2^nbits
	// pre/post rotation tables
	tcos = new Float32Array(0)
	tsin = new Float32Array(0)

	copy(that: FFT) {
		this.nbits = that.nbits
		this.inverse = that.inverse
		this.copyI(this.revtab, that.revtab)
		this.copyF(this.tmpBuf, that.tmpBuf)
		this.mdctSize = that.mdctSize
		this.mdctBits = that.mdctBits
		this.copyF(this.tcos, that.tcos)
		this.copyF(this.tsin, that.tsin)
	}

	copyI(dst: Int32Array, src: Int32Array) { dst.set(src) }
	copyF(dst: Float32Array, src: Float32Array) { dst.set(src) }

	private fftInit(nbits: Int, inverse: Boolean): Int {
		if (nbits < 2 || nbits > 16) {
            this.revtab = new Int32Array(0)
			this.tmpBuf = new Float32Array(0)
			return -1
		}

		this.nbits = nbits
		this.inverse = inverse

		const n = 1 << nbits
		this.revtab = new Int32Array(n)
		this.tmpBuf = new Float32Array(n * 2)

		FFT.initFfCosTabs(FFT.ff_cos_16, 16)
		FFT.initFfCosTabs(FFT.ff_cos_32, 32)
		FFT.initFfCosTabs(FFT.ff_cos_64, 64)
		FFT.initFfCosTabs(FFT.ff_cos_128, 128)
		FFT.initFfCosTabs(FFT.ff_cos_256, 256)
		FFT.initFfCosTabs(FFT.ff_cos_512, 512)

        for (let i = 0; i < n; i++) {
            this.revtab[-FFT.splitRadixPermutation(i, n, inverse) & (n - 1)] = i
		}

		return 0
	}

	mdctInit(nbits: Int, inverse: Boolean, scale: Double): Int {
		var scale = scale
		const n = 1 << nbits
        this.mdctBits = nbits
        this.mdctSize = n
        const n4 = n >> 2

        const ret = this.fftInit(this.mdctBits - 2, inverse)
		if (ret < 0) {
			return ret
		}

		this.tcos = new Float32Array(n4)
		this.tsin = new Float32Array(n4)

		const theta = 1.0 / 8.0 + ((scale < 0) ? n4 : 0)
		scale = Math.sqrt(Math.abs(scale))
        for (let i = 0; i < n4; i++) {
			const alpha = 2.0 * Math.PI * (i + theta) / n
            this.tcos[i] = (-Math.cos(alpha) * scale)
			this.tsin[i] = (-Math.sin(alpha) * scale)
		}

		return 0
	}

	/**
	 * Compute inverse MDCT of size N = 2^nbits
	 * @param output N samples
	 * @param input N/2 samples
	 */
	imdctCalc(output: Float32Array, outputOffset: Int, input: Float32Array, inputOffset: Int) {
		const n = 1 << this.mdctBits
		const n2 = n >> 1
		const n4 = n >> 2

		this.imdctHalf(output, outputOffset + n4, input, inputOffset)

        for (let k = 0; k < n4; k++) {
			output[outputOffset + k] = -output[outputOffset + n2 - k - 1]
			output[outputOffset + n - k - 1] = output[outputOffset + n2 + k]
		}
	}

	/**
	 * Compute the middle half of the inverse MDCT of size N = 2^nbits,
	 * thus excluding the parts that can be derived by symmetry
	 * @param output N/2 samples
	 * @param input N/2 samples
	 */
	imdctHalf(output: Float32Array, outputOffset: Int, input: Float32Array, inputOffset: Int) {
		const n = 1 << this.mdctBits
		const n2 = n >> 1
		const n4 = n >> 2
		const n8 = n >> 3

		// pre rotation
		var in1 = 0
		var in2 = n2 - 1
        for (let k = 0; k < n4; k++) {
			const j = this.revtab!![k]
            FFT.CMUL(output, outputOffset + j * 2, outputOffset + j * 2 + 1, input[inputOffset + in2], input[inputOffset + in1], this.tcos[k], this.tsin[k])
			in1 += 2
			in2 -= 2
		}
        this.fftCalcFloat(output, outputOffset)

		// post rotation + reordering
		const r = new Float32Array(4)
        for (let k = 0; k < n8; k++) {
			FFT.CMUL(r, 0, 3, output[outputOffset + (n8 - k - 1) * 2 + 1], output[outputOffset + (n8 - k - 1) * 2 + 0], this.tsin[n8 - k - 1], this.tcos[n8 - k - 1])
			FFT.CMUL(r, 2, 1, output[outputOffset + (n8 + k) * 2 + 1], output[outputOffset + (n8 + k) * 2 + 0], this.tsin[n8 + k], this.tcos[n8 + k])
			output[outputOffset + (n8 - k - 1) * 2 + 0] = r[0]
			output[outputOffset + (n8 - k - 1) * 2 + 1] = r[1]
			output[outputOffset + (n8 + k) * 2 + 0] = r[2]
			output[outputOffset + (n8 + k) * 2 + 1] = r[3]
		}
	}

	private fft4(z: Float32Array, o: Int) {
		// BF(t3, t1, z[0].re, z[1].re);
		// BF(t8, t6, z[3].re, z[2].re);
		// BF(z[2].re, z[0].re, t1, t6);
		// BF(t4, t2, z[0].im, z[1].im);
		// BF(t7, t5, z[2].im, z[3].im);
		// BF(z[3].im, z[1].im, t4, t8);
		// BF(z[3].re, z[1].re, t3, t7);
		// BF(z[2].im, z[0].im, t2, t5);
		const t3 = (z[o + 0] - z[o + 2])
		const t1 = (z[o + 0] + z[o + 2])
		const t8 = (z[o + 6] - z[o + 4])
		const t6 = (z[o + 6] + z[o + 4])
		z[o + 4] = (t1 - t6)
		z[o + 0] = (t1 + t6)
		const t4 = (z[o + 1] - z[o + 3])
		const t2 = (z[o + 1] + z[o + 3])
		const t7 = (z[o + 5] - z[o + 7])
		const t5 = (z[o + 5] + z[o + 7])
		z[o + 7] = (t4 - t8)
		z[o + 3] = (t4 + t8)
		z[o + 6] = (t3 - t7)
		z[o + 2] = (t3 + t7)
		z[o + 5] = (t2 - t5)
		z[o + 1] = (t2 + t5)
	}

	private fft8(z: Float32Array, o: Int) {
		this.fft4(z, o)

		// BF(t1, z[5].re, z[4].re, -z[5].re);
		// BF(t2, z[5].im, z[4].im, -z[5].im);
		// BF(t5, z[7].re, z[6].re, -z[7].re);
		// BF(t6, z[7].im, z[6].im, -z[7].im);
		var t1 = (z[o + 8] + z[o + 10])
		z[o + 10] = z[o + 8] - z[o + 10]
		var t2 = (z[o + 9] + z[o + 11])
		z[o + 11] = z[o + 9] - z[o + 11]
		var t5 = (z[o + 12] + z[o + 14])
		z[o + 14] = z[o + 12] - z[o + 14]
		var t6 = (z[o + 13] + z[o + 15])
		z[o + 15] = z[o + 13] - z[o + 15]

		// BUTTERFLIES(z[0],z[2],z[4],z[6]);
		var t3 = t5 - t1
		t5 = t5 + t1
		z[o + 8] = (z[o + 0] - t5)
		z[o + 0] = (z[o + 0] + t5)
		z[o + 13] = (z[o + 5] - t3)
		z[o + 5] = (z[o + 5] + t3)
		var t4 = t2 - t6
		t6 = t2 + t6
		z[o + 12] = (z[o + 4] - t4)
		z[o + 4] = (z[o + 4] + t4)
		z[o + 9] = (z[o + 1] - t6)
		z[o + 1] = (z[o + 1] + t6)

		// TRANSFORM(z[1],z[3],z[5],z[7],sqrthalf,sqrthalf);
		//   CMUL(t1, t2, a2.re, a2.im, wre, -wim);
		t1 = (z[o + 10] * FFT.sqrthalf + z[o + 11] * FFT.sqrthalf)
		t2 = (-z[o + 10] * FFT.sqrthalf + z[o + 11] * FFT.sqrthalf)
		//   CMUL(t5, t6, a3.re, a3.im, wre,  wim);
		t5 = (z[o + 14] * FFT.sqrthalf - z[o + 15] * FFT.sqrthalf)
		t6 = (z[o + 14] * FFT.sqrthalf + z[o + 15] * FFT.sqrthalf)
		//   BUTTERFLIES(a0,a1,a2,a3)
		t3 = t5 - t1
		t5 = t5 + t1
		z[o + 10] = (z[o + 2] - t5)
		z[o + 2] = (z[o + 2] + t5)
		z[o + 15] = (z[o + 7] - t3)
		z[o + 7] = (z[o + 7] + t3)
		t4 = t2 - t6
		t6 = t2 + t6
		z[o + 14] = (z[o + 6] - t4)
		z[o + 6] = (z[o + 6] + t4)
		z[o + 11] = (z[o + 3] - t6)
		z[o + 3] = (z[o + 3] + t6)
	}

	private pass(z: Float32Array, o: Int, cos: Float32Array, n: Int) {
		var o0 = o
		var o1 = o + 2 * n * 2
		var o2 = o + 4 * n * 2
		var o3 = o + 6 * n * 2
		var wre = 0
		var wim = 2 * n
		n--

		// TRANSFORM_ZERO(z[0],z[o1],z[o2],z[o3]);
		var t1 = z[o2 + 0]
		var t2 = z[o2 + 1]
		var t5 = z[o3 + 0]
		var t6 = z[o3 + 1]
		//   BUTTERFLIES(a0,a1,a2,a3)
		var t3 = t5 - t1
		t5 = t5 + t1
		z[o2 + 0] = (z[o0 + 0] - t5)
		z[o0 + 0] = (z[o0 + 0] + t5)
		z[o3 + 1] = (z[o1 + 1] - t3)
		z[o1 + 1] = (z[o1 + 1] + t3)
		var t4 = t2 - t6
		t6 = t2 + t6
		z[o3 + 0] = (z[o1 + 0] - t4)
		z[o1 + 0] = (z[o1 + 0] + t4)
		z[o2 + 1] = (z[o0 + 1] - t6)
		z[o0 + 1] = (z[o0 + 1] + t6)
		// TRANSFORM(z[1],z[o1+1],z[o2+1],z[o3+1],wre[1],wim[-1]);
		//   CMUL(t1, t2, a2.re, a2.im, wre, -wim);
		t1 = (z[o2 + 2] * cos[wre + 1] + z[o2 + 3] * cos[wim - 1])
		t2 = (-z[o2 + 2] * cos[wim - 1] + z[o2 + 3] * cos[wre + 1])
		//   CMUL(t5, t6, a3.re, a3.im, wre,  wim);
		t5 = (z[o3 + 2] * cos[wre + 1] - z[o3 + 3] * cos[wim - 1])
		t6 = (z[o3 + 2] * cos[wim - 1] + z[o3 + 3] * cos[wre + 1])
		//   BUTTERFLIES(a0,a1,a2,a3)
		t3 = t5 - t1
		t5 = t5 + t1
		z[o2 + 2] = (z[o0 + 2] - t5)
		z[o0 + 2] = (z[o0 + 2] + t5)
		z[o3 + 3] = (z[o1 + 3] - t3)
		z[o1 + 3] = (z[o1 + 3] + t3)
		t4 = t2 - t6
		t6 = t2 + t6
		z[o3 + 2] = (z[o1 + 2] - t4)
		z[o1 + 2] = (z[o1 + 2] + t4)
		z[o2 + 3] = (z[o0 + 3] - t6)
		z[o0 + 3] = (z[o0 + 3] + t6)

		do {
			o0 += 4
			o1 += 4
			o2 += 4
			o3 += 4
			wre += 2
			wim -= 2
			// TRANSFORM(z[0],z[o1],z[o2],z[o3],wre[0],wim[0]);
			//   CMUL(t1, t2, a2.re, a2.im, wre, -wim);
			t1 = (z[o2 + 0] * cos[wre] + z[o2 + 1] * cos[wim])
			t2 = (-z[o2 + 0] * cos[wim] + z[o2 + 1] * cos[wre])
			//   CMUL(t5, t6, a3.re, a3.im, wre,  wim);
			t5 = (z[o3 + 0] * cos[wre] - z[o3 + 1] * cos[wim])
			t6 = (z[o3 + 0] * cos[wim] + z[o3 + 1] * cos[wre])
			//   BUTTERFLIES(a0,a1,a2,a3)
			t3 = t5 - t1
			t5 = t5 + t1
			z[o2 + 0] = (z[o0 + 0] - t5)
			z[o0 + 0] = (z[o0 + 0] + t5)
			z[o3 + 1] = (z[o1 + 1] - t3)
			z[o1 + 1] = (z[o1 + 1] + t3)
			t4 = t2 - t6
			t6 = t2 + t6
			z[o3 + 0] = (z[o1 + 0] - t4)
			z[o1 + 0] = (z[o1 + 0] + t4)
			z[o2 + 1] = (z[o0 + 1] - t6)
			z[o0 + 1] = (z[o0 + 1] + t6)
			// TRANSFORM(z[1],z[o1+1],z[o2+1],z[o3+1],wre[1],wim[-1]);
			//   CMUL(t1, t2, a2.re, a2.im, wre, -wim);
			t1 = (z[o2 + 2] * cos[wre + 1] + z[o2 + 3] * cos[wim - 1])
			t2 = (-z[o2 + 2] * cos[wim - 1] + z[o2 + 3] * cos[wre + 1])
			//   CMUL(t5, t6, a3.re, a3.im, wre,  wim);
			t5 = (z[o3 + 2] * cos[wre + 1] - z[o3 + 3] * cos[wim - 1])
			t6 = (z[o3 + 2] * cos[wim - 1] + z[o3 + 3] * cos[wre + 1])
			//   BUTTERFLIES(a0,a1,a2,a3)
			t3 = t5 - t1
			t5 = t5 + t1
			z[o2 + 2] = (z[o0 + 2] - t5)
			z[o0 + 2] = (z[o0 + 2] + t5)
			z[o3 + 3] = (z[o1 + 3] - t3)
			z[o1 + 3] = (z[o1 + 3] + t3)
			t4 = t2 - t6
			t6 = t2 + t6
			z[o3 + 2] = (z[o1 + 2] - t4)
			z[o1 + 2] = (z[o1 + 2] + t4)
			z[o2 + 3] = (z[o0 + 3] - t6)
			z[o0 + 3] = (z[o0 + 3] + t6)
		} while (--n != 0)
	}

	private fft16(z: Float32Array, o: Int) {
		this.fft8(z, o)
		this.fft4(z, o + 16)
		this.fft4(z, o + 24)
		this.pass(z, o, FFT.ff_cos_16, 2)
	}

	private fft32(z: Float32Array, o: Int) {
		this.fft16(z, o)
		this.fft8(z, o + 32)
		this.fft8(z, o + 48)
		this.pass(z, o, FFT.ff_cos_32, 4)
	}

	private fft64(z: Float32Array, o: Int) {
		this.fft32(z, o)
		this.fft16(z, o + 64)
		this.fft16(z, o + 96)
		this.pass(z, o, FFT.ff_cos_64, 8)
	}

	private fft128(z: Float32Array, o: Int) {
		this.fft64(z, o)
		this.fft32(z, o + 128)
		this.fft32(z, o + 192)
		this.pass(z, o, FFT.ff_cos_128, 16)
	}

	private fft256(z: Float32Array, o: Int) {
		this.fft128(z, o)
		this.fft64(z, o + 256)
		this.fft64(z, o + 384)
		this.pass(z, o, FFT.ff_cos_256, 32)
	}

	private fft512(z: Float32Array, o: Int) {
		this.fft256(z, o)
		this.fft128(z, o + 512)
		this.fft128(z, o + 768)
		this.pass(z, o, FFT.ff_cos_512, 64)
	}

	fftCalcFloat(z: Float32Array, o: Int) {
		switch (this.nbits) {
            case 2: return this.fft4(z, 0)
            case 3: return this.fft8(z, o)
            case 4: return this.fft16(z, 0)
            case 5: return this.fft32(z, 0)
            case 6: return this.fft64(z, o)
            case 7: return this.fft128(z, o)
            case 8: return this.fft256(z, 0)
            case 9: return this.fft512(z, 0)
            default: log.error("FFT nbits=%d not implemented".format(this.nbits))
		}
	}

	/**
	 * Compute MDCT of size N = 2^nbits
	 */
	mdctCalc(output: Float32Array, outputOffset: Int, input: Float32Array, inputOffset: Int) {
		const n = 1 << this.mdctBits
		const n2 = n >> 1
		const n4 = n >> 2
		const n8 = n >> 3
		const n3 = 3 * n4

		// pre rotation
        for (let i = 0; i < n8; i++) {
			var re = -input[inputOffset + 2 * i + n3] - input[inputOffset + n3 - 1 - 2 * i]
			var im = -input[inputOffset + n4 + 2 * i] + input[inputOffset + n4 - 1 - 2 * i]
			var j = this.revtab!![i]
            FFT.CMUL(output, outputOffset + 2 * j + 0, outputOffset + 2 * j + 1, re, im, -this.tcos[i], this.tsin[i])

			re = input[inputOffset + 2 * i] - input[inputOffset + n2 - 1 - 2 * i]
			im = -input[inputOffset + n2 + 2 * i] - input[inputOffset + n - 1 - 2 * i]
			j = this.revtab!![n8 + i]
            FFT.CMUL(output, outputOffset + 2 * j + 0, outputOffset + 2 * j + 1, re, im, -this.tcos[n8 + i], this.tsin[n8 + i])
		}

        this.fftCalcFloat(output, outputOffset)

		// post rotation
		const r = new Float32Array(4)
        for (let i = 0; i < n8; i++) {
            FFT.CMUL(r, 3, 0, output[outputOffset + (n8 - i - 1) * 2 + 0], output[outputOffset + (n8 - i - 1) * 2 + 1], -this.tsin[n8 - i - 1], -this.tcos[n8 - i - 1])
            FFT.CMUL(r, 1, 2, output[outputOffset + (n8 + i) * 2 + 0], output[outputOffset + (n8 + i) * 2 + 1], -this.tsin[n8 + i], -this.tcos[n8 + i])
			output[outputOffset + (n8 - i - 1) * 2 + 0] = r[0]
			output[outputOffset + (n8 - i - 1) * 2 + 1] = r[1]
			output[outputOffset + (n8 + i) * 2 + 0] = r[2]
			output[outputOffset + (n8 + i) * 2 + 1] = r[3]
		}
	}


    static M_SQRT1_2 = 0.70710678118654752440 // 1/sqrt(2)
    private static sqrthalf = FFT.M_SQRT1_2
    private static ff_cos_16 = new Float32Array(16 / 2)
    private static ff_cos_32 = new Float32Array(32 / 2)
    private static ff_cos_64 = new Float32Array(64 / 2)
    private static ff_cos_128 = new Float32Array(128 / 2)
    private static ff_cos_256 = new Float32Array(256 / 2)
    private static ff_cos_512 = new Float32Array(512 / 2)

    private static initFfCosTabs(tab: Float32Array, m: Int) {
        const freq = 2 * Math.PI / m
        for (let i = 0; i <= m / 4; i++) {
            tab[i] = Math.cos(i * freq)
        }
        for (let i = 1; i < m / 4; i++) {
            tab[m / 2 - i] = tab[i]
        }
    }

    private static splitRadixPermutation(i: Int, n: Int, inverse: Boolean): Int {
        if (n <= 2) {
            return i & 1
        }
        let m = n >> 1;
        if ((i & m) == 0) {
            return this.splitRadixPermutation(i, m, inverse) * 2
        }
        m = m >> 1
        return this.splitRadixPermutation(i, m, inverse) * 4 + ((inverse == ((i & m) == 0)) ? 1 : -1)
    }

    private static CMUL(d: Float32Array, dre: Int, dim: Int, are: Float, aim: Float, bre: Float, bim: Float) {
        d[dre] = are * bre - aim * bim
        d[dim] = are * bim + aim * bre
    }
}
