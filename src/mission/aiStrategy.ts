import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import type { ReadiedAction } from "./readiedAction.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"

export interface AiStrategyInput {
    actorIds: BattleSquaddieId
    inBattleSquaddieManager: InBattleSquaddieManager
    squaddieActionManager: SquaddieActionManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}

export interface AiStrategy {
    decideAction(input: AiStrategyInput): ReadiedAction | undefined
}
