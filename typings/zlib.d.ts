declare module Zlib {
	export class Gunzip {
		constructor(input: any);
		decompress(): Uint8Array;
	}

	export class RawInflate {
		constructor(input: any);
		decompress(): Uint8Array;
	}

	export class Inflate {
		constructor(input: any);
		decompress(): Uint8Array;
	}
}

declare module zlib {
	export function rawInflate(input: Uint8Array, chunkSize?: number): Uint8Array;
}