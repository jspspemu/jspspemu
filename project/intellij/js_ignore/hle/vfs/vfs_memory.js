var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;
var FileOpenFlags = _vfs.FileOpenFlags;
var MemoryVfs = (function (_super) {
    __extends(MemoryVfs, _super);
    function MemoryVfs() {
        _super.apply(this, arguments);
        this.files = {};
    }
    MemoryVfs.prototype.addFile = function (name, data) {
        this.files[name] = new MemoryVfsEntry(name, data);
    };
    MemoryVfs.prototype.openAsync = function (path, flags, mode) {
        if (flags & 2 /* Write */) {
            if (!this.files[path]) {
                this.addFile(path, new ArrayBuffer(0));
            }
        }
        if (flags & 1024 /* Truncate */) {
            this.addFile(path, new ArrayBuffer(0));
        }
        var file = this.files[path];
        if (!file) {
            var error = new Error(sprintf("MemoryVfs: Can't find '%s'", path));
            console.error(error);
            console.error(error['stack']);
            return Promise.reject(error);
        }
        else {
            return Promise.resolve(file);
        }
    };
    return MemoryVfs;
})(Vfs);
exports.MemoryVfs = MemoryVfs;
var MemoryVfsEntry = (function (_super) {
    __extends(MemoryVfsEntry, _super);
    function MemoryVfsEntry(name, data) {
        _super.call(this);
        this.name = name;
        this.data = data;
    }
    Object.defineProperty(MemoryVfsEntry.prototype, "isDirectory", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    MemoryVfsEntry.prototype.readChunkAsync = function (offset, length) {
        return Promise.resolve(this.data.slice(offset, offset + length));
    };
    MemoryVfsEntry.prototype.writeChunkAsync = function (offset, data) {
        var newData = new ArrayBuffer(Math.max(this.data.byteLength, offset + data.byteLength));
        var newDataArray = new Uint8Array(newData);
        newDataArray.set(new Uint8Array(this.data), 0);
        newDataArray.set(new Uint8Array(data), offset);
        this.data = newData;
        return Promise.resolve(data.byteLength);
    };
    MemoryVfsEntry.prototype.stat = function () {
        return {
            name: this.name,
            size: this.data.byteLength,
            isDirectory: false,
            timeCreation: new Date(),
            timeLastAccess: new Date(),
            timeLastModification: new Date(),
        };
    };
    MemoryVfsEntry.prototype.close = function () {
    };
    MemoryVfsEntry.prototype.enumerateAsync = function () {
        return Promise.resolve([]);
    };
    return MemoryVfsEntry;
})(VfsEntry);
exports.MemoryVfsEntry = MemoryVfsEntry;
//# sourceMappingURL=vfs_memory.js.map