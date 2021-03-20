
declare var global: any;

if (typeof global === 'undefined') {
    (window as any).global = window
}
if (typeof window === 'undefined') {
    (global as any).window = global
}
if (typeof self == 'undefined') {
    global.self = global
}
if (typeof navigator == 'undefined') {
    global.navigator = <any>{};
}

import "./global/utils"
import "./global/array"
import "./global/async"
import "./global/int64"
import "./global/math"
import "./global/me"
import "./global/stream"
import "./global/struct"

export function globalReferenced() {
    return true;
}
