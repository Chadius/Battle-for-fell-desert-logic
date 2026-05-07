import { beforeEach, describe, expect, it } from "vitest"
import { FlankingService } from "./flankingService"
import { CoordinateMapCollectionManager } from "./coordinateMapManager"
import { CoordinateMapCollectionService } from "./coordinateMapCollection"
import { CoordinateMapService } from "./coordinateMap"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"

describe("FlankingService", () => {
    const MAP_ID = "flankingTestMap"

    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let inBattleSquaddieManager: InBattleSquaddieManager

    let playerSquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let enemySquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let allySquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    let player2SquaddieId: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }

    const placeSquaddie = (
        squaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        },
        row: number,
        col: number
    ) => {
        coordinateMapCollectionManager.addSquaddie({
            mapId: MAP_ID,
            squaddieId,
            coordinate: { row, col },
        })
    }

    beforeEach(() => {
        const map = CoordinateMapService.new({
            id: MAP_ID,
            name: "Flanking Test Map",
            movementProperties: [
                "1 1 1 1 1",
                "1 1 1 1 1",
                "1 1 1 1 1",
                "1 1 1 1 1",
                "1 1 1 1 1",
            ],
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        coordinateMapCollectionManager.addOrUpdate({ map })

        const { manager: outOfBattleManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "sheet",
                attributeSheetOptions: { rank: 0 },
            })

        outOfBattleManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "player",
                name: "Player",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )
        outOfBattleManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )
        outOfBattleManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "ally",
                name: "Ally",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ALLY,
            })
        )
        outOfBattleManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "player2",
                name: "Player 2",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleManager
        )

        const { inBattleSquaddieId: playerId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player",
            })
        playerSquaddieId = {
            inBattleSquaddieId: playerId,
            outOfBattleSquaddieId: "player",
        }

        const { inBattleSquaddieId: enemyId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        enemySquaddieId = {
            inBattleSquaddieId: enemyId,
            outOfBattleSquaddieId: "enemy",
        }

        const { inBattleSquaddieId: allyId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        allySquaddieId = {
            inBattleSquaddieId: allyId,
            outOfBattleSquaddieId: "ally",
        }

        const { inBattleSquaddieId: player2Id } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player2",
            })
        player2SquaddieId = {
            inBattleSquaddieId: player2Id,
            outOfBattleSquaddieId: "player2",
        }

        coordinateMapCollectionManager.addSquaddie({
            mapId: MAP_ID,
            squaddieId: playerSquaddieId,
            coordinate: undefined,
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: MAP_ID,
            squaddieId: enemySquaddieId,
            coordinate: undefined,
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: MAP_ID,
            squaddieId: allySquaddieId,
            coordinate: undefined,
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: MAP_ID,
            squaddieId: player2SquaddieId,
            coordinate: undefined,
        })
    })

    const isFlankingCall = (
        actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string },
        target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    ) =>
        FlankingService.isActorFlankingTarget({
            actor,
            target,
            mapId: MAP_ID,
            coordinateMapCollectionManager,
            inBattleSquaddieManager,
        })

    describe("is flanking", () => {
        it("player at LEFT of enemy, ally at RIGHT — player is flanking", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(allySquaddieId, 2, 2)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(true)
        })

        it("ally is also flanking from the opposite side", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(allySquaddieId, 2, 2)

            expect(isFlankingCall(allySquaddieId, enemySquaddieId)).toBe(true)
        })

        it("UP_LEFT / DOWN_RIGHT pair causes flanking", () => {
            placeSquaddie(playerSquaddieId, 1, 1)
            placeSquaddie(enemySquaddieId, 2, 2)
            placeSquaddie(allySquaddieId, 3, 2)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(true)
        })

        it("UP_RIGHT / DOWN_LEFT pair causes flanking", () => {
            placeSquaddie(playerSquaddieId, 1, 1)
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(allySquaddieId, 3, 0)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(true)
        })
    })

    describe("is not flanking", () => {
        it("opposite squaddie is friendly to the target — no flanking", () => {
            const { manager: outOfBattleManager2 } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "sheet2",
                        attributeSheetOptions: { rank: 0 },
                    }
                )
            outOfBattleManager2.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy2",
                    name: "Enemy 2",
                    actionIds: [],
                    attributeSheetId: "sheet2",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            inBattleSquaddieManager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy2",
                    name: "Enemy 2",
                    actionIds: [],
                    attributeSheetId: "sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            const { inBattleSquaddieId: enemy2Id } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy2",
                })
            const enemy2SquaddieId = {
                inBattleSquaddieId: enemy2Id,
                outOfBattleSquaddieId: "enemy2",
            }

            coordinateMapCollectionManager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: enemy2SquaddieId,
                coordinate: undefined,
            })

            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(enemy2SquaddieId, 2, 2)

            expect(
                FlankingService.isActorFlankingTarget({
                    actor: playerSquaddieId,
                    target: enemySquaddieId,
                    mapId: MAP_ID,
                    coordinateMapCollectionManager,
                    inBattleSquaddieManager,
                })
            ).toBe(false)
        })

        it("actor is not adjacent to target — no flanking", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 2)
            placeSquaddie(allySquaddieId, 2, 3)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(
                false
            )

            expect(isFlankingCall(allySquaddieId, enemySquaddieId)).toBe(false)
        })

        it("opposite cell is empty — no flanking", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 1)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(
                false
            )
        })

        it("actor is off-map — no flanking", () => {
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(allySquaddieId, 2, 2)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(
                false
            )
        })

        it("target is off-map — no flanking", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(allySquaddieId, 2, 2)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(
                false
            )
        })

        it("non-flanking actor in same fight gets no benefit", () => {
            placeSquaddie(playerSquaddieId, 2, 0)
            placeSquaddie(enemySquaddieId, 2, 1)
            placeSquaddie(allySquaddieId, 2, 2)
            placeSquaddie(player2SquaddieId, 0, 1)

            expect(isFlankingCall(playerSquaddieId, enemySquaddieId)).toBe(true)
            expect(isFlankingCall(player2SquaddieId, enemySquaddieId)).toBe(
                false
            )
        })
    })
})
