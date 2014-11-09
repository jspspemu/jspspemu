///<reference path="../../../global.d.ts" />
var mat4x3_indices = new Int32Array([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]);
var mat4x3 = mat4.create();
var WrappedWebGLUniform = (function () {
    function WrappedWebGLUniform(gl, program, name) {
        this.gl = gl;
        this.program = program;
        this.name = name;
        this.location = gl.getUniformLocation(program, name);
    }
    WrappedWebGLUniform.prototype.setMat4 = function (data) {
        this.gl.uniformMatrix4fv(this.location, false, data);
    };
    WrappedWebGLUniform.prototype.setMat4x3 = function (data, index) {
        mat4.identity(mat4x3);
        for (var n = 0; n < 12; n++)
            mat4x3[mat4x3_indices[n]] = data[index + n];
        this.gl.uniformMatrix4fv(this.location, false, data);
    };
    WrappedWebGLUniform.prototype.set1i = function (value) {
        this.gl.uniform1i(this.location, value);
    };
    WrappedWebGLUniform.prototype.set4f = function (x, y, z, w) {
        this.gl.uniform4f(this.location, x, y, z, w);
    };
    return WrappedWebGLUniform;
})();
exports.WrappedWebGLUniform = WrappedWebGLUniform;
var WrappedWebGLAttrib = (function () {
    function WrappedWebGLAttrib(gl, program, name) {
        this.gl = gl;
        this.program = program;
        this.name = name;
        this.location = gl.getAttribLocation(program, name);
    }
    WrappedWebGLAttrib.prototype.enable = function () {
        if (this.location < 0)
            return;
        this.gl.enableVertexAttribArray(this.location);
    };
    WrappedWebGLAttrib.prototype.disable = function () {
        if (this.location < 0)
            return;
        this.gl.disableVertexAttribArray(this.location);
    };
    WrappedWebGLAttrib.prototype.setFloats = function (rsize, arr) {
        if (this.location < 0)
            return;
        var gl = this.gl;
        if (!this.buffer)
            this.buffer = this.gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
        this.enable();
        gl.vertexAttribPointer(this.location, rsize, gl.FLOAT, false, 0, 0);
    };
    return WrappedWebGLAttrib;
})();
exports.WrappedWebGLAttrib = WrappedWebGLAttrib;
var WrappedWebGLProgram = (function () {
    function WrappedWebGLProgram(gl, program, vs, fs) {
        this.gl = gl;
        this.program = program;
        this.vs = vs;
        this.fs = fs;
        this.uniforms = {};
        this.attribs = {};
    }
    WrappedWebGLProgram.prototype.use = function () {
        this.gl.useProgram(this.program);
    };
    WrappedWebGLProgram.prototype.getUniform = function (name) {
        var uniform = this.uniforms[name];
        if (!uniform)
            uniform = this.uniforms[name] = new WrappedWebGLUniform(this.gl, this.program, name);
        return uniform;
    };
    WrappedWebGLProgram.prototype.getAttrib = function (name) {
        var attrib = this.attribs[name];
        if (!attrib)
            attrib = this.attribs[name] = new WrappedWebGLAttrib(this.gl, this.program, name);
        return attrib;
    };
    return WrappedWebGLProgram;
})();
exports.WrappedWebGLProgram = WrappedWebGLProgram;
var FastFloat32Buffer = (function () {
    function FastFloat32Buffer() {
        this.arrayBuffer = new ArrayBuffer(32768 * 4 * 4 * 4);
        this.float32Array = new Float32Array(this.arrayBuffer);
        this.index = 0;
    }
    FastFloat32Buffer.prototype.restart = function () {
        this.index = 0;
    };
    FastFloat32Buffer.prototype.push = function (value) {
        this.float32Array[this.index++] = value;
    };
    FastFloat32Buffer.prototype.push2 = function (x, y) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
    };
    FastFloat32Buffer.prototype.push3 = function (x, y, z) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
        this.float32Array[this.index++] = z;
    };
    FastFloat32Buffer.prototype.push4 = function (x, y, z, w) {
        this.float32Array[this.index++] = x;
        this.float32Array[this.index++] = y;
        this.float32Array[this.index++] = z;
        this.float32Array[this.index++] = w;
    };
    FastFloat32Buffer.prototype.slice = function () {
        return new Float32Array(this.arrayBuffer, 0, this.index);
    };
    return FastFloat32Buffer;
})();
exports.FastFloat32Buffer = FastFloat32Buffer;
//# sourceMappingURL=utils.js.map