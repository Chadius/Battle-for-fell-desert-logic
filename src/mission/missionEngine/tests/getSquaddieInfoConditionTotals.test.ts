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

const createArmorCondition = ({
    amount,
    source,
}: {
    amount: number
    source: TSquaddieConditionSource
}): SquaddieCondition =>
    SquaddieConditionService.new({
        type: SquaddieConditionType.ARMOR,
        amount: { amount },
        duration: undefined,
        source,
    })

describe("getSquaddieInfo condition totals", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let playerSquaddieId: BattleSquaddieId
    let missionEngine: MissionEngine

    const getArmorTotal = () =>
        missionEngine
            .getSquaddieInfo(playerSquaddieId)
            .conditionTotals.find(
                (total) => total.type === SquaddieConditionType.ARMOR
            )

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

    describe("when the squaddie has no conditions", () => {
        it("reports no totals", () => {
            expect(
                missionEngine.getSquaddieInfo(playerSquaddieId).conditionTotals
            ).toEqual([])
        })
    })

    describe("when ARMOR conditions come from different sources", () => {
        const itemArmor = 1
        const spiritualArmor = 2

        beforeEach(() => {
            inBattleSquaddieManager.addConditionsToSquaddie({
                ...playerSquaddieId,
                conditions: [
                    createArmorCondition({
                        amount: itemArmor,
                        source: SquaddieConditionSource.ITEM,
                    }),
                    createArmorCondition({
                        amount: spiritualArmor,
                        source: SquaddieConditionSource.SPIRITUAL,
                    }),
                ],
            })
        })

        it("reports their sum as one ARMOR total", () => {
            expect(getArmorTotal()?.totalAmount).toBe(
                itemArmor + spiritualArmor
            )
        })

        it("lists each condition behind the total", () => {
            expect(
                getArmorTotal()
                    ?.stackedConditions.map(
                        (stackedCondition) => stackedCondition.source
                    )
                    .sort()
            ).toEqual(
                [
                    SquaddieConditionSource.ITEM,
                    SquaddieConditionSource.SPIRITUAL,
                ].sort()
            )
        })
    })
})
