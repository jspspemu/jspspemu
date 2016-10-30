import { WebGlPspDrawDriver } from './core/gpu/webgl/webgl_driver';
//import { BatteryInfo } from './core/battery';
import { DebugOverlay } from './emulator_overlay';
import { Emulator } from './emulator';
import { PspCtrlButtons, IPspControllerSet } from './core/controller';
import { Html5Audio2 } from './html5/Html5Audio';
import { Html5Battery } from './html5/Html5Battery';
import { Html5Icons } from './html5/Html5Icons';
import _vertex = require('./core/gpu/gpu_vertex');
import _config = require('./hle/config');
import Html5Gamepad = require('./html5/Html5Gamepad');

declare var self: any;

export class EmulatorControllerNormal {
	documentLocation = document.location.href.replace(/#.*$/, '').replace(/\/[^\/]*$/, '');
	emulator = new Emulator();
	audio = new Html5Audio2();

	init() {
		let emulator = this.emulator;
		let audio = this.audio;
		self.emulator = emulator;
		var canvas = <HTMLCanvasElement>(document.getElementById('canvas'));
		var webgl_canvas = <HTMLCanvasElement>(document.getElementById('webgl_canvas'));
		var webglDriver = new WebGlPspDrawDriver(webgl_canvas, emulator.gpuStats);
		webglDriver.initAsync();
		let debugOverlay = new DebugOverlay(webglDriver);
		debugOverlay.register();

		emulator.canvas = canvas;
		emulator.webgl_canvas = webgl_canvas;
		emulator.startAsync().then(() => {
			console.info('emulator started');
			emulator.onPic0.add((data: Uint8Array) => {
				Html5Icons.setPic0(data);
			});
			emulator.onPic1.add((data: Uint8Array) => {
				Html5Icons.setPic1(data);
			});

			debugOverlay.linkTo(emulator);

			emulator.onDrawBatches.add((drawBufferData, batches) => {
				//console.log('emulator.onDrawBatches');
				emulator.display.setEnabledDisplay(false);
				var transferData = _vertex.OptimizedDrawBufferTransfer.build(drawBufferData, batches);
				webglDriver.invalidatedMemoryAll();
				debugOverlay.overlay.updateAndReset();
				webglDriver.drawBatchesTransfer(transferData);
				debugOverlay.freezing.waitUntilValueAsync(false).then(() => {
					emulator.gpu.sync();
				});
				//console.log('drawBatches UI:', batches.length);
			});

			emulator.memory.invalidateDataAll.add(() => {
				//postAction('memory.invalidateDataAll', {});
			});

			emulator.memory.invalidateDataRange.add((low, high) => {
				//postAction('memory.invalidateDataRange', {low: low, high: high});
			});

			emulator.audio.onPlayDataAsync.add((id: number, channels: number, data: Int16Array, leftvolume: number, rightvolume: number) => {
				var clonedData = ArrayBufferUtils.cloneInt16Array(data);
				return audio.playDataAsync(id, channels, data, leftvolume, rightvolume);
			});
			emulator.audio.onStart.add((id: number) => {
				audio.startChannel(id);
			});
			emulator.audio.onStop.add((id: number) => {
				audio.stopChannel(id);
			});
		}).catch(e => {
			console.error(e);
		});



		console.log('base path', this.documentLocation);

		document.addEventListener('keydown', (e: KeyboardEvent) => {
			emulator.controller.setKeyDown(e.keyCode);
		});
		document.addEventListener('keyup', (e: KeyboardEvent) => {
			emulator.controller.setKeyUp(e.keyCode);
		});

		emulator.config.language = _config.Config.detectLanguage();

		var canDOMCreateElements = (typeof document != 'undefined');

		new Html5Gamepad().register(emulator.controller);
		debugOverlay.gpuFreezing.add((value: boolean) => {
			emulator.gpu.freezing.value = value;
		});
		debugOverlay.gpuDumpCommands.add(() => {
			emulator.gpu.dumpCommands();
		});
		Html5Battery.registerAndSetCallback((binfo) => {
			emulator.battery.charging = binfo.charging;
			emulator.battery.level = binfo.level;
			emulator.battery.lifetime = binfo.lifetime;
		});

		new Html5Gamepad().register(emulator.controller);

		Microtask.execute();
	}

	executeUrl(url: string): void {
		if (url.match(/^https?:\/\//)) {
			url = url;
		} else {
			url = `${this.documentLocation}/${url}`;
		}
		console.info('executeUrl:', url);
		this.emulator.downloadAndExecuteAsync(url);

	}

	executeFile(file: File): void {
		console.info('executeFile:', file);
		this.emulator.executeFileAsync(file);
	}
}

