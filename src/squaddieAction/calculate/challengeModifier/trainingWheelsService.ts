import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../../degreesOfSuccess/degreeOfSuccess.js"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
    type TSquaddieAffiliation,
} from "../../../affiliation/affiliation.js"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import {
    ChallengeModifierSettingService,
    ChallengeModifierType,
    type ChallengeModifierSetting,
} from "./challengeModifierSetting.js"

interface ForcedDegreeInput {
    actorAffiliation: TSquaddieAffiliation
    targetAffiliation: TSquaddieAffiliation
    degreesOfSuccess: TDegreeOfSuccess[]
}

export const TrainingWheelsService = {
    getForcedDegreeOfSuccess: ({
        challengeModifierSetting,
        squaddieAction,
        actorAffiliation,
        targetAffiliation,
    }: {
        challengeModifierSetting: ChallengeModifierSetting | undefined
        squaddieAction: SquaddieAction
        actorAffiliation: TSquaddieAffiliation
        targetAffiliation: TSquaddieAffiliation
    }): TDegreeOfSuccess | undefined => {
        if (
            !ChallengeModifierSettingService.isEnabled(
                challengeModifierSetting,
                ChallengeModifierType.TRAINING_WHEELS
            )
        )
            return undefined

        if (!SquaddieActionService.isAttackAction(squaddieAction))
            return undefined

        const forcedDegreeInput: ForcedDegreeInput = {
            actorAffiliation,
            targetAffiliation,
            degreesOfSuccess: squaddieAction.degreesOfSuccess,
        }

        return (
            forcedDegreeWhenPlayerAttacks(forcedDegreeInput) ??
            forcedDegreeWhenPlayerIsAttacked(forcedDegreeInput)
        )
    },
}

const forcedDegreeWhenPlayerAttacks = ({
    actorAffiliation,
    targetAffiliation,
    degreesOfSuccess,
}: ForcedDegreeInput): TDegreeOfSuccess | undefined => {
    if (actorAffiliation !== SquaddieAffiliation.PLAYER) return undefined

    if (
        SquaddieAffiliationService.areFriends({
            actor: actorAffiliation,
            target: targetAffiliation,
        })
    )
        return undefined

    return degreesOfSuccess.includes(DegreeOfSuccess.CRITICAL)
        ? DegreeOfSuccess.CRITICAL
        : DegreeOfSuccess.SUCCESS
}

const forcedDegreeWhenPlayerIsAttacked = ({
    targetAffiliation,
    degreesOfSuccess,
}: ForcedDegreeInput): TDegreeOfSuccess | undefined => {
    if (targetAffiliation !== SquaddieAffiliation.PLAYER) return undefined

    return degreesOfSuccess.includes(DegreeOfSuccess.BOTCH)
        ? DegreeOfSuccess.BOTCH
        : DegreeOfSuccess.FAILURE
}
