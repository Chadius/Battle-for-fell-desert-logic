import type { MissionState } from "./missionState"
import {
    MissionAffiliationTurn,
    type MissionTurn,
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "./missionTurn"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
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
import {
    type MissionHistory,
    MissionHistoryService,
} from "./history/missionHistory"
import { MissionTurnHistoryEntryService } from "./history/missionTurnHistoryEntry"
import { SquaddieTurnRecordService } from "./history/squaddieTurnRecord"
import type { SquaddieTurnActionRecord } from "./history/squaddieTurnActionRecord"
import { SquaddieTurnActionRecordService } from "./history/squaddieTurnActionRecord"
import {
    type InMissionSummary,
    InMissionSummaryService,
} from "./inMissionSummary"
import type { SerializedCoordinateMap } from "../coordinateMap/coordinateMap"
import { type TSquaddieAffiliation } from "../affiliation/affiliation"
import { SquaddieActionValidationService } from "../squaddieAction/calculate/validity/squaddieActionValidationService"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate"
import { AoeTargetResolutionService } from "../squaddieAction/calculate/aoe/aoeTargetResolutionService"
import {
    type SquaddieCondition,
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    type TSquaddieConditionDecaysAt,
    type TSquaddieConditionType,
} from "../proficiency/squaddieCondition"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"

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
                    reward.type === MissionObjectiveRewardType.MISSION_ENDS ||
                    reward.type === MissionObjectiveRewardType.MISSION_FAILURE
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
        actorRoll?: [number, number]
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

            if (targetResult.squaddieActionResults.length > 0) {
                this.recordAction({
                    action: fullAction,
                    results: targetResult.squaddieActionResults,
                })
            }
        }
        this.removeDefeatedSquaddiesFromMap(actor, targets)
        this.applyMultipleAttackPenalty(fullAction, actor)

        return calculationResults
    }

    private readonly applyMultipleAttackPenalty = (
        fullAction: SquaddieAction,
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
    ) => {
        if (fullAction.multipleAttackPenalty.contribution > 0) {
            this.inBattleSquaddieManager!.incrementAttackContributionThisTurn({
                inBattleSquaddieId: actor.inBattleSquaddieId,
                outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
                amount: fullAction.multipleAttackPenalty.contribution,
            })
        }
    }
    private readonly removeDefeatedSquaddiesFromMap = (
        actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string },
        targets: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
    ) => {
        const involvedSquaddies = [
            actor,
            ...targets.map((t) => ({
                inBattleSquaddieId: t.inBattleSquaddieId,
                outOfBattleSquaddieId: t.outOfBattleSquaddieId,
            })),
        ]

        for (const squaddieId of involvedSquaddies) {
            if (this.inBattleSquaddieManager!.isSquaddieDefeated(squaddieId)) {
                this.coordinateMapCollectionManager!.removeSquaddie({
                    mapId: this.missionState!.mapId,
                    squaddieId: squaddieId,
                })
            }
        }
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

    getActionCountInTurn(turnNumber: number): number | undefined {
        this.throwIfStateIsUndefined(this.getActionCountInTurn.name)

        if (this.missionState!.history == undefined) return undefined

        return MissionHistoryService.getActionCountInTurn({
            history: this.missionState!.history,
            turnNumber,
        })
    }

    getLastSquaddieTurnActionRecord(): SquaddieTurnActionRecord | undefined {
        this.throwIfStateIsUndefined(this.getLastSquaddieTurnActionRecord.name)

        const { lastAction } = this.getLastAction()
        return lastAction
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

        const mapId = this.missionState!.mapId
        let mapName = ""
        try {
            mapName =
                this.coordinateMapCollectionManager?.getMapById(mapId)?.name ??
                ""
        } catch {
            mapName = ""
        }

        return InMissionSummaryService.createFromMission({
            mapId,
            mapName,
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

    resolveAoeTargets({
        actor,
        action,
        targetCoordinate,
    }: {
        actor: BattleSquaddieId
        action: { id: string }
        targetCoordinate: OffsetCoordinate
    }): BattleSquaddieId[] {
        this.throwIfStateIsUndefined(this.resolveAoeTargets.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.resolveAoeTargets.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.resolveAoeTargets.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.resolveAoeTargets.name
        )

        const fullAction = this.squaddieActionManager!.get(action.id)
        return AoeTargetResolutionService.resolveAoeTargets({
            action: fullAction,
            actor,
            targetCoordinate,
            mapId: this.missionState!.mapId,
            managers: {
                coordinateMapCollectionManager:
                    this.coordinateMapCollectionManager!,
                inBattleSquaddieManager: this.inBattleSquaddieManager!,
            },
        })
    }

    getMovementOptionsWithCosts(
        actor: BattleSquaddieId
    ): Array<{ destination: OffsetCoordinate; actionPointCost: number }> {
        this.throwIfStateIsUndefined(this.getMovementOptionsWithCosts.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )

        const currentActionPoints =
            this.inBattleSquaddieManager!.getActionPoints(actor)

        const options =
            SquaddieActionValidationService.generateValidSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager: this.inBattleSquaddieManager!,
                    squaddieActionManager: this.squaddieActionManager!,
                    coordinateMapCollectionManager:
                        this.coordinateMapCollectionManager!,
                },
                map: { mapId: this.missionState!.mapId },
            })

        return options
            .filter((option) => option.decisions.targetDestination != undefined)
            .map((option) => ({
                destination: option.decisions.targetDestination!,
                actionPointCost:
                    currentActionPoints.current -
                    option.actionPointsRemaining.current,
            }))
    }

    getTargetDestinationsForAction(
        actor: BattleSquaddieId,
        actionId: string
    ): Array<{ destination: OffsetCoordinate; actionPointCost: number }> {
        this.throwIfStateIsUndefined(this.getTargetDestinationsForAction.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )

        const squaddieAction = this.squaddieActionManager!.get(actionId)
        const currentActionPoints =
            this.inBattleSquaddieManager!.getActionPoints(actor)

        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent
        if (
            actionPointCost != undefined &&
            actionPointCost !== "all" &&
            actionPointCost > currentActionPoints.current
        ) {
            return []
        }
        if (actionPointCost === "all" && currentActionPoints.current <= 0) {
            return []
        }

        const options =
            SquaddieActionValidationService.generateMovementOptionsForAction({
                actor,
                squaddieAction,
                managers: {
                    inBattleSquaddieManager: this.inBattleSquaddieManager!,
                    squaddieActionManager: this.squaddieActionManager!,
                    coordinateMapCollectionManager:
                        this.coordinateMapCollectionManager!,
                },
                map: { mapId: this.missionState!.mapId },
                currentActionPoints,
            })

        return options
            .filter((option) => option.decisions.targetDestination != undefined)
            .map((option) => ({
                destination: option.decisions.targetDestination!,
                actionPointCost:
                    currentActionPoints.current -
                    option.actionPointsRemaining.current,
            }))
    }

    serializeCoordinateMap(mapId: string): SerializedCoordinateMap {
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.serializeCoordinateMap.name
        )
        return this.coordinateMapCollectionManager!.serializeMap(mapId)
    }

    getSquaddieAffiliation({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): TSquaddieAffiliation {
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getSquaddieAffiliation.name
        )
        return this.inBattleSquaddieManager!.getSquaddieAffiliation({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })
    }

    calculateNextPhase(): MissionTurn {
        this.throwIfStateIsUndefined(this.calculateNextPhase.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.calculateNextPhase.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.calculateNextPhase.name
        )

        const coordinateMap = this.coordinateMapCollectionManager!.getMapById(
            this.missionState!.mapId
        )

        return MissionTurnService.calculateNextPhase({
            missionTurn: this.missionState!.turn,
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
            coordinateMap,
        })
    }

    transitionToNextPhase(): SquaddieActionResult[] {
        this.throwIfStateIsUndefined(this.transitionToNextPhase.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.transitionToNextPhase.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.transitionToNextPhase.name
        )

        const currentPhase = this.missionState!.turn.missionAffiliationTurn

        this.resetActionPointsForNextAffiliationsIfNeeded(currentPhase)
        const decayResults =
            this.decayConditionsForAffiliationIfNeeded(currentPhase)

        const nextTurn = this.calculateNextPhase()

        this.missionState = {
            ...this.missionState!,
            turn: nextTurn,
        }

        return decayResults
    }

    private decayConditionsForAffiliationIfNeeded(
        currentPhase: TMissionAffiliationTurn
    ): SquaddieActionResult[] {
        const turnEndPhases = new Set<TMissionAffiliationTurn>([
            MissionAffiliationTurn.PLAYER_TURN_END,
            MissionAffiliationTurn.ALLY_TURN_END,
            MissionAffiliationTurn.ENEMY_TURN_END,
            MissionAffiliationTurn.NONE_AFFILIATION_TURN_END,
        ])
        const turnStartPhases = new Set<TMissionAffiliationTurn>([
            MissionAffiliationTurn.PLAYER_TURN_START,
            MissionAffiliationTurn.ALLY_TURN_START,
            MissionAffiliationTurn.ENEMY_TURN_START,
            MissionAffiliationTurn.NONE_AFFILIATION_TURN_START,
        ])

        let decaysAt: TSquaddieConditionDecaysAt | undefined
        if (turnEndPhases.has(currentPhase)) {
            decaysAt = SquaddieConditionDecaysAt.TURN_END
        } else if (turnStartPhases.has(currentPhase)) {
            decaysAt = SquaddieConditionDecaysAt.TURN_START
        } else {
            return []
        }

        const affiliation =
            MissionTurnService.getSquaddieAffiliationForAffiliationTurn(
                currentPhase
            )
        if (affiliation == undefined) return []

        const results: SquaddieActionResult[] = []
        const battleSquaddieIds =
            this.inBattleSquaddieManager!.getAllSquaddiesOfAffiliation(
                affiliation
            )

        for (const battleSquaddieId of battleSquaddieIds) {
            const dispelledConditions =
                this.inBattleSquaddieManager!.reduceConditionDurationsByOneRound(
                    { ...battleSquaddieId, decaysAt }
                )
            if (dispelledConditions.length == 0) continue

            const dispelledConditionsMap: Map<
                TSquaddieConditionType,
                Omit<SquaddieCondition, "type">[]
            > = new Map(
                dispelledConditions.map((c) => [
                    c,
                    [
                        SquaddieConditionService.new({
                            type: c,
                            duration: {
                                duration: 0,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.PHYSICAL,
                            amount: { amount: 0 },
                        }),
                    ],
                ])
            )

            results.push({
                ...battleSquaddieId,
                dispel: {
                    dispelledConditions: dispelledConditionsMap,
                    conditionTypes: {
                        all: false,
                        types: dispelledConditions,
                    },
                    amount: undefined,
                },
            })
        }

        return results
    }

    private resetActionPointsForNextAffiliationsIfNeeded(
        currentPhase: TMissionAffiliationTurn
    ): void {
        const affiliationsToReset =
            MissionTurnService.getAffiliationsToResetForPhase(currentPhase)

        for (const affiliation of affiliationsToReset) {
            MissionTurnService.resetActionPointsForSquaddieAffiliation({
                inBattleSquaddieManager: this.inBattleSquaddieManager!,
                squaddieAffiliation: affiliation,
            })
        }
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

        return !this.inBattleSquaddieManager.canSquaddieAct({
            battleSquaddieId: lastActingSquaddie,
        })
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
