module hle.modules {
	export class sceDmac {
		constructor(private context: EmulatorContext) { }

		sceDmacMemcpy = createNativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int', this, (destination: number, source: number, size: number) => {
			this.context.memory.copy(source, destination, size);
			return 0;
		});
	}
}
