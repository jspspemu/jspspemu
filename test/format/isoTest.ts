

import {downloadFileAsync} from "../../src/global/async";
import {assert, before, after, it, describe} from "../@microtest";

export function ref() { } // Workaround to allow typescript to include this module

import {MemoryAsyncStream} from "../../src/global/stream";
import {ArrayBufferUtils} from "../../src/global/utils";
import {Iso} from "../../src/format/iso";

describe('iso', () => {
	let isoData: Uint8Array;

	before(async () => {
        isoData = new Uint8Array(await downloadFileAsync('data/samples/cube.iso'))
	})

	it('should load fine', async () => {
		const asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData))
        const iso = await Iso.fromStreamAsync(asyncStream)
        assert.equal(
            JSON.stringify(iso.children.map(item => item.path)),
            JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"])
        )
	})
})
