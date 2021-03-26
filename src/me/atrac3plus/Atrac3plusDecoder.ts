import {logger} from "../../global/utils";
import {Stream} from "../../global/stream";
import {Context} from "./Atrac3PlusDtos";
import {Atrac} from "./Atrac";
import {BitReader, CodecUtils, FFT, IMemory} from "../MeUtils";
import {ChannelUnit} from "./ChannelUnit";
import {Atrac3plusDsp} from "./Atrac3plusDsp";
import {Atrac3plusConstants} from "./Atrac3plusConstants";

type Int = number

const log = logger.named("atrac3plus")

/*
 * Based on the FFmpeg version from Maxim Poliakovski.
 * All credits go to him.
 * C to Java conversion by gid15 for the jpcsp project.
 * Java to Kotlin for kpspemu
 */
export class Atrac3plusDecoder {

    private ctx?: Context = undefined

    get numberOfSamples(): Int { return Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES }

    // noinspection JSUnusedLocalSymbols
    init(bytesPerFrame: Int, channels: Int, outputChannels: Int, codingMode: Int): Int {
        const ctx = new Context()
        this.ctx = ctx
        ctx.outputChannels = outputChannels
        ctx.dsp = new Atrac3plusDsp()
        for (let i = 0; i < ctx.numChannelBlocks; i++) {
            ctx.channelUnits[i] = new ChannelUnit()
            ctx.channelUnits[i].setDsp(ctx!!.dsp!!)
        }

        // initialize IPQF
        ctx.ipqfDctCtx = new FFT()
        ctx.ipqfDctCtx.mdctInit(5, true, 31.0 / 32768.9)

        ctx.mdctCtx = new FFT()
        ctx.dsp.initImdct(ctx!!.mdctCtx!!)

        Atrac3plusDsp.initWaveSynth()

        ctx.gaincCtx = new Atrac()
        ctx.gaincCtx.initGainCompensation(6, 2)

        return 0
    }

    decode(mem: IMemory, inputAddr: Int, inputLength: Int, output: Stream): Int {
        let ret: Int;

        if (!this.ctx) {
            return Atrac3plusConstants.AT3P_ERROR
        }

        if (inputLength < 0) {
            return Atrac3plusConstants.AT3P_ERROR
        }
        if (inputLength == 0) {
            return 0
        }

        this.ctx!!.br = new BitReader(mem, inputAddr, inputLength)
        if (this.ctx!!.br!!.readBool()) {
            log.error("Invalid start bit")
            return Atrac3plusConstants.AT3P_ERROR
        }

        let chBlock = 0;
        let channelsToProcess = 0;
        while (this.ctx!!.br!!.bitsLeft >= 2) {
            const chUnitId = this.ctx!!.br!!.read(2)
            if (chUnitId == Atrac3plusConstants.CH_UNIT_TERMINATOR) {
                break
            }
            if (chUnitId == Atrac3plusConstants.CH_UNIT_EXTENSION) {
                log.warn(`Non implemented channel unit extension`)
                return Atrac3plusConstants.AT3P_ERROR
            }

            if (chBlock >= this.ctx!!.channelUnits.length) {
                log.error(`Too many channel blocks`)
                return Atrac3plusConstants.AT3P_ERROR
            }

            if (this.ctx!!.channelUnits[chBlock] == null) {
                log.warn(`Null channelUnits block: ${chBlock}`)
                break
            }

            const channelUnit = this.ctx!!.channelUnits[chBlock]!!
            channelUnit.setBitReader(this.ctx!!.br!!)

            channelUnit.ctx.unitType = chUnitId
            channelsToProcess = chUnitId + 1
            channelUnit.setNumChannels(channelsToProcess)

            ret = channelUnit.decode()
            if (ret < 0) {
                return ret
            }

            channelUnit.decodeResidualSpectrum(this.ctx!!.samples)
            channelUnit.reconstructFrame(this.ctx!!)

            CodecUtils.writeOutput(this.ctx!!.outpBuf, output, Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES, channelsToProcess, this.ctx!!.outputChannels)

            chBlock++
        }

        if (log.isTraceEnabled) {
            log.trace("Bytes read 0x%X".format(this.ctx.br.bytesRead))
        }

        return this.ctx!!.br!!.bytesRead
    }
}
