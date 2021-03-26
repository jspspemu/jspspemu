
import {assert, before, after, it, describe} from "../@microtest";
import {downloadFileAsync} from "../../src/global/async";
import {DelayedAsyncStream, MemoryAsyncStream, Stream} from "../../src/global/stream";
import {ArrayBufferUtils} from "../../src/global/utils";
import {parseIntFormat} from "../../src/global/math";
import {Iso} from "../../src/format/iso";
import {Psf} from "../../src/format/psf";
import {IsoVfs} from "../../src/hle/vfs/vfs_iso";
import {FileOpenFlags} from "../../src/hle/vfs/vfs";
import {StorageVfs} from "../../src/hle/vfs/vfs_storage";
import {MemoryStickVfs} from "../../src/hle/vfs/vfs_ms";
import {MemoryVfs} from "../../src/hle/vfs/vfs_memory";

export function ref() { } // Workaround to allow typescript to include this module

describe('vfs', async () => {
	let isoData: Uint8Array;

	before(async () => {
        const data = await downloadFileAsync('data/samples/cube.iso')
        isoData = new Uint8Array(data);
	});

	it('iso', async () => {
        const asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData))
        const iso = await Iso.fromStreamAsync(asyncStream)
        const vfs = new IsoVfs(iso)
        const file = await vfs.openAsync("PSP_GAME/PARAM.SFO", FileOpenFlags.Read, parseInt('777', 8))
        const content = await file.readAllAsync()
        const psf = Psf.fromStream(Stream.fromArrayBuffer(content))
        assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041")
	});

	it('storage', async () => {
        const storageVfs = new StorageVfs('test');

        await storageVfs.writeAllAsync('simple', new Uint8Array([1, 2, 3, 4, 5]).buffer)
        {
            const stat = await storageVfs.getStatAsync('simple')
            assert.equal('simple', stat.name)
            assert.equal(5, stat.size)
        }
        {
            const data = await storageVfs.readAllAsync('simple')
            assert.equal(5, data.byteLength)
        }
        {
            const e = await assert.catchExceptionAsync(async () => { await storageVfs.readAllAsync('nonExistant') })
            assert.equal("File 'nonExistant' doesn't exist", e.message)
        }
        {
            const file = await storageVfs.openAsync('simple2', FileOpenFlags.Create | FileOpenFlags.Write | FileOpenFlags.Truncate, parseIntFormat('0777'))
            await file.writeChunkAsync(0, new Int8Array([1, 2, 3, 4, 5]).buffer)
            await file.writeChunkAsync(2, new Int8Array([-3, -4, -5, -6, -7]).buffer)
            const data = await file.readAllAsync()
            const v = new Int8Array(data)
            assert.equal(7, v.length)
            assert.equal(1, v[0])
            assert.equal(2, v[1])
            assert.equal(-3, v[2])
            assert.equal(-4, v[3])
            assert.equal(-5, v[4])
            assert.equal(-6, v[5])
            assert.equal(-7, v[6])
        }
	});

	it('memorystick', async () => {
        const storageVfs = new StorageVfs('test');
        const msVfs = new MemoryStickVfs([storageVfs], null as any, null as any);
        await msVfs.writeAllAsync('simple', new Uint8Array([1, 2, 3, 4, 5]).buffer)
        {
            const stat = await msVfs.getStatAsync('simple')
            assert.equal('simple', stat.name);
            assert.equal(5, stat.size);
        }
        {
            const data = await msVfs.readAllAsync('simple')
            assert.equal(5, data.byteLength);
        }
        {
            const e = await assert.catchExceptionAsync(async () => { await msVfs.readAllAsync('nonExistant') })
            assert.equal("File 'nonExistant' doesn't exist", `${e.message}`);
        }
	});

	it('memorystick_combined', async () => {
        const vfs1 = new MemoryVfs();
        const vfs2 = new MemoryVfs();
        const msVfs = new MemoryStickVfs([vfs1, vfs2], null as any, null as any);

        await vfs1.writeAllAsync('simple1', new Uint8Array([1, 2, 3, 4, 5]).buffer);
        await vfs2.writeAllAsync('simple2', new Uint8Array([1, 2, 3, 4, 5]).buffer);
        {
            const stat = await msVfs.getStatAsync('simple1')
            //console.log(stat);
            assert.equal('simple1', stat.name);
            assert.equal(5, stat.size);
        }
        {
            const stat = await msVfs.getStatAsync('simple2')
            assert.equal('simple2', stat.name);
            assert.equal(5, stat.size);
        }
	});
}); 