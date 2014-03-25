module core.gpu.impl {
	class Context2dPspDrawDriver implements IDrawDriver {
		private context: CanvasRenderingContext2D;

		constructor(private memory: Memory, private canvas: HTMLCanvasElement) {
			//this.gl = this.canvas.getContext('webgl');
			this.context = this.canvas.getContext('2d');
		}

		private clearing: boolean;

		initAsync() {
			return Promise.resolve();
		}

		setClearMode(clearing: boolean, flags: number) {
			this.clearing = clearing;
		}

		projectionMatrix: Matrix4x4;
		viewMatrix: Matrix4x3;
		worldMatrix: Matrix4x3;
		transformMatrix = mat4.create();

		setMatrices(projectionMatrix: Matrix4x4, viewMatrix: Matrix4x3, worldMatrix: Matrix4x3) {
			this.projectionMatrix = projectionMatrix;
			this.viewMatrix = viewMatrix;
			this.worldMatrix = worldMatrix;
			//mat4.copy(this.transformMatrix, this.projectionMatrix.values);
			mat4.identity(this.transformMatrix);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
			mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
		}

		setState(state: GpuState) {
		}

		textureFlush(state: GpuState) {
		}

		test11: boolean = false;

		transformVertex(vertex: Vertex, vertexState: VertexState) {
			if (vertexState.transform2D) {
				return {
					x: vertex.px,
					y: vertex.py
				};
			}
			var o = vec4.transformMat4(vec4.create(), vec4.fromValues(vertex.px, vertex.py, vertex.pz, 0), this.transformMatrix);
			return {
				x: o[0] * 480 / 2 + 480 / 2,
				y: o[1] * 272 / 2 + 272 / 2
			};
		}

		drawSprites(vertices: Vertex[], count: number, vertexState: VertexState) {
			this.context.fillStyle = this.clearing ? 'black' : 'red';
			for (var n = 0; n < count; n += 2) {
				var a = this.transformVertex(vertices[n + 0], vertexState);
				var b = this.transformVertex(vertices[n + 1], vertexState);
				this.context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
			}
		}

		drawElements(primitiveType: PrimitiveType, vertices: Vertex[], count: number, vertexState: VertexState) {
			switch (primitiveType) {
				case PrimitiveType.Sprites:
					this.drawSprites(vertices, count, vertexState);
					break;
				case PrimitiveType.Triangles:
					this.drawTriangles(vertices, count, vertexState);
					break;
			}
		}

		drawTriangles(vertices: Vertex[], count: number, vertexState: VertexState) {
			this.context.fillStyle = this.clearing ? 'black' : 'red';
			this.context.beginPath();

			if (!this.test11) {
				this.test11 = true;
				console.log(vertices[0]);
				console.log(vertices[1]);
				console.log(vertices[2]);
			}

			for (var n = 0; n < count; n += 3) {
				//console.log(n);
				var v0 = this.transformVertex(vertices[n + 0], vertexState);
				var v1 = this.transformVertex(vertices[n + 1], vertexState);
				var v2 = this.transformVertex(vertices[n + 2], vertexState);
				this.context.moveTo(v0.x, v0.y);
				this.context.lineTo(v1.x, v1.y);
				this.context.lineTo(v2.x, v2.y);
			}
			this.context.fill();
		}
	}
}