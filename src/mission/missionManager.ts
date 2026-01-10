import type { MissionState } from "./missionState"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { MissionObjectiveRewardType } from "./missionObjectiveReward"
import type { MissionObjective } from "./missionObjective"
import { MissionObjectiveService } from "./missionObjective"
import {
    type SquaddieActionDecisions,
    SquaddieActionResultCalculator,
} from "../squaddieAction/calculate/result/squaddieActionResultCalculator"
import type { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"
import { ApplyResultService } from "../squaddieAction/apply/applyResultService"

export class MissionManager {
    state?: MissionState
    inBattleSquaddieManager?: InBattleSquaddieManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager

    constructor(
        state?: MissionState,
        inBattleSquaddieManager?: InBattleSquaddieManager,
        coordinateMapCollectionManager?: CoordinateMapCollectionManager,
        squaddieActionManager?: SquaddieActionManager
    ) {
        this.state = state
        this.inBattleSquaddieManager = inBattleSquaddieManager
        this.coordinateMapCollectionManager = coordinateMapCollectionManager
        this.squaddieActionManager = squaddieActionManager
    }

    hasMissionEnded(): boolean {
        this.throwIfStateIsUndefined(this.hasMissionEnded.name)

        return this.state!.objectives.some((objective) => {
            const hasMissionEndsReward = objective.rewards.some(
                (reward) =>
                    reward.type === MissionObjectiveRewardType.MISSION_ENDS
            )
            return hasMissionEndsReward && objective.hasGivenReward
        })
    }

    calculateCompletedButNotRewardedMissionObjectives(): MissionObjective[] {
        this.throwIfStateIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )
        this.throwIfInBattleSquaddieManagerIsUndefined(
            this.calculateCompletedButNotRewardedMissionObjectives.name
        )

        return MissionObjectiveService.getCompletedObjectivesWithoutReward(
            this.state!.objectives,
            this.inBattleSquaddieManager!
        )
    }

    setMissionObjectiveAsRewarded(objectiveId: string): void {
        this.throwIfStateIsUndefined(this.setMissionObjectiveAsRewarded.name)

        const updatedObjectives = this.state!.objectives.map((objective) => {
            if (objective.id === objectiveId) {
                return MissionObjectiveService.markRewardAsGiven(objective)
            }
            return objective
        })

        this.state = {
            ...this.state!,
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
                    mapId: this.state!.mapId,
                },
            })

        for (const [
            _targetKey,
            targetResult,
        ] of calculationResults.targetResults) {
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager: this.inBattleSquaddieManager!,
                results: targetResult.squaddieActionResults,
                map: {
                    mapId: this.state!.mapId,
                    manager: this.coordinateMapCollectionManager!,
                },
            })
        }

        return calculationResults
    }

    private throwIfStateIsUndefined(callName: string) {
        if (this.state == undefined)
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
}
