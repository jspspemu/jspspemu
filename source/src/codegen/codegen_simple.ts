class NNode {

}

class NLabelNode extends NNode {
    tempId: number;
    constructor(public name:string) { super(); }
}

class NSimpleNode extends NNode {
    constructor(public text:string) { super(); }
}

class NJumpNode extends NNode {
    constructor(public label:NLabelNode, public cond:string) {
        super();
    }
}

class NBlock {
    nodes:NNode[] = [];

    public constructor() { }

    add(node:NNode) {
        this.nodes.push(node);
    }

    gen(uid:number) {
        var lines = [];
        lines.push('var state' + uid + ' = 0;');
        lines.push('next_state' + uid + ': while (true) {');
        lines.push('switch (state' + uid + ') {');
        var stateIndex = 1;
        this.nodes.filter(node => node instanceof NLabelNode).forEach((node:NLabelNode) => {
            node.tempId = stateIndex++;
        });
        lines.push('case 0:');
        this.nodes.forEach(node => {
            if (node instanceof NLabelNode) {
                lines.push('case ' + node.tempId + ':');
            } else if (node instanceof NSimpleNode) {
                lines.push('  ' + node.text + ';');
            } else if (node instanceof NJumpNode) {
                lines.push('  if (' + node.cond + ') { state' + uid + ' = ' + node.label.tempId + '; continue next_state' + uid + '; }');
            }
        });
        lines.push('  break next_state' + uid + ';');
        lines.push('}');
        lines.push('}');
        return lines.join('\n');
    }
}

var block = new NBlock();
var label1:NLabelNode;
block.add(new NSimpleNode('var a = 0'));
block.add(label1 = new NLabelNode('l1'));
block.add(new NSimpleNode('a++'));
block.add(new NJumpNode(label1, 'a < 100000000'));
block.add(new NSimpleNode('return a'));
console.log(block.gen(0));
var func = new Function(block.gen(0));
console.log(func());