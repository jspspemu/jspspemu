
import {String_repeat} from "../../src/global/utils";
import {Stream} from "../../src/global/stream";
import {Int16, Int32} from "../../src/global/struct";
import {compareNumbers} from "../../src/global/array";
import {assert, before, after, it, describe} from "../@microtest";

export function ref() { } // Workaround to allow typescript to include this module

// noinspection DuplicatedCode
describe('utils', () => {
    
    describe('string repeat', () => {
        it('simple', () => {
            assert.equal('', String_repeat('a', 0));
            assert.equal('a', String_repeat('a', 1));
            assert.equal('aaaa', String_repeat('a', 4));
        });
    });

    describe('string reading', () => {
        for (const length of [256, 64 * 1024]) {
            it(`string decoding ${length}`, () => {
                const array = new Uint8Array(length);
                for (let n = 0; n < array.length; n++) array[n] = n
                const str = String.fromUint8Array(array);
                assert.equal(String.fromCharCode.apply(null, array as any), str)
            })
        }
    })

    describe('Binary layouts', () => {
        it('should read int32', () => {
            const stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int32.read(stream), 0x04030201);
        });

        it('should read int16', () => {
            const stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int16.read(stream), 0x0201);
            assert.equal(Int16.read(stream), 0x0403);
        });
	}); 

	describe('Binary search', () => {
		it('none', () => {
            // noinspection JSMismatchedCollectionQueryUpdate
            const test: number[] = [];
            assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
		});

		it('one', () => {
            const test = [10];
            assert.equal(0, test.binarySearchIndex(b => compareNumbers(10, b)));

			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
		});

		it('odd', () => {
            const test = [10, 20, 30, 50, 100];
            assert.equal(0, test.binarySearchIndex(b => compareNumbers(10, b)));
			assert.equal(1, test.binarySearchIndex(b => compareNumbers(20, b)));
			assert.equal(2, test.binarySearchIndex(b => compareNumbers(30, b)));
			assert.equal(3, test.binarySearchIndex(b => compareNumbers(50, b)));
			assert.equal(4, test.binarySearchIndex(b => compareNumbers(100, b)));

            assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(21, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(31, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(51, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(101, b)));
		});

		it('even', () => {
            const test = [10, 20, 30, 50, 100, 110];
            assert.equal(0, test.binarySearchIndex(b => compareNumbers(10, b)));
			assert.equal(1, test.binarySearchIndex(b => compareNumbers(20, b)));
			assert.equal(2, test.binarySearchIndex(b => compareNumbers(30, b)));
			assert.equal(3, test.binarySearchIndex(b => compareNumbers(50, b)));
			assert.equal(4, test.binarySearchIndex(b => compareNumbers(100, b)));
			assert.equal(5, test.binarySearchIndex(b => compareNumbers(110, b)));

			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(21, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(31, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(51, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(101, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(111, b)));
		});
	});
}); 
