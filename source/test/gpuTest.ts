///<reference path="./global.d.ts" />
export function ref() { } // Workaround to allow typescript to include this module

import _state = require('../src/core/gpu/state');
import _gpu = require('../src/core/gpu');
import VertexReaderFactory = _gpu.VertexReaderFactory;

describe('gpu', () => {
    describe('vertex reading', () => {
		it('should work', () => {
			var vertexInfo = new _state.VertexInfo();
			vertexInfo.size = 10;
		
			vertexInfo.texture = _state.NumericEnum.Void;
			vertexInfo.color = _state.ColorEnum.Void;
			vertexInfo.normal = _state.NumericEnum.Void;
			vertexInfo.position = _state.NumericEnum.Short;
			vertexInfo.weight = _state.NumericEnum.Void;
			vertexInfo.index = _state.IndexEnum.Void;
			vertexInfo.weightCount = 1;
			vertexInfo.morphingVertexCount = 1;
			vertexInfo.transform2D = true;
			vertexInfo.textureComponentsCount = 2;
            vertexInfo.updateSizeAndPositions();

			var vertexReader = VertexReaderFactory.get(vertexInfo)

            var vi2 = new ArrayBuffer(128);
            var vi8 = new Uint8Array(vi2);
            var vertexInput = new DataView(vi2);
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

			var vertex1 = new _state.Vertex();
			var vertex2 = new _state.Vertex();

            //console.log(vertexReader.readCode);

            vertexReader.readCount([vertex1, vertex2], 0, vi8, 0, null, null, 2, vertexInfo.hasIndex);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
        });
    });
});