import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieCondition,
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
    type TSquaddieConditionSource,
    type TSquaddieConditionType,
} from "./squaddieCondition.js"
import {
    type SquaddieConditionTotal,
    type StackedSquaddieCondition,
    SquaddieConditionTotalService,
} from "./squaddieConditionTotal.js"

const newCondition = ({
    type,
    amount,
    turns,
    source,
}: {
    type: TSquaddieConditionType
    amount?: number
    turns?: number
    source?: TSquaddieConditionSource
}): SquaddieCondition =>
    SquaddieConditionService.new({
        type,
        amount: amount == undefined ? undefined : { amount },
        duration:
            turns == undefined
                ? undefined
                : {
                      duration: turns,
                      decaysAt: SquaddieConditionDecaysAt.TURN_END,
                  },
        source: source ?? SquaddieConditionSource.PHYSICAL,
    })

const calculateTotals = (conditions: SquaddieCondition[]) => {
    const conditionsByType = new Map<
        TSquaddieConditionType,
        SquaddieCondition[]
    >()
    for (const condition of conditions) {
        conditionsByType.set(condition.type, [
            ...(conditionsByType.get(condition.type) ?? []),
            condition,
        ])
    }
    return SquaddieConditionTotalService.calculateTotals(conditionsByType)
}

const totalOfType = (
    totals: SquaddieConditionTotal[],
    type: TSquaddieConditionType
): SquaddieConditionTotal | undefined =>
    totals.find((total) => total.type === type)

const stackedConditionWithAmount = (
    total: SquaddieConditionTotal | undefined,
    amount: number
): StackedSquaddieCondition | undefined =>
    total?.stackedConditions.find(
        (stackedCondition) => stackedCondition.amount === amount
    )

const stackedConditionFromSource = (
    total: SquaddieConditionTotal | undefined,
    source: TSquaddieConditionSource
): StackedSquaddieCondition | undefined =>
    total?.stackedConditions.find(
        (stackedCondition) => stackedCondition.source === source
    )

describe("SquaddieConditionTotalService.calculateTotals", () => {
    describe("when two conditions of a type share a source", () => {
        const strongerAmount = 2
        const weakerAmount = 1
        let armorTotal: SquaddieConditionTotal | undefined

        beforeEach(() => {
            const totals = calculateTotals([
                newCondition({
                    type: SquaddieConditionType.ARMOR,
                    amount: strongerAmount,
                    turns: 1,
                }),
                newCondition({
                    type: SquaddieConditionType.ARMOR,
                    amount: weakerAmount,
                    turns: 3,
                }),
            ])
            armorTotal = totalOfType(totals, SquaddieConditionType.ARMOR)
        })

        it("uses the stronger condition as the total", () => {
            expect(armorTotal?.totalAmount).toBe(strongerAmount)
        })

        it("marks only the stronger condition as contributing to the total", () => {
            expect(
                stackedConditionWithAmount(armorTotal, strongerAmount)
                    ?.contributesToTotal
            ).toBe(true)
            expect(
                stackedConditionWithAmount(armorTotal, weakerAmount)
                    ?.contributesToTotal
            ).toBe(false)
        })

        it("reports how many turns each condition has left", () => {
            expect(
                stackedConditionWithAmount(armorTotal, strongerAmount)
                    ?.turnsRemaining
            ).toBe(1)
            expect(
                stackedConditionWithAmount(armorTotal, weakerAmount)
                    ?.turnsRemaining
            ).toBe(3)
        })
    })

    describe("when conditions of a type come from different sources", () => {
        const physicalAmount = 2
        const itemAmount = 1
        let armorTotal: SquaddieConditionTotal | undefined

        beforeEach(() => {
            const totals = calculateTotals([
                newCondition({
                    type: SquaddieConditionType.ARMOR,
                    amount: physicalAmount,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
                newCondition({
                    type: SquaddieConditionType.ARMOR,
                    amount: itemAmount,
                    source: SquaddieConditionSource.ITEM,
                }),
            ])
            armorTotal = totalOfType(totals, SquaddieConditionType.ARMOR)
        })

        it("adds them together", () => {
            expect(armorTotal?.totalAmount).toBe(physicalAmount + itemAmount)
        })

        it("marks every condition as contributing to the total", () => {
            expect(
                stackedConditionFromSource(
                    armorTotal,
                    SquaddieConditionSource.PHYSICAL
                )?.contributesToTotal
            ).toBe(true)
            expect(
                stackedConditionFromSource(
                    armorTotal,
                    SquaddieConditionSource.ITEM
                )?.contributesToTotal
            ).toBe(true)
        })
    })

    describe("when a condition is binary", () => {
        let offGuardTotal: SquaddieConditionTotal | undefined

        beforeEach(() => {
            const totals = calculateTotals([
                newCondition({
                    type: SquaddieConditionType.OFF_GUARD,
                    turns: 2,
                }),
            ])
            offGuardTotal = totalOfType(totals, SquaddieConditionType.OFF_GUARD)
        })

        it("reports no total amount", () => {
            expect(offGuardTotal?.totalAmount).toBeUndefined()
        })

        it("reports no amount on its stacked condition", () => {
            expect(
                stackedConditionFromSource(
                    offGuardTotal,
                    SquaddieConditionSource.PHYSICAL
                )?.amount
            ).toBeUndefined()
        })
    })

    describe("when a condition has been drained to zero", () => {
        it("does not count it as contributing to the total", () => {
            const totals = calculateTotals([
                newCondition({
                    type: SquaddieConditionType.ABSORB,
                    amount: 3,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
                newCondition({
                    type: SquaddieConditionType.ABSORB,
                    amount: 0,
                    source: SquaddieConditionSource.ITEM,
                }),
            ])

            const drainedCondition = stackedConditionFromSource(
                totalOfType(totals, SquaddieConditionType.ABSORB),
                SquaddieConditionSource.ITEM
            )
            expect(drainedCondition?.contributesToTotal).toBe(false)
        })
    })

    describe("when a condition has no duration", () => {
        it("reports no turns remaining", () => {
            const totals = calculateTotals([
                newCondition({ type: SquaddieConditionType.HUSTLE }),
            ])

            const hustleStackedCondition = stackedConditionFromSource(
                totalOfType(totals, SquaddieConditionType.HUSTLE),
                SquaddieConditionSource.PHYSICAL
            )
            expect(hustleStackedCondition?.turnsRemaining).toBeUndefined()
        })
    })

    describe("when conditions of a type cancel each other out", () => {
        it("leaves the type out", () => {
            const totals = calculateTotals([
                newCondition({ type: SquaddieConditionType.ARMOR, amount: 1 }),
                newCondition({
                    type: SquaddieConditionType.ARMOR,
                    amount: -1,
                    source: SquaddieConditionSource.ITEM,
                }),
            ])

            expect(
                totalOfType(totals, SquaddieConditionType.ARMOR)
            ).toBeUndefined()
        })
    })

    describe("when a helpful type totals below zero", () => {
        it("counts as hindering", () => {
            const totals = calculateTotals([
                newCondition({ type: SquaddieConditionType.ARMOR, amount: -1 }),
            ])

            expect(
                totalOfType(totals, SquaddieConditionType.ARMOR)?.isHindering
            ).toBe(true)
        })
    })

    describe("when a squaddie has both hindering and helpful types", () => {
        it("lists the hindering types first", () => {
            const totals = calculateTotals([
                newCondition({ type: SquaddieConditionType.ELUSIVE }),
                newCondition({ type: SquaddieConditionType.SLOWED, amount: 1 }),
            ])

            expect(totals.map((total) => total.type)).toEqual([
                SquaddieConditionType.SLOWED,
                SquaddieConditionType.ELUSIVE,
            ])
        })
    })
})
