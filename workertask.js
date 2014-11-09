var IN_WORKER = ((self.document === undefined));
//console.log('IN_WORKER ' + IN_WORKER);

if (IN_WORKER) {
	self.addEventListener('message', function(e) {
		var data = e.data;
		
		var func = new Function('var func = (' + data.code + '); return func.apply(null, arguments);');
		var argsArray = data.payload;

		var result = func.apply(null, argsArray);
		
		function resolve(result) {
			self.postMessage({ id: data.id, type: data.type, payload: result });
		}

		if (result && (typeof(result.then) == 'function')) {
			result.then(resolve);
		} else {
			resolve(result);
		}
	}, false);
} else {
	var WorkerTask = (function() {
		
		var worker = new Worker('workertask.js');
		
		function WorkerTask() { }

		var lastId = 0;
		WorkerTask.executeAsync = function(code, argsArray) {
			return new Promise(function(resolve, reject) {
				var id = lastId++;
				
				function handler(e) {
					var data = e.data;
					if (data.id != id) return;
					worker.removeEventListener('message', handler);

					resolve(e.data.payload);
				}
				
				worker.addEventListener('message', handler);
				worker.postMessage({ id: id, code: code.toString(), payload: argsArray }); // Send data to our worker.
			});
		};
		
		return WorkerTask;
	})();
}

