///<reference path="./global.d.ts" />

import {PromiseFast} from "../src/global/utils";
import {waitAsync} from "../src/global/async";

export function ref() { } // Workaround to allow typescript to include this module

describe('promise', function () {
	it('simple', () => {
		return new PromiseFast<any>((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, 10);
		});
	});
	it('pass values', () => {
		return PromiseFast.resolve(10).then(value => {
			assert.equal(10, value);
		});
	});
	it('pass values2', () => {
		return PromiseFast.resolve(10).then(value => {
			return 11;
		}).then(value => {
			assert.equal(11, value);
		});
	});
	it('pipe', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.resolve(11);
		}).then(value => {
			assert.equal(11, value);
		});
	});
	it('pipe2', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.resolve(11).then(() => {
				return 'test';
				//return PromiseFast.resolve(12).then(() => {
				//	return waitAsync(10).then('test');
				//});
			});
		}).then(value => {
			assert.equal('test', value);
		});
	});
	it('pipe3', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.resolve(11).then(() => {
				//return waitAsync(10).then(() => 'test');
				return PromiseFast.resolve('test');
			});
		}).then(value => {
			assert.equal('test', value);
		});
	});
	it('pipe4', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.resolve(11).then(() => {
				return waitAsync(10).then(_ => 'test');
			});
		}).then(value => {
			assert.equal('test', value);
		}, error => {
			return 0;
		});
	});
	it('catch', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.resolve(10)
		}).catch(e => {
			return 7;
		}).then(v => {
			assert.equal(v, 10);
		});
	});
	it('catch2', () => {
		return PromiseFast.resolve(10).then(value => {
			return PromiseFast.reject(new Error());
		}).catch(e => {
			return 7;
		}).then(v => {
			assert.equal(v, 7);
		});
	});
});