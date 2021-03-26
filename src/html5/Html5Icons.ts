import {Stream} from "../global/stream";

export function changeFavicon(src: string) {
    if (typeof document == 'undefined') return;
    const link = document.createElement('link')
    const oldLink = document.getElementById('dynamic-favicon');
    link.id = 'dynamic-favicon';
    link.rel = 'shortcut icon';
    link.href = src;
    if (oldLink) {
        document.head.removeChild(oldLink);
    }
    document.head.appendChild(link);
}

export class Html5Icons {
    static setPic0(data: Uint8Array) {
        changeFavicon(Stream.fromUint8Array(data).toImageUrl());
    }
    static setPic1(data: Uint8Array) {
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundImage = `url("${Stream.fromUint8Array(data).toImageUrl()}")`;
    }
}