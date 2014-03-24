describe('gpu', () => {
    describe('vertex reading', () => {
        it('should work', () => {
			var texture = core.gpu.NumericEnum.Void;
			var color = core.gpu.ColorEnum.Void;
			var normal = core.gpu.NumericEnum.Void;
			var position = core.gpu.NumericEnum.Short;
			var weight = core.gpu.NumericEnum.Void;
			var index = core.gpu.IndexEnum.Void;
            var weightCount = 1;
            var morphingVertexCount = 1;
            var transform2D = true;
            var textureIndexCount = 2;
			var vertexReader = core.gpu.VertexReaderFactory.get(10, texture, color, normal, position, weight, index, weightCount, morphingVertexCount, transform2D, textureIndexCount);

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