import {logger} from "../../global/utils";
import {Stream} from "../../global/stream";
import {Memory} from "../../core/memory";
import {Context} from "./Atrac3PlusDtos";
import {Atrac} from "./Atrac";
import {Atrac3plusDsp} from "./Atrac3plusDsp";
import {BitReader, FFT, IMemory} from "../MeUtils";

type Int = number

const log = logger.named("atrac3plus")
export const AT3P_ERROR = -1
export const CH_UNIT_MONO = 0        ///< unit containing one coded channel
export const CH_UNIT_STEREO = 1        ///< unit containing two jointly-coded channels
export const CH_UNIT_EXTENSION = 2        ///< unit containing extension information
export const CH_UNIT_TERMINATOR = 3        ///< unit sequence terminator
export const ATRAC3P_POWER_COMP_OFF = 15   ///< disable power compensation
export const ATRAC3P_SUBBANDS = 16         ///< number of PQF subbands
export const ATRAC3P_SUBBAND_SAMPLES = 128 ///< number of samples per subband
export const ATRAC3P_FRAME_SAMPLES = ATRAC3P_SUBBANDS * ATRAC3P_SUBBAND_SAMPLES
export const ATRAC3P_PQF_FIR_LEN = 12      ///< length of the prototype FIR of the PQF

/*
 * Based on the FFmpeg version from Maxim Poliakovski.
 * All credits go to him.
 * C to Java conversion by gid15 for the jpcsp project.
 * Java to Kotlin for kpspemu
 */
class Atrac3plusDecoder {
    private ctx?: Context = undefined

    get numberOfSamples(): Int { return ATRAC3P_FRAME_SAMPLES }

    init(bytesPerFrame: Int, channels: Int, outputChannels: Int, codingMode: Int): Int {
        const ctx = new Context()
        this.ctx = ctx
        ctx.outputChannels = outputChannels
        ctx.dsp = new Atrac3plusDsp()
        for (let i = 0; i < ctx!!.numChannelBlocks; i++) {
            ctx!!.channelUnits[i] = new ChannelUnit()
            ctx!!.channelUnits[i]!!.setDsp(ctx!!.dsp!!)
        }

        // initialize IPQF
        ctx!!.ipqfDctCtx = new FFT()
        ctx!!.ipqfDctCtx!!.mdctInit(5, true, 31.0 / 32768.9)

        ctx!!.mdctCtx = new FFT()
        ctx!!.dsp!!.initImdct(ctx!!.mdctCtx!!)

        Atrac3plusDsp.initWaveSynth()

        ctx!!.gaincCtx = new Atrac()
        ctx!!.gaincCtx!!.initGainCompensation(6, 2)

        return 0
    }

    decode(mem: IMemory, inputAddr: Int, inputLength: Int, output: Stream): Int {
        let ret: Int;
        const ctx = this.ctx

        if (!ctx) {
            return AT3P_ERROR
        }

        if (inputLength < 0) {
            return AT3P_ERROR
        }
        if (inputLength == 0) {
            return 0
        }

        ctx!!.br = new BitReader(mem, inputAddr, inputLength)
        if (ctx!!.br!!.readBool()) {
            log.error("Invalid start bit")
            return AT3P_ERROR
        }

        let chBlock = 0;
        let channelsToProcess = 0;
        while (ctx!!.br!!.bitsLeft >= 2) {
            const chUnitId = ctx!!.br!!.read(2)
            if (chUnitId == CH_UNIT_TERMINATOR) {
                break
            }
            if (chUnitId == CH_UNIT_EXTENSION) {
                log.warn("Non implemented channel unit extension")
                return AT3P_ERROR
            }

            if (chBlock >= ctx!!.channelUnits.length) {
                log.error("Too many channel blocks")
                return AT3P_ERROR
            }

            if (ctx!!.channelUnits[chBlock] == null) {
                log.warn("Null channelUnits block: $chBlock")
                break
            }

            const channelUnit = ctx!!.channelUnits[chBlock]!!
            channelUnit.setBitReader(ctx!!.br!!)

            channelUnit.ctx.unitType = chUnitId
            channelsToProcess = chUnitId + 1
            channelUnit.setNumChannels(channelsToProcess)

            ret = channelUnit.decode()
            if (ret < 0) {
                return ret
            }

            channelUnit.decodeResidualSpectrum(ctx!!.samples)
            channelUnit.reconstructFrame(ctx!!)

            writeOutput(ctx!!.outpBuf, output, ATRAC3P_FRAME_SAMPLES, channelsToProcess, ctx!!.outputChannels)

            chBlock++
        }

        log.trace("Bytes read 0x%X".format(ctx!!.br!!.bytesRead))

        return ctx!!.br!!.bytesRead
    }
}
