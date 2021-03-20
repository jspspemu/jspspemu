import { WebGlPspDrawDriver } from '../core/gpu/webgl/webgl_driver';
import { GpuStats } from '../core/gpu/gpu_stats';
//import { BatteryInfo } from './core/battery';
import { DebugOverlay } from './emulator_overlay';
import { Emulator } from './emulator';
import { PspCtrlButtons, IPspControllerSet } from '../core/controller';
import { Html5Audio2 } from '../html5/Html5Audio';
import { Html5Battery } from '../html5/Html5Battery';
import { Html5Icons } from '../html5/Html5Icons';
import {Microtask} from "../global/utils";
import {BatchesTransfer} from "../core/gpu/gpu_vertex";
import {Config} from "../hle/config";
import {Html5Gamepad} from "../html5/Html5Gamepad";

declare var self: any;

export class EmulatorControllerWorker {
	documentLocation = document.location.href.replace(/#.*$/, '').replace(/\/[^\/]*$/, '');
	emulatorWorker = new Worker((<any>window).URL.createObjectURL(new Blob([`
		importScripts('${this.documentLocation}/jspspemu.js');
		importScripts('${this.documentLocation}/jspspemu-me.js');
		self.documentLocation = ${JSON.stringify(this.documentLocation)};
		require('src/emulator_worker');
	`], { type: 'text/javascript' })));

	init() {
		var canvas = <HTMLCanvasElement>(document.getElementById('canvas'));
		var webgl_canvas = <HTMLCanvasElement>(document.getElementById('webgl_canvas'));
		var audio = new Html5Audio2();

		//canvas.style.display = 'block';
		//webgl_canvas.style.display = 'none';

		var webglDriver = new WebGlPspDrawDriver(webgl_canvas, new GpuStats());
		webglDriver.initAsync();

		let debugOverlay = new DebugOverlay(webglDriver);
		debugOverlay.register();

		var ENABLE_WORKERS = true;
		console.info('ENABLE_WORKERS', ENABLE_WORKERS);
		console.log('base path', this.documentLocation);

		this.emulatorWorker.onmessage = (e: MessageEvent) => {
			var action = e.data.action;
			var payload = e.data.payload;
			switch (action) {
				case 'pic0':
					Html5Icons.setPic0(<Uint8Array>payload);
					break;
				case 'pic1':
					Html5Icons.setPic1(<Uint8Array>payload);
					break;
				case 'audio.start': audio.startChannel(payload.id); break;
				case 'audio.stop': audio.stopChannel(payload.id); break;
				case 'audio.data':
					audio.playDataAsync(payload.id, payload.channels, payload.data, payload.leftvolume, payload.rightvolume).then(() => {
						this.completeAction(e);
					});
					break;
				case 'gpu.draw':
					webglDriver.invalidatedMemoryAll();
					debugOverlay.overlay.updateAndReset();
					webglDriver.drawBatchesTransfer(<BatchesTransfer>payload);
					debugOverlay.freezing.waitUntilValueAsync(false).then(() => {
						this.postAction('gpu.sync', {});
					});
					//console.log('drawBatches UI:', batches.length);
					break;
				/*
				case 'memory.invalidateDataAll':
					webglDriver.invalidatedMemoryAll();	
					break;	
				case 'memory.invalidateDataRange':
					webglDriver.invalidatedMemoryRange(payload.low, payload.high);
					break;
				*/
				default:
					console.error('unknown UI action', action, payload);
					break;
			}
			Microtask.execute();
		};

		//worker.postMessage({}); // Start the worker.


		document.addEventListener('keydown', (e: KeyboardEvent) => {
			this.postAction('keyDown', e.keyCode);
		});
		document.addEventListener('keyup', (e: KeyboardEvent) => {
			this.postAction('keyUp', e.keyCode);
		});

		this.postAction('config.language', Config.detectLanguage());

		var canDOMCreateElements = (typeof document != 'undefined');

		let postAction = (action: string, payload: any) => {
			this.postAction(action, payload);
		};

		class WorkerPspController implements IPspControllerSet {
			setGamepadFrame(x: number, y: number, buttons: Uint8Array): void {
				postAction('gamepadFrame', { x: x, y: y, buttons: buttons });
			}
		}

		let workerController = new WorkerPspController();
		new Html5Gamepad().register(workerController);
		debugOverlay.gpuFreezing.add((value: boolean) => {
			this.postAction('gpu.freezing', value);
		});
		debugOverlay.gpuDumpCommands.add(() => {
			this.postAction('gpu.dumpcommands', {});
		});
		Html5Battery.registerAndSetCallback((bi) => {
			this.postAction('battery.info', bi);
		});
	}

	postAction(action: string, payload: any) {
		this.emulatorWorker.postMessage({ action: action, payload: payload });
	}

	completeAction(e: MessageEvent) {
		this.postAction('$complete', e.data.packetId);
	}

	executeUrl(url: string) {
		this.postAction('executeUrl', url);
	}

	executeFile(file: File) {
		this.postAction('executeFile', file);
	}
}
