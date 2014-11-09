var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Vfs = (function () {
    function Vfs() {
    }
    Vfs.prototype.devctlAsync = function (command, input, output) {
        console.error('VfsMustOverride devctlAsync', this);
        throw (new Error("Must override devctlAsync : " + this));
        return null;
    };
    Vfs.prototype.openAsync = function (path, flags, mode) {
        console.error('VfsMustOverride openAsync', this);
        throw (new Error("Must override openAsync : " + this));
        return null;
    };
    Vfs.prototype.readAllAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8)).then(function (entry) { return entry.readAllAsync(); });
    };
    Vfs.prototype.writeAllAsync = function (path, data) {
        return this.openAsync(path, 512 /* Create */ | 1024 /* Truncate */ | 2 /* Write */, parseInt('0777', 8)).then(function (entry) { return entry.writeAllAsync(data); });
    };
    Vfs.prototype.openDirectoryAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8));
    };
    Vfs.prototype.getStatAsync = function (path) {
        return this.openAsync(path, 1 /* Read */, parseInt('0777', 8)).then(function (entry) { return entry.stat(); });
    };
    Vfs.prototype.existsAsync = function (path) {
        return this.getStatAsync(path).then(function () { return true; }).catch(function () { return false; });
    };
    return Vfs;
})();
exports.Vfs = Vfs;
var ProxyVfs = (function (_super) {
    __extends(ProxyVfs, _super);
    function ProxyVfs(parentVfsList) {
        _super.call(this);
        this.parentVfsList = parentVfsList;
    }
    ProxyVfs.prototype._callChainWhenError = function (callback) {
        var promise = Promise.reject(new Error());
        this.parentVfsList.forEach(function (parentVfs) {
            promise = promise.catch(function (e) {
                return callback(parentVfs, e);
            });
        });
        return promise;
    };
    ProxyVfs.prototype.devctlAsync = function (command, input, output) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.devctlAsync(command, input, output);
        });
    };
    ProxyVfs.prototype.openAsync = function (path, flags, mode) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.openAsync(path, flags, mode);
        });
    };
    ProxyVfs.prototype.openDirectoryAsync = function (path) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.openDirectoryAsync(path);
        });
    };
    ProxyVfs.prototype.getStatAsync = function (path) {
        return this._callChainWhenError(function (vfs, e) {
            return vfs.getStatAsync(path);
        });
    };
    return ProxyVfs;
})(Vfs);
exports.ProxyVfs = ProxyVfs;
var VfsEntry = (function () {
    function VfsEntry() {
    }
    Object.defineProperty(VfsEntry.prototype, "isDirectory", {
        get: function () {
            return this.stat().isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VfsEntry.prototype, "size", {
        get: function () {
            return this.stat().size;
        },
        enumerable: true,
        configurable: true
    });
    VfsEntry.prototype.readAllAsync = function () {
        return this.readChunkAsync(0, this.size);
    };
    VfsEntry.prototype.writeAllAsync = function (data) {
        return this.writeChunkAsync(0, data);
    };
    VfsEntry.prototype.enumerateAsync = function () {
        throw (new Error("Must override enumerateAsync : " + this));
    };
    VfsEntry.prototype.readChunkAsync = function (offset, length) {
        throw (new Error("Must override readChunkAsync : " + this));
    };
    VfsEntry.prototype.writeChunkAsync = function (offset, data) {
        throw (new Error("Must override writeChunkAsync : " + this));
    };
    VfsEntry.prototype.stat = function () {
        throw (new Error("Must override stat"));
    };
    VfsEntry.prototype.close = function () {
    };
    return VfsEntry;
})();
exports.VfsEntry = VfsEntry;
var VfsEntryStream = (function (_super) {
    __extends(VfsEntryStream, _super);
    function VfsEntryStream(asyncStream) {
        _super.call(this);
        this.asyncStream = asyncStream;
    }
    Object.defineProperty(VfsEntryStream.prototype, "size", {
        get: function () {
            return this.asyncStream.size;
        },
        enumerable: true,
        configurable: true
    });
    VfsEntryStream.prototype.readChunkAsync = function (offset, length) {
        return this.asyncStream.readChunkAsync(offset, length);
    };
    VfsEntryStream.prototype.close = function () {
    };
    VfsEntryStream.prototype.stat = function () {
        return {
            name: this.asyncStream.name,
            size: this.asyncStream.size,
            isDirectory: false,
            timeCreation: this.asyncStream.date,
            timeLastAccess: this.asyncStream.date,
            timeLastModification: this.asyncStream.date,
        };
    };
    return VfsEntryStream;
})(VfsEntry);
exports.VfsEntryStream = VfsEntryStream;
(function (FileOpenFlags) {
    FileOpenFlags[FileOpenFlags["Read"] = 0x0001] = "Read";
    FileOpenFlags[FileOpenFlags["Write"] = 0x0002] = "Write";
    FileOpenFlags[FileOpenFlags["ReadWrite"] = FileOpenFlags.Read | FileOpenFlags.Write] = "ReadWrite";
    FileOpenFlags[FileOpenFlags["NoBlock"] = 0x0004] = "NoBlock";
    FileOpenFlags[FileOpenFlags["_InternalDirOpen"] = 0x0008] = "_InternalDirOpen";
    FileOpenFlags[FileOpenFlags["Append"] = 0x0100] = "Append";
    FileOpenFlags[FileOpenFlags["Create"] = 0x0200] = "Create";
    FileOpenFlags[FileOpenFlags["Truncate"] = 0x0400] = "Truncate";
    FileOpenFlags[FileOpenFlags["Excl"] = 0x0800] = "Excl";
    FileOpenFlags[FileOpenFlags["Unknown1"] = 0x4000] = "Unknown1";
    FileOpenFlags[FileOpenFlags["NoWait"] = 0x8000] = "NoWait";
    FileOpenFlags[FileOpenFlags["Unknown2"] = 0xf0000] = "Unknown2";
    FileOpenFlags[FileOpenFlags["Unknown3"] = 0x2000000] = "Unknown3";
})(exports.FileOpenFlags || (exports.FileOpenFlags = {}));
var FileOpenFlags = exports.FileOpenFlags;
(function (FileMode) {
})(exports.FileMode || (exports.FileMode = {}));
var FileMode = exports.FileMode;
//# sourceMappingURL=vfs.js.map