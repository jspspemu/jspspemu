interface Thenable<T> {
	then<Q>(resolved: (value: T) => Q, rejected: (error: Error) => void): Promise<Q>;
}

declare class Promise<T> implements Thenable<T> {
	constructor(createPromise: (resolve: (value?: T) => void, reject: (error: Error) => void) => void);
	then<Q>(resolved: (value: T) => Promise<Q>, rejected?: (error: Error) => void): Promise<Q>;
	then<Q>(resolved: (value: T) => Q, rejected?: (error: Error) => void): Promise<Q>;
	catch(rejected?: (error: Error) => void): Promise<T>;
	catch<Q>(rejected?: (error: Error) => Q): Promise<Q>;
	catch<Q>(rejected?: (error: Error) => Promise<Q>): Promise<Q>;
	static resolve(): Promise<void>;
	static resolve<T>(thenable: Promise<T>): Promise<T>;
	static resolve<T>(value: T): Promise<T>;
	static reject<T>(error: Error): Promise<T>;
	static all(promises: Promise<any>[]): Promise<any>;
	static race(promises: Promise<any>[]): Promise<any>;
}