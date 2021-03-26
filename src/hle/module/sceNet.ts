import {mac2string, string2mac} from "../../global/utils";
import {Stream} from "../../global/stream";
import {xrange} from "../../global/math";
import {EmulatorContext} from "../../emu/context";
import {FBYTES, I32, nativeFunctionEx, PTR, STRING} from "../utils";

export class sceNet {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x39AF39A6, 150)
	@I32 sceNetInit(
        @I32 memoryPoolSize: number,
        @I32 calloutprio: number,
        @I32 calloutstack: number,
        @I32 netintrprio: number,
        @I32 netintrstack: number
    ) {
		this.context.container['mac'] = new Uint8Array(xrange(0, 6).map(index => Math.random() * 255));

		return 0;
	}

	@nativeFunctionEx(0x281928A9, 150)
	@I32 sceNetTerm() {
		return 0;
	}

	@nativeFunctionEx(0x50647530, 150)
	@I32 sceNetFreeThreadinfo(@I32 threadId: number) {
		throw new Error("Not implemented");
	}

	@nativeFunctionEx(0xAD6844c6, 150)
	@I32 sceNetThreadAbort(@I32 threadId: number) {
		throw new Error("Not implemented");
	}

	/** Convert string to a Mac address **/
	@nativeFunctionEx(0xD27961C9, 150)
	@I32 sceNetEtherStrton(@STRING string: string, @FBYTES(6) mac: Uint8Array) {
		mac.set(string2mac(string));
		return 0;
	}

	/** Convert Mac address to a string **/
	@nativeFunctionEx(0x89360950, 150)
	@I32 sceNetEtherNtostr(@FBYTES(6) mac: Uint8Array, @PTR outputAddress: Stream) {
		outputAddress.writeStringz(mac2string(mac));
		return 0;
	}

	/** Retrieve the local Mac address **/
	@nativeFunctionEx(0x0BF0A3AE, 150)
	@I32 sceNetGetLocalEtherAddr(@FBYTES(6) macOut: Uint8Array) {
		console.info("sceNetGetLocalEtherAddr: ", mac2string(this.context.netManager.mac));
		macOut.set(this.context.netManager.mac);
		return 0;
	}

	@nativeFunctionEx(0xCC393E48, 150)
	@I32 sceNetGetMallocStat(@PTR statPtr: Stream) {
		throw new Error("Not implemented");
	}
}
