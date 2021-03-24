import {ArrayUtils} from "../../global/math";
import {Atrac} from "./Atrac";
import {Atrac3plusDsp} from "./Atrac3plusDsp";
import {BitReader, FFT} from "../MeUtils";
import {ChannelUnit} from "./ChannelUnit";
import {Atrac3plusConstants} from "./Atrac3plusConstants";

type Int = number
function BooleanArray(size: number) { return ArrayUtils.create(size, _ => false) }
function FloatArray(size: number) { return new Float32Array(size) }
function arrayOf<T>(...values: T[]) { return values }

export class WaveEnvelope {
    hasStartPoint: Boolean = false ///< indicates start point within the GHA window
    hasStopPoint: Boolean = false  ///< indicates stop point within the GHA window
    startPos: Int = 0          ///< start position expressed in n*4 samples
    stopPos: Int = 0           ///< stop  position expressed in n*4 samples

    clear() {
        this.hasStartPoint = false
        this.hasStopPoint = false
        this.startPos = 0
        this.stopPos = 0
    }

    copy(from: WaveEnvelope) {
        this.hasStartPoint = from.hasStartPoint
        this.hasStopPoint = from.hasStopPoint
        this.startPos = from.startPos
        this.stopPos = from.stopPos
    }
}

/**
 * Gain control parameters for one subband.
 */
export class AtracGainInfo {
    numPoints: Int = 0             ///< number of gain control points
    levCode = new Int32Array(7) ///< level at corresponding control point
    locCode = new Int32Array(7) ///< location of gain control points

    clear() {
        this.numPoints = 0
        for (let i = 0; i < 6; i++) {
            this.levCode[i] = 0
            this.locCode[i] = 0
        }
    }

    copy(from: AtracGainInfo) {
        this.numPoints = from.numPoints
        this.levCode.set(from.levCode)
        this.locCode.set(from.locCode)
    }
}

/** Sound channel parameters  */
export class Channel {
    constructor(public chNum: Int) {
    }

    numCodedVals: Int = 0               ///< number of transmitted quant unit values
    fillMode: Int = 0
    splitPoint: Int = 0
    tableType: Int = 0                  ///< table type: 0 - tone?, 1- noise?
    quWordlen = new Int32Array(32)  ///< array of word lengths for each quant unit
    quSfIdx = new Int32Array(32)    ///< array of scale factor indexes for each quant unit
    quTabIdx = new Int32Array(32)   ///< array of code table indexes for each quant unit
    spectrum = new Int32Array(2048) ///< decoded IMDCT spectrum
    powerLevs = new Int32Array(5)   ///< power compensation levels

    // imdct window shape history (2 frames) for overlapping.
    wndShapeHist = ArrayUtils.create(2, _ => ArrayUtils.create(Atrac3plusConstants.ATRAC3P_SUBBANDS, _ => false)) ///< IMDCT window shape, 0=sine/1=steep
    wndShape = this.wndShapeHist[0]             ///< IMDCT window shape for current frame
    wndShapePrev = this.wndShapeHist[1]         ///< IMDCT window shape for previous frame

    // gain control data history (2 frames) for overlapping.
    gainDataHist = ArrayUtils.create(2, _ => ArrayUtils.create(Atrac3plusConstants.ATRAC3P_SUBBANDS, _ => new AtracGainInfo()))      ///< gain control data for all subbands
    gainData = this.gainDataHist[0]              ///< gain control data for next frame
    gainDataPrev = this.gainDataHist[1]          ///< gain control data for previous frame
    numGainSubbands: Int = 0            ///< number of subbands with gain control data

    // tones data history (2 frames) for overlapping.
    tonesInfoHist = ArrayUtils.create(2, _ => ArrayUtils.create(Atrac3plusConstants.ATRAC3P_SUBBANDS, _ => new WavesData()))
    tonesInfo = this.tonesInfoHist[0]
    tonesInfoPrev = this.tonesInfoHist[1]
}

/** Parameters of a single sine wave  */
export class WaveParam {
    freqIndex: Int = 0  ///< wave frequency index
    ampSf: Int = 0      ///< quantized amplitude scale factor
    ampIndex: Int = 0   ///< quantized amplitude index
    phaseIndex: Int = 0 ///< quantized phase index

    clear() {
        this.freqIndex = 0
        this.ampSf = 0
        this.ampIndex = 0
        this.phaseIndex = 0
    }
}

/** Parameters of a group of sine waves  */
export class WavesData {
    pendEnv = new WaveEnvelope() ///< pending envelope from the previous frame
    currEnv = new WaveEnvelope() ///< group envelope from the current frame
    numWavs: Int = 0          ///< number of sine waves in the group
    startIndex: Int = 0       ///< start index into global tones table for that subband

    clear() {
        this.pendEnv.clear()
        this.currEnv.clear()
        this.numWavs = 0
        this.startIndex = 0
    }

    copy(from: WavesData) {
        this.pendEnv.copy(from.pendEnv)
        this.currEnv.copy(from.currEnv)
        this.numWavs = from.numWavs
        this.startIndex = from.startIndex
    }
}

export class WaveSynthParams {
    tonesPresent: Boolean = false                                  ///< 1 - tones info present
    amplitudeMode: Int = 0                                     ///< 1 - low range, 0 - high range
    numToneBands: Int = 0                                      ///< number of PQF bands with tones
    toneSharing = BooleanArray(Atrac3plusConstants.ATRAC3P_SUBBANDS) ///< 1 - subband-wise tone sharing flags
    toneMaster = BooleanArray(Atrac3plusConstants.ATRAC3P_SUBBANDS)  ///< 1 - subband-wise tone channel swapping
    phaseShift = BooleanArray(Atrac3plusConstants.ATRAC3P_SUBBANDS)  ///< 1 - subband-wise 180 degrees phase shifting
    tonesIndex: Int = 0                                        ///< total sum of tones in this unit
    waves = ArrayUtils.create(48, _ => new WaveParam())
}

export class Context {
    br?: BitReader = undefined
    dsp?: Atrac3plusDsp = undefined

    channelUnits = new Array<ChannelUnit>(16) ///< global channel units
    numChannelBlocks = 2                         ///< number of channel blocks
    outputChannels: Int = 0

    gaincCtx?: Atrac = undefined ///< gain compensation context
    mdctCtx?: FFT = undefined
    ipqfDctCtx?: FFT = undefined ///< IDCT context used by IPQF

    samples = ArrayUtils.create(2, _ => new Float32Array(Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES)) ///< quantized MDCT sprectrum
    mdctBuf = ArrayUtils.create(2, _ => new Float32Array(Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES + Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)) ///< output of the IMDCT
    timeBuf = ArrayUtils.create(2, _ => new Float32Array(Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES)) ///< output of the gain compensation
    outpBuf = ArrayUtils.create(2, _ => new Float32Array(Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES))
}

/** Channel unit parameters  */
export class ChannelUnitContext {
    // Channel unit variables
    unitType: Int = 0                                     ///< unit type (mono/stereo)
    numQuantUnits: Int = 0
    numSubbands: Int = 0
    usedQuantUnits: Int = 0                               ///< number of quant units with coded spectrum
    numCodedSubbands: Int = 0                             ///< number of subbands with coded spectrum
    muteFlag: Boolean = false                                 ///< mute flag
    useFullTable: Boolean = false                             ///< 1 - full table list, 0 - restricted one
    noisePresent: Boolean = false                             ///< 1 - global noise info present
    noiseLevelIndex: Int = 0                              ///< global noise level index
    noiseTableIndex: Int = 0                              ///< global noise RNG table index
    swapChannels = BooleanArray(Atrac3plusConstants.ATRAC3P_SUBBANDS) ///< 1 - perform subband-wise channel swapping
    negateCoeffs = BooleanArray(Atrac3plusConstants.ATRAC3P_SUBBANDS) ///< 1 - subband-wise IMDCT coefficients negation
    channels = arrayOf(new Channel(0), new Channel(1))

    // Variables related to GHA tones
    waveSynthHist = arrayOf(new WaveSynthParams(), new WaveSynthParams()) ///< waves synth history for two frames
    wavesInfo: WaveSynthParams = this.waveSynthHist[0]
    wavesInfoPrev: WaveSynthParams = this.waveSynthHist[1]

    ipqfCtx = arrayOf(new IPQFChannelContext(), new IPQFChannelContext())
    prevBuf = ArrayUtils.create(2, _ => FloatArray(Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES)) ///< overlapping buffer
}

export class IPQFChannelContext {
    buf1 = ArrayUtils.create(Atrac3plusConstants.ATRAC3P_PQF_FIR_LEN * 2, _ => FloatArray(8))
    buf2 = ArrayUtils.create(Atrac3plusConstants.ATRAC3P_PQF_FIR_LEN * 2, _ => FloatArray(8))
    pos: Int = 0
}


