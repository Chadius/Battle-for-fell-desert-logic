import type { MissionState } from "./missionState.js"
import { MissionStateService } from "./missionState.js"
import {
    type MissionManagerValidationInput,
    MissionManagerValidationService,
} from "./missionManagerValidationService.js"
import {
    MissionAffiliationTurn,
    type MissionTurn,
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "./missionTurn.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { MissionObjectiveRewardType } from "./missionObjectiveReward.js"
import type { MissionObjective } from "./missionObjective.js"
import { MissionObjectiveService } from "./missionObjective.js"
import type { MissionObjectiveCriteriaContext } from "./missionObjectiveCriteria.js"
import {
    type ForecastedActionResult,
    type SquaddieActionDecisions,
    SquaddieActionResultCalculator,
} from "../squaddieAction/calculate/result/squaddieActionResultCalculator.js"
import type { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator.js"
import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult.js"
import { ApplyResultService } from "../squaddieAction/apply/applyResultService.js"
import {
    type MissionHistory,
    MissionHistoryService,
} from "./history/missionHistory.js"
import { MissionTurnHistoryEntryService } from "./history/missionTurnHistoryEntry.js"
import { SquaddieTurnRecordService } from "./history/squaddieTurnRecord.js"
import type { SquaddieTurnActionRecord } from "./history/squaddieTurnActionRecord.js"
import { SquaddieTurnActionRecordService } from "./history/squaddieTurnActionRecord.js"
import {
    type InMissionSummary,
    InMissionSummaryService,
} from "./inMissionSummary.js"
import type { SerializedCoordinateMap } from "../coordinateMap/coordinateMap.js"
import type { SquaddieAction } from "../squaddieAction/squaddieAction.js"
import { type TSquaddieAffiliation } from "../affiliation/affiliation.js"
import { MissionResourceLoader } from "./missionResourceLoader.js"
import { SquaddieActionValidationService } from "../squaddieAction/calculate/validity/squaddieActionValidationService.js"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"
import { AoeTargetResolutionService } from "../squaddieAction/calculate/aoe/aoeTargetResolutionService.js"
import {
    type SquaddieCondition,
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    type TSquaddieConditionDecaysAt,
    type TSquaddieConditionType,
} from "../proficiency/squaddieCondition.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"
import type { MissionDeployment } from "./missionDeployment.js"
import { MovieManager } from "../movie/movieManager.js"
import { MissionStatisticsService } from "./missionStatistics.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import type { TargetResult } from "./targetResult.js"
import {
    type ChallengeModifierSetting,
    ChallengeModifierSettingService,
    ChallengeModifierType,
} from "../squaddieAction/calculate/challengeModifier/challengeModifierSetting.js"
import type { ArmyManager } from "../campaign/army/armyManager.js"
import type { CampaignSquaddie } from "../campaign/army/campaignSquaddie.js"
import { CampaignSquaddieDeploymentManager } from "./campaignSquaddieDeploymentManager.js"
import { CampaignSquaddieMissionBridgeService } from "./campaignSquaddieMissionBridgeService.js"
import { CampaignSquaddieDeploymentCoordinateCollectionService } from "./campaignSquaddieDeploymentCoordinateCollection.js"
import type { CampaignSquaddieDeploymentCoordinate } from "./campaignSquaddieDeploymentCoordinate.js"
import {
    GlossaryManager,
    type ResolvedGlossaryTerm,
} from "../campaign/glossary/glossaryManager.js"

export class MissionManager {
    missionState?: MissionState
    inBattleSquaddieManager?: InBattleSquaddieManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager
    outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
    movieManager?: MovieManager
    armyManager?: ArmyManager
    glossaryManager?: GlossaryManager

    private _loader: MissionResourceLoader | undefined = undefined
    private campaignSquaddieDeploymentManager?: CampaignSquaddieDeploymentManager

    constructor({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
        outOfBattleSquaddieManager,
        movieManager,
        armyManager,
        glossaryManager,
    }: {
        missionState?: MissionState
        inBattleSquaddieManager?: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
        squaddieActionManager?: SquaddieActionManager
        outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
        movieManager?: MovieManager
        armyManager?: ArmyManager
        glossaryManager?: GlossaryManager
    } = {}) {
        this.missionState = missionState
        this.inBattleSquaddieManager = inBattleSquaddieManager
        this.coordinateMapCollectionManager = coordinateMapCollectionManager
        this.squaddieActionManager = squaddieActionManager
        this.outOfBattleSquaddieManager = outOfBattleSquaddieManager
        this.movieManager = movieManager
        this.armyManager = armyManager
        this.glossaryManager = glossaryManager
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

    calculateCompletedButNotRewardedMissionObjectives(
        context?: MissionObjectiveCriteriaContext
    ): MissionObjective[] {
        this.throwIfStateIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )

        return MissionObjectiveService.getCompletedObjectivesWithoutReward(
            this.missionState!.objectives,
            this.inBattleSquaddieManager!,
            context
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
                challengeModifierSetting:
                    this.effectiveChallengeModifierSetting(),
            })

        const fullAction = this.squaddieActionManager!.get(action.id)
        const actorAffiliation =
            this.inBattleSquaddieManager!.getSquaddieAffiliation(actor)
        const targetsByKey = new Map(
            targets.map((target) => [
                SquaddieIdConverterService.squaddieIdToKey(target),
                target,
            ])
        )

        for (const [
            targetKey,
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
                    actor,
                })
            }

            this.recordMissionStatisticsForTarget({
                actorAffiliation,
                target: targetsByKey.get(targetKey)!,
                targetResult,
            })
        }
        this.removeDefeatedSquaddiesFromMap(actor, targets)
        this.applyMultipleAttackPenalty(fullAction, actor)

        return calculationResults
    }

    private effectiveChallengeModifierSetting():
        | ChallengeModifierSetting
        | undefined {
        const challengeModifierSetting =
            this.missionState!.overrides?.challengeModifierSetting

        if (!this.missionState!.overrides?.debugFlags?.trainingWheels)
            return challengeModifierSetting

        return ChallengeModifierSettingService.setFlag({
            challengeModifierSetting:
                challengeModifierSetting ??
                ChallengeModifierSettingService.new(),
            type: ChallengeModifierType.TRAINING_WHEELS,
            value: true,
        })
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
        actor,
    }: {
        action: SquaddieAction
        results: SquaddieActionResult[]
        actor?: BattleSquaddieId
    }): void {
        this.throwIfStateIsUndefined(this.recordAction.name)

        if (this.missionState!.history == undefined) {
            this.missionState = {
                ...this.missionState!,
                history: MissionHistoryService.new(),
            }
        }

        const currentTurn = this.missionState!.turn
        const sequenceNumber = MissionHistoryService.getTotalActionCount(
            this.missionState!.history!
        )
        const squaddieTurnActionRecord = SquaddieTurnActionRecordService.new({
            action,
            results,
            actor,
            sequenceNumber,
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

    private recordMissionStatisticsForTarget({
        actorAffiliation,
        target,
        targetResult,
    }: {
        actorAffiliation: TSquaddieAffiliation
        target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        targetResult: TargetResult
    }): void {
        const targetAffiliation =
            this.inBattleSquaddieManager!.getSquaddieAffiliation(target)
        const { damageNet, damageAbsorbed, healingNet } =
            MissionManager.damageAndHealingTotals(
                targetResult.squaddieActionResults
            )

        this.missionState = {
            ...this.missionState!,
            missionStatistics: MissionStatisticsService.recordActionResult({
                missionStatistics:
                    this.missionState!.missionStatistics ??
                    MissionStatisticsService.new(),
                actorAffiliation,
                targetAffiliation,
                damageNet,
                damageAbsorbed,
                healingNet,
                degreeOfSuccess: targetResult.degreeOfSuccess,
            }),
        }
    }

    private static damageAndHealingTotals(results: SquaddieActionResult[]): {
        damageNet: number
        damageAbsorbed: number
        healingNet: number
    } {
        return results.reduce(
            (totals, result) => ({
                damageNet: totals.damageNet + (result.damage?.net ?? 0),
                damageAbsorbed:
                    totals.damageAbsorbed + (result.damage?.absorbed ?? 0),
                healingNet: totals.healingNet + (result.healing?.net ?? 0),
            }),
            { damageNet: 0, damageAbsorbed: 0, healingNet: 0 }
        )
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
        let mapName
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
            revealHiddenObjectives:
                this.missionState!.overrides?.debugFlags
                    ?.revealHiddenMissionObjectives,
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

    getActiveSquaddieForAffiliation(
        affiliation: TSquaddieAffiliation
    ): BattleSquaddieId | undefined {
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getActiveSquaddieForAffiliation.name
        )

        const inBattleSquaddieManager = this.inBattleSquaddieManager!

        return inBattleSquaddieManager
            .getAllSquaddiesOfAffiliation(affiliation)
            .find(
                (battleSquaddieId) =>
                    inBattleSquaddieManager.canSquaddieAct({
                        battleSquaddieId,
                    }) && this.hasSquaddieActedThisTurn(battleSquaddieId)
            )
    }

    private hasSquaddieActedThisTurn(
        battleSquaddieId: BattleSquaddieId
    ): boolean {
        if (this.missionState!.history == undefined) {
            return false
        }

        const currentTurn = MissionHistoryService.getTurn({
            history: this.missionState!.history,
            turnNumber: this.missionState!.turn.turnCount,
        })
        if (currentTurn == undefined) {
            return false
        }

        const squaddieTurnRecord =
            MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                turnHistoryEntry: currentTurn,
                squaddieId: battleSquaddieId,
            })
        if (squaddieTurnRecord == undefined) {
            return false
        }

        const battleSquaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(battleSquaddieId)
        return squaddieTurnRecord.actions.some(
            (squaddieTurnActionRecord) =>
                squaddieTurnActionRecord.actor != undefined &&
                SquaddieIdConverterService.squaddieIdToKey(
                    squaddieTurnActionRecord.actor
                ) === battleSquaddieKey
        )
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
            if (turnEndPhases.has(currentPhase)) {
                this.inBattleSquaddieManager!.decrementActionCooldowns(
                    battleSquaddieId
                )
            }

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
            MissionTurnService.resetActionResourcesForSquaddieAffiliation({
                inBattleSquaddieManager: this.inBattleSquaddieManager!,
                squaddieAffiliation: affiliation,
            })
        }
    }

    deployRequiredSquaddies(): void {
        this.throwIfStateIsUndefined(this.deployRequiredSquaddies.name)
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.deployRequiredSquaddies.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.deployRequiredSquaddies.name
        )

        const pendingDeployments = MissionStateService.getPendingDeployments(
            this.missionState!
        )
        const claimedCountByOutOfBattleSquaddieId = new Map<string, number>()
        for (const deployment of pendingDeployments) {
            const claimedCount =
                claimedCountByOutOfBattleSquaddieId.get(
                    deployment.outOfBattleSquaddieId
                ) ?? 0

            const placements = this.placementsForDeployment(
                deployment,
                claimedCount
            )
            for (const placement of placements) {
                this.coordinateMapCollectionManager!.addSquaddie({
                    mapId: this.missionState!.mapId,
                    squaddieId: placement.squaddieId,
                    coordinate: placement.coordinate,
                })
            }

            claimedCountByOutOfBattleSquaddieId.set(
                deployment.outOfBattleSquaddieId,
                claimedCount + deployment.coordinates.length
            )
            this.missionState = MissionStateService.markDeploymentComplete(
                this.missionState!,
                deployment.id
            )
        }
    }

    private placementsForDeployment(
        deployment: MissionDeployment,
        claimedCount: number
    ): { squaddieId: BattleSquaddieId; coordinate: OffsetCoordinate }[] {
        const battleSquaddieIds =
            this.inBattleSquaddieManager!.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                deployment.outOfBattleSquaddieId
            )

        if (
            battleSquaddieIds.length <
            claimedCount + deployment.coordinates.length
        )
            throw new Error(
                `[MissionManager.${this.placementsForDeployment.name}]: no inBattleSquaddie found for outOfBattleSquaddieId "${deployment.outOfBattleSquaddieId}"`
            )

        return deployment.coordinates.map((coordinate, index) => ({
            squaddieId: battleSquaddieIds[claimedCount + index],
            coordinate,
        }))
    }

    hasPendingCampaignSquaddieDeploymentCoordinates(): boolean {
        this.throwIfStateIsUndefined(
            this.hasPendingCampaignSquaddieDeploymentCoordinates.name
        )

        const coordinateCollection =
            this.missionState!.campaignSquaddieDeploymentCoordinates
        if (coordinateCollection == undefined) return false

        return (
            CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
                coordinateCollection
            ).length > 0
        )
    }

    beginCampaignSquaddieDeployment(): void {
        this.throwIfStateIsUndefined(this.beginCampaignSquaddieDeployment.name)
        this.throwIfArmyManagerIsUndefined(
            this.beginCampaignSquaddieDeployment.name
        )

        this.campaignSquaddieDeploymentManager =
            new CampaignSquaddieDeploymentManager({
                armyManager: this.armyManager!,
                coordinateCollection:
                    this.missionState!.campaignSquaddieDeploymentCoordinates!,
            })
        this.campaignSquaddieDeploymentManager.defaultAssign()
    }

    isCampaignSquaddieDeploymentInProgress(): boolean {
        return this.campaignSquaddieDeploymentManager != undefined
    }

    getCampaignDeploymentStatus(): {
        openCoordinates: CampaignSquaddieDeploymentCoordinate[]
        deployedCoordinates: CampaignSquaddieDeploymentCoordinate[]
        unplacedEligibleCampaignSquaddies: CampaignSquaddie[]
        assignments: Record<string, CampaignSquaddie>
    } {
        this.throwIfCampaignSquaddieDeploymentManagerIsUndefined(
            this.getCampaignDeploymentStatus.name
        )

        const deploymentManager = this.campaignSquaddieDeploymentManager!
        const deployedCoordinates = deploymentManager.getDeployedCoordinates()

        const assignments: Record<string, CampaignSquaddie> = {}
        for (const coordinate of deployedCoordinates) {
            assignments[coordinate.id] =
                deploymentManager.getAssignedCampaignSquaddie(coordinate.id)!
        }

        return {
            openCoordinates: deploymentManager.getOpenCoordinates(),
            deployedCoordinates,
            unplacedEligibleCampaignSquaddies:
                deploymentManager.getUnplacedEligibleCampaignSquaddies(),
            assignments,
        }
    }

    deployCampaignSquaddie({
        coordinateId,
        campaignSquaddieId,
    }: {
        coordinateId: string
        campaignSquaddieId: string
    }): void {
        this.throwIfCampaignSquaddieDeploymentManagerIsUndefined(
            this.deployCampaignSquaddie.name
        )
        this.campaignSquaddieDeploymentManager!.assign({
            coordinateId,
            campaignSquaddieId,
        })
    }

    undeployCampaignSquaddie(coordinateId: string): void {
        this.throwIfCampaignSquaddieDeploymentManagerIsUndefined(
            this.undeployCampaignSquaddie.name
        )
        this.campaignSquaddieDeploymentManager!.unassign(coordinateId)
    }

    swapCampaignSquaddieDeployment({
        coordinateIdA,
        coordinateIdB,
    }: {
        coordinateIdA: string
        coordinateIdB: string
    }): void {
        this.throwIfCampaignSquaddieDeploymentManagerIsUndefined(
            this.swapCampaignSquaddieDeployment.name
        )
        this.campaignSquaddieDeploymentManager!.swap({
            coordinateIdA,
            coordinateIdB,
        })
    }

    finalizeCampaignSquaddieDeploymentAndStartMission(): void {
        this.throwIfCampaignSquaddieDeploymentManagerIsUndefined(
            this.finalizeCampaignSquaddieDeploymentAndStartMission.name
        )
        this.throwIfArmyManagerIsUndefined(
            this.finalizeCampaignSquaddieDeploymentAndStartMission.name
        )
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.finalizeCampaignSquaddieDeploymentAndStartMission.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.finalizeCampaignSquaddieDeploymentAndStartMission.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.finalizeCampaignSquaddieDeploymentAndStartMission.name
        )

        CampaignSquaddieMissionBridgeService.deployAssignedCampaignSquaddies({
            armyManager: this.armyManager!,
            coordinateCollection:
                this.missionState!.campaignSquaddieDeploymentCoordinates!,
            deploymentManager: this.campaignSquaddieDeploymentManager!,
            outOfBattleSquaddieManager: this.outOfBattleSquaddieManager!,
            inBattleSquaddieManager: this.inBattleSquaddieManager!,
            coordinateMapCollectionManager:
                this.coordinateMapCollectionManager!,
            mapId: this.missionState!.mapId,
        })

        this.deployRequiredSquaddies()
        this.campaignSquaddieDeploymentManager = undefined
    }

    loadMissionStateFromJson(data: unknown): void {
        this.initializeLoaderIfNeeded()
        this._loader!.loadMissionStateFromJson(data)
    }

    addSquaddiesFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addSquaddiesFromJson(data)
    }

    addAttributeSheetsFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addAttributeSheetsFromJson(data)
    }

    addItemsFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addItemsFromJson(data)
    }

    addMapsFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addMapsFromJson(data)
    }

    addActionsFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addActionsFromJson(data)
    }

    addGlossaryFromJson(data: unknown): string[] {
        this.initializeLoaderIfNeeded()
        return this._loader!.addGlossaryFromJson(data)
    }

    resolveGlossaryTerms(
        termIds: string[],
        languageCode: string
    ): Record<string, ResolvedGlossaryTerm> {
        this.throwIfGlossaryManagerIsUndefined(this.resolveGlossaryTerms.name)

        const resolvedGlossaryTermsByTermId: Record<
            string,
            ResolvedGlossaryTerm
        > = {}
        for (const termId of termIds) {
            const resolvedGlossaryTerm = this.glossaryManager!.resolveTerm(
                termId,
                languageCode
            )
            if (resolvedGlossaryTerm != undefined) {
                resolvedGlossaryTermsByTermId[termId] = resolvedGlossaryTerm
            }
        }
        return resolvedGlossaryTermsByTermId
    }

    loadMissionFromJson(data: {
        squaddies?: unknown
        attributeSheets?: unknown
        items?: unknown
        maps?: unknown
        actions?: unknown
        missionState: unknown
        campaignData?: {
            squaddies?: unknown
            attributeSheets?: unknown
            items?: unknown
            actions?: unknown
        }
    }): { isValid: boolean; errors: string[]; warnings: string[] } {
        const warnings: string[] = []

        if (data.campaignData !== undefined) {
            const campaign = data.campaignData
            if (campaign.squaddies !== undefined)
                this.addSquaddiesFromJson(campaign.squaddies)
            if (campaign.attributeSheets !== undefined)
                this.addAttributeSheetsFromJson(campaign.attributeSheets)
            if (campaign.items !== undefined)
                this.addItemsFromJson(campaign.items)
            if (campaign.actions !== undefined)
                this.addActionsFromJson(campaign.actions)

            this.collectCampaignMissionCollisionWarnings(data, warnings)
        }

        if (data.squaddies !== undefined)
            this.addSquaddiesFromJson(data.squaddies)
        if (data.attributeSheets !== undefined)
            this.addAttributeSheetsFromJson(data.attributeSheets)
        if (data.items !== undefined) this.addItemsFromJson(data.items)
        if (data.maps !== undefined) this.addMapsFromJson(data.maps)
        if (data.actions !== undefined) this.addActionsFromJson(data.actions)
        this.loadMissionStateFromJson(data.missionState)

        const { isValid, errors } = this.validate()
        return { isValid, errors, warnings }
    }

    private collectCampaignMissionCollisionWarnings(
        data: {
            squaddies?: unknown
            attributeSheets?: unknown
            items?: unknown
            actions?: unknown
            campaignData?: {
                squaddies?: unknown
                attributeSheets?: unknown
                items?: unknown
                actions?: unknown
            }
        },
        warnings: string[]
    ): void {
        const collisionTypes: Array<{
            label: string
            campaignData: unknown
            missionData: unknown
        }> = [
            {
                label: "Squaddie",
                campaignData: data.campaignData?.squaddies,
                missionData: data.squaddies,
            },
            {
                label: "AttributeSheet",
                campaignData: data.campaignData?.attributeSheets,
                missionData: data.attributeSheets,
            },
            {
                label: "Item",
                campaignData: data.campaignData?.items,
                missionData: data.items,
            },
            {
                label: "Action",
                campaignData: data.campaignData?.actions,
                missionData: data.actions,
            },
        ]

        for (const { label, campaignData, missionData } of collisionTypes) {
            if (campaignData === undefined || missionData === undefined)
                continue
            const campaignIds = this.extractIdsFromData(campaignData)
            const missionIds = this.extractIdsFromData(missionData)
            for (const id of missionIds) {
                if (campaignIds.has(id)) {
                    warnings.push(
                        `${label} "${id}" is defined in both campaign and mission data; mission version will be used`
                    )
                }
            }
        }
    }

    private extractIdsFromData(data: unknown): Set<string> {
        const unwrapped = MissionResourceLoader.extractDataFromJson(data)
        if (!Array.isArray(unwrapped)) return new Set()
        const ids = new Set<string>()
        for (const item of unwrapped) {
            if (
                typeof item === "object" &&
                item !== null &&
                "id" in item &&
                typeof (item as { id: unknown }).id === "string"
            ) {
                ids.add((item as { id: string }).id)
            }
        }
        return ids
    }

    validate(): { isValid: boolean; errors: string[] } {
        if (this._loader == undefined) {
            return MissionManagerValidationService.validate(this)
        }

        const inBattleSquaddieManager =
            this.inBattleSquaddieManager ??
            this.createInBattleSquaddiesFromLoader()

        const candidate: MissionManagerValidationInput = {
            missionState: this._loader.missionState ?? this.missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager:
                this._loader.coordinateMapCollectionManager ??
                this.coordinateMapCollectionManager,
            squaddieActionManager:
                this._loader.squaddieActionManager ??
                this.squaddieActionManager,
            armyManager: this.armyManager,
        }

        const result = MissionManagerValidationService.validate(candidate)

        if (result.isValid) {
            this.missionState = candidate.missionState
            this.inBattleSquaddieManager = candidate.inBattleSquaddieManager
            this.coordinateMapCollectionManager =
                candidate.coordinateMapCollectionManager
            this.squaddieActionManager = candidate.squaddieActionManager
            this.outOfBattleSquaddieManager =
                this._loader.outOfBattleSquaddieManager ??
                this.outOfBattleSquaddieManager
            this.glossaryManager =
                this._loader.glossaryManager ?? this.glossaryManager
        }

        this._loader = undefined
        return result
    }

    private createInBattleSquaddiesFromLoader():
        | InBattleSquaddieManager
        | undefined {
        if (
            this._loader?.outOfBattleSquaddieManager == undefined ||
            this._loader?.missionState == undefined
        ) {
            return undefined
        }

        const manager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            this._loader.outOfBattleSquaddieManager
        )

        const pending = MissionStateService.getPendingDeployments(
            this._loader.missionState
        )
        for (const deployment of pending) {
            for (const _coordinate of deployment.coordinates) {
                manager.createNewSquaddie({
                    outOfBattleSquaddieId: deployment.outOfBattleSquaddieId,
                })
            }
        }

        return manager
    }

    private initializeLoaderIfNeeded(): void {
        this._loader ??= new MissionResourceLoader()
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

    private throwIfOutOfBattleSquaddieManagerIsUndefined(callName: string) {
        if (this.outOfBattleSquaddieManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: outOfBattleSquaddieManager must be defined`
            )
    }

    private throwIfArmyManagerIsUndefined(callName: string) {
        if (this.armyManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: armyManager must be defined`
            )
    }

    private throwIfGlossaryManagerIsUndefined(callName: string) {
        if (this.glossaryManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: glossaryManager must be defined`
            )
    }

    private throwIfCampaignSquaddieDeploymentManagerIsUndefined(
        callName: string
    ) {
        if (this.campaignSquaddieDeploymentManager == undefined)
            throw new Error(
                `[MissionManager.${callName}]: campaignSquaddieDeploymentManager must be defined`
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
