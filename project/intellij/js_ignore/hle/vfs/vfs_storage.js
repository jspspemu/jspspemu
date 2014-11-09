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
var storage = require('./indexeddb');
var console = logger.named('vfs.storage');
var StorageVfs = (function (_super) {
    __extends(StorageVfs, _super);
    function StorageVfs(key) {
        _super.call(this);
        this.key = key;
    }
    StorageVfs.prototype.initializeOnceAsync = function () {
        var _this = this;
        if (!this.openDbPromise) {
            this.openDbPromise = storage.openAsync(this.key, 3, ['files']).then(function (db) {
                _this.db = db;
                return _this;
            });
        }
        return this.openDbPromise;
    };
    StorageVfs.prototype.openAsync = function (path, flags, mode) {
        var _this = this;
        return this.initializeOnceAsync().then(function () {
            return StorageVfsEntry.fromNameAsync(_this.db, path, flags, mode);
        });
    };
    return StorageVfs;
})(Vfs);
exports.StorageVfs = StorageVfs;
var StorageVfsEntry = (function (_super) {
    __extends(StorageVfsEntry, _super);
    function StorageVfsEntry(db, name) {
        _super.call(this);
        this.db = db;
        this.name = name;
    }
    StorageVfsEntry.prototype.initAsync = function (flags, mode) {
        var _this = this;
        return this._getFileAsync().then(function (file) {
            console.info('initAsync', file);
            if (!file.exists) {
                if (!(flags & 512 /* Create */)) {
                    throw (new Error("File '" + file.name + "' doesn't exist"));
                }
            }
            if (flags & 1024 /* Truncate */) {
                file.content = new Uint8Array([]);
            }
            _this.file = file;
            return _this;
        });
    };
    StorageVfsEntry.fromNameAsync = function (db, name, flags, mode) {
        return (new StorageVfsEntry(db, name)).initAsync(flags, mode);
    };
    StorageVfsEntry.prototype._getFileAsync = function () {
        var _this = this;
        return this.db.getAsync(this.name).then(function (file) {
            if (!file)
                file = { name: _this.name, content: new ArrayBuffer(0), date: new Date(), exists: false };
            return file;
        });
    };
    StorageVfsEntry.prototype._getAllAsync = function () {
        return this._getFileAsync().then(function (item) { return item.content; });
    };
    StorageVfsEntry.prototype._writeAllAsync = function (data) {
        return this.db.putAsync(this.name, {
            'name': this.name,
            'content': new Uint8Array(data),
            'date': new Date(),
            'exists': true,
        });
    };
    StorageVfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must override enumerateAsync : " + this));
    };
    StorageVfsEntry.prototype.readChunkAsync = function (offset, length) {
        //console.log(this.file);
        return Promise.resolve(this.file.content.buffer.slice(offset, offset + length));
    };
    StorageVfsEntry.prototype.writeChunkAsync = function (offset, data) {
        var newContent = new ArrayBuffer(Math.max(this.file.content.byteLength, offset + data.byteLength));
        var newContentArray = new Uint8Array(newContent);
        newContentArray.set(new Uint8Array(this.file.content), 0);
        newContentArray.set(new Uint8Array(data), offset);
        this.file.content = newContentArray;
        return this._writeAllAsync(newContent).then(function () { return data.byteLength; });
    };
    StorageVfsEntry.prototype.stat = function () {
        return {
            name: this.file.name,
            size: this.file.content.byteLength,
            isDirectory: false,
            timeCreation: this.file.date,
            timeLastAccess: this.file.date,
            timeLastModification: this.file.date,
            dependentData0: 0,
            dependentData1: 0,
        };
    };
    StorageVfsEntry.prototype.close = function () {
    };
    return StorageVfsEntry;
})(VfsEntry);
//# sourceMappingURL=vfs_storage.js.map