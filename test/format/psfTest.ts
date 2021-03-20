///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";
import {Stream} from "../../src/global/stream";
import {Psf} from "../../src/format/psf";
import {assert} from "chai"

export function ref() { } // Workaround to allow typescript to include this module

describe('psf', () => {
	var rtctestPsfArrayBuffer: ArrayBuffer;

	before(() => {
		return downloadFileAsync('data/samples/rtctest.psf').then((data) => {
			rtctestPsfArrayBuffer = data;
		});
	});


	it('should load fine', () => {
		var psf = new Psf();
		psf.load(Stream.fromArrayBuffer(rtctestPsfArrayBuffer));
		assert.equal(psf.entriesByName['BOOTABLE'], 1);
		assert.equal(psf.entriesByName['CATEGORY'], 'MG');
		assert.equal(psf.entriesByName['DISC_ID'], 'UCJS10041');
		assert.equal(psf.entriesByName['DISC_VERSION'], '1.00');
		assert.equal(psf.entriesByName['PARENTAL_LEVEL'], 1);
		assert.equal(psf.entriesByName['PSP_SYSTEM_VER'], '1.00');
		assert.equal(psf.entriesByName['REGION'], 32768);
		assert.equal(psf.entriesByName['TITLE'], 'rtctest');
	});
});
