import { MissionEngine } from "../../mission/missionEngine/missionEngine"
import { MissionManager } from "../../mission/missionManager"
import { MissionStateService } from "../../mission/missionState"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"
import { ProficiencyType } from "../../proficiency/proficiencyLevel"
import { ActionRange } from "../../squaddieAction/actionRange"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape"
import type { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator"

export const MissionEngineTestHarnessIds = {
    mapId: "test-harness-map",
    missionStateId: "test-harness-mission",
    lini: {
        outOfBattleSquaddieId: "lini",
        attributeSheetId: "lini-attribute-sheet",
        scimitarActionId: "lini-scimitar",
        healActionId: "lini-heal",
    },
    slitherDemon: {
        outOfBattleSquaddieId: "slither-demon",
        attributeSheetId: "slither-demon-attribute-sheet",
        clawActionId: "slither-demon-claw",
    },
} as const

export class MissionEngineTestHarness {
    private readonly missionEngine: MissionEngine
    private liniSquaddieId: BattleSquaddieId | undefined
    private slitherDemonSquaddieId: BattleSquaddieId | undefined

    constructor(rollGenerator?: RollGenerator) {
        const missionManager = this.createMissionManager()
        this.missionEngine = new MissionEngine(missionManager, rollGenerator)
        this.addSquaddiesToMap()
    }

    private createMissionManager(): MissionManager {
        const coordinateMapCollectionManager =
            this.createCoordinateMapCollectionManager()
        const squaddieActionManager = this.createSquaddieActionManager()
        const outOfBattleSquaddieManager =
            this.createOutOfBattleSquaddieManager()
        const inBattleSquaddieManager = this.createInBattleSquaddieManager(
            outOfBattleSquaddieManager
        )

        const missionState = MissionStateService.new({
            id: MissionEngineTestHarnessIds.missionStateId,
            mapId: MissionEngineTestHarnessIds.mapId,
        })

        return new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })
    }

    private createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
        const movementProperties = [
            "1 1 2 1 1",
            " 1 - 1 X 1",
            "1 1 1 1 2",
            " 2 1 - 1 1",
        ]

        const coordinateMap = CoordinateMapService.new({
            id: MissionEngineTestHarnessIds.mapId,
            name: "Test Harness Map",
            movementProperties,
        })

        const manager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        manager.addOrUpdate({ map: coordinateMap })
        return manager
    }

    private createSquaddieActionManager(): SquaddieActionManager {
        const manager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        manager.addOrUpdate(this.createScimitarAction())
        manager.addOrUpdate(this.createHealAction())
        manager.addOrUpdate(this.createClawAction())
        manager.addOrUpdate(SquaddieActionService.defaultMove())
        manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

        return manager
    }

    private createScimitarAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.scimitarActionId,
            name: "Scimitar",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
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
                [DegreeOfSuccess.CRITICAL]: {
                    damage: {
                        raw: 4,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    }

    private createHealAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.healActionId,
            name: "Heal",
            attribute: AttributeScore.SOUL,
            proficiency: ProficiencyType.SKILL_SOUL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: true,
            },
            actorRollsToHit: false,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: {
                        raw: 2,
                    },
                },
            },
        })
    }

    private createClawAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.slitherDemon.clawActionId,
            name: "Claw",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_NATURAL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 1,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
                [DegreeOfSuccess.CRITICAL]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    }

    private createOutOfBattleSquaddieManager(): OutOfBattleSquaddieManager {
        const manager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )

        const liniAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
            {
                id: MissionEngineTestHarnessIds.lini.attributeSheetId,
                maxHitPoints: 5,
                movement: {
                    distancePerAction: 2,
                },
                attributeScores: {
                    [AttributeScore.BODY]: 1,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 1,
                },
                rank: 1,
            }
        )
        manager.addOrUpdateAttributeSheet(liniAttributeSheet)

        const liniSquaddie = OutOfBattleSquaddieService.new({
            id: MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId,
            name: "Lini",
            attributeSheetId: MissionEngineTestHarnessIds.lini.attributeSheetId,
            actionIds: [
                MissionEngineTestHarnessIds.lini.scimitarActionId,
                MissionEngineTestHarnessIds.lini.healActionId,
            ],
            affiliation: SquaddieAffiliation.PLAYER,
        })
        manager.addOrUpdateSquaddie(liniSquaddie)

        const slitherDemonAttributeSheet =
            OutOfBattleSquaddieAttributeSheetService.new({
                id: MissionEngineTestHarnessIds.slitherDemon.attributeSheetId,
                maxHitPoints: 3,
                movement: {
                    distancePerAction: 2,
                },
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: -1,
                    [AttributeScore.SOUL]: -1,
                },
                rank: 0,
            })
        manager.addOrUpdateAttributeSheet(slitherDemonAttributeSheet)

        const slitherDemonSquaddie = OutOfBattleSquaddieService.new({
            id: MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId,
            name: "Slither Demon",
            attributeSheetId:
                MissionEngineTestHarnessIds.slitherDemon.attributeSheetId,
            actionIds: [MissionEngineTestHarnessIds.slitherDemon.clawActionId],
            affiliation: SquaddieAffiliation.ENEMY,
        })
        manager.addOrUpdateSquaddie(slitherDemonSquaddie)

        return manager
    }

    private createInBattleSquaddieManager(
        outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    ): InBattleSquaddieManager {
        const manager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        this.liniSquaddieId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId,
        })

        this.slitherDemonSquaddieId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId,
        })

        return manager
    }

    private addSquaddiesToMap(): void {
        const coordinateMapCollectionManager =
            this.missionEngine.missionManager!.coordinateMapCollectionManager!

        coordinateMapCollectionManager.addSquaddie({
            mapId: MissionEngineTestHarnessIds.mapId,
            squaddieId: this.liniSquaddieId!,
            coordinate: { row: 0, col: 0 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId: MissionEngineTestHarnessIds.mapId,
            squaddieId: this.slitherDemonSquaddieId!,
            coordinate: { row: 3, col: 4 },
        })
    }

    get missionManager() {
        return this.missionEngine.missionManager
    }

    get readiedAction() {
        return this.missionEngine.readiedAction
    }

    get rollGenerator() {
        return this.missionEngine.rollGenerator
    }

    get actionResults() {
        return this.missionEngine.actionResults
    }

    readyAction(
        ...args: Parameters<MissionEngine["readyAction"]>
    ): ReturnType<MissionEngine["readyAction"]> {
        return this.missionEngine.readyAction(...args)
    }

    getReadiedAction(): ReturnType<MissionEngine["getReadiedAction"]> {
        return this.missionEngine.getReadiedAction()
    }

    getSerializedReadiedAction(): ReturnType<
        MissionEngine["getSerializedReadiedAction"]
    > {
        return this.missionEngine.getSerializedReadiedAction()
    }

    cancelReadiedAction(): ReturnType<MissionEngine["cancelReadiedAction"]> {
        return this.missionEngine.cancelReadiedAction()
    }

    isDone(): ReturnType<MissionEngine["isDone"]> {
        return this.missionEngine.isDone()
    }

    getInMissionSummary(): ReturnType<MissionEngine["getInMissionSummary"]> {
        return this.missionEngine.getInMissionSummary()
    }

    getSerializedInMissionSummary(): ReturnType<
        MissionEngine["getSerializedInMissionSummary"]
    > {
        return this.missionEngine.getSerializedInMissionSummary()
    }

    loadSerializedInMissionSummary(
        ...args: Parameters<MissionEngine["loadSerializedInMissionSummary"]>
    ): ReturnType<MissionEngine["loadSerializedInMissionSummary"]> {
        return this.missionEngine.loadSerializedInMissionSummary(...args)
    }

    useActionAndGetResults(): ReturnType<
        MissionEngine["useActionAndGetResults"]
    > {
        return this.missionEngine.useActionAndGetResults()
    }

    getActionResults(): ReturnType<MissionEngine["getActionResults"]> {
        return this.missionEngine.getActionResults()
    }

    getSerializedActionResults(): ReturnType<
        MissionEngine["getSerializedActionResults"]
    > {
        return this.missionEngine.getSerializedActionResults()
    }

    getInProgressMissionObjectives(): ReturnType<
        MissionEngine["getInProgressMissionObjectives"]
    > {
        return this.missionEngine.getInProgressMissionObjectives()
    }

    getCompletedButNotRewardedMissionObjectives(): ReturnType<
        MissionEngine["getCompletedButNotRewardedMissionObjectives"]
    > {
        return this.missionEngine.getCompletedButNotRewardedMissionObjectives()
    }

    getCompletedAndRewardedMissionObjectives(): ReturnType<
        MissionEngine["getCompletedAndRewardedMissionObjectives"]
    > {
        return this.missionEngine.getCompletedAndRewardedMissionObjectives()
    }

    getCurrentAffiliationTurn(): ReturnType<
        MissionEngine["getCurrentAffiliationTurn"]
    > {
        return this.missionEngine.getCurrentAffiliationTurn()
    }

    getCurrentTurnNumber(): ReturnType<MissionEngine["getCurrentTurnNumber"]> {
        return this.missionEngine.getCurrentTurnNumber()
    }

    getSquaddiesWhoCanActThisPhase(): ReturnType<
        MissionEngine["getSquaddiesWhoCanActThisPhase"]
    > {
        return this.missionEngine.getSquaddiesWhoCanActThisPhase()
    }

    getSquaddieInfo(
        ...args: Parameters<MissionEngine["getSquaddieInfo"]>
    ): ReturnType<MissionEngine["getSquaddieInfo"]> {
        return this.missionEngine.getSquaddieInfo(...args)
    }

    getDefeatedSquaddies(): ReturnType<MissionEngine["getDefeatedSquaddies"]> {
        return this.missionEngine.getDefeatedSquaddies()
    }

    markMissionObjectiveAsRewarded(
        ...args: Parameters<MissionEngine["markMissionObjectiveAsRewarded"]>
    ): ReturnType<MissionEngine["markMissionObjectiveAsRewarded"]> {
        return this.missionEngine.markMissionObjectiveAsRewarded(...args)
    }

    previewReadiedActionAndForecastResults(): ReturnType<
        MissionEngine["previewReadiedActionAndForecastResults"]
    > {
        return this.missionEngine.previewReadiedActionAndForecastResults()
    }

    undoLastPlayerUndoableAction(): ReturnType<
        MissionEngine["undoLastPlayerUndoableAction"]
    > {
        return this.missionEngine.undoLastPlayerUndoableAction()
    }

    transitionToNextPhase(): ReturnType<
        MissionEngine["transitionToNextPhase"]
    > {
        return this.missionEngine.transitionToNextPhase()
    }

    getValidSquaddieActions(
        ...args: Parameters<MissionEngine["getValidSquaddieActions"]>
    ): ReturnType<MissionEngine["getValidSquaddieActions"]> {
        return this.missionEngine.getValidSquaddieActions(...args)
    }

    getMapDimensions(): ReturnType<MissionEngine["getMapDimensions"]> {
        return this.missionEngine.getMapDimensions()
    }

    getTerrainAtCoordinate(
        ...args: Parameters<MissionEngine["getTerrainAtCoordinate"]>
    ): ReturnType<MissionEngine["getTerrainAtCoordinate"]> {
        return this.missionEngine.getTerrainAtCoordinate(...args)
    }

    getAllSquaddiePositions(): ReturnType<
        MissionEngine["getAllSquaddiePositions"]
    > {
        return this.missionEngine.getAllSquaddiePositions()
    }

    getSquaddiePosition(
        ...args: Parameters<MissionEngine["getSquaddiePosition"]>
    ): ReturnType<MissionEngine["getSquaddiePosition"]> {
        return this.missionEngine.getSquaddiePosition(...args)
    }

    getSquaddieAtCoordinate(
        ...args: Parameters<MissionEngine["getSquaddieAtCoordinate"]>
    ): ReturnType<MissionEngine["getSquaddieAtCoordinate"]> {
        return this.missionEngine.getSquaddieAtCoordinate(...args)
    }

    getActionById(
        ...args: Parameters<MissionEngine["getActionById"]>
    ): ReturnType<MissionEngine["getActionById"]> {
        return this.missionEngine.getActionById(...args)
    }

    getLiniSquaddieId(): BattleSquaddieId {
        return this.liniSquaddieId!
    }

    getSlitherDemonSquaddieId(): BattleSquaddieId {
        return this.slitherDemonSquaddieId!
    }
}
