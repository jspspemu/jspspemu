class Signal<T> {
	callbacks = [];

	add(callback: (value?: T) => void) {
		this.callbacks.push(callback);
	}

	remove(callback: (value?: T) => void) {
		var index = this.callbacks.indexOf(callback);
		if (index >= 0) {
			this.callbacks.splice(index, 1);
		}
	}

	once(callback: (value?: T) => void) {
		var once = () => {
			this.remove(once);
			callback();
		};
		this.add(once);
	}

	dispatch(value?: T) {
		this.callbacks.forEach((callback) => {
			callback(value);
		});
	}
}

export = Signal;
