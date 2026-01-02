export class RollGenerator {
    private readonly queue: number[]

    constructor(queue?: number[]) {
        this.queue = [...(queue ?? [])]
    }

    roll(count: number = 2): number[] {
        const results: number[] = []

        for (let i = 0; i < count; i++) {
            if (this.queue.length > 0) {
                let next = Math.floor(this.queue.shift()!)
                next = ((next % 6) + 6) % 6
                if (next == 0) next += 6
                results.push(next)
            } else {
                results.push(Math.floor(Math.random() * 6) + 1)
            }
        }

        return results
    }

    addToQueue(numbers: number[]) {
        this.queue.push(...numbers)
    }
}
