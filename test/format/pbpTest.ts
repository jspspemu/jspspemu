

import {downloadFileAsync} from "../../src/global/async";
import {Stream} from "../../src/global/stream";
import {Pbp} from "../../src/format/pbp";
import {assert, before, after, it, describe} from "../@microtest";

export function ref() { } // Workaround to allow typescript to include this module

describe('pbp', () => {
	let rtctestPbpArrayBuffer: ArrayBuffer;

	before(async () => {
        rtctestPbpArrayBuffer = await downloadFileAsync('data/samples/rtctest.pbp');
	});

	it('should load fine', async () => {
        const pbp = new Pbp();
        pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
        const pspData = pbp.get('psp.data');
        assert.equal(pspData.length, 77550);
	});
});
