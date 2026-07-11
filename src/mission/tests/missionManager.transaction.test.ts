import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"

describe("MissionManager — transactional JSON loading", () => {
    const MAP_ID = "transaction-test-map"

    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddieActionManager: SquaddieActionManager

    const buildValidMissionStateJson = (id: string) =>
        MissionStateService.serialize(
            MissionStateService.new({ id, mapId: MAP_ID })
        )

    beforeEach(() => {
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        coordinateMapCollectionManager.addOrUpdate({
            map: CoordinateMapService.new({
                id: MAP_ID,
                name: "Transaction Test Map",
                movementProperties: ["1 1 1"],
            }),
        })

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new()
        )

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    describe("happy path — commit on valid state", () => {
        it("commits missionState to live fields after successful validate", () => {
            const manager = new MissionManager({
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.loadMissionStateFromJson(buildValidMissionStateJson("m1"))
            expect(manager.missionState).toBeUndefined()

            const result = manager.validate()

            expect(result.isValid).toBeTruthy()
            expect(manager.missionState?.id).toBe("m1")
        })

        it("commits staged squaddieActionManager to live fields after successful validate", () => {
            const action = SquaddieActionService.new({
                id: "slash",
                name: "Slash",
                attribute: AttributeScore.BODY,
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
            })
            squaddieActionManager.addOrUpdate(action)

            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "m1",
                    mapId: MAP_ID,
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager: new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                ),
            })

            manager.addActionsFromJson(squaddieActionManager.serialize())
            expect(manager.squaddieActionManager!.has("slash")).toBeFalsy()

            const result = manager.validate()

            expect(result.isValid).toBeTruthy()
            expect(manager.squaddieActionManager!.has("slash")).toBeTruthy()
        })
    })

    describe("rollback — discard on invalid state", () => {
        it("does not commit missionState when validate fails", () => {
            const manager = new MissionManager()

            manager.loadMissionStateFromJson(buildValidMissionStateJson("m1"))

            const result = manager.validate()

            expect(result.isValid).toBeFalsy()
            expect(manager.missionState).toBeUndefined()
        })

        it("does not commit squaddieActionManager when validate fails", () => {
            const manager = new MissionManager()
            const action = SquaddieActionService.new({
                id: "slash",
                name: "Slash",
                attribute: AttributeScore.BODY,
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
            })
            squaddieActionManager.addOrUpdate(action)

            manager.addActionsFromJson(squaddieActionManager.serialize())

            const result = manager.validate()

            expect(result.isValid).toBeFalsy()
            expect(manager.squaddieActionManager).toBeUndefined()
        })

        it("leaves live missionState unchanged when staged missionState has an unknown mapId", () => {
            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "existing",
                    mapId: MAP_ID,
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            const badMissionStateJson = MissionStateService.serialize(
                MissionStateService.new({
                    id: "replacement",
                    mapId: "nonexistent-map",
                })
            )
            manager.loadMissionStateFromJson(badMissionStateJson)

            const result = manager.validate()

            expect(result.isValid).toBeFalsy()
            expect(manager.missionState?.id).toBe("existing")
        })
    })

    describe("accumulation — multiple loads before validate", () => {
        it("accumulates two addActionsFromJson calls in staging before committing", () => {
            const actionA = SquaddieActionService.new({
                id: "slash",
                name: "Slash",
                attribute: AttributeScore.BODY,
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
            })
            const actionB = SquaddieActionService.new({
                id: "heal",
                name: "Heal",
                attribute: AttributeScore.SOUL,
                proficiency: ProficiencyType.UNKNOWN,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: true,
                        foe: false,
                        friend: true,
                    },
                },
                effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
            })

            const managerA = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            managerA.addOrUpdate(actionA)

            const managerB = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            managerB.addOrUpdate(actionB)

            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "m1",
                    mapId: MAP_ID,
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager: new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                ),
            })

            manager.addActionsFromJson(managerA.serialize())
            manager.addActionsFromJson(managerB.serialize())

            const result = manager.validate()

            expect(result.isValid).toBeTruthy()
            expect(manager.squaddieActionManager!.has("slash")).toBeTruthy()
            expect(manager.squaddieActionManager!.has("heal")).toBeTruthy()
        })
    })

    describe("retry — staging is cleared after validate", () => {
        it("allows a successful load after a failed attempt", () => {
            const manager = new MissionManager()

            manager.loadMissionStateFromJson(
                buildValidMissionStateJson("first")
            )
            const firstResult = manager.validate()
            expect(firstResult.isValid).toBeFalsy()
            expect(manager.missionState).toBeUndefined()

            manager.missionState = MissionStateService.new({
                id: "prior",
                mapId: MAP_ID,
            })
            manager.inBattleSquaddieManager = inBattleSquaddieManager
            manager.coordinateMapCollectionManager =
                coordinateMapCollectionManager
            manager.squaddieActionManager = squaddieActionManager

            manager.loadMissionStateFromJson(
                buildValidMissionStateJson("second")
            )
            const secondResult = manager.validate()

            expect(secondResult.isValid).toBeTruthy()
            expect(manager.missionState?.id).toBe("second")
        })
    })

    describe("backward compatibility — no staging", () => {
        it("validate works directly on live fields when no load methods were called", () => {
            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "m1",
                    mapId: MAP_ID,
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            const result = manager.validate()

            expect(result.isValid).toBeTruthy()
        })

        it("validate reports errors on live fields when no load methods were called", () => {
            const manager = new MissionManager()

            const result = manager.validate()

            expect(result.isValid).toBeFalsy()
            expect(result.errors).toContain("missionState must be defined")
        })
    })
})
