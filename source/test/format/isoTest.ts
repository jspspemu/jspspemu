///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";

export function ref() { } // Workaround to allow typescript to include this module

import _iso = require('../../src/format/iso');
import _vfs = require('../../src/hle/vfs');
import {MemoryAsyncStream} from "../../src/global/stream";
import {ArrayBufferUtils} from "../../src/global/utils";

describe('iso', () => {
	var isoData: Uint8Array;

	before(() => {
		return downloadFileAsync('data/samples/cube.iso').then((data) => {
			isoData = new Uint8Array(data);
		});
	});

	it('should load fine', () => {
		var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

		return _iso.Iso.fromStreamAsync(asyncStream).then(iso => {
            assert.equal(
                JSON.stringify(iso.children.map(item => item.path)),
                JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"])
            );
		});
	});
});
