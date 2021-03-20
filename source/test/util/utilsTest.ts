///<reference path="../global.d.ts" />
import {String_repeat} from "../../src/global/utils";
import {Stream} from "../../src/global/stream";
import {Int16, Int32} from "../../src/global/struct";
import {compareNumbers} from "../../src/global/array";

export function ref() { } // Workaround to allow typescript to include this module

describe('utils', () => {
    
    describe('string repeat', () => {
        it('simple', () => {
            assert.equal('', String_repeat('a', 0));
            assert.equal('a', String_repeat('a', 1));
            assert.equal('aaaa', String_repeat('a', 4));
        });
    });

    describe('Binary layouts', () => {
        it('should read int32', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int32.read(stream), 0x04030201);
        });

        it('should read int16', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int16.read(stream), 0x0201);
            assert.equal(Int16.read(stream), 0x0403);
        });

		/*
        it('should read simple struct', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            var MyStruct = Struct.create([
				{ item1: Int16 },
				{ item2: Int16 }
            ]);
            assert.equal(JSON.stringify(MyStruct.read(stream)), JSON.stringify({ item1: 0x0201, item2: 0x0403 }));
		});
		*/
	}); 

	describe('Binary search', () => {
		it('none', () => {
			var test:number[] = [];
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
		});

		it('one', () => {
			var test = [10];
			assert.equal(0, test.binarySearchIndex(b => compareNumbers(10, b)));

			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(0, b)));
			assert.equal(-1, test.binarySearchIndex(b => compareNumbers(11, b)));
		});

		it('odd', () => {
			var test = [10, 20, 30, 50, 100];
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
			var test = [10, 20, 30, 50, 100, 110];
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
