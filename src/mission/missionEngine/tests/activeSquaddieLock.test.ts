import { beforeEach, describe, expect, it } from "vitest"
import {
    HowToDetermineDegreeOfSuccess,
    SquaddieActionService,
} from "../../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import {
    MissionAffiliationTurn,
    MissionTurnService,
} from "../../missionTurn.js"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"

const jabActionId = "jab"
const waveActionId = "wave"
const pokeActionId = "poke"

function createJabAction() {
    return SquaddieActionService.new({
        id: jabActionId,
        name: "Jab",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
    })
}

function createWaveAction() {
    return SquaddieActionService.new({
        id: waveActionId,
        name: "Wave",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 0 },
            },
        },
    })
}

function createPokeAction() {
    return SquaddieActionService.new({
        id: pokeActionId,
        name: "Poke",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.MELEE,
        affiliationRelationship: { self: false, foe: false, friend: true },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: { amount: 1 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.UNKNOWN,
                        }),
                    ],
                },
            },
        },
    })
}

function createTwoPlayerHarness(): {
    missionEngine: MissionEngine
    player1Id: BattleSquaddieId
    player2Id: BattleSquaddieId
} {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "player_sheet",
            attributeSheetOptions: {
                maxHitPoints: 10,
                distancePerAction: 2,
                items: { maxCapacity: 0 },
            },
        })

    const player1 = OutOfBattleSquaddieService.new({
        id: "player-1",
        name: "Player One",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "player_sheet",
        actionIds: [jabActionId, waveActionId, pokeActionId],
    })
    const player2 = OutOfBattleSquaddieService.new({
        id: "player-2",
        name: "Player Two",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "player_sheet",
        actionIds: [jabActionId],
    })

    outOfBattleSquaddieManager.addOrUpdateSquaddie(player1)
    outOfBattleSquaddieManager.addOrUpdateSquaddie(player2)

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const player1Id = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-1",
    })
    const player2Id = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-2",
    })

    const map = CoordinateMapService.new({
        id: "test_map",
        name: "test map",
        movementProperties: ["1 1 1 1 1"],
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({ map })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "test_map",
        squaddieId: player1Id,
        coordinate: { row: 0, col: 0 },
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "test_map",
        squaddieId: player2Id,
        coordinate: { row: 0, col: 1 },
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(createJabAction())
    squaddieActionManager.addOrUpdate(createWaveAction())
    squaddieActionManager.addOrUpdate(createPokeAction())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    const missionState = MissionStateService.new({
        id: "mission-1",
        mapId: "test_map",
        turn: MissionTurnService.new({
            missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
        }),
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return {
        missionEngine: new MissionEngine(missionManager),
        player1Id,
        player2Id,
    }
}

describe("MissionEngine active squaddie lock", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId
    let player2Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id, player2Id } = createTwoPlayerHarness())
    })

    describe("when no squaddie in the phase has acted yet", () => {
        it("allows the first squaddie to ready an action", () => {
            const result = missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(true)
        })
    })

    describe("when another squaddie has already spent action points this phase", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        it("rejects readying an action for a different squaddie", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/already started their turn/)
        })

        it("still allows the active squaddie to ready further actions", () => {
            const result = missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(true)
        })

        it("leaves the locked-out squaddie's action points untouched", () => {
            const info = missionEngine.getSquaddieInfo(player2Id)

            expect(info.currentActionPoints).toBe(info.maximumActionPoints)
        })

        describe("and the active squaddie ends their turn", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player1Id)
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and undo restores the active squaddie's action points to full", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and the active squaddie takes a second action, then only the most recent is undone", () => {
            beforeEach(() => {
                missionEngine.readyAction({
                    actor: player1Id,
                    targets: [player1Id],
                    action: { id: jabActionId },
                })
                missionEngine.useActionAndGetResults()

                missionEngine.undoLastPlayerUndoableAction()
            })

            it("keeps the lock, rejecting a different squaddie", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(false)
                expect(result.message).toMatch(/already started their turn/)
            })
        })
    })

    describe("when another squaddie has taken a zero-action-point action this phase", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: waveActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        it("rejects readying an action for a different squaddie even though action points are untouched", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/already started their turn/)
        })

        describe("and the active squaddie ends their turn", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player1Id)
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and undo removes the zero-action-point action", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })

    describe("when the active squaddie's only action targeted a different squaddie", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player2Id],
                action: { id: pokeActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        describe("and undo reverses it", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })

    describe("when a squaddie has an action readied but not yet executed", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })
        })

        it("rejects readying an action for a different squaddie", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/readied action/)
        })

        describe("and the readied action is cancelled", () => {
            beforeEach(() => {
                missionEngine.cancelReadiedAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })
})
