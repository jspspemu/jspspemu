interface StatInfo {
	size: number;
	date: Date;
}

function waitAsycn(timems: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, timems);
	});
}

function downloadFileAsync(url: string) {
	return new Promise<ArrayBuffer>((resolve, reject) => {
		var request = new XMLHttpRequest();

		request.open("GET", url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		request.responseType = "arraybuffer";
		request.onerror = function (e) { reject(e['error']); };
		request.onload = function (e) {
			if (request.status < 400) {
				var arraybuffer: ArrayBuffer = request.response; // not responseText
				resolve(arraybuffer);
			} else {
				reject(new Error("HTTP " + request.status));
			}
		};
		request.send();
	});
}

function statFileAsync(url: string) {
	return new Promise<StatInfo>((resolve, reject) => {
		var request = new XMLHttpRequest();

		request.open("HEAD", url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		request.responseType = "arraybuffer";
		request.onerror = function (e) { reject(e['error']); };
		request.onload = function (e) {
			var headers = request.getAllResponseHeaders();
			var date = new Date();
			var size = 0;

			var sizeMatch = headers.match(/content-length:\s*(\d+)/i);
			if (sizeMatch) size = parseInt(sizeMatch[1]);

			var dateMatch = headers.match(/date:(.*)/i);
			if (dateMatch) date = new Date(Date.parse(dateMatch[1].trim()));

			resolve({ size: size, date: date });
		};
		request.send();
	});
}
