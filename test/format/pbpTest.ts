///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";
import {Stream} from "../../src/global/stream";
import {Pbp} from "../../src/format/pbp";

export function ref() { } // Workaround to allow typescript to include this module

describe('pbp', () => {
	var rtctestPbpArrayBuffer: ArrayBuffer;

	before(() => {
		return downloadFileAsync('data/samples/rtctest.pbp').then((data) => {
			rtctestPbpArrayBuffer = data;
		});
	});

	it('should load fine', () => {
		var pbp = new Pbp();
		pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
		var pspData = pbp.get('psp.data');
		assert.equal(pspData.length, 77550);
	});
});
