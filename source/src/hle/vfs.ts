import * as _vfs from './vfs/vfs'; _vfs.Vfs;
import * as _zip from './vfs/vfs_zip'; _zip.ZipVfs;
import * as _iso from './vfs/vfs_iso'; _iso.IsoVfs;
import * as _uri from './vfs/vfs_uri'; _uri.UriVfs;
import * as _ms from './vfs/vfs_ms'; _ms.MemoryStickVfs;
import * as _memory from './vfs/vfs_memory'; _memory.MemoryVfs;
import * as _mountable from './vfs/vfs_mountable'; _mountable.MountableVfs;
import * as _storage from './vfs/vfs_storage'; _storage.StorageVfs;
import * as _emulator from './vfs/vfs_emulator'; _emulator.EmulatorVfs;
import * as _dropbox from './vfs/vfs_dropbox'; _dropbox.DropboxVfs;

export import FileMode = _vfs.FileMode;
export import FileOpenFlags = _vfs.FileOpenFlags;
export import Vfs = _vfs.Vfs;
export import ProxyVfs = _vfs.ProxyVfs;
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
