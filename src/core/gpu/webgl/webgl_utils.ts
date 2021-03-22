import "../../../emu/global"
import {StringDictionary} from "../../../global/utils";
import {mat4} from "../../../global/math";

const mat4x3 = mat4.create();

export class WrappedWebGLUniform {
	private location: WebGLUniformLocation;

	constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, private name: string) {
		this.location = gl.getUniformLocation(program, name)!
	}

	setMat4(data: Float32Array) {
		this.gl.uniformMatrix4fv(this.location, false, data);
	}

	setMat4x3(data: Float32Array) {
		mat4.from4x3(mat4x3, data);
		this.gl.uniformMatrix4fv(this.location, false, mat4x3);
	}

	set1i(x: number) { this.gl.uniform1i(this.location, x); }
	set1f(x: number) { this.gl.uniform1f(this.location, x); }
	set2f(x: number, y:number) { this.gl.uniform2f(this.location, x, y); }
	set4f(x: number, y: number, z: number, w: number) { this.gl.uniform4f(this.location, x, y, z, w); }
}

export class WrappedWebGLAttrib {
	public location: number;
	private buffer: WebGLBuffer;

	constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, private name: string) {
		this.location = gl.getAttribLocation(program, name);
	}

	enable() {
		if (this.location < 0) return;
		this.gl.enableVertexAttribArray(this.location);
	}

	disable() {
		if (this.location < 0) return;
		this.gl.disableVertexAttribArray(this.location);
	}

	setFloats(rsize: number, arr: Float32Array) {
		if (this.location < 0) return;

        const gl = this.gl;
        if (!this.buffer) this.buffer = this.gl.createBuffer()!
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		(<any>gl.bufferData)(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
		this.enable();
		gl.vertexAttribPointer(this.location, rsize, gl.FLOAT, false, 0, 0);
	}
}

export class WrappedWebGLProgram {
	private uniforms: StringDictionary<WrappedWebGLUniform> = {};
	private attribs: StringDictionary<WrappedWebGLAttrib> = {};
	
	public vPosition:WrappedWebGLAttrib;
	public vColor:WrappedWebGLAttrib;	
	public vTexcoord:WrappedWebGLAttrib;
	public vNormal:WrappedWebGLAttrib;
	public vertexWeight1:WrappedWebGLAttrib;
	public vertexWeight2:WrappedWebGLAttrib;

	constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, public vs: string, public fs: string) {
		this.vPosition = this.getAttrib('vPosition');
		this.vColor = this.getAttrib('vColor');
		this.vTexcoord = this.getAttrib('vTexcoord');
		this.vNormal = this.getAttrib('vNormal');
		this.vertexWeight1 = this.getAttrib('vertexWeight1');
		this.vertexWeight2 = this.getAttrib('vertexWeight2');
	}

	use() {
		this.gl.useProgram(this.program);
	}

	getUniform(name: string):WrappedWebGLUniform {
        let uniform = this.uniforms[name];
        if (!uniform) uniform = this.uniforms[name] = new WrappedWebGLUniform(this.gl, this.program, name);
		return uniform;
	}

	getAttrib(name: string):WrappedWebGLAttrib {
        let attrib = this.attribs[name];
        if (!attrib) attrib = this.attribs[name] = new WrappedWebGLAttrib(this.gl, this.program, name);
		return attrib;
	}
}

export class FastFloat32Buffer {
	private arrayBuffer = new ArrayBuffer(32768 * 4 * 4 * 4);
	private float32Array = new Float32Array(this.arrayBuffer);
	private index = 0;

	restart() {
		this.index = 0;
	}

	push(value: number) {
		this.float32Array[this.index++] = value;
	}

	push2(x: number, y: number) {
		this.float32Array[this.index++] = x;
		this.float32Array[this.index++] = y;
	}

	push3(x: number, y: number, z: number) {
		this.float32Array[this.index++] = x;
		this.float32Array[this.index++] = y;
		this.float32Array[this.index++] = z;
	}

	push4(x: number, y: number, z: number, w: number) {
		this.float32Array[this.index++] = x;
		this.float32Array[this.index++] = y;
		this.float32Array[this.index++] = z;
		this.float32Array[this.index++] = w;
	}

	slice() {
		return new Float32Array(this.arrayBuffer, 0, this.index);
	}
}
