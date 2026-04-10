import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import type { ReadiedAction } from "./readiedAction"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"

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
