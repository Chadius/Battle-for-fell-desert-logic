import { describe, expect, it } from "vitest"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import {
    DEFAULT_END_TURN_ACTION_ID,
    DEFAULT_MOVE_ACTION_ID,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationOutcome,
    SquaddieActionClassificationProficiency,
    SquaddieActionClassificationReach,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import {
    type ClassificationTestActionOptions,
    ClassificationTestActions,
} from "./classificationTestActions.js"

const COMPOSED_CLASSIFICATION_COUNT = 72
const CLASSIFICATION_COUNT = 76

describe("SquaddieActionClassificationService.parts", () => {
    describe("when the classification is composed", () => {
        it("returns its proficiency, reach and outcome", () => {
            expect(
                SquaddieActionClassificationService.parts("MIND_LINE_DAMAGE")
            ).toEqual({
                proficiency: SquaddieActionClassificationProficiency.MIND,
                reach: SquaddieActionClassificationReach.LINE,
                outcome: SquaddieActionClassificationOutcome.DAMAGE,
            })
        })
    })

    describe("when the classification has no proficiency, reach or outcome", () => {
        it.each(Object.values(SquaddieActionClassification))(
            "returns undefined for %s",
            (classification) => {
                expect(
                    SquaddieActionClassificationService.parts(classification)
                ).toBeUndefined()
            }
        )
    })
})

describe("SquaddieActionClassificationService.all", () => {
    describe("when listing every classification", () => {
        it("lists each classification once", () => {
            const classifications = SquaddieActionClassificationService.all()

            expect(classifications).toHaveLength(new Set(classifications).size)
        })

        it("lists every standalone and composed classification", () => {
            expect(
                new Set(SquaddieActionClassificationService.all()).size
            ).toBe(CLASSIFICATION_COUNT)
        })
    })

    describe("when a listed classification is composed", () => {
        it("builds back from its parts to the same classification", () => {
            const composedClassifications =
                SquaddieActionClassificationService.all().filter(
                    (classification) =>
                        SquaddieActionClassificationService.parts(
                            classification
                        ) != undefined
                )

            const rebuiltClassifications = composedClassifications.map(
                (classification) => {
                    const parts =
                        SquaddieActionClassificationService.parts(
                            classification
                        )
                    return `${parts?.proficiency}_${parts?.reach}_${parts?.outcome}`
                }
            )

            expect(composedClassifications).toHaveLength(
                COMPOSED_CLASSIFICATION_COUNT
            )
            expect(rebuiltClassifications).toEqual(composedClassifications)
        })
    })

    describe("for every kind of action the classifier distinguishes", () => {
        it.each(representativeActions())(
            "includes the classification of a %s",
            (_label, squaddieAction) => {
                expect(SquaddieActionClassificationService.all()).toContain(
                    SquaddieActionClassificationService.classify(squaddieAction)
                )
            }
        )
    })
})

function representativeActions(): [string, SquaddieAction][] {
    const proficiencies = [
        ["weapon", ProficiencyType.WEAPON_MARTIAL],
        ["mind skill", ProficiencyType.SKILL_MIND],
        ["unknown proficiency", ProficiencyType.UNKNOWN],
    ] as const
    const reaches: [string, ClassificationTestActionOptions][] = [
        ["self", { range: ActionRange.SELF }],
        ["melee", { range: ActionRange.MELEE }],
        ["ranged", { range: ActionRange.LONG }],
        [
            "line",
            { range: ActionRange.LONG, shape: CoordinateGeneratorShape.LINE },
        ],
        [
            "cone",
            {
                range: ActionRange.SHORT,
                shape: CoordinateGeneratorShape.CONE,
                areaOfEffectSize: 1,
            },
        ],
        [
            "bloom",
            {
                range: ActionRange.MEDIUM,
                shape: CoordinateGeneratorShape.BLOOM,
                areaOfEffectSize: 1,
            },
        ],
    ]
    const outcomeBuilders = [
        ["attack", ClassificationTestActions.attack],
        ["hinder", ClassificationTestActions.hinder],
        ["assist", ClassificationTestActions.assist],
    ] as const

    return [
        ["default move", defaultActionById(DEFAULT_MOVE_ACTION_ID)],
        ["default end turn", defaultActionById(DEFAULT_END_TURN_ACTION_ID)],
        ...proficiencies.flatMap(([proficiencyLabel, proficiency]) =>
            reaches.flatMap(([reachLabel, options]) =>
                outcomeBuilders.map(
                    ([outcomeLabel, buildTestAction]): [
                        string,
                        SquaddieAction,
                    ] => [
                        `${proficiencyLabel} ${reachLabel} ${outcomeLabel}`,
                        buildTestAction({ proficiency, ...options }),
                    ]
                )
            )
        ),
    ]
}

function defaultActionById(actionId: string): SquaddieAction {
    const defaultSquaddieAction = SquaddieActionService.defaultActions().find(
        (squaddieAction) => squaddieAction.id === actionId
    )
    if (defaultSquaddieAction == undefined)
        throw new Error(`defaultActionById: no default action ${actionId}`)
    return defaultSquaddieAction
}
