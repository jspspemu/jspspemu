import "../../emu/global"

import {PromiseFast} from "../../global/utils";
import {GpuState} from "./gpu_state";
import {OptimizedBatch, OptimizedDrawBuffer} from "./gpu_vertex";

class Signal<T> {
}

export class BaseDrawDriver {
	rehashSignal = new Signal<number>();
	enableColors: boolean = true;
	enableTextures: boolean = true;
	enableSkinning: boolean = true;
	enableBilinear: boolean = true;
	private _antialiasing: boolean;
	
	private frameBufferWidth = 480;
	private frameBufferHeight = 272;
	protected state = new GpuState();
	
	setFramebufferSize(width:number, height:number) {
		this.frameBufferWidth = width;
		this.frameBufferHeight = height;
	}

	set antialiasing(value:boolean) {
		this._antialiasing = value;
	}
	
	get antialiasing() {
		return this._antialiasing;
	}

	getFramebufferSize() {
		return { width: this.frameBufferWidth, height: this.frameBufferHeight }
	}
	
	end(): void {
		
	}

	initAsync(): PromiseFast<any> {
		return PromiseFast.resolve();
	}

	/**
	 * Flush texture page-cache.
	 * 
	 * Do this if you have copied/rendered into an area currently in the texture-cache
	 */
	textureFlush(state: any):void {
		
	}

	/**
	 * Synchronize rendering pipeline with image upload.
	 * 
	 * This will stall the rendering pipeline until the current image upload initiated by sceGuCopyImage() has completed.
	 */
	textureSync(state: GpuState):void {
		
	}
	drawOptimized(batch: OptimizedBatch):void {
	}
	
	protected setOptimizedDrawBuffer(optimizedDrawBuffer: OptimizedDrawBuffer) {
	}
	
	private batches: OptimizedBatch[] = [];
	queueBatch(batch: OptimizedBatch) {
		this.batches.push(batch);
	}
	
	drawAllQueuedBatches(optimizedDrawBuffer: OptimizedDrawBuffer, drawRatio:number = 1.0) {
		this.setOptimizedDrawBuffer(optimizedDrawBuffer);
		for (let batch of this.batches.slice(0, this.batches.length * drawRatio)) this.drawOptimized(batch);
		optimizedDrawBuffer.reset();
		this.batches = [];
	}
}
