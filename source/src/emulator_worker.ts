import { Emulator } from './emulator';
import _vertex = require('./core/gpu/gpu_vertex');

declare var self: any;
declare var documentLocation: any;
declare function postMessage(data: any, transferables?: any[]): void;

function postAction(type: string, payload: any, transferables?: any[]) {
	if (transferables) {
		postMessage({ action: type, payload: payload }, transferables);
	} else {
		postMessage({ action: type, payload: payload });
	}
}

var emulator = new Emulator();
self.emulator = emulator;

emulator.startAsync().then(() => {
	console.info('emulator started');
	emulator.onPic0.add((data: Uint8Array) => {
		postAction('pic0', data);
	});
	emulator.onPic1.add((data:Uint8Array) => {
		postAction('pic1', data);
	});
}).catch(e => {
	console.error(e);
});

emulator.onDrawBatches.add((drawBufferData, batches) => {
	var transferData = _vertex.OptimizedDrawBufferTransfer.build(drawBufferData, batches);
	postAction('drawBatches', transferData, [transferData.buffer]);
});

emulator.memory.invalidateDataAll.add(() => {
	//postAction('memory.invalidateDataAll', {});
});

emulator.memory.invalidateDataRange.add((low, high) => {
	//postAction('memory.invalidateDataRange', {low: low, high: high});
});

onmessage = function(e: MessageEvent) {
	var action = e.data.action;
	var payload = e.data.payload;
	switch (action) {
		case 'executeUrl':
			// @TODO: check absolute url 
			var url = `${documentLocation}/${payload}`;
			console.info('executeUrl:', url);
			emulator.downloadAndExecuteAsync(url);
			break;	
		case 'config.language':
			emulator.config.language = payload;	
			break;	
		case 'keyDown': emulator.controller.setKeyDown(payload); break;
		case 'keyUp': emulator.controller.setKeyUp(payload); break;
		case 'gamepadFrame':
			emulator.controller.setGamepadFrame(payload.x, payload.y, payload.buttons);
			break;
		default:
			console.error('unknown worker action', action, payload);	
			break;	
			//worker.postMessage({ action: 'executeUrl', url: url });
	
	}
	//postMessage('msg from worker');
}	
