export class PathInfo {
    constructor(public fullPath: string) {
    }

    get parent() {
        const lastIndex = this.fullPath.lastIndexOf('/')
        return (lastIndex >= 0) ? new PathInfo(this.fullPath.substr(0, lastIndex)) : null
    }

    get baseName() {
        const lastIndex = this.fullPath.lastIndexOf('/')
        return (lastIndex >= 0) ? this.fullPath.substr(lastIndex + 1) : this.fullPath
    }
}