import {logger, PromiseFast, StringDictionary} from "../../global/utils";

const console = logger.named('indexeddb');

//declare const indexedDB: any;
declare const IDBKeyRange: IDBKeyRange;

export interface MyStorage {
	putAsync(key: string, value: any): PromiseFast<void>;
	deleteAsync(key: string): PromiseFast<void>;
	hasAsync(key: string): PromiseFast<boolean>;
	getAsync(key: string): PromiseFast<any>;
}

class MyStorageIndexedDb implements MyStorage {
	constructor(private db: IDBDatabase) {
	}

	static openAsync(name: string) {
		console.info(`MyStorageIndexedDb.openAsync("${name}")`)
		return new PromiseFast<MyStorage>((resolve, reject) => {
            const request = indexedDB.open(name, 1);
            request.onupgradeneeded = function (e) {
                const db = request.result;

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

	putAsync(key: string, value: any): PromiseFast<void> {
		console.log('putAsync', key, value);
        const store = this.getItemsStore();
        return new PromiseFast<void>((resolve, reject) => {
            const request = store.put({key: key, value: value});
            request.onsuccess = function (e) {
				resolve();
			};
			request.onerror = function (e:any) {
				reject(e['value']);
			};
		});
	}

	deleteAsync(key: string): PromiseFast<void> {
		console.log('deleteAsync', key);
        const store = this.getItemsStore();
        return new PromiseFast<void>((resolve, reject) => {
            const request = store.delete(key);

            request.onsuccess = function (e) {
				resolve();
			};

			request.onerror = function (e:any) {
				reject(e['value']);
			};
		});
	}

	hasAsync(key: string): PromiseFast<boolean> {
		console.log('hasAsync', key);
		return this.getAsync(key).then(() => true, () => false);
	}

	getAsync(key: string): PromiseFast<any> {
        const store = this.getItemsStore();
        return new PromiseFast((resolve, reject) => {
			//console.log('rr');
			//const keyRange = IDBKeyRange.only(key);
			//const keyRange = IDBKeyRange.lowerBound(0);

            const request = store.get(key);

            request.onsuccess = (e:any) => {
                const result = e.target['result'];
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
		//console.log(`new MyStorageFake(${name})`);
	}

	putAsync(key: string, value: any): PromiseFast<void> {
		console.log('putAsync', key, value);
		this.items[key] = value;
		return PromiseFast.resolve();
	}

	deleteAsync(key: string): PromiseFast<void> {
		console.log('deleteAsync', key);
		delete this.items[key];
		return PromiseFast.resolve();
	}

	hasAsync(key: string): PromiseFast<boolean> {
        const value = this.items[key] !== undefined;
        console.log('hasAsync', key, value);
		return PromiseFast.resolve(value);
	}

	getAsync(key: string): PromiseFast<any> {
        const result = this.items[key];
        console.log('getAsync', key, result);
		return PromiseFast.resolve(result);
	}
}

export function indexedDbOpenAsync(name: string, version: number, stores: string[]): PromiseFast<MyStorage> {
	if (typeof indexedDB == "undefined") {
		return PromiseFast.resolve(new MyStorageFake(name));
	} else {
		return MyStorageIndexedDb.openAsync(name + '_v2');
	}
}
