///<reference path="../../../global.d.ts" />
var _utils = require('./utils');
var WrappedWebGLProgram = _utils.WrappedWebGLProgram;
var ShaderCache = (function () {
    function ShaderCache(gl, shaderVertString, shaderFragString) {
        this.gl = gl;
        this.shaderVertString = shaderVertString;
        this.shaderFragString = shaderFragString;
        this.programs = {};
    }
    ShaderCache.prototype.getProgram = function (vertex, state) {
        var hash = vertex.hash;
        hash += Math.pow(2, 32) * (state.alphaTest.enabled ? 1 : 0);
        hash += Math.pow(2, 33) * (state.clearing ? 1 : 0);
        if (this.programs[hash])
            return this.programs[hash];
        return this.programs[hash] = this.createProgram(vertex, state);
    };
    ShaderCache.prototype.createProgram = function (vertex, state) {
        var defines = [];
        if (vertex.hasColor)
            defines.push('VERTEX_COLOR 1');
        if (vertex.hasTexture)
            defines.push('VERTEX_TEXTURE 1');
        if (vertex.hasNormal)
            defines.push('VERTEX_NORMAL 1');
        if (!state.clearing) {
            if (state.alphaTest.enabled)
                defines.push('ALPHATEST 1');
        }
        defines.push('VERTEX_SKINNING ' + vertex.realWeightCount);
        var preppend = defines.map(function (item) { return '#define ' + item + ''; }).join("\n");
        return ShaderCache.shaderProgram(this.gl, preppend + "\n" + this.shaderVertString, preppend + "\n" + this.shaderFragString);
    };
    ShaderCache.shaderProgram = function (gl, vs, fs) {
        var prog = gl.createProgram();
        var addshader = function (type, source) {
            var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s) + "\n\n" + source));
            gl.attachShader(prog, s);
        };
        addshader('vertex', vs);
        addshader('fragment', fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw (new Error("Could not link the shader program!"));
        return new WrappedWebGLProgram(gl, prog, vs, fs);
    };
    return ShaderCache;
})();
exports.ShaderCache = ShaderCache;
//# sourceMappingURL=shader.js.map