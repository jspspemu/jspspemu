import _vfs = require('./vfs/vfs'); _vfs.Vfs;
import _vfs_zip = require('./vfs/vfs_zip'); _vfs_zip.ZipVfs;
import _vfs_iso = require('./vfs/vfs_iso'); _vfs_iso.IsoVfs;
import _vfs_uri = require('./vfs/vfs_uri'); _vfs_uri.UriVfs;
import _vfs_memory = require('./vfs/vfs_memory'); _vfs_memory.MemoryVfs;
import _vfs_mountable = require('./vfs/vfs_mountable'); _vfs_mountable.MountableVfs;

export import FileMode = _vfs.FileMode;
export import FileOpenFlags = _vfs.FileOpenFlags;
export import Vfs = _vfs.Vfs;
export import VfsEntry = _vfs.VfsEntry;
export import VfsStat = _vfs.VfsStat;

export import ZipVfs = _vfs_zip.ZipVfs;
export import IsoVfs = _vfs_iso.IsoVfs;
export import UriVfs = _vfs_uri.UriVfs;
export import MemoryVfs = _vfs_memory.MemoryVfs;
export import MountableVfs = _vfs_mountable.MountableVfs;
