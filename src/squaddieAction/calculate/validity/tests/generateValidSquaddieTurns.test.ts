import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { SquaddieActionService } from "../../../squaddieAction"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"
import { ActionRange } from "../../../actionRange"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"

describe("generateValidSquaddieTurns", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actor: BattleSquaddieId
    let enemy: BattleSquaddieId
    const mapId = "test-map"
    const rangedAttackId = "ranged-attack"

    beforeEach(() => {
        const { manager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
                attributeSheetOptions: {
                    distancePerAction: 1,
                    maxHitPoints: 10,
                },
            })
        outOfBattleSquaddieManager = manager

        const actorSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [rangedAttackId],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = {
            inBattleSquaddieId: actorInBattleId,
            outOfBattleSquaddieId: "actor",
        }

        const { inBattleSquaddieId: enemyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        enemy = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        const rangedAttack = SquaddieActionService.new({
            id: rangedAttackId,
            name: "Ranged Attack",
            range: ActionRange.SHORT,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
        squaddieActionManager.addOrUpdate(rangedAttack)

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: ["1 1 1 1 1"],
            }),
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            mapCollection
        )

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 4 },
        })
    })

    it("generates End Turn as a complete turn sequence", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const endTurnOnly = turnSequences.find(
            (seq) => seq.length === 1 && seq[0].action.id === "default-end-turn"
        )

        expect(endTurnOnly).toBeDefined()
    })

    it("generates move then end turn sequences", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const moveCol1ThenEnd = turnSequences.find(
            (seq) =>
                seq.length === 2 &&
                seq[0].action.id === "default-move" &&
                seq[0].decisions.desiredMovementDestination?.col === 1 &&
                seq[1].action.id === "default-end-turn"
        )

        expect(moveCol1ThenEnd).toBeDefined()

        const moveCol2ThenEnd = turnSequences.find(
            (seq) =>
                seq.length === 2 &&
                seq[0].action.id === "default-move" &&
                seq[0].decisions.desiredMovementDestination?.col === 2 &&
                seq[1].action.id === "default-end-turn"
        )

        expect(moveCol2ThenEnd).toBeDefined()
    })

    it("generates sequences that exhaust all action points through movement", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const moveCol3AllAP = turnSequences.find(
            (seq) =>
                seq.length === 1 &&
                seq[0].action.id === "default-move" &&
                seq[0].decisions.desiredMovementDestination?.col === 3 &&
                seq[0].actionPointsRemaining.current === 0
        )

        expect(moveCol3AllAP).toBeDefined()
    })

    it("generates sequences with movement then ranged attack", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const moveCol2ThenAttack = turnSequences.find(
            (seq) =>
                seq.length === 2 &&
                seq[0].action.id === "default-move" &&
                seq[0].decisions.desiredMovementDestination?.col === 2 &&
                seq[1].action.id === rangedAttackId &&
                seq[1].decisions.targetCoordinate?.col === 4
        )

        expect(moveCol2ThenAttack).toBeDefined()
    })

    it("does not include move to current position in any sequence", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        for (const sequence of turnSequences) {
            let currentPosition = { row: 0, col: 0 }

            for (const action of sequence) {
                if (action.action.id === "default-move") {
                    const dest = action.decisions.desiredMovementDestination
                    expect(dest).toBeDefined()
                    expect(
                        dest!.row !== currentPosition.row ||
                            dest!.col !== currentPosition.col
                    ).toBe(true)

                    currentPosition = dest!
                }
            }
        }
    })

    it("tracks action points correctly through sequences", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        for (const sequence of turnSequences) {
            const lastAction = sequence[sequence.length - 1]
            expect(lastAction.actionPointsRemaining.current).toBe(0)
        }
    })

    it("generates only End Turn when squaddie has 0 action points", () => {
        const turnSequences =
            SquaddieActionValidationService.generateValidSquaddieTurns({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
                actionPointsOverride: { current: 0 },
            })

        expect(turnSequences.length).toBe(1)
        expect(turnSequences[0].length).toBe(1)
        expect(turnSequences[0][0].action.id).toBe("default-end-turn")
    })
})
