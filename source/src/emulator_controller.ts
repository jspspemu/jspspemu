///<reference path="./emulator_bridge.d.ts" />

import { WebGlPspDrawDriver } from './core/gpu/webgl/webgl_driver';
import { PspCtrlButtons } from './core/controller';
import _vertex = require('./core/gpu/gpu_vertex');
import _config = require('./hle/config');

var canvas = <HTMLCanvasElement>(document.getElementById('canvas'));
var webgl_canvas = <HTMLCanvasElement>(document.getElementById('webgl_canvas'));

canvas.style.display = 'none';
webgl_canvas.style.display = 'block';

var webglDriver = new WebGlPspDrawDriver(webgl_canvas);
webglDriver.initAsync();

var ENABLE_WORKERS = true;
console.info('ENABLE_WORKERS', ENABLE_WORKERS);

var documentLocation = document.location.href;
documentLocation = documentLocation.replace(/#.*$/, '');
documentLocation = documentLocation.replace(/\/[^\/]*$/, '');
console.log('base path', documentLocation);

var blob = new Blob([`
	importScripts('${documentLocation}/jspspemu.js');
	importScripts('${documentLocation}/jspspemu-me.js');
	self.documentLocation = ${JSON.stringify(documentLocation)};
	require('src/emulator_worker');
`], {type : 'text/javascript'});

// Obtain a blob URL reference to our worker 'file'.
var blobURL = (<any>window).URL.createObjectURL(blob);

function changeFavicon(src:string) {
	if (typeof document == 'undefined') return;
	var link = document.createElement('link'),
		oldLink = document.getElementById('dynamic-favicon');
	link.id = 'dynamic-favicon';
	link.rel = 'shortcut icon';
	link.href = src;
	if (oldLink) {
		document.head.removeChild(oldLink);
	}
	document.head.appendChild(link);
}

var emulatorWorker = new Worker(blobURL);
emulatorWorker.onmessage = (e:MessageEvent) => {
	var action = e.data.action;
	var payload = e.data.payload;
	switch (action) {
		case 'pic0':
			changeFavicon(Stream.fromUint8Array(<Uint8Array>payload).toImageUrl());
			break;	
		case 'pic1':
			document.body.style.backgroundRepeat = 'no-repeat';
			document.body.style.backgroundSize = 'cover';
			document.body.style.backgroundPosition = 'center center';
			document.body.style.backgroundImage = 'url("' + Stream.fromUint8Array(<Uint8Array>payload).toImageUrl() + '")';
			break;
		case 'audio.start': audio.startChannel(payload.id); break;	
		case 'audio.stop': audio.stopChannel(payload.id); break;	
		case 'audio.data':
			audio.playDataAsync(payload.id, payload.channels, payload.data).then(() => {
				completeAction(e);
			});
			break;
		case 'gpu.draw':
			webglDriver.invalidatedMemoryAll();	
			overlay.updateAndReset();
			webglDriver.drawBatchesTransfer(<_vertex.BatchesTransfer>payload);
			freezing.waitUntilValueAsync(false).then(() => {
				postAction('gpu.sync', {});
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

interface BatteryManager {
	charging: boolean;
	chargingTime: number;
	dischargingTime: number;
	level: number;
	//onchargingchange: any;
	//onchargingtimechange: any;
	//ondischargingtimechange: any;
	//onlevelchange: any;
}

export class Battery {
	static instance: Battery = null;
	private static promise: Promise2<Battery> = null;
	
	constructor(private manager: BatteryManager) {
		Battery.instance = this;
	}
	
	get lifetime() {
		// Up to 10 hours, to avoid too high/infinite values
		if (this.manager != null) return Math.min(10 * 3600, this.manager.dischargingTime);
		return 3 * 3600;
	}
	
	get charging() {
		if (this.manager != null) return this.manager.charging;
		return true;
	}
	
	get level(): number {
		if (this.manager != null) return this.manager.level;
		return 1.0;
	}
	
	static getAsync():Promise2<Battery> {
		if (this.instance) return Promise2.resolve(this.instance);
		if (this.promise) return this.promise;
		if ((<any>navigator).battery) return Promise2.resolve(new Battery((<any>navigator).battery));
		if ((<any>navigator).getBattery) {
			
			return this.promise = Promise2.fromThenable<BatteryManager>((<any>navigator).getBattery()).then(v => {
				return new Battery(v);
			});
		}
		return Promise2.resolve(new Battery(null));
	}
}

setTimeout(() => {
	Battery.getAsync().then(battery => {
		function sendData():void {
			postAction('battery.info', <BatteryInfo>{
				charging: battery.charging,
				level: battery.level,
				lifetime: battery.lifetime,
			});
			
		}
		setInterval(() => {
			sendData();
		}, 300);
		sendData();
	});
}, 0);

export class PspAudioBuffer {
	offset: number = 0;

	constructor(private readedCallback: Function, public data: Float32Array) {
	}

	resolve() {
		if (this.readedCallback) this.readedCallback();
		this.readedCallback = null;
	}

	get hasMore() { return this.offset < this.length; }

	read() { return this.data[this.offset++] }

	get available() { return this.length - this.offset; }
	get length() { return this.data.length; }
}

class Audio2Channel {
	private buffers: PspAudioBuffer[] = [];
	private node: ScriptProcessorNode;
	currentBuffer: PspAudioBuffer;

	static convertS16ToF32(channels: number, input: Int16Array) {
		var output = new Float32Array(input.length * 2 / channels);
		switch (channels) {
			case 2:
				for (var n = 0; n < output.length; n++) output[n] = input[n] / 32767.0;
				break;
			case 1:
				for (var n = 0, m = 0; n < input.length; n++) {
					output[m++] = output[m++] = (input[n] / 32767.0);
				}
				break;
		}
		return output;
	}
	
	constructor(public id: number, public context: AudioContext) {
		if (this.context) {
			this.node = this.context.createScriptProcessor(1024, 2, 2);
			this.node.onaudioprocess = (e) => { this.process(e) };
		}
	}
	
	start() {
		if (this.node) this.node.connect(this.context.destination);
	}
	
	stop() {
		if (this.node) this.node.disconnect();
	}

	process(e: AudioProcessingEvent) {
		var left = e.outputBuffer.getChannelData(0);
		var right = e.outputBuffer.getChannelData(1);
		var sampleCount = left.length;
		var hidden = document.hidden;

		for (var n = 0; n < sampleCount; n++) {
			if (!this.currentBuffer) {
				if (this.buffers.length == 0) break;

				for (var m = 0; m < Math.min(3, this.buffers.length); m++) {
					this.buffers[m].resolve();
				}

				this.currentBuffer = this.buffers.shift();
				this.currentBuffer.resolve();
			}

			if (this.currentBuffer.available >= 2) {
				left[n] = this.currentBuffer.read();
				right[n] = this.currentBuffer.read();
			} else {
				this.currentBuffer = null;
				n--;
			}

			if (hidden) left[n] = right[n] = 0;
		}
	}

	playAsync(data: Float32Array): Promise2<any> {
		if (!this.node) return waitAsync(10).then(() => 0);

		if (this.buffers.length < 8) {
			//(data.length / 2)
			this.buffers.push(new PspAudioBuffer(null, data));
			//return 0;
			return Promise2.resolve(0);
		} else {
			return new Promise2<number>((resolved, rejected) => {
				this.buffers.push(new PspAudioBuffer(resolved, data));
				return 0;
			});
		}
	}

	playDataAsync(channels: number, data: Int16Array): Promise2<any> {
		console.log(channels, data);
		return this.playAsync(Audio2Channel.convertS16ToF32(channels, data));
	}
}

class Audio2 {
	private channels = new Map<number, Audio2Channel>();
	private context: AudioContext;
	
	constructor() {
		this.context = new AudioContext();
	}
	
	getChannel(id: number):Audio2Channel {
		if (!this.channels.has(id)) this.channels.set(id, new Audio2Channel(id, this.context));
		return this.channels.get(id);
	}
	
	startChannel(id: number) {
		return this.getChannel(id).start();
	}
	
	stopChannel(id: number) {
		return this.getChannel(id).stop();
	}
	
	playDataAsync(id:number, channels:number, data:Int16Array) {
		return this.getChannel(id).playDataAsync(channels, data);
	}
}

var audio = new Audio2();


//worker.postMessage({}); // Start the worker.

function postAction(type:string, payload:any) {
	emulatorWorker.postMessage({ action: type, payload: payload });
}

function completeAction(e:MessageEvent) {
	postAction('$complete', e.data.packetId);
}

document.addEventListener('keydown', (e:KeyboardEvent) => {
	postAction('keyDown', e.keyCode);
});
document.addEventListener('keyup', (e:KeyboardEvent) => {
	postAction('keyUp', e.keyCode);
});

var navigator = (typeof window != 'undefined') ? window.navigator : null;
var getGamepads = (navigator && navigator.getGamepads) ? navigator.getGamepads.bind(navigator) : null;

var gamepadButtonMapping = [
	PspCtrlButtons.cross, // 0
	PspCtrlButtons.circle, // 1
	PspCtrlButtons.square, // 2
	PspCtrlButtons.triangle, // 3
	PspCtrlButtons.leftTrigger, // 4
	PspCtrlButtons.rightTrigger, // 5
	PspCtrlButtons.volumeUp, // 6
	PspCtrlButtons.volumeDown, // 7
	PspCtrlButtons.select, // 8
	PspCtrlButtons.start, // 9
	PspCtrlButtons.home, // 10 - L3
	PspCtrlButtons.note, // 11 - L3
	PspCtrlButtons.up, // 12
	PspCtrlButtons.down, // 13
	PspCtrlButtons.left, // 14
	PspCtrlButtons.right, // 15
];

function gamepadsFrame() {
	if (!getGamepads) return;
	window.requestAnimationFrame(gamepadsFrame);
	//console.log('bbbbbbbbb');
	var gamepads = getGamepads();
	if (gamepads[0]) {
		//console.log('aaaaaaaa');
		var gamepad = gamepads[0];
		var buttons = gamepad['buttons'];
		var axes = gamepad['axes'];
	
		function checkButton(button:any) {
			if (typeof button == 'number') {
				return button != 0;
			} else {
				return button ? !!(button.pressed) : false;
			}
		}
	
		var buttonsData = new Uint8Array(16);
		for (var n = 0; n < 16; n++) {
			buttonsData[gamepadButtonMapping[n]] = checkButton(buttons[n]) ? 1 : 0;
		}
		postAction('gamepadFrame', { x: axes[0], y: axes[1], buttons: buttonsData });
	}
}
gamepadsFrame();

export class EmulatorController {
	static executeUrl(url: string) {
		postAction('executeUrl', url);
	}

	static executeFile(file: File) {
		postAction('executeFile', file);
	}
}

postAction('config.language', _config.Config.detectLanguage());

var canDOMCreateElements = (typeof document != 'undefined');

interface OverlaySection {
	element:HTMLElement;
	update():void;
	reset():void;
}

class OverlayCounter<T> implements OverlaySection {
	public value: T;
	public element:HTMLElement;
	constructor(public name: string, private resetValue: T, private representer?: (v: T) => any) {
		this.reset();
		if (canDOMCreateElements) {
			this.element = document.createElement('div');
		}
	}
	update() {
		if (this.element) this.element.innerHTML = `${this.name}: ${this.representedValue}`;
	}
	get representedValue() {
		return this.representer ? this.representer(this.value) : this.value;
	}
	reset() {
		this.value = this.resetValue;
	}
}

class OverlayIntent implements OverlaySection {
	public element:HTMLButtonElement;
	constructor(text:string, action: () => void) {
		if (canDOMCreateElements) {
			this.element = document.createElement('button');
			this.element.innerHTML = text;
			this.element.onclick = e => action();
		}
	}
	update() {
	}
	reset() {
	}
}

class OverlaySlider implements OverlaySection {
	public element: HTMLInputElement;
	constructor(text:string, initialRatio:number, action: (value:number) => void) {
		if (canDOMCreateElements) {
			this.element = document.createElement('input');
			this.element.type = 'range';
			this.element.min =`0`;
			this.element.max = `1000`;
			this.element.value = `${initialRatio * 1000}`;
			//this.element.innerHTML = text;
			var lastReportedValue = NaN;
			var report = (e: any) => {
				if (this.ratio == lastReportedValue) return;
				lastReportedValue = this.ratio;
				action(this.ratio);
			};
			this.element.onmousemove = report;
			this.element.onchange = report;
		}
	}
	set ratio(value:number) {
		this.value = value * 1000;
	}
	get ratio() {
		return (this.value / 1000);
	}
	set value(v:number) {
		this.element.value = `${v}`;
	}
	get value() {
		return +this.element.value;
	}
	update() {
	}
	reset() {
	}
}

class Overlay {
	private element: HTMLDivElement;
	private sections: OverlaySection[] = [];

	constructor() {
		var element = this.element = canDOMCreateElements ? document.createElement('div') : null;
		if (element) {
			element.style.position = 'absolute';
			element.style.zIndex = '10000';
			element.style.top = '0';
			element.style.right = '0';
			element.style.background = 'rgba(0, 0, 0, 0.3)';
			element.style.font = '12px Arial';
			element.style.width = '200px';
			element.style.height = 'auto';
			element.style.padding = '4px';
			element.style.color = 'white';
			document.body.appendChild(element);
		}
	}
	
	private addElement<T extends OverlaySection>(element:T):T {
		this.sections.push(element);
		if (this.element) {
			this.element.appendChild(element.element);
		}
		return element;
	}

	createCounter<T>(name: string, resetValue: T, representer?: (v: T) => any): OverlayCounter<T> {
		return this.addElement(new OverlayCounter(name, resetValue, representer));
	}
	
	createIntent(text: string, action: () => void) {
		return this.addElement(new OverlayIntent(text, action));
	}

	createSlider(text: string, initialRatio:number, action: (value:number) => void) {
		return this.addElement(new OverlaySlider(text, initialRatio, action));
	}
	
	update() {
		for (let section of this.sections) section.update();
	}

	private reset() {
		for (let s of this.sections) s.reset();
	}

	updateAndReset() {
		this.update();
		this.reset();
	}
}

var overlay = new Overlay();
var overlayBatchSlider = overlay.createSlider('batch', 1.0, (ratio) => {
	webglDriver.drawRatio = ratio;
	webglDriver.redrawLastTransfer();
});
var overlayIndexCount = overlay.createCounter('indexCount', 0, numberToSeparator);
var overlayNonIndexCount = overlay.createCounter('nonIndexCount', 0, numberToSeparator);
var overlayVertexCount = overlay.createCounter('vertexCount', 0, numberToSeparator);
var trianglePrimCount = overlay.createCounter('trianglePrimCount', 0, numberToSeparator);
var triangleStripPrimCount = overlay.createCounter('triangleStripPrimCount', 0, numberToSeparator);
var spritePrimCount = overlay.createCounter('spritePrimCount', 0, numberToSeparator);
var otherPrimCount = overlay.createCounter('otherPrimCount', 0, numberToSeparator);
var hashMemoryCount = overlay.createCounter('hashMemoryCount', 0, numberToSeparator);
var hashMemorySize = overlay.createCounter('hashMemorySize', 0, numberToFileSize);
var totalCommands = overlay.createCounter('totalCommands', 0, numberToSeparator);
var totalStalls = overlay.createCounter('totalStalls', 0, numberToSeparator);
var primCount = overlay.createCounter('primCount', 0, numberToSeparator);
var batchCount = overlay.createCounter('batchCount', 0, numberToSeparator);
var timePerFrame = overlay.createCounter('time', 0, (v) => `${v.toFixed(0) } ms`);

var freezing = new WatchValue(false);

overlay.createIntent('toggle colors', () => {
	webglDriver.enableColors = !webglDriver.enableColors; 
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('toggle antialiasing', () => {
	webglDriver.antialiasing = !webglDriver.antialiasing; 
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('toggle textures', () => {
	webglDriver.enableTextures = !webglDriver.enableTextures; 
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('skinning', () => {
	webglDriver.enableSkinning = !webglDriver.enableSkinning; 
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('bilinear', () => {
	webglDriver.enableBilinear = !webglDriver.enableBilinear; 
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('freeze', () => {
	freezing.value = !freezing.value;
	postAction('gpu.freezing', freezing.value);
});

var dumpFrameCommandsList:string[] = [];
overlay.createIntent('dump frame commands', () => {
	postAction('gpu.dumpcommands', {});
});

overlay.createIntent('x1', () => {
	webglDriver.setFramebufferSize(480 * 1, 272 * 1);
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('x2', () => {
	webglDriver.setFramebufferSize(480 * 2, 272 * 2);
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('x3', () => {
	webglDriver.setFramebufferSize(480 * 3, 272 * 3);
	webglDriver.redrawLastTransfer();
});

overlay.createIntent('x4', () => {
	webglDriver.setFramebufferSize(480 * 4, 272 * 4);
	webglDriver.redrawLastTransfer();
});

overlay.updateAndReset();