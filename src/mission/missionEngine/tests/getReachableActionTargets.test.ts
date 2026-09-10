import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import {
    HowToDetermineDegreeOfSuccess,
    type SquaddieAction,
    SquaddieActionService,
} from "../../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"

const mapId = "threat-range-map"

const meleeAttackId = "bite"
const rangedAttackId = "bow"
const healId = "heal"

const meleeAttack: SquaddieAction = SquaddieActionService.new({
    id: meleeAttackId,
    name: "Bite",
    attribute: AttributeScore.BODY,
    proficiency: ProficiencyType.WEAPON_NATURAL,
    range: ActionRange.MELEE,
    shape: CoordinateGeneratorShape.BLOOM,
    affiliationRelationship: { self: false, foe: true, friend: false },
    effectOnActor: {
        [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
    },
    effectOnTarget: {
        [DegreeOfSuccess.FAILURE]: {},
        [DegreeOfSuccess.SUCCESS]: {
            damage: { raw: 2, targetProficiency: ProficiencyType.ARMOR },
        },
    },
})

const rangedAttack: SquaddieAction = SquaddieActionService.new({
    id: rangedAttackId,
    name: "Bow",
    attribute: AttributeScore.BODY,
    proficiency: ProficiencyType.WEAPON_MARTIAL,
    range: ActionRange.SHORT,
    shape: CoordinateGeneratorShape.BLOOM,
    affiliationRelationship: { self: false, foe: true, friend: false },
    effectOnActor: {
        [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
    },
    effectOnTarget: {
        [DegreeOfSuccess.FAILURE]: {},
        [DegreeOfSuccess.SUCCESS]: {
            damage: { raw: 2, targetProficiency: ProficiencyType.ARMOR },
        },
    },
})

const heal: SquaddieAction = SquaddieActionService.new({
    id: healId,
    name: "Heal",
    attribute: AttributeScore.SOUL,
    proficiency: ProficiencyType.SKILL_SOUL,
    range: ActionRange.MELEE,
    shape: CoordinateGeneratorShape.BLOOM,
    affiliationRelationship: { self: true, foe: false, friend: true },
    howToDetermineDegreeOfSuccess:
        HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
    effectOnActor: {
        [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
    },
    effectOnTarget: {
        [DegreeOfSuccess.SUCCESS]: { healing: { raw: 3 } },
    },
})

interface SquaddiePlacement {
    id: string
    affiliation: TSquaddieAffiliation
    coordinate: { row: number; col: number }
    actionIds: string[]
    woundedByDamage?: number
}

const createPreviewScenario = ({
    movementProperties,
    squaddieActions,
    squaddiePlacements,
}: {
    movementProperties: string[]
    squaddieActions: SquaddieAction[]
    squaddiePlacements: SquaddiePlacement[]
}): {
    missionEngine: MissionEngine
    inBattleSquaddieManager: InBattleSquaddieManager
    squaddieIdsByName: Record<string, BattleSquaddieId>
} => {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "shared-sheet",
            attributeSheetOptions: { distancePerAction: 1 },
        })

    for (const squaddiePlacement of squaddiePlacements) {
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: squaddiePlacement.id,
                name: squaddiePlacement.id,
                affiliation: squaddiePlacement.affiliation,
                attributeSheetId: "shared-sheet",
                actionIds: squaddiePlacement.actionIds,
            })
        )
    }

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: mapId,
            name: "Threat range map",
            movementProperties,
        }),
    })

    const squaddieIdsByName: Record<string, BattleSquaddieId> = {}
    for (const squaddiePlacement of squaddiePlacements) {
        const squaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: squaddiePlacement.id,
        })
        squaddieIdsByName[squaddiePlacement.id] = squaddieId
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId,
            coordinate: squaddiePlacement.coordinate,
        })
        if (squaddiePlacement.woundedByDamage != undefined) {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: {
                    amount: squaddiePlacement.woundedByDamage,
                    type: undefined,
                },
            })
        }
    }

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    for (const squaddieAction of squaddieActions) {
        squaddieActionManager.addOrUpdate(squaddieAction)
    }
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultMove())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    const missionEngine = new MissionEngine(
        new MissionManager({
            missionState: MissionStateService.new({
                id: "threat-range-mission",
                mapId,
            }),
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })
    )
    missionEngine.transitionToNextPhase()
    missionEngine.transitionToNextPhase()

    return { missionEngine, inBattleSquaddieManager, squaddieIdsByName }
}

const exhaustActionPoints = (
    inBattleSquaddieManager: InBattleSquaddieManager,
    squaddieId: BattleSquaddieId
) => {
    const { current } = inBattleSquaddieManager.getActionPoints(squaddieId)
    inBattleSquaddieManager.spendActionPoints({
        ...squaddieId,
        actionPoints: current,
    })
}

describe("previewing a squaddie's threat range", () => {
    const playerCoordinate = { row: 0, col: 0 }

    describe("when an out-of-turn enemy with a melee attack stands three tiles from the player", () => {
        let missionEngine: MissionEngine
        let squaddieIds: Record<string, BattleSquaddieId>

        beforeEach(() => {
            const scenario = createPreviewScenario({
                movementProperties: ["1 1 1 1"],
                squaddieActions: [meleeAttack],
                squaddiePlacements: [
                    {
                        id: "player",
                        affiliation: SquaddieAffiliation.PLAYER,
                        coordinate: playerCoordinate,
                        actionIds: [meleeAttackId],
                    },
                    {
                        id: "enemy",
                        affiliation: SquaddieAffiliation.ENEMY,
                        coordinate: { row: 0, col: 3 },
                        actionIds: [meleeAttackId],
                    },
                ],
            })
            missionEngine = scenario.missionEngine
            squaddieIds = scenario.squaddieIdsByName
            exhaustActionPoints(
                scenario.inBattleSquaddieManager,
                squaddieIds.enemy
            )
        })

        it("threatens nothing under the default query", () => {
            expect(
                missionEngine.getReachableActionTargets(squaddieIds.enemy)
            ).toHaveLength(0)
        })

        it("threatens the player it could close on and attack under the maximum query", () => {
            expect(
                missionEngine.getReachableActionTargets(squaddieIds.enemy, {
                    actionPoints: "maximum",
                })
            ).toEqual([
                {
                    actionId: meleeAttackId,
                    targetCoordinate: playerCoordinate,
                    targetSquaddieIds: [squaddieIds.player],
                    actionPointCostToMoveAndAct: 3,
                },
            ])
        })
    })

    describe("when an out-of-turn enemy with a melee attack already stands next to the player", () => {
        let missionEngine: MissionEngine
        let squaddieIds: Record<string, BattleSquaddieId>

        beforeEach(() => {
            const scenario = createPreviewScenario({
                movementProperties: ["1 1 1 1"],
                squaddieActions: [meleeAttack],
                squaddiePlacements: [
                    {
                        id: "player",
                        affiliation: SquaddieAffiliation.PLAYER,
                        coordinate: playerCoordinate,
                        actionIds: [meleeAttackId],
                    },
                    {
                        id: "enemy",
                        affiliation: SquaddieAffiliation.ENEMY,
                        coordinate: { row: 0, col: 1 },
                        actionIds: [meleeAttackId],
                    },
                ],
            })
            missionEngine = scenario.missionEngine
            squaddieIds = scenario.squaddieIdsByName
            exhaustActionPoints(
                scenario.inBattleSquaddieManager,
                squaddieIds.enemy
            )
        })

        it("threatens the player without spending movement under the maximum query", () => {
            expect(
                missionEngine.getReachableActionTargets(squaddieIds.enemy, {
                    actionPoints: "maximum",
                })
            ).toEqual([
                {
                    actionId: meleeAttackId,
                    targetCoordinate: playerCoordinate,
                    targetSquaddieIds: [squaddieIds.player],
                    actionPointCostToMoveAndAct: 1,
                },
            ])
        })
    })

    describe("when an out-of-turn enemy with a ranged attack has the player within its reach", () => {
        let missionEngine: MissionEngine
        let squaddieIds: Record<string, BattleSquaddieId>

        beforeEach(() => {
            const scenario = createPreviewScenario({
                movementProperties: ["1 1 1 1"],
                squaddieActions: [rangedAttack],
                squaddiePlacements: [
                    {
                        id: "player",
                        affiliation: SquaddieAffiliation.PLAYER,
                        coordinate: playerCoordinate,
                        actionIds: [rangedAttackId],
                    },
                    {
                        id: "enemy",
                        affiliation: SquaddieAffiliation.ENEMY,
                        coordinate: { row: 0, col: 3 },
                        actionIds: [rangedAttackId],
                    },
                ],
            })
            missionEngine = scenario.missionEngine
            squaddieIds = scenario.squaddieIdsByName
            exhaustActionPoints(
                scenario.inBattleSquaddieManager,
                squaddieIds.enemy
            )
        })

        it("threatens the player from where it already stands under the maximum query", () => {
            expect(
                missionEngine.getReachableActionTargets(squaddieIds.enemy, {
                    actionPoints: "maximum",
                })
            ).toEqual([
                {
                    actionId: rangedAttackId,
                    targetCoordinate: playerCoordinate,
                    targetSquaddieIds: [squaddieIds.player],
                    actionPointCostToMoveAndAct: 1,
                },
            ])
        })
    })

    describe("when an out-of-turn squaddie has a heal for itself and its allies", () => {
        const healerCoordinate = { row: 0, col: 0 }
        const woundedAllyCoordinate = { row: 0, col: 1 }
        let missionEngine: MissionEngine
        let squaddieIds: Record<string, BattleSquaddieId>

        beforeEach(() => {
            const scenario = createPreviewScenario({
                movementProperties: ["1 1 1"],
                squaddieActions: [heal],
                squaddiePlacements: [
                    {
                        id: "healer",
                        affiliation: SquaddieAffiliation.ALLY,
                        coordinate: healerCoordinate,
                        actionIds: [healId],
                        woundedByDamage: 2,
                    },
                    {
                        id: "woundedAlly",
                        affiliation: SquaddieAffiliation.ALLY,
                        coordinate: woundedAllyCoordinate,
                        actionIds: [healId],
                        woundedByDamage: 2,
                    },
                    {
                        id: "player",
                        affiliation: SquaddieAffiliation.PLAYER,
                        coordinate: { row: 0, col: 2 },
                        actionIds: [healId],
                    },
                ],
            })
            missionEngine = scenario.missionEngine
            squaddieIds = scenario.squaddieIdsByName
            exhaustActionPoints(
                scenario.inBattleSquaddieManager,
                squaddieIds.healer
            )
        })

        it("reports both itself and the adjacent wounded ally as heal targets under the maximum query", () => {
            const reachableActionTargets =
                missionEngine.getReachableActionTargets(squaddieIds.healer, {
                    actionPoints: "maximum",
                })

            expect(reachableActionTargets).toHaveLength(2)
            expect(reachableActionTargets).toEqual(
                expect.arrayContaining([
                    {
                        actionId: healId,
                        targetCoordinate: healerCoordinate,
                        targetSquaddieIds: [squaddieIds.healer],
                        actionPointCostToMoveAndAct: 1,
                    },
                    {
                        actionId: healId,
                        targetCoordinate: woundedAllyCoordinate,
                        targetSquaddieIds: [squaddieIds.woundedAlly],
                        actionPointCostToMoveAndAct: 1,
                    },
                ])
            )
        })
    })
})
