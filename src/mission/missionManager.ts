import type { MissionState } from "./missionState"
import { MissionAffiliationTurn, type TMissionAffiliationTurn, } from "./missionTurn"
import type { BattleSquaddieId, InBattleSquaddieManager, } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { MissionObjectiveRewardType } from "./missionObjectiveReward"
import type { MissionObjective } from "./missionObjective"
import { MissionObjectiveService } from "./missionObjective"
import {
    type ForecastedActionResult,
    type SquaddieActionDecisions,
    SquaddieActionResultCalculator,
} from "../squaddieAction/calculate/result/squaddieActionResultCalculator"
import type { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"
import { ApplyResultService } from "../squaddieAction/apply/applyResultService"
import type { SquaddieAction } from "../squaddieAction/squaddieAction"
import { type MissionHistory, MissionHistoryService, } from "./history/missionHistory"
import { MissionTurnHistoryEntryService } from "./history/missionTurnHistoryEntry"
import { SquaddieTurnRecordService } from "./history/squaddieTurnRecord"
import type { SquaddieTurnActionRecord } from "./history/squaddieTurnActionRecord"
import { SquaddieTurnActionRecordService } from "./history/squaddieTurnActionRecord"
import { type InMissionSummary, InMissionSummaryService, } from "./inMissionSummary"
import type { SerializedCoordinateMap } from "../coordinateMap/coordinateMap"

export class MissionManager {
    missionState?: MissionState
    inBattleSquaddieManager?: InBattleSquaddieManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager

    constructor({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    }: {
        missionState?: MissionState
        inBattleSquaddieManager?: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
        squaddieActionManager?: SquaddieActionManager
    } = {}) {
        this.missionState = missionState
        this.inBattleSquaddieManager = inBattleSquaddieManager
        this.coordinateMapCollectionManager = coordinateMapCollectionManager
        this.squaddieActionManager = squaddieActionManager
    }

    hasMissionEnded(): boolean {
        this.throwIfStateIsUndefined(this.hasMissionEnded.name)

        return this.missionState!.objectives.some((objective) => {
            const hasMissionEndsReward = objective.rewards.some(
                (reward) =>
                    reward.type === MissionObjectiveRewardType.MISSION_ENDS
            )
            return hasMissionEndsReward && objective.hasGivenReward
        })
    }

    shouldCheckMissionObjectives(): boolean {
        this.throwIfStateIsUndefined(this.shouldCheckMissionObjectives.name)

        const currentPhase = this.missionState!.turn.missionAffiliationTurn
        const phasesToCheck: TMissionAffiliationTurn[] = [
            MissionAffiliationTurn.TURN_START,
            MissionAffiliationTurn.TURN_END,
            MissionAffiliationTurn.PLAYER_TURN_START,
            MissionAffiliationTurn.PLAYER_TURN_END,
            MissionAffiliationTurn.ALLY_TURN_START,
            MissionAffiliationTurn.ALLY_TURN_END,
            MissionAffiliationTurn.ENEMY_TURN_START,
            MissionAffiliationTurn.ENEMY_TURN_END,
            MissionAffiliationTurn.NONE_AFFILIATION_TURN_START,
            MissionAffiliationTurn.NONE_AFFILIATION_TURN_END,
        ]

        if (phasesToCheck.includes(currentPhase)) {
            return true
        }

        return this.lastActingSquaddieCannotAct()
    }

    calculateCompletedButNotRewardedMissionObjectives(): MissionObjective[] {
        this.throwIfStateIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )

        return MissionObjectiveService.getCompletedObjectivesWithoutReward(
            this.missionState!.objectives,
            this.inBattleSquaddieManager!
        )
    }

    setMissionObjectiveAsRewarded(objectiveId: string): void {
        this.throwIfStateIsUndefined(this.setMissionObjectiveAsRewarded.name)

        const updatedObjectives = this.missionState!.objectives.map(
            (objective) => {
                if (objective.id === objectiveId) {
                    return MissionObjectiveService.markRewardAsGiven(objective)
                }
                return objective
            }
        )

        this.missionState = {
            ...this.missionState!,
            objectives: updatedObjectives,
        }
    }

    useActionAndGetResults({
        actor,
        targets,
        action,
        rollGenerator,
    }: {
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        targets: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
        action: {
            id: string
            decisions?: SquaddieActionDecisions
        }
        rollGenerator: RollGenerator
    }): {
        actorRoll: [number, number]
        targetResults: Map<
            string,
            {
                degreeOfSuccess: TDegreeOfSuccess
                squaddieActionResults: SquaddieActionResult[]
            }
        >
    } {
        this.throwIfStateIsUndefined(this.useActionAndGetResults.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.useActionAndGetResults.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.useActionAndGetResults.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.useActionAndGetResults.name
        )

        const calculationResults =
            SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                actor,
                targets,
                action,
                managers: {
                    inBattleSquaddieManager: this.inBattleSquaddieManager!,
                    squaddieActionManager: this.squaddieActionManager!,
                    coordinateMapCollectionManager:
                        this.coordinateMapCollectionManager!,
                },
                rollGenerator,
                map: {
                    mapId: this.missionState!.mapId,
                },
            })

        const fullAction = this.squaddieActionManager!.get(action.id)

        for (const [
            _targetKey,
            targetResult,
        ] of calculationResults.targetResults) {
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager: this.inBattleSquaddieManager!,
                results: targetResult.squaddieActionResults,
                map: {
                    mapId: this.missionState!.mapId,
                    manager: this.coordinateMapCollectionManager!,
                },
            })

            this.recordAction({
                action: fullAction,
                results: targetResult.squaddieActionResults,
            })
        }

        return calculationResults
    }

    recordAction({
        action,
        results,
    }: {
        action: SquaddieAction
        results: SquaddieActionResult[]
    }): void {
        this.throwIfStateIsUndefined(this.recordAction.name)

        if (this.missionState!.history == undefined) {
            this.missionState = {
                ...this.missionState!,
                history: MissionHistoryService.new(),
            }
        }

        const currentTurn = this.missionState!.turn
        const squaddieTurnActionRecord = SquaddieTurnActionRecordService.new({
            action,
            results,
        })

        let turnEntry = MissionHistoryService.getTurn({
            history: this.missionState!.history!,
            turnNumber: currentTurn.turnCount,
        })

        turnEntry ??= MissionTurnHistoryEntryService.new({
            turnNumber: currentTurn.turnCount,
            missionAffiliationTurn: currentTurn.missionAffiliationTurn,
            squaddieTurnRecords: [],
        })

        for (const result of results) {
            let squaddieTurnRecord =
                MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                    turnHistoryEntry: turnEntry,
                    squaddieId: {
                        inBattleSquaddieId: result.inBattleSquaddieId,
                        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
                    },
                })

            squaddieTurnRecord ??= SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: result.inBattleSquaddieId,
                    outOfBattleSquaddieId: result.outOfBattleSquaddieId,
                },
                actions: [],
            })

            squaddieTurnRecord = SquaddieTurnRecordService.addAction({
                squaddieTurnRecord: squaddieTurnRecord,
                action: squaddieTurnActionRecord,
            })

            turnEntry =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: turnEntry,
                    squaddieTurnRecord: squaddieTurnRecord,
                })
        }

        const updatedHistory = MissionHistoryService.addOrUpdateTurn({
            history: this.missionState!.history!,
            turnEntry,
        })

        this.missionState = {
            ...this.missionState!,
            history: updatedHistory,
        }
    }

    getTotalActionCount(): number {
        this.throwIfStateIsUndefined(this.getTotalActionCount.name)

        if (this.missionState!.history == undefined) return 0

        return MissionHistoryService.getTotalActionCount(
            this.missionState!.history
        )
    }

    getCompletedTurnCount(): number {
        this.throwIfStateIsUndefined(this.getCompletedTurnCount.name)

        if (this.missionState!.history == undefined) return 0

        return MissionHistoryService.getTurnCount(this.missionState!.history)
    }

    getActionCountInTurn(turnNumber: number): number | undefined {
        this.throwIfStateIsUndefined(this.getActionCountInTurn.name)

        if (this.missionState!.history == undefined) return undefined

        return MissionHistoryService.getActionCountInTurn({
            history: this.missionState!.history,
            turnNumber,
        })
    }

    getSquaddieActionsInTurn({
        turnNumber,
        squaddieId,
    }: {
        turnNumber: number
        squaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
    }): SquaddieTurnActionRecord[] | undefined {
        this.throwIfStateIsUndefined(this.getSquaddieActionsInTurn.name)

        if (this.missionState!.history == undefined) return undefined

        return MissionHistoryService.getActionsBySquaddieInTurn({
            history: this.missionState!.history,
            turnNumber,
            squaddieId,
        })
    }

    undoLastAction({
        reversingResults,
    }: {
        reversingResults: SquaddieActionResult[]
    }): {
        removedAction: SquaddieTurnActionRecord | undefined
    } {
        this.throwIfStateIsUndefined(this.undoLastAction.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(this.undoLastAction.name)
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.undoLastAction.name
        )

        const { currentTurn, lastAction } = this.getLastAction()

        if (lastAction == undefined || currentTurn == undefined) {
            return { removedAction: undefined }
        }

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
            results: reversingResults,
            map: {
                mapId: this.missionState!.mapId,
                manager: this.coordinateMapCollectionManager!,
            },
        })

        const { missionTurnHistoryEntry: updatedTurn } =
            MissionTurnHistoryEntryService.removeLastAction(currentTurn)

        let updatedHistory: MissionHistory
        if (updatedTurn == undefined) {
            updatedHistory = {
                turns: this.missionState!.history!.turns.filter(
                    (t) => t.turnNumber !== currentTurn.turnNumber
                ),
            }
        } else {
            updatedHistory = MissionHistoryService.addOrUpdateTurn({
                history: this.missionState!.history!,
                turnEntry: updatedTurn,
            })
        }

        this.missionState = {
            ...this.missionState!,
            history: updatedHistory,
        }

        return { removedAction: lastAction }
    }

    createInMissionSummary(): InMissionSummary {
        this.throwIfStateIsUndefined(this.createInMissionSummary.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.createInMissionSummary.name
        )

        return InMissionSummaryService.createFromMission({
            missionObjectives: this.missionState!.objectives,
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
        })
    }

    loadInMissionSummary(InMissionSummary: InMissionSummary): void {
        this.throwIfStateIsUndefined(this.loadInMissionSummary.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.loadInMissionSummary.name
        )

        const updatedObjectives = InMissionSummaryService.applyToMission({
            InMissionSummary,
            missionObjectives: this.missionState!.objectives,
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
        })

        this.missionState = {
            ...this.missionState!,
            objectives: updatedObjectives,
        }
    }

    previewActionResults({
        actor,
        targets,
        action,
    }: {
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        targets: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
        action: {
            id: string
            decisions?: SquaddieActionDecisions
        }
    }): ForecastedActionResult[] {
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.previewActionResults.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.previewActionResults.name
        )

        return SquaddieActionResultCalculator.calculateForecastedResults({
            actor,
            targets,
            action: {
                id: action.id,
                manager: this.squaddieActionManager!,
                decisions: action.decisions,
            },
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
            map: this.missionState?.mapId
                ? {
                      mapId: this.missionState.mapId,
                      manager: this.coordinateMapCollectionManager!,
                  }
                : undefined,
        })
    }

    serializeCoordinateMap(mapId: string): SerializedCoordinateMap {
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.serializeCoordinateMap.name
        )
        return this.coordinateMapCollectionManager!.serializeMap(mapId)
    }

    private throwIfStateIsUndefined(callName: string) {
        if (this.missionState == undefined)
            throw new Error(
                `[MissionManager.${callName}]: state must be defined`
            )
    }

    private throwIfInBattleSquaddieManagerIsUndefined(callName: string) {
        if (this.inBattleSquaddieManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: inBattleSquaddieManager must be defined`
            )
    }

    private throwIfCoordinateMapCollectionManagerIsUndefined(callName: string) {
        if (this.coordinateMapCollectionManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: coordinateMapCollectionManager must be defined`
            )
    }

    private throwIfSquaddieActionManagerIsUndefined(callName: string) {
        if (this.squaddieActionManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: squaddieActionManager must be defined`
            )
    }

    private lastActingSquaddieCannotAct(): boolean {
        if (this.inBattleSquaddieManager == undefined) {
            return false
        }

        const lastActingSquaddie = this.getLastActingSquaddieId()
        if (lastActingSquaddie == undefined) {
            return false
        }

        return !this.inBattleSquaddieManager.canSquaddieAct(lastActingSquaddie)
    }

    private getLastActingSquaddieId(): BattleSquaddieId | undefined {
        if (this.missionState?.history == undefined) {
            return undefined
        }

        const currentTurn = MissionHistoryService.getTurn({
            history: this.missionState.history,
            turnNumber: this.missionState.turn.turnCount,
        })

        if (currentTurn == undefined) {
            return undefined
        }

        for (let i = currentTurn.squaddieTurnRecords.length - 1; i >= 0; i--) {
            const squaddieRecord = currentTurn.squaddieTurnRecords[i]
            if (squaddieRecord.actions.length > 0) {
                return SquaddieTurnRecordService.getActingBattleSquaddieId(
                    squaddieRecord
                )
            }
        }

        return undefined
    }
    private getLastAction() {
        if (this.missionState!.history == undefined) {
            return { lastAction: undefined }
        }

        const currentTurn = MissionHistoryService.getTurn({
            history: this.missionState!.history,
            turnNumber: this.missionState!.turn.turnCount,
        })

        if (currentTurn == undefined) {
            return { lastAction: undefined }
        }

        const lastAction =
            MissionTurnHistoryEntryService.getLastAction(currentTurn)

        if (lastAction == undefined) {
            return { lastAction: undefined }
        }

        return { lastAction, currentTurn }
    }
}
