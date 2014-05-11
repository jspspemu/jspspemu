import _vfs = require('./vfs/vfs'); _vfs.Vfs;
import _zip = require('./vfs/vfs_zip'); _zip.ZipVfs;
import _iso = require('./vfs/vfs_iso'); _iso.IsoVfs;
import _uri = require('./vfs/vfs_uri'); _uri.UriVfs;
import _ms = require('./vfs/vfs_ms'); _ms.MemoryStickVfs;
import _memory = require('./vfs/vfs_memory'); _memory.MemoryVfs;
import _mountable = require('./vfs/vfs_mountable'); _mountable.MountableVfs;
import _storage = require('./vfs/vfs_storage'); _storage.StorageVfs;
import _emulator = require('./vfs/vfs_emulator'); _emulator.EmulatorVfs;
import _dropbox = require('./vfs/vfs_dropbox'); _dropbox.DropboxVfs;

export import FileMode = _vfs.FileMode;
export import FileOpenFlags = _vfs.FileOpenFlags;
export import Vfs = _vfs.Vfs;
export import VfsEntry = _vfs.VfsEntry;
export import VfsStat = _vfs.VfsStat;

export import ZipVfs = _zip.ZipVfs;
export import IsoVfs = _iso.IsoVfs;
export import UriVfs = _uri.UriVfs;
export import MemoryVfs = _memory.MemoryVfs;
export import DropboxVfs = _dropbox.DropboxVfs;
export import MountableVfs = _mountable.MountableVfs;
export import StorageVfs = _storage.StorageVfs;
export import EmulatorVfs = _emulator.EmulatorVfs;
export import MemoryStickVfs = _ms.MemoryStickVfs;
