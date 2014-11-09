///<reference path="../../../global.d.ts" />

import _state = require('../state');
import _utils = require('./utils');

import WrappedWebGLProgram = _utils.WrappedWebGLProgram;

export class ShaderCache {
	private programs: NumberDictionary<WrappedWebGLProgram> = {};

	constructor(private gl: WebGLRenderingContext, private shaderVertString: string, private shaderFragString: string) {
	}

	getProgram(vertex: _state.VertexState, state: _state.GpuState) {
		var hash = vertex.hash;
		hash += Math.pow(2, 32) * (state.alphaTest.enabled ? 1 : 0);
		hash += Math.pow(2, 33) * (state.clearing ? 1 : 0);
		if (this.programs[hash]) return this.programs[hash];
		return this.programs[hash] = this.createProgram(vertex, state);
	}

	createProgram(vertex: _state.VertexState, state: _state.GpuState) {
		var defines = [];
		if (vertex.hasColor) defines.push('VERTEX_COLOR 1');
		if (vertex.hasTexture) defines.push('VERTEX_TEXTURE 1');
		if (vertex.hasNormal) defines.push('VERTEX_NORMAL 1');

		if (!state.clearing) {
			if (state.alphaTest.enabled) defines.push('ALPHATEST 1');
		}

		defines.push('VERTEX_SKINNING ' + vertex.realWeightCount);

		var preppend = defines.map(item => '#define ' + item + '').join("\n");

		return ShaderCache.shaderProgram(
			this.gl,
			preppend + "\n" + this.shaderVertString,
			preppend + "\n" + this.shaderFragString
			);
	}

	static shaderProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
		var prog = gl.createProgram();
		var addshader = function (type, source) {
			var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
			gl.shaderSource(s, source);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s) + "\n\n" + source));
			gl.attachShader(prog, s);
		};
		addshader('vertex', vs);
		addshader('fragment', fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw (new Error("Could not link the shader program!"));
		return new WrappedWebGLProgram(gl, prog, vs, fs);
	}
}
