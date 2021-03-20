import {getMemoryInstance} from "../src/core/memory";

export function ext() { }

var memory = getMemoryInstance()

describe('memory', function () {
	it('memory_hash', () => {
		for (var n = 0; n < 400; n++) {
			memory.hash(0x08000000, 1 * 1024 * 1024);
		}
	});
});