var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var _vfs_memory = require('./vfs_memory');
var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;
var FileOpenFlags = _vfs.FileOpenFlags;
var AsyncClient = (function () {
    function AsyncClient(key) {
        this.key = key;
        this.statCacheValue = {};
        this.statCachePromise = {};
        this.readdirCacheValue = {};
        this.readdirCachePromise = {};
    }
    AsyncClient.prototype.initOnceAsync = function () {
        var _this = this;
        if (!this.initPromise) {
            this.client = new Dropbox.Client({ key: this.key });
            if (this.client.isAuthenticated()) {
                //DropboxLogged();
                // Client is authenticated. Display UI.
                $('#dropbox').html('logged');
            }
            this.client.authDriver(new Dropbox.AuthDriver.Redirect({
                redirectUrl: (document.location.host == '127.0.0.1') ? 'http://127.0.0.1/oauth_receive.html' : "https://" + document.location.host + '/oauth_receive.html'
            }));
            this.initPromise = new Promise(function (resolve, reject) {
                _this.client.authenticate({ interactive: true }, function (e) {
                    if (e) {
                        _this.initPromise = null;
                        reject(e);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        return this.initPromise;
    };
    AsyncClient.prototype.writeFileAsync = function (fullpath, content) {
        var _this = this;
        var directory = getDirectoryPath(fullpath);
        var basename = getBaseName(fullpath);
        if (this.statCacheValue[basename]) {
            this.statCacheValue[basename].size = content.byteLength;
        }
        if (this.readdirCacheValue[directory]) {
            var entriesInDirectory = this.readdirCacheValue[directory];
            if (!entriesInDirectory.contains(basename)) {
                entriesInDirectory.push(basename);
            }
        }
        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.writeFile(fullpath, content, function (e, data) {
                    if (e) {
                        reject(e);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    };
    AsyncClient.prototype.mkdirAsync = function (path) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.mkdir(path, function (e, data) {
                    if (e) {
                        reject(e);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    };
    AsyncClient.prototype.readFileAsync = function (name, offset, length) {
        var _this = this;
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = undefined; }
        return this.initOnceAsync().then(function () {
            return new Promise(function (resolve, reject) {
                _this.client.readFile(name, { arrayBuffer: true, start: offset, length: length }, function (e, data) {
                    if (e) {
                        reject(e);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    };
    AsyncClient.prototype.statAsync = function (fullpath) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            if (!_this.statCachePromise[fullpath]) {
                _this.statCachePromise[fullpath] = _this.readdirAsync(getDirectoryPath(fullpath)).then(function (files) {
                    var basename = getBaseName(fullpath);
                    if (!files.contains(basename))
                        throw (new Error("folder not contains file"));
                    return new Promise(function (resolve, reject) {
                        _this.client.stat(fullpath, {}, function (e, data) {
                            if (e) {
                                reject(e);
                            }
                            else {
                                _this.statCacheValue[fullpath] = data;
                                resolve(data);
                            }
                        });
                    });
                });
                return _this.statCachePromise[fullpath];
            }
        });
    };
    AsyncClient.prototype.readdirAsync = function (name) {
        var _this = this;
        return this.initOnceAsync().then(function () {
            if (!_this.readdirCachePromise[name]) {
                _this.readdirCachePromise[name] = new Promise(function (resolve, reject) {
                    _this.client.readdir(name, {}, function (e, data) {
                        if (e) {
                            reject(e);
                        }
                        else {
                            _this.readdirCacheValue[name] = data;
                            resolve(data);
                        }
                    });
                });
            }
            return _this.readdirCachePromise[name];
        });
    };
    return AsyncClient;
})();
exports.AsyncClient = AsyncClient;
function getDirectoryPath(fullpath) {
    return fullpath.split('/').slice(0, -1).join('/');
}
function getBaseName(fullpath) {
    return fullpath.split('/').pop();
}
function normalizePath(fullpath) {
    var out = [];
    var parts = fullpath.replace(/\\/g, '/').split('/');
    parts.forEach(function (part) {
        switch (part) {
            case '.':
                break;
            case '..':
                out.pop();
                break;
            default:
                out.push(part);
        }
    });
    return out.join('/');
}
var client = new AsyncClient('4mdwp62ogo4tna1');
/*
client.mkdirAsync('PSP').then(() => {
    console.log('resilt');
}).catch(e => {
    console.error(e);
});
*/
//client.mkdirAsync('PSP/GAME');
//client.mkdirAsync('PSP/GAME/virtual');
/*
client.writeFileAsync('/PSP/GAME/virtual/lsdlmidi.bin', new Uint8Array([1, 2, 3, 4]).buffer).then((result) => {
    console.log(result);
}).catch((error) => {
    console.error(error);
});
*/
var DropboxVfs = (function (_super) {
    __extends(DropboxVfs, _super);
    function DropboxVfs() {
        _super.call(this);
        this.enabled = true;
    }
    DropboxVfs.tryLoginAsync = function () {
        return client.initOnceAsync();
    };
    DropboxVfs.prototype.openAsync = function (path, flags, mode) {
        path = normalizePath(path);
        if (!this.enabled)
            return Promise.reject(new Error("Not using dropbox"));
        return DropboxVfsEntry.fromPathAsync(path, flags, mode);
    };
    return DropboxVfs;
})(Vfs);
exports.DropboxVfs = DropboxVfs;
var DropboxVfsEntry = (function (_super) {
    __extends(DropboxVfsEntry, _super);
    function DropboxVfsEntry(path, name, _size, isFile, date) {
        _super.call(this);
        this.path = path;
        this.name = name;
        this._size = _size;
        this.isFile = isFile;
        this.date = date;
        this.writeTimer = -1;
    }
    DropboxVfsEntry.fromPathAsync = function (path, flags, mode) {
        function readedErrorAsync(e) {
            if (flags & 512 /* Create */) {
                //console.log('creating file!');
                var entry = new DropboxVfsEntry(path, path.split('/').pop(), 0, true, new Date());
                return client.writeFileAsync(path, new ArrayBuffer(0)).then(function () {
                    //console.log('created file!');
                    return entry;
                }).catch(function (e) {
                    console.error(e);
                    throw (e);
                });
            }
            else {
                throw (e);
            }
        }
        return client.statAsync(path).then(function (info) {
            if (info.isRemoved) {
                return readedErrorAsync(new Error("file not exists"));
            }
            else {
                //console.log(info);
                return new DropboxVfsEntry(path, info.name, info.size, info.isFile, info.modifiedAt);
            }
        }).catch(function (e) {
            return readedErrorAsync(e);
        });
    };
    DropboxVfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must implement DropboxVfsEntry.enumerateAsync"));
    };
    DropboxVfsEntry.prototype.readChunkAsync = function (offset, length) {
        //console.log('dropbox: read chunk!', this.path, offset, length);
        var _this = this;
        if (this._size < 128 * 1024 * 1024) {
            if (this.cachedContent)
                return Promise.resolve(this.cachedContent.slice(offset, offset + length));
            return client.readFileAsync(this.path).then(function (data) {
                _this.cachedContent = data;
                return _this.cachedContent.slice(offset, offset + length);
            });
        }
        else {
            //console.log('read dropbox file ' + this.path);
            return client.readFileAsync(this.path, offset, offset + length);
        }
    };
    DropboxVfsEntry.prototype.writeChunkAsync = function (offset, dataToWrite) {
        var _this = this;
        return this.readChunkAsync(0, this._size).then(function (base) {
            //console.log('dropbox: write chunk!', this.path, offset, dataToWrite.byteLength);
            var newContent = new ArrayBuffer(Math.max(base.byteLength, offset + dataToWrite.byteLength));
            var newContentArray = new Uint8Array(newContent);
            newContentArray.set(new Uint8Array(base), 0);
            newContentArray.set(new Uint8Array(dataToWrite), offset);
            _this._size = newContent.byteLength;
            _this.cachedContent = newContent;
            //return client.writeFileAsync(this.path, newContent).then(() => data.byteLength);
            //console.log(newContentArray);
            clearTimeout(_this.writeTimer);
            _this.writeTimer = setTimeout(function () {
                client.writeFileAsync(_this.path, newContent);
            }, 500);
            return dataToWrite.byteLength;
        });
    };
    DropboxVfsEntry.prototype.stat = function () {
        return {
            name: this.name,
            size: this._size,
            isDirectory: !this.isFile,
            timeCreation: this.date,
            timeLastAccess: this.date,
            timeLastModification: this.date,
            dependentData0: 0,
            dependentData1: 1,
        };
    };
    DropboxVfsEntry.prototype.close = function () {
    };
    return DropboxVfsEntry;
})(VfsEntry);
exports.DropboxVfsEntry = DropboxVfsEntry;
//# sourceMappingURL=vfs_dropbox.js.map