import type { EnumLike } from "../../enum.js"
import {
    ProficiencyType,
    ProficiencyLevel,
} from "../../proficiency/proficiencyLevel.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { SquaddieConditionType } from "../../proficiency/squaddieCondition.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"

export const GlossaryTermType = {
    OTHER: "OTHER",
    PROFICIENCY_TYPE: "PROFICIENCY_TYPE",
    SQUADDIE_CONDITION_TYPE: "SQUADDIE_CONDITION_TYPE",
    ATTRIBUTE_SCORE_TYPE: "ATTRIBUTE_SCORE_TYPE",
    SQUADDIE_AFFILIATION: "SQUADDIE_AFFILIATION",
    DEGREE_OF_SUCCESS: "DEGREE_OF_SUCCESS",
    PROFICIENCY_LEVEL: "PROFICIENCY_LEVEL",
    ACTION_RANGE: "ACTION_RANGE",
    SQUADDIE_ACTION: "SQUADDIE_ACTION",
    SQUADDIE_ITEM: "SQUADDIE_ITEM",
} as const satisfies Record<string, string>
export type TGlossaryTermType = EnumLike<typeof GlossaryTermType>

// OTHER has no fixed subtype list; editors must use a free text field instead.
// SQUADDIE_ACTION and SQUADDIE_ITEM also have no fixed subtype list: their
// subtypes are action/item ids authored in campaign or mission data, not a
// compile-time enum, so there is nothing for Object.values() to enumerate.
const subtypesByGlossaryTermType: Record<
    TGlossaryTermType,
    readonly string[] | undefined
> = {
    [GlossaryTermType.OTHER]: undefined,
    [GlossaryTermType.PROFICIENCY_TYPE]: Object.values(ProficiencyType),
    [GlossaryTermType.SQUADDIE_CONDITION_TYPE]: Object.values(
        SquaddieConditionType
    ),
    [GlossaryTermType.ATTRIBUTE_SCORE_TYPE]: Object.values(AttributeScore),
    [GlossaryTermType.SQUADDIE_AFFILIATION]: Object.values(SquaddieAffiliation),
    [GlossaryTermType.DEGREE_OF_SUCCESS]: Object.values(DegreeOfSuccess),
    [GlossaryTermType.PROFICIENCY_LEVEL]: Object.values(ProficiencyLevel),
    [GlossaryTermType.ACTION_RANGE]: Object.values(ActionRange),
    [GlossaryTermType.SQUADDIE_ACTION]: undefined,
    [GlossaryTermType.SQUADDIE_ITEM]: undefined,
}

// Campaign glossary.json is expected to define a term per subtype using
// termId `<prefix>.<TYPE>` (e.g. `condition.ARMOR`, `actionRange.MELEE`).
// OTHER has no fixed prefix; editors must build a free text termId instead.
// SQUADDIE_ACTION and SQUADDIE_ITEM do have a fixed prefix (`action`, `item`)
// even though their subtype list is dynamic — termIdFor still produces a
// stable termId like `action.scimitar` from a squaddie action's own id.
const termIdPrefixByGlossaryTermType: Record<
    TGlossaryTermType,
    string | undefined
> = {
    [GlossaryTermType.OTHER]: undefined,
    [GlossaryTermType.PROFICIENCY_TYPE]: "proficiencyType",
    [GlossaryTermType.SQUADDIE_CONDITION_TYPE]: "condition",
    [GlossaryTermType.ATTRIBUTE_SCORE_TYPE]: "attribute",
    [GlossaryTermType.SQUADDIE_AFFILIATION]: "affiliation",
    [GlossaryTermType.DEGREE_OF_SUCCESS]: "degreeOfSuccess",
    [GlossaryTermType.PROFICIENCY_LEVEL]: "proficiencyLevel",
    [GlossaryTermType.ACTION_RANGE]: "actionRange",
    [GlossaryTermType.SQUADDIE_ACTION]: "action",
    [GlossaryTermType.SQUADDIE_ITEM]: "item",
}

export const GlossaryTermTypeService = {
    subtypesOf: (type: TGlossaryTermType): readonly string[] | undefined =>
        subtypesByGlossaryTermType[type],
    termIdPrefix: (type: TGlossaryTermType): string | undefined =>
        termIdPrefixByGlossaryTermType[type],
    termIdFor: (type: TGlossaryTermType, subtype: string): string => {
        const prefix = termIdPrefixByGlossaryTermType[type]
        if (prefix == undefined) {
            throw new Error(
                `[GlossaryTermTypeService.termIdFor]: ${type} has no fixed termId prefix; build a free text termId instead`
            )
        }
        return `${prefix}.${subtype}`
    },
}
