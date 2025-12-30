import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../degreesOfSuccess/degreeOfSuccess"

export const ProbabilityLookup = {
    calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus: (
        modifierTotal: number
    ) => calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(modifierTotal),
}

const SUCCESS_BONUS_CANNOT_FAIL = 4
const SUCCESS_BONUS_CANNOT_CRITICALLY_FAIL = -2
const SUCCESS_BONUS_CANNOT_CRITICALLY_SUCCEED = -13
const SUCCESS_BONUS_CANNOT_SUCCEED = -19

const calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus = (
    actingSquaddieModifierTotal: number
): Map<TDegreeOfSuccess, number> => {
    const chances: Map<number, Map<TDegreeOfSuccess, number>> = new Map([
        [
            SUCCESS_BONUS_CANNOT_FAIL,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 35],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 0],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            3,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 35],
                [DegreeOfSuccess.SUCCESS, 0],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            2,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 33],
                [DegreeOfSuccess.SUCCESS, 2],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            1,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 30],
                [DegreeOfSuccess.SUCCESS, 5],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            0,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 26],
                [DegreeOfSuccess.SUCCESS, 9],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            -1,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 21],
                [DegreeOfSuccess.SUCCESS, 14],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            SUCCESS_BONUS_CANNOT_CRITICALLY_FAIL,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 15],
                [DegreeOfSuccess.SUCCESS, 20],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 0],
            ]),
        ],
        [
            -3,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 10],
                [DegreeOfSuccess.SUCCESS, 25],
                [DegreeOfSuccess.FAILURE, 0],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -4,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 6],
                [DegreeOfSuccess.SUCCESS, 27],
                [DegreeOfSuccess.FAILURE, 2],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -5,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 3],
                [DegreeOfSuccess.SUCCESS, 27],
                [DegreeOfSuccess.FAILURE, 5],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -6,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 25],
                [DegreeOfSuccess.FAILURE, 9],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -7,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 20],
                [DegreeOfSuccess.FAILURE, 14],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -8,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 14],
                [DegreeOfSuccess.FAILURE, 20],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -9,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 9],
                [DegreeOfSuccess.FAILURE, 25],
                [DegreeOfSuccess.BOTCH, 1],
            ]),
        ],
        [
            -10,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 5],
                [DegreeOfSuccess.FAILURE, 27],
                [DegreeOfSuccess.BOTCH, 3],
            ]),
        ],
        [
            -11,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 2],
                [DegreeOfSuccess.FAILURE, 27],
                [DegreeOfSuccess.BOTCH, 6],
            ]),
        ],
        [
            -12,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 1],
                [DegreeOfSuccess.SUCCESS, 0],
                [DegreeOfSuccess.FAILURE, 25],
                [DegreeOfSuccess.BOTCH, 10],
            ]),
        ],
        [
            SUCCESS_BONUS_CANNOT_CRITICALLY_SUCCEED,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 20],
                [DegreeOfSuccess.BOTCH, 15],
            ]),
        ],
        [
            -14,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 14],
                [DegreeOfSuccess.BOTCH, 21],
            ]),
        ],
        [
            -15,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 9],
                [DegreeOfSuccess.BOTCH, 26],
            ]),
        ],
        [
            -16,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 5],
                [DegreeOfSuccess.BOTCH, 30],
            ]),
        ],
        [
            -17,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 2],
                [DegreeOfSuccess.BOTCH, 33],
            ]),
        ],
        [
            -18,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 1],
                [DegreeOfSuccess.FAILURE, 0],
                [DegreeOfSuccess.BOTCH, 35],
            ]),
        ],
        [
            SUCCESS_BONUS_CANNOT_SUCCEED,
            new Map<TDegreeOfSuccess, number>([
                [DegreeOfSuccess.CRITICAL, 0],
                [DegreeOfSuccess.SUCCESS, 0],
                [DegreeOfSuccess.FAILURE, 1],
                [DegreeOfSuccess.BOTCH, 35],
            ]),
        ],
    ])

    if (actingSquaddieModifierTotal > SUCCESS_BONUS_CANNOT_FAIL) {
        return chances.get(SUCCESS_BONUS_CANNOT_FAIL)!
    }
    if (actingSquaddieModifierTotal < SUCCESS_BONUS_CANNOT_SUCCEED) {
        return chances.get(SUCCESS_BONUS_CANNOT_SUCCEED)!
    }
    return chances.get(actingSquaddieModifierTotal)!
}
