///<reference path="../../global.d.ts" />

import _state = require('./gpu_state');
import _vertex = require('./gpu_vertex');

export class BaseDrawDriver {
	rehashSignal = new Signal<number>();
	enableColors: boolean = true;
	enableTextures: boolean = true;
	enableSkinning: boolean = true;
	enableBilinear: boolean = true;
	private _antialiasing: boolean;
	
	private frameBufferWidth = 480;
	private frameBufferHeight = 272;
	protected state = new _state.GpuState();
	
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

	initAsync(): Promise2<any> {
		return Promise2.resolve();
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
	textureSync(state: _state.GpuState):void {
		
	}
	drawOptimized(batch:_vertex.OptimizedBatch):void {
	}
	
	protected setOptimizedDrawBuffer(optimizedDrawBuffer:_vertex.OptimizedDrawBuffer) {
	}
	
	private batches:_vertex.OptimizedBatch[] = [];
	queueBatch(batch:_vertex.OptimizedBatch) {
		this.batches.push(batch);
	}
	
	drawAllQueuedBatches(optimizedDrawBuffer:_vertex.OptimizedDrawBuffer, drawRatio:number = 1.0) {
		this.setOptimizedDrawBuffer(optimizedDrawBuffer);
		for (let batch of this.batches.slice(0, this.batches.length * drawRatio)) this.drawOptimized(batch);
		optimizedDrawBuffer.reset();
		this.batches = [];
	}
}
