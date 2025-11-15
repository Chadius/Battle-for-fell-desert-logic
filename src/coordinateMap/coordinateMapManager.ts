import {
    type CoordinateMapCollection,
    CoordinateMapCollectionService,
} from "./coordinateMapCollection.ts"
import { CoordinateMapService } from "./coordinateMap.ts"

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
        q,
        r,
    }: {
        id: string
        q: number
        r: number
    }): {
        movementCost: number | undefined
        canStop: boolean
    } {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.getMovementPropertiesAtCoordinate.name
        )
        const coordinateMap = this.coordinateMapCollection!.mapById[id]
        if (coordinateMap.coordinates[q]?.[r] == undefined) {
            return {
                movementCost: undefined,
                canStop: false,
            }
        }

        return {
            movementCost: coordinateMap.coordinates[q][r].movementCost,
            canStop: coordinateMap.coordinates[q][r].canStop,
        }
    }

    isCoordinateOnMap({
        id,
        q,
        r,
    }: {
        id: string
        q: number
        r: number
    }): boolean {
        this.throwIfCoordinateMapCollectionWithMapIdIsUndefined(
            id,
            this.isCoordinateOnMap.name
        )
        const coordinateMap = this.coordinateMapCollection!.mapById[id]
        return coordinateMap.coordinates[q]?.[r] != undefined
    }

    addSquaddie({
        mapId,
        squaddieId,
        coordinate,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
        coordinate: { q: number; r: number } | undefined
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
                coordinate: coordinate ?? { q: undefined, r: undefined },
            })
    }

    moveSquaddie(param: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
        coordinate: { q: number; r: number } | undefined
    }) {
        return this.addSquaddie(param)
    }

    getSquaddieCoordinate({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
    }): { q: number | undefined; r: number | undefined } | undefined {
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
        coordinate: { q: number; r: number }
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
        coordinate: { q: number | undefined; r: number | undefined }
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
}
