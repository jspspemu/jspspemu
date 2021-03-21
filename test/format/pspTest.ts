///<reference path="../global.d.ts" />
import {Stream} from "../../src/global/stream";
import {assert} from "chai"

export function ref() { } // Workaround to allow typescript to include this module

import {downloadFileAsync} from "../../src/global/async";
import {decrypt} from "../../src/hle/elf_crypted_prx";

describe('psp', () => {
    let testInputStream: Stream;
    let testExpectedStream: Stream;

    before(async () => {
        testInputStream = Stream.fromArrayBuffer(await downloadFileAsync('data/samples/TEST_EBOOT.BIN'))
        testExpectedStream = Stream.fromArrayBuffer(await downloadFileAsync('data/samples/TEST_BOOT.BIN'))
	})

	it('should load fine', async () => {
        const resultByteArray = decrypt(testInputStream).slice().readAllBytes();
        const expectedByteArray = testExpectedStream.slice().readAllBytes();
        assert.equal(resultByteArray.length, expectedByteArray.length);
		for (let n = 0; n < resultByteArray.length; n++) {
			if (resultByteArray[n] != expectedByteArray[n]) {
				assert.equal(resultByteArray[n], expectedByteArray[n], "failed at " + n + ' with total length ' + resultByteArray.length);
			}
		}
	})
})
