import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation.js"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection.js"
import { OutOfBattleSquaddieTestSetup } from "./outOfBattleSquaddieTestSetup.js"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"

export interface ValidationTestTarget {
    id: string
    affiliation: TSquaddieAffiliation
    position: OffsetCoordinate
}

export interface ValidationTestResult {
    actor: BattleSquaddieId
    targetIds: BattleSquaddieId[]
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    inBattleSquaddieManager: InBattleSquaddieManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    squaddieActionManager: SquaddieActionManager
    mapId: string
}

export const ValidationTestSetup = {
    create({
        mapMovementProperties,
        actorPosition,
        targets,
    }: {
        mapMovementProperties: string[]
        actorPosition: OffsetCoordinate
        targets?: ValidationTestTarget[]
    }): ValidationTestResult {
        const mapId = "test-map"

        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
            })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )

        for (const target of targets ?? []) {
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: target.id,
                    name: target.id,
                    actionIds: [],
                    attributeSheetId: "test-sheet",
                    affiliation: target.affiliation,
                })
            )
        }

        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        const actor: BattleSquaddieId = {
            inBattleSquaddieId: actorInBattleId,
            outOfBattleSquaddieId: "actor",
        }

        const targetIds: BattleSquaddieId[] = (targets ?? []).map((t) => {
            const { inBattleSquaddieId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: t.id,
                })
            return {
                inBattleSquaddieId,
                outOfBattleSquaddieId: t.id,
            }
        })

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: mapMovementProperties,
            }),
        })
        const coordinateMapCollectionManager =
            new CoordinateMapCollectionManager(mapCollection)

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: actorPosition,
        })

        for (let i = 0; i < (targets ?? []).length; i++) {
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: targetIds[i],
                coordinate: targets![i].position,
            })
        }

        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        return {
            actor,
            targetIds,
            outOfBattleSquaddieManager,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
            mapId,
        }
    },
}
