import _zip = require('../../src/format/zip');
import _vfs = require('../../src/hle/vfs');

describe('zip', () => {
	var arrayBuffer: ArrayBuffer;

	before(() => {
		return downloadFileAsync('samples/TrigWars.zip').then((data) => {
			arrayBuffer = data;
		});
	});


	it('should load fine', () => {
		return _zip.Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then((zip) => {
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
		return _zip.Zip.fromStreamAsync(MemoryAsyncStream.fromArrayBuffer(arrayBuffer)).then((zip) => {
			var vfs = new _vfs.ZipVfs(zip);
			return vfs.getStatAsync('/Data/Sounds/bullet.wav').then((info) => {
				assert.equal(false, info.isDirectory);
				assert.equal(63548, info.size);
			});
		});
	});
});
