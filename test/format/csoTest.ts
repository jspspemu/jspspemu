

import {downloadFileAsync} from "../../src/global/async";
import {assert, before, after, it, describe} from "../@microtest";
import {MemoryAsyncStream, Stream} from "../../src/global/stream";
import {Cso} from "../../src/format/cso";
import {Iso} from "../../src/format/iso";

export function ref() { } // Workaround to allow typescript to include this module

describe('cso', () => {
	let testCsoArrayBuffer: ArrayBuffer;

	before(async () => {
        testCsoArrayBuffer = await downloadFileAsync('data/samples/test.cso')
	})

	it('should load fine', async () => {
        const cso = await Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer))
        //cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).thenFast(data => {
        const data = await cso.readChunkAsync(0x10 * 0x800 - 10, 0x800)
        const stream = Stream.fromArrayBuffer(data)
        stream.skip(10)
        const CD0001 = stream.readStringz(6)
        assert.equal(CD0001, '\u0001CD001')
	})

	it('should work with iso', async () => {
        const cso = await Cso.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(testCsoArrayBuffer))
        const iso = await Iso.fromStreamAsync(cso)
        assert.equal(
            JSON.stringify(iso.children.slice(0, 4).map(node => node.path)),
            JSON.stringify(["path", "path/0", "path/1", "path/2"])
        )
	})
})

