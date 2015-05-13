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
emulatorWorker.onmessage = function(e) {
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
		case 'drawBatches':
			webglDriver.invalidatedMemoryAll();	
			webglDriver.drawBatchesTransfer(<_vertex.BatchesTransfer>payload);
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
};
//worker.postMessage({}); // Start the worker.

function postAction(type:string, payload:any) {
	emulatorWorker.postMessage({ action: type, payload: payload });
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
}

postAction('config.language', _config.Config.detectLanguage());