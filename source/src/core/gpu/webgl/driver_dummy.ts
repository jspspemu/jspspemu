///<reference path="../../../global.d.ts" />

import _driver = require('../driver');
import _state = require('../state');
import _vertex = require('../vertex');
import _memory = require('../../memory');
import _display = require('../../display');
import _shader = require('./shader');
import _texture = require('./texture');
import _utils = require('./utils');

import FastFloat32Buffer = _utils.FastFloat32Buffer;
import IDrawDriver = _driver.IDrawDriver;
import ShaderCache = _shader.ShaderCache;
import Texture = _texture.Texture;
import TextureHandler = _texture.TextureHandler;
import Memory = _memory.Memory;
import Matrix4x3 = _state.Matrix4x3;
import Matrix4x4 = _state.Matrix4x4;
import GpuState = _state.GpuState;
import IPspDisplay = _display.IPspDisplay;
import WrappedWebGLProgram = _utils.WrappedWebGLProgram;

class DummyDrawDriver extends IDrawDriver {
}

export = DummyDrawDriver;