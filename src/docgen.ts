///<reference path="../node_modules/@types/node/index.d.ts" />
///<reference path="../node_modules/@types/jsdom/ts3.5/index.d.ts" />

import * as fs from 'fs';
import { JSDOM } from 'jsdom';

(async () => {
    const text = await fs.readFileSync("./utils/psplibdoc_660.xml", 'utf-8')
    const dom = new JSDOM(text)
    const libs: any = {}
    for (const lib of dom.window.document.querySelectorAll("LIBRARY")) {
        const libName = lib.querySelector("NAME").textContent
        libs[libName] = {}
        //console.log(libName)
        for (const func of lib.querySelectorAll("FUNCTION")) {
            const nid = func.querySelector("NID").textContent
            const name = func.querySelector("NAME").textContent
            const defaultName = `${libName}_${nid.substr(2)}`
            if (name != defaultName) {
                libs[libName][nid] = name
                //console.log(name, defaultName)
            }
            //console.log("", nid, name)
        }
    }
    console.log(JSON.stringify(libs))
})()

