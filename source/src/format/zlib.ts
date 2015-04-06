class HuffmanNode {
    get isLeaf() { return this.len != 0; }
    constructor(public value:number, public len:number, public left:HuffmanNode, public right:HuffmanNode) { }
    static leaf(value:number, len:number) { return new HuffmanNode(value, len, null, null); }
    static internal(left:HuffmanNode, right:HuffmanNode) { return new HuffmanNode(-1, 0, left, right); }
}

class ArrayBitReader implements BitReader {
    offset = 0;
    bitdata = 0;
    bitsavailable = 0;

    constructor(public data:Uint8Array) {
    }

    alignbyte() {
        this.bitsavailable = 0;
    }

    get length() { return this.data.length; }
    get available() { return this.length - this.offset; }

    u8() { return this.data[this.offset++]; }
    u16() { return this.u8() | (this.u8() << 8); }

    readBits(bitcount:number):number {
        while (bitcount > this.bitsavailable) {
            this.bitdata |= this.u8() << this.bitsavailable;
            this.bitsavailable += 8;
        }
        var readed = BitUtils.extract(this.bitdata, 0, bitcount);
        this.bitdata >>>= bitcount;
        this.bitsavailable -= bitcount;
        return readed;
    }
}

interface BitReader {
    readBits(count:number):number;
    alignbyte():void;
    u8():number;
    u16():number;
    available:number;
}

class HuffmanTree {
    constructor(public root:HuffmanNode, public symbolLimit:number) {
    }

    readOne(reader:BitReader) {
        //console.log('-------------');
        var node = this.root;
        var bitcount = 0;
        var bitcode = 0;
        do {
            var bbit = reader.readBits(1);
            var bit = (bbit != 0);
            bitcode |= bbit << bitcount;
            bitcount++;
            //console.log('bit', bit);
            node = bit ? node.right : node.left;
            //console.info(node);
        } while (node && node.len == 0);
        if (!node) throw new Error("NODE = NULL");
        return {value: node.value, bitcode: bitcode, bitcount: bitcount};
    }

    readOneValue(reader:BitReader) {
        //console.log('-------------');
        var node = this.root;
        var bitcount = 0;
        var bitcode = 0;
        do {
            var bbit = reader.readBits(1);
            var bit = (bbit != 0);
            bitcode |= bbit << bitcount;
            bitcount++;
            //console.log('bit', bit);
            node = bit ? node.right : node.left;
            //console.info(node);
        } while (node && node.len == 0);
        if (!node) throw new Error("NODE = NULL");
        return node.value;
    }

    static fromLengths(codeLengths:number[]) {
        var nodes:HuffmanNode[] = [];
        for (var i = Math.max.apply(null, codeLengths); i >= 1; i--) {  // Descend through positive code lengths
            var newNodes:HuffmanNode[] = [];

            // Add leaves for symbols with code length i
            for (var j = 0; j < codeLengths.length; j++) {
                if (codeLengths[j] == i) newNodes.push(HuffmanNode.leaf(j, i));
            }

            // Merge nodes from the previous deeper layer
            for (var j = 0; j < nodes.length; j += 2) {
                newNodes.push(HuffmanNode.internal(nodes[j], nodes[j + 1]));
            }

            nodes = newNodes;
            if (nodes.length % 2 != 0) throw new Error("This canonical code does not represent a Huffman code tree");
        }

        if (nodes.length != 2) throw new Error("This canonical code does not represent a Huffman code tree");

        return new HuffmanTree(HuffmanNode.internal(nodes[0], nodes[1]), codeLengths.length);

    }
}

export class Inflater {
    static fixedtree:HuffmanTree;
    static fixeddist:HuffmanTree;
    static infos_lz = {
        257: { extra: 0, offset: 3 },
        258: { extra: 0, offset: 4 },
        259: { extra: 0, offset: 5 },
        260: { extra: 0, offset: 6 },
        261: { extra: 0, offset: 7 },
        262: { extra: 0, offset: 8 },
        263: { extra: 0, offset: 9 },
        264: { extra: 0, offset: 10 },
        265: { extra: 1, offset: 11 },
        266: { extra: 1, offset: 13 },
        267: { extra: 1, offset: 15 },
        268: { extra: 1, offset: 17 },
        269: { extra: 2, offset: 19 },
        270: { extra: 2, offset: 23 },
        271: { extra: 2, offset: 27 },
        272: { extra: 2, offset: 31 },
        273: { extra: 3, offset: 35 },
        274: { extra: 3, offset: 43 },
        275: { extra: 3, offset: 51 },
        276: { extra: 3, offset: 59 },
        277: { extra: 4, offset: 67 },
        278: { extra: 4, offset: 83 },
        279: { extra: 4, offset: 99 },
        280: { extra: 4, offset: 115 },
        281: { extra: 5, offset: 131 },
        282: { extra: 5, offset: 163 },
        283: { extra: 5, offset: 195 },
        284: { extra: 5, offset: 227 },
        285: { extra: 0, offset: 258 }
    };
    static infos_lz2 = {
        0: { extra: 0, offset: 1 },
        1: { extra: 0, offset: 2 },
        2: { extra: 0, offset: 3 },
        3: { extra: 0, offset: 4 },
        4: { extra: 1, offset: 5 },
        5: { extra: 1, offset: 7 },
        6: { extra: 2, offset: 9 },
        7: { extra: 2, offset: 13 },
        8: { extra: 3, offset: 17 },
        9: { extra: 3, offset: 25 },
        10: { extra: 4, offset: 33 },
        11: { extra: 4, offset: 49 },
        12: { extra: 5, offset: 65 },
        13: { extra: 5, offset: 97 },
        14: { extra: 6, offset: 129 },
        15: { extra: 6, offset: 193 },
        16: { extra: 7, offset: 257 },
        17: { extra: 7, offset: 385 },
        18: { extra: 8, offset: 513 },
        19: { extra: 8, offset: 769 },
        20: { extra: 9, offset: 1025 },
        21: { extra: 9, offset: 1537 },
        22: { extra: 10, offset: 2049 },
        23: { extra: 10, offset: 3073 },
        24: { extra: 11, offset: 4097 },
        25: { extra: 11, offset: 6145 },
        26: { extra: 12, offset: 8193 },
        27: { extra: 12, offset: 12289 },
        28: { extra: 13, offset: 16385 },
        29: { extra: 13, offset: 24577 }
    };
    static HCLENPOS = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    static inflateZlib(data:Uint8Array) {
        return this.inflateZlibBitReader(new ArrayBitReader(data));
    }

    static inflateRaw(data:Uint8Array) {
        return this.inflateRawBitReader(new ArrayBitReader(data));
    }

    static inflateRawArrayBuffer(data:ArrayBuffer):ArrayBuffer {
        return Inflater.inflateRaw(new Uint8Array(data)).buffer;
    }

    static inflateZlibBitReader(reader:BitReader) {
        var compressionMethod = reader.readBits(4);
        if (compressionMethod != 8) throw new Error("Invalid zlib stream");
        var windowSize = 1 << (reader.readBits(4) + 8);
        var fcheck = reader.readBits(5);
        var hasDict = reader.readBits(1);
        var flevel = reader.readBits(2);
        if (hasDict) throw new Error("Not implemented HAS DICT");
        this.inflateRawBitReader(reader);
    }

    static inflateRawBitReader(reader:BitReader) {
        // https://www.ietf.org/rfc/rfc1951.txt
        if (!Inflater.fixedtree) {
            var lengths0 = new Array(287);
            for (var n = 0; n <= 143; n++) lengths0[n] = 8;
            for (var n = 144; n <= 255; n++) lengths0[n] = 9;
            for (var n = 256; n <= 279; n++) lengths0[n] = 7;
            for (var n = 280; n <= 287; n++) lengths0[n] = 8;
            Inflater.fixedtree = HuffmanTree.fromLengths(lengths0);
            Inflater.fixeddist = HuffmanTree.fromLengths(Array.apply(null, new Array(32)).map(Number.prototype.valueOf, 5));
        }
        var fixedtree = Inflater.fixedtree;
        var fixeddist = Inflater.fixeddist;
        var infos_lz = Inflater.infos_lz;
        var infos_lz2 = Inflater.infos_lz2;
        var out = [];
        var lastBlock = false;
        while (!lastBlock) {
            lastBlock = reader.readBits(1) != 0;
            var btype = reader.readBits(2);
            console.log(lastBlock);
            console.log(btype);
            switch (btype) {
                case 0:
                    reader.alignbyte();
                    var len = reader.u16();
                    var nlen = reader.u16();
                    if (len != ~nlen) throw new Error("Invalid file: len != ~nlen");
                    for (var n = 0; n < len; n++) out.push(reader.u8() | 0);
                    break;
                case 1:
                case 2:
                    if (btype == 1) {
                        var tree = fixedtree;
                        var dist = fixeddist;
                    } else {
                        var HCLENPOS = Inflater.HCLENPOS;
                        var HLIT = reader.readBits(5) + 257; // hlit  + 257
                        var HDIST = reader.readBits(5) + 1; // hdist +   1
                        var HCLEN = reader.readBits(4) + 4; // hclen +   4

                        var codeLenCodeLen = Array.apply(null, new Array(19)).map(function (v, n) {
                            return 0;
                        });
                        for (var i = 0; i < HCLEN; i++) codeLenCodeLen[HCLENPOS[i]] = reader.readBits(3);
                        //console.info(codeLenCodeLen);
                        var codeLen = HuffmanTree.fromLengths(codeLenCodeLen);
                        var lengths = Array.apply(null, new Array(HLIT + HDIST));
                        var n = 0;
                        for (; n < HLIT + HDIST;) {
                            var value = codeLen.readOneValue(reader);
                            var len = 1;
                            if (value < 16) {
                                len = 1;
                            } else if (value == 16) {
                                value = lengths[n - 1];
                                len = reader.readBits(2) + 3;
                            } else if (value == 17) {
                                value = 0;
                                len = reader.readBits(3) + 3;
                            } else if (value == 18) {
                                value = 0;
                                len = reader.readBits(7) + 11;
                            } else {
                                throw new Error("Invalid");
                            }
                            for (var c = 0; c < len; c++) lengths[n++] = value;
                        }
                        tree = HuffmanTree.fromLengths(lengths.slice(0, HLIT));
                        dist = HuffmanTree.fromLengths(lengths.slice(HLIT, lengths.length));
                    }
                    var completed = false;
                    while (!completed && reader.available > 0) {
                        var value = tree.readOneValue(reader);
                        if (value < 256) {
                            out.push(value | 0);
                        } else if (value == 256) {
                            completed = true;
                        } else {
                            var lengthInfo = infos_lz[value];
                            var lengthExtra = reader.readBits(lengthInfo.extra);
                            var length = lengthInfo.offset + lengthExtra;

                            var distanceData = dist.readOneValue(reader);
                            var distanceInfo = infos_lz2[distanceData];
                            var distanceExtra = reader.readBits(distanceInfo.extra);
                            var distance = distanceInfo.offset + distanceExtra;

                            for (var n = 0; n < length; n++) out.push(out[out.length - distance] | 0);
                        }
                    }
                    break;
                case 3:
                    throw new Error("invalid bit");
                    break;
            }
        }
        return new Uint8Array(out);
    }
}
