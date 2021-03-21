export async function catchExceptionAsync(block: () => any): Promise<Error | any> {
    try {
        await block()
    } catch (e) {
        return e
    }
    throw new Error("Expected throw not nothing was thrown")
}