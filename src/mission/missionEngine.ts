import { MissionManager } from "./missionManager"
import type { InMissionSummary } from "./inMissionSummary"

export class MissionEngine {
    missionManager?: MissionManager

    constructor(missionManager?: MissionManager) {
        this.missionManager = missionManager
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
