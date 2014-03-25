var core;
(function (core) {
    (function (gpu) {
        (function (impl) {
            var Context2dPspDrawDriver = (function () {
                function Context2dPspDrawDriver(memory, canvas) {
                    this.memory = memory;
                    this.canvas = canvas;
                    this.transformMatrix = mat4.create();
                    this.test11 = false;
                    //this.gl = this.canvas.getContext('webgl');
                    this.context = this.canvas.getContext('2d');
                }
                Context2dPspDrawDriver.prototype.initAsync = function () {
                    return Promise.resolve();
                };

                Context2dPspDrawDriver.prototype.setClearMode = function (clearing, flags) {
                    this.clearing = clearing;
                };

                Context2dPspDrawDriver.prototype.setMatrices = function (projectionMatrix, viewMatrix, worldMatrix) {
                    this.projectionMatrix = projectionMatrix;
                    this.viewMatrix = viewMatrix;
                    this.worldMatrix = worldMatrix;

                    //mat4.copy(this.transformMatrix, this.projectionMatrix.values);
                    mat4.identity(this.transformMatrix);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.projectionMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.worldMatrix.values);
                    mat4.multiply(this.transformMatrix, this.transformMatrix, this.viewMatrix.values);
                };

                Context2dPspDrawDriver.prototype.setState = function (state) {
                };

                Context2dPspDrawDriver.prototype.textureFlush = function (state) {
                };

                Context2dPspDrawDriver.prototype.transformVertex = function (vertex, vertexState) {
                    if (vertexState.transform2D) {
                        return {
                            x: vertex.px,
                            y: vertex.py
                        };
                    }
                    var o = vec4.transformMat4(vec4.create(), vec4.fromValues(vertex.px, vertex.py, vertex.pz, 0), this.transformMatrix);
                    return {
                        x: o[0] * 480 / 2 + 480 / 2,
                        y: o[1] * 272 / 2 + 272 / 2
                    };
                };

                Context2dPspDrawDriver.prototype.drawSprites = function (vertices, count, vertexState) {
                    this.context.fillStyle = this.clearing ? 'black' : 'red';
                    for (var n = 0; n < count; n += 2) {
                        var a = this.transformVertex(vertices[n + 0], vertexState);
                        var b = this.transformVertex(vertices[n + 1], vertexState);
                        this.context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
                    }
                };

                Context2dPspDrawDriver.prototype.drawElements = function (primitiveType, vertices, count, vertexState) {
                    switch (primitiveType) {
                        case 6 /* Sprites */:
                            this.drawSprites(vertices, count, vertexState);
                            break;
                        case 3 /* Triangles */:
                            this.drawTriangles(vertices, count, vertexState);
                            break;
                    }
                };

                Context2dPspDrawDriver.prototype.drawTriangles = function (vertices, count, vertexState) {
                    this.context.fillStyle = this.clearing ? 'black' : 'red';
                    this.context.beginPath();

                    if (!this.test11) {
                        this.test11 = true;
                        console.log(vertices[0]);
                        console.log(vertices[1]);
                        console.log(vertices[2]);
                    }

                    for (var n = 0; n < count; n += 3) {
                        //console.log(n);
                        var v0 = this.transformVertex(vertices[n + 0], vertexState);
                        var v1 = this.transformVertex(vertices[n + 1], vertexState);
                        var v2 = this.transformVertex(vertices[n + 2], vertexState);
                        this.context.moveTo(v0.x, v0.y);
                        this.context.lineTo(v1.x, v1.y);
                        this.context.lineTo(v2.x, v2.y);
                    }
                    this.context.fill();
                };
                return Context2dPspDrawDriver;
            })();
        })(gpu.impl || (gpu.impl = {}));
        var impl = gpu.impl;
    })(core.gpu || (core.gpu = {}));
    var gpu = core.gpu;
})(core || (core = {}));
//# sourceMappingURL=gpu_c2d.js.map
