import {mac2string, NumberDictionary, Signal0, Signal1, string2mac} from "../../global/utils";
import {Stream} from "../../global/stream";

export interface NetPacket {
	port: number;
	type: string;
	mac: Uint8Array;
	payload: Uint8Array;
}

export class NetManager {
	connected = false;
	private ws: WebSocket|null = null;
	private _onmessageSignals = <NumberDictionary<Signal1<NetPacket>>>{};
	onopen = new Signal0();
	onclose = new Signal0();
	mac = new Uint8Array(6);

	onmessage(port: number) {
		if (!this._onmessageSignals[port]) this._onmessageSignals[port] = new Signal1<NetPacket>();
		return this._onmessageSignals[port];
	}

	connectOnce() {
		if (this.ws) return;
		this.ws = new WebSocket('ws://' + location.host + '/adhoc', 'adhoc');

		this.ws.onopen = (e) => {
		};
		this.ws.onclose = (e) => {
			this.connected = false;
			this.onclose.dispatch();
			setTimeout(() => {
				this.ws = null;
				this.connectOnce();
			}, 5000);
		};
		this.ws.onmessage = (e) => {
			var info = JSON.parse(e.data);
			if (info.from == 'ff:ff:ff:ff:ff:ff') {
				console.info('NetManager: from_server:', info);
				switch (info.type) {
					case 'setid':
						this.mac = string2mac(info.payload);
						this.connected = true;
						this.onopen.dispatch();
						break;
				}
			} else {
				var packet = {
					port: info.port,
					type: info.type,
					mac: string2mac(info.from),
					payload: Stream.fromBase64(info.payload).toUInt8Array(),
				};
				//console.info('NetManager: from_user:', { port: info.port, type: info.type, mac: info.from, payload: Stream.fromBase64(info.payload).toStringAll() });
				this.onmessage(info.port).dispatch(packet);
			}
		};
		this.ws.onerror = (e) => {
			this.connected = false;
			console.error(e);
			setTimeout(() => {
				this.connectOnce();
				this.ws = null;
			}, 10000);
		};
	}

	send(port: number, type: string, toMac: Uint8Array, data: Uint8Array) {
		this.connectOnce();
		//console.info('NetManager: send:', { type: type, port: port, to: mac2string(toMac), payload: Stream.fromUint8Array(data).toStringAll() });
		this.ws!.send(JSON.stringify({ type: type, port: port, to: mac2string(toMac), payload: Stream.fromUint8Array(data).toBase64() }));
	}
}