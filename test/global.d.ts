///<reference path="../src/global.d.ts" />
///<reference path="../src/global.d.ts" />

///<reference path="../typings/chai/chai.d.ts" />
///<reference path="../typings/mocha/mocha.d.ts" />
///<reference path="../typings/jquery/jquery.d.ts" />

interface Assert {
	(result: boolean, message?: string): void;
	equal<T>(a: T, b: T, message?: string);
}

declare var assert: Assert;
