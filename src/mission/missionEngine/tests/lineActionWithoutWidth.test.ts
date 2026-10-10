import { beforeEach, describe, expect, it } from "vitest"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { MissionEngine } from "../missionEngine.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import { MissionStateService } from "../../missionState.js"
import { MissionManager } from "../../missionManager.js"
import {
    MissionAffiliationTurn,
    MissionTurnService,
} from "../../missionTurn.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate.js"

const lightningBoltId = "lightning-bolt"

const createLightningBoltAction = () =>
    SquaddieActionService.new({
        id: lightningBoltId,
        name: "Lightning Bolt",
        range: ActionRange.LONG,
        shape: CoordinateGeneratorShape.LINE,
        areaOfEffectSize: 0,
        aimCoordinateRequiresTarget: true,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        proficiency: ProficiencyType.SKILL_MIND,
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                damage: {
                    raw: 1,
                    targetProficiency: ProficiencyType.ARMOR,
                },
            },
        },
    })

interface LineEngineFixture {
    missionEngine: MissionEngine
    actorId: BattleSquaddieId
    nearestEnemyId: BattleSquaddieId
    middleEnemyId: BattleSquaddieId
    farthestEnemyId: BattleSquaddieId
}

const createLineEngine = (): LineEngineFixture => {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "test_sheet",
            attributeSheetOptions: { maxHitPoints: 10 },
        })
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: "player-1",
            name: "Player 1",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "test_sheet",
            actionIds: [lightningBoltId],
        })
    )
    const enemyOutOfBattleIds = [
        "nearest-enemy",
        "middle-enemy",
        "farthest-enemy",
    ]
    enemyOutOfBattleIds.forEach((id) =>
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id,
                name: id,
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })
        )
    )

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    const actorId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-1",
    })
    const [nearestEnemyId, middleEnemyId, farthestEnemyId] =
        enemyOutOfBattleIds.map((outOfBattleSquaddieId) =>
            inBattleSquaddieManager.createNewSquaddie({ outOfBattleSquaddieId })
        )

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: ["1 1 1 1 1 1 1"],
        }),
    })
    ;[
        { squaddieId: actorId, coordinate: { row: 0, col: 0 } },
        { squaddieId: nearestEnemyId, coordinate: { row: 0, col: 2 } },
        { squaddieId: middleEnemyId, coordinate: { row: 0, col: 3 } },
        { squaddieId: farthestEnemyId, coordinate: { row: 0, col: 4 } },
    ].forEach(({ squaddieId, coordinate }) =>
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId,
            coordinate,
        })
    )

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(createLightningBoltAction())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    const missionManager = new MissionManager({
        missionState: MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            }),
        }),
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return {
        missionEngine: new MissionEngine(
            missionManager,
            new RollGenerator([6, 6])
        ),
        actorId,
        nearestEnemyId,
        middleEnemyId,
        farthestEnemyId,
    }
}

const readyLightningBoltAimedAt = ({
    missionEngine,
    actorId,
    aimCoordinate,
}: {
    missionEngine: MissionEngine
    actorId: BattleSquaddieId
    aimCoordinate: OffsetCoordinate
}): { isValid: boolean; message?: string } => {
    const targets = missionEngine.getTargetsForAimCoordinate({
        actor: actorId,
        actionId: lightningBoltId,
        aimCoordinate,
    })
    return missionEngine.readyAction({
        actor: actorId,
        targets,
        action: {
            id: lightningBoltId,
            decisions: { targetCoordinate: aimCoordinate },
        },
    })
}

describe("MissionEngine — LINE action with an areaOfEffectSize of 0", () => {
    let fixture: LineEngineFixture

    beforeEach(() => {
        fixture = createLineEngine()
    })

    describe("when aimed at the nearest enemy on the line", () => {
        let readyResult: { isValid: boolean; message?: string }

        beforeEach(() => {
            readyResult = readyLightningBoltAimedAt({
                missionEngine: fixture.missionEngine,
                actorId: fixture.actorId,
                aimCoordinate: { row: 0, col: 2 },
            })
        })

        it("accepts the action", () => {
            expect(readyResult.isValid).toBe(true)
        })

        describe("and the action is used", () => {
            beforeEach(() => {
                fixture.missionEngine.useActionAndGetResults()
            })

            it("damages every enemy along the line", () => {
                const enemyIds = [
                    fixture.nearestEnemyId,
                    fixture.middleEnemyId,
                    fixture.farthestEnemyId,
                ]
                enemyIds.forEach((enemyId) => {
                    const info = fixture.missionEngine.getSquaddieInfo(enemyId)
                    expect(info.currentHitPoints).toBeLessThan(
                        info.maxHitPoints
                    )
                })
            })
        })
    })

    describe("when aimed at an empty tile on the line", () => {
        it("rejects the action because the aim coordinate must have a target", () => {
            const readyResult = readyLightningBoltAimedAt({
                missionEngine: fixture.missionEngine,
                actorId: fixture.actorId,
                aimCoordinate: { row: 0, col: 1 },
            })

            expect(readyResult.message).toMatch(/must have a target/)
        })
    })

    describe("when readied without an aim coordinate", () => {
        it("rejects the action because it requires a target coordinate", () => {
            const readyResult = fixture.missionEngine.readyAction({
                actor: fixture.actorId,
                targets: [fixture.nearestEnemyId],
                action: { id: lightningBoltId },
            })

            expect(readyResult.message).toMatch(/requires a target coordinate/)
        })
    })
})
