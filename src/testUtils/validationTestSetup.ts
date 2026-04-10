import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../coordinateMap/coordinateMap"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection"
import { OutOfBattleSquaddieTestSetup } from "./outOfBattleSquaddieTestSetup"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"

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
