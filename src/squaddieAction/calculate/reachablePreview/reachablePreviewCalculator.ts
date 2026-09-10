import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import type { SquaddieActionManager } from "../../squaddieActionManager.js"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../../../coordinateMap/offsetCoordinate.js"
import type { SquaddieAction } from "../../squaddieAction.js"
import {
    SquaddieActionValidationService,
    type ValidSquaddieActionOption,
} from "../validity/squaddieActionValidationService.js"

export interface ReachablePreviewQueryOptions {
    actionPoints?: "current" | "maximum"
}

export interface MovementDestinationWithCost {
    destination: OffsetCoordinate
    actionPointCost: number
}

export interface ActionableCoordinate {
    actionId: string
    targetCoordinate: OffsetCoordinate
    targetSquaddieIds: BattleSquaddieId[]
    actionPointCost: number
}

export interface ReachableActionTarget {
    actionId: string
    targetCoordinate: OffsetCoordinate
    targetSquaddieIds: BattleSquaddieId[]
    actionPointCostToMoveAndAct: number
}

interface ReachablePreviewCalculatorManagers {
    inBattleSquaddieManager: InBattleSquaddieManager
    squaddieActionManager: SquaddieActionManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
}

interface ReachablePreviewCalculatorInput {
    actor: BattleSquaddieId
    managers: ReachablePreviewCalculatorManagers
    mapId: string
    options?: ReachablePreviewQueryOptions
}

interface MovementActionDestinationsInput
    extends ReachablePreviewCalculatorInput {
    actionId: string
}

export const ReachablePreviewCalculator = {
    movementDestinationsWithCosts: (
        input: ReachablePreviewCalculatorInput
    ): MovementDestinationWithCost[] => {
        const { actionPointBudget, validSquaddieActionOptions } =
            validActionOptionsForBudget(input)

        return validSquaddieActionOptions
            .filter(
                (validSquaddieActionOption) =>
                    validSquaddieActionOption.decisions.targetDestination !=
                    undefined
            )
            .map((validSquaddieActionOption) => ({
                destination:
                    validSquaddieActionOption.decisions.targetDestination!,
                actionPointCost: actionPointCost(
                    actionPointBudget,
                    validSquaddieActionOption
                ),
            }))
    },
    actionableCoordinates: (
        input: ReachablePreviewCalculatorInput
    ): ActionableCoordinate[] => {
        const { actionPointBudget, validSquaddieActionOptions } =
            validActionOptionsForBudget(input)

        return validSquaddieActionOptions
            .filter(
                (validSquaddieActionOption) =>
                    validSquaddieActionOption.decisions.targetCoordinate !=
                    undefined
            )
            .map((validSquaddieActionOption) => ({
                actionId: validSquaddieActionOption.action.id,
                targetCoordinate:
                    validSquaddieActionOption.decisions.targetCoordinate!,
                targetSquaddieIds:
                    validSquaddieActionOption.decisions.targetSquaddieIds ?? [],
                actionPointCost: actionPointCost(
                    actionPointBudget,
                    validSquaddieActionOption
                ),
            }))
    },
    movementActionDestinations: (
        input: MovementActionDestinationsInput
    ): MovementDestinationWithCost[] => {
        const squaddieAction = input.managers.squaddieActionManager.get(
            input.actionId
        )
        const actionPointBudget = actionPointBudgetFor(input)

        if (!squaddieCanAffordAction(squaddieAction, actionPointBudget)) {
            return []
        }

        return SquaddieActionValidationService.generateMovementOptionsForAction(
            {
                actor: input.actor,
                squaddieAction,
                managers: input.managers,
                map: { mapId: input.mapId },
                currentActionPoints: actionPointBudget,
            }
        )
            .filter(
                (validSquaddieActionOption) =>
                    validSquaddieActionOption.decisions.targetDestination !=
                    undefined
            )
            .map((validSquaddieActionOption) => ({
                destination:
                    validSquaddieActionOption.decisions.targetDestination!,
                actionPointCost: actionPointCost(
                    actionPointBudget,
                    validSquaddieActionOption
                ),
            }))
    },
    reachableActionTargets: (
        input: ReachablePreviewCalculatorInput
    ): ReachableActionTarget[] => {
        const actionPointBudget = actionPointBudgetFor(input)
        const cheapestTargetByKey = new Map<string, ReachableActionTarget>()

        for (const standingPosition of standingPositions(input)) {
            const remainingActionPoints =
                actionPointBudget.current - standingPosition.costToReach
            if (remainingActionPoints <= 0) continue

            const validSquaddieActionOptions =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor: input.actor,
                    managers: input.managers,
                    map: { mapId: input.mapId },
                    actionPointsOverride: { current: remainingActionPoints },
                    positionOverride: standingPosition.position,
                })

            for (const validSquaddieActionOption of validSquaddieActionOptions) {
                const { targetCoordinate } = validSquaddieActionOption.decisions
                if (targetCoordinate == undefined) continue

                rememberCheapestTarget({
                    cheapestTargetByKey,
                    actionId: validSquaddieActionOption.action.id,
                    targetCoordinate,
                    targetSquaddieIds:
                        validSquaddieActionOption.decisions.targetSquaddieIds ??
                        [],
                    totalActionPointCost:
                        standingPosition.costToReach +
                        actionPointCost(
                            { current: remainingActionPoints },
                            validSquaddieActionOption
                        ),
                })
            }
        }

        return [...cheapestTargetByKey.values()]
    },
}

const validActionOptionsForBudget = (
    input: ReachablePreviewCalculatorInput
): {
    actionPointBudget: { current: number }
    validSquaddieActionOptions: ValidSquaddieActionOption[]
} => {
    const actionPointBudget = actionPointBudgetFor(input)

    const validSquaddieActionOptions =
        SquaddieActionValidationService.generateValidSquaddieActions({
            actor: input.actor,
            managers: input.managers,
            map: { mapId: input.mapId },
            actionPointsOverride: actionPointBudget,
        })

    return { actionPointBudget, validSquaddieActionOptions }
}

const actionPointBudgetFor = ({
    actor,
    managers,
    options,
}: ReachablePreviewCalculatorInput): { current: number } =>
    options?.actionPoints === "maximum"
        ? {
              current:
                  managers.inBattleSquaddieManager.getMaximumActionPoints(
                      actor
                  ),
          }
        : managers.inBattleSquaddieManager.getActionPoints(actor)

const squaddieCanAffordAction = (
    squaddieAction: SquaddieAction,
    actionPointBudget: { current: number }
): boolean => {
    const spentActionPoints =
        squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent
    if (spentActionPoints === "all") return actionPointBudget.current > 0
    if (spentActionPoints != undefined) {
        return spentActionPoints <= actionPointBudget.current
    }
    return true
}

const standingPositions = (
    input: ReachablePreviewCalculatorInput
): Array<{ position: OffsetCoordinate; costToReach: number }> => {
    const positions: Array<{
        position: OffsetCoordinate
        costToReach: number
    }> = []

    const actorCoordinate =
        input.managers.coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId: input.mapId,
            squaddieId: input.actor,
        })
    if (
        actorCoordinate?.row != undefined &&
        actorCoordinate?.col != undefined
    ) {
        positions.push({
            position: { row: actorCoordinate.row, col: actorCoordinate.col },
            costToReach: 0,
        })
    }

    for (const movementDestination of ReachablePreviewCalculator.movementDestinationsWithCosts(
        input
    )) {
        positions.push({
            position: movementDestination.destination,
            costToReach: movementDestination.actionPointCost,
        })
    }

    return positions
}

const rememberCheapestTarget = ({
    cheapestTargetByKey,
    actionId,
    targetCoordinate,
    targetSquaddieIds,
    totalActionPointCost,
}: {
    cheapestTargetByKey: Map<string, ReachableActionTarget>
    actionId: string
    targetCoordinate: OffsetCoordinate
    targetSquaddieIds: BattleSquaddieId[]
    totalActionPointCost: number
}): void => {
    const key = `${actionId}:${OffsetCoordinateService.coordinateToKey(targetCoordinate)}`

    const existingTarget = cheapestTargetByKey.get(key)
    if (
        existingTarget != undefined &&
        existingTarget.actionPointCostToMoveAndAct <= totalActionPointCost
    ) {
        return
    }

    cheapestTargetByKey.set(key, {
        actionId,
        targetCoordinate,
        targetSquaddieIds,
        actionPointCostToMoveAndAct: totalActionPointCost,
    })
}

const actionPointCost = (
    actionPointBudget: { current: number },
    validSquaddieActionOption: ValidSquaddieActionOption
): number =>
    actionPointBudget.current -
    validSquaddieActionOption.actionPointsRemaining.current
