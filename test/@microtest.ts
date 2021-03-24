class TestContext {
    testCount: number = 0
    testFailed: number = 0
    exceptions: string[] = []
    get testSuccessful() { return this.testCount - this.testFailed }
}

class ItNode {
    constructor(public node: TestNode, public name: string, public func: () => any) {
    }

    async exec(context: TestContext, level: number = 0) {
        context.testCount++
        const start = performance.now()
        function elapsed() {
            const end = performance.now()
            return end - start
        }
        let error = undefined
        try {
            await this.func()
        } catch (e) {
            error = e
            context.testFailed++
        }
        const params = []
        params.push(" ".repeat(level))
        params.push(!error ? "✅ " : "❌ ")
        params.push(this.name)
        const time = elapsed()
        if (time > 100) {
            params.push(time)
            params.push('ms')
        }
        console.log(...params)
        if (error) {
            const exception = (error.stack || error).toString().replace(/.*at.*@microtest\.ts.*/gm, '###').replace(/###(\n|$)/g, '')
            context.exceptions.push(exception)
            console.error(exception)
        }
    }
}

class TestNode {
    children: TestNode[] = []
    before: ItNode[] = []
    after: ItNode[] = []
    its: ItNode[] = []
    _timeout?: number = undefined

    timeout(value: number) {
        this._timeout = value
    }

    getTimeout(): number {
        return this._timeout ?? this.parent?.getTimeout() ?? 10000
    }

    constructor(public name: string, public parent?: TestNode) {
        parent?.children?.push(this)
    }

    async exec(context: TestContext, level: number = 0) {
        const timeout = this.getTimeout()
        console.log(" ".repeat(level), this.name)
        for (const before of this.before) {
            await before.exec(context, level + 1)
        }
        for (const it of this.its) {
            await it.exec(context, level + 1)
        }
        for (const after of this.before) {
            await after.exec(context, level + 1)
        }
        for (const child of this.children) {
            await child.exec(context, level + 1)
        }
    }
}

const rootTestNode = new TestNode("")
let currentTestNode = rootTestNode

export function describe(name: string, func: () => any) {
    const old = currentTestNode
    try {
        currentTestNode = new TestNode(name, currentTestNode)
        func.bind(currentTestNode)()
    } finally {
        currentTestNode = old
    }
}

export function before(func: () => any) {
    currentTestNode.before.push(new ItNode(currentTestNode, "", func))
}

export function after(func: () => any) {
    currentTestNode.after.push(new ItNode(currentTestNode, "", func))
}

export function it(name: string, func: () => any) {
    currentTestNode.its.push(new ItNode(currentTestNode, name, func))
}

export class assert {
    static ok(value: any, message: string = `${value} is not true`) {
        if (!value) {
            throw new Error(message)
        }
    }
    static equal(a: any, b: any, message: string = `Expected ${a} == ${b}`) {
        this.ok(a == b, message)
    }
    static notEqual(a: any, b: any, message: string = `Expected ${a} != ${b}`) {
        this.ok(a != b, message)
    }
    static fail(value: any, message: string = `${value} is not false`) {
        this.ok(!value, message)
    }
    static async catchExceptionAsync(block: () => any): Promise<Error | any> {
        try {
            await block()
        } catch (e) {
            return e
        }
        throw new Error("Expected throw not nothing was thrown")
    }
}

setTimeout(async () => {
    const context = new TestContext()
    try {
        await rootTestNode.exec(context)
    } catch (e) {
        console.error(e)
    }
    console.log("Successful tests", context.testSuccessful, "/", context.testCount)

    for (const exception of context.exceptions) {
        console.error(exception)
    }

    console.log("Failed tests", context.testFailed)

    if (context.testFailed) {
        process.exit(-1)
    }
}, 0)
