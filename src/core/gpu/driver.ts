import state = require('./state');


export interface IDrawDriver {
	setClearMode(clearing: boolean, clearFlags: number);
	setState(state: any);
	setMatrices(projectionMatrix: state.Matrix4x4, viewMatrix: state.Matrix4x3, worldMatrix: state.Matrix4x3);

	/**
	 * Flush texture page-cache.
	 * 
	 * Do this if you have copied/rendered into an area currently in the texture-cache
	 */
	textureFlush(state: any);

	/**
	 * Synchronize rendering pipeline with image upload.
	 * 
	 * This will stall the rendering pipeline until the current image upload initiated by sceGuCopyImage() has completed.
	 */
	textureSync(state: any);
	drawElements(primitiveType: state.PrimitiveType, vertices: state.Vertex[], count: number, vertexState: state.VertexState);
	initAsync(): Promise<any>;
}
