import { MissionManager } from "./missionManager"
import type { InMissionSummary } from "./inMissionSummary"
import type { SquaddieActionDecisions } from "../squaddieAction/calculate/result/squaddieActionResultCalculator"
import { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"

export interface TargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SquaddieActionResult[]
}

export interface ActionResults {
    actorRoll: [number, number]
    targetResults: { [squaddieKey: string]: TargetResult }
}

export interface ReadiedAction {
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
}

export class MissionEngine {
    missionManager?: MissionManager
    readiedAction?: ReadiedAction
    rollGenerator: RollGenerator
    actionResults?: ActionResults

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
        this.readiedAction = { actor, targets, action }
        return { isValid: true }
    }

    getReadiedAction(): ReadiedAction | undefined {
        return this.readiedAction
    }

    isDone(): boolean {
        this.throwIfMissionManagerIsUndefined(this.isDone.name)
        return this.missionManager!.hasMissionEnded()
    }

    getInMissionSummary(): InMissionSummary {
        this.throwIfMissionManagerIsUndefined(this.getInMissionSummary.name)
        return this.missionManager!.createInMissionSummary()
    }

    useActionAndGetResults(): ActionResults {
        this.throwIfMissionManagerIsUndefined(this.useActionAndGetResults.name)
        this.throwIfReadiedActionIsUndefined(this.useActionAndGetResults.name)

        const managerResults = this.missionManager!.useActionAndGetResults({
            ...this.readiedAction!,
            rollGenerator: this.rollGenerator,
        })

        const targetResults: { [squaddieKey: string]: TargetResult } = {}
        this.convertToSerializableTargetResults(managerResults, targetResults)

        this.actionResults = {
            actorRoll: managerResults.actorRoll,
            targetResults,
        }

        this.readiedAction = undefined
        return this.actionResults
    }

    private convertToSerializableTargetResults(
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

    getActionResults(): ActionResults | undefined {
        return this.actionResults
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
}
