type int = number;

class BreakException {}

class NNode {
    //private static lastId = 0;
    //public id:int = NNode.lastId++;
    public parentBlock:NBlock;
    //public index:int;
    //public prev:NNode;
    //public next:NNode;
    type = 'node';
    //get index() { return this.block.nodes.indexOf(this); }
    get prev() { return this.parentBlock.getPrev(this); }
    get next() { return this.parentBlock.getNext(this); }
    public references:NNode[] = [];
    constructor() { }
    //toString() { return `NNode(${this.id},${this.index})`; }
}

class NSimpleNode extends NNode {
    type = 'simple';
    constructor(public text:string) { super(); }
}

/*
 class NSimpleBlockNode {
 public nodes:NNode[] = [];
 }
 */

class NJumpNode extends NNode {
    type = 'jump';
    private _jumpNode:NNode;
    constructor(public cond:string) { super(); }
    set jumpNode(node:NNode) {
        this._jumpNode = node;
        node.references.push(this);
    }
    get jumpNode() { return this._jumpNode; }
    createRange() {
        return NRange.create(this, this.jumpNode);
    }
    get isForwardReference() { return this.parentBlock.compareIndex(this.jumpNode, this) >= 0; }
}

class NRange {
    type = 'range';
    static create(a:NNode, b:NNode) {
        return (a.parentBlock.compareIndex(a, b) <= 0) ? new NRange(a, b) : new NRange(b, a);
    }
    constructor(public low:NNode, public high:NNode) {
        //assert(low.index <= high.index);
    }
    removeHead() { return new NRange(this.low.next, this.high); }
    removeTail() { return new NRange(this.low, this.high.prev); }
    contains(node:NNode) {
        return (node.parentBlock.compareIndex(node, this.low) >= 0) && (node.parentBlock.compareIndex(node, this.high) <= 0);
    }
    each(callback: (node:NNode) => void) {
        for (var node = this.low; node; node = node.next) {
            callback(node);
            if (node == this.high) break;
        }
    }
    internalReferencesCount() {
        var count = 0;
        this.each(node => {
            node.references.forEach(refnode => { if (this.contains(refnode)) count++; });
            if (node instanceof NJumpNode) { if (this.contains(node.jumpNode)) count++; }
        });
        return count;
    }
    externalReferencesCount() {
        var count = 0;
        this.each(node => {
            node.references.forEach(refnode => { if (!this.contains(refnode)) count++; });
            if (node instanceof NJumpNode) { if (!this.contains(node.jumpNode)) count++; }
        });
        return count;
    }
    createBlock() {
        var out = [];
        this.each(node => out.push(node));
        return new NBlock(out);
    }
    //get length() { return this.high.index - this.low.index + 1; }
    toString() { return `Range(${this.low}, ${this.high})`; }
}

class NBlock {
    type = 'block';
    private nodes:NNode[];

    constructor(nodes:NNode[] = []) {
        this.nodes = nodes;
        this.nodes.forEach(node => node.parentBlock = this);
    }
    clone() {
        return new NBlock(this.nodes.slice());
    }

    add<T extends NNode>(node:T):T {
        node.parentBlock = this;
        this.nodes.push(node);
        return node;
    }
    replaceRange(range:NRange, node:NNode) {
        var low = this.nodes.indexOf(range.low);
        var high = this.nodes.indexOf(range.high);
        this.nodes.splice(low, high - low + 1, node);
        node.parentBlock = this;
    }
    compareIndex(a:NNode, b:NNode) {
        var ai = this.nodes.indexOf(a);
        var bi = this.nodes.indexOf(b);
        if (ai < bi) return -1;
        if (ai > bi) return +1;
        return 0;
    }
    getIndex(node:NNode) {
        return this.nodes.indexOf(node);
    }
    getPrev(node:NNode) {
        return this.nodes[this.getIndex(node) - 1];
    }
    getNext(node:NNode) {
        return this.nodes[this.getIndex(node) + 1];
    }
    allRange() {
        return new NRange(this.nodes[0], this.nodes[this.nodes.length - 1]);
    }
}

class NDoWhileNode extends NNode {
    type = 'while';
    constructor(public insideBlock:NBlock, public cond:string) {
        super();
    }
}

class NDoIfNode extends NNode {
    type = 'if';
    constructor(public insideBlock:NBlock, public cond:string) {
        super();
    }
}

class NStateMachineNode extends NNode {
    type = 'stateMachine';
    constructor(public insideBlock:NBlock) {
        super();
    }
}

function dump(node:NNode | NRange | NBlock, indent:string = '') {
    if (node instanceof NBlock) {
        dump(node.allRange(), indent);
    } else if (node instanceof NRange) {
        node.each(n2 => dump(n2, indent))
    } else if (node instanceof NNode) {
        //console.log('' + node);
        if (node instanceof NSimpleNode) {
            console.log(indent + node.text + ';');
        } else if (node instanceof NJumpNode) {
            console.log(indent + 'jump_if:' + node.cond);
        } else if (node instanceof NDoWhileNode) {
            console.log(indent + 'do {');
            node.insideBlock.allRange().each(n2 => {
                dump(n2, indent + '  ');
            });
            console.log(indent + `} while (${node.cond});`);
        } else if (node instanceof NDoIfNode) {
            console.log(indent + `if (!(${node.cond})) {`);
            node.insideBlock.allRange().each(n2 => {
                dump(n2, indent + '  ');
            });
            console.log(indent + `}`);
        } else if (node instanceof NStateMachineNode) {
            console.log(indent + `while (true) {`);
            console.log(indent + `var state = 0;`);
            var stateIndex = 0;
            var link1 = new Map();
            node.insideBlock.allRange().each(n2 => {
                if (n2.references.length > 0) {
                    link1.set(n2, stateIndex++);
                }
            });
            console.log(indent + `switch (state) {`);
            node.insideBlock.allRange().each(n2 => {
                //console.log(n2);
                //console.log(n2.references);
                if (n2.references.length > 0) {
                    var stateIndex2 = link1.get(n2);
                    console.log(indent + `  case ${stateIndex2}:`);
                }
                if (n2 instanceof NJumpNode) {
                    var stateIndex2 = link1.get(n2.jumpNode);
                    console.log(indent + `    if (${n2.cond}) { state = ${stateIndex2}; break; }`);
                } else {
                    dump(n2, indent + '    ');
                }
            });
            console.log(indent + `}`);
        } else {
            console.log('?');
        }
    } else {
        console.log('??');
    }
}

function createNormalFlow(block:NBlock) {
    var external = 0;
    do {
        var count = 0;
        external = 0;
        block.allRange().each(node => {
            if (node instanceof NJumpNode) {
                var jumpRange = node.createRange();
                if (jumpRange.externalReferencesCount() == 0) {
                    //console.log('jump:' + jumpRange);
                    count++;
                    if (node.isForwardReference) {
                        var block1 = jumpRange.removeHead().removeTail().createBlock();
                        createNormalFlow(block1);
                        block.replaceRange(jumpRange.removeTail(), new NDoIfNode(block1, node.cond));
                    } else {
                        var block1 = jumpRange.removeTail().createBlock();
                        createNormalFlow(block1);
                        block.replaceRange(jumpRange, new NDoWhileNode(block1, node.cond));
                    }
                } else {
                    //console.log('jump:' + node + '. External references!');
                    external++;
                }
            }
        });
    } while (count != 0);
    if (external > 0) {
        block.replaceRange(block.allRange(), new NStateMachineNode(block.clone()));
        //console.log('external references!');
        //console.log(block);
    }
}

var list = new NBlock();
var n0 = list.add(new NSimpleNode('b = 0'));
var n1 = list.add(new NSimpleNode('a = 0'));
var n2 = list.add(new NSimpleNode('a++'));
list.add(new NSimpleNode(''));
var n3 = list.add(new NJumpNode('a < 10'));
var n4 = list.add(new NJumpNode('a != 10'));
var n5 = list.add(new NSimpleNode('print(a)'));
var n6 = list.add(new NSimpleNode('mm'));
var n7 = list.add(new NJumpNode('true'));
var n8 = list.add(new NSimpleNode('rr'));
n3.jumpNode = n2;
n4.jumpNode = n6;
n7.jumpNode = n2;

/*
 range.each(node => {
 console.log('' + node);
 });
 console.log(range.length);
 */
/*
 console.log(range.internalReferencesCount());
 console.log(range.externalReferencesCount());

 console.log('' + range);
 console.log('' + n3.createRange() + ',' + n3.jumpType);
 */


createNormalFlow(list);
/*
 console.log('-------------');
 console.log(list);
 */
dump(list);
