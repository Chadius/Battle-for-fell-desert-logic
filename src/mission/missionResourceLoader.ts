import { type MissionState, MissionStateService } from "./missionState"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { SquaddieItemManager } from "../squaddieItem/squaddieItemManager"
import { SquaddieItemCollectionService } from "../squaddieItem/squaddieItemCollection"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection"

export class MissionResourceLoader {
    outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
    squaddieItemManager?: SquaddieItemManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager
    missionState?: MissionState

    addSquaddiesFromJson(data: unknown): string[] {
        this.outOfBattleSquaddieManager ??= createOutOfBattleSquaddieManager()
        return this.outOfBattleSquaddieManager.addSquaddiesFromJson(
            extractData(data)
        )
    }

    addAttributeSheetsFromJson(data: unknown): string[] {
        this.outOfBattleSquaddieManager ??= createOutOfBattleSquaddieManager()
        return this.outOfBattleSquaddieManager.addAttributeSheetsFromJson(
            extractData(data)
        )
    }

    addItemsFromJson(data: unknown): string[] {
        this.squaddieItemManager ??= new SquaddieItemManager(
            SquaddieItemCollectionService.new()
        )
        return this.squaddieItemManager.addItemsFromJson(extractData(data))
    }

    addMapsFromJson(data: unknown): string[] {
        this.coordinateMapCollectionManager ??=
            new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
        return this.coordinateMapCollectionManager.addMapsFromJson(
            extractData(data)
        )
    }

    addActionsFromJson(data: unknown): string[] {
        this.squaddieActionManager ??= new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        return this.squaddieActionManager.addActionsFromJson(extractData(data))
    }

    loadMissionStateFromJson(data: unknown): void {
        this.missionState = MissionStateService.deserialize(extractData(data))
    }

    validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []
        if (this.missionState == undefined) {
            errors.push("missionState must be defined")
        }
        if (this.coordinateMapCollectionManager == undefined) {
            errors.push("coordinateMapCollectionManager must be defined")
        }
        if (this.squaddieActionManager == undefined) {
            errors.push("squaddieActionManager must be defined")
        }
        if (
            this.missionState != undefined &&
            this.coordinateMapCollectionManager != undefined
        ) {
            try {
                this.coordinateMapCollectionManager.getMapById(
                    this.missionState.mapId
                )
            } catch {
                errors.push(
                    `map "${this.missionState.mapId}" not found in coordinateMapCollectionManager`
                )
            }
        }
        return { isValid: errors.length === 0, errors }
    }
}

const createOutOfBattleSquaddieManager = (): OutOfBattleSquaddieManager =>
    new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
    )

function extractData(input: unknown): unknown {
    if (
        typeof input === "object" &&
        input !== null &&
        "createdAt" in input &&
        "data" in input
    ) {
        return (input as { data: unknown }).data
    }
    return input
}
