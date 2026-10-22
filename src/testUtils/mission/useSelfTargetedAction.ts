import type { MissionEngine } from "../../mission/missionEngine/missionEngine.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

export function useSelfTargetedAction({
    missionEngine,
    actor,
    actionId,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    actionId: string
}) {
    missionEngine.readyAction({
        actor,
        targets: [actor],
        action: { id: actionId },
    })
    missionEngine.useActionAndGetResults()
}
