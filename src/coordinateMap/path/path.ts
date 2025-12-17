import type { OffsetCoordinate } from "../coordinateMap.ts"
import type { EnumLike } from "../../enum.ts"

export const CoordinateMovePathMoveType = {
    START: "START",
    WALK: "WALK",
    JUMP: "JUMP",
    PHASE: "PHASE",
    END: "END",
} as const satisfies Record<string, string>
export type TCoordinateMovePathMoveType = EnumLike<
    typeof CoordinateMovePathMoveType
>

export interface CoordinateMovePathStep extends OffsetCoordinate {
    moveType: TCoordinateMovePathMoveType
    moveCost: number
}

export interface CoordinateMovePath {
    steps: CoordinateMovePathStep[]
    movementInstruction?: CoordinateMovementInstruction[]
}

export type CoordinateMovementInstruction = {
    start: OffsetCoordinate
    end: OffsetCoordinate
    moveType: TCoordinateMovePathMoveType
}

export const CoordinateMovePathService = {
    new: ({
        steps,
    }: {
        steps: CoordinateMovePathStep[]
    }): CoordinateMovePath => {
        if (steps.length <= 0)
            throw new Error(
                "[CoordinateMovePathService.new]: coordinates must have at least 1 coordinate"
            )
        return {
            steps: steps.map((c) => cloneStep(c)),
        }
    },
    getNumberOfCoordinates: (path: CoordinateMovePath): number => {
        throwIfPathIsUndefined(path, "getNumberOfCoordinates")
        return path.steps.length
    },
    getTotalMoveCost: (path: CoordinateMovePath): number => {
        throwIfPathIsUndefined(path, "getTotalMoveCost")
        let totalMoveCost = 0
        for (const [index, step] of path.steps.entries()) {
            if (index == 0) continue
            totalMoveCost += step.moveCost
        }
        return totalMoveCost
    },
    getStartCoordinate: (path: CoordinateMovePath): CoordinateMovePathStep => {
        throwIfPathIsUndefined(path, "getStartCoordinate")
        return path.steps[0]
    },
    getEndCoordinate: (path: CoordinateMovePath): CoordinateMovePathStep => {
        throwIfPathIsUndefined(path, "getEndCoordinate")
        return path.steps.at(-1)!
    },
    getMovementInstructions: (
        path: CoordinateMovePath
    ): CoordinateMovementInstruction[] => {
        throwIfPathIsUndefined(path, "getEndCoordinate")
        if (path.movementInstruction) return path.movementInstruction

        const instructions = [
            {
                start: path.steps[0],
                end: path.steps[0],
                moveType: path.steps[0].moveType,
            },
        ]

        if (path.steps.length <= 1) return instructions

        for (let i = 1; i < path.steps.length; i++) {
            const step = path.steps[i]
            const previousStep = path.steps[i - 1]
            instructions.push({
                start: previousStep,
                end: step,
                moveType: step.moveType,
            })
        }

        instructions.push({
            start: path.steps.at(-1)!,
            end: path.steps.at(-1)!,
            moveType: CoordinateMovePathMoveType.END,
        })

        path.movementInstruction = instructions

        return instructions
    },
}

const throwIfPathIsUndefined = (path: CoordinateMovePath, callName: string) => {
    if (path == undefined)
        throw new Error(
            `[CoordinateMovePathService.${callName}]: Path must be defined`
        )
}

const cloneStep = (
    original: CoordinateMovePathStep
): CoordinateMovePathStep => {
    return {
        row: original.row,
        col: original.col,
        moveType: original.moveType,
        moveCost: original.moveCost,
    }
}
