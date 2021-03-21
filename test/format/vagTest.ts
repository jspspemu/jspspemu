///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";
import {Stream} from "../../src/global/stream";
import {VagSoundSource} from "../../src/format/vag";
import {assert} from "chai"

export function ref() { } // Workaround to allow typescript to include this module

describe('vag', () => {
    let vagData: Uint8Array
    let vagDataExpected: Uint8Array

    before(async () => {
        vagData = new Uint8Array(await downloadFileAsync('data/samples/sample.vag'))
        vagDataExpected = new Uint8Array(await downloadFileAsync('data/samples/sample.vag.expected'))
	})

	it('should load fine', async () => {
        const vag = new VagSoundSource(Stream.fromUint8Array(vagData), 0)
        const expected = Stream.fromUint8Array(vagDataExpected)
        vag.reset()
		expected.position = 0
        const resultArray: number[] = []
        const expectedArray: number[] = []
        while (vag.hasMore) {
            const sample = vag.getNextSample()
            const expectedLeft = expected.readInt16()
            const expectedRight = expected.readInt16()
            //console.log(n, sample.left, "=", expectedLeft)

			resultArray.push(sample.left, sample.right)
			expectedArray.push(expectedLeft, expectedRight)
		}
		assert.equal(resultArray.join(','), expectedArray.join(','))
	})
})
