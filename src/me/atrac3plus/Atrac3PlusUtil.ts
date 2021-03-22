/**
 * From JPCSP
 */
import {logger, sprintf} from "../../global/utils";
import {ArrayUtils} from "../../global/math";
import {Stream} from "../../global/stream";

type Int = number

const AT3_MAGIC = 0x0270 // "AT3"
const AT3_PLUS_MAGIC = 0xFFFE // "AT3PLUS"
const RIFF_MAGIC = 0x46464952 // "RIFF"
const WAVE_MAGIC = 0x45564157 // "WAVE"
const FMT_CHUNK_MAGIC = 0x20746D66 // "FMT "
const FACT_CHUNK_MAGIC = 0x74636166 // "FACT"
const SMPL_CHUNK_MAGIC = 0x6C706D73 // "SMPL"
const DATA_CHUNK_MAGIC = 0x61746164 // "DATA"

const ATRAC3_CONTEXT_READ_SIZE_OFFSET = 160
const ATRAC3_CONTEXT_REQUIRED_SIZE_OFFSET = 164
const ATRAC3_CONTEXT_DECODE_RESULT_OFFSET = 188

const PSP_ATRAC_ALLDATA_IS_ON_MEMORY = -1
const PSP_ATRAC_NONLOOP_STREAM_DATA_IS_ON_MEMORY = -2
const PSP_ATRAC_LOOP_STREAM_DATA_IS_ON_MEMORY = -3

const PSP_ATRAC_STATUS_NONLOOP_STREAM_DATA = 0
const PSP_ATRAC_STATUS_LOOP_STREAM_DATA = 1

const ATRAC_HEADER_HASH_LENGTH = 512
const ERROR_ATRAC_UNKNOWN_FORMAT = -0x7f9cfffa
const ERROR_ATRAC_INVALID_SIZE = -0x7f9cffef

const PSP_CODEC_AT3PLUS = 0x00001000
const PSP_CODEC_AT3 = 0x00001001
const PSP_CODEC_MP3 = 0x00001002
const PSP_CODEC_AAC = 0x00001003

const log = logger.named("Atrac3PlusUtil")

// noinspection JSMethodCanBeStatic
export class Atrac3PlusUtil {
    private readUnaligned32(mem: Stream, addr: Int): Int {
		mem.position = addr
		return mem.readInt32LE()
	}

	private read8(mem: Stream, addr: Int): Int {
		mem.position = addr
		return mem.readUInt8LE()
	}

	private read16(mem: Stream, addr: Int): Int {
		mem.position = addr
		return mem.readUInt16LE()
	}

	/**
	 * From JPCSP
	 */
	analyzeRiffFile(mem: Stream, addr: Int, length: Int, info: AtracFileInfo): Int {
        let result = ERROR_ATRAC_UNKNOWN_FORMAT;

        let currentAddr = addr;
        let bufferSize = length;
        info.atracEndSample = -1
		info.numLoops = 0
		info.inputFileDataOffset = 0

		if (bufferSize < 12) {
			log.error("Atrac buffer too small %d".format(bufferSize))
			return ERROR_ATRAC_INVALID_SIZE
		}

		// RIFF file format:
		// Offset 0: 'RIFF'
		// Offset 4: file length - 8
		// Offset 8: 'WAVE'
		const magic = this.readUnaligned32(mem, currentAddr)
		const WAVEMagic = this.readUnaligned32(mem, currentAddr + 8)
		if (magic != RIFF_MAGIC || WAVEMagic != WAVE_MAGIC) {
			//log.error(String_format("Not a RIFF/WAVE format! %s", Utilities.getMemoryDump(currentAddr, 16)))
            log.error("Not a RIFF/WAVE format!")
			return ERROR_ATRAC_UNKNOWN_FORMAT
		}

		info.inputFileSize = this.readUnaligned32(mem, currentAddr + 4) + 8
		info.inputDataSize = info.inputFileSize
		if (log.isTraceEnabled) {
            log.trace("FileSize 0x%X".format(info.inputFileSize))
		}
		currentAddr += 12
		bufferSize -= 12

		var foundData = false
		while (bufferSize >= 8 && !foundData) {
			const chunkMagic = this.readUnaligned32(mem, currentAddr)
			const chunkSize = this.readUnaligned32(mem, currentAddr + 4)
			currentAddr += 8
			bufferSize -= 8

			switch (chunkMagic) {
                case DATA_CHUNK_MAGIC: {
					foundData = true
					// Offset of the data chunk in the input file
					info.inputFileDataOffset = currentAddr - addr
					info.inputDataSize = chunkSize
                    if (log.isTraceEnabled) {
                        log.trace("DATA Chunk: data offset=0x%X, data size=0x%X".format(info.inputFileDataOffset, info.inputDataSize))
                    }
					break;
				}
				case FMT_CHUNK_MAGIC: {
					if (chunkSize >= 16) {
						const compressionCode = this.read16(mem, currentAddr)
						info.atracChannels = this.read16(mem, currentAddr + 2)
						info.atracSampleRate = this.readUnaligned32(mem, currentAddr + 4)
						info.atracBitrate = this.readUnaligned32(mem, currentAddr + 8)
						info.atracBytesPerFrame = this.read16(mem, currentAddr + 12)
						const hiBytesPerSample = this.read16(mem, currentAddr + 14)
						const extraDataSize = this.read16(mem, currentAddr + 16)
						if (extraDataSize == 14) {
							info.atracCodingMode = this.read16(mem, currentAddr + 18 + 6)
						}
						if (log.isTraceEnabled) {
							log.trace("WAVE format: magic=0x%08X('%s'), chunkSize=%d, compressionCode=0x%04X, channels=%d, sampleRate=%d, bitrate=%d, bytesPerFrame=0x%X, hiBytesPerSample=%d, codingMode=%d".format(chunkMagic, this.getStringFromInt32(chunkMagic), chunkSize, compressionCode, info.atracChannels, info.atracSampleRate, info.atracBitrate, info.atracBytesPerFrame, hiBytesPerSample, info.atracCodingMode))
							// Display rest of chunk as debug information
							let restChunk = ''
							for (let i = 16; i < chunkSize; i++) {
								const b = this.read8(mem, currentAddr + i)
								restChunk += " %02X".format(b)
							}
							if (restChunk.length > 0) {
								log.trace("Additional chunk data:%s".format(restChunk))
							}
						}

						if (compressionCode == AT3_MAGIC) {
							result = PSP_CODEC_AT3
						} else if (compressionCode == AT3_PLUS_MAGIC) {
							result = PSP_CODEC_AT3PLUS
						} else {
							return ERROR_ATRAC_UNKNOWN_FORMAT
						}
					}
					break;
				}
				case FACT_CHUNK_MAGIC: {
					if (chunkSize >= 8) {
						info.atracEndSample = this.readUnaligned32(mem, currentAddr)
						if (info.atracEndSample > 0) {
							info.atracEndSample -= 1
						}
						if (chunkSize >= 12) {
							// Is the value at offset 4 ignored?
							info.atracSampleOffset = this.readUnaligned32(mem, currentAddr + 8) // The loop samples are offset by this value
						} else {
							info.atracSampleOffset = this.readUnaligned32(mem, currentAddr + 4) // The loop samples are offset by this value
						}
						if (log.isTraceEnabled) {
                            log.trace("FACT Chunk: chunkSize=%d, endSample=0x%X, sampleOffset=0x%X".format(chunkSize, info.atracEndSample, info.atracSampleOffset))
                        }
					}
					break;
				}
                case SMPL_CHUNK_MAGIC: {
					if (chunkSize >= 36) {
						const checkNumLoops = this.readUnaligned32(mem, currentAddr + 28)
						if (chunkSize >= 36 + checkNumLoops * 24) {
							info.numLoops = checkNumLoops
							info.loops = ArrayUtils.create(info.numLoops, _ => new LoopInfo())
                            let loopInfoAddr = currentAddr + 36;
                            for (let i = 0; i < info.numLoops; i++) {
								const loop = info.loops[i]
								info.loops[i] = loop
								loop.cuePointID = this.readUnaligned32(mem, loopInfoAddr)
								loop.type = this.readUnaligned32(mem, loopInfoAddr + 4)
								loop.startSample = this.readUnaligned32(mem, loopInfoAddr + 8) - info.atracSampleOffset
								loop.endSample = this.readUnaligned32(mem, loopInfoAddr + 12) - info.atracSampleOffset
								loop.fraction = this.readUnaligned32(mem, loopInfoAddr + 16)
								loop.playCount = this.readUnaligned32(mem, loopInfoAddr + 20)

								log.trace("Loop #%d: %s".format(i, loop.toString()))
								loopInfoAddr += 24
							}
							// TODO Second buffer processing disabled because still incomplete
							//isSecondBufferNeeded = true;
						}
					}
					break;
				}
			}

			if (chunkSize > bufferSize) {
				break
			}

			currentAddr += chunkSize
			bufferSize -= chunkSize
		}

		// If a loop end is past the atrac end, assume the atrac end
		for (const loop of info.loops) {
			if (loop.endSample > info.atracEndSample) {
				loop.endSample = info.atracEndSample
			}
		}

		return result
	}

	private getStringFromInt32(chunkMagic: Int): String {
	    return String.fromCharCode(chunkMagic.extract8(0), chunkMagic.extract8(8), chunkMagic.extract8(16), chunkMagic.extract8(24))
    }
}

class LoopInfo {
    cuePointID: Int = 0
    type: Int = 0
    startSample: Int = 0
    endSample: Int = 0
    fraction: Int = 0
    playCount: Int = 0

    toString(): String {
        return sprintf("LoopInfo[cuePointID %d, type %d, startSample 0x%X, endSample 0x%X, fraction %d, playCount %d]", this.cuePointID, this.type, this.startSample, this.endSample, this.fraction, this.playCount)
    }
}

class AtracFileInfo {
    constructor(
        public atracBitrate: Int = 64,
        public atracChannels: Int = 2,
        public atracSampleRate: Int = 0xAC44,
        public atracBytesPerFrame: Int = 0x0230,
        public atracEndSample: Int = 0,
        public atracSampleOffset: Int = 0,
        public atracCodingMode: Int = 0,
        public inputFileDataOffset: Int = 0,
        public inputFileSize: Int = 0,
        public inputDataSize: Int = 0,
        public loopNum: Int = 0,
        public numLoops: Int = 0,
        public loops: Array<LoopInfo> = []
    ) {
    }
}
