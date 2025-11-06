import type { CoordinateMapCollection } from "./coordinateMapCollection.ts"
import { CoordinateMapService } from "./coordinateMap.ts"

export class CoordinateMapCollectionManager {
    coordinateMapCollection: CoordinateMapCollection

    constructor(coordinateMapCollection: CoordinateMapCollection) {
        this.coordinateMapCollection = coordinateMapCollection
    }

    getAllMapIds(): string[] {
        return Object.keys(this.coordinateMapCollection.mapById)
    }

    getMapDimensions(mapId: string): { width: number; height: number } {
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "getMapDimensions",
            fieldName: `mapId ${mapId}`,
        })
        const coordinateMap = this.coordinateMapCollection.mapById[mapId]
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
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[id],
            functionName: "getMovementPropertiesAtCoordinate",
            fieldName: `id ${id}`,
        })
        const coordinateMap = this.coordinateMapCollection.mapById[id]
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
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[id],
            functionName: "isCoordinateOnMap",
            fieldName: `id ${id}`,
        })
        const coordinateMap = this.coordinateMapCollection.mapById[id]
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
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "addSquaddie",
            fieldName: `mapId ${mapId}`,
        })
        const map = this.coordinateMapCollection.mapById[mapId]
        this.coordinateMapCollection.mapById[mapId] =
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
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "getSquaddieCoordinate",
            fieldName: `mapId ${mapId}`,
        })
        const map = this.coordinateMapCollection.mapById[mapId]
        return CoordinateMapService.getSquaddieCoordinate({ map, squaddieId })
    }

    removeSquaddie({
        mapId,
        squaddieId,
    }: {
        mapId: string
        squaddieId: { outOfBattle: string; inBattle: number }
    }): void {
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "removeSquaddie",
            fieldName: `mapId ${mapId}`,
        })
        const map = this.coordinateMapCollection.mapById[mapId]
        this.coordinateMapCollection.mapById[mapId] =
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
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "getSquaddieAtCoordinate",
            fieldName: `mapId ${mapId}`,
        })
        const map = this.coordinateMapCollection.mapById[mapId]
        return CoordinateMapService.getSquaddieAtCoordinate({ map, coordinate })
    }

    getAllSquaddieCoordinatesOnMap(mapId: string): {
        squaddieId: {
            outOfBattle: string
            inBattle: number
        }
        coordinate: { q: number | undefined; r: number | undefined }
    }[] {
        this.throwErrorIfUndefined({
            value: this.coordinateMapCollection.mapById[mapId],
            functionName: "getSquaddieAtCoordinate",
            fieldName: `mapId ${mapId}`,
        })
        const map = this.coordinateMapCollection.mapById[mapId]
        return CoordinateMapService.getAllSquaddieCoordinatesOnMap(map)
    }

    private throwErrorIfUndefined({
        value,
        functionName,
        fieldName,
    }: {
        value: any
        functionName: string
        fieldName: string
    }): void {
        if (value != undefined) return
        throw new Error(
            `[CoordinateMapCollectionManager:${functionName}] ${fieldName} must be defined`
        )
    }
}
