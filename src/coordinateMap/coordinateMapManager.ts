import type {CoordinateMapCollection} from "./coordinateMapCollection.ts";

export class CoordinateMapCollectionManager {
    coordinateMapCollection: CoordinateMapCollection

    constructor(coordinateMapCollection: CoordinateMapCollection) {
        this.coordinateMapCollection = coordinateMapCollection
    }

    getAllMapIds(): string[] {
        return Object.keys(this.coordinateMapCollection.mapById)
    }

    getMapDimensions(mapId: string): {width: number, height: number} {
        this.throwErrorIfUndefined({value: this.coordinateMapCollection.mapById[mapId], functionName: "getMapDimensions", fieldName: `mapId ${mapId}`})
        const coordinateMap = this.coordinateMapCollection.mapById[mapId]
        if (coordinateMap.coordinates == undefined)
            throw new Error(`[CoordinateMapCollectionManager.getMapDimensions] mapId ${mapId} must have 1 row and at least one column`)
        return {width: coordinateMap.coordinates[0].length, height: coordinateMap.coordinates.length}
    }

    getMovementPropertiesAtCoordinate({id, q, r}: {id: string, q: number, r: number}): {
        movementCost: number | undefined,
        canStop: boolean,
    } {
        this.throwErrorIfUndefined({value: this.coordinateMapCollection.mapById[id], functionName: "getMovementPropertiesAtCoordinate", fieldName: `id ${id}`})
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
    isCoordinateOnMap({id, q, r}: {id: string, q: number, r: number}):boolean {
        this.throwErrorIfUndefined({value: this.coordinateMapCollection.mapById[id], functionName: "isCoordinateOnMap", fieldName: `id ${id}`})
        const coordinateMap = this.coordinateMapCollection.mapById[id]
        return (coordinateMap.coordinates[q]?.[r] != undefined)
    }

    private throwErrorIfUndefined({value, functionName, fieldName}: { value: any, functionName: string, fieldName: string }): void {
        if (value != undefined) return
        throw new Error(`[CoordinateMapCollectionManager:${functionName}] ${fieldName} must be defined`)
    }
}
