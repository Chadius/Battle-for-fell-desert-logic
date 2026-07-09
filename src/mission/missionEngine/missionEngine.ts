import { MissionManager } from "../missionManager"
import type { Movie } from "../../movie/movie"
import type { ResourceManifestCollection } from "../../resource/resourceManifestCollection"
import {
    MovieEngine,
    MovieEngineState,
    type TMovieEngineCommand,
} from "../../movie/movieEngine"
import {
    MissionObjectiveRewardType,
    type MissionObjectiveReward,
} from "../missionObjectiveReward"
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
import type { MissionObjectiveCriteriaContext } from "../missionObjectiveCriteria"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"
import type { SquaddieInfo } from "../../squaddie/inBattle/squaddieInfo"
import {
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "../missionTurn"
import {
    type SerializedSquaddieAction,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction"
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
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import {
    type AimCoordinateResult,
    calculateAimCoordinateResults,
    SquaddieActionValidationService,
    type SquaddieActionValidity,
} from "../../squaddieAction/calculate/validity/squaddieActionValidationService"
import type {
    OffsetMaybeOffmapCoordinate,
    SerializedCoordinateMap,
} from "../../coordinateMap/coordinateMap"
import type { OffsetCoordinate } from "../../coordinateMap/offsetCoordinate"
import { TurnControllerService, TurnControllerType } from "../turnController"
import { StrategyControllerService } from "../strategyController"
import { SimpleAggressorStrategy } from "../strategies/simpleAggressorStrategy"
import type { AiStrategy } from "../aiStrategy"
import { type DebugFlags, DebugFlagsService } from "../debugFlags"
import {
    type ChallengeModifierSetting,
    ChallengeModifierSettingService,
    type TChallengeModifierType,
} from "../../squaddieAction/calculate/challengeModifier/challengeModifierSetting"
import { z } from "zod"
import {
    type MissionState,
    MissionStateService,
    type SerializedMissionState,
} from "../missionState"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import {
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import type { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { MovieManager } from "../../movie/movieManager"

export type { TMovieEngineCommand }

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

const MAX_PHASE_TRANSITIONS = 20

const defaultAiStrategy = new SimpleAggressorStrategy()

const defaultStrategyByAffiliation: Partial<
    Record<TSquaddieAffiliation, AiStrategy>
> = {
    [SquaddieAffiliation.ENEMY]: defaultAiStrategy,
    [SquaddieAffiliation.ALLY]: defaultAiStrategy,
    [SquaddieAffiliation.NONE]: defaultAiStrategy,
}
export const MissionMovieEvent = {
    MOVIE_STARTED: "MOVIE_STARTED",
    MOVIE_COMPLETE: "MOVIE_COMPLETE",
} as const satisfies Record<string, string>

export type TMissionMovieEvent =
    (typeof MissionMovieEvent)[keyof typeof MissionMovieEvent]

export interface SerializedMissionEngine {
    missionState?: SerializedMissionState
    inBattleSquaddieCollection?: SerializedInBattleSquaddieCollection
    coordinateMaps?: SerializedCoordinateMap[]
    squaddieActions?: SerializedSquaddieAction[]
    readiedAction?: SerializedReadiedAction
    rollGeneratorQueue: number[]
    actionResults?: SerializedActionResults
    recentPhaseTransitions: TMissionAffiliationTurn[]
    recentTransitionResults: SerializedSquaddieActionResult[]
}

export class MissionEngine {
    missionManager?: MissionManager
    readiedAction?: ReadiedAction
    rollGenerator: RollGenerator
    actionResults?: ActionResult
    private recentPhaseTransitions: TMissionAffiliationTurn[] = []
    private recentTransitionResults: SerializedSquaddieActionResult[] = []
    private activeMovieEngine?: MovieEngine
    private recentMovieEvents: TMissionMovieEvent[] = []

    constructor(
        missionManager?: MissionManager,
        rollGenerator?: RollGenerator
    ) {
        this.missionManager = missionManager
        this.rollGenerator = rollGenerator ?? new RollGenerator()
    }

    readyAction({ actor, targets, action }: ReadiedAction): {
        isValid: boolean
        message?: string
    } {
        if (this.isMoviePlaying()) {
            return {
                isValid: false,
                message:
                    "[MissionEngine.readyAction]: a movie is currently playing",
            }
        }

        let validityCheck = this.canReadyActionBecauseOfAffiliationTurn({
            actor,
            targets,
            action,
        })
        if (!validityCheck.isValid) {
            return validityCheck
        }

        const actionValidation = this.validateReadiedAction({
            actor,
            targets,
            action,
        })
        if (!actionValidation.isValid) {
            return actionValidation
        }

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
        const summary = this.missionManager!.createInMissionSummary()
        return {
            ...summary,
            recentPhaseTransitions: [...this.recentPhaseTransitions],
        }
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

        const actorSquaddieKey = SquaddieIdConverterService.squaddieIdToKey(
            this.readiedAction!.actor
        )

        const managerResults = this.missionManager!.useActionAndGetResults({
            ...this.readiedAction!,
            rollGenerator: this.rollGenerator,
        })

        const targetResults: { [squaddieKey: string]: TargetResult } = {}
        this.serializeTargetResults(managerResults, targetResults)

        this.actionResults = {
            actorRoll: managerResults.actorRoll,
            actorSquaddieKey: actorSquaddieKey,
            targetResults,
        }

        this.readiedAction = undefined

        this.triggerImmediateObjectiveRewards()
        this.autoAdvanceThroughBookendAffiliationTurns()

        return this.actionResults
    }

    private serializeTargetResults(
        managerResults: {
            actorRoll?: [number, number]
            targetResults: Map<
                string,
                {
                    degreeOfSuccess: TDegreeOfSuccess
                    squaddieActionResults: SquaddieActionResult[]
                    targetRoll?: [number, number]
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

    private missionObjectiveCriteriaContext(): MissionObjectiveCriteriaContext {
        return {
            actionResult: this.actionResults,
            missionTurn: this.missionManager?.missionState?.turn,
        }
    }

    getInProgressMissionObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getInProgressMissionObjectives.name
        )

        const objectives = this.missionManager!.missionState?.objectives ?? []
        return objectives.filter((objective) => {
            const isComplete = MissionObjectiveService.isComplete(
                objective,
                this.missionManager!.inBattleSquaddieManager!,
                this.missionObjectiveCriteriaContext()
            )
            return !isComplete && !objective.hasGivenReward
        })
    }

    getCompletedButNotRewardedMissionObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getCompletedButNotRewardedMissionObjectives.name
        )

        return this.missionManager!.calculateCompletedButNotRewardedMissionObjectives(
            this.missionObjectiveCriteriaContext()
        )
    }

    getCompletedTerminalButNotRewardedObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getCompletedTerminalButNotRewardedObjectives.name
        )

        return this.missionManager!.calculateCompletedButNotRewardedMissionObjectives(
            this.missionObjectiveCriteriaContext()
        ).filter((objective) =>
            objective.rewards.some(
                (reward) =>
                    reward.type === MissionObjectiveRewardType.MISSION_ENDS ||
                    reward.type === MissionObjectiveRewardType.MISSION_FAILURE
            )
        )
    }

    getCompletedNonTerminalButNotRewardedObjectives(): MissionObjective[] {
        this.throwIfMissionManagerIsUndefined(
            this.getCompletedNonTerminalButNotRewardedObjectives.name
        )

        return this.missionManager!.calculateCompletedButNotRewardedMissionObjectives(
            this.missionObjectiveCriteriaContext()
        ).filter(
            (objective) =>
                !objective.rewards.some(
                    (reward) =>
                        reward.type ===
                            MissionObjectiveRewardType.MISSION_ENDS ||
                        reward.type ===
                            MissionObjectiveRewardType.MISSION_FAILURE
                )
        )
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
            this.missionManager!.inBattleSquaddieManager!,
            this.missionObjectiveCriteriaContext()
        )

        if (!isComplete) {
            throw new Error(
                `[MissionEngine.${this.markMissionObjectiveAsRewarded.name}]: objective is not complete`
            )
        }

        this.missionManager!.setMissionObjectiveAsRewarded(objectiveId)
    }

    getDebugFlags(): DebugFlags | undefined {
        this.throwIfMissionManagerIsUndefined(this.getDebugFlags.name)
        const missionState = this.missionManager!.missionState!
        return missionState.overrides?.debugFlags
    }

    setDebugFlag(flag: keyof DebugFlags, value: boolean): void {
        this.throwIfMissionManagerIsUndefined(this.setDebugFlag.name)
        const missionState = this.missionManager!.missionState!
        missionState.overrides = {
            ...missionState.overrides,
            debugFlags: DebugFlagsService.setFlag({
                debugFlags:
                    missionState.overrides?.debugFlags ??
                    DebugFlagsService.new(),
                flag,
                value,
            }),
        }
    }

    getChallengeModifierSetting(): ChallengeModifierSetting | undefined {
        this.throwIfMissionManagerIsUndefined(
            this.getChallengeModifierSetting.name
        )
        const missionState = this.missionManager!.missionState!
        return missionState.overrides?.challengeModifierSetting
    }

    setChallengeModifier(type: TChallengeModifierType, value: boolean): void {
        this.throwIfMissionManagerIsUndefined(this.setChallengeModifier.name)
        const missionState = this.missionManager!.missionState!
        missionState.overrides = {
            ...missionState.overrides,
            challengeModifierSetting: ChallengeModifierSettingService.setFlag({
                challengeModifierSetting:
                    missionState.overrides?.challengeModifierSetting ??
                    ChallengeModifierSettingService.new(),
                type,
                value,
            }),
        }
    }

    registerMovieManager(movieManager: MovieManager): void {
        this.throwIfMissionManagerIsUndefined(this.registerMovieManager.name)
        this.missionManager!.movieManager = movieManager
    }

    registerMovie(movie: Movie): void {
        this.throwIfMissionManagerIsUndefined(this.registerMovie.name)
        if (this.missionManager!.movieManager == undefined) {
            this.missionManager!.movieManager = new MovieManager()
        }
        this.missionManager!.movieManager.add(movie)
    }

    playMovie(
        movie: Movie,
        resourceCollections: ResourceManifestCollection[]
    ): void {
        this.activeMovieEngine = new MovieEngine(movie, resourceCollections)
        this.recentMovieEvents = [MissionMovieEvent.MOVIE_STARTED]
    }

    getRecentMovieEvents(): TMissionMovieEvent[] {
        return [...this.recentMovieEvents]
    }

    isMoviePlaying(): boolean {
        return (
            this.activeMovieEngine?.status().state === MovieEngineState.PLAYING
        )
    }

    processMovieCommand(command: TMovieEngineCommand): void {
        this.activeMovieEngine?.processCommand(command)
        this.recordMovieCompleteIfTerminated()
    }

    selectMovieDecision(decisionId: string): {
        isValid: boolean
        message?: string
    } {
        if (!this.activeMovieEngine) {
            return {
                isValid: false,
                message:
                    "[MissionEngine.selectMovieDecision]: no movie is playing",
            }
        }
        const result = this.activeMovieEngine.selectDecision(decisionId)
        this.recordMovieCompleteIfTerminated()
        return result
    }

    tickMovie(elapsedMs: number): void {
        this.activeMovieEngine?.tick(elapsedMs)
        this.recordMovieCompleteIfTerminated()
    }

    getMovieStatus(): ReturnType<MovieEngine["status"]> | undefined {
        return this.activeMovieEngine?.status()
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

        const undoReason =
            SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                squaddieTurnActionRecord: lastSquaddieTurnActionRecord,
                squaddieAffiliations,
                squaddieAction,
            })
        if (undoReason !== null) {
            return { success: false, reason: undoReason }
        }

        const reversingResults = lastSquaddieTurnActionRecord.results.map(
            (result) => SquaddieActionResultCalculator.reverseResult(result)
        )

        const { removedAction } = this.missionManager!.undoLastAction({
            reversingResults,
        })

        return { success: true, removedAction }
    }

    endSquaddieTurn(battleSquaddieId: BattleSquaddieId): ActionResult {
        this.throwIfMissionManagerIsUndefined(this.endSquaddieTurn.name)

        if (
            this.missionManager!.squaddieActionManager &&
            !this.missionManager!.squaddieActionManager.has("default-end-turn")
        ) {
            this.missionManager!.squaddieActionManager.addOrUpdate(
                SquaddieActionService.defaultEndTurn()
            )
        }

        const actor = {
            inBattleSquaddieId: battleSquaddieId.inBattleSquaddieId,
            outOfBattleSquaddieId: battleSquaddieId.outOfBattleSquaddieId,
        }

        this.readiedAction = {
            actor,
            targets: [actor],
            action: { id: "default-end-turn" },
        }

        return this.useActionAndGetResults()
    }

    private recordMovieCompleteIfTerminated(): void {
        if (!this.activeMovieEngine) return
        if (this.activeMovieEngine.status().state === MovieEngineState.PLAYING)
            return
        if (this.recentMovieEvents.includes(MissionMovieEvent.MOVIE_COMPLETE))
            return
        this.recentMovieEvents = [
            ...this.recentMovieEvents,
            MissionMovieEvent.MOVIE_COMPLETE,
        ]
    }

    private triggerPlayMovieReward(reward: MissionObjectiveReward): boolean {
        if (reward.type !== MissionObjectiveRewardType.PLAY_MOVIE) return false
        const movieManager = this.missionManager!.movieManager
        if (!movieManager) return false

        const movie = movieManager.get(reward.movieId)
        this.playMovie(movie, [])
        return true
    }

    private triggerSetChallengeModifierReward(
        reward: MissionObjectiveReward
    ): boolean {
        if (reward.type !== MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER)
            return false
        this.setChallengeModifier(reward.challengeModifierType, reward.value)
        return true
    }

    private triggerImmediateObjectiveRewards(): void {
        if (!this.missionManager) return

        const missionObjectiveCriteriaContext =
            this.missionObjectiveCriteriaContext()
        const objectivesWithoutReward =
            this.missionManager.calculateCompletedButNotRewardedMissionObjectives(
                missionObjectiveCriteriaContext
            )

        for (const objective of objectivesWithoutReward) {
            const handledAnyReward = objective.rewards.reduce(
                (handledSoFar, reward) => {
                    const handledMovie = this.triggerPlayMovieReward(reward)
                    const handledChallengeModifier =
                        this.triggerSetChallengeModifierReward(reward)
                    return (
                        handledSoFar || handledMovie || handledChallengeModifier
                    )
                },
                false
            )
            if (handledAnyReward) {
                this.missionManager.setMissionObjectiveAsRewarded(objective.id)
            }
        }
    }

    private autoAdvanceThroughBookendAffiliationTurns(): void {
        this.recentPhaseTransitions = []
        this.recentTransitionResults = []

        for (let i = 0; i < MAX_PHASE_TRANSITIONS; i++) {
            if (this.isDone()) return
            if (this.isMoviePlaying()) return
            if (this.mustWaitForCurrentAffiliationTurn()) return

            this.advanceOnePhaseAndTriggerRewards()
        }
    }

    private mustWaitForCurrentAffiliationTurn(): boolean {
        return (
            MissionTurnService.isActiveTurnPhase(
                this.getCurrentAffiliationTurn()
            ) && !this.canSkipAffiliationTurn()
        )
    }

    private advanceOnePhaseAndTriggerRewards(): void {
        const phaseResults = this.missionManager!.transitionToNextPhase()
        this.recentTransitionResults.push(
            ...phaseResults.map(SquaddieActionResultService.serialize)
        )
        this.recentPhaseTransitions.push(this.getCurrentAffiliationTurn())

        this.triggerImmediateObjectiveRewards()
    }

    private canSkipAffiliationTurn(): boolean {
        while (true) {
            const squaddiesWhoCanAct = this.getSquaddiesWhoCanActThisPhase()
            if (squaddiesWhoCanAct.length === 0) {
                return true
            }

            const humanSquaddies =
                this.getHumanControlledSquaddiesWhoCanAct(squaddiesWhoCanAct)
            if (humanSquaddies.length > 0) {
                return false
            }

            const actionPreloaded = this.prepareNextAiAction(
                squaddiesWhoCanAct[0]
            )
            if (actionPreloaded) return false
        }
    }

    private getHumanControlledSquaddiesWhoCanAct(
        squaddies: BattleSquaddieId[]
    ): BattleSquaddieId[] {
        const missionState = this.missionManager?.missionState
        return squaddies.filter((squaddieId) => {
            const affiliation =
                this.missionManager!.getSquaddieAffiliation(squaddieId)
            const controllerType =
                TurnControllerService.getControllerTypeForSquaddie({
                    battleSquaddieId: squaddieId,
                    affiliation,
                    squaddieOverrides:
                        missionState?.overrides?.controllerType?.squaddie,
                    affiliationOverrides:
                        missionState?.overrides?.controllerType?.affiliation,
                })
            return controllerType === TurnControllerType.HUMAN
        })
    }

    private prepareNextAiAction(squaddieId: BattleSquaddieId): boolean {
        if (
            this.missionManager!.squaddieActionManager &&
            !this.missionManager!.squaddieActionManager.has("default-end-turn")
        ) {
            this.missionManager!.squaddieActionManager.addOrUpdate(
                SquaddieActionService.defaultEndTurn()
            )
        }

        const missionState = this.missionManager?.missionState
        const affiliation =
            this.missionManager!.getSquaddieAffiliation(squaddieId)

        if (
            missionState?.overrides?.debugFlags?.enemyAlwaysEndsTheirTurn &&
            affiliation === SquaddieAffiliation.ENEMY
        ) {
            this.missionManager!.useActionAndGetResults({
                actor: squaddieId,
                targets: [squaddieId],
                action: { id: "default-end-turn" },
                rollGenerator: this.rollGenerator,
            })
            return false
        }

        const strategy =
            StrategyControllerService.getStrategyForSquaddie({
                battleSquaddieId: squaddieId,
                affiliation,
                overrides: missionState?.overrides?.strategy,
            }) ?? defaultStrategyByAffiliation[affiliation]

        const decidedAction = strategy?.decideAction({
            actorIds: squaddieId,
            inBattleSquaddieManager:
                this.missionManager!.inBattleSquaddieManager!,
            squaddieActionManager: this.missionManager!.squaddieActionManager!,
            coordinateMapCollectionManager:
                this.missionManager!.coordinateMapCollectionManager!,
            mapId: missionState!.mapId,
        })

        if (decidedAction != undefined) {
            this.readiedAction = decidedAction
            return true
        }

        this.missionManager!.useActionAndGetResults({
            actor: squaddieId,
            targets: [squaddieId],
            action: { id: "default-end-turn" },
            rollGenerator: this.rollGenerator,
        })
        return false
    }

    getRecentTransitionResults(): SerializedSquaddieActionResult[] {
        return [...this.recentTransitionResults]
    }

    transitionToNextPhase(): SerializedSquaddieActionResult[] {
        this.throwIfMissionManagerIsUndefined(this.transitionToNextPhase.name)

        this.recentPhaseTransitions = []
        this.recentTransitionResults = []

        this.advanceOnePhaseAndTriggerRewards()

        return [...this.recentTransitionResults]
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

    getAimCoordinatesForAction({
        actor,
        actionId,
    }: {
        actor: BattleSquaddieId
        actionId: string
    }): AimCoordinateResult[] {
        this.throwIfMissionManagerIsUndefined(
            this.getAimCoordinatesForAction.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getAimCoordinatesForAction.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getAimCoordinatesForAction.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getAimCoordinatesForAction.name
        )

        return calculateAimCoordinateResults({
            actor,
            action: { id: actionId },
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

    getTargetsForAimCoordinate({
        actor,
        actionId,
        aimCoordinate,
    }: {
        actor: BattleSquaddieId
        actionId: string
        aimCoordinate: OffsetCoordinate
    }): BattleSquaddieId[] {
        this.throwIfMissionManagerIsUndefined(
            this.getTargetsForAimCoordinate.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getTargetsForAimCoordinate.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getTargetsForAimCoordinate.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getTargetsForAimCoordinate.name
        )

        const aimCoordinates = calculateAimCoordinateResults({
            actor,
            action: { id: actionId },
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

        const match = aimCoordinates.find(
            (entry) =>
                entry.aimCoordinate.row === aimCoordinate.row &&
                entry.aimCoordinate.col === aimCoordinate.col
        )
        return match?.targetIds ?? []
    }

    getMovementOptionsWithCosts(
        actor: BattleSquaddieId
    ): Array<{ destination: OffsetCoordinate; actionPointCost: number }> {
        this.throwIfMissionManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getMovementOptionsWithCosts.name
        )
        return this.missionManager!.getMovementOptionsWithCosts(actor)
    }

    getTargetDestinationsForAction(
        actor: BattleSquaddieId,
        actionId: string
    ): Array<{ destination: OffsetCoordinate; actionPointCost: number }> {
        this.throwIfMissionManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        this.throwIfCoordinateMapCollectionManagerIsUndefined(
            this.getTargetDestinationsForAction.name
        )
        return this.missionManager!.getTargetDestinationsForAction(
            actor,
            actionId
        )
    }

    getRequiredDecisionsForAction(actionId: string): {
        requiresSpecificTarget: boolean
        requiresAimCoordinate: boolean
        requiresTargetDestination: boolean
        actorIsAimCoordinate: boolean
    } {
        this.throwIfMissionManagerIsUndefined(
            this.getRequiredDecisionsForAction.name
        )
        this.throwIfSquaddieActionManagerIsUndefined(
            this.getRequiredDecisionsForAction.name
        )
        const squaddieAction =
            this.missionManager!.squaddieActionManager!.get(actionId)
        return SquaddieActionService.getRequiredDecisions(squaddieAction)
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

    loadMissionStateFromJson(data: unknown): {
        isValid: boolean
        errors: string[]
    } {
        this.throwIfMissionManagerIsUndefined(
            this.loadMissionStateFromJson.name
        )
        this.missionManager!.loadMissionStateFromJson(data)
        return this.missionManager!.validate()
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
        this.missionManager ??= new MissionManager()
        return this.missionManager.loadMissionFromJson(data)
    }

    finalizeLoadingMission(): { isValid: boolean; errors: string[] } {
        const validation = this.missionManager?.validate() ?? {
            isValid: false,
            errors: ["missionManager is undefined"],
        }
        if (!validation.isValid) {
            return validation
        }
        this.missionManager!.deployRequiredSquaddies()
        return { isValid: true, errors: [] }
    }

    serialize(): SerializedMissionEngine {
        return {
            missionState: this.missionManager?.missionState
                ? MissionStateService.serialize(
                      this.missionManager.missionState
                  )
                : undefined,
            inBattleSquaddieCollection: this.missionManager
                ?.inBattleSquaddieManager
                ? this.missionManager.inBattleSquaddieManager.serialize()
                : undefined,
            coordinateMaps: this.missionManager?.coordinateMapCollectionManager
                ? this.missionManager.coordinateMapCollectionManager.serialize()
                : undefined,
            squaddieActions: this.missionManager?.squaddieActionManager
                ? this.missionManager.squaddieActionManager.serialize()
                : undefined,
            readiedAction: this.readiedAction
                ? ReadiedActionService.serialize(this.readiedAction)
                : undefined,
            rollGeneratorQueue: this.rollGenerator.getQueue(),
            actionResults: this.actionResults
                ? ActionResultsService.serialize(this.actionResults)
                : undefined,
            recentPhaseTransitions: [...this.recentPhaseTransitions],
            recentTransitionResults: [...this.recentTransitionResults],
        }
    }

    static deserialize(
        data: unknown,
        outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    ): MissionEngine {
        const schema = z.object({
            missionState: z.unknown().optional(),
            inBattleSquaddieCollection: z.unknown().optional(),
            coordinateMaps: z.array(z.unknown()).optional(),
            squaddieActions: z.array(z.unknown()).optional(),
            readiedAction: z.unknown().optional(),
            rollGeneratorQueue: z.array(z.number()).default([]),
            actionResults: z.unknown().optional(),
            recentPhaseTransitions: z.array(z.string()).default([]),
            recentTransitionResults: z.array(z.unknown()).default([]),
        })

        const result = schema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            throw new Error(`[MissionEngine.deserialize]: ${details}`)
        }

        const parsed = result.data

        let missionState: MissionState | undefined
        if (parsed.missionState != undefined) {
            missionState = MissionStateService.deserialize(parsed.missionState)
        }

        let inBattleSquaddieManager: InBattleSquaddieManager | undefined
        if (parsed.inBattleSquaddieCollection != undefined) {
            const collection = InBattleSquaddieCollectionService.deserialize(
                parsed.inBattleSquaddieCollection
            )
            inBattleSquaddieManager = new InBattleSquaddieManager(
                collection,
                outOfBattleSquaddieManager
            )
        }

        let coordinateMapCollectionManager:
            | CoordinateMapCollectionManager
            | undefined
        if (parsed.coordinateMaps != undefined) {
            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addMapsFromJson(
                parsed.coordinateMaps
            )
        }

        let squaddieActionManager: SquaddieActionManager | undefined
        if (parsed.squaddieActions != undefined) {
            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            squaddieActionManager.addActionsFromJson(parsed.squaddieActions)
        }

        const missionManager = new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })

        const rollGenerator = new RollGenerator(parsed.rollGeneratorQueue)
        const engine = new MissionEngine(missionManager, rollGenerator)

        if (parsed.readiedAction != undefined) {
            engine.readiedAction = ReadiedActionService.deserialize(
                parsed.readiedAction as SerializedReadiedAction
            )
        }

        if (parsed.actionResults != undefined) {
            engine.actionResults = ActionResultsService.deserialize(
                parsed.actionResults as SerializedActionResults
            )
        }

        engine.recentPhaseTransitions =
            parsed.recentPhaseTransitions as TMissionAffiliationTurn[]
        engine.recentTransitionResults =
            parsed.recentTransitionResults as SerializedSquaddieActionResult[]

        return engine
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

    private validateReadiedAction({ actor, targets, action }: ReadiedAction): {
        isValid: boolean
        message?: string
    } {
        if (
            !this.missionManager?.inBattleSquaddieManager ||
            !this.missionManager?.squaddieActionManager ||
            !this.missionManager?.coordinateMapCollectionManager ||
            !this.missionManager?.missionState?.mapId
        ) {
            return { isValid: true }
        }

        const result = SquaddieActionValidationService.isActionValid({
            actor,
            targets,
            action,
            managers: {
                inBattleSquaddieManager:
                    this.missionManager.inBattleSquaddieManager,
                squaddieActionManager:
                    this.missionManager.squaddieActionManager,
                coordinateMapCollectionManager:
                    this.missionManager.coordinateMapCollectionManager,
            },
            map: { mapId: this.missionManager.missionState.mapId },
        })

        return { isValid: result.isValid, message: result.reason }
    }

    canReadyActionBecauseOfAffiliationTurn({ actor }: ReadiedAction): {
        isValid: boolean
        message?: string
    } {
        if (!this.missionManager?.missionState?.turn) {
            return {
                isValid: true,
            }
        }

        const currentAffiliationTurn = this.getCurrentAffiliationTurn()
        const turnAffiliation =
            MissionTurnService.getSquaddieAffiliationForAffiliationTurn(
                currentAffiliationTurn
            )
        if (turnAffiliation != undefined) {
            const actorAffiliation =
                this.missionManager.getSquaddieAffiliation(actor)
            if (actorAffiliation !== turnAffiliation) {
                return {
                    isValid: false,
                    message: "It is not this squaddie's turn",
                }
            }

            const missionState = this.missionManager.missionState
            const controllerType =
                TurnControllerService.getControllerTypeForSquaddie({
                    battleSquaddieId: actor,
                    affiliation: actorAffiliation,
                    squaddieOverrides:
                        missionState?.overrides?.controllerType?.squaddie,
                    affiliationOverrides:
                        missionState?.overrides?.controllerType?.affiliation,
                })
            if (controllerType === TurnControllerType.AI) {
                return {
                    isValid: false,
                    message: "This squaddie is AI controlled",
                }
            }
        }

        return {
            isValid: true,
        }
    }
}
