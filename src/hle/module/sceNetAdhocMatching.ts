import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceNetAdhocMatching {
	constructor(private context: _context.EmulatorContext) { }

	private poolStat = { size: 0, maxsize: 0, freesize: 0 };

	sceNetAdhocMatchingInit = createNativeFunction(0x2A2A1E07, 150, 'int', 'int', this, (memSize: number) => {
		//stateOut.writeInt32(this.currentState);
		this.poolStat.size = memSize;
		this.poolStat.maxsize = memSize;
		this.poolStat.freesize = memSize;
		return 0;
	});

	sceNetAdhocMatchingTerm = createNativeFunction(0x7945ECDA, 150, 'int', '', this, () => {
		return 0;
	});

	private matchings = new UidCollection<Matching>(1);

	sceNetAdhocMatchingCreate = createNativeFunction(0xCA5EDA6F, 150, 'int', 'int/int/int/int/int/int/int/int/uint', this, (mode: number, maxPeers: number, port: number, bufSize: number, helloDelay: number, pingDelay: number, initCount: number, msgDeplay: number, callback: number) => {
		return this.matchings.allocate(new Matching(
			mode, maxPeers, port, bufSize, helloDelay, pingDelay, initCount, msgDeplay, callback
		));
	});

	sceNetAdhocMatchingStart = createNativeFunction(0x93EF3843, 150, 'int', 'int/int/int/int/int/int/void*', this, (matchingId: number, evthPri: number, evthStack: number, inthPri: number, inthStack: number, optLen: number, optData: Stream) => {
		var matching = this.matchings.get(matchingId);
		matching.setHello(optData.sliceWithLength(0, optLen));
		matching.start();
		return 0;
	});
}

class Matching {
	constructor(public mode: number, public maxPeers: number, public port: number, public bufSize: number, public helloDelay: number, public pingDelay: number, public initCount: number, public msgDeplay: number, public callback: number) {
	}

	setHello(data: Stream) {
	}

	start() {
	}
}