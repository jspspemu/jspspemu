///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var createNativeFunction = _utils.createNativeFunction;
var _vfs = require('../../vfs');
var _structs = require('../../structs');
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');
_manager.Thread;
var FileOpenFlags = _vfs.FileOpenFlags;
var console = logger.named('module.IoFileMgrForUser');
var IoFileMgrForUser = (function () {
    function IoFileMgrForUser(context) {
        var _this = this;
        this.context = context;
        this.sceIoDevctl = createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, function (deviceName, command, inputPointer, inputLength, outputPointer, outputLength) {
            var input = _this.context.memory.getPointerStream(inputPointer, inputLength);
            var output = _this.context.memory.getPointerStream(outputPointer, outputLength);
            return _this.context.fileManager.devctlAsync(deviceName, command, input, output);
        }, { tryCatch: false });
        this.fileUids = new UidCollection(3);
        this.directoryUids = new UidCollection(1);
        this.sceIoOpen = createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
            return _this._sceIoOpenAsync(filename, flags, mode).then(function (result) {
                var str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
                if (result == 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */) {
                    console.error(str, result);
                }
                else {
                    console.info(str, result);
                }
                return result;
            });
        });
        this.sceIoOpenAsync = createNativeFunction(0x89AA9906, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
            console.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));
            //if (filename == '') return Promise.resolve(0);
            return _this._sceIoOpenAsync(filename, flags, mode).then(function (fileId) {
                var file = _this.getFileById(fileId);
                file.setAsyncOperation(Promise.resolve(Integer64.fromNumber(fileId)));
                console.info('-->', fileId);
                return fileId;
            });
        });
        this.sceIoCloseAsync = createNativeFunction(0xFF5940B6, 150, 'int', 'int', this, function (fileId) {
            console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoCloseAsync(%d)', fileId));
            //if (filename == '') return Promise.resolve(0);
            var file = _this.getFileById(fileId);
            if (file)
                file.close();
            //file.setAsyncOperation(Promise.resolve(Integer64.fromInt(fileId)));
            file.setAsyncOperation(Promise.resolve(Integer64.fromInt(0)));
            return 0;
        });
        this.sceIoAssign = createNativeFunction(0xB2A628C1, 150, 'int', 'string/string/string/int/void*/long', this, function (device1, device2, device3, mode, unk1Ptr, unk2) {
            // IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
            console.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
            return 0;
        });
        this.sceIoClose = createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, function (fileId) {
            var file = _this.getFileById(fileId);
            if (file)
                file.close();
            console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoClose(%d)', fileId));
            _this.fileUids.remove(fileId);
            return 0;
        });
        this.sceIoWrite = createNativeFunction(0x42EC03AC, 150, 'int', 'int/byte[]', this, function (fileId, input) {
            if (fileId < 3) {
                // @TODO: Fixme! Create a proper file
                console.log('STD[' + fileId + ']', input.readString(input.length));
                return 0;
            }
            else {
                var file = _this.getFileById(fileId);
                return file.entry.writeChunkAsync(file.cursor, input.toArrayBuffer()).then(function (writtenCount) {
                    console.info('sceIoWrite', 'file.cursor', file.cursor, 'input.length:', input.length, 'writtenCount:', writtenCount);
                    file.cursor += writtenCount;
                    return writtenCount;
                }).catch(function (e) {
                    console.error(e);
                    return 2147614721 /* ERROR_ERROR */;
                });
            }
        });
        this.sceIoRead = createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, function (fileId, outputPointer, outputLength) {
            var file = _this.getFileById(fileId);
            return file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                file.cursor += readedData.byteLength;
                //console.log(new Uint8Array(readedData));
                _this.context.memory.writeBytes(outputPointer, readedData);
                //console.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
                return readedData.byteLength;
            });
        });
        this.sceIoReadAsync = createNativeFunction(0xA0B5A7C2, 150, 'int', 'Thread/int/uint/int', this, function (thread, fileId, outputPointer, outputLength) {
            var file = _this.getFileById(fileId);
            // SCE_KERNEL_ERROR_ASYNC_BUSY
            file.setAsyncOperation(file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                //console.log('sceIoReadAsync', file, fileId, outputLength, readedData.byteLength, new Uint8Array(readedData));
                file.cursor += readedData.byteLength;
                //console.info(thread, 'readed', new Uint8Array(readedData));
                _this.context.memory.writeBytes(outputPointer, readedData);
                return Integer64.fromNumber(readedData.byteLength);
            }));
            return 0;
        });
        this.sceIoWaitAsync = createNativeFunction(0xE23EEC33, 150, 'int', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            return _this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
        });
        this.sceIoWaitAsyncCB = createNativeFunction(0x35DBD746, 150, 'int', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            return _this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
        });
        this.sceIoPollAsync = createNativeFunction(0x3251EA56, 150, 'uint', 'Thread/int/void*', this, function (thread, fileId, resultPointer) {
            //console.info('sceIoPollAsync', fileId);
            var file = _this.getFileById(fileId);
            if (file.asyncResult) {
                //return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
                if (DebugOnce('sceIoPollAsync', 100))
                    console.log(thread.name, ':sceIoPollAsync', fileId, 'resolved -> ', file.asyncResult.number);
                resultPointer.writeInt64(file.asyncResult);
                return 0;
            }
            else {
                if (DebugOnce('sceIoPollAsync', 100))
                    console.log(thread.name, ':sceIoPollAsync', fileId, 'not resolved');
                //console.log('not resolved');
                resultPointer.writeInt64(Integer64.fromInt(0));
                return 1;
            }
        });
        this.sceIoGetstat = createNativeFunction(0xACE946E8, 150, 'int', 'string/void*', this, function (fileName, sceIoStatPointer) {
            if (sceIoStatPointer) {
                sceIoStatPointer.position = 0;
                _structs.SceIoStat.struct.write(sceIoStatPointer, new _structs.SceIoStat());
            }
            try {
                return _this.context.fileManager.getStatAsync(fileName).then(function (stat) {
                    var stat2 = _this._vfsStatToSceIoStat(stat);
                    console.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
                    if (sceIoStatPointer) {
                        sceIoStatPointer.position = 0;
                        _structs.SceIoStat.struct.write(sceIoStatPointer, stat2);
                    }
                    return 0;
                }).catch(function (error) { return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */; });
            }
            catch (e) {
                console.error(e);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            }
        });
        this.sceIoChdir = createNativeFunction(0x55F4717D, 150, 'int', 'string', this, function (path) {
            console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
            try {
                _this.context.fileManager.chdir(path);
                return 0;
            }
            catch (e) {
                console.error(e);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            }
        });
        /*
        [HlePspFunction(NID = 0x71B19E77, FirmwareVersion = 150)]
        public int sceIoLseekAsync(SceUID FileId, long Offset, SeekAnchor Whence)
        {
            var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
            File.AsyncLastResult = sceIoLseek(FileId, Offset, Whence);
            _DelayIo(IoDelayType.Seek);
            return 0;
        }
        */
        this.sceIoLseekAsync = createNativeFunction(0x71B19E77, 150, 'int', 'int/long/int', this, function (fileId, offset, whence) {
            //var file = this.getFileById(fileId);
            var file = _this.getFileById(fileId);
            var result = _this._seek(fileId, offset.getNumber(), whence);
            file.setAsyncOperationNow(Integer64.fromNumber(result));
            return 0;
        });
        this.sceIoLseek = createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, function (fileId, offset, whence) {
            var result = _this._seek(fileId, offset.getNumber(), whence);
            //console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
            return Integer64.fromNumber(result);
        });
        this.sceIoLseek32 = createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, function (fileId, offset, whence) {
            var result = _this._seek(fileId, offset, whence);
            //console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
            return result;
        });
        this.sceIoMkdir = createNativeFunction(0x06A70004, 150, 'uint', 'string/int', this, function (path, accessMode) {
            console.warn('Not implemented: sceIoMkdir("' + path + '", ' + accessMode.toString(8) + ')');
            return 0;
        });
        this.sceIoDopen = createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, function (path) {
            console.log('sceIoDopen("' + path + '")');
            return _this.context.fileManager.openDirectoryAsync(path).then(function (directory) {
                console.log('opened directory "' + path + '"');
                return _this.directoryUids.allocate(directory);
            }).catch(function (error) {
                console.error(error);
                return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
            });
        });
        this.sceIoDclose = createNativeFunction(0xEB092469, 150, 'uint', 'int', this, function (fileId) {
            if (!_this.directoryUids.has(fileId))
                return -1;
            _this.directoryUids.get(fileId).close();
            _this.directoryUids.remove(fileId);
            return 0;
        });
        this.sceIoDread = createNativeFunction(0xE3EB004C, 150, 'int', 'int/void*', this, function (fileId, hleIoDirentPtr) {
            if (!_this.directoryUids.has(fileId))
                return -1;
            var directory = _this.directoryUids.get(fileId);
            if (directory.left > 0) {
                var stat = directory.read();
                var hleIoDirent = new _structs.HleIoDirent();
                hleIoDirent.name = stat.name;
                hleIoDirent.stat = _this._vfsStatToSceIoStat(stat);
                hleIoDirent.privateData = 0;
                _structs.HleIoDirent.struct.write(hleIoDirentPtr, hleIoDirent);
            }
            return directory.left;
        });
        this.sceIoChangeAsyncPriority = createNativeFunction(0xB293727F, 150, 'int', 'int/int', this, function (fileId, priority) {
            return 0;
        });
    }
    IoFileMgrForUser.prototype.getFileById = function (id) {
        if (!this.fileUids.has(id))
            throw (new SceKernelException(2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */));
        return this.fileUids.get(id);
    };
    IoFileMgrForUser.prototype._sceIoOpenAsync = function (filename, flags, mode) {
        var _this = this;
        return this.context.fileManager.openAsync(filename, flags, mode).then(function (file) {
            return _this.fileUids.allocate(file);
        }).catch(function (e) {
            console.error('Not found', filename, e);
            return 2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */;
        });
    };
    IoFileMgrForUser.prototype._sceIoWaitAsyncCB = function (thread, fileId, resultPointer) {
        thread.state.LO = fileId;
        if (!this.fileUids.has(fileId)) {
            if (DebugOnce('_sceIoWaitAsyncCB', 100))
                console.info('_sceIoWaitAsyncCB', fileId, 'file not found');
            return Promise.resolve(2147549186 /* ERROR_ERRNO_FILE_NOT_FOUND */);
        }
        var file = this.getFileById(fileId);
        if (file.asyncOperation) {
            if (DebugOnce('_sceIoWaitAsyncCB', 100))
                console.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'completed');
            return file.asyncOperation.then(function (result) {
                //debugger;
                if (DebugOnce('_sceIoWaitAsyncCB', 100))
                    console.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'result: ', result.getNumber());
                resultPointer.writeInt64(result);
                return 0;
            });
        }
        else {
            if (DebugOnce('_sceIoWaitAsyncCB', 100))
                console.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'incompleted');
            resultPointer.writeInt64(Integer64.fromNumber(0));
            return Promise.resolve(1);
        }
    };
    /*
    [HlePspFunction(NID = 0xA0B5A7C2, FirmwareVersion = 150)]
    public int sceIoReadAsync(SceUID FileId, byte * OutputPointer, int OutputSize)
    {
        var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
        File.AsyncLastResult = sceIoRead(FileId, OutputPointer, OutputSize);

        _DelayIo(IoDelayType.Read, OutputSize);

        return 0;
    }
    */
    IoFileMgrForUser.prototype._vfsStatToSceIoStat = function (stat) {
        var stat2 = new _structs.SceIoStat();
        //stat2.mode = <_structs.SceMode>parseInt('777', 8)
        stat2.mode = 0;
        stat2.size = stat.size;
        stat2.timeCreation = _structs.ScePspDateTime.fromDate(stat.timeCreation);
        stat2.timeLastAccess = _structs.ScePspDateTime.fromDate(stat.timeLastAccess);
        stat2.timeLastModification = _structs.ScePspDateTime.fromDate(stat.timeLastModification);
        stat2.deviceDependentData[0] = stat.dependentData0 || 0;
        stat2.deviceDependentData[1] = stat.dependentData1 || 0;
        stat2.attributes = 0;
        if (stat.isDirectory) {
            stat2.mode = 0x1000; // Directory
            stat2.attributes |= 16 /* Directory */;
            stat2.attributes |= 4 /* CanRead */;
        }
        else {
            stat2.mode = 0x2000; // File
            stat2.attributes |= 32 /* File */;
            stat2.attributes |= 1 /* CanExecute */;
            stat2.attributes |= 4 /* CanRead */;
            stat2.attributes |= 2 /* CanWrite */;
        }
        return stat2;
    };
    IoFileMgrForUser.prototype._seek = function (fileId, offset, whence) {
        var file = this.getFileById(fileId);
        switch (whence) {
            case 0 /* Set */:
                file.cursor = 0 + offset;
                break;
            case 1 /* Cursor */:
                file.cursor = file.cursor + offset;
                break;
            case 2 /* End */:
                file.cursor = file.entry.size + offset;
                break;
        }
        return file.cursor;
    };
    return IoFileMgrForUser;
})();
exports.IoFileMgrForUser = IoFileMgrForUser;
//# sourceMappingURL=IoFileMgrForUser.js.map