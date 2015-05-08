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
	drawElements(state: _state.GpuState, primitiveType: _state.PrimitiveType, vertices: _state.Vertex[], count: number, vertexInfo: _state.VertexInfo):void {
		
	}
	drawUnoptimized(batch:_vertex.UnoptimizedBatch) {
		this.state.writeData(batch.stateData);
		this.drawElements(this.state, batch.primType, batch.vertices, batch.vertices.length, batch.vertexInfo);
	}
	drawOptimized(batch:_vertex.OptimizedBatch):void {
	}
	
	protected setOptimizedDrawBuffer(optimizedDrawBuffer:_vertex.OptimizedDrawBuffer) {
	}
	
	private batches:any[] = [];
	queueBatch(batch:_vertex.OptimizedBatch | _vertex.UnoptimizedBatch) {
		this.batches.push(batch);
	}
	
	drawAllQueuedBatches(vertexBuffer:_vertex.VertexBuffer, optimizedDrawBuffer:_vertex.OptimizedDrawBuffer) {
		this.setOptimizedDrawBuffer(optimizedDrawBuffer);
		for (let batch of this.batches) {
			if (batch instanceof _vertex.UnoptimizedBatch) {
				this.drawUnoptimized(batch);
			} else if (batch instanceof _vertex.OptimizedBatch) {
				this.drawOptimized(batch);
			}
		}
		optimizedDrawBuffer.reset();
		vertexBuffer.reset();
		this.batches = [];
	}
}
