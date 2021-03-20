///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";
import {MemoryAsyncStream, Stream} from "../../src/global/stream";
import {Zip} from "../../src/format/zip";
import {ZipVfs} from "../../src/hle/vfs/vfs_zip";
import {assert} from "chai"

export function ref() { } // Workaround to allow typescript to include this module

describe('zip', () => {
	var arrayBuffer: ArrayBuffer;

	before(() => {
		return downloadFileAsync('data/samples/TrigWars.zip').then((data) => {
			arrayBuffer = data;
		});
	});


	it('should load fine', () => {
		return Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then((zip) => {
			assert.equal(27233, zip.get('/EBOOT.PBP').uncompressedSize);
			assert.equal(63548, zip.get('/Data/Sounds/bullet.wav').uncompressedSize);

			assert.equal(63548, zip.get('/DATA/SOUNDS/Bullet.Wav').uncompressedSize);

			return zip.get('/DATA/SOUNDS/Bullet.Wav').readAsync().then((data) => {
				assert.equal(63548, data.length);
				//console.log(data);
			});
		});
	});

	it('zip vfs should work', () => {
		return Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then((zip) => {
			var vfs = new ZipVfs(zip);
			return vfs.getStatAsync('/Data/Sounds/bullet.wav').then((info) => {
				assert.equal(false, info.isDirectory);
				assert.equal(63548, info.size);
			});
		});
	});
});
