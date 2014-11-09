///<reference path="../../global.d.ts" />
var _memory = require('../memory');
var _pixelformat = require('../pixelformat');
var PixelFormat = _pixelformat.PixelFormat;
(function (CullingDirection) {
    CullingDirection[CullingDirection["CounterClockWise"] = 0] = "CounterClockWise";
    CullingDirection[CullingDirection["ClockWise"] = 1] = "ClockWise";
})(exports.CullingDirection || (exports.CullingDirection = {}));
var CullingDirection = exports.CullingDirection;
(function (SyncType) {
    SyncType[SyncType["WaitForCompletion"] = 0] = "WaitForCompletion";
    SyncType[SyncType["Peek"] = 1] = "Peek";
})(exports.SyncType || (exports.SyncType = {}));
var SyncType = exports.SyncType;
(function (DisplayListStatus) {
    DisplayListStatus[DisplayListStatus["Completed"] = 0] = "Completed";
    DisplayListStatus[DisplayListStatus["Queued"] = 1] = "Queued";
    DisplayListStatus[DisplayListStatus["Drawing"] = 2] = "Drawing";
    DisplayListStatus[DisplayListStatus["Stalling"] = 3] = "Stalling";
    DisplayListStatus[DisplayListStatus["Paused"] = 4] = "Paused";
})(exports.DisplayListStatus || (exports.DisplayListStatus = {}));
var DisplayListStatus = exports.DisplayListStatus;
var GpuFrameBufferState = (function () {
    function GpuFrameBufferState() {
        this._widthHighAddress = -1;
        this.lowAddress = 0;
        this.highAddress = 0;
        this.width = 0;
    }
    return GpuFrameBufferState;
})();
exports.GpuFrameBufferState = GpuFrameBufferState;
(function (IndexEnum) {
    IndexEnum[IndexEnum["Void"] = 0] = "Void";
    IndexEnum[IndexEnum["Byte"] = 1] = "Byte";
    IndexEnum[IndexEnum["Short"] = 2] = "Short";
})(exports.IndexEnum || (exports.IndexEnum = {}));
var IndexEnum = exports.IndexEnum;
(function (NumericEnum) {
    NumericEnum[NumericEnum["Void"] = 0] = "Void";
    NumericEnum[NumericEnum["Byte"] = 1] = "Byte";
    NumericEnum[NumericEnum["Short"] = 2] = "Short";
    NumericEnum[NumericEnum["Float"] = 3] = "Float";
})(exports.NumericEnum || (exports.NumericEnum = {}));
var NumericEnum = exports.NumericEnum;
(function (ColorEnum) {
    ColorEnum[ColorEnum["Void"] = 0] = "Void";
    ColorEnum[ColorEnum["Invalid1"] = 1] = "Invalid1";
    ColorEnum[ColorEnum["Invalid2"] = 2] = "Invalid2";
    ColorEnum[ColorEnum["Invalid3"] = 3] = "Invalid3";
    ColorEnum[ColorEnum["Color5650"] = 4] = "Color5650";
    ColorEnum[ColorEnum["Color5551"] = 5] = "Color5551";
    ColorEnum[ColorEnum["Color4444"] = 6] = "Color4444";
    ColorEnum[ColorEnum["Color8888"] = 7] = "Color8888";
})(exports.ColorEnum || (exports.ColorEnum = {}));
var ColorEnum = exports.ColorEnum;
var Vertex = (function () {
    function Vertex() {
        this.px = 0.0;
        this.py = 0.0;
        this.pz = 0.0;
        this.nx = 0.0;
        this.ny = 0.0;
        this.nz = 0.0;
        this.tx = 0.0;
        this.ty = 0.0;
        this.tz = 0.0;
        this.r = 0.0;
        this.g = 0.0;
        this.b = 0.0;
        this.a = 1.0;
        this.w0 = 0.0;
        this.w1 = 0.0;
        this.w2 = 0.0;
        this.w3 = 0.0;
        this.w4 = 0.0;
        this.w5 = 0.0;
        this.w6 = 0.0;
        this.w7 = 0.0;
    }
    Vertex.prototype.copyFromBasic = function (that) {
        this.px = that.px;
        this.py = that.py;
        this.pz = that.pz;
        this.tx = that.tx;
        this.ty = that.ty;
        this.tz = that.tz;
        this.r = that.r;
        this.g = that.g;
        this.b = that.b;
        this.a = that.a;
        return this;
    };
    Vertex.prototype.copyFrom = function (that) {
        this.copyFromBasic(that);
        this.nx = that.nx;
        this.ny = that.ny;
        this.nz = that.nz;
        this.w0 = that.w0;
        this.w1 = that.w1;
        this.w2 = that.w2;
        this.w3 = that.w3;
        this.w4 = that.w4;
        this.w5 = that.w5;
        this.w6 = that.w6;
        this.w7 = that.w7;
        return this;
    };
    Vertex.prototype.clone = function () {
        var that = new Vertex();
        that.copyFrom(this);
        return that;
    };
    return Vertex;
})();
exports.Vertex = Vertex;
var VertexState = (function () {
    function VertexState() {
        this.address = 0;
        this._value = 0;
        this.reversedNormal = false;
        this.textureComponentCount = 2;
    }
    VertexState.prototype.clone = function () {
        var that = new VertexState();
        that.address = this.address;
        that._value = this._value;
        that.reversedNormal = this.reversedNormal;
        that.textureComponentCount = this.textureComponentCount;
        that.size = this.size;
        return that;
    };
    VertexState.prototype.getValue = function () {
        return this._value;
    };
    VertexState.prototype.setValue = function (value) {
        this._value = value;
        this.size = this.getVertexSize();
    };
    Object.defineProperty(VertexState.prototype, "hash", {
        //getReader() { return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount); }
        get: function () {
            return this._value + (this.textureComponentCount * Math.pow(2, 24));
        },
        enumerable: true,
        configurable: true
    });
    VertexState.prototype.toString = function () {
        return 'VertexState(' + JSON.stringify({
            address: this.address,
            texture: this.texture,
            color: this.color,
            normal: this.normal,
            position: this.position,
            weight: this.weight,
            index: this.index,
            realWeightCount: this.realWeightCount,
            morphingVertexCount: this.morphingVertexCount,
            transform2D: this.transform2D,
        }) + ')';
    };
    Object.defineProperty(VertexState.prototype, "hasTexture", {
        get: function () {
            return this.texture != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasColor", {
        get: function () {
            return this.color != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasNormal", {
        get: function () {
            return this.normal != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasPosition", {
        get: function () {
            return this.position != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasWeight", {
        get: function () {
            return this.weight != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "hasIndex", {
        get: function () {
            return this.index != 0 /* Void */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "texture", {
        get: function () {
            return BitUtils.extractEnum(this._value, 0, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 0, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "color", {
        get: function () {
            return BitUtils.extractEnum(this._value, 2, 3);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 2, 3, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "normal", {
        get: function () {
            return BitUtils.extractEnum(this._value, 5, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 5, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "position", {
        get: function () {
            return BitUtils.extractEnum(this._value, 7, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 7, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "weight", {
        get: function () {
            return BitUtils.extractEnum(this._value, 9, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 9, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "index", {
        get: function () {
            return BitUtils.extractEnum(this._value, 11, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 11, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "weightCount", {
        get: function () {
            return BitUtils.extract(this._value, 14, 3);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 14, 3, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "morphingVertexCount", {
        get: function () {
            return BitUtils.extract(this._value, 18, 2);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 18, 2, value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "transform2D", {
        get: function () {
            return BitUtils.extractBool(this._value, 23);
        },
        set: function (value) {
            this._value = BitUtils.insert(this._value, 23, 1, value ? 1 : 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "weightSize", {
        get: function () {
            return this.NumericEnumGetSize(this.weight);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "colorSize", {
        get: function () {
            return this.ColorEnumGetSize(this.color);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "textureSize", {
        get: function () {
            return this.NumericEnumGetSize(this.texture);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "positionSize", {
        get: function () {
            return this.NumericEnumGetSize(this.position);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "normalSize", {
        get: function () {
            return this.NumericEnumGetSize(this.normal);
        },
        enumerable: true,
        configurable: true
    });
    VertexState.prototype.IndexEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 1 /* Byte */:
                return 1;
            case 2 /* Short */:
                return 2;
            default:
                throw ("Invalid enum");
        }
    };
    VertexState.prototype.NumericEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 1 /* Byte */:
                return 1;
            case 2 /* Short */:
                return 2;
            case 3 /* Float */:
                return 4;
            default:
                throw ("Invalid enum");
        }
    };
    VertexState.prototype.ColorEnumGetSize = function (item) {
        switch (item) {
            case 0 /* Void */:
                return 0;
            case 4 /* Color5650 */:
                return 2;
            case 5 /* Color5551 */:
                return 2;
            case 6 /* Color4444 */:
                return 2;
            case 7 /* Color8888 */:
                return 4;
            default:
                throw ("Invalid enum");
        }
    };
    VertexState.prototype.GetMaxAlignment = function () {
        return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
    };
    Object.defineProperty(VertexState.prototype, "realWeightCount", {
        get: function () {
            return this.hasWeight ? (this.weightCount + 1) : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VertexState.prototype, "realMorphingVertexCount", {
        get: function () {
            return this.morphingVertexCount + 1;
        },
        enumerable: true,
        configurable: true
    });
    VertexState.prototype.getVertexSize = function () {
        var size = 0;
        size = MathUtils.nextAligned(size, this.weightSize);
        size += this.realWeightCount * this.weightSize;
        size = MathUtils.nextAligned(size, this.textureSize);
        size += this.textureComponentCount * this.textureSize;
        size = MathUtils.nextAligned(size, this.colorSize);
        size += 1 * this.colorSize;
        size = MathUtils.nextAligned(size, this.normalSize);
        size += 3 * this.normalSize;
        size = MathUtils.nextAligned(size, this.positionSize);
        size += 3 * this.positionSize;
        var alignmentSize = this.GetMaxAlignment();
        size = MathUtils.nextAligned(size, alignmentSize);
        //Console.WriteLine("Size:" + Size);
        return size;
    };
    VertexState.prototype.read = function (memory, count) {
        //console.log('read vertices ' + count);
        var vertices = [];
        for (var n = 0; n < count; n++)
            vertices.push(this.readOne(memory));
        return vertices;
    };
    VertexState.prototype.readOne = function (memory) {
        var address = this.address;
        var vertex = {};
        //console.log(vertex);
        this.address += this.size;
        return vertex;
    };
    return VertexState;
})();
exports.VertexState = VertexState;
var Matrix4x4 = (function () {
    function Matrix4x4() {
        this.index = 0;
        this.values = mat4.create();
        //for (var n = 0; n < 16; n++) this.values[n] = -1;
    }
    Matrix4x4.prototype.check = function (value) {
        var check = (this.values[this.index] == value);
        if (check)
            this.index++;
        return check;
    };
    Matrix4x4.prototype.put = function (value) {
        this.values[this.index++] = value;
    };
    Matrix4x4.prototype.getAt = function (index, value) {
        return this.values[index];
    };
    Matrix4x4.prototype.putAt = function (index, value) {
        this.values[index] = value;
    };
    Matrix4x4.prototype.reset = function (startIndex) {
        this.index = startIndex;
    };
    return Matrix4x4;
})();
exports.Matrix4x4 = Matrix4x4;
var Matrix4x3 = (function () {
    function Matrix4x3() {
        this.index = 0;
        this.values = mat4.create();
    }
    Matrix4x3.prototype.check = function (value) {
        var check = (this.values[Matrix4x3.indices[this.index]] == value);
        if (check)
            this.index++;
        return check;
    };
    Matrix4x3.prototype.put = function (value) {
        this.putAt(this.index++, value);
    };
    Matrix4x3.prototype.getAt = function (index) {
        return this.values[Matrix4x3.indices[index]];
    };
    Matrix4x3.prototype.putAt = function (index, value) {
        this.values[Matrix4x3.indices[index]] = value;
    };
    Matrix4x3.prototype.reset = function (startIndex) {
        this.index = startIndex;
    };
    Matrix4x3.indices = new Int32Array([
        0,
        1,
        2,
        4,
        5,
        6,
        8,
        9,
        10,
        12,
        13,
        14
    ]);
    return Matrix4x3;
})();
exports.Matrix4x3 = Matrix4x3;
var ViewPort = (function () {
    function ViewPort() {
        this.x = 2048;
        this.y = 2048;
        this.z = 0;
        this.width = 256;
        this.height = 136;
        this.depth = 0;
    }
    return ViewPort;
})();
exports.ViewPort = ViewPort;
var Region = (function () {
    function Region() {
        this._xy1 = -1;
        this._xy2 = -1;
        this.x1 = 0;
        this.y1 = 0;
        this.x2 = 512;
        this.y2 = 272;
    }
    return Region;
})();
exports.Region = Region;
var Light = (function () {
    function Light() {
        this._type = -1;
        this._specularColor = -1;
        this._diffuseColor = -1;
        this._ambientColor = -1;
        this.enabled = false;
        this.kind = 0 /* SingleColor */;
        this.type = 0 /* Directional */;
        this.cutoff = 0;
        this.px = 0;
        this.py = 0;
        this.pz = 0;
        this.pw = 1;
        this.dx = 0;
        this.dy = 0;
        this.dz = 0;
        this.dw = 1;
        this.spotExponent = 0;
        this.spotCutoff = 0;
        this.constantAttenuation = 0;
        this.linearAttenuation = 0;
        this.quadraticAttenuation = 0;
        this.ambientColor = new Color();
        this.diffuseColor = new Color();
        this.specularColor = new Color();
    }
    return Light;
})();
exports.Light = Light;
(function (LightTypeEnum) {
    LightTypeEnum[LightTypeEnum["Directional"] = 0] = "Directional";
    LightTypeEnum[LightTypeEnum["PointLight"] = 1] = "PointLight";
    LightTypeEnum[LightTypeEnum["SpotLight"] = 2] = "SpotLight";
})(exports.LightTypeEnum || (exports.LightTypeEnum = {}));
var LightTypeEnum = exports.LightTypeEnum;
(function (LightModelEnum) {
    LightModelEnum[LightModelEnum["SingleColor"] = 0] = "SingleColor";
    LightModelEnum[LightModelEnum["SeparateSpecularColor"] = 1] = "SeparateSpecularColor";
})(exports.LightModelEnum || (exports.LightModelEnum = {}));
var LightModelEnum = exports.LightModelEnum;
var Lightning = (function () {
    function Lightning() {
        this._ambientLightColor = -1;
        this._ambientLightColorAlpha = -1;
        this.enabled = false;
        this.lights = [new Light(), new Light(), new Light(), new Light()];
        this.lightModel = 1 /* SeparateSpecularColor */;
        this.specularPower = 1;
        this.ambientLightColor = new ColorState();
    }
    return Lightning;
})();
exports.Lightning = Lightning;
var MipmapState = (function () {
    function MipmapState() {
        this.tsizeValue = -1;
        this.address = 0;
        this.bufferWidth = 0;
        this.textureWidth = 0;
        this.textureHeight = 0;
    }
    return MipmapState;
})();
exports.MipmapState = MipmapState;
var ColorState = (function () {
    function ColorState() {
        this.r = 1;
        this.g = 1;
        this.b = 1;
        this.a = 1;
    }
    return ColorState;
})();
exports.ColorState = ColorState;
var ClutState = (function () {
    function ClutState() {
        this.adress = 0;
        this.numberOfColors = 0;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.shift = 0;
        this.mask = 0x00;
        this.start = 0;
    }
    return ClutState;
})();
exports.ClutState = ClutState;
(function (TextureProjectionMapMode) {
    TextureProjectionMapMode[TextureProjectionMapMode["GU_POSITION"] = 0] = "GU_POSITION";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_UV"] = 1] = "GU_UV";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_NORMALIZED_NORMAL"] = 2] = "GU_NORMALIZED_NORMAL";
    TextureProjectionMapMode[TextureProjectionMapMode["GU_NORMAL"] = 3] = "GU_NORMAL";
})(exports.TextureProjectionMapMode || (exports.TextureProjectionMapMode = {}));
var TextureProjectionMapMode = exports.TextureProjectionMapMode;
(function (TextureMapMode) {
    TextureMapMode[TextureMapMode["GU_TEXTURE_COORDS"] = 0] = "GU_TEXTURE_COORDS";
    TextureMapMode[TextureMapMode["GU_TEXTURE_MATRIX"] = 1] = "GU_TEXTURE_MATRIX";
    TextureMapMode[TextureMapMode["GU_ENVIRONMENT_MAP"] = 2] = "GU_ENVIRONMENT_MAP";
})(exports.TextureMapMode || (exports.TextureMapMode = {}));
var TextureMapMode = exports.TextureMapMode;
(function (TextureLevelMode) {
    TextureLevelMode[TextureLevelMode["Auto"] = 0] = "Auto";
    TextureLevelMode[TextureLevelMode["Const"] = 1] = "Const";
    TextureLevelMode[TextureLevelMode["Slope"] = 2] = "Slope";
})(exports.TextureLevelMode || (exports.TextureLevelMode = {}));
var TextureLevelMode = exports.TextureLevelMode;
var TextureState = (function () {
    function TextureState() {
        this.tmode = -1;
        this.tflt = -1;
        this.twrap = -1;
        this.tmap = -1;
        this._envColor = -1;
        this._tfunc = -1;
        this._shadeUV = -1;
        this._tbias = -1;
        this.enabled = false;
        this.swizzled = false;
        this.matrix = new Matrix4x4();
        this.mipmapShareClut = false;
        this.mipmapMaxLevel = 0;
        this.filterMinification = 0 /* Nearest */;
        this.filterMagnification = 0 /* Nearest */;
        this.wrapU = 0 /* Repeat */;
        this.offsetU = 0;
        this.offsetV = 0;
        this.scaleU = 1;
        this.scaleV = 1;
        this.shadeU = 0;
        this.shadeV = 0;
        this.wrapV = 0 /* Repeat */;
        this.effect = 0 /* Modulate */;
        this.colorComponent = 0 /* Rgb */;
        this.envColor = new ColorState();
        this.fragment2X = false;
        this.pixelFormat = 3 /* RGBA_8888 */;
        this.clut = new ClutState();
        this.mipmaps = [new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState()];
        this.textureProjectionMapMode = 3 /* GU_NORMAL */;
        this.textureMapMode = 0 /* GU_TEXTURE_COORDS */;
        this.slopeLevel = 0;
        this.levelMode = 0 /* Auto */;
        this.mipmapBias = 1.0;
    }
    TextureState.prototype.getTextureComponentsCount = function () {
        switch (this.textureMapMode) {
            default:
                throw (new Error("Invalid textureMapMode"));
            case 0 /* GU_TEXTURE_COORDS */:
                return 2;
            case 1 /* GU_TEXTURE_MATRIX */:
                switch (this.textureProjectionMapMode) {
                    case 3 /* GU_NORMAL */:
                        return 3;
                    case 2 /* GU_NORMALIZED_NORMAL */:
                        return 3;
                    case 0 /* GU_POSITION */:
                        return 3;
                    case 1 /* GU_UV */:
                        return 2;
                    default:
                        return 2;
                }
                break;
            case 2 /* GU_ENVIRONMENT_MAP */:
                return 2;
        }
    };
    return TextureState;
})();
exports.TextureState = TextureState;
var CullingState = (function () {
    function CullingState() {
        this.enabled = false;
        this.direction = 1 /* ClockWise */;
    }
    return CullingState;
})();
exports.CullingState = CullingState;
(function (TestFunctionEnum) {
    TestFunctionEnum[TestFunctionEnum["Never"] = 0] = "Never";
    TestFunctionEnum[TestFunctionEnum["Always"] = 1] = "Always";
    TestFunctionEnum[TestFunctionEnum["Equal"] = 2] = "Equal";
    TestFunctionEnum[TestFunctionEnum["NotEqual"] = 3] = "NotEqual";
    TestFunctionEnum[TestFunctionEnum["Less"] = 4] = "Less";
    TestFunctionEnum[TestFunctionEnum["LessOrEqual"] = 5] = "LessOrEqual";
    TestFunctionEnum[TestFunctionEnum["Greater"] = 6] = "Greater";
    TestFunctionEnum[TestFunctionEnum["GreaterOrEqual"] = 7] = "GreaterOrEqual";
})(exports.TestFunctionEnum || (exports.TestFunctionEnum = {}));
var TestFunctionEnum = exports.TestFunctionEnum;
var DepthTestState = (function () {
    function DepthTestState() {
        this.updated = false;
        this.enabled = false;
        this.func = 1 /* Always */;
        this.mask = 0;
        this.rangeFar = 1;
        this.rangeNear = 0;
    }
    return DepthTestState;
})();
exports.DepthTestState = DepthTestState;
(function (ShadingModelEnum) {
    ShadingModelEnum[ShadingModelEnum["Flat"] = 0] = "Flat";
    ShadingModelEnum[ShadingModelEnum["Smooth"] = 1] = "Smooth";
})(exports.ShadingModelEnum || (exports.ShadingModelEnum = {}));
var ShadingModelEnum = exports.ShadingModelEnum;
(function (GuBlendingFactor) {
    GuBlendingFactor[GuBlendingFactor["GU_SRC_COLOR"] = 0] = "GU_SRC_COLOR";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_SRC_COLOR"] = 1] = "GU_ONE_MINUS_SRC_COLOR";
    GuBlendingFactor[GuBlendingFactor["GU_SRC_ALPHA"] = 2] = "GU_SRC_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_SRC_ALPHA"] = 3] = "GU_ONE_MINUS_SRC_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_DST_ALPHA"] = 4] = "GU_DST_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_ONE_MINUS_DST_ALPHA"] = 5] = "GU_ONE_MINUS_DST_ALPHA";
    GuBlendingFactor[GuBlendingFactor["GU_FIX"] = 10] = "GU_FIX";
})(exports.GuBlendingFactor || (exports.GuBlendingFactor = {}));
var GuBlendingFactor = exports.GuBlendingFactor;
(function (GuBlendingEquation) {
    GuBlendingEquation[GuBlendingEquation["Add"] = 0] = "Add";
    GuBlendingEquation[GuBlendingEquation["Substract"] = 1] = "Substract";
    GuBlendingEquation[GuBlendingEquation["ReverseSubstract"] = 2] = "ReverseSubstract";
    GuBlendingEquation[GuBlendingEquation["Min"] = 3] = "Min";
    GuBlendingEquation[GuBlendingEquation["Max"] = 4] = "Max";
    GuBlendingEquation[GuBlendingEquation["Abs"] = 5] = "Abs";
})(exports.GuBlendingEquation || (exports.GuBlendingEquation = {}));
var GuBlendingEquation = exports.GuBlendingEquation;
var Color = (function () {
    function Color(r, g, b, a) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        if (a === void 0) { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    Color.prototype.setRGB = function (rgb) {
        this.r = BitUtils.extractScale1f(rgb, 0, 8);
        this.g = BitUtils.extractScale1f(rgb, 8, 8);
        this.b = BitUtils.extractScale1f(rgb, 16, 8);
        this.a = 1;
    };
    Color.prototype.set = function (r, g, b, a) {
        if (a === void 0) { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    };
    Color.add = function (a, b, dest) {
        if (dest === void 0) { dest = null; }
        if (dest == null)
            dest = new Color();
        dest.r = a.r + b.r;
        dest.g = a.g + b.g;
        dest.b = a.b + b.b;
        dest.a = a.a * b.a;
        return dest;
    };
    Color.prototype.equals = function (r, g, b, a) {
        return (this.r == r) && (this.g == g) && (this.b == b) && (this.a == a);
    };
    return Color;
})();
exports.Color = Color;
var Blending = (function () {
    function Blending() {
        this._alpha = -1;
        this._colorMask = -1;
        this._colorMaskA = -1;
        this.enabled = false;
        this.updated = false;
        this.functionSource = 2 /* GU_SRC_ALPHA */;
        this.functionDestination = 5 /* GU_ONE_MINUS_DST_ALPHA */;
        this.equation = 0 /* Add */;
        this._fixColorSourceWord = -1;
        this._fixColorDestinationWord = -1;
        this.fixColorSource = new Color();
        this.fixColorDestination = new Color();
        this.colorMask = { r: 0, g: 0, b: 0, a: 0 };
    }
    return Blending;
})();
exports.Blending = Blending;
var AlphaTest = (function () {
    function AlphaTest() {
        this._atst = -1;
        this.enabled = false;
        this.value = 0;
        this.mask = 0xFF;
        this.func = 1 /* Always */;
    }
    return AlphaTest;
})();
exports.AlphaTest = AlphaTest;
var Rectangle = (function () {
    function Rectangle(top, left, right, bottom) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }
    Object.defineProperty(Rectangle.prototype, "width", {
        get: function () {
            return this.right - this.left;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "height", {
        get: function () {
            return this.bottom - this.top;
        },
        enumerable: true,
        configurable: true
    });
    return Rectangle;
})();
exports.Rectangle = Rectangle;
var ClipPlane = (function () {
    function ClipPlane() {
        this.updated = false;
        this.enabled = true;
        this.scissor = new Rectangle(0, 0, 512, 272);
        this._scissorLeftTop = -1;
        this._scissorRightBottom = -1;
    }
    return ClipPlane;
})();
exports.ClipPlane = ClipPlane;
var SkinningState = (function () {
    function SkinningState() {
        this._currentBoneIndex = 0;
        this.boneMatrices = [new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3()];
        this.linear = new Float32Array(96);
        this._currentBoneMatrix = 0;
        this._currentBoneMatrixIndex = 0;
    }
    SkinningState.prototype.setCurrentBoneIndex = function (index) {
        this._currentBoneIndex = index;
        this._currentBoneMatrix = ToInt32(this._currentBoneIndex / 12);
        this._currentBoneMatrixIndex = ToInt32(this._currentBoneIndex % 12);
    };
    SkinningState.prototype._increment = function () {
        this._currentBoneMatrixIndex++;
        this._currentBoneIndex++;
        if (this._currentBoneMatrixIndex >= 12) {
            this._currentBoneMatrix++;
            this._currentBoneMatrixIndex = 0;
        }
    };
    SkinningState.prototype.check = function (value) {
        var check = (this.linear[this._currentBoneIndex] == value);
        if (check)
            this._increment();
        return check;
    };
    SkinningState.prototype.write = function (value) {
        this.linear[this._currentBoneIndex] = value;
        this.boneMatrices[this._currentBoneMatrix].putAt(this._currentBoneMatrixIndex, value);
        this._increment();
    };
    return SkinningState;
})();
exports.SkinningState = SkinningState;
(function (StencilOperationEnum) {
    StencilOperationEnum[StencilOperationEnum["Keep"] = 0] = "Keep";
    StencilOperationEnum[StencilOperationEnum["Zero"] = 1] = "Zero";
    StencilOperationEnum[StencilOperationEnum["Replace"] = 2] = "Replace";
    StencilOperationEnum[StencilOperationEnum["Invert"] = 3] = "Invert";
    StencilOperationEnum[StencilOperationEnum["Increment"] = 4] = "Increment";
    StencilOperationEnum[StencilOperationEnum["Decrement"] = 5] = "Decrement";
})(exports.StencilOperationEnum || (exports.StencilOperationEnum = {}));
var StencilOperationEnum = exports.StencilOperationEnum;
var StencilState = (function () {
    function StencilState() {
        this.stst = -1;
        this.sop = -1;
        this.enabled = false;
        this.fail = 0 /* Keep */;
        this.zpass = 0 /* Keep */;
        this.zfail = 0 /* Keep */;
        this.func = 1 /* Always */;
        this.funcRef = 0;
        this.funcMask = 0;
    }
    return StencilState;
})();
exports.StencilState = StencilState;
var PatchState = (function () {
    function PatchState() {
        this._divst = -1;
        this.divs = 0;
        this.divt = 0;
    }
    return PatchState;
})();
exports.PatchState = PatchState;
var Fog = (function () {
    function Fog() {
        this._color = -1;
        this.enabled = false;
        this.far = 0;
        this.dist = 1;
        this.color = new Color();
    }
    return Fog;
})();
exports.Fog = Fog;
var LogicOp = (function () {
    function LogicOp() {
        this.enabled = false;
    }
    return LogicOp;
})();
exports.LogicOp = LogicOp;
var LineSmoothState = (function () {
    function LineSmoothState() {
        this.enabled = false;
    }
    return LineSmoothState;
})();
exports.LineSmoothState = LineSmoothState;
var PatchCullingState = (function () {
    function PatchCullingState() {
        this.enabled = false;
        this.faceFlag = false;
    }
    return PatchCullingState;
})();
exports.PatchCullingState = PatchCullingState;
var GpuState = (function () {
    function GpuState() {
        this._clearingWord = -1;
        this._ambientModelColor = -1;
        this._ambientModelColorAlpha = -1;
        this._ambientLightColorAlpha = -1;
        this._diffuseModelColor = -1;
        this._specularModelColor = -1;
        this.clearing = false;
        this.clearFlags = 0;
        this.baseAddress = 0;
        this.baseOffset = 0;
        this.indexAddress = 0;
        this.shadeModel = 0 /* Flat */;
        this.frameBuffer = new GpuFrameBufferState();
        this.vertex = new VertexState();
        this.stencil = new StencilState();
        this.skinning = new SkinningState();
        this.morphWeights = [1, 0, 0, 0, 0, 0, 0, 0];
        this.projectionMatrix = new Matrix4x4();
        this.viewMatrix = new Matrix4x3();
        this.worldMatrix = new Matrix4x3();
        this.viewport = new ViewPort();
        this.region = new Region();
        this.offset = { x: 0, y: 0 };
        this.fog = new Fog();
        this.clipPlane = new ClipPlane();
        this.logicOp = new LogicOp();
        this.lightning = new Lightning();
        this.alphaTest = new AlphaTest();
        this.blending = new Blending();
        this.patch = new PatchState();
        this.texture = new TextureState();
        this.lineSmoothState = new LineSmoothState();
        this.patchCullingState = new PatchCullingState();
        this.ambientModelColor = new ColorState();
        this.diffuseModelColor = new ColorState();
        this.specularModelColor = new ColorState();
        this.culling = new CullingState();
        this.dithering = new DitheringState();
        this.colorTest = new ColorTestState();
        this.depthTest = new DepthTestState();
        this.drawPixelFormat = 3 /* RGBA_8888 */;
    }
    GpuState.prototype.getAddressRelativeToBase = function (relativeAddress) {
        return (this.baseAddress | relativeAddress);
    };
    GpuState.prototype.getAddressRelativeToBaseOffset = function (relativeAddress) {
        return ((this.baseAddress | relativeAddress) + this.baseOffset);
    };
    return GpuState;
})();
exports.GpuState = GpuState;
var ColorTestState = (function () {
    function ColorTestState() {
        this.enabled = false;
    }
    return ColorTestState;
})();
exports.ColorTestState = ColorTestState;
var DitheringState = (function () {
    function DitheringState() {
        this.enabled = false;
    }
    return DitheringState;
})();
exports.DitheringState = DitheringState;
(function (WrapMode) {
    WrapMode[WrapMode["Repeat"] = 0] = "Repeat";
    WrapMode[WrapMode["Clamp"] = 1] = "Clamp";
})(exports.WrapMode || (exports.WrapMode = {}));
var WrapMode = exports.WrapMode;
(function (TextureEffect) {
    TextureEffect[TextureEffect["Modulate"] = 0] = "Modulate";
    TextureEffect[TextureEffect["Decal"] = 1] = "Decal";
    TextureEffect[TextureEffect["Blend"] = 2] = "Blend";
    TextureEffect[TextureEffect["Replace"] = 3] = "Replace";
    TextureEffect[TextureEffect["Add"] = 4] = "Add";
})(exports.TextureEffect || (exports.TextureEffect = {}));
var TextureEffect = exports.TextureEffect;
(function (TextureFilter) {
    TextureFilter[TextureFilter["Nearest"] = 0] = "Nearest";
    TextureFilter[TextureFilter["Linear"] = 1] = "Linear";
    TextureFilter[TextureFilter["NearestMipmapNearest"] = 4] = "NearestMipmapNearest";
    TextureFilter[TextureFilter["LinearMipmapNearest"] = 5] = "LinearMipmapNearest";
    TextureFilter[TextureFilter["NearestMipmapLinear"] = 6] = "NearestMipmapLinear";
    TextureFilter[TextureFilter["LinearMipmapLinear"] = 7] = "LinearMipmapLinear";
})(exports.TextureFilter || (exports.TextureFilter = {}));
var TextureFilter = exports.TextureFilter;
(function (TextureColorComponent) {
    TextureColorComponent[TextureColorComponent["Rgb"] = 0] = "Rgb";
    TextureColorComponent[TextureColorComponent["Rgba"] = 1] = "Rgba";
})(exports.TextureColorComponent || (exports.TextureColorComponent = {}));
var TextureColorComponent = exports.TextureColorComponent;
(function (PrimitiveType) {
    PrimitiveType[PrimitiveType["Points"] = 0] = "Points";
    PrimitiveType[PrimitiveType["Lines"] = 1] = "Lines";
    PrimitiveType[PrimitiveType["LineStrip"] = 2] = "LineStrip";
    PrimitiveType[PrimitiveType["Triangles"] = 3] = "Triangles";
    PrimitiveType[PrimitiveType["TriangleStrip"] = 4] = "TriangleStrip";
    PrimitiveType[PrimitiveType["TriangleFan"] = 5] = "TriangleFan";
    PrimitiveType[PrimitiveType["Sprites"] = 6] = "Sprites";
})(exports.PrimitiveType || (exports.PrimitiveType = {}));
var PrimitiveType = exports.PrimitiveType;
//# sourceMappingURL=state.js.map