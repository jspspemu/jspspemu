var console = logger.named('indexeddb');
var MyStorageIndexedDb = (function () {
    function MyStorageIndexedDb(db) {
        this.db = db;
    }
    MyStorageIndexedDb.openAsync = function (name) {
        console.info('MyStorageIndexedDb.openAsync("' + name + '")');
        return new Promise(function (resolve, reject) {
            var request = indexedDB.open(name, 1);
            request.onupgradeneeded = function (e) {
                var db = request.result;
                // A versionchange transaction is started automatically.
                //request.transaction.onerror = html5rocks.indexedDB.onerror;
                console.log('upgrade!');
                if (db.objectStoreNames.contains('items'))
                    db.deleteObjectStore('items');
                db.createObjectStore('items', { keyPath: "key" });
            };
            request.onerror = function (event) {
                reject(new Error("Can't open indexedDB"));
            };
            request.onsuccess = function (event) {
                resolve(new MyStorageIndexedDb(request.result));
            };
        });
    };
    MyStorageIndexedDb.prototype.getItemsStore = function () {
        return this.db.transaction(['items'], "readwrite").objectStore('items');
    };
    MyStorageIndexedDb.prototype.putAsync = function (key, value) {
        console.log('putAsync', key, value);
        var store = this.getItemsStore();
        return new Promise(function (resolve, reject) {
            var request = store.put({ key: key, value: value });
            request.onsuccess = function (e) {
                resolve();
            };
            request.onerror = function (e) {
                reject(e['value']);
            };
        });
    };
    MyStorageIndexedDb.prototype.deleteAsync = function (key) {
        console.log('deleteAsync', key);
        var store = this.getItemsStore();
        return new Promise(function (resolve, reject) {
            var request = store.delete(key);
            request.onsuccess = function (e) {
                resolve();
            };
            request.onerror = function (e) {
                reject(e['value']);
            };
        });
    };
    MyStorageIndexedDb.prototype.hasAsync = function (key) {
        console.log('hasAsync', key);
        return this.getAsync(key).then(function () { return true; }, function () { return false; });
    };
    MyStorageIndexedDb.prototype.getAsync = function (key) {
        var store = this.getItemsStore();
        return new Promise(function (resolve, reject) {
            //console.log('rr');
            //var keyRange = IDBKeyRange.only(key);
            //var keyRange = IDBKeyRange.lowerBound(0);
            var request = store.get(key);
            request.onsuccess = function (e) {
                var result = e.target['result'];
                if (!result) {
                    console.log('getAsync', key, undefined);
                    resolve(undefined);
                }
                else {
                    console.log('getAsync', key, result.value);
                    resolve(result.value);
                }
            };
            request.onerror = function (e) {
                console.log('getAsync', key, e);
                reject(e['value']);
            };
        });
    };
    return MyStorageIndexedDb;
})();
var MyStorageFake = (function () {
    function MyStorageFake(name) {
        this.name = name;
        this.items = {};
        //console.log('new MyStorageFake(' + name + ')');
    }
    MyStorageFake.prototype.putAsync = function (key, value) {
        console.log('putAsync', key, value);
        this.items[key] = value;
        return Promise.resolve();
    };
    MyStorageFake.prototype.deleteAsync = function (key) {
        console.log('deleteAsync', key);
        delete this.items[key];
        return Promise.resolve();
    };
    MyStorageFake.prototype.hasAsync = function (key) {
        var value = this.items[key] !== undefined;
        console.log('hasAsync', key, value);
        return Promise.resolve(value);
    };
    MyStorageFake.prototype.getAsync = function (key) {
        var result = this.items[key];
        console.log('getAsync', key, result);
        return Promise.resolve(result);
    };
    return MyStorageFake;
})();
function openAsync(name, version, stores) {
    if (typeof indexedDB == "undefined") {
        return Promise.resolve(new MyStorageFake(name));
    }
    else {
        return MyStorageIndexedDb.openAsync(name + '_v2');
    }
}
exports.openAsync = openAsync;
//# sourceMappingURL=indexeddb.js.map