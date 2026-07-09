import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria"
import { MissionAffiliationTurn, MissionTurnService } from "./missionTurn"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"

const buildManager = () => {
    const { manager: outOfBattleManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "sheet",
            attributeSheetOptions: {
                maxHitPoints: 10,
                distancePerAction: 2,
                items: { maxCapacity: 0 },
            },
        })
    return new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleManager
    )
}

describe("PhaseReachedCriteria", () => {
    describe("creation", () => {
        it("creates criteria with turnCount and missionAffiliationTurn", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 3,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.PHASE_REACHED
            )
            expect(criteria.turnCount).toBe(3)
            expect(criteria.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.ENEMY_TURN_START
            )
        })

        it("throws an error for a negative turnCount", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: -1,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                })
            }).toThrow(
                "[MissionObjectiveCriteriaService.newPhaseReachedCriteria]: turnCount must be zero or greater"
            )
        })

        it("throws an error when turnCount is missing", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: undefined as unknown as number,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                })
            }).toThrow(
                "[MissionObjectiveCriteriaService.newPhaseReachedCriteria]: turnCount is required"
            )
        })
    })

    describe("serialization", () => {
        it("round trips through serialize and createFromJSON", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 5,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_START,
                })

            const serialized =
                MissionObjectiveCriteriaService.serialize(criteria)
            const deserialized =
                MissionObjectiveCriteriaService.createFromJSON(serialized)

            expect(deserialized).toEqual(criteria)
        })

        it("throws an error instead of silently producing an unsatisfiable criteria when turnCount is missing from JSON", () => {
            expect(() => {
                MissionObjectiveCriteriaService.createFromJSON({
                    type: MissionObjectiveCriteriaType.PHASE_REACHED,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                })
            }).toThrow(
                "[MissionObjectiveCriteriaService.newPhaseReachedCriteria]: turnCount is required"
            )
        })
    })

    describe("isSatisfied", () => {
        let manager: InBattleSquaddieManager

        beforeEach(() => {
            manager = buildManager()
        })

        it("is false when no missionTurn context is provided", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 1,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)
        })

        it("is true once the exact turn and phase is reached", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 1,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })
            const missionTurn = MissionTurnService.new({
                turnCount: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN_START,
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    missionTurn,
                })
            ).toBe(true)
        })

        it("is false before the target phase is reached within the same turn", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 1,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })
            const missionTurn = MissionTurnService.new({
                turnCount: 1,
                missionAffiliationTurn:
                    MissionAffiliationTurn.PLAYER_TURN_START,
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    missionTurn,
                })
            ).toBe(false)
        })

        it("stays true for later phases within the same target turn", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 1,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })
            const missionTurn = MissionTurnService.new({
                turnCount: 1,
                missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    missionTurn,
                })
            ).toBe(true)
        })

        it("stays true once a later turn count is reached, regardless of phase", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 3,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })
            const missionTurn = MissionTurnService.new({
                turnCount: 4,
                missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    missionTurn,
                })
            ).toBe(true)
        })

        it("is false while the turn count has not yet been reached", () => {
            const criteria =
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 3,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                })
            const missionTurn = MissionTurnService.new({
                turnCount: 2,
                missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    missionTurn,
                })
            ).toBe(false)
        })
    })
})
