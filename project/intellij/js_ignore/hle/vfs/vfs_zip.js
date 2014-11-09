var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;
var ZipVfs = (function (_super) {
    __extends(ZipVfs, _super);
    function ZipVfs(zip, writeVfs) {
        _super.call(this);
        this.zip = zip;
        this.writeVfs = writeVfs;
    }
    ZipVfs.prototype.openAsync = function (path, flags, mode) {
        try {
            return Promise.resolve(new ZipVfsFile(this.zip.get(path)));
        }
        catch (e) {
            return Promise.reject(e);
        }
    };
    return ZipVfs;
})(Vfs);
exports.ZipVfs = ZipVfs;
var ZipVfsFile = (function (_super) {
    __extends(ZipVfsFile, _super);
    function ZipVfsFile(node) {
        _super.call(this);
        this.node = node;
    }
    Object.defineProperty(ZipVfsFile.prototype, "isDirectory", {
        get: function () {
            return this.node.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ZipVfsFile.prototype, "size", {
        get: function () {
            return this.node.size;
        },
        enumerable: true,
        configurable: true
    });
    ZipVfsFile.prototype.readChunkAsync = function (offset, length) {
        return this.node.readChunkAsync(offset, length);
    };
    ZipVfsFile.prototype.close = function () {
    };
    ZipVfsFile.statNode = function (node) {
        return {
            name: node.name,
            size: node.size,
            isDirectory: node.isDirectory,
            timeCreation: node.date,
            timeLastAccess: node.date,
            timeLastModification: node.date,
        };
    };
    ZipVfsFile.prototype.stat = function () {
        return ZipVfsFile.statNode(this.node);
    };
    ZipVfsFile.prototype.enumerateAsync = function () {
        return Promise.resolve(this.node.getChildList().map(function (node) { return ZipVfsFile.statNode(node); }));
    };
    return ZipVfsFile;
})(VfsEntry);
//# sourceMappingURL=vfs_zip.js.map