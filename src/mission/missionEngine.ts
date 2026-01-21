import { MissionManager } from "./missionManager"

export class MissionEngine {
    missionManager?: MissionManager

    constructor(missionManager?: MissionManager) {
        this.missionManager = missionManager
    }

    isDone(): boolean {
        this.throwIfMissionManagerIsUndefined(this.isDone.name)
        return this.missionManager!.hasMissionEnded()
    }

    private throwIfMissionManagerIsUndefined(callingFunction: string): void {
        if (this.missionManager == undefined) {
            throw new Error(
                `[MissionEngine.${callingFunction}]: missionManager is undefined`
            )
        }
    }
}
