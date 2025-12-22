import {
    type CoordinateMapCollection,
    CoordinateMapCollectionService,
} from "./coordinateMapCollection.ts"
import {
    type CoordinateMap,
    CoordinateMapService,
    type OffsetCoordinate,
    type OffsetMaybeOffmapCoordinate,
} from "./coordinateMap.ts"

export class CoordinateMapCollectionManager {
    coordinateMapCollection?: CoordinateMapCollection

    constructor(coordinateMapCollection?: CoordinateMapCollection) {
        this.coordinateMapCollection = coordinateMapCollection
    }

    addOrUpdate({ map }: { map: CoordinateMap }) {
        this.throwIfCoordinateMapCollectionIdIsUndefined(this.addOrUpdate.name)
        this.coordinateMapCollection =
            CoordinateMapCollectionService.addOrUpdate({
                collection: this.coordinateMapCollection!,
                map,
            })
    }

    getMapDimensions(id: string): { width: number; height: number } {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.getMapDimensions.name
        )
        const coordinateMap = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: id,
        })
        if (coordinateMap?.coordinates == undefined)
            throw new Error(
                `[CoordinateMapCollectionManager.getMapDimensions] mapId ${id} must have 1 row and at least one column`
            )
        return {
            width: coordinateMap.coordinates[0].length,
            height: coordinateMap.coordinates.length,
        }
    }

    getMovementPropertiesAtCoordinate({
        id,
        row,
        col,
    }: {
        id: string
        row: number
        col: number
    }): {
        movementCost: number | undefined
        canStop: boolean
    } {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.getMovementPropertiesAtCoordinate.name
        )
        const coordinateMap = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id,
        })
        if (coordinateMap?.coordinates[row]?.[col] == undefined) {
            return {
                movementCost: undefined,
                canStop: false,
            }
        }

        return {
            movementCost: coordinateMap.coordinates[row][col].movementCost,
            canStop: coordinateMap.coordinates[row][col].canStop,
        }
    }

    isCoordinateOnMap({
        id,
        row,
        col,
    }: {
        id: string
        row: number
        col: number
    }): boolean {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.isCoordinateOnMap.name
        )
        const coordinateMap = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id,
        })
        return coordinateMap?.coordinates[row]?.[col] != undefined
    }

    addSquaddie({
        mapId,
        squaddieId,
        coordinate,
    }: {
        mapId: string
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
        coordinate: OffsetCoordinate | undefined
    }) {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.addSquaddie.name
        )
        const map = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: mapId,
        })
        if (map == undefined) return

        this.coordinateMapCollection =
            CoordinateMapCollectionService.addOrUpdate({
                collection: this.coordinateMapCollection!,
                map: CoordinateMapService.addSquaddie({
                    map,
                    squaddieId,
                    coordinate: coordinate ?? {
                        row: undefined,
                        col: undefined,
                    },
                }),
            })
    }

    moveSquaddie(param: {
        mapId: string
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
        coordinate: OffsetCoordinate | undefined
    }) {
        return this.addSquaddie(param)
    }

    getSquaddieCoordinate({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
    }): OffsetMaybeOffmapCoordinate | undefined {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getSquaddieCoordinate.name
        )
        const map = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: mapId,
        })
        if (map == undefined) return undefined
        return CoordinateMapService.getSquaddieCoordinate({ map, squaddieId })
    }

    removeSquaddie({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
    }): void {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.removeSquaddie.name
        )
        const map = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: mapId,
        })
        this.coordinateMapCollection =
            CoordinateMapCollectionService.addOrUpdate({
                collection: this.coordinateMapCollection!,
                map: CoordinateMapService.removeSquaddie({
                    map: map!,
                    squaddieId,
                }),
            })
    }

    getSquaddieAtCoordinate({
        mapId,
        coordinate,
    }: {
        mapId: string
        coordinate: OffsetCoordinate
    }):
        | {
              outOfBattleSquaddieId: string
              inBattleSquaddieId: number
          }
        | undefined {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getSquaddieAtCoordinate.name
        )
        const map = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: mapId,
        })
        if (map == undefined) return undefined
        return CoordinateMapService.getSquaddieAtCoordinate({ map, coordinate })
    }

    getAllSquaddieCoordinatesOnMap(id: string): {
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
        coordinate: OffsetMaybeOffmapCoordinate
    }[] {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.getAllSquaddieCoordinatesOnMap.name
        )
        const map = CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: id,
        })
        if (map == undefined) return []
        return CoordinateMapService.getAllSquaddieCoordinatesOnMap(map)
    }

    private throwIfCoordinateMapCollectionWithMapIdIsUndefined(
        id: string,
        callName: string
    ) {
        if (
            !CoordinateMapCollectionService.has({
                collection: this.coordinateMapCollection!,
                id: id,
            })
        )
            throw new Error(
                `[CoordinateMapCollectionManager.${callName}]: mapId ${id} must be defined`
            )
    }

    private throwIfCoordinateMapCollectionIdIsUndefined(callName: string) {
        if (this.coordinateMapCollection == undefined)
            throw new Error(
                `[CoordinateMapCollectionManager.${callName}]: coordinateMapCollection must be defined`
            )
    }

    getMapById(id: string): CoordinateMap {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.getMapById.name
        )

        return CoordinateMapCollectionService.get({
            collection: this.coordinateMapCollection!,
            id: id,
        })!
    }
}
