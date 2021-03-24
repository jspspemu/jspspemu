import {assert, before, after, it, describe} from "./@microtest";
import {PromiseFast} from "../src/global/utils";
import {waitAsync} from "../src/global/async";

export function ref() { } // Workaround to allow typescript to include this module

describe('promise', function () {
	it('simple', () => {
		return new PromiseFast<any>((resolve, _) => {
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
		return PromiseFast.resolve(10).then(_ => {
			return 11;
		}).then(value => {
			assert.equal(11, value);
		});
	});
	it('pipe', () => {
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.resolve(11);
		}).then(value => {
			assert.equal(11, value);
		});
	});
	it('pipe2', () => {
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.resolve(11).then(_ => {
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
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.resolve(11).then(_ => {
				//return waitAsync(10).then(() => 'test');
				return PromiseFast.resolve('test');
			});
		}).then(value => {
			assert.equal('test', value);
		});
	});
	it('pipe4', () => {
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.resolve(11).then(_ => {
				return waitAsync(10).then(_ => 'test');
			});
		}).then(value => {
			assert.equal('test', value);
		}, _ => {
			return 0;
		});
	});
	it('catch', () => {
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.resolve(10)
		}).catch(_ => {
			return 7;
		}).then(v => {
			assert.equal(v, 10);
		});
	});
	it('catch2', () => {
		return PromiseFast.resolve(10).then(_ => {
			return PromiseFast.reject(new Error());
		}).catch(_ => {
			return 7;
		}).then(v => {
			assert.equal(v, 7);
		});
	});
});