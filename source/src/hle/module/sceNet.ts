import {mac2string, string2mac} from "../../global/utils";
import {Stream} from "../../global/stream";
import {xrange} from "../../global/math";
import {EmulatorContext} from "../../context";
import {nativeFunction} from "../utils";

export class sceNet {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x39AF39A6, 150, 'int', 'int/int/int/int/int')
	sceNetInit(memoryPoolSize: number, calloutprio: number, calloutstack: number, netintrprio: number, netintrstack: number) {
		this.context.container['mac'] = new Uint8Array(xrange(0, 6).map(index => Math.random() * 255));

		return 0;
	}

	@nativeFunction(0x281928A9, 150, 'int', '')
	sceNetTerm() {
		return 0;
	}

	@nativeFunction(0x50647530, 150, 'int', 'int')
	sceNetFreeThreadinfo(threadId: number) {
		throw new Error("Not implemented");
	}

	@nativeFunction(0xAD6844c6, 150, 'int', 'int')
	sceNetThreadAbort(threadId: number) {
		throw new Error("Not implemented");
	}

	/** Convert string to a Mac address **/
	@nativeFunction(0xD27961C9, 150, 'int', 'string/byte[6]')
	sceNetEtherStrton(string: string, mac: Uint8Array) {
		mac.set(string2mac(string));
		return 0;
	}

	/** Convert Mac address to a string **/
	@nativeFunction(0x89360950, 150, 'int', 'byte[6]/void*')
	sceNetEtherNtostr(mac: Uint8Array, outputAddress: Stream) {
		outputAddress.writeStringz(mac2string(mac));
		return 0;
	}

	/** Retrieve the local Mac address **/
	@nativeFunction(0x0BF0A3AE, 150, 'int', 'byte[6]')
	sceNetGetLocalEtherAddr(macOut: Uint8Array) {
		console.info("sceNetGetLocalEtherAddr: ", mac2string(this.context.netManager.mac));
		macOut.set(this.context.netManager.mac);
		return 0;
	}

	@nativeFunction(0xCC393E48, 150, 'int', 'void*')
	sceNetGetMallocStat(statPtr: Stream) {
		throw new Error("Not implemented");
	}
}
