
import {downloadFileAsync} from "../../src/global/async";
import {MemoryAsyncStream, Stream} from "../../src/global/stream";
import {Zip} from "../../src/format/zip";
import {ZipVfs} from "../../src/hle/vfs/vfs_zip";
import {assert, before, after, it, describe} from "../@microtest";

export function ref() { } // Workaround to allow typescript to include this module

describe('zip', () => {
    let arrayBuffer: ArrayBuffer;

    before(async () => {
        arrayBuffer = await downloadFileAsync('data/samples/TrigWars.zip')
	})

	it('should load fine', async () => {
	    const zip = await Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer))
        assert.equal(27233, zip.get('/EBOOT.PBP').uncompressedSize);
        assert.equal(63548, zip.get('/Data/Sounds/bullet.wav').uncompressedSize);

        assert.equal(63548, zip.get('/DATA/SOUNDS/Bullet.Wav').uncompressedSize);

        const data = await zip.get('/DATA/SOUNDS/Bullet.Wav').readAsync()
        assert.equal(63548, data.length);
        //console.log(data);
	})

	it('zip vfs should work', async () => {
	    const zip = await Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer))
        const vfs = new ZipVfs(zip);
	    const info = await vfs.getStatAsync('/Data/Sounds/bullet.wav')
        assert.equal(false, info.isDirectory);
        assert.equal(63548, info.size);
	})
})
