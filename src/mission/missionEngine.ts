import { MissionManager } from "./missionManager"
import type { InMissionSummary } from "./inMissionSummary"
import type { SquaddieActionDecisions } from "../squaddieAction/calculate/result/squaddieActionResultCalculator"

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

    constructor(missionManager?: MissionManager) {
        this.missionManager = missionManager
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

    private throwIfMissionManagerIsUndefined(callingFunction: string): void {
        if (this.missionManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: missionManager is undefined`
            )
        }
    }
}
