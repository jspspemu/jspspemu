///<reference path="../../global.d.ts" />

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
	sceNetEtherStrton = createNativeFunction(0xD27961C9, 150, 'int', 'string/byte[6]', this, (string: string, mac: Uint8Array) => {
		mac.set(string2mac(string));
		return 0;
	});

	/** Convert Mac address to a string **/
	sceNetEtherNtostr = createNativeFunction(0x89360950, 150, 'int', 'byte[6]/void*', this, (mac: Uint8Array, outputAddress: Stream) => {
		outputAddress.writeStringz(mac2string(mac));
		return 0;
	});

	/** Retrieve the local Mac address **/
	sceNetGetLocalEtherAddr = createNativeFunction(0x0BF0A3AE, 150, 'int', 'byte[6]', this, (macOut: Uint8Array) => {
		console.info("sceNetGetLocalEtherAddr: ", mac2string(this.context.netManager.mac));
		macOut.set(this.context.netManager.mac);
		return 0;
	});

	sceNetGetMallocStat = createNativeFunction(0xCC393E48, 150, 'int', 'void*', this, (statPtr: Stream) => {
		throw (new Error("Not implemented"));
		return -1;
	});
}
