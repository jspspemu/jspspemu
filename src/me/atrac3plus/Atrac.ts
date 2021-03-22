import {AtracGainInfo} from "./Atrac3PlusDtos";

type Int = number

/*
 * Based on the FFmpeg version from Maxim Poliakovski.
 * All credits go to him.
 * C to Java conversion by gid15 for the jpcsp project.
 * Java to Kotlin for kpspemu
 */
export class Atrac {
    private gainTab1 = new Float32Array(16) ///< gain compensation level table
    private gainTab2 = new Float32Array(31) ///< gain compensation interpolation table
    private id2expOffset: Int = 0               ///< offset for converting level index into level exponent
    private locScale: Int = 0                   ///< scale of location code = 2^loc_scale samples
    private locSize: Int = 0                    ///< size of location code in samples

    initGainCompensation(id2expOffset: Int, locScale: Int) {
        this.locScale = locScale
        this.locSize = 1 << locScale
        this.id2expOffset = id2expOffset

        // Generate gain level table
        for (let i = 0; i <= 15; i++) {
            this.gainTab1[i] = 2.0 ** (id2expOffset - i)
        }

        // Generate gain interpolation table
        for (let i = -15; i <= 15; i++) {
            this.gainTab2[i + 15] = 2.0 ** (-1.0 / this.locSize * i)
        }
    }

    gainCompensation(_in: Float32Array, inOffset: Int, prev: Float32Array, prevOffset: Int, gcNow: AtracGainInfo, gcNext: AtracGainInfo, numSamples: Int, out: Float32Array, outOffset: Int) {
        const gcScale = (gcNext.numPoints != 0) ? this.gainTab1[gcNext.levCode[0]] : 1.0

        if (gcNow.numPoints == 0) {
            for (let pos = 0; pos < numSamples; pos++) {
                out[outOffset + pos] = _in[inOffset + pos] * gcScale + prev[prevOffset + pos]
            }
        } else {
            let pos = 0;

            for (let i = 0; i < gcNow.numPoints; i++) {
                const lastpos = gcNow.locCode[i] << this.locScale

                let lev = this.gainTab1[gcNow.levCode[i]];
                const gainInc = this.gainTab2[((i + 1 < gcNow.numPoints) ? gcNow.levCode[i + 1] : this.id2expOffset) - gcNow.levCode[i] + 15]

                // apply constant gain level and overlap
                while (pos < lastpos) {
                    out[outOffset + pos] = (_in[inOffset + pos] * gcScale + prev[prevOffset + pos]) * lev
                    pos++
                }

                // interpolate between two different gain levels
                while (pos < lastpos + this.locSize) {
                    out[outOffset + pos] = (_in[inOffset + pos] * gcScale + prev[prevOffset + pos]) * lev
                    lev *= gainInc
                    pos++
                }
            }

            while (pos < numSamples) {
                out[outOffset + pos] = _in[inOffset + pos] * gcScale + prev[prevOffset + pos]
                pos++
            }
        }

        // copy the overlapping part into the delay buffer
        arraycopy(_in, inOffset + numSamples, prev, prevOffset, numSamples)
    }

    static ff_atrac_sf_table = new Float32Array(64)
    private static qmf_window = new Float32Array(48)
    private static qmf_48tap_half = new Float32Array([-0.00001461907, -0.00009205479, -0.000056157569, 0.00030117269, 0.0002422519, -0.00085293897, -0.0005205574, 0.0020340169, 0.00078333891, -0.0042153862, -0.00075614988, 0.0078402944, -0.000061169922, -0.01344162, 0.0024626821, 0.021736089, -0.007801671, -0.034090221, 0.01880949, 0.054326009, -0.043596379, -0.099384367, 0.13207909, 0.46424159])

    static generateTables() {
        // Generate scale factors
        if (this.ff_atrac_sf_table[63] == 0) {
            for (let i = 0; i <= 63; i++) {
                this.ff_atrac_sf_table[i] = 2.0 ** ((i - 15) / 3.0)
            }
        }

        // Generate the QMF window
        if (this.qmf_window[47] == 0) {
            for (let i = 0; i <= 23; i++) {
                const s = this.qmf_48tap_half[i] * 2.0
                this.qmf_window[i] = s
                this.qmf_window[47 - i] = s
            }
        }
    }

    static iqmf(inlo: Float32Array, inloOffset: Int, inhi: Float32Array, inhiOffset: Int, nIn: Int, out: Float32Array, outOffset: Int, delayBuf: Float32Array, temp: Float32Array) {
        var outOffset = outOffset
        arraycopy(delayBuf, 0, temp, 0, 46)

        // loop1
        {
            var i = 0
            while (i < nIn) {
                temp[46 + 2 * i + 0] = inlo[inloOffset + i] + inhi[inhiOffset + i]
                temp[46 + 2 * i + 1] = inlo[inloOffset + i] - inhi[inhiOffset + i]
                temp[46 + 2 * i + 2] = inlo[inloOffset + i + 1] + inhi[inhiOffset + i + 1]
                temp[46 + 2 * i + 3] = inlo[inloOffset + i + 1] - inhi[inhiOffset + i + 1]
                i += 2
            }
        }

        // loop2
        let p1 = 0
        for (let j = nIn; j >= 1; i--) {
            let s1 = 0
            let s2 = 0

            let i = 0
            while (i < 48) {
                s1 += temp[p1 + i] * this.qmf_window[i]
                s2 += temp[p1 + i + 1] * this.qmf_window[i + 1]
                i += 2
            }

            out[outOffset + 0] = s2
            out[outOffset + 1] = s1

            p1 += 2
            outOffset += 2
        }

        // Update the delay buffer.
        arraycopy(temp, nIn * 2, delayBuf, 0, 46)
    }
}
