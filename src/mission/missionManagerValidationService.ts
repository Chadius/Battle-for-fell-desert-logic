import type { MissionState } from "./missionState.js"
import { MissionStateService } from "./missionState.js"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import type { OutOfBattleSquaddie } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { CoordinateMapService } from "../coordinateMap/coordinateMap.js"
import type { ArmyManager } from "../campaign/army/armyManager.js"
import { CampaignSquaddieDeploymentCoordinateCollectionService } from "./campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentValidationService } from "./campaignSquaddieDeploymentValidationService.js"

export interface MissionManagerValidationInput {
    missionState?: MissionState
    inBattleSquaddieManager?: InBattleSquaddieManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager
    armyManager?: ArmyManager
}

export const MissionManagerValidationService = {
    validate(input: MissionManagerValidationInput): {
        isValid: boolean
        errors: string[]
    } {
        const errors = [
            ...validateManagersDefined(input),
            ...validateMapId(input),
            ...validateInBattleSquaddieReferences(input),
            ...validateDeploymentSquaddieCounts(input),
            ...validateDeploymentCoordinates(input),
            ...validateCampaignSquaddieDeploymentRequiresArmyManager(input),
            ...validateCampaignSquaddieDeploymentCoordinates(input),
            ...validateNoCoordinateOverlapBetweenDeploymentTypes(input),
        ]
        return { isValid: errors.length === 0, errors }
    },
}

const validateManagersDefined = (
    input: MissionManagerValidationInput
): string[] => {
    const errors: string[] = []
    if (input.missionState == undefined)
        errors.push("missionState must be defined")
    if (input.inBattleSquaddieManager == undefined)
        errors.push("inBattleSquaddieManager must be defined")
    if (input.coordinateMapCollectionManager == undefined)
        errors.push("coordinateMapCollectionManager must be defined")
    if (input.squaddieActionManager == undefined)
        errors.push("squaddieActionManager must be defined")
    return errors
}

const validateMapId = (input: MissionManagerValidationInput): string[] => {
    if (
        input.coordinateMapCollectionManager == undefined ||
        input.missionState == undefined
    )
        return []
    try {
        input.coordinateMapCollectionManager.getMapById(
            input.missionState.mapId
        )
        return []
    } catch {
        return [
            `map "${input.missionState.mapId}" not found in coordinateMapCollectionManager`,
        ]
    }
}

const validateInBattleSquaddieReferences = (
    input: MissionManagerValidationInput
): string[] => {
    if (input.inBattleSquaddieManager?.inBattleSquaddieCollection == undefined)
        return []

    const inBattleSquaddieCollection =
        input.inBattleSquaddieManager.inBattleSquaddieCollection
    const errors: string[] = []
    for (const [
        outOfBattleSquaddieId,
        inBattleSquaddies,
    ] of inBattleSquaddieCollection.byOutOfBattleSquaddieId) {
        const { outOfBattleSquaddie, errors: squaddieErrors } =
            outOfBattleSquaddieOrErrors(outOfBattleSquaddieId, input)
        errors.push(...squaddieErrors)
        if (outOfBattleSquaddie != undefined) {
            errors.push(
                ...validateAttributeSheet(
                    outOfBattleSquaddie.attributeSheetId,
                    outOfBattleSquaddieId,
                    input
                ),
                ...validateActionIds(
                    outOfBattleSquaddie.actionIds,
                    outOfBattleSquaddieId,
                    input
                )
            )
        }
        for (const inBattleSquaddie of inBattleSquaddies) {
            errors.push(
                ...validateItemIdsUsed(
                    inBattleSquaddie.itemIdsUsed,
                    inBattleSquaddie.id,
                    outOfBattleSquaddieId,
                    input
                )
            )
        }
    }
    return errors
}

const outOfBattleSquaddieOrErrors = (
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput
): {
    outOfBattleSquaddie: OutOfBattleSquaddie | undefined
    errors: string[]
} => {
    const outOfBattleSquaddieManager =
        input.inBattleSquaddieManager?.outOfBattleSquaddieManager
    if (outOfBattleSquaddieManager == undefined)
        return { outOfBattleSquaddie: undefined, errors: [] }

    const outOfBattleSquaddie =
        outOfBattleSquaddieManager.getRawOutOfBattleSquaddie(
            outOfBattleSquaddieId
        )
    if (outOfBattleSquaddie == undefined) {
        return {
            outOfBattleSquaddie: undefined,
            errors: [
                `[MissionManagerValidationService.validate]: outOfBattleSquaddie "${outOfBattleSquaddieId}" not found`,
            ],
        }
    }
    return { outOfBattleSquaddie, errors: [] }
}

const validateAttributeSheet = (
    attributeSheetId: string,
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput
): string[] => {
    const outOfBattleSquaddieManager =
        input.inBattleSquaddieManager?.outOfBattleSquaddieManager
    if (outOfBattleSquaddieManager == undefined) return []

    try {
        const attributeSheet =
            outOfBattleSquaddieManager.getAttributeSheet(attributeSheetId)
        return validateAttributeSheetItemIds(
            attributeSheet.items.itemIds,
            attributeSheetId,
            input
        )
    } catch {
        return [
            `[MissionManagerValidationService.validate]: attributeSheet "${attributeSheetId}" for outOfBattleSquaddie "${outOfBattleSquaddieId}" not found`,
        ]
    }
}

const validateAttributeSheetItemIds = (
    itemIds: string[],
    attributeSheetId: string,
    input: MissionManagerValidationInput
): string[] => {
    const squaddieItemManager =
        input.inBattleSquaddieManager?.squaddieItemManager
    if (squaddieItemManager == undefined) return []

    return itemIds
        .filter((itemId) => !squaddieItemManager.has(itemId))
        .map(
            (itemId) =>
                `[MissionManagerValidationService.validate]: item "${itemId}" referenced by attributeSheet "${attributeSheetId}" not found in squaddieItemManager`
        )
}

const validateActionIds = (
    actionIds: string[],
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput
): string[] => {
    if (input.squaddieActionManager == undefined) return []

    return actionIds
        .filter((actionId) => !input.squaddieActionManager!.has(actionId))
        .map(
            (actionId) =>
                `[MissionManagerValidationService.validate]: action "${actionId}" referenced by outOfBattleSquaddie "${outOfBattleSquaddieId}" not found in squaddieActionManager`
        )
}

const validateItemIdsUsed = (
    itemIdsUsed: string[],
    inBattleSquaddieId: number,
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput
): string[] => {
    const squaddieItemManager =
        input.inBattleSquaddieManager?.squaddieItemManager
    if (squaddieItemManager == undefined) return []

    return itemIdsUsed
        .filter((itemId) => !squaddieItemManager.has(itemId))
        .map(
            (itemId) =>
                `[MissionManagerValidationService.validate]: item "${itemId}" used by inBattleSquaddie "${outOfBattleSquaddieId}.${inBattleSquaddieId}" not found in squaddieItemManager`
        )
}

const validateDeploymentSquaddieCounts = (
    input: MissionManagerValidationInput
): string[] => {
    if (
        input.missionState == undefined ||
        input.inBattleSquaddieManager == undefined
    )
        return []

    const pending = MissionStateService.getPendingDeployments(
        input.missionState
    )
    const inBattleSquaddieCollection =
        input.inBattleSquaddieManager.inBattleSquaddieCollection

    const errors: string[] = []
    for (const deployment of pending) {
        const existing =
            inBattleSquaddieCollection?.byOutOfBattleSquaddieId.get(
                deployment.outOfBattleSquaddieId
            ) ?? []
        if (existing.length < deployment.coordinates.length) {
            errors.push(
                `[MissionManagerValidationService.validate]: deployment "${deployment.id}" requires ${deployment.coordinates.length} inBattleSquaddies for outOfBattleSquaddieId "${deployment.outOfBattleSquaddieId}" but only ${existing.length} exist`
            )
        }
    }
    return errors
}

const validateDeploymentCoordinates = (
    input: MissionManagerValidationInput
): string[] => {
    if (
        input.missionState == undefined ||
        input.coordinateMapCollectionManager == undefined
    )
        return []

    let map
    try {
        map = input.coordinateMapCollectionManager.getMapById(
            input.missionState.mapId
        )
    } catch {
        return []
    }

    const pending = MissionStateService.getPendingDeployments(
        input.missionState
    )

    const errors: string[] = []
    for (const deployment of pending) {
        for (const coordinate of deployment.coordinates) {
            if (
                !CoordinateMapService.canSquaddieStopAtCoordinate({
                    map,
                    coordinate,
                })
            ) {
                errors.push(
                    `[MissionManagerValidationService.validate]: deployment "${deployment.id}" coordinate (row ${coordinate.row}, col ${coordinate.col}) is not a valid stopping point`
                )
            }
        }
    }
    return errors
}

const validateCampaignSquaddieDeploymentRequiresArmyManager = (
    input: MissionManagerValidationInput
): string[] => {
    if (input.missionState?.campaignSquaddieDeploymentCoordinates == undefined)
        return []

    const hasCoordinates =
        CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
            input.missionState.campaignSquaddieDeploymentCoordinates
        ).length > 0
    if (!hasCoordinates) return []

    if (input.armyManager == undefined) {
        return [
            "[MissionManagerValidationService.validate]: armyManager must be defined when campaignSquaddieDeploymentCoordinates is present",
        ]
    }
    return []
}

const validateCampaignSquaddieDeploymentCoordinates = (
    input: MissionManagerValidationInput
): string[] => {
    if (input.missionState?.campaignSquaddieDeploymentCoordinates == undefined)
        return []
    if (input.armyManager == undefined) return []

    const campaignSquaddieDeploymentCoordinateCollection =
        input.missionState.campaignSquaddieDeploymentCoordinates

    const coordinateCollectionResult =
        CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
            campaignSquaddieDeploymentCoordinateCollection
        )

    const leaderCampaignSquaddieId = input.armyManager
        .getAll()
        .find((campaignSquaddie) => campaignSquaddie.isLeader)?.id
    const leaderRequestConflictResult =
        CampaignSquaddieDeploymentValidationService.validateNoLeaderRequestConflict(
            {
                collection: campaignSquaddieDeploymentCoordinateCollection,
                leaderCampaignSquaddieId,
            }
        )

    return [
        ...coordinateCollectionResult.errors,
        ...leaderRequestConflictResult.errors,
    ]
}

const validateNoCoordinateOverlapBetweenDeploymentTypes = (
    input: MissionManagerValidationInput
): string[] => {
    if (input.missionState?.campaignSquaddieDeploymentCoordinates == undefined)
        return []

    return CampaignSquaddieDeploymentValidationService.validateNoOverlapWithMissionDeployments(
        {
            collection:
                input.missionState.campaignSquaddieDeploymentCoordinates,
            missionDeployments: MissionStateService.getPendingDeployments(
                input.missionState
            ),
        }
    ).errors
}
