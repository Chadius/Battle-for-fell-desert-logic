interface Coordinate {
    q: number,
    r: number,
    movementCost: number | undefined,
    canStop: boolean,
}

export interface CoordinateMap {
    id: string
    name: string
    coordinates: Coordinate[][]
}

export const CoordinateMapService = {
    new: ({
              id,
              name,
              movementProperties,
          }: {
        id: string,
        name: string,
        movementProperties: string[],
    }): CoordinateMap => {
        return {
            id,
            name,
            coordinates: convertMovementPropertiesIntoCoordinates(movementProperties),
        }
    },
}

const convertMovementPropertiesIntoCoordinates = (movementProperties: string[]): Coordinate[][] => {
    const coordinates: Coordinate[][] = [];

    for (const [q, row] of movementProperties.entries()) {
        const coordinateRow: Coordinate[] = [];
        const coordinateChars = row.split(" ").map(s => s.trim()).filter(Boolean)
        for (const [r, char] of coordinateChars.entries()) {
            switch (char) {
                case '1':
                    coordinateRow.push({q, r, movementCost: 1, canStop: true});
                    break;
                case '2':
                    coordinateRow.push({q, r, movementCost: 2, canStop: true});
                    break;
                case '-':
                    coordinateRow.push({q, r, movementCost: 1, canStop: false});
                    break;
                default:
                    coordinateRow.push({q, r, movementCost: undefined, canStop: false});
            }
        }
        coordinates.push(coordinateRow);
    }

    let lengthOfLongestRow = Math.max(...coordinates.map(row => row.length));

    for (const [q, coordinateRow] of coordinates.entries()) {
        while (coordinateRow.length < lengthOfLongestRow) {
            coordinateRow.push({q, r: coordinateRow.length, movementCost: undefined, canStop: false});
        }
    }

    return coordinates;
};
