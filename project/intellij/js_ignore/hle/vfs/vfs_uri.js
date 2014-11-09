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
var VfsEntryStream = _vfs.VfsEntryStream;
var FileOpenFlags = _vfs.FileOpenFlags;
var UriVfs = (function (_super) {
    __extends(UriVfs, _super);
    function UriVfs(baseUri) {
        _super.call(this);
        this.baseUri = baseUri;
    }
    UriVfs.prototype.getAbsoluteUrl = function (path) {
        return this.baseUri + '/' + path;
    };
    UriVfs.prototype.openAsync = function (path, flags, mode) {
        if (flags & 2 /* Write */) {
            return Promise.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
        }
        var url = this.getAbsoluteUrl(path);
        return UrlAsyncStream.fromUrlAsync(url).then(function (stream) { return new VfsEntryStream(stream); });
    };
    UriVfs.prototype.openDirectoryAsync = function (path) {
        return Promise.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
    };
    UriVfs.prototype.getStatAsync = function (path) {
        var url = this.getAbsoluteUrl(path);
        return statUrlAsync(url);
    };
    return UriVfs;
})(Vfs);
exports.UriVfs = UriVfs;
function urlStatToVfsStat(url, info) {
    return {
        name: url,
        size: info.size,
        isDirectory: false,
        timeCreation: info.date,
        timeLastAccess: info.date,
        timeLastModification: info.date,
    };
}
function statUrlAsync(url) {
    return statFileAsync(url).then(function (info) { return urlStatToVfsStat(url, info); });
}
//# sourceMappingURL=vfs_uri.js.map