declare const global: any;

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

export function ref() {
}
