import { Emulator } from './emulator';
import { BatteryInfo } from './core/battery';
import _vertex = require('./core/gpu/gpu_vertex');
import {ArrayBufferUtils, Microtask, Promise2} from "./global/utils";

declare var self: any;
declare var documentLocation: any;
declare function postMessage(data: any, transferables?: any[]): void;

var lastPacketId: number = 0;
function postAction(type: string, payload: any, transferables?: any[]) {
	var packetId = lastPacketId++;
	postMessage({ packetId: packetId, action: type, payload: payload }, transferables);
}

var waiters = new Map<number, () => void>();
function postActionWaitAsync(type: string, payload: any, transferables?: any[]) {
	var packetId = lastPacketId++;
	postMessage({ packetId: packetId, action: type, payload: payload }, transferables);
	return new Promise2((resolve, reject) => {
		waiters.set(packetId, () => {
			waiters.delete(packetId);
			resolve();
		});
	});
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
	postAction('gpu.draw', transferData, [transferData.buffer]);
});

emulator.memory.invalidateDataAll.add(() => {
	//postAction('memory.invalidateDataAll', {});
});

emulator.memory.invalidateDataRange.add((low, high) => {
	//postAction('memory.invalidateDataRange', {low: low, high: high});
});

emulator.audio.onPlayDataAsync.add((id: number, channels:number, data: Int16Array, leftvolume:number, rightvolume:number) => {
	var clonedData = ArrayBufferUtils.cloneInt16Array(data);
	return postActionWaitAsync('audio.data', {
		id: id, channels: channels, data: clonedData,
		leftvolume: leftvolume, rightvolume: rightvolume,
	}, [clonedData.buffer]);
});
emulator.audio.onStart.add((id: number) => {
	postAction('audio.start', {id: id});
});
emulator.audio.onStop.add((id: number) => {
	postAction('audio.stop', {id: id});
});

onmessage = function(e: MessageEvent) {
	var action:string = e.data.action;
	var payload:any = e.data.payload;
	switch (action) {
		case '$complete':
			waiters.get(payload)();
			break;	
		case 'executeUrl':
			// @TODO: check absolute url
			var url: string;
			if (payload.match(/^https?:\/\//)) {
				url = payload;
			} else {			
				url = `${documentLocation}/${payload}`;
			}
			console.info('executeUrl:', url);
			emulator.downloadAndExecuteAsync(url);
			break;	
		case 'executeFile':
			var file = payload;	
			console.info('executeFile:', file);
			emulator.executeFileAsync(file);
			break;	
		case 'config.language':
			emulator.config.language = payload;	
			break;
		case 'gpu.dumpcommands':
			emulator.gpu.dumpCommands();	
			break;
		case 'gpu.freezing':
			emulator.gpu.freezing.value = payload;	
			break;	
		case 'gpu.sync':
			emulator.gpu.sync();	
			break;
		case 'battery.info':
			var binfo = <BatteryInfo>payload;	
			emulator.battery.charging = binfo.charging;
			emulator.battery.level = binfo.level;
			emulator.battery.lifetime = binfo.lifetime;
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
	Microtask.execute();
	//postMessage('msg from worker');
}	
