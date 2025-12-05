import { PriorityQueue } from "./priorityQueue"
import { describe, expect, it } from "vitest"

class PathWithCost {
    cost: number
    id: string

    constructor(id: string, cost: number) {
        this.cost = cost
        this.id = id
    }

    getTotalMovementCost(): number {
        return this.cost
    }
}

const comparison = (a: PathWithCost, b: PathWithCost) => {
    if (a.getTotalMovementCost() < b.getTotalMovementCost()) {
        return -1
    }
    if (a.getTotalMovementCost() > b.getTotalMovementCost()) {
        return 1
    }
    return 0
}

describe("Priority Queue", () => {
    it("knows when it is empty", () => {
        const pq = new PriorityQueue<PathWithCost>(comparison)
        expect(pq.isEmpty()).toBeTruthy()
        pq.enqueue(new PathWithCost("added first", 0))
        expect(pq.isEmpty()).toBeFalsy()
        pq.peek()
        expect(pq.isEmpty()).toBeFalsy()
        pq.dequeue()
        expect(pq.isEmpty()).toBeTruthy()
    })

    it("gets items in First In First Out order if the costs are the same", () => {
        const pq = new PriorityQueue<PathWithCost>(comparison)
        pq.enqueue(new PathWithCost("added first", 0))
        pq.enqueue(new PathWithCost("added second", 0))

        expect((pq.peek() as PathWithCost).id).toBe("added first")
        const retrievedFirst: PathWithCost = pq.dequeue() as PathWithCost
        expect(retrievedFirst.id).toBe("added first")

        expect((pq.peek() as PathWithCost).id).toBe("added second")
    })

    it("gets items with the least cost first", () => {
        const pq = new PriorityQueue<PathWithCost>(comparison)
        pq.enqueue(new PathWithCost("added first but higher cost", 1))
        pq.enqueue(new PathWithCost("added second but lower cost", 0))
        pq.enqueue(new PathWithCost("added third but same cost as second", 0))

        expect((pq.peek() as PathWithCost).id).toBe(
            "added second but lower cost"
        )
        pq.dequeue()
        expect((pq.peek() as PathWithCost).id).toBe(
            "added third but same cost as second"
        )
    })
})
