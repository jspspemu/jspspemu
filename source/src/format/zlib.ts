/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
'use strict';

var exported: any = {};
var l = exported;

function p(b: string, e: any) {
    var a = b.split(".");
    var c = l;
    !(a[0] in c) && c.execScript && c.execScript("var " + a[0]);
    for (var d: string; a.length && (d = a.shift());) !a.length && void 0 !== e ? c[d] = e : c = c[d] ? c[d] : c[d] = {}
}

function t(b: Uint32Array) {
    var e = b.length,
        a = 0,
        c = Number.POSITIVE_INFINITY,
        d: number, f: Uint32Array, g: number, h: number, k: number, m: number, r: number, n: number, s: number, J: number;
    for (n = 0; n < e; ++n) b[n] > a && (a = b[n]), b[n] < c && (c = b[n]);
    d = 1 << a;
    f = new Uint32Array(d);
    g = 1;
    h = 0;
    for (k = 2; g <= a;) {
        for (n = 0; n < e; ++n)
            if (b[n] === g) {
                m = 0;
                r = h;
                for (s = 0; s < g; ++s) m = m << 1 | r & 1, r >>= 1;
                J = g << 16 | n;
                for (s = m; s < d; s += k) f[s] = J;
                ++h
            } ++g;
        h <<= 1;
        k <<= 1
    }
    return [f, a, c]
};

function u(b: number, e: { index?: number, bufferSize?: number, bufferType?: number, resize?: number }) {
    this.g = [];
    this.h = 32768;
    this.c = this.f = this.d = this.k = 0;
    this.input = new Uint8Array(b);
    this.l = !1;
    this.i = v;
    this.q = !1;
    if (e || !(e = {})) e.index && (this.d = e.index), e.bufferSize && (this.h = e.bufferSize), e.bufferType && (this.i = e.bufferType), e.resize && (this.q = e.resize);
    switch (this.i) {
        case w:
            this.a = 32768;
            this.b = new Uint8Array(32768 + this.h + 258);
            break;
        case v:
            this.a = 0;
            this.b = new Uint8Array(this.h);
            this.e = this.v;
            this.m = this.s;
            this.j = this.t;
            break;
        default:
            throw Error("invalid inflate mode");
    }
}
var w = 0,
    v = 1;
u.prototype.u = function() {
    for (; !this.l;) {
        var b = x(this, 3);
        b & 1 && (this.l = !0);
        b >>>= 1;
        switch (b) {
            case 0:
                var e = this.input,
                    a = this.d,
                    c = this.b,
                    d = this.a,
                    f = e.length,
                    g: number = void 0,
                    h: number = void 0,
                    k = c.length,
                    m: number = void 0;
                this.c = this.f = 0;
                if (a + 1 >= f) throw Error("invalid uncompressed block header: LEN");
                g = e[a++] | e[a++] << 8;
                if (a + 1 >= f) throw Error("invalid uncompressed block header: NLEN");
                h = e[a++] | e[a++] << 8;
                if (g === ~h) throw Error("invalid uncompressed block header: length verify");
                if (a + g > e.length) throw Error("input buffer is broken");
                switch (this.i) {
                    case w:
                        for (; d +
                            g > c.length;) {
                            m = k - d;
                            g -= m;
                            c.set(e.subarray(a, a + m), d), d += m, a += m;
                            this.a = d;
                            c = this.e();
                            d = this.a
                        }
                        break;
                    case v:
                        for (; d + g > c.length;) c = this.e({
                            o: 2
                        });
                        break;
                    default:
                        throw Error("invalid inflate mode");
                }
                c.set(e.subarray(a, a + g), d), d += g, a += g;
                this.d = a;
                this.a = d;
                this.b = c;
                break;
            case 1:
                this.j(y, z);
                break;
            case 2:
                A(this);
                break;
            default:
                throw Error("unknown BTYPE: " + b);
        }
    }
    return this.m()
};
var B = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
    C = new Uint16Array(B),
    D = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 258, 258],
    E = new Uint16Array(D),
    F = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0],
    G = new Uint8Array(F),
    H = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
    I = new Uint16Array(H),
    K = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
        13
    ],
    L = new Uint8Array(K),
    M = new Uint8Array(288),
    N: number, O: number;
N = 0;
for (O = M.length; N < O; ++N) M[N] = 143 >= N ? 8 : 255 >= N ? 9 : 279 >= N ? 7 : 8;
var y = t(M),
    P = new Uint8Array(30),
    Q: number, R: number;
Q = 0;
for (R = P.length; Q < R; ++Q) P[Q] = 5;
var z = t(P);

interface CC { f: number, c: number, d: number, input: Int8Array }

function x(b: CC, e: number) {
    for (var a = b.f, c = b.c, d = b.input, f = b.d, g = d.length, h: number; c < e;) {
        if (f >= g) throw Error("input buffer is broken");
        a |= d[f++] << c;
        c += 8
    }
    h = a & (1 << e) - 1;
    b.f = a >>> e;
    b.c = c - e;
    b.d = f;
    return h
}

function S(b: CC, e: { 0: Int8Array, 1: number }) {
    for (var a = b.f, c = b.c, d = b.input, f = b.d, g = d.length, h = e[0], k = e[1], m: number, r: number; c < k && !(f >= g);) a |= d[f++] << c, c += 8;
    m = h[a & (1 << k) - 1];
    r = m >>> 16;
    b.f = a >> r;
    b.c = c - r;
    b.d = f;
    return m & 65535
}

function A(b:any) {
    function e(a:any, b:any, c:any) {
        var e:any, d = this.p,
            f:any, g:any;
        for (g = 0; g < a;) switch (e = S(this, b), e) {
            case 16:
                for (f = 3 + x(this, 2); f--;) c[g++] = d;
                break;
            case 17:
                for (f = 3 + x(this, 3); f--;) c[g++] = 0;
                d = 0;
                break;
            case 18:
                for (f = 11 + x(this, 7); f--;) c[g++] = 0;
                d = 0;
                break;
            default:
                d = c[g++] = e
        }
        this.p = d;
        return c
    }
    var a = x(b, 5) + 257,
        c = x(b, 5) + 1,
        d = x(b, 4) + 4,
        f = new Uint8Array(C.length),
        g:any, h:any, k:any, m:any;
    for (m = 0; m < d; ++m) f[C[m]] = x(b, 3);
    g = t(f);
    h = new Uint8Array(a);
    k = new Uint8Array(c);
    b.p = 0;
    b.j(t(e.call(b, a, g, h)), t(e.call(b, c, g, k)))
}
u.prototype.j = function(b:any, e:any) {
    var a = this.b,
        c = this.a;
    this.n = b;
    for (var d = a.length - 258, f:any, g:any, h:any, k:any; 256 !== (f = S(this, b));)
        if (256 > f) c >= d && (this.a = c, a = this.e(), c = this.a), a[c++] = f;
        else {
            g = f - 257;
            k = E[g];
            0 < G[g] && (k += x(this, G[g]));
            f = S(this, e);
            h = I[f];
            0 < L[f] && (h += x(this, L[f]));
            c >= d && (this.a = c, a = this.e(), c = this.a);
            for (; k--;) a[c] = a[c++ - h]
        }
    for (; 8 <= this.c;) this.c -= 8, this.d--;
    this.a = c
};
u.prototype.t = function(b:any, e:any) {
    var a = this.b,
        c = this.a;
    this.n = b;
    for (var d = a.length, f:any, g:any, h:any, k:any; 256 !== (f = S(this, b));)
        if (256 > f) c >= d && (a = this.e(), d = a.length), a[c++] = f;
        else {
            g = f - 257;
            k = E[g];
            0 < G[g] && (k += x(this, G[g]));
            f = S(this, e);
            h = I[f];
            0 < L[f] && (h += x(this, L[f]));
            c + k > d && (a = this.e(), d = a.length);
            for (; k--;) a[c] = a[c++ - h]
        }
    for (; 8 <= this.c;) this.c -= 8, this.d--;
    this.a = c
};
u.prototype.e = function() {
    var b = new Uint8Array(this.a - 32768),
        e = this.a - 32768,
        a:any, c:any, d = this.b;
    b.set(d.subarray(32768, b.length));
    this.g.push(b);
    this.k += b.length;
    d.set(d.subarray(e, e + 32768));
    this.a = 32768;
    return d
};
u.prototype.v = function(b:any) {
    var e:any, a = this.input.length / this.d + 1 | 0,
        c:any, d:any, f:any, g = this.input,
        h = this.b;
    b && ("number" === typeof b.o && (a = b.o), "number" === typeof b.r && (a += b.r));
    2 > a ? (c = (g.length - this.d) / this.n[2], f = 258 * (c / 2) | 0, d = f < h.length ? h.length + f : h.length << 1) : d = h.length * a;
    e = new Uint8Array(d); e.set(h);
    return this.b = e
};
u.prototype.m = function() {
    var b = 0,
        e = this.b,
        a = this.g,
        c:any, d = new Uint8Array(this.k + (this.a - 32768)),
        f:any, g:any, h:any, k:any;
    if (0 === a.length) return this.b.subarray(32768, this.a);
    f = 0;
    for (g = a.length; f < g; ++f) {
        c = a[f];
        h = 0;
        for (k = c.length; h < k; ++h) d[b++] = c[h]
    }
    f = 32768;
    for (g = this.a; f < g; ++f) d[b++] = e[f];
    this.g = [];
    return this.buffer = d
};
u.prototype.s = function() {
    var b: any, e = this.a;
    true ? this.q ? (b = new Uint8Array(e), b.set(this.b.subarray(0, e))) : b = this.b.subarray(0, e) : (this.b.length > e && (this.b.length = e), b = this.b);
    return this.buffer = b
};
p("Zlib.RawInflate", u);
p("Zlib.RawInflate.prototype.decompress", u.prototype.u);
var T: any = {
    ADAPTIVE: v,
    BLOCK: w
},
    U: any, V: any, W: any, X: any;
if (Object.keys) U = Object.keys(T);
else
    for (V in U = [], W = 0, T) U[W++] = V;
W = 0;
for (X = U.length; W < X; ++W) V = U[W], p("Zlib.RawInflate.BufferType." + V, T[V]);

export function inflate_raw(data: Uint8Array): Uint8Array {
    var clazz = exported.Zlib.RawInflate;
    var inflate = new clazz(data);
    return inflate.decompress();
}

export function inflate_raw_arraybuffer(data: ArrayBuffer): ArrayBuffer {
    return inflate_raw(new Uint8Array(data)).buffer;
}