import {PromiseFast, StringDictionary} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";
import {importScript} from "../../global/importScript";
import {downloadFileChunkAsync} from "../../global/async";
import {PathInfo} from "./pathinfo";
import {FileNotFoundError} from "./errors";

declare const Dropbox: any;

const DROPBOX_APP_KEY = '4mdwp62ogo4tna1'

interface FileInfo {
    ".tag": "folder" | "file" | "none"
    id: string
    name: string

    // For files
    client_modified?: string
    content_hash?: string
    rev?: string
    server_modified?: string
    size?: number

    isRemoved?: boolean
}

class DirectoryInfo {
    entriesByName = new Map<string, FileInfo>()

    constructor(public entries: FileInfo[]) {
        for (const entry of entries) {
            this.entriesByName.set(entry.name, entry)
        }
    }

    add(entry: FileInfo) {
        this.entries.push(entry)
        this.entriesByName.set(entry.name, entry)
    }
}

function getCanonicalPath(name: string) {
    const canonicalPath = `/${name.replace(/^\/+/, '').replace(/\/+$/, '')}`
    return canonicalPath == '/' ? '' : canonicalPath
}

export function hasDropboxToken() {
    if (!window.localStorage || !window.document) return false
    return !!localStorage.getItem('DROPBOX_TOKEN')
}

export function dropboxTryStoreCodeAndRefresh() {
    if (!window.localStorage || !window.document) return
    const params = new URLSearchParams(`?${window.document.location.hash.substr(1)}`)
    const access_token = params.get('access_token') // 938ZZZZasDVCczUAAAAAAAAAAeoICnAsSE21321321cV441GeeeeeeQQ-YQZX55542135NGtz
    const token_type = params.get('token_type') // bearer
    const account_id = params.get('account_id') // dbid%1212131243564577asdasdasdassaddsadsadsasdzzxassasqwq13
    const scope = params.get('scope') // account_info.read+files.content.read+files.content.write+files.metadata.read+files.metadata.write

    if (access_token) {
        localStorage.setItem('DROPBOX_TOKEN', access_token)
        window.document.location.href = '/'
    }
}

export function getDropboxCodeOrRedirect() {
    if (!window.localStorage || !window.document) return false
    const token = localStorage.getItem('DROPBOX_TOKEN')
    if (!token) {
        window.document.location.href = generateDropboxAuthorizeUrl()
    }
    return token
}

export function generateDropboxAuthorizeUrl() {
    return `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&redirect_uri=${document.location.protocol}//${document.location.host}&response_type=token`
}

export function referenceDropbox() {
}

dropboxTryStoreCodeAndRefresh()

export class AsyncClient {
	client: any;

	constructor(private key:string) {
	}

	private initPromise: Promise<any> | null = null;

	async initOnceAsync() {
		if (!this.initPromise) {
            this.initPromise = (async () => {
                await importScript('https://cdnjs.cloudflare.com/ajax/libs/dropbox.js/9.2.0/Dropbox-sdk.min.js')
                const accessToken = getDropboxCodeOrRedirect()
                this.client = new Dropbox.Dropbox({ accessToken: accessToken })
                console.warn("Dropbox client initialized")
            })()
		}
		return await this.initPromise;
	}

	async writeFileAsync(fullpath: string, content: ArrayBuffer) {
        await this.initOnceAsync()
        const canonicalPath = getCanonicalPath(fullpath)
	    const path = new PathInfo(canonicalPath)
        const folderPath = path.parent!.fullPath!
        const baseName = path.baseName
        const statsInfo = await this.readdirInfoAsync(folderPath)
        const entry = statsInfo.entriesByName.get(baseName)
        if (entry) {
            entry.size = content.byteLength
        } else {
            this.readdirInfoCachePromise.delete(folderPath)
        }

        await this.client.filesUpload({ path: canonicalPath, contents: content, mode: 'overwrite', autorename: false })
	}

	async mkdirAsync(path: string) {
        await this.initOnceAsync()
        return await new Promise((resolve, reject) => {
            this.client.mkdir(path, (e:Error, data:any) => {
                if (e) {
                    reject(e);
                } else {
                    resolve(data);
                }
            });
        });
	}

	_cacheFileLinks = new Map<string, string>()

	async readFileAsync(name: string, offset: number = 0, length: number | undefined = undefined): Promise<ArrayBuffer> {
        await this.initOnceAsync()
        const canonicalPath = getCanonicalPath(name)
        if (offset === 0 && length === undefined) {
            const result = await this.client.filesDownload({path: canonicalPath})
            return (result.result.fileBlob as Blob).arrayBuffer()
        }
        if (!this._cacheFileLinks.has(canonicalPath)) {
            const result = await this.client.filesGetTemporaryLink({path: canonicalPath})
            this._cacheFileLinks.set(canonicalPath, result.result.link)
        }
        const link = this._cacheFileLinks.get(canonicalPath)!
        return await downloadFileChunkAsync(link, offset, length)
	}

	statCachePromise: StringDictionary<Promise<FileInfo>> = {};
	async statAsync(fullpath: string): Promise<FileInfo> {
        const canonicalPath = getCanonicalPath(fullpath)
        const path = new PathInfo(canonicalPath)
        if (path.parent == null) throw new Error("Invalid path")
        const folderInfo = await this.readdirInfoAsync(path.parent.fullPath)
        const baseName = path.baseName
        const info = folderInfo.entriesByName.get(baseName)
        if (!info) {
            return {".tag": "none", "name": baseName, id: "-"}
            //throw new FileNotFoundError(`File '${fullpath}' not found`)
        }
        return info
	}

	async readdirAsync(name: string): Promise<string[]> {
        return (await this.readdirInfoAsync(name)).entries.map(it => it.name)
	}

    readdirInfoCachePromise = new Map<string, Promise<DirectoryInfo>>()
    async readdirInfoAsync(name: string): Promise<DirectoryInfo> {
        const canonicalPath = getCanonicalPath(name)
        await this.initOnceAsync()
        if (!this.readdirInfoCachePromise.has(canonicalPath)) {
            this.readdirInfoCachePromise.set(canonicalPath, (async () => {
                const result = await this.client.filesListFolder({ path: canonicalPath })
                return new DirectoryInfo(result.result.entries)
            })())
        }
        return await this.readdirInfoCachePromise.get(canonicalPath)!
    }
}

const client = new AsyncClient(DROPBOX_APP_KEY);

export const dropboxClient = client

export class DropboxVfs extends Vfs {
	enabled = true;

	constructor() {
		super();
	}

	static tryLoginAsync() {
		return client.initOnceAsync();
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
		path = getCanonicalPath(path);
		if (!this.enabled) return PromiseFast.reject(new Error("Not using dropbox"));
		return PromiseFast.ensure(DropboxVfsEntry.fromPathAsync(path, flags, mode))
	}
}

export class DropboxVfsEntry extends VfsEntry {
	constructor(private path: string, private name: string, private _size: number, private isFile: boolean, private date:Date) {
		super();
	}

	static async fromPathAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<DropboxVfsEntry> {
		async function readedErrorAsync(e: Error) {
			if (flags & FileOpenFlags.Create) {
				//console.log('creating file!');
                const entry = new DropboxVfsEntry(path, path.split('/').pop()!, 0, true, new Date());
                try {
                    await client.writeFileAsync(path, new ArrayBuffer(0))
                    return entry
                } catch (e) {
                    console.error(e);
                    throw(e);
                }
			} else {
				throw (e);
			}
		}

		try {
            const info = await client.statAsync(path)

            if (info.isRemoved) {
                return await readedErrorAsync(new Error("file not exists"));
            } else {
                //console.log(info);
                return new DropboxVfsEntry(path, info.name, info.size!, info[".tag"] == 'file', new Date(info.server_modified || ""));
            }
        } catch (e) {
            return await readedErrorAsync(e);
        }
	}

	enumerateAsync(): PromiseFast<VfsStat[]> {
	    return PromiseFast.ensure((async () => {
	        try {
                const info = await client.readdirInfoAsync(this.path)
                return info.entries.map(it => {
                    return {
                        name: it.name,
                        size: it.size || 0,
                        isDirectory: it[".tag"] == 'folder',
                        timeCreation: new Date(it.server_modified ?? ""),
                        timeLastAccess: new Date(it.server_modified ?? ""),
                        timeLastModification: new Date(it.server_modified ?? ""),
                        dependentData0: 0,
                        dependentData1: 0
                    }
                })
            } catch (e) {
	            return []
            }
        })())
	}

	// @ts-ignore
    private cachedContent: ArrayBuffer;
	private writeTimer = -1;

	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> {
		//console.log('dropbox: read chunk!', this.path, offset, length);

        if (this._size < 128 * 1024 * 1024) {
			if (this.cachedContent) return PromiseFast.resolve(this.cachedContent.slice(offset, offset + length));
			return PromiseFast.ensure(client.readFileAsync(this.path).then(data => {
				this.cachedContent = data;
				return this.cachedContent.slice(offset, offset + length);
			}))
		} else {
			//console.log(`read dropbox file ${this.path}`);
			return PromiseFast.ensure(client.readFileAsync(this.path, offset, (length !== undefined) ? offset + length : undefined))
		}
	}

    initialContentPromise?: Promise<Uint8Array> = undefined
	writeCache?: Uint8Array = undefined

	writeChunkAsync(offset: number, dataToWrite: ArrayBuffer, truncate?: boolean): PromiseFast<number> {
	    return PromiseFast.ensure((async () => {
            if (!truncate) {
                if (!this.initialContentPromise) {
                    this.initialContentPromise = (async () => {
                        return new Uint8Array(await this.readAllAsync())
                    })()
                }
                await this.initialContentPromise!
                if (!this.writeCache) {
                    this.writeCache = await this.initialContentPromise!
                }
            }
            const newContent = new Uint8Array(Math.max(this.writeCache?.length ?? 0, offset + dataToWrite.byteLength));
            if (!truncate) {
                newContent.set(this.writeCache!)
            }
            newContent.set(new Uint8Array(dataToWrite), offset)
            this.writeCache! = newContent.slice()

            clearTimeout(this.writeTimer);
            this.writeTimer = setTimeout(() => {
                client.writeFileAsync(this.path, newContent);
            }, 500) as any;
            return dataToWrite.byteLength
        })())
	}

	stat(): VfsStat {
		return {
			name: this.name,
			size: this._size,
			isDirectory: !this.isFile,
			timeCreation: this.date,
			timeLastAccess: this.date,
			timeLastModification: this.date,
			dependentData0: 0,
			dependentData1: 1,
		};
	}
	close() {
	}
}



(async () => {
    //const vfs = new DropboxVfs()
    //const file = await vfs.openAsync("/log.txt", FileOpenFlags.Read, 0o777)
    //const file2 = (await vfs.openAsync("/demo.txt", FileOpenFlags.Write, 0o777))
    //file2.writeAllAsync(new Uint8Array([1,2,3,4]))
})()


/*
const dvfs = new DropboxVfs();

dvfs.openAsync('/test', FileOpenFlags.Create | FileOpenFlags.Write | FileOpenFlags.Truncate, <FileMode>parseIntFormat('0777')).then(value => {
	console.info('dvfs result:', value);
}).catch(e => {
		console.error('dvfs error:', e);
});
*/

/*
client.readdirAsync('/PSP/GAME/virtual/SAVE/SharewareDoom').then(result => {
	console.log(result);
});
*/