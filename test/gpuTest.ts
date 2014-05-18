import _state = require('../src/core/gpu/state');
import _gpu = require('../src/core/gpu');

describe('gpu', () => {
    describe('vertex reading', () => {
		it('should work', () => {
			var vertexState = new _state.VertexState();
			vertexState.size = 10;
		
			vertexState.texture = _state.NumericEnum.Void;
			vertexState.color = _state.ColorEnum.Void;
			vertexState.normal = _state.NumericEnum.Void;
			vertexState.position = _state.NumericEnum.Short;
			vertexState.weight = _state.NumericEnum.Void;
			vertexState.index = _state.IndexEnum.Void;
			vertexState.weightCount = 1;
			vertexState.morphingVertexCount = 1;
			vertexState.transform2D = true;
			vertexState.textureComponentCount = 2;

			var vertexReader = _gpu.VertexReaderFactory.get(vertexState)

            var vertexInput = new DataView(new ArrayBuffer(128));
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

			var vertex1 = new _state.Vertex();
			var vertex2 = new _state.Vertex();

            //console.log(vertexReader.readCode);

            vertexReader.readCount([vertex1, vertex2], vertexInput, null, 2, vertexState.hasIndex);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
        });
    });
});