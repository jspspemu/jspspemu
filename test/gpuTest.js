describe('gpu', function () {
    describe('vertex reading', function () {
        it('should work', function () {
            var texture = 0 /* Void */;
            var color = 0 /* Void */;
            var normal = 0 /* Void */;
            var position = 2 /* Short */;
            var weight = 0 /* Void */;
            var index = 0 /* Void */;
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
//# sourceMappingURL=gpuTest.js.map
