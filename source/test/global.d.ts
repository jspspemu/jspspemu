///<reference path="../src/global.d.ts" />
///<reference path="../typings/chai/chai.d.ts" />
///<reference path="../typings/mocha/mocha.d.ts" />

interface Assert {
	(result: boolean, message?: string): void;
	equal<T>(a: T, b: T, message?: string): void;
	fail(a?:any): void;
}

declare var assert: Assert;
