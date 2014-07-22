
//declare var indexedDB: any;
declare var IDBKeyRange: IDBKeyRange;

export interface MyStorage {
	getStore(name: string): MyStore;
	rangeOnly(name: string): MyRange;
}

export interface MyRange {
}

export interface MyStore {
	putAsync(value: any): Promise<any>;
	deleteAsync(key: string): Promise<any>;
	getRangeAsync(keyRange: MyRange, iterator: (item) => void): Promise<any>;
	getOneAsync(keyRange: MyRange): Promise<any>;
}

class MyStoreIndexedDb implements MyStore {
	constructor(private store: IDBObjectStore) {
	}


	putAsync(value: any):Promise<any> {
		return new Promise((resolve, reject) => {
			var request = this.store.put(value);
			request.onsuccess = function (e) {
				resolve();
			};
			request.onerror = function (e) {
				reject(e['value']);
			};
		});
	}

	deleteAsync(key: string) {
		return new Promise((resolve, reject) => {
			var request = this.store.delete(key);

			request.onsuccess = function (e) {
				resolve();
			};

			request.onerror = function (e) {
				reject(e['value']);
			};
		});
	}

	getRangeAsync(keyRange: MyRange, iterator: (item) => void) {
		return new Promise((resolve, reject) => {
			//console.log('rr');
			//var keyRange = IDBKeyRange.only(key);
			//var keyRange = IDBKeyRange.lowerBound(0);

			try {
				var cursorRequest = this.store.openCursor((<MyRangeIndexedDb>keyRange).keyRange);
			} catch (e) {
				console.error(e);
				reject(e);
			}

			//console.log('mm', cursorRequest);

			cursorRequest.onsuccess = (e) => {
				var cursor = <IDBCursorWithValue>cursorRequest.result;
				if (!!cursor == false) {
					resolve();
					return;
				} else {
					var result2 = iterator(cursor.value);
					cursor.continue();
				}
			};

			cursorRequest.onerror = (e) => {
				//console.log('dd');
				reject(e['value']);
			};
		});
	}

	getOneAsync(keyRange: MyRange) {
		return new Promise((resolve, reject) => {
			this.getRangeAsync((<MyRangeIndexedDb>keyRange).keyRange, (item) => {
				resolve(item);
			}).then(() => {
				resolve(null);
			}).catch(e => {
				reject(e);
			});
		});
	}

}

class MyRangeIndexedDb implements MyRange {
	constructor(public keyRange:IDBKeyRange) {
	}
}

class MyStorageIndexedDb implements MyStorage {
	constructor(private db: IDBDatabase) {
	}

	getStore(name: string) {
		return new MyStoreIndexedDb(this.db.transaction([name], "readwrite").objectStore(name));
	}

	rangeOnly(name: string) {
		return new MyRangeIndexedDb(IDBKeyRange.only(name));
	}

	static openAsync(name: string, version: number, stores: string[]) {
		return new Promise<MyStorage>((resolve, reject) => {
			var request = indexedDB.open(name, version);
			request.onupgradeneeded = function (e) {
				var db = request.result;

				// A versionchange transaction is started automatically.
				//request.transaction.onerror = html5rocks.indexedDB.onerror;
				console.log('upgrade!');

				stores.forEach(store => {
					if (db.objectStoreNames.contains(store)) db.deleteObjectStore(store);
					db.createObjectStore(store, { keyPath: "name" });
				});
			};
			request.onerror = (event) => {
				reject(new Error("Can't open indexedDB"));
			};
			request.onsuccess = (event) => {
				resolve(new MyStorageIndexedDb(request.result));
			};
		});
	}

}

export function openAsync(name: string, version: number, stores: string[]): Promise<MyStorage> {
	return MyStorageIndexedDb.openAsync(name, version, stores);
}
