import {describe, it, expect, beforeEach} from "vitest"
import {type CoordinateMapCollection, CoordinateMapCollectionService} from "./coordinateMapCollection.ts";
import {CoordinateMapCollectionManager} from "./coordinateMapManager.ts";

describe('Coordinate Map Manager', () => {
    let coordinateMapCollection: CoordinateMapCollection
    let manager: CoordinateMapCollectionManager

    describe('Creating a Coordinate Map', () => {
        beforeEach(() => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            coordinateMapCollection = CoordinateMapCollectionService.createNewMap({
                collection: coordinateMapCollection,
                id: "testMap",
                name: "testMap",
                movementProperties: [
                    "1 1 1 1 ",
                    " 1 2 1 x ",
                    "1 - x x ",
                ],
            })
            manager = new CoordinateMapCollectionManager(coordinateMapCollection)
        })

        it("can list all known maps", () => {
            expect(manager.getAllMapIds()).toEqual(["testMap"])
        })

        it('should know the dimensions of coordinate map', () => {
            expect(manager.getMapDimensions("testMap")).toEqual(expect.objectContaining({width: 4, height: 3}))
        })

        it('should know the movement properties at a given coordinate', () => {
            expect(manager.getMovementPropertiesAtCoordinate({id:"testMap", q:0, r:0})).toEqual(expect.objectContaining({
                movementCost: 1,
                canStop: true,
            }))

            expect(manager.getMovementPropertiesAtCoordinate({id:"testMap", q:1, r:1})).toEqual(expect.objectContaining({
                movementCost: 2,
                canStop: true,
            }))

            expect(manager.getMovementPropertiesAtCoordinate({id:"testMap", q:2, r:1})).toEqual(expect.objectContaining({
                movementCost: 1,
                canStop: false,
            }))

            expect(manager.getMovementPropertiesAtCoordinate({id:"testMap", q:2, r:3})).toEqual(expect.objectContaining({
                movementCost: undefined,
                canStop: false,
            }))
        })

        it('should say if the coordinates are on map', () => {
            expect(manager.isCoordinateOnMap({id:"testMap", q:0, r:0})).toBeTruthy()
            expect(manager.isCoordinateOnMap({id:"testMap", q:-1, r:0})).toBeFalsy()
            expect(manager.isCoordinateOnMap({id:"testMap", q:0, r:-1})).toBeFalsy()
            expect(manager.isCoordinateOnMap({id:"testMap", q:0, r:4})).toBeFalsy()
            expect(manager.isCoordinateOnMap({id:"testMap", q:3, r:0})).toBeFalsy()
        })

        it('should say the movement properties are none if the location is off map', () => {
            expect(manager.getMovementPropertiesAtCoordinate({id:"testMap", q:-9001, r:9002})).toEqual(expect.objectContaining({
                movementCost: undefined,
                canStop: false,
            }))
        })
    });
});
