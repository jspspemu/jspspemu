var console = logger.named('indexeddb');

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
		console.info('MyStorageIndexedDb.openAsync("' + name + '")');
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
		console.log('putAsync', key, value);
		var store = this.getItemsStore();
		return new Promise<void>((resolve, reject) => {
			var request = store.put({ key: key, value: value });
			request.onsuccess = function (e) {
				resolve();
			};
			request.onerror = function (e:any) {
				reject(e['value']);
			};
		});
	}

	deleteAsync(key: string): Promise<void> {
		console.log('deleteAsync', key);
		var store = this.getItemsStore();
		return new Promise<void>((resolve, reject) => {
			var request = store.delete(key);

			request.onsuccess = function (e) {
				resolve();
			};

			request.onerror = function (e:any) {
				reject(e['value']);
			};
		});
	}

	hasAsync(key: string): Promise<boolean> {
		console.log('hasAsync', key);
		return this.getAsync(key).then(() => true, () => false);
	}

	getAsync(key: string): Promise<any> {
		var store = this.getItemsStore();
		return new Promise((resolve, reject) => {
			//console.log('rr');
			//var keyRange = IDBKeyRange.only(key);
			//var keyRange = IDBKeyRange.lowerBound(0);

			var request = store.get(key);

			request.onsuccess = (e:any) => {
				var result = e.target['result'];
				if (!result) {
					console.log('getAsync', key, undefined);
					resolve(undefined);
				} else {
					console.log('getAsync', key, result.value);
					resolve(result.value);
				}
			};

			request.onerror = (e:any) => {
				console.log('getAsync', key, e);
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
		console.log('putAsync', key, value);
		this.items[key] = value;
		return Promise.resolve();
	}

	deleteAsync(key: string): Promise<void> {
		console.log('deleteAsync', key);
		delete this.items[key];
		return Promise.resolve();
	}

	hasAsync(key: string): Promise<boolean> {
		var value = this.items[key] !== undefined;
		console.log('hasAsync', key, value);
		return Promise.resolve(value);
	}

	getAsync(key: string): Promise<any> {
		var result = this.items[key];
		console.log('getAsync', key, result);
		return Promise.resolve(result);
	}
}

export function openAsync(name: string, version: number, stores: string[]): Promise<MyStorage> {
	if (typeof indexedDB == "undefined") {
		return Promise.resolve(new MyStorageFake(name));
	} else {
		return MyStorageIndexedDb.openAsync(name + '_v2');
	}
}
