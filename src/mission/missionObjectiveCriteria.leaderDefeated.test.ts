import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup.js"
import { type Army, ArmyService } from "../campaign/army/army.js"
import { CampaignSquaddieService } from "../campaign/army/campaignSquaddie.js"

const buildArmyWithLeaderSquaddie = ({
    outOfBattleSquaddieId,
    isLeader,
}: {
    outOfBattleSquaddieId: string
    isLeader: boolean
}): Army => {
    const campaignSquaddie = CampaignSquaddieService.new({
        id: "campaign-squaddie",
        outOfBattleAttributeSheetId: "test sheet",
        outOfBattleSquaddieId,
        name: "Campaign Squaddie",
        isLeader,
    })
    return ArmyService.addOrUpdate({
        army: ArmyService.new(),
        campaignSquaddie,
    })
}

describe("ArmyLeaderDefeatedCriteria", () => {
    describe("creation", () => {
        it("creates a criteria of type ARMY_LEADER_DEFEATED", () => {
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ARMY_LEADER_DEFEATED
            )
        })
    })

    describe("serialization", () => {
        it("round trips through serialize and createFromJSON", () => {
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            const serialized =
                MissionObjectiveCriteriaService.serialize(criteria)
            const deserialized =
                MissionObjectiveCriteriaService.createFromJSON(serialized)

            expect(deserialized).toEqual(criteria)
        })
    })

    describe("isSatisfied", () => {
        let manager: InBattleSquaddieManager

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "leader-out-of-battle",
                    name: "Leader",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            manager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "leader-out-of-battle",
            })
        })

        it("is true when the army leader's in-battle squaddie is defeated", () => {
            const army = buildArmyWithLeaderSquaddie({
                outOfBattleSquaddieId: "leader-out-of-battle",
                isLeader: true,
            })
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "leader-out-of-battle",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    army,
                })
            ).toBe(true)
        })

        it("is false when the army leader's in-battle squaddie is still alive", () => {
            const army = buildArmyWithLeaderSquaddie({
                outOfBattleSquaddieId: "leader-out-of-battle",
                isLeader: true,
            })
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    army,
                })
            ).toBe(false)
        })

        it("is false when the army has no leader", () => {
            const army = buildArmyWithLeaderSquaddie({
                outOfBattleSquaddieId: "leader-out-of-battle",
                isLeader: false,
            })
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    army,
                })
            ).toBe(false)
        })

        it("is false when no army is provided in the context", () => {
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)
        })
    })
})
