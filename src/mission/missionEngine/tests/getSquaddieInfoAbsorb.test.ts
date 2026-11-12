import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { MissionStateService } from "../../missionState.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionSource,
    type TSquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"

const createAbsorbCondition = ({
    amount,
    source,
}: {
    amount: number
    source: TSquaddieConditionSource
}): SquaddieCondition =>
    SquaddieConditionService.new({
        type: SquaddieConditionType.ABSORB,
        amount: { amount },
        duration: undefined,
        source,
    })

describe("getSquaddieInfo absorb", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let playerSquaddieId: BattleSquaddieId
    let missionEngine: MissionEngine

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                },
            })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "player-1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })

        missionEngine = new MissionEngine(
            new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
                inBattleSquaddieManager,
            })
        )
    })

    describe("when the squaddie has no ABSORB condition", () => {
        it("reports no absorb", () => {
            expect(
                missionEngine.getSquaddieInfo(playerSquaddieId).absorbAmount
            ).toBe(0)
        })
    })

    describe("when two ABSORB conditions share a source", () => {
        const weakerAbsorb = 2
        const strongerAbsorb = 3

        beforeEach(() => {
            inBattleSquaddieManager.addConditionsToSquaddie({
                ...playerSquaddieId,
                conditions: [
                    createAbsorbCondition({
                        amount: weakerAbsorb,
                        source: SquaddieConditionSource.ELEMENTAL,
                    }),
                    createAbsorbCondition({
                        amount: strongerAbsorb,
                        source: SquaddieConditionSource.ELEMENTAL,
                    }),
                ],
            })
        })

        it("reports only the stronger one", () => {
            expect(
                missionEngine.getSquaddieInfo(playerSquaddieId).absorbAmount
            ).toBe(strongerAbsorb)
        })
    })

    describe("when ABSORB conditions come from different sources", () => {
        const elementalAbsorb = 2
        const spiritualAbsorb = 3

        beforeEach(() => {
            inBattleSquaddieManager.addConditionsToSquaddie({
                ...playerSquaddieId,
                conditions: [
                    createAbsorbCondition({
                        amount: elementalAbsorb,
                        source: SquaddieConditionSource.ELEMENTAL,
                    }),
                    createAbsorbCondition({
                        amount: spiritualAbsorb,
                        source: SquaddieConditionSource.SPIRITUAL,
                    }),
                ],
            })
        })

        it("reports their sum", () => {
            expect(
                missionEngine.getSquaddieInfo(playerSquaddieId).absorbAmount
            ).toBe(elementalAbsorb + spiritualAbsorb)
        })
    })

    describe("when the squaddie takes less damage than its absorb", () => {
        const startingAbsorb = 3
        const damageTaken = 2

        beforeEach(() => {
            inBattleSquaddieManager.addConditionsToSquaddie({
                ...playerSquaddieId,
                conditions: [
                    createAbsorbCondition({
                        amount: startingAbsorb,
                        source: SquaddieConditionSource.ELEMENTAL,
                    }),
                ],
            })
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...playerSquaddieId,
                damage: { amount: damageTaken, type: undefined },
            })
        })

        it("reports the absorb amount left after soaking the damage", () => {
            expect(
                missionEngine.getSquaddieInfo(playerSquaddieId).absorbAmount
            ).toBe(startingAbsorb - damageTaken)
        })
    })
})
