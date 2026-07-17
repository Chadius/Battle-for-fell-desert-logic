import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { MissionStatisticsService } from "../missionStatistics.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"

describe("MissionManager missionStatistics wiring", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddieActionManager: SquaddieActionManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let playerSquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let enemySquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let deterministicRollGenerator: RollGenerator

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "player_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    items: { maxCapacity: 0 },
                },
            })

        const enemyAttributeSheet =
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                id: "enemy_sheet",
                maxHitPoints: 10,
                items: { maxCapacity: 0 },
            })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            enemyAttributeSheet
        )

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "player",
                name: "Player",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "player_sheet",
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "enemy_sheet",
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player",
        })
        enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy",
        })

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        squaddieActionManager.addOrUpdate(
            SquaddieActionService.new({
                id: "attack",
                name: "Attack",
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: { SUCCESS: {} },
                effectOnTarget: {
                    SUCCESS: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.SKILL_BODY,
                        },
                    },
                },
            })
        )
        squaddieActionManager.addOrUpdate(
            SquaddieActionService.new({
                id: "heal",
                name: "Heal",
                targeting: {
                    range: ActionRange.SELF,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: true,
                        foe: false,
                        friend: false,
                    },
                },
                effectOnActor: { SUCCESS: {} },
                effectOnTarget: {
                    SUCCESS: { healing: { raw: 2 } },
                },
            })
        )

        const map = CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: ["1 1 1 "],
        })

        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        coordinateMapCollectionManager.addOrUpdate({ map })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: enemySquaddieId,
            coordinate: { row: 0, col: 1 },
        })

        deterministicRollGenerator = new RollGenerator([3, 3])
    })

    const newManager = () =>
        new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            }),
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })

    describe("when a PLAYER attacks an ENEMY", () => {
        it("credits the damage dealt to the player team", () => {
            const manager = newManager()

            manager.useActionAndGetResults({
                actor: playerSquaddieId,
                targets: [enemySquaddieId],
                action: { id: "attack" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(manager.missionState!.missionStatistics).toEqual(
                MissionStatisticsService.new({ damageDealtByPlayerTeam: 2 })
            )
        })

        it("accumulates damage dealt across multiple actions", () => {
            const manager = newManager()

            manager.useActionAndGetResults({
                actor: playerSquaddieId,
                targets: [enemySquaddieId],
                action: { id: "attack" },
                rollGenerator: new RollGenerator([3, 3]),
            })
            manager.useActionAndGetResults({
                actor: playerSquaddieId,
                targets: [enemySquaddieId],
                action: { id: "attack" },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                manager.missionState!.missionStatistics!.damageDealtByPlayerTeam
            ).toBe(4)
        })
    })

    describe("when an ENEMY attacks a PLAYER", () => {
        it("credits the damage taken to the player team", () => {
            const manager = newManager()

            manager.useActionAndGetResults({
                actor: enemySquaddieId,
                targets: [playerSquaddieId],
                action: { id: "attack" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(manager.missionState!.missionStatistics).toEqual(
                MissionStatisticsService.new({ damageTakenByPlayerTeam: 2 })
            )
        })
    })

    describe("when a PLAYER heals itself", () => {
        it("credits the healing received to the player team", () => {
            const manager = newManager()

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...playerSquaddieId,
                damage: { amount: 5, type: undefined },
            })

            manager.useActionAndGetResults({
                actor: playerSquaddieId,
                targets: [playerSquaddieId],
                action: { id: "heal" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(manager.missionState!.missionStatistics).toEqual(
                MissionStatisticsService.new({ healingReceivedByPlayerTeam: 2 })
            )
        })
    })

    describe("when loading a mission state saved before missionStatistics existed", () => {
        it("still records new statistics starting from zero", () => {
            const oldSaveMissionState = MissionStateService.deserialize({
                id: "mission-1",
                mapId: "test_map",
                objectives: [],
                turn: { turnCount: 0, missionAffiliationTurn: "TURN_START" },
            })
            const manager = new MissionManager({
                missionState: oldSaveMissionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: playerSquaddieId,
                targets: [enemySquaddieId],
                action: { id: "attack" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(manager.missionState!.missionStatistics).toEqual(
                MissionStatisticsService.new({ damageDealtByPlayerTeam: 2 })
            )
        })
    })
})
