///<reference path="../../global.d.ts" />
var _state = require('./state');
var _IndentStringGenerator = require('../../util/IndentStringGenerator');
var ColorEnum = _state.ColorEnum;
var VertexBuffer = (function () {
    function VertexBuffer() {
        this.offsetLength = 0;
        this.vertices = [];
        this.triangleStripOffset = 0;
    }
    VertexBuffer.prototype.reset = function () {
        this.offsetLength = 0;
    };
    VertexBuffer.prototype.take = function (count) {
        var result = this.offsetLength;
        this.offsetLength += count;
        return result;
    };
    VertexBuffer.prototype.startDegenerateTriangleStrip = function () {
        this.triangleStripOffset = this.ensureAndTake(2);
    };
    VertexBuffer.prototype.endDegenerateTriangleStrip = function () {
        var offset = this.triangleStripOffset;
        this.vertices[offset + 0].copyFrom(this.vertices[offset - 1]);
        this.vertices[offset + 1].copyFrom(this.vertices[offset + 2]);
    };
    VertexBuffer.prototype.ensure = function (count) {
        count += this.offsetLength;
        while (this.vertices.length < count)
            this.vertices.push(new _state.Vertex());
    };
    VertexBuffer.prototype.ensureAndTake = function (count) {
        this.ensure(count);
        return this.take(count);
    };
    return VertexBuffer;
})();
exports.VertexBuffer = VertexBuffer;
var VertexReaderFactory = (function () {
    function VertexReaderFactory() {
    }
    VertexReaderFactory.get = function (vertexState) {
        var cacheId = vertexState.hash;
        var vertexReader = this.cache[cacheId];
        if (vertexReader === undefined)
            vertexReader = this.cache[cacheId] = new VertexReader(vertexState.clone());
        return vertexReader;
    };
    VertexReaderFactory.cache = {};
    return VertexReaderFactory;
})();
exports.VertexReaderFactory = VertexReaderFactory;
var VertexReader = (function () {
    function VertexReader(vertexState) {
        this.vertexState = vertexState;
        this.readOffset = 0;
        this.oneOuput = [new _state.Vertex()];
        this.oneIndices = [0];
        this.input2 = new Uint8Array(1 * 1024 * 1024);
        this.s8 = new Int8Array(this.input2.buffer);
        this.s16 = new Int16Array(this.input2.buffer);
        this.s32 = new Int32Array(this.input2.buffer);
        this.f32 = new Float32Array(this.input2.buffer);
        this.readCode = this.createJs();
        this.readOneFunc = (new Function('output', 'inputOffset', 'f32', 's8', 's16', 's32', '"use strict";' + this.readCode));
    }
    VertexReader.prototype.readOne = function (input, index) {
        this.oneIndices[0] = index;
        this.oneOuput[0] = new _state.Vertex();
        this.readCount(this.oneOuput, 0, input, this.oneIndices, 1, true);
        return this.oneOuput[0];
    };
    VertexReader.prototype.readCount = function (output, verticesOffset, input, indices, count, hasIndex) {
        if (hasIndex) {
            var maxDatacount = 0;
            for (var n = 0; n < count; n++)
                maxDatacount = Math.max(maxDatacount, indices[n] + 1);
        }
        else {
            maxDatacount = count;
        }
        maxDatacount *= this.vertexState.size;
        this.input2.set(new Uint8Array(input.buffer, input.byteOffset, maxDatacount));
        //debugger;
        if (hasIndex) {
            for (var n = 0; n < count; n++) {
                var index = indices[n];
                this.readOneFunc(output[verticesOffset + n], index * this.vertexState.size, this.f32, this.s8, this.s16, this.s32);
            }
        }
        else {
            var inputOffset = 0;
            for (var n = 0; n < count; n++) {
                this.readOneFunc(output[verticesOffset + n], inputOffset, this.f32, this.s8, this.s16, this.s32);
                inputOffset += this.vertexState.size;
            }
        }
    };
    VertexReader.prototype.createJs = function () {
        var indentStringGenerator = new _IndentStringGenerator();
        this.readOffset = 0;
        var normalize = !this.vertexState.transform2D;
        this.createNumberJs([1, 0x80, 0x8000, 1], true, indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, normalize);
        this.createNumberJs([1, 0x80, 0x8000, 1], false, indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, normalize);
        this.createColorJs(indentStringGenerator, this.vertexState.color);
        this.createNumberJs([1, 0x7F, 0x7FFF, 1], true, indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, normalize);
        this.createNumberJs([1, 0x7F, 0x7FFF, 1], true, indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, normalize);
        //if (this.vertexState.hasWeight) indentStringGenerator.write("debugger;\n");
        return indentStringGenerator.output;
    };
    VertexReader.prototype.readInt8 = function () {
        return '(s8[inputOffset + ' + this.getOffsetAlignAndIncrement(1) + '])';
    };
    VertexReader.prototype.readInt16 = function () {
        return '(s16[(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ') >> 1])';
    };
    VertexReader.prototype.readInt32 = function () {
        return '(s32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])';
    };
    VertexReader.prototype.readFloat32 = function () {
        return '(f32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])';
    };
    VertexReader.prototype.readUInt8 = function () {
        return '((' + this.readInt8() + ' & 0xFF) >>> 0)';
    };
    VertexReader.prototype.readUInt16 = function () {
        return '((' + this.readInt16() + ' & 0xFFFF) >>> 0)';
    };
    VertexReader.prototype.readUInt32 = function () {
        return '((' + this.readInt32() + ' & 0xFFFFFFFF) >>> 0)';
    };
    VertexReader.prototype.createColorJs = function (indentStringGenerator, type) {
        if (type == 0 /* Void */)
            return;
        var alignment = 4;
        var sizes = [8, 8, 8, 8];
        var components = ['r', 'g', 'b', 'a'];
        switch (type) {
            case 7 /* Color8888 */:
                alignment = 4;
                sizes = [8, 8, 8, 8];
                break;
            case 5 /* Color5551 */:
                alignment = 2;
                sizes = [5, 5, 5, 1];
                break;
            case 6 /* Color4444 */:
                alignment = 2;
                sizes = [4, 4, 4, 4];
                break;
            case 4 /* Color5650 */:
                alignment = 2;
                sizes = [5, 6, 5, 0];
                break;
            default:
                throw (new Error("Not implemented color format '" + type + "'"));
        }
        this.align(alignment);
        indentStringGenerator.write('var temp = (' + ((alignment == 2) ? this.readUInt16() : this.readUInt32()) + ');\n');
        var offset = 0;
        for (var n = 0; n < 4; n++) {
            var size = sizes[n], component = components[n];
            indentStringGenerator.write('output.' + component + ' = ');
            indentStringGenerator.write((size != 0) ? ('(((temp >> ' + offset + ') & ' + BitUtils.mask(size) + ') / ' + BitUtils.mask(size) + ');') : '1.0');
            indentStringGenerator.write('\n');
            offset += size;
        }
        //indentStringGenerator.write('debugger;\n');
    };
    VertexReader.prototype.align = function (count) {
        this.readOffset = MathUtils.nextAligned(this.readOffset, count);
    };
    VertexReader.prototype.getOffsetAlignAndIncrement = function (size) {
        this.align(size);
        var offset = this.readOffset;
        this.readOffset += size;
        return offset;
    };
    VertexReader.prototype.createNumberJs = function (scales, signed, indentStringGenerator, components, type, normalize) {
        var _this = this;
        if (type == 0 /* Void */)
            return;
        components.forEach(function (component) {
            switch (type) {
                case 1 /* Byte */:
                    indentStringGenerator.write('output.' + component + ' = ' + (signed ? _this.readInt8() : _this.readUInt8()));
                    break;
                case 2 /* Short */:
                    indentStringGenerator.write('output.' + component + ' = ' + (signed ? _this.readInt16() : _this.readUInt16()));
                    break;
                case 3 /* Float */:
                    indentStringGenerator.write('output.' + component + ' = ' + (_this.readFloat32()));
                    break;
            }
            if (normalize && (scales[type] != 1))
                indentStringGenerator.write(' * ' + (1 / scales[type]));
            indentStringGenerator.write(';\n');
        });
    };
    return VertexReader;
})();
exports.VertexReader = VertexReader;
//# sourceMappingURL=vertex.js.map