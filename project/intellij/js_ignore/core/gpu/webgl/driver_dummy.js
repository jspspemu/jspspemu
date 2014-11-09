///<reference path="../../../global.d.ts" />
var _state = require('../state');
var _memory = require('../../memory');
var _shader = require('./shader');
var _texture = require('./texture');
var _utils = require('./utils');
var DummyDrawDriver = (function () {
    function DummyDrawDriver() {
    }
    DummyDrawDriver.prototype.end = function () {
    };
    DummyDrawDriver.prototype.initAsync = function () {
        return Promise.resolve();
    };
    /**
     * Flush texture page-cache.
     *
     * Do this if you have copied/rendered into an area currently in the texture-cache
     */
    DummyDrawDriver.prototype.textureFlush = function (state) {
    };
    /**
     * Synchronize rendering pipeline with image upload.
     *
     * This will stall the rendering pipeline until the current image upload initiated by sceGuCopyImage() has completed.
     */
    DummyDrawDriver.prototype.textureSync = function (state) {
    };
    DummyDrawDriver.prototype.drawElements = function (state, primitiveType, vertices, count, vertexState) {
    };
    return DummyDrawDriver;
})();
module.exports = DummyDrawDriver;
//# sourceMappingURL=driver_dummy.js.map