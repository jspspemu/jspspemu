//import * as advancedrelooper from './advancedrelooper';

import {SimpleRelooper} from "./simplerelooper";

interface IBlock {
}

interface IRelooper {
	addBlock(code:string):IBlock;
	addBranch(from:IBlock, to:IBlock, cond?:string, onjumpcode?:string):void;
}

export function processAdvance(callback: (r:IRelooper) => void):string {
	//var sr = new simplerelooper.SimpleRelooper();
	throw new Error("Not implemented relooper advanced");
}

export function processSimple(callback: (r:IRelooper) => void):string {
	var sr = new SimpleRelooper();
	sr.init();
	try {
		callback(sr);
		return sr.render(sr.blocks[0]);
	} finally {
		sr.cleanup();	
	}
}

export function processType(type:string, callback: (r:IRelooper) => void):string {
	switch (type) {
		case 'simple': return processSimple(callback);
		case 'advanced':  return processAdvance(callback);
		default: throw new Error(`Invalid relooper process type ${type}`);
	}
	//var sr = new simplerelooper.SimpleRelooper();
	
}

export function process(callback: (r:IRelooper) => void):string {
	//var sr = new simplerelooper.SimpleRelooper();
	return processSimple(callback);
}