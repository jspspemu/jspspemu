import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceMpeg {
	constructor(private context: _context.EmulatorContext) { }

	static RING_BUFFER_PACKET_SIZE = 0x800;


	sceMpegInit = createNativeFunction(0x682A619B, 150, 'uint', '', this, () => {
		return -1;
	});

	sceMpegRingbufferQueryMemSize = createNativeFunction(0xD7A29F46, 150, 'uint', 'int', this, (numberOfPackets:number) => {
		return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
	});
}
