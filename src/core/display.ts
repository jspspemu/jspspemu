module core {
	export interface IPspDisplay {
		address: number;
		bufferWidth: number;
		pixelFormat: PixelFormat;
		sync: number;
		startAsync(): Promise<void>;
		stopAsync(): Promise<void>;
		waitVblankAsync(): Promise<number>;
		setEnabledDisplay(enable: boolean): void;
		vblankCount: number;
		hcount: number;
	}

	export enum PixelFormat {
		NONE = -1,
		RGBA_5650 = 0,
		RGBA_5551 = 1,
		RGBA_4444 = 2,
		RGBA_8888 = 3,
		PALETTE_T4 = 4,
		PALETTE_T8 = 5,
		PALETTE_T16 = 6,
		PALETTE_T32 = 7,
		COMPRESSED_DXT1 = 8,
		COMPRESSED_DXT3 = 9,
		COMPRESSED_DXT5 = 10,
	}

	export class BasePspDisplay {
		address = Memory.DEFAULT_FRAME_ADDRESS;
		bufferWidth = 512;
		pixelFormat = PixelFormat.RGBA_8888;
		sync = 1;
	}

	export class DummyPspDisplay extends BasePspDisplay implements IPspDisplay {
		vblankCount: number = 0;
		public hcount: number = 0;

		constructor() {
			super();
		}

		waitVblankAsync() {
			return new Promise((resolve) => { setTimeout(resolve, 20); });
		}

		setEnabledDisplay(enable: boolean) {
		}

		startAsync() {
			return Promise.resolve();
		}

		stopAsync() {
			return Promise.resolve();
		}
	}

	export class PspDisplay extends BasePspDisplay implements IPspDisplay {
		private context: CanvasRenderingContext2D;
		private vblank = new Signal();
		private imageData: ImageData;
		private interval: number = -1;
		vblankCount: number = 0;
		private enabled: boolean = true;
		private _hcount: number = 0;
		private startTime: number;

		static ProcessedPixelsPerSecond = 9000000; // hz
		static CyclesPerPixel = 1;
		static PixelsInARow = 525;
		static VsyncRow = 272;
		static NumberOfRows = 286;
		static hCountPerVblank = 285.72;

		static HorizontalSyncHertz = (PspDisplay.ProcessedPixelsPerSecond * PspDisplay.CyclesPerPixel) / PspDisplay.PixelsInARow;
		static VerticalSyncHertz = PspDisplay.HorizontalSyncHertz / PspDisplay.NumberOfRows;


		get elapsedTime() {
			return Date.now() - this.startTime;
		}

		get hcount() {
			return ((this.elapsedTime / 1000) / (1 / PspDisplay.HorizontalSyncHertz)) | 0;
		}

		constructor(public memory: Memory, public canvas: HTMLCanvasElement, private webglcanvas: HTMLCanvasElement) {
			super();
			this.context = this.canvas.getContext('2d');
			this.imageData = this.context.createImageData(512, 272);
			this.setEnabledDisplay(true);
		}

		update() {
			if (!this.context || !this.imageData) return;
			if (!this.enabled) return;

			var count = 512 * 272;
			var imageData = this.imageData;
			var w8 = imageData.data;
			var baseAddress = this.address & 0x0FFFFFFF;

			PixelConverter.decode(this.pixelFormat, this.memory.buffer, baseAddress, w8, 0, count, false);
			this.context.putImageData(imageData, 0, 0);
		}

		setEnabledDisplay(enable: boolean) {
			this.enabled = enable;
			this.canvas.style.display = enable ? 'block' : 'none';
			this.webglcanvas.style.display = !enable ? 'block' : 'none';
		}

		startAsync() {
			this.startTime = Date.now();
			//$(this.canvas).focus();
			this.interval = setInterval(() => {
				this.vblankCount++;
				this.update();
				this.vblank.dispatch();
			}, 1000 / 59.999);
			return Promise.resolve();
		}

		stopAsync() {
			clearInterval(this.interval);
			this.interval = -1;
			return Promise.resolve();
		}

		waitVblankAsync() {
			return new Promise<number>((resolve) => {
				this.vblank.once(() => {
					resolve(0);
				});
			});
		}
	}

	var sizes = {};
	sizes[PixelFormat.COMPRESSED_DXT1] = 0.5;
	sizes[PixelFormat.COMPRESSED_DXT3] = 1;
	sizes[PixelFormat.COMPRESSED_DXT5] = 1;
	sizes[PixelFormat.NONE] = 0;
	sizes[PixelFormat.PALETTE_T16] = 2;
	sizes[PixelFormat.PALETTE_T32] = 4;
	sizes[PixelFormat.PALETTE_T8] = 1;
	sizes[PixelFormat.PALETTE_T4] = 0.5;
	sizes[PixelFormat.RGBA_4444] = 2;
	sizes[PixelFormat.RGBA_5551] = 2;
	sizes[PixelFormat.RGBA_5650] = 2;
	sizes[PixelFormat.RGBA_8888] = 4;

	export class PixelConverter {
		static getSizeInBytes(format: PixelFormat, count: number) {
			return sizes[format] * count;
		}

		static decode(format: PixelFormat, from: ArrayBuffer, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
			//console.log(format + ':' + PixelFormat[format]);
			switch (format) {
				case PixelFormat.RGBA_8888:
					PixelConverter.decode8888(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha);
					break;
				case PixelFormat.RGBA_5551:
					PixelConverter.update5551(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
					break;
				case PixelFormat.RGBA_5650:
					PixelConverter.update5650(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
					break;
				case PixelFormat.RGBA_4444:
					PixelConverter.update4444(new Uint16Array(from), (fromIndex >>> 1) & Memory.MASK, to, toIndex, count, useAlpha);
					break;
				case PixelFormat.PALETTE_T8:
					PixelConverter.updateT8(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
					break;
				case PixelFormat.PALETTE_T4:
					PixelConverter.updateT4(new Uint8Array(from), (fromIndex >>> 0) & Memory.MASK, to, toIndex, count, useAlpha, palette, clutStart, clutShift, clutMask);
					break;
				default: throw (new Error(sprintf("Unsupported pixel format %d", format)));
			}
		}

		private static updateT4(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
			for (var n = 0, m = 0; n < count * 8; n += 8, m++) {
				var color1 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 0, 4) & clutMask) << clutShift)];
				var color2 = palette[clutStart + ((BitUtils.extract(from[fromIndex + m], 4, 4) & clutMask) << clutShift)];
				to[toIndex + n + 0] = BitUtils.extract(color1, 0, 8);
				to[toIndex + n + 1] = BitUtils.extract(color1, 8, 8);
				to[toIndex + n + 2] = BitUtils.extract(color1, 16, 8);
				to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color1, 24, 8) : 0xFF;

				to[toIndex + n + 4] = BitUtils.extract(color2, 0, 8);
				to[toIndex + n + 5] = BitUtils.extract(color2, 8, 8);
				to[toIndex + n + 6] = BitUtils.extract(color2, 16, 8);
				to[toIndex + n + 7] = useAlpha ? BitUtils.extract(color2, 24, 8) : 0xFF;
			}
		}

		private static updateT8(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true, palette: Uint32Array = null, clutStart: number = 0, clutShift: number = 0, clutMask: number = 0) {
			for (var n = 0, m = 0; n < count * 4; n += 4, m++) {
				var colorIndex = clutStart + ((from[fromIndex + m] & clutMask) << clutShift);
				var color = palette[colorIndex];
				to[toIndex + n + 0] = BitUtils.extract(color, 0, 8);
				to[toIndex + n + 1] = BitUtils.extract(color, 8, 8);
				to[toIndex + n + 2] = BitUtils.extract(color, 16, 8);
				to[toIndex + n + 3] = useAlpha ? BitUtils.extract(color, 24, 8) : 0xFF;
			}
		}

		private static decode8888(from: Uint8Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
			for (var n = 0; n < count * 4; n += 4) {
				to[toIndex + n + 0] = from[fromIndex + n + 0];
				to[toIndex + n + 1] = from[fromIndex + n + 1];
				to[toIndex + n + 2] = from[fromIndex + n + 2];
				to[toIndex + n + 3] = useAlpha ? from[fromIndex + n + 3] : 0xFF;
			}
		}

		private static update5551(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
			for (var n = 0; n < count * 4; n += 4) {
				var it = from[fromIndex++];
				to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 5, 0xFF);
				to[toIndex + n + 1] = BitUtils.extractScalei(it, 5, 5, 0xFF);
				to[toIndex + n + 2] = BitUtils.extractScalei(it, 10, 5, 0xFF);
				to[toIndex + n + 3] = useAlpha ? BitUtils.extractScalei(it, 15, 1, 0xFF) : 0xFF;
			}
		}

		private static update5650(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
			for (var n = 0; n < count * 4; n += 4) {
				var it = from[fromIndex++];
				to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 5, 0xFF);
				to[toIndex + n + 1] = BitUtils.extractScalei(it, 5, 6, 0xFF);
				to[toIndex + n + 2] = BitUtils.extractScalei(it, 11, 5, 0xFF);
				to[toIndex + n + 3] = 0xFF;
			}
		}

		private static update4444(from: Uint16Array, fromIndex: number, to: Uint8Array, toIndex: number, count: number, useAlpha: boolean = true) {
			for (var n = 0; n < count * 4; n += 4) {
				var it = from[fromIndex++];
				to[toIndex + n + 0] = BitUtils.extractScalei(it, 0, 4, 0xFF);
				to[toIndex + n + 1] = BitUtils.extractScalei(it, 4, 4, 0xFF);
				to[toIndex + n + 2] = BitUtils.extractScalei(it, 8, 4, 0xFF);
				to[toIndex + n + 3] = useAlpha ? BitUtils.extractScalei(it, 12, 4, 0xFF) : 0xFF;
			}
		}
	}
}
