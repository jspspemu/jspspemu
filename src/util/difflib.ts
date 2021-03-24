/***
 This is part of jsdifflib v1.0. <http://snowtide.com/jsdifflib>

 Copyright (c) 2007, Snowtide Informatics Systems, Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of the Snowtide Informatics Systems nor the names of its
 contributors may be used to endorse or promote products derived from this
 software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
 BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 DAMAGE.
 ***/
/* Author: Chas Emerick <cemerick@snowtide.com> */
const __whitespace = {" ": true, "\t": true, "\n": true, "\f": true, "\r": true};

// @ts-ignore
export const difflib = {
    defaultJunkFunction: function (c:string) {
        return __whitespace.hasOwnProperty(c);
    },

    stripLinebreaks: function (str:string) { return str.replace(/^[\n\r]*|[\n\r]*$/g, ""); },

    stringAsLines: function (str:string) {
        const lfpos = str.indexOf("\n");
        const crpos = str.indexOf("\r");
        const linebreak = ((lfpos > -1 && crpos > -1) || crpos < 0) ? "\n" : "\r";

        const lines = str.split(linebreak);
        for (let i = 0; i < lines.length; i++) {
            lines[i] = difflib.stripLinebreaks(lines[i]);
        }

        return lines;
    },

    // iteration-based reduce implementation
    __reduce: function (func:any, list:any[], initial:any) {
        let value
        let idx
        if (initial != null) {
            value = initial;
            idx = 0;
        } else if (list) {
            value = list[0];
            idx = 1;
        } else {
            return null;
        }

        for (; idx < list.length; idx++) {
            value = func(value, list[idx]);
        }

        return value;
    },

    // comparison function for sorting lists of numeric tuples
    __ntuplecomp: function (a:any, b:any) {
        const mlen = Math.max(a.length, b.length);
        for (let i = 0; i < mlen; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }

        return a.length == b.length ? 0 : (a.length < b.length ? -1 : 1);
    },

    __calculate_ratio: function (matches:number, length:number) {
        return length ? 2.0 * matches / length : 1.0;
    },

    // returns a function that returns true if a key passed to the returned function
    // is in the dict (js object) provided to this function; replaces being able to
    // carry around dict.has_key in python...
    __isindict: function (dict:any) {
        return function (key:string) { return dict.hasOwnProperty(key); };
    },

    // replacement for python's dict.get function -- need easy default values
    __dictget: function (dict:any, key:any, defaultValue:any) {
        return dict.hasOwnProperty(key) ? dict[key] : defaultValue;
    },

    SequenceMatcher: function (a:any, b:any, isjunk:any = undefined) {
        // @ts-ignore
        this.set_seqs = function (a:any, b:any) {
            // @ts-ignore
            this.set_seq1(a);
            // @ts-ignore
            this.set_seq2(b);
        }

        // @ts-ignore
        this.set_seq1 = function (a:any) {
            // @ts-ignore
            if (a == this.a) return;
            // @ts-ignore
            this.a = a;
            // @ts-ignore
            this.matching_blocks = this.opcodes = null;
        }

        // @ts-ignore
        this.set_seq2 = function (b:any) {
            // @ts-ignore
            if (b == this.b) return;
            // @ts-ignore
            this.b = b;
            // @ts-ignore
            this.matching_blocks = this.opcodes = this.fullbcount = null;
            // @ts-ignore
            this.__chain_b();
        }

        // @ts-ignore
        this.__chain_b = function () {
            // @ts-ignore
            const b = this.b;
            const n = b.length;
            // @ts-ignore
            const b2j: any = this.b2j = {};
            const populardict: any = {};
            for (let i = 0; i < b.length; i++) {
                const elt = b[i];
                if (b2j.hasOwnProperty(elt)) {
                    const indices = b2j[elt];
                    if (n >= 200 && indices.length * 100 > n) {
                        populardict[elt] = 1;
                        delete b2j[elt];
                    } else {
                        indices.push(i);
                    }
                } else {
                    b2j[elt] = [i];
                }
            }

            for (let elt in populardict) {
                if (populardict.hasOwnProperty(elt)) {
                    delete b2j[elt];
                }
            }

            // @ts-ignore
            const isjunk = this.isjunk;
            const junkdict: any = {};
            if (isjunk) {
                for (let elt in populardict) {
                    if (populardict.hasOwnProperty(elt) && isjunk(elt)) {
                        junkdict[elt] = 1;
                        delete populardict[elt];
                    }
                }
                for (let elt in b2j) {
                    if (b2j.hasOwnProperty(elt) && isjunk(elt)) {
                        junkdict[elt] = 1;
                        delete b2j[elt];
                    }
                }
            }

            // @ts-ignore
            this.isbjunk = difflib.__isindict(junkdict);
            // @ts-ignore
            this.isbpopular = difflib.__isindict(populardict);
        }

        // @ts-ignore
        this.find_longest_match = function (alo:any, ahi:any, blo:any, bhi:any) {
            // @ts-ignore
            const a = this.a;
            // @ts-ignore
            const b = this.b;
            // @ts-ignore
            const b2j = this.b2j;
            // @ts-ignore
            const isbjunk = this.isbjunk;
            let besti = alo;
            let bestj = blo;
            let bestsize = 0;
            let j: any = null;
            let k: any;

            let j2len = {};
            const nothing: any[] = [];
            for (let i = alo; i < ahi; i++) {
                const newj2len: any = {};
                const jdict = difflib.__dictget(b2j, a[i], nothing);
                for (const jkey in jdict) {
                    if (jdict.hasOwnProperty(jkey)) {
                        j = jdict[jkey];
                        if (j < blo) continue;
                        if (j >= bhi) break;
                        newj2len[j] = k = difflib.__dictget(j2len, j - 1, 0) + 1;
                        if (k > bestsize) {
                            besti = i - k + 1;
                            bestj = j - k + 1;
                            bestsize = k;
                        }
                    }
                }
                j2len = newj2len;
            }

            while (besti > alo && bestj > blo && !isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
                besti--;
                bestj--;
                bestsize++;
            }

            while (besti + bestsize < ahi && bestj + bestsize < bhi &&
            !isbjunk(b[bestj + bestsize]) &&
            a[besti + bestsize] == b[bestj + bestsize]) {
                bestsize++;
            }

            while (besti > alo && bestj > blo && isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
                besti--;
                bestj--;
                bestsize++;
            }

            while (besti + bestsize < ahi && bestj + bestsize < bhi && isbjunk(b[bestj + bestsize]) &&
            a[besti + bestsize] == b[bestj + bestsize]) {
                bestsize++;
            }

            return [besti, bestj, bestsize];
        }

        // @ts-ignore
        this.get_matching_blocks = function () {
            // @ts-ignore
            if (this.matching_blocks != null) return this.matching_blocks;
            // @ts-ignore
            const la = this.a.length;
            // @ts-ignore
            const lb = this.b.length;

            const queue = [[0, la, 0, lb]];
            const matching_blocks: any[] = [];
            let alo: any, ahi: any, blo: any, bhi: any, qi: any, i: any, j: any, k: any, x: any;
            while (queue.length) {
                qi = queue.pop();
                alo = qi[0];
                ahi = qi[1];
                blo = qi[2];
                bhi = qi[3];
                // @ts-ignore
                x = this.find_longest_match(alo, ahi, blo, bhi);
                i = x[0];
                j = x[1];
                k = x[2];

                if (k) {
                    matching_blocks.push(x);
                    if (alo < i && blo < j)
                        queue.push([alo, i, blo, j]);
                    if (i+k < ahi && j+k < bhi)
                        queue.push([i + k, ahi, j + k, bhi]);
                }
            }

            matching_blocks.sort(difflib.__ntuplecomp);

            let i1 = 0, j1 = 0, k1 = 0;
            let block: any[] = [];
            let i2: any, j2: any, k2: any;
            const non_adjacent: any = [];
            for (const idx in matching_blocks) {
                if (matching_blocks.hasOwnProperty(idx)) {
                    block = matching_blocks[idx];
                    i2 = block[0];
                    j2 = block[1];
                    k2 = block[2];
                    if (i1 + k1 == i2 && j1 + k1 == j2) {
                        k1 += k2;
                    } else {
                        if (k1) non_adjacent.push([i1, j1, k1]);
                        i1 = i2;
                        j1 = j2;
                        k1 = k2;
                    }
                }
            }

            if (k1) non_adjacent.push([i1, j1, k1]);

            non_adjacent.push([la, lb, 0]);
            // @ts-ignore
            this.matching_blocks = non_adjacent;
            // @ts-ignore
            return this.matching_blocks;
        }

        // @ts-ignore
        this.get_opcodes = function () {
            // @ts-ignore
            if (this.opcodes != null) return this.opcodes;
            let i = 0;
            let j = 0;
            const answer: any[] = [];
            // @ts-ignore
            this.opcodes = answer;
            let block: any, ai: any, bj: any, size: any, tag: any;
            // @ts-ignore
            const blocks = this.get_matching_blocks();
            for (const idx in blocks) {
                if (blocks.hasOwnProperty(idx)) {
                    block = blocks[idx];
                    ai = block[0];
                    bj = block[1];
                    size = block[2];
                    tag = '';
                    if (i < ai && j < bj) {
                        tag = 'replace';
                    } else if (i < ai) {
                        tag = 'delete';
                    } else if (j < bj) {
                        tag = 'insert';
                    }
                    if (tag) answer.push([tag, i, ai, j, bj]);
                    i = ai + size;
                    j = bj + size;

                    if (size) answer.push(['equal', ai, i, bj, j]);
                }
            }

            return answer;
        }

        // this is a generator function in the python lib, which of course is not supported in javascript
        // the reimplementation builds up the grouped opcodes into a list in their entirety and returns that.
        // @ts-ignore
        this.get_grouped_opcodes = function (n:any) {
            if (!n) n = 3;
            // @ts-ignore
            let codes = this.get_opcodes();
            if (!codes) codes = [["equal", 0, 1, 0, 1]];
            let code: any, tag: any, i1: any, i2: any, j1: any, j2: any;
            if (codes[0][0] == 'equal') {
                code = codes[0];
                tag = code[0];
                i1 = code[1];
                i2 = code[2];
                j1 = code[3];
                j2 = code[4];
                codes[0] = [tag, Math.max(i1, i2 - n), i2, Math.max(j1, j2 - n), j2];
            }
            if (codes[codes.length - 1][0] == 'equal') {
                code = codes[codes.length - 1];
                tag = code[0];
                i1 = code[1];
                i2 = code[2];
                j1 = code[3];
                j2 = code[4];
                codes[codes.length - 1] = [tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)];
            }

            const nn = n + n;
            let group: any[] = [];
            const groups: any[] = [];
            for (const idx in codes) {
                if (codes.hasOwnProperty(idx)) {
                    code = codes[idx];
                    tag = code[0];
                    i1 = code[1];
                    i2 = code[2];
                    j1 = code[3];
                    j2 = code[4];
                    if (tag == 'equal' && i2 - i1 > nn) {
                        group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
                        groups.push(group);
                        group = [];
                        i1 = Math.max(i1, i2-n);
                        j1 = Math.max(j1, j2-n);
                    }

                    group.push([tag, i1, i2, j1, j2]);
                }
            }

            if (group && !(group.length == 1 && group[0][0] == 'equal')) groups.push(group)

            return groups;
        };

        // @ts-ignore
        this.ratio = function () {
            const matches = difflib.__reduce(
                function (sum:any, triple:any) { return sum + triple[triple.length - 1]; },
                // @ts-ignore
                this.get_matching_blocks(), 0);
            // @ts-ignore
            return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
        };

        // @ts-ignore
        this.quick_ratio = function () {
            let fullbcount: any, elt: any;
            // @ts-ignore
            if (this.fullbcount == null) {
                // @ts-ignore
                this.fullbcount = fullbcount = {};
                // @ts-ignore
                for (let i = 0; i < this.b.length; i++) {
                    // @ts-ignore
                    elt = this.b[i];
                    fullbcount[elt] = difflib.__dictget(fullbcount, elt, 0) + 1;
                }
            }
            // @ts-ignore
            fullbcount = this.fullbcount;

            const avail: any = {};
            const availhas = difflib.__isindict(avail);
            let matches = 0;
            let numb: any = 0;
            // @ts-ignore
            for (let i = 0; i < this.a.length; i++) {
                // @ts-ignore
                elt = this.a[i];
                if (availhas(elt)) {
                    numb = avail[elt];
                } else {
                    numb = difflib.__dictget(fullbcount, elt, 0);
                }
                avail[elt] = numb - 1;
                if (numb > 0) matches++;
            }

            // @ts-ignore
            return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
        };

        /*
        this.real_quick_ratio = function () {
            let la = this.a.length;
            let lb = this.b.length;

            return difflib._calculate_ratio(Math.min(la, lb), la + lb);
        };
        */

        // @ts-ignore
        this.isjunk = isjunk ? isjunk : difflib.defaultJunkFunction;
        // @ts-ignore
        this.a = this.b = null;
        // @ts-ignore
        this.set_seqs(a, b);
    }
};
