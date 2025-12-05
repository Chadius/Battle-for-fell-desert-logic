export class PriorityQueue<T> {
    items: T[]
    comparison: (a: T, b: T) => number

    constructor(comparison: (a: T, b: T) => number) {
        this.items = []
        this.comparison = comparison
    }

    isEmpty(): boolean {
        return this.items.length < 1
    }

    enqueue(item: T): void {
        this.items.push(item)
        this.items.sort(this.comparison)
    }

    peek(): T | undefined {
        if (this.items.length > 0) {
            return this.items[0]
        }
        return undefined
    }

    dequeue(): T | undefined {
        const next: T | undefined = this.peek()
        if (this.items.length > 0) {
            this.items.shift()
        }
        return next
    }
}
