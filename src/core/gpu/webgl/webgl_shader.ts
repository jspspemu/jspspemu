﻿import "../../../emu/global"
import "./webgl_enums"
import {NumberDictionary} from "../../../global/utils";
import {WrappedWebGLProgram} from "./webgl_utils";
import {GpuState, VertexInfo} from "../gpu_state";
import {PixelFormatUtils} from "../../pixelformat";

export class ShaderCache {
	private programs: NumberDictionary<WrappedWebGLProgram> = {};

	constructor(private gl: WebGLRenderingContext, private shaderVertString: string, private shaderFragString: string) {
	}
	
	invalidateWithGl(gl: WebGLRenderingContext) {
		this.programs = {};
		this.gl = gl;
	}

	getProgram(vertex: VertexInfo, state: GpuState, optimized:boolean) {
        let hash = vertex.hash;
        hash += Math.pow(2, 32) * (state.alphaTest.enabled ? 1 : 0);
		hash += Math.pow(2, 33) * (state.clearing ? 1 : 0);
		hash += Math.pow(2, 34) * (optimized ? 1 : 0);
		if (this.programs[hash]) return this.programs[hash];
		return this.programs[hash] = this.createProgram(vertex, state, optimized);
	}

	createProgram(vertex: VertexInfo, state: GpuState, optimized:boolean) {
        const defines: string[] = [];
        if (optimized) defines.push('OPTIMIZED 1');
		if (vertex.transform2D) defines.push('TRANSFORM_2D 1');
		if (vertex.hasPosition) defines.push(`VERTEX_POSITION ${vertex.position}`);
		if (vertex.hasColor) defines.push(`VERTEX_COLOR ${vertex.color}`);
		if (vertex.hasTexture) {
			defines.push(`VERTEX_TEXTURE ${vertex.texture}`);
			if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
				defines.push('TEXTURE_CLUT 1');
			}
		}
		if (vertex.hasNormal) defines.push(`VERTEX_NORMAL ${vertex.normal}`);
		if (vertex.hasWeight) defines.push(`VERTEX_WEIGHT ${vertex.weight}`);

		if (!state.clearing) {
			if (state.alphaTest.enabled) defines.push('ALPHATEST 1');
		}

		defines.push(`VERTEX_SKINNING ${vertex.realWeightCount}`);

        const preppend = defines.map(item => `#define ${item}`).join("\n");

        return ShaderCache.shaderProgram(
			this.gl,
			preppend + "\n" + this.shaderVertString,
			preppend + "\n" + this.shaderFragString
			);
	}

	static shaderProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
		const prog = gl.createProgram()!
        const addshader = (type:string, source:string) => {
            const s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)!;
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
