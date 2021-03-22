import { WebGlPspDrawDriver } from '../core/gpu/webgl/webgl_driver';
import { DebugOverlay } from './emulator_overlay';
import { Emulator } from './emulator';
import { Html5Audio2 } from '../html5/Html5Audio';
import { Html5Battery } from '../html5/Html5Battery';
import { Html5Icons } from '../html5/Html5Icons';
import {ArrayBufferUtils, Microtask} from "../global/utils";
import {OptimizedDrawBufferTransfer} from "../core/gpu/gpu_vertex";
import {Config} from "../hle/config";

declare const self: any;

export class EmulatorControllerNormal {
	documentLocation = document.location.href.replace(/#.*$/, '').replace(/\/[^\/]*$/, '');
	emulator = new Emulator();
	audio = new Html5Audio2();

    private getOrCreateCanvas(): HTMLCanvasElement {
        return <HTMLCanvasElement>(document.getElementById('canvas'))
    }

	private getOrCreateWebglCanvas(): HTMLCanvasElement {
	    return <HTMLCanvasElement>(document.getElementById('webgl_canvas'))
    }

	async init() {
        if (!document.getElementById('canvas_container')) {
            const canvas_container = document.createElement('div')
            canvas_container.id = 'canvas_container'
            canvas_container.innerHTML = `
                <div id="touch_buttons">
                  <span id="directional_pad">
                    <span class="psp_button" id="button_left">2</span>
                    <span class="psp_button" id="button_up">3</span>
                    <span class="psp_button" id="button_right">1</span>
                    <span class="psp_button" id="button_down">4</span>
                  </span>
            
                  <span id="button_pad">
                    <span class="psp_button" id="button_cross">X</span>
                    <span class="psp_button" id="button_circle">C</span>
                    <span class="psp_button" id="button_triangle">T</span>
                    <span class="psp_button" id="button_square">S</span>
                  </span>
            
                  <span id="lr_pad">
                    <span class="psp_button" id="button_l">l</span>
                    <span class="psp_button" id="button_r">r</span>
                  </span>
            
                  <span id="select_start_pad">
                    <span class="psp_button" id="button_menu">MENU</span>
                    <span class="psp_button" id="button_start">A</span>
                    <span class="psp_button" id="button_select">B</span>
                  </span>
                </div>
            
                <canvas id="canvas" width="480" height="272" style="background: black; width: 960px; height: 544px; border: 0; display: block;"></canvas>
                <canvas id="webgl_canvas" width="960" height="544" style="background: black; width: 960px; height: 544px; border: 0; display: none; "></canvas>
            `;
            document.body.appendChild(canvas_container)
            document.body.style.padding = '0'
            document.body.style.margin = '0'
        }

        let emulator = this.emulator;
        let audio = this.audio;
        self.emulator = emulator;
        const canvas = this.getOrCreateCanvas();
        const webgl_canvas = this.getOrCreateWebglCanvas();
        const webglDriver = new WebGlPspDrawDriver(webgl_canvas, emulator.gpuStats);
        webglDriver.initAsync();
        let debugOverlay = new DebugOverlay(webglDriver);
        debugOverlay.register();

        emulator.canvas = canvas;
        emulator.webgl_canvas = webgl_canvas;
        try {
            emulator.start()
            console.info('emulator started');
            emulator.onPic0.add((data: Uint8Array) => {
                Html5Icons.setPic0(data);
            });
            emulator.onPic1.add((data: Uint8Array) => {
                Html5Icons.setPic1(data);
            });

            debugOverlay.linkTo(emulator);

            emulator.onDrawBatches.add(async function onDrawBatchesFrame(drawBufferData, batches) {
                //console.log('emulator.onDrawBatches');
                emulator.display.setEnabledDisplay(false);
                const transferData = OptimizedDrawBufferTransfer.buildBatchesTransfer(drawBufferData, batches);
                webglDriver.invalidatedMemoryAll();
                debugOverlay.overlay.updateAndReset();
                webglDriver.drawBatchesTransfer(transferData);
                await debugOverlay.freezing.waitUntilValueAsync(false)
                emulator.gpu.sync();
                //console.log('drawBatches UI:', batches.length);
            });

            emulator.memory.invalidateDataAll.add(() => {
                //postAction('memory.invalidateDataAll', {});
            });

            emulator.memory.invalidateDataRange.add((low, high) => {
                //postAction('memory.invalidateDataRange', {low: low, high: high});
            });

            emulator.audio.onPlayDataAsync.add((id: number, channels: number, data: Int16Array, leftvolume: number, rightvolume: number) => {
                return audio.playDataAsync(id, channels, ArrayBufferUtils.cloneInt16Array(data), leftvolume, rightvolume);
            });
            emulator.audio.onStart.add((id: number) => {
                audio.startChannel(id);
            });
            emulator.audio.onStop.add((id: number) => {
                audio.stopChannel(id);
            });
        } catch (e) {
			console.error(e);
		}

		console.log('base path', this.documentLocation);

		emulator.config.language = Config.detectLanguage();

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

