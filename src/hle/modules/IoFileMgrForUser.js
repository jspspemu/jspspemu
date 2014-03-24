var hle;
(function (hle) {
    (function (modules) {
        var IoFileMgrForUser = (function () {
            function IoFileMgrForUser(context) {
                var _this = this;
                this.context = context;
                this.sceIoDevctl = hle.modules.createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, function (deviceName, command, inputPointer, inputLength, outputPointer, outputLength) {
                    var input = _this.context.memory.getPointerStream(inputPointer, inputLength);
                    var output = _this.context.memory.getPointerStream(outputPointer, outputLength);

                    switch (deviceName) {
                        case 'emulator:':
                        case 'kemulator:':
                            switch (command) {
                                case 1:
                                    output.writeInt32(1);
                                    return 0;
                                    break;
                                case 2:
                                    $('#output').append(input.readString(input.length));

                                    //console.info();
                                    return 0;
                                    break;
                            }
                            break;
                    }

                    console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoDevctl("%s", %d, %08X, %d, %08X, %d)', deviceName, command, inputPointer, inputLength, outputPointer, outputLength));
                    return 0;
                });
                this.sceIoDopen = hle.modules.createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, function (directoryPath) {
                    console.warn('Not implemented IoFileMgrForUser.sceIoDopen("' + directoryPath + '")');
                    return 0;
                });
                this.sceIoDclose = hle.modules.createNativeFunction(0xEB092469, 150, 'uint', 'int', this, function (fileId) {
                    console.warn('Not implemented IoFileMgrForUser.sceIoDclose');
                    return 0;
                });
                this.fileUids = new UidCollection(1);
                this.sceIoOpen = hle.modules.createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, function (filename, flags, mode) {
                    var file = _this.context.fileManager.open(filename, flags, mode);
                    console.info(sprintf('IoFileMgrForUser.sceIoOpen("%s", %d, 0%o)', filename, flags, mode));
                    return _this.fileUids.allocate(file);
                });
                this.sceIoClose = hle.modules.createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, function (fileId) {
                    var file = _this.fileUids.get(fileId);
                    file.close();

                    _this.fileUids.remove(fileId);

                    return 0;
                });
                this.sceIoWrite = hle.modules.createNativeFunction(0x42EC03AC, 150, 'int', 'int/uint/int', this, function (fileId, inputPointer, inputLength) {
                    var input = _this.context.memory.getPointerStream(inputPointer, inputLength);

                    //console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite("%s")', input.readString(input.length)));
                    //console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite(%d, 0x%08X, %d)', fileId, inputPointer, inputLength));
                    return inputLength;
                });
                this.sceIoRead = hle.modules.createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, function (fileId, outputPointer, outputLength) {
                    var file = _this.fileUids.get(fileId);

                    return file.entry.readChunkAsync(file.cursor, outputLength).then(function (readedData) {
                        file.cursor += readedData.byteLength;
                        _this.context.memory.writeBytes(outputPointer, readedData);
                        return readedData.byteLength;
                    });
                });
                this.sceIoChdir = hle.modules.createNativeFunction(0x55F4717D, 150, 'int', 'string', this, function (path) {
                    console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
                    _this.context.fileManager.chdir(path);
                    return 0;
                });
                this.sceIoLseek = hle.modules.createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, function (fileId, offset, whence) {
                    console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d)', fileId, offset, whence));
                    return _this._seek(fileId, offset, whence);
                });
                this.sceIoLseek32 = hle.modules.createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, function (fileId, offset, whence) {
                    console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d)', fileId, offset, whence));
                    return _this._seek(fileId, offset, whence);
                });
            }
            IoFileMgrForUser.prototype._seek = function (fileId, offset, whence) {
                var file = this.fileUids.get(fileId);
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
        modules.IoFileMgrForUser = IoFileMgrForUser;

        var SeekAnchor;
        (function (SeekAnchor) {
            SeekAnchor[SeekAnchor["Set"] = 0] = "Set";
            SeekAnchor[SeekAnchor["Cursor"] = 1] = "Cursor";
            SeekAnchor[SeekAnchor["End"] = 2] = "End";
        })(SeekAnchor || (SeekAnchor = {}));
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=IoFileMgrForUser.js.map
