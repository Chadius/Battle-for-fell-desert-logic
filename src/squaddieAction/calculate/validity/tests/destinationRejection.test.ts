import { beforeEach, describe, expect, it } from "vitest"
import {
    SquaddieActionValidationService,
    type ActionValidationResult,
} from "../squaddieActionValidationService.js"
import {
    DEFAULT_MOVE_ACTION_ID,
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    type SquaddieAction,
    SquaddieActionService,
} from "../../../squaddieAction.js"
import {
    ActionRange,
    ActionRangeService,
    type TActionRange,
} from "../../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation.js"
import {
    ValidationTestSetup,
    type ValidationTestResult,
} from "../../../../testUtils/validationTestSetup.js"
import type { OffsetCoordinate } from "../../../../coordinateMap/offsetCoordinate.js"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId.js"
import { SquaddieActionRejectionReason } from "../squaddieActionRejection.js"

const leapActionId = "leap"
const rescueActionId = "rescue"

const createLeapWithMinimumRange = (minimumRange: number): SquaddieAction =>
    SquaddieActionService.new({
        id: leapActionId,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
                movement: {
                    movementType:
                        MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                    traversal: {
                        squaddieMovementSpecialTraversalInfo: {
                            actionPointsOfMovement: 1,
                            minimumRange,
                        },
                    },
                },
            },
        },
    })

const createRescue = (destinationRange: TActionRange): SquaddieAction =>
    SquaddieActionService.new({
        id: rescueActionId,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: { self: false, foe: false, friend: true },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                movement: {
                    movementType: MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                    destinationRange,
                },
            },
        },
    })

const validateDestination = ({
    setup,
    actionId,
    targets,
    targetDestination,
}: {
    setup: ValidationTestResult
    actionId: string
    targets: BattleSquaddieId[]
    targetDestination: OffsetCoordinate
}): ActionValidationResult =>
    SquaddieActionValidationService.isActionValid({
        actor: setup.actor,
        targets,
        action: { id: actionId, decisions: { targetDestination } },
        managers: {
            inBattleSquaddieManager: setup.inBattleSquaddieManager,
            squaddieActionManager: setup.squaddieActionManager,
            coordinateMapCollectionManager:
                setup.coordinateMapCollectionManager,
        },
        map: { mapId: setup.mapId },
    })

describe("destination rejections", () => {
    describe("when a Leap lands inside its minimum range", () => {
        let result: ActionValidationResult

        beforeEach(() => {
            const setup = ValidationTestSetup.create({
                mapMovementProperties: ["1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })
            setup.squaddieActionManager.addOrUpdate(
                createLeapWithMinimumRange(2)
            )

            result = validateDestination({
                setup,
                actionId: leapActionId,
                targets: [],
                targetDestination: { row: 0, col: 1 },
            })
        })

        it("reports the destination is too close", () => {
            expect(result).toEqual({
                isValid: false,
                rejection: {
                    reason: SquaddieActionRejectionReason.DESTINATION_TOO_CLOSE,
                },
            })
        })
    })

    describe("when a Rescue sends its target beyond the destination range", () => {
        let result: ActionValidationResult

        beforeEach(() => {
            const setup = ValidationTestSetup.create({
                mapMovementProperties: ["1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
                targets: [
                    {
                        id: "ally",
                        affiliation: SquaddieAffiliation.PLAYER,
                        position: { row: 0, col: 1 },
                    },
                ],
            })
            setup.squaddieActionManager.addOrUpdate(
                createRescue(ActionRange.MELEE)
            )

            result = validateDestination({
                setup,
                actionId: rescueActionId,
                targets: setup.targetIds,
                targetDestination: {
                    row: 0,
                    col:
                        ActionRangeService.minAndMaxByRange[ActionRange.MELEE]
                            .maximum + 1,
                },
            })
        })

        it("reports the destination is out of range", () => {
            expect(result).toEqual({
                isValid: false,
                rejection: {
                    reason: SquaddieActionRejectionReason.DESTINATION_OUT_OF_RANGE,
                },
            })
        })
    })

    describe("when a Rescue sends its target to a tile behind a wall", () => {
        let result: ActionValidationResult

        beforeEach(() => {
            const setup = ValidationTestSetup.create({
                mapMovementProperties: ["1 x 1 1 1", " 1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
                targets: [
                    {
                        id: "ally",
                        affiliation: SquaddieAffiliation.PLAYER,
                        position: { row: 1, col: 0 },
                    },
                ],
            })
            setup.squaddieActionManager.addOrUpdate(
                createRescue(ActionRange.SHORT)
            )

            result = validateDestination({
                setup,
                actionId: rescueActionId,
                targets: setup.targetIds,
                targetDestination: { row: 0, col: 2 },
            })
        })

        it("reports the destination is not visible", () => {
            expect(result).toEqual({
                isValid: false,
                rejection: {
                    reason: SquaddieActionRejectionReason.DESTINATION_NOT_VISIBLE,
                },
            })
        })
    })

    describe("when the moving squaddie is not on the map", () => {
        let result: ActionValidationResult

        beforeEach(() => {
            const setup = ValidationTestSetup.create({
                mapMovementProperties: ["1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })
            setup.squaddieActionManager.addOrUpdate(
                SquaddieActionService.defaultMove()
            )
            setup.coordinateMapCollectionManager.removeSquaddie({
                mapId: setup.mapId,
                squaddieId: setup.actor,
            })

            result = validateDestination({
                setup,
                actionId: DEFAULT_MOVE_ACTION_ID,
                targets: [],
                targetDestination: { row: 0, col: 2 },
            })
        })

        it("reports the squaddie has no position", () => {
            expect(result).toEqual({
                isValid: false,
                rejection: {
                    reason: SquaddieActionRejectionReason.ACTOR_HAS_NO_POSITION,
                },
            })
        })
    })
})
