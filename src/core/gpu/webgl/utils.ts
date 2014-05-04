export class WrappedWebGLUniform {
	private location: WebGLUniformLocation;

	constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, private name: string) {
		this.location = gl.getUniformLocation(program, name);
	}

	setMat4(data: Float32Array) {
		this.gl.uniformMatrix4fv(this.location, false, data);
	}

	set1i(value: number) {
		this.gl.uniform1i(this.location, value);
	}

	set4f(x: number, y: number, z: number, w: number) {
		this.gl.uniform4f(this.location, x, y, z, w);
	}
}

export class WrappedWebGLAttrib {
	private location: number;
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

		var gl = this.gl;
		if (!this.buffer) this.buffer = this.gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		(<any>gl.bufferData)(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
		this.enable();
		gl.vertexAttribPointer(this.location, rsize, gl.FLOAT, false, 0, 0);
	}
}

export class WrappedWebGLProgram {
	private uniforms: StringDictionary<WrappedWebGLUniform> = {};
	private attribs: StringDictionary<WrappedWebGLAttrib> = {};

	constructor(private gl: WebGLRenderingContext, private program: WebGLProgram, public vs: string, public fs: string) {
	}

	use() {
		this.gl.useProgram(this.program);
	}

	getUniform(name: string) {
		var uniform = this.uniforms[name];
		if (!uniform) uniform = this.uniforms[name] = new WrappedWebGLUniform(this.gl, this.program, name);
		return uniform;
	}

	getAttrib(name: string) {
		var attrib = this.attribs[name];
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
