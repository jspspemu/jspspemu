describe('gpu', () => {
    describe('vertex reading', () => {
		it('should work', () => {
			var vertexState = new core.gpu.VertexState();
			vertexState.size = 10;
		
			vertexState.texture = core.gpu.NumericEnum.Void;
			vertexState.color = core.gpu.ColorEnum.Void;
			vertexState.normal = core.gpu.NumericEnum.Void;
			vertexState.position = core.gpu.NumericEnum.Short;
			vertexState.weight = core.gpu.NumericEnum.Void;
			vertexState.index = core.gpu.IndexEnum.Void;
			vertexState.weightCount = 1;
			vertexState.morphingVertexCount = 1;
			vertexState.transform2D = true;
			vertexState.textureComponentCount = 2;

			var vertexReader = core.gpu.VertexReaderFactory.get(vertexState);

            var vertexInput = new DataView(new ArrayBuffer(128));
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

			var vertex1 = new core.gpu.Vertex();
			var vertex2 = new core.gpu.Vertex();

            //console.log(vertexReader.readCode);

            vertexReader.readCount([vertex1, vertex2], vertexInput, 2);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
        });
    });
});