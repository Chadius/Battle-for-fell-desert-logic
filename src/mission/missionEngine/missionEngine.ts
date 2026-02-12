import { MissionManager } from "../missionManager"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "../history/squaddieTurnActionRecord"
import {
    type InMissionSummary,
    InMissionSummaryService,
    type SerializedInMissionSummary,
} from "../inMissionSummary"
import {
    type SerializedForecastedActionResult,
    SquaddieActionResultCalculator,
} from "../../squaddieAction/calculate/result/squaddieActionResultCalculator"
import { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator"
import type { TDegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "../../squaddieAction/calculate/result/squaddieActionResult"
import type { MissionObjective } from "../missionObjective"
import { MissionObjectiveService } from "../missionObjective"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieInfo } from "../../squaddie/inBattle/squaddieInfo"
import {
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "../missionTurn"
import {
    type ActionResult,
    ActionResultsService,
    type SerializedActionResults,
} from "../actionResult"
import type { TargetResult } from "../targetResult"
import {
    type ReadiedAction,
    ReadiedActionService,
    type SerializedReadiedAction,
} from "../readiedAction"
import type { TSquaddieAffiliation } from "../../affiliation/affiliation"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import {
    SquaddieActionValidationService,
    type SquaddieActionValidity,
    type ValidSquaddieActionOption,
} from "../../squaddieAction/calculate/validity/squaddieActionValidationService"
import type { OffsetMaybeOffmapCoordinate } from "../../coordinateMap/coordinateMap"
import type { OffsetCoordinate } from "../../coordinateMap/offsetCoordinate"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"

export interface MapTileInfo {
    row: number
    col: number
    movementCost: number | undefined
    canStop: boolean
    squaddieId: BattleSquaddieId | undefined
}

export interface MapOverview {
    width: number
    height: number
    tiles: MapTileInfo[][]
}

export class MissionEngine {
    missionManager?: MissionManager
    readiedAction?: ReadiedAction
    rollGenerator: RollGenerator
    actionResults?: ActionResult

    constructor(
        missionManager?: MissionManager,
        rollGenerator?: RollGenerator
    ) {
        this.missionManager = missionManager
        this.rollGenerator = rollGenerator ?? new RollGenerator()
    }

    readyAction({ actor, targets, action }: ReadiedAction): {
        isValid: boolean
    } {
        this.readiedAction = ReadiedActionService.new({
            actor,
            targets,
            action,
        })
        return { isValid: true }
    }

    getReadiedAction(): ReadiedAction | undefined {
        return this.readiedAction
    }

    getSerializedReadiedAction(): SerializedReadiedAction | undefined {
        if (!this.readiedAction) {
            return undefined
        }
        return ReadiedActionService.serialize(this.readiedAction)
    }

    cancelReadiedAction(): void {
        this.readiedAction = undefined
    }

    isDone(): boolean {
        this.throwIfMissionManagerIsUndefined(this.isDone.name)
        return this.missionManager!.hasMissionEnded()
    }

    getInMissionSummary(): InMissionSummary {
        this.throwIfMissionManagerIsUndefined(this.getInMissionSummary.name)
        return this.missionManager!.createInMissionSummary()
    }

    getSerializedInMissionSummary(): SerializedInMissionSummary {
        this.throwIfMissionManagerIsUndefined(
            this.getSerializedInMissionSummary.name
        )
        const inMissionSummary = this.missionManager!.createInMissionSummary()
        return InMissionSummaryService.serialize(inMissionSummary)
    }

    loadSerializedInMissionSummary(
        serializable: SerializedInMissionSummary
    ): void {
        this.throwIfMissionManagerIsUndefined(
            this.loadSerializedInMissionSummary.name
        )
        const inMissionSummary =
            InMissionSummaryService.deserialize(serializable)
        this.missionManager!.loadInMissionSummary(inMissionSummary)
    }

    useActionAndGetResults(): ActionResult {
        this.throwIfMissionManagerIsUndefined(this.useActionAndGetResults.name)
        this.throwIfReadiedActionIsUndefined(this.useActionAndGetResults.name)

        const managerResults = this.missionManager!.useActionAndGetResults({
            ...this.readiedAction!,
            rollGenerator: this.rollGenerator,
        })

        const targetResults: { [squaddieKey: string]: TargetResult } = {}
        this.serializeTargetResults(managerResults, targetResults)

        this.actionResults = {
            actorRoll: managerResults.actorRoll,
            targetResults,
        }

        this.readiedAction = undefined

        this.checkAndUpdateMissionObjectives()

        return this.actionResults
    }

    private checkAndUpdateMissionObjectives(): void {
        if (!this.missionManager!.shouldCheckMissionObjectives()) {
            return
        }

        const completedObjectives =
            this.missionManager!.calculateCompletedButNotRewardedMissionObjectives()

        for (const missionObjective of completedObjectives) {
            this.missionManager!.setMissionObjectiveAsRewarded(
                missionObjective.id
            )
        }
    }

    private serializeTargetResults(
        managerResults: {
            actorRoll: [number, number]
            targetResults: Map<
                string,
                {
                    degreeOfSuccess: TDegreeOfSuccess
                    squaddieActionResults: SquaddieActionResult[]
                }
            >
        },
        targetResults: { [p: string]: TargetResult }
    ) {
        managerResults.targetResults.forEach((value, key) => {
            targetResults[key] = value
        })
    }

    getActionResults(): ActionResult | undefined {
        return this.actionResults
    }

    getSerializedActionResults(): SerializedActionResults | undefined {
        if (this.actionResults == undefined) {
            return undefined
        }
        return ActionResultsService.serialize(this.actionResults)
    }

    getInProgressMissionObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getInProgressMissionObjectives.name
        )

        const objectives = this.missionManager!.missionState?.objectives ?? []
        return objectives.filter((objective) => {
            const isComplete = MissionObjectiveService.isComplete(
                objective,
                this.missionManager!.inBattleSquaddieManager!
            )
            return !isComplete && !objective.hasGivenReward
        })
    }

    getCompletedButNotRewardedMissionObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getCompletedButNotRewardedMissionObjectives.name
        )

        return this.missionManager!.calculateCompletedButNotRewardedMissionObjectives()
    }

    getCompletedAndRewardedMissionObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getCompletedAndRewardedMissionObjectives.name
        )

        const objectives = this.missionManager!.missionState?.objectives ?? []
        return objectives.filter((objective) => objective.hasGivenReward)
    }

    getCurrentAffiliationTurn(): TMissionAffiliationTurn {
        this.throwIfMissionManagerIsUndefined(
            this.getCurrentAffiliationTurn.name
        )
        return this.missionManager!.missionState!.turn.missionAffiliationTurn
    }

    getCurrentTurnNumber(): number {
        this.throwIfMissionManagerIsUndefined(this.getCurrentTurnNumber.name)
        return this.missionManager!.missionState!.turn.turnCount
    }

    getSquaddiesWhoCanActThisPhase(): BattleSquaddieId[] {
        this.throwIfMissionManagerIsUndefined(
            this.getSquaddiesWhoCanActThisPhase.name
        )

        const currentAffiliationTurn = this.getCurrentAffiliationTurn()
        const affiliation =
            MissionTurnService.getSquaddieAffiliationForAffiliationTurn(
                currentAffiliationTurn
            )

        if (affiliation == undefined) {
            return []
        }

        const inBattleSquaddieManager =
            this.missionManager!.inBattleSquaddieManager
        if (inBattleSquaddieManager == undefined) {
            return []
        }

        const allSquaddiesOfAffiliation =
            inBattleSquaddieManager.getAllSquaddiesOfAffiliation(affiliation)

        return allSquaddiesOfAffiliation.filter((squaddieId) =>
            inBattleSquaddieManager.canSquaddieAct({
                battleSquaddieId: squaddieId,
            })
        )
    }

    getSquaddieInfo(squaddieId: BattleSquaddieId): SquaddieInfo {
        this.throwIfMissionManagerIsUndefined(this.getSquaddieInfo.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getSquaddieInfo.name
        )

        return this.missionManager!.inBattleSquaddieManager!.getSquaddieInfo(
            squaddieId
        )
    }

    getDefeatedSquaddies(): BattleSquaddieId[] {
        this.throwIfMissionManagerIsUndefined(this.getDefeatedSquaddies.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getDefeatedSquaddies.name
        )

        const inBattleSquaddieManager =
            this.missionManager!.inBattleSquaddieManager!

        const allSquaddies = inBattleSquaddieManager.getAllSquaddies()

        return allSquaddies.filter((squaddieId) =>
            inBattleSquaddieManager.isSquaddieDefeated(squaddieId)
        )
    }

    markMissionObjectiveAsRewarded(objectiveId: string): void {
        this.throwIfMissionManagerIsUndefined(
            this.markMissionObjectiveAsRewarded.name
        )

        const objectives = this.missionManager!.missionState?.objectives ?? []
        const objective = objectives.find((obj) => obj.id === objectiveId)

        if (objective == undefined) {
            throw new Error(
                `[MissionEngine.${this.markMissionObjectiveAsRewarded.name}]: objective not found`
            )
        }

        if (objective.hasGivenReward) {
            return
        }

        const isComplete = MissionObjectiveService.isComplete(
            objective,
            this.missionManager!.inBattleSquaddieManager!
        )

        if (!isComplete) {
            throw new Error(
                `[MissionEngine.${this.markMissionObjectiveAsRewarded.name}]: objective is not complete`
            )
        }

        this.missionManager!.setMissionObjectiveAsRewarded(objectiveId)
    }

    previewReadiedActionAndForecastResults(): SerializedForecastedActionResult[] {
        this.throwIfMissionManagerIsUndefined(
            this.previewReadiedActionAndForecastResults.name
        )
        this.throwIfReadiedActionIsUndefined(
            this.previewReadiedActionAndForecastResults.name
        )

        const forecastedActionResults =
            this.missionManager!.previewActionResults({
                actor: this.readiedAction!.actor,
                targets: this.readiedAction!.targets,
                action: this.readiedAction!.action,
            })

        return forecastedActionResults.map(
            SquaddieActionResultCalculator.serializeForecastedActionResult
        )
    }

    undoLastPlayerUndoableAction(): {
        success: boolean
        removedAction?: SquaddieTurnActionRecord
        reason?: string
    } {
        this.throwIfMissionManagerIsUndefined(
            this.undoLastPlayerUndoableAction.name
        )

        const lastSquaddieTurnActionRecord =
            this.missionManager!.getLastSquaddieTurnActionRecord()
        if (lastSquaddieTurnActionRecord == undefined) {
            return { success: false, reason: "no action to undo" }
        }

        const squaddieAffiliations: Map<string, TSquaddieAffiliation> = new Map(
            lastSquaddieTurnActionRecord.results.map((result) => {
                const battleSquaddieId =
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: result.inBattleSquaddieId,
                        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
                    })
                const squaddieAffiliation =
                    this.missionManager!.getSquaddieAffiliation({
                        inBattleSquaddieId: result.inBattleSquaddieId,
                        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
                    })
                return [battleSquaddieId, squaddieAffiliation]
            })
        )

        const squaddieAction = this.missionManager!.squaddieActionManager?.get(
            lastSquaddieTurnActionRecord.action.id
        )

        if (
            !SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                squaddieTurnActionRecord: lastSquaddieTurnActionRecord,
                squaddieAffiliations,
                squaddieAction,
            })
        ) {
            return { success: false, reason: "action cannot be undone" }
        }

        const reversingResults = lastSquaddieTurnActionRecord.results.map(
            (result) => SquaddieActionResultCalculator.reverseResult(result)
        )

        const { removedAction } = this.missionManager!.undoLastAction({
            reversingResults,
        })

        return { success: true, removedAction }
    }

    transitionToNextPhase(): SerializedSquaddieActionResult[] {
        this.throwIfMissionManagerIsUndefined(this.transitionToNextPhase.name)

        const results = this.missionManager!.transitionToNextPhase()

        return results.map(SquaddieActionResultService.serialize)
    }

    getValidSquaddieActions(
        actor: BattleSquaddieId
    ): ValidSquaddieActionOption[] {
        this.throwIfMissionManagerIsUndefined(this.getValidSquaddieActions.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getValidSquaddieActions.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getValidSquaddieActions.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getValidSquaddieActions.name
        )

        return SquaddieActionValidationService.generateValidSquaddieActions({
            actor,
            managers: {
                inBattleSquaddieManager:
                    this.missionManager!.inBattleSquaddieManager!,
                squaddieActionManager:
                    this.missionManager!.squaddieActionManager!,
                coordinateMapCollectionManager:
                    this.missionManager!.coordinateMapCollectionManager!,
            },
            map: { mapId: this.missionManager!.missionState!.mapId },
        })
    }

    getSquaddieActionValidity(actor: BattleSquaddieId): SquaddieActionValidity {
        this.throwIfMissionManagerIsUndefined(
            this.getSquaddieActionValidity.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getSquaddieActionValidity.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getSquaddieActionValidity.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getSquaddieActionValidity.name
        )

        return SquaddieActionValidationService.categorizeSquaddieActions({
            actor,
            managers: {
                inBattleSquaddieManager:
                    this.missionManager!.inBattleSquaddieManager!,
                squaddieActionManager:
                    this.missionManager!.squaddieActionManager!,
                coordinateMapCollectionManager:
                    this.missionManager!.coordinateMapCollectionManager!,
            },
            map: { mapId: this.missionManager!.missionState!.mapId },
        })
    }

    getMapDimensions(): { width: number; height: number } {
        this.throwIfMissionManagerIsUndefined(this.getMapDimensions.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getMapDimensions.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        return this.missionManager!.coordinateMapCollectionManager!.getMapDimensions(
            mapId
        )
    }

    getMapOverview(): MapOverview {
        this.throwIfMissionManagerIsUndefined(this.getMapOverview.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getMapOverview.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        const coordinateMap =
            this.missionManager!.coordinateMapCollectionManager!.getMapById(
                mapId
            )

        const height = coordinateMap.coordinates.length
        const width = coordinateMap.coordinates[0].length

        const tiles: MapTileInfo[][] = coordinateMap.coordinates.map((row) =>
            row.map((coordinate) => ({
                row: coordinate.row,
                col: coordinate.col,
                movementCost: coordinate.movementCost,
                canStop: coordinate.canStop,
                squaddieId: coordinate.squaddieId
                    ? {
                          outOfBattleSquaddieId:
                              coordinate.squaddieId.outOfBattleSquaddieId,
                          inBattleSquaddieId:
                              coordinate.squaddieId.inBattleSquaddieId,
                      }
                    : undefined,
            }))
        )

        return { width, height, tiles }
    }

    getTerrainAtCoordinate(coordinate: OffsetCoordinate): {
        movementCost: number | undefined
        canStop: boolean
    } {
        this.throwIfMissionManagerIsUndefined(this.getTerrainAtCoordinate.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getTerrainAtCoordinate.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        return this.missionManager!.coordinateMapCollectionManager!.getMovementPropertiesAtCoordinate(
            {
                id: mapId,
                row: coordinate.row,
                col: coordinate.col,
            }
        )
    }

    getAllSquaddiePositions(): Array<{
        squaddieId: BattleSquaddieId
        coordinate: OffsetMaybeOffmapCoordinate
    }> {
        this.throwIfMissionManagerIsUndefined(this.getAllSquaddiePositions.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getAllSquaddiePositions.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        return this.missionManager!.coordinateMapCollectionManager!.getAllSquaddieCoordinatesOnMap(
            mapId
        )
    }

    getSquaddiePosition(
        squaddieId: BattleSquaddieId
    ): OffsetMaybeOffmapCoordinate | undefined {
        this.throwIfMissionManagerIsUndefined(this.getSquaddiePosition.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getSquaddiePosition.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        return this.missionManager!.coordinateMapCollectionManager!.getSquaddieCoordinate(
            {
                mapId,
                squaddieId,
            }
        )
    }

    getSquaddieAtCoordinate(
        coordinate: OffsetCoordinate
    ): BattleSquaddieId | undefined {
        this.throwIfMissionManagerIsUndefined(this.getSquaddieAtCoordinate.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getSquaddieAtCoordinate.name
        )

        const mapId = this.missionManager!.missionState!.mapId
        return this.missionManager!.coordinateMapCollectionManager!.getSquaddieAtCoordinate(
            {
                mapId,
                coordinate,
            }
        )
    }

    getActionById(actionId: string): SquaddieAction {
        this.throwIfMissionManagerIsUndefined(this.getActionById.name)
        this.throwIfSquaddieActionManagerIsUndefined(this.getActionById.name)

        return this.missionManager!.squaddieActionManager!.get(actionId)
    }

    private throwIfMissionManagerIsUndefined(callingFunction: string): void {
        if (this.missionManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: missionManager is undefined`
            )
        }
    }

    private throwIfReadiedActionIsUndefined(callingFunction: string): void {
        if (this.readiedAction == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: readiedAction is undefined`
            )
        }
    }

    private throwIfInBattleSquaddieManagerIsUndefined(
        callingFunction: string
    ): void {
        if (this.missionManager?.inBattleSquaddieManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: inBattleSquaddieManager is undefined`
            )
        }
    }

    private throwIfSquaddieActionManagerIsUndefined(
        callingFunction: string
    ): void {
        if (this.missionManager?.squaddieActionManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: squaddieActionManager is undefined`
            )
        }
    }

    private throwIfCoordinateMapCollectionManagerIsUndefined(
        callingFunction: string
    ): void {
        if (this.missionManager?.coordinateMapCollectionManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: coordinateMapCollectionManager is undefined`
            )
        }
    }
}
