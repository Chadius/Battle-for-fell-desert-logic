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

    addOrUpdateMap({
        id,
        name,
        movementProperties,
    }: {
        id: string
        name: string
        movementProperties: string[]
    }) {
        this.throwIfCoordinateMapCollectionIdIsUndefined(
            this.addOrUpdateMap.name
        )
        this.coordinateMapCollection =
            CoordinateMapCollectionService.addOrUpdateMap({
                collection: this.coordinateMapCollection!,
                id,
                name,
                movementProperties,
            })
    }

    getAllMapIds(): string[] {
        this.throwIfCoordinateMapCollectionIdIsUndefined(this.getAllMapIds.name)
        return Object.keys(this.coordinateMapCollection!.mapById)
    }

    getMapDimensions(mapId: string): { width: number; height: number } {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getMapDimensions.name
        )
        const coordinateMap = this.coordinateMapCollection!.mapById[mapId]
        if (coordinateMap.coordinates == undefined)
            throw new Error(
                `[CoordinateMapCollectionManager.getMapDimensions] mapId ${mapId} must have 1 row and at least one column`
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
        const coordinateMap = this.coordinateMapCollection!.mapById[id]
        if (coordinateMap.coordinates[row]?.[col] == undefined) {
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
        const coordinateMap = this.coordinateMapCollection!.mapById[id]
        return coordinateMap.coordinates[row]?.[col] != undefined
    }

    addSquaddie({
        mapId,
        squaddieId,
        coordinate,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
        coordinate: OffsetCoordinate | undefined
    }) {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.addSquaddie.name
        )
        const map = this.coordinateMapCollection!.mapById[mapId]
        this.coordinateMapCollection!.mapById[mapId] =
            CoordinateMapService.addSquaddie({
                map,
                squaddieId,
                coordinate: coordinate ?? { row: undefined, col: undefined },
            })
    }

    moveSquaddie(param: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
        coordinate: OffsetCoordinate | undefined
    }) {
        return this.addSquaddie(param)
    }

    getSquaddieCoordinate({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
    }): OffsetMaybeOffmapCoordinate | undefined {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getSquaddieCoordinate.name
        )
        const map = this.coordinateMapCollection!.mapById[mapId]
        return CoordinateMapService.getSquaddieCoordinate({ map, squaddieId })
    }

    removeSquaddie({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
    }): void {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.removeSquaddie.name
        )
        const map = this.coordinateMapCollection!.mapById[mapId]
        this.coordinateMapCollection!.mapById[mapId] =
            CoordinateMapService.removeSquaddie({
                map,
                squaddieId,
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
              outOfBattle: string
              inBattle: number
          }
        | undefined {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getSquaddieAtCoordinate.name
        )
        const map = this.coordinateMapCollection!.mapById[mapId]
        return CoordinateMapService.getSquaddieAtCoordinate({ map, coordinate })
    }

    getAllSquaddieCoordinatesOnMap(mapId: string): {
        squaddieId: {
            outOfBattle: string
            inBattle: number
        }
        coordinate: OffsetMaybeOffmapCoordinate
    }[] {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getAllSquaddieCoordinatesOnMap.name
        )
        const map = this.coordinateMapCollection!.mapById[mapId]
        return CoordinateMapService.getAllSquaddieCoordinatesOnMap(map)
    }

    private throwIfCoordinateMapCollectionWithMapIdIsUndefined(
        mapId: string,
        callName: string
    ) {
        if (this.coordinateMapCollection?.mapById[mapId] == undefined)
            throw new Error(
                `[CoordinateMapCollectionManager.${callName}]: mapId ${mapId} must be defined`
            )
    }

    private throwIfCoordinateMapCollectionIdIsUndefined(callName: string) {
        if (this.coordinateMapCollection == undefined)
            throw new Error(
                `[CoordinateMapCollectionManager.${callName}]: coordinateMapCollection must be defined`
            )
    }

    getMapById(mapId: string): CoordinateMap {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            mapId,
            this.getMapById.name
        )

        return CoordinateMapCollectionService.getMapById({
            collection: this.coordinateMapCollection!,
            mapId,
        })
    }
}
