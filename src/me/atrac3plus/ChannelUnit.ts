import {BitReader, CodecUtils, MemoryUtils, VLC} from "../MeUtils";
import {Atrac3plusDsp} from "./Atrac3plusDsp";
import {AtracGainInfo, Channel, ChannelUnitContext, Context, WavesData} from "./Atrac3PlusDtos";
import {logger} from "../../global/utils";
import {Atrac3plusData1, Atrac3pSpecCodeTab} from "./Atrac3plusData1";
import {ArrayUtils} from "../../global/math";
import {Atrac3plusData2} from "./Atrac3plusData2";
import {Atrac3plusDecoder} from "./Atrac3plusDecoder";
import {Atrac3plusConstants} from "./Atrac3plusConstants";

function intArrayOf(...values: number[]) { return new Int32Array(values) }
function floatArrayOf(...values: number[]) { return new Float32Array(values) }
function arrayOf<T>(...values: T[]) { return values }

type Int = number
type Float = number

const log = logger.named("Atrac3plus.ChannelUnit")

/*
* Based on the FFmpeg version from Maxim Poliakovski.
* All credits go to him.
* C to Java conversion by gid15 for the jpcsp project.
* Java to Kotlin for kpspemu
*/
export class ChannelUnit {
	ctx = new ChannelUnitContext()
	private br: BitReader
	private dsp?: Atrac3plusDsp = undefined
	private numChannels: Int = 0

	/**
	 * Decode number of code table values.
	 *
	 * @return result code: 0 = OK, otherwise - error code
	 */
	get numCtValues(): Int {
        if (!this.br.readBool()) {
            return this.ctx.usedQuantUnits
        }

        const numCodedVals = this.br.read(5)
        if (numCodedVals > this.ctx.usedQuantUnits) {
            log.error("Invalid number of code table indexes: %d".format(numCodedVals))
            return Atrac3plusConstants.AT3P_ERROR
        }
        return numCodedVals
    }

	setBitReader(br: BitReader) {
		this.br = br
	}

	setDsp(dsp: Atrac3plusDsp) {
		this.dsp = dsp
	}

	setNumChannels(numChannels: Int) {
		this.numChannels = numChannels
	}

	decode(): Int {
		var ret: Int

        this.ctx.numQuantUnits = this.br.read(5) + 1
		if (this.ctx.numQuantUnits > 28 && this.ctx.numQuantUnits < 32) {
			log.error("Invalid number of quantization units: %d".format(this.ctx.numQuantUnits))
			return Atrac3plusConstants.AT3P_ERROR
		}

        this.ctx.muteFlag = this.br.readBool()

		ret = this.decodeQuantWordlen()
		if (ret < 0) {
			return ret
		}

        this.ctx.numSubbands = Atrac3plusData2.atrac3p_qu_to_subband[this.ctx.numQuantUnits - 1] + 1
        this.ctx.numCodedSubbands = (this.ctx.usedQuantUnits > 0) ? Atrac3plusData2.atrac3p_qu_to_subband[this.ctx.usedQuantUnits - 1] + 1 : 0

		ret = this.decodeScaleFactors()
		if (ret < 0) {
			return ret
		}

		ret = this.decodeCodeTableIndexes()
		if (ret < 0) {
			return ret
		}

        this.decodeSpectrum()

		if (this.numChannels == 2) {
            this.getSubbandFlags(this.ctx.swapChannels, this.ctx.numCodedSubbands)
            this.getSubbandFlags(this.ctx.negateCoeffs, this.ctx.numCodedSubbands)
		}

        this.decodeWindowShape()

		ret = this.decodeGaincData()
		if (ret < 0) {
			return ret
		}

		ret = this.decodeTonesInfo()
		if (ret < 0) {
			return ret
		}

        this.ctx.noisePresent = this.br.readBool()
		if (this.ctx.noisePresent) {
            this.ctx.noiseLevelIndex = this.br.read(4)
            this.ctx.noiseTableIndex = this.br.read(4)
		}

		return 0
	}

	/**
	 * Decode number of coded quantization units.
	 */
	private numCodedUnits(chan: Channel): Int {
		chan.fillMode = this.br.read(2)
		if (chan.fillMode == 0) {
			chan.numCodedVals = this.ctx.numQuantUnits
		} else {
			chan.numCodedVals = this.br.read(5)
			if (chan.numCodedVals > this.ctx.numQuantUnits) {
				log.error("Invalid number of transmitted units")
				return Atrac3plusConstants.AT3P_ERROR
			}

			if (chan.fillMode == 3) {
				chan.splitPoint = this.br.read(2) + (chan.chNum << 1) + 1
			}
		}

		return 0
	}

	private getDelta(deltaBits: Int): Int {
		return (deltaBits <= 0) ? 0 : this.br.read(deltaBits)
	}

	/**
	 * Unpack vector quantization tables.
	 *
	 * @param startVal    start value for the unpacked table
	 * @param shapeVec    ptr to table to unpack
	 * @param dst          ptr to output array
	 * @param numValues   number of values to unpack
	 */
	private unpackVqShape(startVal: Int, shapeVec: Int32Array, dst: Int32Array, numValues: Int) {
		if (numValues > 0) {
			dst[0] = startVal
			dst[1] = startVal
			dst[2] = startVal
            for (let i = 3; i < numValues; i++) {
				dst[i] = startVal - shapeVec[Atrac3plusData2.atrac3p_qu_num_to_seg[i] - 1]
			}
		}
	}

	private unpackSfVqShape(dst: Int32Array, numValues: Int) {
		const startVal = this.br.read(6)
        this.unpackVqShape(startVal, Atrac3plusData2.atrac3p_sf_shapes[this.br.read(6)], dst, numValues)
	}

	/**
	 * Add weighting coefficients to the decoded word-length information.
	 *
	 * @param[in,out] chan          ptr to the channel parameters
	 * @param[in]     wtab_idx      index of the table of weights
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private addWordlenWeights(chan: Channel, weightIdx: Int): Int {
		const weigthsTab = Atrac3plusData2.atrac3p_wl_weights[chan.chNum * 3 + weightIdx - 1]

        for (let i = 0; i < this.ctx.numQuantUnits; i++) {
			chan.quWordlen[i] += weigthsTab[i]
			if (chan.quWordlen[i] < 0 || chan.quWordlen[i] > 7) {
				log.error("WL index out of range pos=%d, val=%d".format(i, chan.quWordlen[i]))
				return Atrac3plusConstants.AT3P_ERROR
			}
		}

		return 0
	}

	/**
	 * Decode word length for each quantization unit of a channel.
	 *
	 * @param[in]     chNum        channel to process
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeChannelWordlen(chNum: Int): Int {
		let ret: Int
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]
		var weightIdx = 0

		chan.fillMode = 0

		switch (this.br.read(2)) {
		// switch according to coding mode
            case 0: {// coded using constant number of bits
                for (let i = 0; i < this.ctx.numQuantUnits; i++) {
                    chan.quWordlen[i] = this.br.read(3)
                }
                break
            }
            case 1: {
                if (chNum > 0) {
                    ret = this.numCodedUnits(chan)
                    if (ret < 0) {
                        return ret
                    }

                    if (chan.numCodedVals > 0) {
                        const vlcTab = ChannelUnit.wl_vlc_tabs[this.br.read(2)]

                        for (let i = 0; i < chan.numCodedVals; i++) {
                            const delta = vlcTab.getVLC2(this.br)
                            chan.quWordlen[i] = (refChan.quWordlen[i] + delta) & 7
                        }
                    }
                } else {
                    weightIdx = this.br.read(2)
                    ret = this.numCodedUnits(chan)
                    if (ret < 0) {
                        return ret
                    }

                    if (chan.numCodedVals > 0) {
                        const pos = this.br.read(5)
                        if (pos > chan.numCodedVals) {
                            log.error("WL mode 1: invalid position %d".format(pos))
                            return Atrac3plusConstants.AT3P_ERROR
                        }

                        const deltaBits = this.br.read(2)
                        const minVal = this.br.read(3)

                        for (let i = 0; i < pos; i++) {
                            chan.quWordlen[i] = this.br.read(3)
                        }

                        for (let i = pos; i < chan.numCodedVals; i++) {
                            chan.quWordlen[i] = (minVal + this.getDelta(deltaBits)) & 7
                        }
                    }
                }
                break;
			}
            case 2: {
				ret = this.numCodedUnits(chan)
				if (ret < 0) {
					return ret
				}

				if (chNum > 0 && chan.numCodedVals > 0) {
					const vlcTab = ChannelUnit.wl_vlc_tabs[this.br.read(2)]!!
					var delta = vlcTab.getVLC2(this.br)
					chan.quWordlen[0] = (refChan.quWordlen[0] + delta) & 7

					for (let i = 1; i < chan.numCodedVals; i++) {
						const diff = refChan.quWordlen[i] - refChan.quWordlen[i - 1]
						delta = vlcTab.getVLC2(this.br)
						chan.quWordlen[i] = (chan.quWordlen[i - 1] + diff + delta) & 7
					}
				} else if (chan.numCodedVals > 0) {
					const flag = this.br.readBool()
					const vlcTab = ChannelUnit.wl_vlc_tabs[this.br.read(1)]!!

					const startVal = this.br.read(3)
					this.unpackVqShape(startVal, Atrac3plusData2.atrac3p_wl_shapes[startVal][this.br.read(4)], chan.quWordlen, chan.numCodedVals)

					if (!flag) {
						for (let i = 0; i < chan.numCodedVals; i++) {
							const delta = vlcTab.getVLC2(this.br)
							chan.quWordlen[i] = (chan.quWordlen[i] + delta) & 7
						}
					} else {
						var i: Int
						i = 0
						while (i < (chan.numCodedVals & (-2))) {
							if (!this.br.readBool()) {
								chan.quWordlen[i] = (chan.quWordlen[i] + vlcTab.getVLC2(this.br)) & 7
								chan.quWordlen[i + 1] = (chan.quWordlen[i + 1] + vlcTab.getVLC2(this.br)) & 7
							}
							i += 2
						}

						if ((chan.numCodedVals & 1) != 0) {
							chan.quWordlen[i] = (chan.quWordlen[i] + vlcTab.getVLC2(this.br)) & 7
						}
					}
				}
				break;
			}
            case 3: {
				weightIdx = this.br.read(2)
				ret = this.numCodedUnits(chan)
				if (ret < 0) {
					return ret
				}

				if (chan.numCodedVals > 0) {
					const vlcTab = ChannelUnit.wl_vlc_tabs[this.br.read(2)]!!

					// first coefficient is coded directly
					chan.quWordlen[0] = this.br.read(3)

					for (let i = 1; i < chan.numCodedVals; i++) {
						const delta = vlcTab.getVLC2(this.br)
						chan.quWordlen[i] = (chan.quWordlen[i - 1] + delta) & 7
					}
				}
				break;
			}
		}

		if (chan.fillMode == 2) {
			for (let i = chan.numCodedVals; i < this.ctx.numQuantUnits; i++) {
				chan.quWordlen[i] = (chNum > 0) ? this.br.read1() : 1
			}
		} else if (chan.fillMode == 3) {
			const pos = (chNum > 0) ? chan.numCodedVals + chan.splitPoint : this.ctx.numQuantUnits - chan.splitPoint
			for (let i = chan.numCodedVals; i < pos; i++) {
				chan.quWordlen[i] = 1
			}
		}

		return (weightIdx != 0) ? this.addWordlenWeights(chan, weightIdx) : 0

	}

	/**
	 * Subtract weighting coefficients from decoded scalefactors.
	 *
	 * @param chan          ptr to the channel parameters
	 * @param wtabIdx      index of table of weights
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private substractSfWeights(chan: Channel, wtabIdx: Int): Int {
		const weigthsTab = Atrac3plusData2.atrac3p_sf_weights[wtabIdx - 1]

		for (let i = 0; i < this.ctx.usedQuantUnits; i++) {
			chan.quSfIdx[i] -= weigthsTab[i]
			if (chan.quSfIdx[i] < 0 || chan.quSfIdx[i] > 63) {
				log.error("SF index out of range pos=%d, val=%d".format(i, chan.quSfIdx[i]))
				return Atrac3plusConstants.AT3P_ERROR
			}
		}

		return 0
	}

	/**
	 * Decode scale factor indexes for each quant unit of a channel.
	 *
	 * @param[in]     chNum        channel to process
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeChannelSfIdx(chNum: Int): Int {
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]
		var weightIdx = 0

		chan.fillMode = 0

		switch (this.br.read(2)) {
		// switch according to coding mode
            case 0: { // coded using constant number of bits
                for (let i = 0; i < this.ctx.usedQuantUnits; i++) {
                    chan.quSfIdx[i] = this.br.read(6)
                }
                break;
            }
            case 1: {
                if (chNum > 0) {
                    const vlcTab = ChannelUnit.sf_vlc_tabs[this.br.read(2)]!!
    
                    for (let i = 0; i < this.ctx.usedQuantUnits; i++) {
                        const delta = vlcTab.getVLC2(this.br)
                        chan.quSfIdx[i] = (refChan.quSfIdx[i] + delta) & 0x3F
                    }
                } else {
                    weightIdx = this.br.read(2)
                    if (weightIdx == 3) {
                        this.unpackSfVqShape(chan.quSfIdx, this.ctx.usedQuantUnits)
    
                        const numLongVals = this.br.read(5)
                        const deltaBits = this.br.read(2)
                        const minVal = this.br.read(4) - 7
    
                        for (let i = 0; i < numLongVals; i++) {
                            chan.quSfIdx[i] = (chan.quSfIdx[i] + this.br.read(4) - 7) & 0x3F
                        }
    
                        // All others are: minVal + delta
                        for (let i = numLongVals; i < this.ctx.usedQuantUnits; i++) {
                            chan.quSfIdx[i] = (chan.quSfIdx[i] + minVal + this.getDelta(deltaBits)) & 0x3F
                        }
                    } else {
                        const numLongVals = this.br.read(5)
                        const deltaBits = this.br.read(3)
                        const minVal = this.br.read(6)
                        if (numLongVals > this.ctx.usedQuantUnits || deltaBits == 7) {
                            log.error("SF mode 1: invalid parameters".format())
                            return Atrac3plusConstants.AT3P_ERROR
                        }
    
                        // Read full-precision SF indexes
                        for (let i = 0; i < numLongVals; i++) {
                            chan.quSfIdx[i] = this.br.read(6)
                        }
    
                        // All others are: minVal + delta
                        for (let i = numLongVals; i < this.ctx.usedQuantUnits; i++) {
                            chan.quSfIdx[i] = (minVal + this.getDelta(deltaBits)) & 0x3F
                        }
                    }
                }
                break;
			}
            case 2: {
                if (chNum > 0) {
                    const vlcTab = ChannelUnit.sf_vlc_tabs[this.br.read(2)]!!
    
                    var delta = vlcTab.getVLC2(this.br)
                    chan.quSfIdx[0] = (refChan.quSfIdx[0] + delta) & 0x3F
    
                    for (let i = 1; i < this.ctx.usedQuantUnits; i++) {
                        const diff = refChan.quSfIdx[i] - refChan.quSfIdx[i - 1]
                        delta = vlcTab.getVLC2(this.br)
                        chan.quSfIdx[i] = (chan.quSfIdx[i - 1] + diff + delta) & 0x3F
                    }
                } else if (chan.numCodedVals > 0) {
                    const vlcTab = ChannelUnit.sf_vlc_tabs[this.br.read(2) + 4]

                    this.unpackSfVqShape(chan.quSfIdx, this.ctx.usedQuantUnits)
    
                    for (let i = 0; i < this.ctx.usedQuantUnits; i++) {
                        const delta = vlcTab!!.getVLC2(this.br)
                        chan.quSfIdx[i] = (chan.quSfIdx[i] + delta.signExtend(4)) & 0x3F
                    }
                }
                break;
			}
            case 3: {
                if (chNum > 0) {
                    // Copy coefficients from reference channel
                    for (let i = 0; i < this.ctx.usedQuantUnits; i++) {
                        chan.quSfIdx[i] = refChan.quSfIdx[i]
                    }
                } else {
                    weightIdx = this.br.read(2)
                    const vlcSel = this.br.read(2)
                    var vlcTab = ChannelUnit.sf_vlc_tabs[vlcSel]!!
    
                    if (weightIdx == 3) {
                        vlcTab = ChannelUnit.sf_vlc_tabs[vlcSel + 4]!!

                        this.unpackSfVqShape(chan.quSfIdx, this.ctx.usedQuantUnits)
    
                        var diff = (this.br.read(4) + 56) & 0x3F
                        chan.quSfIdx[0] = (chan.quSfIdx[0] + diff) & 0x3F
    
                        for (let i = 1; i < this.ctx.usedQuantUnits; i++) {
                            const delta = vlcTab.getVLC2(this.br)
                            diff = diff + delta.signExtend(4) & 0x3F
                            chan.quSfIdx[i] = (diff + chan.quSfIdx[i]) & 0x3F
                        }
                    } else {
                        // 1st coefficient is coded directly
                        chan.quSfIdx[0] = this.br.read(6)
    
                        for (let i = 1; i < this.ctx.usedQuantUnits; i++) {
                            const delta = vlcTab.getVLC2(this.br)
                            chan.quSfIdx[i] = (chan.quSfIdx[i - 1] + delta) & 0x3F
                        }
                    }
                }
                break;
			}
		}

		return (weightIdx != 0 && weightIdx < 3) ? this.substractSfWeights(chan, weightIdx) : 0

	}

	/**
	 * Decode word length information for each channel.
	 *
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeQuantWordlen(): Int {
        for (let chNum = 0; chNum < this.numChannels; chNum++) {
			this.ctx.channels[chNum].quWordlen.fill(0)

			const ret = this.decodeChannelWordlen(chNum)
			if (ret < 0) {
				return ret
			}
		}

		/* scan for last non-zero coeff in both channels and
	     * set number of quant units having coded spectrum */
		var i: Int
		i = this.ctx.numQuantUnits - 1
		while (i >= 0) {
			if (this.ctx.channels[0].quWordlen[i] != 0 || this.numChannels == 2 && this.ctx.channels[1].quWordlen[i] != 0) {
				break
			}
			i--
		}
        this.ctx.usedQuantUnits = i + 1

		return 0
	}

	private decodeScaleFactors(): Int {
		if (this.ctx.usedQuantUnits == 0) {
			return 0
		}

        for (let chNum = 0; chNum < this.numChannels; chNum++) {
			this.ctx.channels[chNum].quSfIdx.fill(0)

			const ret = this.decodeChannelSfIdx(chNum)
			if (ret < 0) {
				return ret
			}
		}

		return 0
	}

	/**
	 * Decode code table indexes for each quant unit of a channel.
	 *
	 * @param[in]     chNum        channel to process
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeChannelCodeTab(chNum: Int): Int {
		let vlcTab: VLC
		let numVals: Int
		const mask = (this.ctx.useFullTable) ? 7 : 3 // mask for modular arithmetic
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]

		chan.tableType = this.br.read(1)

		switch (this.br.read(2)) {
		// switch according to coding mode
            case 0: { // directly coded
				const numBits = (this.ctx.useFullTable) ? 3 : 2
				numVals = this.numCtValues
				if (numVals < 0) {
					return numVals
				}
				for (let i = 0; i < numVals; i++) {
					if (chan.quWordlen[i] != 0) {
						chan.quTabIdx[i] = this.br.read(numBits)
					} else if (chNum > 0 && refChan.quWordlen[i] != 0) {
						// get clone master flag
						chan.quTabIdx[i] = this.br.read1()
					}
				}
				break;
			}
            case 1: { // entropy-coded
				vlcTab = (this.ctx.useFullTable) ? ChannelUnit.ct_vlc_tabs[1]!! : ChannelUnit.ct_vlc_tabs[0]!!
				numVals = this.numCtValues
				if (numVals < 0) {
					return numVals
				}
				for (let i = 0; i < numVals; i++) {
					if (chan.quWordlen[i] != 0) {
						chan.quTabIdx[i] = vlcTab.getVLC2(this.br)
					} else if (chNum > 0 && refChan.quWordlen[i] != 0) {
						// get clone master flag
						chan.quTabIdx[i] = this.br.read1()
					}
				}
				break;
			}
            case 2: { // entropy-coded delta
				let deltaVlc: VLC
				if (this.ctx.useFullTable) {
					vlcTab = ChannelUnit.ct_vlc_tabs[1]!!
					deltaVlc = ChannelUnit.ct_vlc_tabs[2]!!
				} else {
					vlcTab = ChannelUnit.ct_vlc_tabs[0]!!
					deltaVlc = ChannelUnit.ct_vlc_tabs[0]!!
				}
				var pred = 0
				numVals = this.numCtValues
				if (numVals < 0) {
					return numVals
				}
				for (let i = 0; i < numVals; i++) {
					if (chan.quWordlen[i] != 0) {
						chan.quTabIdx[i] = (i == 0) ? vlcTab.getVLC2(this.br) : ((pred + deltaVlc.getVLC2(this.br)) & mask)
						pred = chan.quTabIdx[i]
					} else if (chNum > 0 && refChan.quWordlen[i] != 0) {
						// get clone master flag
						chan.quTabIdx[i] = this.br.read1()
					}
				}
				break;
			}
            case 3: { // entropy-coded difference to master
                if (chNum > 0) {
                    vlcTab = (this.ctx.useFullTable) ? ChannelUnit.ct_vlc_tabs[3] : ChannelUnit.ct_vlc_tabs[0]
                    numVals = this.numCtValues
                    if (numVals < 0) {
                        return numVals
                    }
                    for (let i = 0; i < numVals; i++) {
                        if (chan.quWordlen[i] != 0) {
                            chan.quTabIdx[i] = refChan.quTabIdx[i] + vlcTab.getVLC2(this.br) & mask
                        } else if (chNum > 0 && refChan.quWordlen[i] != 0) {
                            // get clone master flag
                            chan.quTabIdx[i] = this.br.read1()
                        }
                    }
                }
                break;
            }
		}

		return 0
	}

	/**
	 * Decode code table indexes for each channel.
	 *
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeCodeTableIndexes(): Int {
		if (this.ctx.usedQuantUnits == 0) {
			return 0
		}

        this.ctx.useFullTable = this.br.readBool()

        for (let chNum = 0; chNum < this.numChannels; chNum++) {
            this.ctx.channels[chNum].quTabIdx.fill(0)

			const ret = this.decodeChannelCodeTab(chNum)
			if (ret < 0) {
				return ret
			}
		}

		return 0
	}

	private decodeQuSpectra(tab: Atrac3pSpecCodeTab, vlcTab: VLC, out: Int32Array, outOffset: Int, numSpecs: Int) {
		const groupSize = tab.groupSize
		const numCoeffs = tab.numCoeffs
		const bits = tab.bits
		const isSigned = tab.isSigned
		const mask = (1 << bits) - 1

		var pos = 0
		while (pos < numSpecs) {
			if (groupSize == 1 || this.br.readBool()) {
                for (let j = 0; j < groupSize; j++) {
					var _val = vlcTab.getVLC2(this.br)

					for (let i = 0; i < numCoeffs; i++) {
						var cf = _val & mask
						if (isSigned) {
							cf = cf.signExtend(bits)
						} else if (cf != 0 && this.br.readBool()) {
							cf = -cf
						}

						out[outOffset + pos] = cf
						pos++
						_val = _val >> bits
					}
				}
			} else {
				// Group skipped
				pos += groupSize * numCoeffs
			}
		}
	}

	private decodeSpectrum() {
		for (let chNum = 0; chNum < this.numChannels; chNum++) {
			const chan = this.ctx.channels[chNum]

			chan.spectrum.fill(0)

			chan.powerLevs.fill(Atrac3plusConstants.ATRAC3P_POWER_COMP_OFF)

            for (let qu = 0; qu < this.ctx.usedQuantUnits; qu++) {
				const numSpecs = Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu + 1] - Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu]
				const wordlen = chan.quWordlen[qu]
				var codetab = chan.quTabIdx[qu]
				if (wordlen > 0) {
					if (!this.ctx.useFullTable) {
						codetab = Atrac3plusData2.atrac3p_ct_restricted_to_full[chan.tableType][wordlen - 1][codetab]
					}

					var tabIndex = (chan.tableType * 8 + codetab) * 7 + wordlen - 1
					const tab = Atrac3plusData1.atrac3p_spectra_tabs[tabIndex]

					if (tab.redirect >= 0) {
						tabIndex = tab.redirect
					}

					this.decodeQuSpectra(tab, ChannelUnit.spec_vlc_tabs[tabIndex]!!, chan.spectrum, Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu], numSpecs)
				} else if (chNum > 0 && this.ctx.channels[0].quWordlen[qu] != 0 && codetab == 0) {
					// Copy coefficients from master
					MemoryUtils.arraycopyI(this.ctx.channels[0].spectrum, Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu], chan.spectrum, Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu], numSpecs)
					chan.quWordlen[qu] = this.ctx.channels[0].quWordlen[qu]
				}
			}

			/* Power compensation levels only present in the bitstream
	         * if there are more than 2 quant units. The lowest two units
	         * correspond to the frequencies 0...351 Hz, whose shouldn't
	         * be affected by the power compensation. */
			if (this.ctx.usedQuantUnits > 2) {
				const numSpecs = Atrac3plusData2.atrac3p_subband_to_num_powgrps[this.ctx.numCodedSubbands - 1]
				for (let i = 0; i < numSpecs; i++) {
					chan.powerLevs[i] = this.br.read(4)
				}
			}
		}
	}

	private getSubbandFlags(out: boolean[], numFlags: Int): Boolean {
		const result = this.br.readBool()
		if (result) {
			if (this.br.readBool()) {
				for (let i = 0; i < numFlags; i++) {
					out[i] = this.br.readBool()
				}
			} else {
				for (let i = 0; i < numFlags; i++) {
					out[i] = true
				}
			}
		} else {
			for (let i = 0; i < numFlags; i++) {
				out[i] = false
			}
		}

		return result
	}

	/**
	 * Decode mdct window shape flags for all channels.
	 *
	 */
	private decodeWindowShape() {
		for (let i = 0; i < this.numChannels; i++) {
            this.getSubbandFlags(this.ctx.channels[i].wndShape, this.ctx.numSubbands)
		}
	}

	private decodeGaincNPoints(chNum: Int, codedSubbands: Int): Int {
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]

		switch (this.br.read(2)) {
		// switch according to coding mode
            case 0: { // fixed-length coding
                for (let i = 0; i < codedSubbands; i++) {
                    chan.gainData[i].numPoints = this.br.read(3)
                }
                break;
            }
            case 1: { // variable-length coding
                for (let i = 0; i < codedSubbands; i++) {
                    chan.gainData[i].numPoints = ChannelUnit.gain_vlc_tabs[0].getVLC2(this.br)
                }
                break;
            }
            case 2: {
                if (chNum > 0) { // VLC modulo delta to master channel
                    for (let i = 0; i < codedSubbands; i++) {
                        const delta = ChannelUnit.gain_vlc_tabs[1].getVLC2(this.br)
                        chan.gainData[i].numPoints = refChan.gainData[i].numPoints + delta & 7
                    }
                } else { // VLC modulo delta to previous
                    chan.gainData[0].numPoints = ChannelUnit.gain_vlc_tabs[0].getVLC2(this.br)

                    for (let i = 1; i < codedSubbands; i++) {
                        const delta = ChannelUnit.gain_vlc_tabs[1].getVLC2(this.br)
                        chan.gainData[i].numPoints = chan.gainData[i - 1].numPoints + delta & 7
                    }
                }
                break;
            }
            case 3: {
                if (chNum > 0) { // copy data from master channel
                    for (let i = 0; i < codedSubbands; i++) {
                        chan.gainData[i].numPoints = refChan.gainData[i].numPoints
                    }
                } else { // shorter delta to min
                    const deltaBits = this.br.read(2)
                    const minVal = this.br.read(3)

                    for (let i = 0; i < codedSubbands; i++) {
                        chan.gainData[i].numPoints = minVal + this.getDelta(deltaBits)
                        if (chan.gainData[i].numPoints > 7) {
                            return Atrac3plusConstants.AT3P_ERROR
                        }
                    }
                }
                break;
            }
		}

		return 0
	}

	/**
	 * Implements coding mode 1 (master) for gain compensation levels.
	 *
	 * @param[out]    dst    ptr to the output array
	 */
	private gaincLevelMode1m(dst: AtracGainInfo) {
		if (dst.numPoints > 0) {
			dst.levCode[0] = ChannelUnit.gain_vlc_tabs[2].getVLC2(this.br)
		}

		for (let i = 1; i < dst.numPoints; i++) {
			const delta = ChannelUnit.gain_vlc_tabs[3].getVLC2(this.br)
			dst.levCode[i] = dst.levCode[i - 1] + delta & 0xF
		}
	}

	/**
	 * Implements coding mode 3 (slave) for gain compensation levels.
	 *
	 * @param[out]   dst   ptr to the output array
	 * @param[in]    ref   ptr to the reference channel
	 */
	private gaincLevelMode3s(dst: AtracGainInfo, ref: AtracGainInfo) {
		for (let i = 0; i < dst.numPoints; i++) {
			dst.levCode[i] = (i >= ref.numPoints) ? 7 : ref.levCode[i]
		}
	}

	/**
	 * Decode level code for each gain control point.
	 *
	 * @param[in]     ch_num          channel to process
	 * @param[in]     coded_subbands  number of subbands to process
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeGaincLevels(chNum: Int, codedSubbands: Int): Int {
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]

		switch (this.br.read(2)) {
		// switch according to coding mode
            case 0: { // fixed-length coding
                for (let sb = 0; sb < codedSubbands; sb++) {
                    for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                        chan.gainData[sb].levCode[i] = this.br.read(4)
                    }
                }
                break
            }
            case 1: {
                if (chNum > 0) { // VLC module delta to master channel
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                            const delta = ChannelUnit.gain_vlc_tabs[5].getVLC2(this.br)
                            const pred = (i >= refChan.gainData[sb].numPoints) ? 7 : refChan.gainData[sb].levCode[i]
                            chan.gainData[sb].levCode[i] = pred + delta & 0xF
                        }
                    }
                } else { // VLC module delta to previous
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        this.gaincLevelMode1m(chan.gainData[sb])
                    }
                }
                break
			}
            case 2: {
                if (chNum > 0) { // VLC modulo delta to previous or clone master
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        if (chan.gainData[sb].numPoints > 0) {
                            if (this.br.readBool()) {
                                this.gaincLevelMode1m(chan.gainData[sb])
                            } else {
                                this.gaincLevelMode3s(chan.gainData[sb], refChan.gainData[sb])
                            }
                        }
                    }
                } else { // VLC modulo delta to lev_codes of previous subband
                    if (chan.gainData[0].numPoints > 0) {
                        this.gaincLevelMode1m(chan.gainData[0])
                    }

                    for (let sb = 1; sb < codedSubbands; sb++) {
                        for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                            const delta = ChannelUnit.gain_vlc_tabs[4].getVLC2(this.br)
                            const pred = (i >= chan.gainData[sb - 1].numPoints) ? 7 : chan.gainData[sb - 1].levCode[i]
                            chan.gainData[sb].levCode[i] = pred + delta & 0xF
                        }
                    }
                }
                break
			}
            case 3: {
                if (chNum > 0) { // clone master
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        this.gaincLevelMode3s(chan.gainData[sb], refChan.gainData[sb])
                    }
                } else { // shorter delta to min
                    const deltaBits = this.br.read(2)
                    const minVal = this.br.read(4)

                    for (let sb = 0; sb < codedSubbands; sb++) {
                        for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                            chan.gainData[sb].levCode[i] = minVal + this.getDelta(deltaBits)
                            if (chan.gainData[sb].levCode[i] > 15) {
                                return Atrac3plusConstants.AT3P_ERROR
                            }
                        }
                    }
                }
                break
			}
		}

		return 0
	}

	/**
	 * Implements coding mode 0 for gain compensation locations.
	 *
	 * @param[out]    dst    ptr to the output array
	 * @param[in]     pos    position of the value to be processed
	 */
	private gaincLocMode0(dst: AtracGainInfo, pos: Int) {
		if (pos == 0 || dst.locCode[pos - 1] < 15) {
			dst.locCode[pos] = this.br.read(5)
		} else if (dst.locCode[pos - 1] >= 30) {
			dst.locCode[pos] = 31
		} else {
			const deltaBits = CodecUtils.avLog2(30 - dst.locCode[pos - 1]) + 1
			dst.locCode[pos] = dst.locCode[pos - 1] + this.br.read(deltaBits) + 1
		}
	}

	/**
	 * Implements coding mode 1 for gain compensation locations.
	 *
	 * @param[out]    dst    ptr to the output array
	 */
	private gaincLocMode1(dst: AtracGainInfo) {
		if (dst.numPoints > 0) {
			// 1st coefficient is stored directly
			dst.locCode[0] = this.br.read(5)

			for (let i = 1; i < dst.numPoints; i++) {
				// Switch VLC according to the curve direction
				// (ascending/descending)
				const tab = (dst.levCode[i] <= dst.levCode[i - 1]) ? ChannelUnit.gain_vlc_tabs[7] : ChannelUnit.gain_vlc_tabs[9]
				dst.locCode[i] = dst.locCode[i - 1] + tab.getVLC2(this.br)
			}
		}
	}

	/**
	 * Decode location code for each gain control point.
	 *
	 * @param[in]     chNum          channel to process
	 * @param[in]     codedSubbands  number of subbands to process
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeGaincLocCodes(chNum: Int, codedSubbands: Int): Int {
		const chan = this.ctx.channels[chNum]
		const refChan = this.ctx.channels[0]

		const codingMode = this.br.read(2)
		switch (codingMode) {
		// switch according to coding mode
            case 0: { // sequence of numbers in ascending order
                for (let sb = 0; sb < codedSubbands; sb++) {
                    for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                        this.gaincLocMode0(chan.gainData[sb], i)
                    }
                }
                break;
            }
            case 1: {
                if (chNum > 0) {
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        if (chan.gainData[sb].numPoints <= 0) {
                            continue
                        }
                        const dst = chan.gainData[sb]
                        const ref = refChan.gainData[sb]
    
                        // 1st value is vlc-coded modulo delta to master
                        var delta = ChannelUnit.gain_vlc_tabs[10].getVLC2(this.br)
                        const pred = (ref.numPoints > 0) ? ref.locCode[0] : 0
                        dst.locCode[0] = pred + delta & 0x1F
    
                        for (let i = 1; i < dst.numPoints; i++) {
                            const moreThanRef = i >= ref.numPoints
                            if (dst.levCode[i] > dst.levCode[i - 1]) {
                                // ascending curve
                                if (moreThanRef) {
                                    delta = ChannelUnit.gain_vlc_tabs[9].getVLC2(this.br)
                                    dst.locCode[i] = dst.locCode[i - 1] + delta
                                } else {
                                    if (this.br.readBool()) {
                                        this.gaincLocMode0(dst, i) // direct coding
                                    } else {
                                        dst.locCode[i] = ref.locCode[i] // clone master
                                    }
                                }
                            } else { // descending curve
                                const tab = (moreThanRef) ? ChannelUnit.gain_vlc_tabs[7]!! : ChannelUnit.gain_vlc_tabs[10]!!
                                delta = tab.getVLC2(this.br)
                                if (moreThanRef) {
                                    dst.locCode[i] = dst.locCode[i - 1] + delta
                                } else {
                                    dst.locCode[i] = ref.locCode[i] + delta & 0x1F
                                }
                            }
                        }
                    }
                } else { // VLC delta to previous
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        this.gaincLocMode1(chan.gainData[sb])
                    }
                }
                break;
			}
            case 2: {
                if (chNum > 0) {
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        if (chan.gainData[sb].numPoints <= 0) {
                            continue
                        }
                        const dst = chan.gainData[sb]
                        const ref = refChan.gainData[sb]
                        if (dst.numPoints > ref.numPoints || this.br.readBool()) {
                            this.gaincLocMode1(dst)
                        } else { // clone master for the whole subband
                            for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                                dst.locCode[i] = ref.locCode[i]
                            }
                        }
                    }
                } else {
                    // data for the first subband is coded directly
                    for (let i = 0; i < chan.gainData[0].numPoints; i++) {
                        this.gaincLocMode0(chan.gainData[0], i)
                    }

                    for (let sb = 1; sb < codedSubbands; sb++) {
                        if (chan.gainData[sb].numPoints <= 0) {
                            continue
                        }
                        const dst = chan.gainData[sb]
    
                        // 1st value is vlc-coded modulo delta to the corresponding
                        // value of the previous subband if any or zero
                        var delta = ChannelUnit.gain_vlc_tabs[6].getVLC2(this.br)
                        const pred = (chan.gainData[sb - 1].numPoints > 0) ? chan.gainData[sb - 1].locCode[0] : 0
                        dst.locCode[0] = pred + delta & 0x1F
    
                        for (let i = 1; i < dst.numPoints; i++) {
                            const moreThanRef = i >= chan.gainData[sb - 1].numPoints
                            // Select VLC table according to curve direction and
                            // presence of prediction
                            const tab = ChannelUnit.gain_vlc_tabs[((dst.levCode[i] > dst.levCode[i - 1]) ? 2 : 0) + ((moreThanRef) ? 1 : 0) + 6]!!
                            delta = tab.getVLC2(this.br)
                            if (moreThanRef) {
                                dst.locCode[i] = dst.locCode[i - 1] + delta
                            } else {
                                dst.locCode[i] = chan.gainData[sb - 1].locCode[i] + delta & 0x1F
                            }
                        }
                    }
			    }
                break;
			}
            case 3: {
                if (chNum > 0) { // clone master or direct or direct coding
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                            if (i >= refChan.gainData[sb].numPoints) {
                                this.gaincLocMode0(chan.gainData[sb], i)
                            } else {
                                chan.gainData[sb].locCode[i] = refChan.gainData[sb].locCode[i]
                            }
                        }
                    }
                } else { // shorter delta to min
                    const deltaBits = this.br.read(2) + 1
                    const minVal = this.br.read(5)
    
                    for (let sb = 0; sb < codedSubbands; sb++) {
                        for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
                            chan.gainData[sb].locCode[i] = minVal + i + this.br.read(deltaBits)
                        }
                    }
                }
                break
			}
		}

		// Validate decoded information
		for (let sb = 0; sb < codedSubbands; sb++) {
			const dst = chan.gainData[sb]
			for (let i = 0; i < chan.gainData[sb].numPoints; i++) {
				if (dst.locCode[i] < 0 || dst.locCode[i] > 31 || i > 0 && dst.locCode[i] <= dst.locCode[i - 1]) {
					log.error("Invalid gain location: ch=%d, sb=%d, pos=%d, val=%d".format(chNum, sb, i, dst.locCode[i]))
					return Atrac3plusConstants.AT3P_ERROR
				}
			}
		}

		return 0
	}

	/**
	 * Decode gain control data for all channels.
	 *
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeGaincData(): Int {
		var ret: Int

		for (let chNum = 0; chNum < this.numChannels; chNum++) {
			for (let i = 0; i < Atrac3plusConstants.ATRAC3P_SUBBANDS; i++) {
                this.ctx.channels[chNum].gainData[i].clear()
			}

			if (this.br.readBool()) { // gain control data present?
				const codedSubbands = this.br.read(4) + 1
				if (this.br.readBool()) { // is high band gain data replication on?
                    this.ctx.channels[chNum].numGainSubbands = this.br.read(4) + 1
				} else {
                    this.ctx.channels[chNum].numGainSubbands = codedSubbands
				}

				ret = this.decodeGaincNPoints(chNum, codedSubbands)
				if (ret < 0) {
					return ret
				}
				ret = this.decodeGaincLevels(chNum, codedSubbands)
				if (ret < 0) {
					return ret
				}
				ret = this.decodeGaincLocCodes(chNum, codedSubbands)
				if (ret < 0) {
					return ret
				}

				if (codedSubbands > 0) { // propagate gain data if requested
				    const max = this.ctx.channels[chNum].numGainSubbands
                    for (let sb = codedSubbands; sb < max; sb++) {
                        this.ctx.channels[chNum].gainData[sb].copy(this.ctx.channels[chNum].gainData[sb - 1])
					}
				}
			} else {
                this.ctx.channels[chNum].numGainSubbands = 0
			}
		}

		return 0
	}

	/**
	 * Decode envelope for all tones of a channel.
	 *
	 * @param[in]     chNum           channel to process
	 * @param[in]     bandHasTones    ptr to an array of per-band-flags:
	 * 1 - tone data present
	 */
	private decodeTonesEnvelope(chNum: Int, bandHasTones: boolean[]) {
		const dst = this.ctx.channels[chNum].tonesInfo
		const ref = this.ctx.channels[0].tonesInfo

		if (chNum == 0 || !this.br.readBool()) { // mode 0: fixed-length coding
            for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
				if (!bandHasTones[sb]) {
					continue
				}
				dst[sb].pendEnv.hasStartPoint = this.br.readBool()
				dst[sb].pendEnv.startPos = (dst[sb].pendEnv.hasStartPoint) ? this.br.read(5) : -1
				dst[sb].pendEnv.hasStopPoint = this.br.readBool()
				dst[sb].pendEnv.stopPos = (dst[sb].pendEnv.hasStopPoint) ? this.br.read(5) : 32
			}
		} else { // mode 1(slave only): copy master
            for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
				if (!bandHasTones[sb]) {
					continue
				}
				dst[sb].pendEnv.copy(ref[sb].pendEnv)
			}
		}
	}

	/**
	 * Decode number of tones for each subband of a channel.
	 *
	 * @param[in]     chNum           channel to process
	 * @param[in]     bandHasTones    ptr to an array of per-band-flags:
	 * 1 - tone data present
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeBandNumwavs(chNum: Int, bandHasTones: boolean[]): Int {
		const dst = this.ctx.channels[chNum].tonesInfo
		const ref = this.ctx.channels[0].tonesInfo

		const mode = this.br.read(chNum + 1)
		switch (mode) {
            case 0: { // fixed-length coding
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (bandHasTones[sb]) {
                        dst[sb].numWavs = this.br.read(4)
                    }
                }
                break
            }
            case 1: { // variable-length coding
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (bandHasTones[sb]) {
                        dst[sb].numWavs = ChannelUnit.tone_vlc_tabs[1].getVLC2(this.br)
                    }
                }
                break
            }
            case 2: { // VLC modulo delta to master (slave only)
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (bandHasTones[sb]) {
                        var delta = ChannelUnit.tone_vlc_tabs[2].getVLC2(this.br)
                        delta = delta.signExtend(3)
                        dst[sb].numWavs = ref[sb].numWavs + delta & 0xF
                    }
                }
                break
            }
            case 3: { // copy master (slave only)
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (bandHasTones[sb]) {
                        dst[sb].numWavs = ref[sb].numWavs
                    }
                }
                break
            }
		}

		// initialize start tone index for each subband
        for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
			if (bandHasTones[sb]) {
				if (this.ctx.wavesInfo.tonesIndex + dst[sb].numWavs > 48) {
					log.error("Too many tones: %d (max. 48)".format(this.ctx.wavesInfo.tonesIndex + dst[sb].numWavs))
					return Atrac3plusConstants.AT3P_ERROR
				}
				dst[sb].startIndex = this.ctx.wavesInfo.tonesIndex
                this.ctx.wavesInfo.tonesIndex += dst[sb].numWavs
			}
		}

		return 0
	}

	/**
	 * Decode frequency information for each subband of a channel.
	 *
	 * @param[in]     chNum           channel to process
	 * @param[in]     bandHasTones    ptr to an array of per-band-flags:
	 * 1 - tone data present
	 */
	private decodeTonesFrequency(chNum: Int, bandHasTones: boolean[]) {
		const dst = this.ctx.channels[chNum].tonesInfo
		const ref = this.ctx.channels[0].tonesInfo

		if (chNum == 0 || !this.br.readBool()) { // mode 0: fixed-length coding
            for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
				if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
					continue
				}
				const iwav = dst[sb].startIndex
				const direction = (dst[sb].numWavs > 1) ? this.br.readBool() : false
				if (direction) { // packed numbers in descending order
					if (dst[sb].numWavs > 0) {
                        this.ctx.wavesInfo.waves[iwav + dst[sb].numWavs - 1]!!.freqIndex = this.br.read(10)
					}
                    for (let i = dst[sb].numWavs - 2; i >= 0; i--) {
						const nbits = CodecUtils.avLog2(this.ctx.wavesInfo.waves[iwav + i + 1]!!.freqIndex) + 1
						this.ctx.wavesInfo.waves[iwav + i]!!.freqIndex = this.br.read(nbits)
					}
				} else { // packed numbers in ascending order
					for (let i = 0; i < dst[sb].numWavs; i++) {
						if (i == 0 || this.ctx.wavesInfo.waves[iwav + i - 1]!!.freqIndex < 512) {
                            this.ctx.wavesInfo.waves[iwav + i]!!.freqIndex = this.br.read(10)
						} else {
							const nbits = CodecUtils.avLog2(1023 - this.ctx.wavesInfo.waves[iwav + i - 1]!!.freqIndex) + 1
                            this.ctx.wavesInfo.waves[iwav + i]!!.freqIndex = this.br.read(nbits) + 1024 - (1 << nbits)
						}
					}
				}
			}
		} else { // mode 1: VLC module delta to master (slave only)
            for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
				if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
					continue
				}
				const iwav = ref[sb].startIndex
				const owav = dst[sb].startIndex
				for (let i = 0; i < dst[sb].numWavs; i++) {
					var delta = ChannelUnit.tone_vlc_tabs[6]!!.getVLC2(this.br)
					delta = delta.signExtend(8)
					const pred = (i < ref[sb].numWavs) ? this.ctx.wavesInfo.waves[iwav + i]!!.freqIndex : ((ref[sb].numWavs > 0) ? this.ctx.wavesInfo.waves[iwav + ref[sb].numWavs - 1]!!.freqIndex : 0)
                    this.ctx.wavesInfo.waves[owav + i]!!.freqIndex = pred + delta & 0x3FF
				}
			}
		}
	}

	/**
	 * Decode amplitude information for each subband of a channel.
	 *
	 * @param[in]     chNum           channel to process
	 * @param[in]     bandHasTones    ptr to an array of per-band-flags:
	 * 1 - tone data present
	 */
	private decodeTonesAmplitude(chNum: Int, bandHasTones: boolean[]) {
		const dst = this.ctx.channels[chNum].tonesInfo
		const ref = this.ctx.channels[0].tonesInfo
		const refwaves = new Int32Array(48)

		if (chNum > 0) {
            for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
				if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
					continue
				}
				const wsrc = dst[sb].startIndex
				const wref = ref[sb].startIndex
                for (let j = 0; j < dst[sb].numWavs; j++) {
					var fi = 0
					var maxdiff = 1024
					for (let i = 0; i < ref[sb].numWavs; i++) {
						const diff = Math.abs(this.ctx.wavesInfo.waves[wsrc + j]!!.freqIndex - this.ctx.wavesInfo.waves[wref + i]!!.freqIndex)
						if (diff < maxdiff) {
							maxdiff = diff
							fi = i
						}
					}

					if (maxdiff < 8) {
						refwaves[dst[sb].startIndex + j] = fi + ref[sb].startIndex
					} else if (j < ref[sb].numWavs) {
						refwaves[dst[sb].startIndex + j] = j + ref[sb].startIndex
					} else {
						refwaves[dst[sb].startIndex + j] = -1
					}
				}
			}
		}

		const mode = this.br.read(chNum + 1)

		switch (mode) {
            case 0: { // fixed-length coding
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
                        continue
                    }
                    if (this.ctx.wavesInfo.amplitudeMode != 0) {
                        for (let i = 0; i < dst[sb].numWavs; i++) {
                            this.ctx.wavesInfo.waves[dst[sb].startIndex + i]!!.ampSf = this.br.read(6)
                        }
                    } else {
                        this.ctx.wavesInfo.waves[dst[sb].startIndex]!!.ampSf = this.br.read(6)
                    }
                }
                break;
            }
            case 1: { // min + VLC delta
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
                        continue
                    }
                    if (this.ctx.wavesInfo.amplitudeMode != 0) {
                        for (let i = 0; i < dst[sb].numWavs; i++) {
                            this.ctx.wavesInfo.waves[dst[sb].startIndex + i]!!.ampSf = ChannelUnit.tone_vlc_tabs[3]!!.getVLC2(this.br) + 20
                        }
                    } else {
                        this.ctx.wavesInfo.waves[dst[sb].startIndex]!!.ampSf = ChannelUnit.tone_vlc_tabs[4]!!.getVLC2(this.br) + 24
                    }
                }
                break
            }
            case 2: { // VLC module delta to master (slave only)
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (!bandHasTones[sb] || dst[sb].numWavs == 0) {
                        continue
                    }
                    for (let i = 0; i < dst[sb].numWavs; i++) {
                        var delta = ChannelUnit.tone_vlc_tabs[5]!!.getVLC2(this.br)
                        delta = delta.signExtend(5)
                        const pred = (refwaves[dst[sb].startIndex + i] >= 0) ? this.ctx.wavesInfo.waves[refwaves[dst[sb].startIndex + i]]!!.ampSf : 34
                        this.ctx.wavesInfo.waves[dst[sb].startIndex + i]!!.ampSf = pred + delta & 0x3F
                    }
                }
                break
            }
            case 3: { // clone master (slave only)
                for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
                    if (!bandHasTones[sb]) {
                        continue
                    }
                    for (let i = 0; i < dst[sb].numWavs; i++) {
                        this.ctx.wavesInfo.waves[dst[sb].startIndex + i]!!.ampSf = (refwaves[dst[sb].startIndex + i] >= 0) ? this.ctx.wavesInfo.waves[refwaves[dst[sb].startIndex + i]]!!.ampSf : 32
                    }
                }
                break
            }
		}
	}

	/**
	 * Decode phase information for each subband of a channel.
	 *
	 * @param     chNnum          channel to process
	 * @param     bandHasTones    ptr to an array of per-band-flags:
	 * 1 - tone data present
	 */
	private decodeTonesPhase(chNum: Int, bandHasTones: boolean[]) {
		const dst = this.ctx.channels[chNum].tonesInfo

        for (let sb = 0; sb < this.ctx.wavesInfo.numToneBands; sb++) {
			if (!bandHasTones[sb]) {
				continue
			}
			const wparam = dst[sb].startIndex
			for (let i = 0; i < dst[sb].numWavs; i++) {
				this.ctx.wavesInfo.waves[wparam + i]!!.phaseIndex = this.br.read(5)
			}
		}
	}

	/**
	 * Decode tones info for all channels.
	 *
	 * @return result code: 0 = OK, otherwise - error code
	 */
	private decodeTonesInfo(): Int {
		for (let chNum = 0; chNum < this.numChannels; chNum++) {
			for (let i = 0; i < Atrac3plusConstants.ATRAC3P_SUBBANDS; i++) {
                this.ctx.channels[chNum].tonesInfo[i].clear()
			}
		}

        this.ctx.wavesInfo.tonesPresent = this.br.readBool()
		if (!this.ctx.wavesInfo.tonesPresent) {
			return 0
		}

        for (let i = 0; i < this.ctx.wavesInfo.waves.length; i++) {
            this.ctx.wavesInfo.waves[i]!!.clear()
		}

        this.ctx.wavesInfo.amplitudeMode = this.br.read1()
		if (this.ctx.wavesInfo.amplitudeMode == 0) {
			log.error("GHA amplitude mode 0")
			return Atrac3plusConstants.AT3P_ERROR
		}

        this.ctx.wavesInfo.numToneBands = ChannelUnit.tone_vlc_tabs[0].getVLC2(this.br) + 1

		if (this.numChannels == 2) {
            this.getSubbandFlags(this.ctx.wavesInfo.toneSharing, this.ctx.wavesInfo.numToneBands)
            this.getSubbandFlags(this.ctx.wavesInfo.toneMaster, this.ctx.wavesInfo.numToneBands)
			if (this.getSubbandFlags(this.ctx.wavesInfo.phaseShift, this.ctx.wavesInfo.numToneBands)) {
				log.warn("GHA Phase shifting")
			}
		}

        this.ctx.wavesInfo.tonesIndex = 0

		for (let chNum = 0; chNum < this.numChannels; chNum++) {
			const bandHasTones = ArrayUtils.create(16, _ => false)
			for (let i = 0; i < this.ctx.wavesInfo.numToneBands; i++) {
				bandHasTones[i] = (chNum == 0) ? true : !this.ctx.wavesInfo.toneSharing[i]
			}

            this.decodeTonesEnvelope(chNum, bandHasTones)
			const ret = this.decodeBandNumwavs(chNum, bandHasTones)
			if (ret < 0) {
				return ret
			}

            this.decodeTonesFrequency(chNum, bandHasTones)
            this.decodeTonesAmplitude(chNum, bandHasTones)
            this.decodeTonesPhase(chNum, bandHasTones)
		}

		if (this.numChannels == 2) {
			for (let i = 0; i < this.ctx.wavesInfo.numToneBands; i++) {
				if (this.ctx.wavesInfo.toneSharing[i]) {
                    this.ctx.channels[1].tonesInfo[i].copy(this.ctx.channels[0].tonesInfo[i])
				}

				if (this.ctx.wavesInfo.toneMaster[i]) {
					// Swap channels 0 and 1
					const tmp = new WavesData()
					tmp.copy(this.ctx.channels[0].tonesInfo[i])
                    this.ctx.channels[0].tonesInfo[i].copy(this.ctx.channels[1].tonesInfo[i])
                    this.ctx.channels[1].tonesInfo[i].copy(tmp)
				}
			}
		}

		return 0
	}

	decodeResidualSpectrum(out: Float32Array[]) {
		const sbRNGindex = new Int32Array(Atrac3plusConstants.ATRAC3P_SUBBANDS)

		if (this.ctx.muteFlag) {
            for (let ch = 0; ch < this.numChannels; ch++) {
				out[ch].fill(0)
			}
			return
		}

		var RNGindex = 0
        for (let qu = 0; qu < this.ctx.usedQuantUnits; qu++) {
			RNGindex += this.ctx.channels[0].quSfIdx[qu] + this.ctx.channels[1].quSfIdx[qu]
		}

		{
			var sb = 0
			while (sb < this.ctx.numCodedSubbands) {
				sbRNGindex[sb] = RNGindex & 0x3FC
				sb++
				RNGindex += 128
			}
		}

		// inverse quant and power compensation
        for (let ch = 0; ch < this.numChannels; ch++) {
			// clear channel's residual spectrum
			out[ch].fill(0, 0, Atrac3plusConstants.ATRAC3P_FRAME_SAMPLES)

            for (let qu = 0; qu < this.ctx.usedQuantUnits; qu++) {
				const src = Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu]
				const dst = Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu]
				const nspeclines = Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu + 1] - Atrac3plusDsp.ff_atrac3p_qu_to_spec_pos[qu]

				if (this.ctx.channels[ch].quWordlen[qu] > 0) {
					const q = Atrac3plusDsp.ff_atrac3p_sf_tab[this.ctx.channels[ch].quSfIdx[qu]] * Atrac3plusDsp.ff_atrac3p_mant_tab[this.ctx.channels[ch].quWordlen[qu]]
					for (let i = 0; i < nspeclines; i++) {
						out[ch][dst + i] = this.ctx.channels[ch].spectrum[src + i] * q
					}
				}
			}

            for (let sb = 0; sb < this.ctx.numCodedSubbands; sb++) {
                this.dsp!!.powerCompensation(this.ctx, ch, out[ch], sbRNGindex[sb], sb)
			}
		}

		if (this.ctx.unitType == Atrac3plusConstants.CH_UNIT_STEREO) {
			const tmp = new Float32Array(Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)
            for (let sb = 0; sb < this.ctx.numCodedSubbands; sb++) {
				if (this.ctx.swapChannels[sb]) {
					// Swap both channels
					MemoryUtils.arraycopyF(out[0], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, tmp, 0, Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)
					MemoryUtils.arraycopyF(out[1], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, out[0], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)
					MemoryUtils.arraycopyF(tmp, 0, out[1], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)
				}

				// flip coefficients' sign if requested
				if (this.ctx.negateCoeffs[sb]) {
					for (let i = 0; i < Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES; i++) {
						out[1][sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES + i] = -out[1][sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES + i]
					}
				}
			}
		}
	}

	reconstructFrame(at3pContext: Context) {
        for (let ch = 0; ch < this.numChannels; ch++) {
            for (let sb = 0; sb < this.ctx.numSubbands; sb++) {
				// inverse transform and windowing
				this.dsp!!.imdct(at3pContext.mdctCtx!!, at3pContext.samples[ch], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, at3pContext.mdctBuf[ch], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, ((this.ctx.channels[ch].wndShapePrev[sb]) ? 2 : 0) + ((this.ctx.channels[ch].wndShape[sb]) ? 1 : 0), sb)

				// gain compensation and overlapping
				at3pContext.gaincCtx!!.gainCompensation(at3pContext.mdctBuf[ch], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, this.ctx.prevBuf[ch], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, this.ctx.channels[ch].gainDataPrev[sb], this.ctx.channels[ch].gainData[sb], Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, at3pContext.timeBuf[ch], sb * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES)
			}

			// zero unused subbands in both output and overlapping buffers
            this.ctx.prevBuf[ch].fill(0, this.ctx.numSubbands * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, this.ctx.prevBuf[ch].length)
			at3pContext.timeBuf[ch].fill(0, this.ctx.numSubbands * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES, at3pContext.timeBuf[ch].length)

			// resynthesize and add tonal signal
			if (this.ctx.wavesInfo.tonesPresent || this.ctx.wavesInfoPrev.tonesPresent) {
                for (let sb = 0; sb < this.ctx.numSubbands; sb++) {
					if (this.ctx.channels[ch].tonesInfo[sb].numWavs > 0 || this.ctx.channels[ch].tonesInfoPrev[sb].numWavs > 0) {
                        this.dsp!!.generateTones(this.ctx, ch, sb, at3pContext.timeBuf[ch], sb * 128)
					}
				}
			}

			// subband synthesis and acoustic signal output
            this.dsp!!.ipqf(at3pContext.ipqfDctCtx!!, this.ctx.ipqfCtx[ch], at3pContext.timeBuf[ch], at3pContext.outpBuf[ch])
		}

		// swap window shape and gain control buffers
        for (let ch = 0; ch < this.numChannels; ch++) {
			const tmp1 = this.ctx.channels[ch].wndShape
            this.ctx.channels[ch].wndShape = this.ctx.channels[ch].wndShapePrev
            this.ctx.channels[ch].wndShapePrev = tmp1

			const tmp2 = this.ctx.channels[ch].gainData
            this.ctx.channels[ch].gainData = this.ctx.channels[ch].gainDataPrev
            this.ctx.channels[ch].gainDataPrev = tmp2

			const tmp3 = this.ctx.channels[ch].tonesInfo
            this.ctx.channels[ch].tonesInfo = this.ctx.channels[ch].tonesInfoPrev
            this.ctx.channels[ch].tonesInfoPrev = tmp3
		}

		const tmp = this.ctx.wavesInfo
        this.ctx.wavesInfo = this.ctx.wavesInfoPrev
        this.ctx.wavesInfoPrev = tmp
	}

    /* build huffman tables for gain data decoding */
    private static gain_cbs = arrayOf(Atrac3plusData2.atrac3p_huff_gain_npoints1_cb, Atrac3plusData2.atrac3p_huff_gain_npoints1_cb, Atrac3plusData2.atrac3p_huff_gain_lev1_cb, Atrac3plusData2.atrac3p_huff_gain_lev2_cb, Atrac3plusData2.atrac3p_huff_gain_lev3_cb, Atrac3plusData2.atrac3p_huff_gain_lev4_cb, Atrac3plusData2.atrac3p_huff_gain_loc3_cb, Atrac3plusData2.atrac3p_huff_gain_loc1_cb, Atrac3plusData2.atrac3p_huff_gain_loc4_cb, Atrac3plusData2.atrac3p_huff_gain_loc2_cb, Atrac3plusData2.atrac3p_huff_gain_loc5_cb)
    private static gain_xlats = arrayOf(null, Atrac3plusData2.atrac3p_huff_gain_npoints2_xlat, Atrac3plusData2.atrac3p_huff_gain_lev1_xlat, Atrac3plusData2.atrac3p_huff_gain_lev2_xlat, Atrac3plusData2.atrac3p_huff_gain_lev3_xlat, Atrac3plusData2.atrac3p_huff_gain_lev4_xlat, Atrac3plusData2.atrac3p_huff_gain_loc3_xlat, Atrac3plusData2.atrac3p_huff_gain_loc1_xlat, Atrac3plusData2.atrac3p_huff_gain_loc4_xlat, Atrac3plusData2.atrac3p_huff_gain_loc2_xlat, Atrac3plusData2.atrac3p_huff_gain_loc5_xlat)
    private static gain_vlc_tabs = ArrayUtils.create(11, i => {
        const vlc = new VLC()
        ChannelUnit.buildCanonicalHuff(ChannelUnit.gain_cbs[i], ChannelUnit.gain_xlats[i], vlc)
        return vlc
    })

    /* build huffman tables for tone decoding */
    private static tone_cbs = arrayOf(Atrac3plusData2.atrac3p_huff_tonebands_cb, Atrac3plusData2.atrac3p_huff_numwavs1_cb, Atrac3plusData2.atrac3p_huff_numwavs2_cb, Atrac3plusData2.atrac3p_huff_wav_ampsf1_cb, Atrac3plusData2.atrac3p_huff_wav_ampsf2_cb, Atrac3plusData2.atrac3p_huff_wav_ampsf3_cb, Atrac3plusData2.atrac3p_huff_freq_cb)
    private static tone_xlats = arrayOf(null, null, Atrac3plusData2.atrac3p_huff_numwavs2_xlat, Atrac3plusData2.atrac3p_huff_wav_ampsf1_xlat, Atrac3plusData2.atrac3p_huff_wav_ampsf2_xlat, Atrac3plusData2.atrac3p_huff_wav_ampsf3_xlat, Atrac3plusData2.atrac3p_huff_freq_xlat)
    private static tone_vlc_tabs = ArrayUtils.create(7, i => {
        const vlc = new VLC()
        ChannelUnit.buildCanonicalHuff(ChannelUnit.tone_cbs[i], ChannelUnit.tone_xlats[i], vlc)
        return vlc
    })

    private static wl_nb_bits = intArrayOf(2, 3, 5, 5)
    private static wl_nb_codes = intArrayOf(3, 5, 8, 8)
    private static wl_bits = arrayOf(Atrac3plusData2.atrac3p_wl_huff_bits1, Atrac3plusData2.atrac3p_wl_huff_bits2, Atrac3plusData2.atrac3p_wl_huff_bits3, Atrac3plusData2.atrac3p_wl_huff_bits4)
    private static wl_codes = arrayOf(Atrac3plusData2.atrac3p_wl_huff_code1, Atrac3plusData2.atrac3p_wl_huff_code2, Atrac3plusData2.atrac3p_wl_huff_code3, Atrac3plusData2.atrac3p_wl_huff_code4)
    private static wl_xlats = arrayOf(Atrac3plusData2.atrac3p_wl_huff_xlat1, Atrac3plusData2.atrac3p_wl_huff_xlat2, null, null)

    private static ct_nb_bits = intArrayOf(3, 4, 4, 4)
    private static ct_nb_codes = intArrayOf(4, 8, 8, 8)
    private static ct_bits = arrayOf(Atrac3plusData2.atrac3p_ct_huff_bits1, Atrac3plusData2.atrac3p_ct_huff_bits2, Atrac3plusData2.atrac3p_ct_huff_bits2, Atrac3plusData2.atrac3p_ct_huff_bits3)
    private static ct_codes = arrayOf(Atrac3plusData2.atrac3p_ct_huff_code1, Atrac3plusData2.atrac3p_ct_huff_code2, Atrac3plusData2.atrac3p_ct_huff_code2, Atrac3plusData2.atrac3p_ct_huff_code3)
    private static ct_xlats = arrayOf(null, null, Atrac3plusData2.atrac3p_ct_huff_xlat1, null)

    private static sf_nb_bits = intArrayOf(9, 9, 9, 9, 6, 6, 7, 7)
    private static sf_nb_codes = intArrayOf(64, 64, 64, 64, 16, 16, 16, 16)
    private static sf_bits = arrayOf(Atrac3plusData2.atrac3p_sf_huff_bits1, Atrac3plusData2.atrac3p_sf_huff_bits1, Atrac3plusData2.atrac3p_sf_huff_bits2, Atrac3plusData2.atrac3p_sf_huff_bits3, Atrac3plusData2.atrac3p_sf_huff_bits4, Atrac3plusData2.atrac3p_sf_huff_bits4, Atrac3plusData2.atrac3p_sf_huff_bits5, Atrac3plusData2.atrac3p_sf_huff_bits6)
    private static sf_codes = arrayOf(Atrac3plusData2.atrac3p_sf_huff_code1, Atrac3plusData2.atrac3p_sf_huff_code1, Atrac3plusData2.atrac3p_sf_huff_code2, Atrac3plusData2.atrac3p_sf_huff_code3, Atrac3plusData2.atrac3p_sf_huff_code4, Atrac3plusData2.atrac3p_sf_huff_code4, Atrac3plusData2.atrac3p_sf_huff_code5, Atrac3plusData2.atrac3p_sf_huff_code6)
    private static sf_xlats = arrayOf(Atrac3plusData2.atrac3p_sf_huff_xlat1, Atrac3plusData2.atrac3p_sf_huff_xlat2, null, null, Atrac3plusData2.atrac3p_sf_huff_xlat4, Atrac3plusData2.atrac3p_sf_huff_xlat5, null, null)

    private static wl_vlc_tabs = ArrayUtils.create<VLC>(4, i => {
        const vlc = new VLC()
        vlc.initVLCSparse(ChannelUnit.wl_nb_bits[i], ChannelUnit.wl_nb_codes[i], ChannelUnit.wl_bits[i], ChannelUnit.wl_codes[i], ChannelUnit.wl_xlats[i])
        return vlc
    });
    private static sf_vlc_tabs = ArrayUtils.create<VLC>(8, i => {
        const vlc = new VLC()
        vlc.initVLCSparse(ChannelUnit.sf_nb_bits[i], ChannelUnit.sf_nb_codes[i], ChannelUnit.sf_bits[i], ChannelUnit.sf_codes[i], ChannelUnit.sf_xlats[i])
        return vlc
    });
    private static ct_vlc_tabs = ArrayUtils.create<VLC>(4, i => {
        const vlc = new VLC()
        vlc.initVLCSparse(ChannelUnit.ct_nb_bits[i], ChannelUnit.ct_nb_codes[i], ChannelUnit.ct_bits[i], ChannelUnit.ct_codes[i], ChannelUnit.ct_xlats[i])
        return vlc
    })

    /* build huffman tables for spectrum decoding */
    private static spec_vlc_tabs = ArrayUtils.create(112, i => {
        const atrac3pSpecCodeTab = Atrac3plusData1.atrac3p_spectra_tabs[i]
        if (atrac3pSpecCodeTab.cb != null) {
            const vlc = new VLC()
            ChannelUnit.buildCanonicalHuff(atrac3pSpecCodeTab.cb!!, atrac3pSpecCodeTab.xlat, vlc)
            return vlc
        } else {
            return null
        }
    });

    private static buildCanonicalHuff(cb: Int32Array, xlat: Int32Array|null, vlc: VLC): Int {
        const codes = new Int32Array(256)
        const bits = new Int32Array(256)
        let cbIndex = 0;
        let index = 0;
        let code = 0;
        const minLen = cb[cbIndex++] // get shortest codeword length
        const maxLen = cb[cbIndex++] // get longest  codeword length

        for (let b = minLen; b <= maxLen; b++) {
            for (let i = cb[cbIndex++]; i >= 1; i--) {
                bits[index] = b
                codes[index] = code++
                index++
            }
            code = code << 1
        }

        return vlc.initVLCSparse(maxLen, index, bits, codes, xlat)
    }
}
