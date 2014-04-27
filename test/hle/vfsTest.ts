import _iso = require('../../src/format/iso');
import _psf = require('../../src/format/psf');
import _vfs = require('../../src/hle/vfs');

describe('vfs', () => {
	var isoData: Uint8Array;

	before(() => {
		return downloadFileAsync('samples/cube.iso').then((data) => {
			isoData = new Uint8Array(data);
		});
	});

	it('should work', () => {
		var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

		return _iso.Iso.fromStreamAsync(asyncStream).then(iso => {
			var vfs = new _vfs.IsoVfs(iso);
			return vfs.openAsync("PSP_GAME/PARAM.SFO", _vfs.FileOpenFlags.Read, parseInt('777', 8)).then(file => {
				return file.readAllAsync().then(content => {
					var psf = _psf.Psf.fromStream(Stream.fromArrayBuffer(content));
					assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041");
				});
			});
		});
	});
}); 