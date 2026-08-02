import { type MissionState, MissionStateService } from "./missionState.js"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import { SquaddieItemManager } from "../squaddieItem/squaddieItemManager.js"
import { SquaddieItemCollectionService } from "../squaddieItem/squaddieItemCollection.js"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection.js"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection.js"
import { GlossaryManager } from "../campaign/glossary/glossaryManager.js"
import { GlossaryCollectionService } from "../campaign/glossary/glossaryCollection.js"

export class MissionResourceLoader {
    outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
    squaddieItemManager?: SquaddieItemManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager
    glossaryManager?: GlossaryManager
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

    addGlossaryFromJson(data: unknown): string[] {
        this.glossaryManager ??= new GlossaryManager(
            GlossaryCollectionService.new()
        )
        return this.glossaryManager.addTermsFromJson(extractData(data))
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

    static extractDataFromJson(input: unknown): unknown {
        return extractData(input)
    }
}

const createOutOfBattleSquaddieManager = (): OutOfBattleSquaddieManager =>
    new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
    )

const extractData = (input: unknown): unknown => {
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
