var core;
(function (core) {
    (function (gpu) {
        (function (impl) {
            var ShaderGenerartor = (function () {
                function ShaderGenerartor() {
                }
                return ShaderGenerartor;
            })();

            var WebGlPspDrawDriver = (function () {
                function WebGlPspDrawDriver(memory, canvas) {
                    this.memory = memory;
                    this.canvas = canvas;
                    this.transformMatrix = mat4.create();
                    this.transformMatrix2d = mat4.create();
                    this.gl = this.canvas.getContext('experimental-webgl');
                    if (!this.gl) {
                        this.canvas.getContext('webgl');
                    }
                    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                    this.program = WebGlPspDrawDriver.shaderProgram(this.gl, [
                        "uniform mat4 u_modelViewProjMatrix;",
                        "attribute vec3 vPosition;",
                        "attribute vec4 vColor;",
                        "varying vec4 v_Color;",
                        "void main() {",
                        "   v_Color = vColor;",
                        "	gl_Position = u_modelViewProjMatrix * vec4(vPosition, 1.0);",
                        "}"
                    ].join("\n"), [
                        "precision mediump float;",
                        "varying vec4 v_Color;",
                        "void main() {",
                        "	gl_FragColor = v_Color;",
                        "}"
                    ].join("\n"));

                    this.transformMatrix2d = mat4.ortho(mat4.create(), 0, 480, 272, 0, -1000, +1000);
                }
                WebGlPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
                    this.clearing = clearing;
                };

                WebGlPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
                    this.projectionMatrix = projectionMatrix;
                    this.viewMatrix = viewMatrix;
                    this.worldMatrix = worldMatrix;

                    //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
                    mat4.identity(this.transformMatrix);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
                };

                WebGlPspDrawDriver.prototype.enableDisable = function (type, enable) {
                    if (enable)
                        this.gl.enable(type);
                    else
                        this.gl.disable(type);
                    return enable;
                };

                WebGlPspDrawDriver.prototype.setState = function (state) {
                    if (this.enableDisable(this.gl.CULL_FACE, state.culling.enabled)) {
                        this.gl.cullFace((state.culling.direction == 1 /* ClockWise */) ? this.gl.FRONT : this.gl.BACK);
                    }
                };

                WebGlPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
                    if (primitiveType == 6 /* Sprites */) {
                        return this.drawSprites(vertices, count, vertexState);
                    } else {
                        return this.drawElementsInternal(primitiveType, vertices, count, vertexState);
                    }
                };

                WebGlPspDrawDriver.prototype.textureFlush = function (state) {
                };

                WebGlPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
                    var vertices2 = [];
                    for (var n = 0; n < count; n += 2) {
                        var v0 = vertices[n + 0];
                        var v1 = vertices[n + 1];
                        v0.r = v1.r;
                        v0.g = v1.g;
                        v0.b = v1.b;
                        v0.a = v1.a;
                        var vtl = v0.clone();
                        var vtr = v0.clone();
                        var vbl = v1.clone();
                        var vbr = v1.clone();
                        vtr.px = v1.px;
                        vbl.px = v0.px;
                        vertices2.push(vtl, vtr, vbl);
                        vertices2.push(vtr, vbr, vbl);
                    }
                    this.drawElementsInternal(3 /* Triangles */, vertices2, vertices2.length, vertexState);
                };

                WebGlPspDrawDriver.prototype.drawElementsInternal = function (primitiveType, vertices, count, vertexState) {
                    //console.log(primitiveType);
                    var gl = this.gl;

                    gl.useProgram(this.program);

                    var positionData = [];
                    var colorData = [];
                    for (var n = 0; n < count; n++) {
                        var v = vertices[n];
                        positionData.push(v.px);
                        positionData.push(v.py);
                        positionData.push(v.pz);

                        if (vertexState.hasColor) {
                            colorData.push(v.r);
                            colorData.push(v.g);
                            colorData.push(v.b);
                            colorData.push(v.a);
                        } else {
                            colorData.push(1);
                            colorData.push(1);
                            colorData.push(1);
                            colorData.push(1);
                        }
                    }

                    WebGlPspDrawDriver.attributeSetFloats(gl, this.program, "vColor", 4, colorData);
                    WebGlPspDrawDriver.attributeSetFloats(gl, this.program, "vPosition", 3, positionData);
                    WebGlPspDrawDriver.uniformSetMat4(gl, this.program, 'u_modelViewProjMatrix', vertexState.transform2D ? this.transformMatrix2d : this.transformMatrix);

                    switch (primitiveType) {
                        case 0 /* Points */:
                            gl.drawArrays(gl.POINTS, 0, count);
                            break;
                        case 1 /* Lines */:
                            gl.drawArrays(gl.LINES, 0, count);
                            break;
                        case 2 /* LineStrip */:
                            gl.drawArrays(gl.LINE_STRIP, 0, count);
                            break;
                        case 3 /* Triangles */:
                            gl.drawArrays(gl.TRIANGLES, 0, count);
                            break;
                        case 4 /* TriangleStrip */:
                            gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
                            break;
                        case 5 /* TriangleFan */:
                            gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
                            break;
                    }

                    gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vPosition'));
                    gl.disableVertexAttribArray(gl.getAttribLocation(this.program, 'vColor'));
                };

                WebGlPspDrawDriver.uniformSetMat4 = function (gl, prog, uniform_name, arr) {
                    var loc = gl.getUniformLocation(prog, uniform_name);
                    gl.uniformMatrix4fv(loc, false, new Float32Array(arr));
                };

                WebGlPspDrawDriver.attributeSetFloats = function (gl, prog, attr_name, rsize, arr) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
                    var varr = new Float32Array(arr);
                    gl.bufferData(gl.ARRAY_BUFFER, varr, gl.STATIC_DRAW);
                    var attr = gl.getAttribLocation(prog, attr_name);
                    gl.enableVertexAttribArray(attr);
                    gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
                };

                WebGlPspDrawDriver.shaderProgram = function (gl, vs, fs) {
                    var prog = gl.createProgram();
                    var addshader = function (type, source) {
                        var s = gl.createShader((type == 'vertex') ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
                        gl.shaderSource(s, source);
                        gl.compileShader(s);
                        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                            throw (new Error("Could not compile " + type + " shader:\n\n" + gl.getShaderInfoLog(s)));
                        gl.attachShader(prog, s);
                    };
                    addshader('vertex', vs);
                    addshader('fragment', fs);
                    gl.linkProgram(prog);
                    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
                        throw (new Error("Could not link the shader program!"));
                    return prog;
                };
                return WebGlPspDrawDriver;
            })();
            impl.WebGlPspDrawDriver = WebGlPspDrawDriver;
        })(gpu.impl || (gpu.impl = {}));
        var impl = gpu.impl;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
//# sourceMappingURL=gpu_webgl.js.map
