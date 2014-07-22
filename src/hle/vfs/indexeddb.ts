
//declare var indexedDB: any;
declare var IDBKeyRange: IDBKeyRange;

export interface MyStorage {
	putAsync(key: string, value: any): Promise<void>;
	deleteAsync(key: string): Promise<void>;
	hasAsync(key: string): Promise<boolean>;
	getAsync(key: string): Promise<any>;
}

class MyStorageIndexedDb implements MyStorage {
	constructor(private db: IDBDatabase) {
	}

	static openAsync(name: string) {
		return new Promise<MyStorage>((resolve, reject) => {
			var request = indexedDB.open(name, 1);
			request.onupgradeneeded = function (e) {
				var db = request.result;

				// A versionchange transaction is started automatically.
				//request.transaction.onerror = html5rocks.indexedDB.onerror;
				console.log('upgrade!');

				if (db.objectStoreNames.contains('items')) db.deleteObjectStore('items');
				db.createObjectStore('items', { keyPath: "key" });
			};
			request.onerror = (event) => {
				reject(new Error("Can't open indexedDB"));
			};
			request.onsuccess = (event) => {
				resolve(new MyStorageIndexedDb(request.result));
			};
		});
	}

	getItemsStore() {
		return this.db.transaction(['items'], "readwrite").objectStore('items');
	}

	putAsync(key: string, value: any): Promise<void> {
		var store = this.getItemsStore();
		return new Promise<void>((resolve, reject) => {
			var request = store.put({ key: key, value: value });
			request.onsuccess = function (e) {
				resolve();
			};
			request.onerror = function (e) {
				reject(e['value']);
			};
		});
	}

	deleteAsync(key: string): Promise<void> {
		var store = this.getItemsStore();
		return new Promise<void>((resolve, reject) => {
			var request = store.delete(key);

			request.onsuccess = function (e) {
				resolve();
			};

			request.onerror = function (e) {
				reject(e['value']);
			};
		});
	}

	hasAsync(key: string): Promise<boolean> {
		return this.getAsync(key).then(() => true, () => false);
	}

	getAsync(key: string): Promise<any> {
		var store = this.getItemsStore();
		return new Promise((resolve, reject) => {
			//console.log('rr');
			//var keyRange = IDBKeyRange.only(key);
			//var keyRange = IDBKeyRange.lowerBound(0);

			try {
			var cursorRequest = store.openCursor(IDBKeyRange.only(key));
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
					var result = cursor.value;
					cursor.delete();
					resolve(result.value);
					//cursor.continue();
				}
			};

			cursorRequest.onerror = (e) => {
				//console.log('dd');
				reject(e['value']);
			};
		});
	}
}

class MyStorageFake implements MyStorage {
	private items: StringDictionary<string> = {};

	constructor(private name: string) {
		//console.log('new MyStorageFake(' + name + ')');
	}

	putAsync(key: string, value: any): Promise<void> {
		this.items[key] = value;
		return Promise.resolve();
	}

	deleteAsync(key: string): Promise<void> {
		delete this.items[key];
		return Promise.resolve();
	}

	hasAsync(key: string): Promise<boolean> {
		return Promise.resolve(this.items[key] !== undefined);
	}

	getAsync(key: string): Promise<any> {
		return Promise.resolve(this.items[key]);
	}
}

export function openAsync(name: string, version: number, stores: string[]): Promise<MyStorage> {
	if (typeof indexedDB == "undefined") {
		return Promise.resolve(new MyStorageFake(name));
	} else {
		return MyStorageIndexedDb.openAsync(name + '_v2');
	}
}
