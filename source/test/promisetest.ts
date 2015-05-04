///<reference path="./global.d.ts" />
export function ref() { } // Workaround to allow typescript to include this module

import _emulator = require('../src/emulator');

describe('promise', function () {
	it('simple', () => {
		return new Promise2<any>((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, 10);
		});
	});
	it('pass values', () => {
		return Promise2.resolve(10).then(value => {
			assert.equal(10, value);
		});
	});
	it('pass values2', () => {
		return Promise2.resolve(10).then(value => {
			return 11;
		}).then(value => {
			assert.equal(11, value);
		});
	});
	it('pipe', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.resolve(11);
		}).then(value => {
			assert.equal(11, value);
		});
	});
});