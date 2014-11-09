var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var _vfs_memory = require('./vfs_memory');
var MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;
var Vfs = _vfs.Vfs;
var MountableVfs = (function (_super) {
    __extends(MountableVfs, _super);
    function MountableVfs() {
        _super.apply(this, arguments);
        this.mounts = [];
    }
    MountableVfs.prototype.mountVfs = function (path, vfs) {
        this.mounts.unshift(new MountableEntry(this.normalizePath(path), vfs, null));
    };
    MountableVfs.prototype.mountFileData = function (path, data) {
        this.mounts.unshift(new MountableEntry(this.normalizePath(path), null, new MemoryVfsEntry(path, data)));
    };
    MountableVfs.prototype.normalizePath = function (path) {
        return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    };
    MountableVfs.prototype.transformPath = function (path) {
        path = this.normalizePath(path);
        for (var n = 0; n < this.mounts.length; n++) {
            var mount = this.mounts[n];
            //console.log(mount.path + ' -- ' + path);
            if (path.startsWith(mount.path)) {
                var part = path.substr(mount.path.length);
                return { mount: mount, part: part };
            }
        }
        console.info(this.mounts);
        throw (new Error("MountableVfs: Can't find file '" + path + "'"));
    };
    MountableVfs.prototype.openAsync = function (path, flags, mode) {
        var info = this.transformPath(path);
        if (info.mount.file) {
            return Promise.resolve(info.mount.file);
        }
        else {
            return info.mount.vfs.openAsync(info.part, flags, mode);
        }
    };
    MountableVfs.prototype.openDirectoryAsync = function (path) {
        var info = this.transformPath(path);
        if (info.mount.file) {
            return Promise.resolve(info.mount.file);
        }
        else {
            return info.mount.vfs.openDirectoryAsync(info.part);
        }
    };
    MountableVfs.prototype.getStatAsync = function (path) {
        var info = this.transformPath(path);
        if (info.mount.file) {
            return Promise.resolve(info.mount.file.stat());
        }
        else {
            return info.mount.vfs.getStatAsync(info.part);
        }
    };
    return MountableVfs;
})(Vfs);
exports.MountableVfs = MountableVfs;
var MountableEntry = (function () {
    function MountableEntry(path, vfs, file) {
        this.path = path;
        this.vfs = vfs;
        this.file = file;
    }
    return MountableEntry;
})();
//# sourceMappingURL=vfs_mountable.js.map