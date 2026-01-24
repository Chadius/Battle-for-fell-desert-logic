import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionAffiliationTurn,
    type MissionTurn,
    MissionTurnService,
} from "./missionTurn"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { AttributeScore } from "../proficiency/attributeScore"
import type { CoordinateMap } from "../coordinateMap/coordinateMap"
import { CoordinateMapService } from "../coordinateMap/coordinateMap"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"

describe("MissionTurn", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let coordinateMap: CoordinateMap
    let playerSquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let allySquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let enemySquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let noneAffiliationSquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test sheet",
                attributeSheetOptions: {
                    maxHitPoints: 5,
                    distancePerAction: 1,
                    items: { maxCapacity: 0 },
                },
            })

        const playerSquaddie = OutOfBattleSquaddieService.new({
            id: "player",
            name: "Player",
            actionIds: [],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        const noneSquaddie = OutOfBattleSquaddieService.new({
            id: "none",
            name: "None",
            actionIds: [],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.NONE,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(noneSquaddie)

        const inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )

        playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player",
        })!
        allySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "ally",
        })!
        enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy",
        })!
        noneAffiliationSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "none",
        })!

        coordinateMap = CoordinateMapService.new({
            id: "test map",
            name: "Test Map",
            movementProperties: [
                "1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1 ",
                "1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1 ",
            ],
        })

        coordinateMap = CoordinateMapService.addSquaddie({
            map: coordinateMap,
            squaddieId: playerSquaddieId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMap = CoordinateMapService.addSquaddie({
            map: coordinateMap,
            squaddieId: allySquaddieId,
            coordinate: { row: 1, col: 0 },
        })
        coordinateMap = CoordinateMapService.addSquaddie({
            map: coordinateMap,
            squaddieId: enemySquaddieId,
            coordinate: { row: 2, col: 0 },
        })
        coordinateMap = CoordinateMapService.addSquaddie({
            map: coordinateMap,
            squaddieId: noneAffiliationSquaddieId,
            coordinate: { row: 3, col: 0 },
        })
    })

    describe("MissionTurnService.new", () => {
        it("creates a new MissionTurn with default values", () => {
            const missionTurn: MissionTurn = MissionTurnService.new()

            expect(missionTurn.turnCount).toBe(0)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.TURN_START
            )
        })

        it("creates a new MissionTurn with custom turnCount", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                turnCount: 5,
            })

            expect(missionTurn.turnCount).toBe(5)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.TURN_START
            )
        })

        it("creates a new MissionTurn with custom missionAffiliationTurn", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(missionTurn.turnCount).toBe(0)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("creates a new MissionTurn with both custom values", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                turnCount: 3,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

            expect(missionTurn.turnCount).toBe(3)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.ENEMY_TURN
            )
        })
    })

    describe("MissionTurnService.calculateNextPhase", () => {
        describe("TURN_START transitions", () => {
            it("TURN_START with Player squaddie available transitions to PLAYER_TURN_START", () => {
                const missionTurn = MissionTurnService.new()

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.PLAYER_TURN_START
                )
            })

            it("TURN_START with no Player but Ally available transitions to ALLY_TURN_START", () => {
                const mapWithoutPlayer = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })

                const missionTurn = MissionTurnService.new()
                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: mapWithoutPlayer,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ALLY_TURN_START
                )
            })

            it("TURN_START with only Enemy available transitions to ENEMY_TURN_START", () => {
                let modifiedMap = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: allySquaddieId,
                })

                const missionTurn = MissionTurnService.new()
                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: modifiedMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN_START
                )
            })

            it("TURN_START with only None affiliation available transitions to NONE_AFFILIATION_TURN_START", () => {
                let modifiedMap = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: allySquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: enemySquaddieId,
                })

                const missionTurn = MissionTurnService.new()
                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: modifiedMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.NONE_AFFILIATION_TURN_START
                )
            })

            it("TURN_START with no squaddies available transitions to TURN_END", () => {
                let modifiedMap = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: allySquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: enemySquaddieId,
                })
                modifiedMap = CoordinateMapService.removeSquaddie({
                    map: modifiedMap,
                    squaddieId: noneAffiliationSquaddieId,
                })

                const missionTurn = MissionTurnService.new()
                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: modifiedMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.TURN_END
                )
            })
        })

        describe("X_TURN_START transitions", () => {
            it("PLAYER_TURN_START transitions to PLAYER_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_START,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.PLAYER_TURN
                )
            })

            it("ALLY_TURN_START transitions to ALLY_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ALLY_TURN_START,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ALLY_TURN
                )
            })

            it("ENEMY_TURN_START transitions to ENEMY_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN
                )
            })

            it("NONE_AFFILIATION_TURN_START transitions to NONE_AFFILIATION_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.NONE_AFFILIATION_TURN_START,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.NONE_AFFILIATION_TURN
                )
            })
        })

        describe("X_TURN transitions (squaddie can act)", () => {
            it("PLAYER_TURN with squaddie that can act stays in PLAYER_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.PLAYER_TURN
                )
            })

            it("ALLY_TURN with squaddie that can act stays in ALLY_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ALLY_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ALLY_TURN
                )
            })

            it("ENEMY_TURN with squaddie that can act stays in ENEMY_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN
                )
            })

            it("NONE_AFFILIATION_TURN with squaddie that can act stays in NONE_AFFILIATION_TURN", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.NONE_AFFILIATION_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.NONE_AFFILIATION_TURN
                )
            })
        })

        describe("X_TURN transitions (squaddie cannot act)", () => {
            it("PLAYER_TURN with squaddie off map transitions to PLAYER_TURN_END", () => {
                const mapWithoutPlayer = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: mapWithoutPlayer,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.PLAYER_TURN_END
                )
            })

            it("PLAYER_TURN with no Player squaddies transitions to PLAYER_TURN_END", () => {
                const mapWithoutPlayer = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: playerSquaddieId,
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: mapWithoutPlayer,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.PLAYER_TURN_END
                )
            })

            it("ALLY_TURN with all Ally squaddies at 0 HP transitions to ALLY_TURN_END", () => {
                inBattleSquaddieManager.dealDamageToSquaddie({
                    ...allySquaddieId,
                    damage: {
                        amount: 5,
                        type: AttributeScore.BODY,
                    },
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ALLY_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ALLY_TURN_END
                )
            })

            it("ENEMY_TURN with all Enemy squaddies out of actions transitions to ENEMY_TURN_END", () => {
                inBattleSquaddieManager.spendActionPoints({
                    ...enemySquaddieId,
                    actionPoints: 3,
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN_END
                )
            })
        })

        describe("X_TURN_END transitions", () => {
            it("PLAYER_TURN_END with Ally squaddie available transitions to ALLY_TURN_START", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ALLY_TURN_START
                )
            })

            it("PLAYER_TURN_END with no Ally but Enemy available transitions to ENEMY_TURN_START", () => {
                const mapWithoutAlly = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: allySquaddieId,
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: mapWithoutAlly,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN_START
                )
            })

            it("ALLY_TURN_END with Enemy squaddie available transitions to ENEMY_TURN_START", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ALLY_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.ENEMY_TURN_START
                )
            })

            it("ALLY_TURN_END with only None affiliation available transitions to NONE_AFFILIATION_TURN_START", () => {
                const mapWithoutEnemy = CoordinateMapService.removeSquaddie({
                    map: coordinateMap,
                    squaddieId: enemySquaddieId,
                })

                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ALLY_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap: mapWithoutEnemy,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.NONE_AFFILIATION_TURN_START
                )
            })

            it("ENEMY_TURN_END with None affiliation squaddie available transitions to NONE_AFFILIATION_TURN_START", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.NONE_AFFILIATION_TURN_START
                )
            })

            it("NONE_AFFILIATION_TURN_END transitions to TURN_END", () => {
                const missionTurn = MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.NONE_AFFILIATION_TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.TURN_END
                )
            })
        })

        describe("TURN_END transition", () => {
            it("TURN_END transitions to TURN_START with incremented turnCount", () => {
                const missionTurn = MissionTurnService.new({
                    turnCount: 0,
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
                })

                const nextTurn = MissionTurnService.calculateNextPhase({
                    missionTurn,
                    inBattleSquaddieManager,
                    coordinateMap,
                })

                expect(nextTurn.turnCount).toBe(1)
                expect(nextTurn.missionAffiliationTurn).toBe(
                    MissionAffiliationTurn.TURN_START
                )
            })
        })
    })

    describe("MissionTurnService.resetActionPoints", () => {
        let playerSquaddie2Id: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        beforeEach(() => {
            playerSquaddie2Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player",
            })!
        })

        it("will restore actions for all squaddies of the given affiliation", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddie2Id,
                actionPoints: 3,
            })

            inBattleSquaddieManager.spendActionPoints({
                ...enemySquaddieId,
                actionPoints: 3,
            })

            MissionTurnService.resetActionPointsForSquaddieAffiliation({
                inBattleSquaddieManager,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            expect(
                inBattleSquaddieManager.getActionPoints({
                    ...playerSquaddieId,
                }).current
            ).toBe(3)

            expect(
                inBattleSquaddieManager.getActionPoints({
                    ...playerSquaddie2Id,
                }).current
            ).toBe(3)

            expect(
                inBattleSquaddieManager.getActionPoints({
                    ...enemySquaddieId,
                }).current
            ).toBe(0)
        })
    })
})
