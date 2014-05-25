import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceNet {
	constructor(private context: _context.EmulatorContext) { }

	sceNetInit = createNativeFunction(0x39AF39A6, 150, 'int', 'int/int/int/int/int', this, (memoryPoolSize: number, calloutprio: number, calloutstack: number, netintrprio: number, netintrstack: number) => {
		this.context.container['mac'] = new Uint8Array(xrange(0, 6).map(index => Math.random() * 255));

		return 0;
	});

	sceNetTerm = createNativeFunction(0x281928A9, 150, 'int', '', this, () => {
		return 0;
	});

	sceNetFreeThreadinfo = createNativeFunction(0x50647530, 150, 'int', 'int', this, (threadId: number) => {
		throw(new Error("Not implemented"));
		return -1;
	});

	sceNetThreadAbort = createNativeFunction(0xAD6844c6, 150, 'int', 'int', this, (threadId: number) => {
		throw (new Error("Not implemented"));
		return -1;
	});

	/** Convert string to a Mac address **/
	sceNetEtherStrton = createNativeFunction(0xD27961C9, 150, 'int', 'string/void*', this, (string: string, macAddress: Stream) => {
		string.split(':').forEach(part => {
			macAddress.writeInt8(parseInt(part, 16));
		});
		return 0;
	});

	/** Convert Mac address to a string **/
	sceNetEtherNtostr = createNativeFunction(0x89360950, 150, 'int', 'void*/void*', this, (macAddress: Stream, outputAddress: Stream) => {
		var mac = macAddress.readBytes(6);
		outputAddress.writeStringz(sprintf('%02X:%02X:%02X:%02X:%02X:%02X', mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], mac[6]));
		return 0;
	});

	/** Retrieve the local Mac address **/
	sceNetGetLocalEtherAddr = createNativeFunction(0x0BF0A3AE, 150, 'int', 'void*', this, (macAddress: Stream) => {
		var mac = <Uint8Array>this.context.container['mac'];
		console.info('sceNetGetLocalEtherAddr:', mac2string(mac));
		//debugger;
		for (var n = 0; n < 6; n++) macAddress.writeUInt8(mac[n]);
		return 0;
	});

	sceNetGetMallocStat = createNativeFunction(0xCC393E48, 150, 'int', 'void*', this, (statPtr: Stream) => {
		throw (new Error("Not implemented"));
		return -1;
	});
}
