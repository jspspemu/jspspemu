
import {getMemoryInstance} from "../src/core/memory";
import {assert, before, after, it, describe} from "./@microtest";

export function ext() { }

const memory = getMemoryInstance()

describe('memory', function () {
	it('memory_hash', () => {
		for (let n = 0; n < 400; n++) {
			memory.hash(0x08000000, 1 * 1024 * 1024);
		}
	});
});
