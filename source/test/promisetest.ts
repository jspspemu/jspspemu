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
	it('pipe2', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.resolve(11).then(() => {
				return 'test';
				//return Promise2.resolve(12).then(() => {
				//	return waitAsync(10).then('test');
				//});
			});
		}).then(value => {
			assert.equal('test', value);
		});
	});
	it('pipe3', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.resolve(11).then(() => {
				//return waitAsync(10).then(() => 'test');
				return Promise2.resolve('test');
			});
		}).then(value => {
			assert.equal('test', value);
		});
	});
	it('pipe4', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.resolve(11).then(() => {
				return waitAsync(10).then(_ => 'test');
			});
		}).then(value => {
			assert.equal('test', value);
		}, error => {
			return 0;
		});
	});
	it('catch', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.resolve(10)
		}).catch(e => {
			return 7;
		}).then(v => {
			assert.equal(v, 10);
		});
	});
	it('catch2', () => {
		return Promise2.resolve(10).then(value => {
			return Promise2.reject(new Error());
		}).catch(e => {
			return 7;
		}).then(v => {
			assert.equal(v, 7);
		});
	});
});