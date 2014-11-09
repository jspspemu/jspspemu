var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var Vfs = _vfs.Vfs;
var VfsEntry = _vfs.VfsEntry;
var IsoVfs = (function (_super) {
    __extends(IsoVfs, _super);
    function IsoVfs(iso) {
        _super.call(this);
        this.iso = iso;
    }
    IsoVfs.prototype.openAsync = function (path, flags, mode) {
        try {
            return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
        }
        catch (e) {
            return Promise.reject(e);
        }
    };
    return IsoVfs;
})(Vfs);
exports.IsoVfs = IsoVfs;
var IsoVfsFile = (function (_super) {
    __extends(IsoVfsFile, _super);
    function IsoVfsFile(node) {
        _super.call(this);
        this.node = node;
    }
    Object.defineProperty(IsoVfsFile.prototype, "isDirectory", {
        get: function () {
            return this.node.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoVfsFile.prototype, "size", {
        get: function () {
            return this.node.size;
        },
        enumerable: true,
        configurable: true
    });
    IsoVfsFile.prototype.readChunkAsync = function (offset, length) {
        return this.node.readChunkAsync(offset, length);
    };
    IsoVfsFile.prototype.close = function () {
    };
    IsoVfsFile.statNode = function (node) {
        return {
            name: node.name,
            size: node.size,
            isDirectory: node.isDirectory,
            timeCreation: node.date,
            timeLastAccess: node.date,
            timeLastModification: node.date,
            dependentData0: node.extent,
        };
    };
    IsoVfsFile.prototype.stat = function () {
        return IsoVfsFile.statNode(this.node);
    };
    IsoVfsFile.prototype.enumerateAsync = function () {
        return Promise.resolve(this.node.childs.map(function (node) { return IsoVfsFile.statNode(node); }));
    };
    return IsoVfsFile;
})(VfsEntry);
//# sourceMappingURL=vfs_iso.js.map