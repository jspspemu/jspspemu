///<reference path="../../../global.d.ts" />
var _state = require('../state');
var _utils = require('./utils');
var _pixelformat = require('../../pixelformat');
var _memory = require('../../memory');
var PixelFormatUtils = _pixelformat.PixelFormatUtils;
var PixelConverter = _pixelformat.PixelConverter;
var Texture = (function () {
    function Texture(gl) {
        this.gl = gl;
        this.recheckTimestamp = undefined;
        this.valid = true;
        this.validHint = true;
        this.swizzled = false;
        this.texture = gl.createTexture();
    }
    Texture.prototype.setInfo = function (state) {
        var texture = state.texture;
        var mipmap = texture.mipmaps[0];
        var clut = texture.clut;
        this.swizzled = texture.swizzled;
        this.address_start = mipmap.address;
        this.address_end = mipmap.address + PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.bufferWidth * mipmap.textureHeight);
        this.pixelFormat = texture.pixelFormat;
        this.clutFormat = clut.pixelFormat;
        this.clut_start = clut.adress;
        this.clut_end = clut.adress + PixelConverter.getSizeInBytes(texture.clut.pixelFormat, clut.numberOfColors);
    };
    Texture.prototype._create = function (callbackTex2D) {
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        callbackTex2D();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    Texture.prototype.fromBytes = function (data, width, height) {
        var gl = this.gl;
        this.width = width;
        this.height = height;
        this._create(function () {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            //gl.generateMipmap(gl.TEXTURE_2D);
        });
    };
    Texture.prototype.fromCanvas = function (canvas) {
        var gl = this.gl;
        this.width = canvas.width;
        this.height = canvas.height;
        this._create(function () {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
            //gl.generateMipmap(gl.TEXTURE_2D);
        });
    };
    Texture.prototype.bind = function (textureUnit, min, mag, wraps, wrapt) {
        var gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
        if (!MathUtils.isPowerOfTwo(this.width) || !MathUtils.isPowerOfTwo(this.height)) {
            wraps = wrapt = gl.CLAMP_TO_EDGE;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
    };
    Texture.hashFast = function (state) {
        var result = state.texture.mipmaps[0].address;
        if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
            result += state.texture.clut.adress * Math.pow(2, 23);
        }
        result += (state.texture.swizzled ? 1 : 0) * Math.pow(2, 13);
        return result;
    };
    Texture.hashSlow = function (memory, state) {
        var texture = state.texture;
        var mipmap = texture.mipmaps[0];
        var clut = texture.clut;
        var hash_number = 0;
        hash_number += (texture.swizzled ? 1 : 0) * Math.pow(2, 0);
        hash_number += (texture.pixelFormat) * Math.pow(2, 1);
        hash_number += (mipmap.bufferWidth) * Math.pow(2, 3);
        hash_number += (mipmap.textureWidth) * Math.pow(2, 6);
        hash_number += (mipmap.textureHeight) * Math.pow(2, 8);
        hash_number += memory.hash(mipmap.address, PixelConverter.getSizeInBytes(texture.pixelFormat, mipmap.textureHeight * mipmap.bufferWidth)) * Math.pow(2, 12);
        if (PixelFormatUtils.hasClut(texture.pixelFormat)) {
            hash_number += memory.hash(clut.adress + PixelConverter.getSizeInBytes(clut.pixelFormat, clut.start + clut.shift * clut.numberOfColors), PixelConverter.getSizeInBytes(clut.pixelFormat, clut.numberOfColors)) * Math.pow(2, 30);
            hash_number += clut.info * Math.pow(2, 26);
        }
        return hash_number;
    };
    Texture.prototype.toString = function () {
        var out = '';
        out += 'Texture(address = ' + this.address_start + ', hash1 = ' + this.hash1 + ', hash2 = ' + this.hash2 + ', pixelFormat = ' + this.pixelFormat + ', swizzled = ' + this.swizzled;
        if (PixelFormatUtils.hasClut(this.pixelFormat)) {
            out += ', clutFormat=' + this.clutFormat;
        }
        out += ')';
        return out;
    };
    return Texture;
})();
exports.Texture = Texture;
var TextureHandler = (function () {
    function TextureHandler(memory, gl) {
        var _this = this;
        this.memory = memory;
        this.gl = gl;
        this.texturesByHash2 = {};
        this.texturesByHash1 = {};
        this.texturesByAddress = {};
        this.textures = [];
        this.recheckTimestamp = 0;
        //private updatedTextures = new SortedSet<Texture>();
        this.invalidatedAll = false;
        memory.invalidateDataRange.add(function (range) { return _this.invalidatedMemoryRange(range); });
        memory.invalidateDataAll.add(function () { return _this.invalidatedMemoryAll(); });
    }
    TextureHandler.prototype.flush = function () {
        for (var n = 0; n < this.textures.length; n++) {
            var texture = this.textures[n];
            if (!texture.validHint) {
                texture.valid = false;
                texture.validHint = true;
            }
        }
    };
    TextureHandler.prototype.sync = function () {
    };
    TextureHandler.prototype.end = function () {
        if (!this.invalidatedAll)
            return;
        this.invalidatedAll = false;
        for (var n = 0; n < this.textures.length; n++) {
            var texture = this.textures[n];
            texture.validHint = false;
        }
    };
    TextureHandler.prototype.invalidatedMemoryAll = function () {
        this.invalidatedAll = true;
    };
    TextureHandler.prototype.invalidatedMemoryRange = function (range) {
        for (var n = 0; n < this.textures.length; n++) {
            var texture = this.textures[n];
            if (texture.address_start >= range.start && texture.address_end <= range.end) {
                //debugger;
                //console.info('invalidated texture', range);
                texture.validHint = false;
            }
            if (texture.clut_start >= range.start && texture.clut_end <= range.end) {
                //debugger;
                //console.info('invalidated texture', range);
                texture.validHint = false;
            }
        }
    };
    TextureHandler.prototype.mustRecheckSlowHash = function (texture) {
        //return !texture || !texture.valid || this.recheckTimestamp >= texture.recheckTimestamp;
        return !texture || !texture.valid;
        //return !texture;
    };
    TextureHandler.prototype.bindTexture = function (prog, state) {
        var gl = this.gl;
        var mipmap = state.texture.mipmaps[0];
        if (mipmap.bufferWidth == 0)
            return;
        if (mipmap.textureWidth == 0)
            return;
        if (mipmap.textureHeight == 0)
            return;
        var hash1 = Texture.hashFast(state);
        var texture = this.texturesByHash1[hash1];
        //if (texture && texture.valid && this.recheckTimestamp < texture.recheckTimestamp) return texture;
        if (this.mustRecheckSlowHash(texture)) {
            var hash2 = Texture.hashSlow(this.memory, state);
            //console.log(hash);
            texture = this.texturesByHash2[hash2];
            //if (!texture || !texture.valid) {
            if (!texture) {
                if (!this.texturesByAddress[mipmap.address]) {
                    this.texturesByAddress[mipmap.address] = texture = new Texture(gl);
                    this.textures.push(texture);
                    console.warn('New texture allocated!', mipmap, state.texture);
                }
                texture = this.texturesByHash2[hash2] = this.texturesByHash1[hash1] = this.texturesByAddress[mipmap.address];
                texture.setInfo(state);
                texture.hash1 = hash1;
                texture.hash2 = hash2;
                texture.valid = true;
                //this.updatedTextures.add(texture);
                texture.recheckTimestamp = this.recheckTimestamp;
                var mipmap = state.texture.mipmaps[0];
                var h = mipmap.textureHeight;
                var w = mipmap.textureWidth;
                var w2 = mipmap.bufferWidth;
                var data2 = new Uint8Array(w2 * h * 4);
                var clut = state.texture.clut;
                if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
                    clut.numberOfColors = Math.max(clut.numberOfColors, clut.mask + 1);
                }
                var paletteBuffer = new ArrayBuffer(clut.numberOfColors * 4);
                var paletteU8 = new Uint8Array(paletteBuffer);
                var palette = new Uint32Array(paletteBuffer);
                if (PixelFormatUtils.hasClut(state.texture.pixelFormat)) {
                    //if (clut.pixelFormat == PixelFormat.RGBA_5551) debugger;
                    PixelConverter.decode(clut.pixelFormat, this.memory.buffer, clut.adress, paletteU8, 0, clut.numberOfColors, true);
                }
                //console.info('TextureFormat: ' + PixelFormat[state.texture.pixelFormat] + ', ' + PixelFormat[clut.pixelFormat] + ';' + clut.mask + ';' + clut.start + '; ' + clut.numberOfColors + '; ' + clut.shift);
                var dataBuffer = new ArrayBuffer(PixelConverter.getSizeInBytes(state.texture.pixelFormat, w2 * h));
                var data = new Uint8Array(dataBuffer);
                data.set(new Uint8Array(this.memory.buffer, mipmap.address, data.length));
                if (state.texture.swizzled) {
                    PixelConverter.unswizzleInline(state.texture.pixelFormat, dataBuffer, 0, w2, h);
                }
                PixelConverter.decode(state.texture.pixelFormat, dataBuffer, 0, data2, 0, w2 * h, true, palette, clut.start, clut.shift, clut.mask);
                if (true) {
                    //if (false) {
                    texture.fromBytes(data2, w2, h);
                }
                else {
                    var canvas = document.createElement('canvas');
                    canvas.style.border = '1px solid white';
                    canvas.width = w2;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    var imageData = ctx.createImageData(w2, h);
                    var u8 = imageData.data;
                    ctx.clearRect(0, 0, w, h);
                    for (var n = 0; n < w2 * h * 4; n++)
                        u8[n] = data2[n];
                    ctx.putImageData(imageData, 0, 0);
                    console.error('generated texture!' + texture.toString());
                    $(document.body).append($('<div style="color:white;" />').append(canvas).append(texture.toString() + 'w=' + w + ',w2=' + w2 + ',' + h));
                    texture.fromCanvas(canvas);
                }
            }
        }
        this.lastTexture = texture;
        texture.bind(0, (state.texture.filterMinification == 1 /* Linear */) ? gl.LINEAR : gl.NEAREST, (state.texture.filterMagnification == 1 /* Linear */) ? gl.LINEAR : gl.NEAREST, (state.texture.wrapU == 1 /* Clamp */) ? gl.CLAMP_TO_EDGE : gl.REPEAT, (state.texture.wrapV == 1 /* Clamp */) ? gl.CLAMP_TO_EDGE : gl.REPEAT);
        prog.getUniform('uSampler').set1i(0);
        prog.getUniform('samplerClut').set1i(1);
    };
    TextureHandler.prototype.unbindTexture = function (program, state) {
        var gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    return TextureHandler;
})();
exports.TextureHandler = TextureHandler;
//# sourceMappingURL=texture.js.map