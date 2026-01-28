import type { EnumLike } from "../enum"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMap } from "../coordinateMap/coordinateMap"
import { CoordinateMapService } from "../coordinateMap/coordinateMap"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation"

export const MissionAffiliationTurn = {
    TURN_START: "TURN_START",
    PLAYER_TURN_START: "PLAYER_TURN_START",
    PLAYER_TURN: "PLAYER_TURN",
    PLAYER_TURN_END: "PLAYER_TURN_END",
    ALLY_TURN_START: "ALLY_TURN_START",
    ALLY_TURN: "ALLY_TURN",
    ALLY_TURN_END: "ALLY_TURN_END",
    ENEMY_TURN_START: "ENEMY_TURN_START",
    ENEMY_TURN: "ENEMY_TURN",
    ENEMY_TURN_END: "ENEMY_TURN_END",
    NONE_AFFILIATION_TURN_START: "NONE_AFFILIATION_TURN_START",
    NONE_AFFILIATION_TURN: "NONE_AFFILIATION_TURN",
    NONE_AFFILIATION_TURN_END: "NONE_AFFILIATION_TURN_END",
    TURN_END: "TURN_END",
} as const satisfies Record<string, string>
export type TMissionAffiliationTurn = EnumLike<typeof MissionAffiliationTurn>

export interface MissionTurn {
    turnCount: number
    missionAffiliationTurn: TMissionAffiliationTurn
}

export const MissionTurnService = {
    new: ({
        turnCount = 0,
        missionAffiliationTurn = MissionAffiliationTurn.TURN_START,
    }: {
        turnCount?: number
        missionAffiliationTurn?: TMissionAffiliationTurn
    } = {}): MissionTurn => {
        return {
            turnCount,
            missionAffiliationTurn,
        }
    },

    createFromJSON: (data: {
        turnCount: number
        missionAffiliationTurn: TMissionAffiliationTurn
    }): MissionTurn => {
        return MissionTurnService.new({
            turnCount: data.turnCount,
            missionAffiliationTurn: data.missionAffiliationTurn,
        })
    },

    calculateNextPhase: ({
        missionTurn,
        inBattleSquaddieManager,
        coordinateMap,
    }: {
        missionTurn: MissionTurn
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMap: CoordinateMap
    }): MissionTurn => {
        const currentPhase = missionTurn.missionAffiliationTurn

        const turnStartResult = handleTurnStartPhase(currentPhase, missionTurn)
        if (turnStartResult) return turnStartResult

        const activeTurnResult = handleActiveTurnPhase(
            currentPhase,
            missionTurn,
            inBattleSquaddieManager,
            coordinateMap
        )
        if (activeTurnResult) return activeTurnResult

        const turnEndResult = handleTurnEndPhase(
            currentPhase,
            missionTurn,
            inBattleSquaddieManager,
            coordinateMap
        )
        if (turnEndResult) return turnEndResult

        if (currentPhase === MissionAffiliationTurn.TURN_START) {
            const nextPhase = findNextAvailableAffiliationTurnStart(
                SquaddieAffiliation.PLAYER,
                inBattleSquaddieManager,
                coordinateMap
            )
            return { ...missionTurn, missionAffiliationTurn: nextPhase }
        }

        if (currentPhase === MissionAffiliationTurn.TURN_END) {
            return {
                turnCount: missionTurn.turnCount + 1,
                missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
            }
        }

        return missionTurn
    },
    resetActionPointsForSquaddieAffiliation({
        inBattleSquaddieManager,
        squaddieAffiliation,
    }: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieAffiliation: TSquaddieAffiliation
    }) {
        const battleSquaddieIds =
            inBattleSquaddieManager.getAllSquaddiesOfAffiliation(
                squaddieAffiliation
            )
        for (const battleSquaddieId of battleSquaddieIds) {
            inBattleSquaddieManager.resetActionPoints(battleSquaddieId)
        }
    },
    getSquaddieAffiliationForAffiliationTurn(
        affiliationTurn: TMissionAffiliationTurn
    ): TSquaddieAffiliation | undefined {
        const phaseToAffiliationMap: Record<string, TSquaddieAffiliation> = {
            [MissionAffiliationTurn.PLAYER_TURN_START]:
                SquaddieAffiliation.PLAYER,
            [MissionAffiliationTurn.PLAYER_TURN]: SquaddieAffiliation.PLAYER,
            [MissionAffiliationTurn.PLAYER_TURN_END]:
                SquaddieAffiliation.PLAYER,
            [MissionAffiliationTurn.ALLY_TURN_START]: SquaddieAffiliation.ALLY,
            [MissionAffiliationTurn.ALLY_TURN]: SquaddieAffiliation.ALLY,
            [MissionAffiliationTurn.ALLY_TURN_END]: SquaddieAffiliation.ALLY,
            [MissionAffiliationTurn.ENEMY_TURN_START]:
                SquaddieAffiliation.ENEMY,
            [MissionAffiliationTurn.ENEMY_TURN]: SquaddieAffiliation.ENEMY,
            [MissionAffiliationTurn.ENEMY_TURN_END]: SquaddieAffiliation.ENEMY,
            [MissionAffiliationTurn.NONE_AFFILIATION_TURN_START]:
                SquaddieAffiliation.NONE,
            [MissionAffiliationTurn.NONE_AFFILIATION_TURN]:
                SquaddieAffiliation.NONE,
            [MissionAffiliationTurn.NONE_AFFILIATION_TURN_END]:
                SquaddieAffiliation.NONE,
        }

        return phaseToAffiliationMap[affiliationTurn]
    },

    getAffiliationsToResetForPhase(
        currentPhase: TMissionAffiliationTurn
    ): TSquaddieAffiliation[] {
        if (currentPhase === MissionAffiliationTurn.TURN_START) {
            return [
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.NONE,
            ]
        }

        const resetMap: Record<string, TSquaddieAffiliation[]> = {
            [MissionAffiliationTurn.PLAYER_TURN_END]: [
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.NONE,
            ],
            [MissionAffiliationTurn.ALLY_TURN_END]: [
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.NONE,
            ],
            [MissionAffiliationTurn.ENEMY_TURN_END]: [SquaddieAffiliation.NONE],
        }

        return resetMap[currentPhase] || []
    },
}

const hasSquaddiesThatCanAct = (
    affiliation: TSquaddieAffiliation,
    inBattleSquaddieManager: InBattleSquaddieManager,
    coordinateMap: CoordinateMap
): boolean => {
    const squaddiesOnMap = CoordinateMapService.getAllSquaddieCoordinatesOnMap(
        coordinateMap
    ).filter(
        (info) =>
            info.coordinate.row != undefined && info.coordinate.col != undefined
    )

    for (const { squaddieId } of squaddiesOnMap) {
        const squaddieAffiliation =
            inBattleSquaddieManager.getSquaddieAffiliation(squaddieId)

        if (squaddieAffiliation === affiliation) {
            const canAct = inBattleSquaddieManager.canSquaddieAct({
                battleSquaddieId: {
                    inBattleSquaddieId: squaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId: squaddieId.outOfBattleSquaddieId,
                },
            })

            if (canAct) return true
        }
    }

    return false
}

const findNextAvailableAffiliationTurnStart = (
    startingFrom: TSquaddieAffiliation,
    inBattleSquaddieManager: InBattleSquaddieManager,
    coordinateMap: CoordinateMap
): TMissionAffiliationTurn => {
    const affiliationOrder = [
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ALLY,
        SquaddieAffiliation.ENEMY,
        SquaddieAffiliation.NONE,
    ]

    const startIndex = affiliationOrder.indexOf(startingFrom)

    for (let i = startIndex; i < affiliationOrder.length; i++) {
        const affiliation = affiliationOrder[i]
        if (
            hasSquaddiesThatCanAct(
                affiliation,
                inBattleSquaddieManager,
                coordinateMap
            )
        ) {
            if (affiliation === SquaddieAffiliation.PLAYER)
                return MissionAffiliationTurn.PLAYER_TURN_START
            if (affiliation === SquaddieAffiliation.ALLY)
                return MissionAffiliationTurn.ALLY_TURN_START
            if (affiliation === SquaddieAffiliation.ENEMY)
                return MissionAffiliationTurn.ENEMY_TURN_START
            if (affiliation === SquaddieAffiliation.NONE)
                return MissionAffiliationTurn.NONE_AFFILIATION_TURN_START
        }
    }

    return MissionAffiliationTurn.TURN_END
}

const handleTurnStartPhase = (
    currentPhase: TMissionAffiliationTurn,
    missionTurn: MissionTurn
): MissionTurn | undefined => {
    const transitionMap: Record<string, TMissionAffiliationTurn> = {
        [MissionAffiliationTurn.PLAYER_TURN_START]:
            MissionAffiliationTurn.PLAYER_TURN,
        [MissionAffiliationTurn.ALLY_TURN_START]:
            MissionAffiliationTurn.ALLY_TURN,
        [MissionAffiliationTurn.ENEMY_TURN_START]:
            MissionAffiliationTurn.ENEMY_TURN,
        [MissionAffiliationTurn.NONE_AFFILIATION_TURN_START]:
            MissionAffiliationTurn.NONE_AFFILIATION_TURN,
    }

    const nextPhase = transitionMap[currentPhase]
    if (nextPhase) {
        return { ...missionTurn, missionAffiliationTurn: nextPhase }
    }

    return undefined
}

const handleActiveTurnPhase = (
    currentPhase: TMissionAffiliationTurn,
    missionTurn: MissionTurn,
    inBattleSquaddieManager: InBattleSquaddieManager,
    coordinateMap: CoordinateMap
): MissionTurn | undefined => {
    const affiliationMap: Record<string, TSquaddieAffiliation> = {
        [MissionAffiliationTurn.PLAYER_TURN]: SquaddieAffiliation.PLAYER,
        [MissionAffiliationTurn.ALLY_TURN]: SquaddieAffiliation.ALLY,
        [MissionAffiliationTurn.ENEMY_TURN]: SquaddieAffiliation.ENEMY,
        [MissionAffiliationTurn.NONE_AFFILIATION_TURN]:
            SquaddieAffiliation.NONE,
    }

    const endPhaseMap: Record<string, TMissionAffiliationTurn> = {
        [MissionAffiliationTurn.PLAYER_TURN]:
            MissionAffiliationTurn.PLAYER_TURN_END,
        [MissionAffiliationTurn.ALLY_TURN]:
            MissionAffiliationTurn.ALLY_TURN_END,
        [MissionAffiliationTurn.ENEMY_TURN]:
            MissionAffiliationTurn.ENEMY_TURN_END,
        [MissionAffiliationTurn.NONE_AFFILIATION_TURN]:
            MissionAffiliationTurn.NONE_AFFILIATION_TURN_END,
    }

    const affiliation = affiliationMap[currentPhase]
    if (affiliation) {
        if (
            hasSquaddiesThatCanAct(
                affiliation,
                inBattleSquaddieManager,
                coordinateMap
            )
        ) {
            return missionTurn
        }
        return {
            ...missionTurn,
            missionAffiliationTurn: endPhaseMap[currentPhase],
        }
    }

    return undefined
}

const handleTurnEndPhase = (
    currentPhase: TMissionAffiliationTurn,
    missionTurn: MissionTurn,
    inBattleSquaddieManager: InBattleSquaddieManager,
    coordinateMap: CoordinateMap
): MissionTurn | undefined => {
    const nextAffiliationMap: Record<string, TSquaddieAffiliation> = {
        [MissionAffiliationTurn.PLAYER_TURN_END]: SquaddieAffiliation.ALLY,
        [MissionAffiliationTurn.ALLY_TURN_END]: SquaddieAffiliation.ENEMY,
        [MissionAffiliationTurn.ENEMY_TURN_END]: SquaddieAffiliation.NONE,
    }

    const nextAffiliation = nextAffiliationMap[currentPhase]
    if (nextAffiliation) {
        const nextPhase = findNextAvailableAffiliationTurnStart(
            nextAffiliation,
            inBattleSquaddieManager,
            coordinateMap
        )
        return { ...missionTurn, missionAffiliationTurn: nextPhase }
    }

    if (currentPhase === MissionAffiliationTurn.NONE_AFFILIATION_TURN_END) {
        return {
            ...missionTurn,
            missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
        }
    }

    return undefined
}
