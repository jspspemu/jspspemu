///<reference path="./global.d.ts" />

//import {assert} from "chai"
//import {ColorEnum, IndexEnum, NumericEnum, VertexInfo} from "../src/core/gpu/gpu_state";

export function ref() { } // Workaround to allow typescript to include this module

describe('gpu', () => {
    describe('vertex reading', () => {
		it('should work', () => {
		    /*
            const vertexInfo = new VertexInfo()
            vertexInfo.size = 10
		
			vertexInfo.texture = NumericEnum.Void
			vertexInfo.color = ColorEnum.Void
			vertexInfo.normal = NumericEnum.Void
			vertexInfo.position = NumericEnum.Short
			vertexInfo.weight = NumericEnum.Void
			vertexInfo.index = IndexEnum.Void
			vertexInfo.weightCount = 1
			vertexInfo.morphingVertexCount = 1
			vertexInfo.transform2D = true
			vertexInfo.textureComponentsCount = 2
            vertexInfo.updateSizeAndPositions()

            const vertexReader = VertexReaderFactory.get(vertexInfo);

            const vi2 = new ArrayBuffer(128);
            const vi8 = new Uint8Array(vi2);
            const vertexInput = new DataView(vi2);
            vertexInput.setInt16(0, 100, true);
            vertexInput.setInt16(2, 200, true);
            vertexInput.setInt16(4, 0, true);

            vertexInput.setInt16(10, 200, true);
            vertexInput.setInt16(12, 300, true);
            vertexInput.setInt16(14, 400, true);

            const vertex1 = new Vertex();
            const vertex2 = new Vertex();

            //console.log(vertexReader.readCode);

            vertexReader.readCount([vertex1, vertex2], 0, vi8, 0, null, null, 2, vertexInfo.hasIndex);

            assert.equal(vertex1.px, 100);
            assert.equal(vertex1.py, 200);
            assert.equal(vertex1.pz, 0);

            assert.equal(vertex2.px, 200);
            assert.equal(vertex2.py, 300);
            assert.equal(vertex2.pz, 400);
		     */
        });
    });
});