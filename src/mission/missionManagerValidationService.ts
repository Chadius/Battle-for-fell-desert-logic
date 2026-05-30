import type { MissionState } from "./missionState"
import { MissionStateService } from "./missionState"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import type { OutOfBattleSquaddie } from "../squaddie/outOfBattle/outOfBattleSquaddie"

export interface MissionManagerValidationInput {
    missionState?: MissionState
    inBattleSquaddieManager?: InBattleSquaddieManager
    coordinateMapCollectionManager?: CoordinateMapCollectionManager
    squaddieActionManager?: SquaddieActionManager
}

export const MissionManagerValidationService = {
    validate(input: MissionManagerValidationInput): {
        isValid: boolean
        errors: string[]
    } {
        const errors: string[] = []
        validateManagersDefined(input, errors)
        validateMapId(input, errors)
        validateInBattleSquaddieReferences(input, errors)
        validateDeploymentSquaddieCounts(input, errors)
        return { isValid: errors.length === 0, errors }
    },
}

const validateManagersDefined = (
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    if (input.missionState == undefined)
        errors.push("missionState must be defined")
    if (input.inBattleSquaddieManager == undefined)
        errors.push("inBattleSquaddieManager must be defined")
    if (input.coordinateMapCollectionManager == undefined)
        errors.push("coordinateMapCollectionManager must be defined")
    if (input.squaddieActionManager == undefined)
        errors.push("squaddieActionManager must be defined")
}

const validateMapId = (
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    if (
        input.coordinateMapCollectionManager == undefined ||
        input.missionState == undefined
    )
        return
    try {
        input.coordinateMapCollectionManager.getMapById(
            input.missionState.mapId
        )
    } catch {
        errors.push(
            `map "${input.missionState.mapId}" not found in coordinateMapCollectionManager`
        )
    }
}

const validateInBattleSquaddieReferences = (
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    if (input.inBattleSquaddieManager?.inBattleSquaddieCollection == undefined)
        return

    const collection = input.inBattleSquaddieManager.inBattleSquaddieCollection
    for (const [
        outOfBattleSquaddieId,
        inBattleSquaddies,
    ] of collection.byOutOfBattleSquaddieId) {
        const rawSquaddie = validateOutOfBattleSquaddie(
            outOfBattleSquaddieId,
            input,
            errors
        )
        if (rawSquaddie != undefined) {
            validateAttributeSheet(
                rawSquaddie.attributeSheetId,
                outOfBattleSquaddieId,
                input,
                errors
            )
            validateActionIds(
                rawSquaddie.actionIds,
                outOfBattleSquaddieId,
                input,
                errors
            )
        }
        for (const inBattleSquaddie of inBattleSquaddies) {
            validateItemIdsUsed(
                inBattleSquaddie.itemIdsUsed,
                inBattleSquaddie.id,
                outOfBattleSquaddieId,
                input,
                errors
            )
        }
    }
}

const validateOutOfBattleSquaddie = (
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput,
    errors: string[]
): OutOfBattleSquaddie | undefined => {
    const outOfBattleSquaddieManager =
        input.inBattleSquaddieManager?.outOfBattleSquaddieManager
    if (outOfBattleSquaddieManager == undefined) return undefined

    const rawSquaddie = outOfBattleSquaddieManager.getRawOutOfBattleSquaddie(
        outOfBattleSquaddieId
    )
    if (rawSquaddie == undefined) {
        errors.push(
            `[MissionManagerValidationService.validate]: outOfBattleSquaddie "${outOfBattleSquaddieId}" not found`
        )
        return undefined
    }
    return rawSquaddie
}

const validateAttributeSheet = (
    attributeSheetId: string,
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    const outOfBattleSquaddieManager =
        input.inBattleSquaddieManager?.outOfBattleSquaddieManager
    if (outOfBattleSquaddieManager == undefined) return

    let attributeSheet
    try {
        attributeSheet =
            outOfBattleSquaddieManager.getAttributeSheet(attributeSheetId)
    } catch {
        errors.push(
            `[MissionManagerValidationService.validate]: attributeSheet "${attributeSheetId}" for outOfBattleSquaddie "${outOfBattleSquaddieId}" not found`
        )
        return
    }

    validateAttributeSheetItemIds(
        attributeSheet.items.itemIds,
        attributeSheetId,
        input,
        errors
    )
}

const validateAttributeSheetItemIds = (
    itemIds: string[],
    attributeSheetId: string,
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    const squaddieItemManager =
        input.inBattleSquaddieManager?.squaddieItemManager
    if (squaddieItemManager == undefined) return

    for (const itemId of itemIds) {
        if (!squaddieItemManager.has(itemId)) {
            errors.push(
                `[MissionManagerValidationService.validate]: item "${itemId}" referenced by attributeSheet "${attributeSheetId}" not found in squaddieItemManager`
            )
        }
    }
}

const validateActionIds = (
    actionIds: string[],
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    if (input.squaddieActionManager == undefined) return

    for (const actionId of actionIds) {
        if (!input.squaddieActionManager.has(actionId)) {
            errors.push(
                `[MissionManagerValidationService.validate]: action "${actionId}" referenced by outOfBattleSquaddie "${outOfBattleSquaddieId}" not found in squaddieActionManager`
            )
        }
    }
}

const validateItemIdsUsed = (
    itemIdsUsed: string[],
    inBattleSquaddieId: number,
    outOfBattleSquaddieId: string,
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    const squaddieItemManager =
        input.inBattleSquaddieManager?.squaddieItemManager
    if (squaddieItemManager == undefined) return

    for (const itemId of itemIdsUsed) {
        if (!squaddieItemManager.has(itemId)) {
            errors.push(
                `[MissionManagerValidationService.validate]: item "${itemId}" used by inBattleSquaddie "${outOfBattleSquaddieId}.${inBattleSquaddieId}" not found in squaddieItemManager`
            )
        }
    }
}

const validateDeploymentSquaddieCounts = (
    input: MissionManagerValidationInput,
    errors: string[]
): void => {
    if (
        input.missionState == undefined ||
        input.inBattleSquaddieManager == undefined
    )
        return

    const pending = MissionStateService.getPendingDeployments(
        input.missionState
    )
    const collection = input.inBattleSquaddieManager.inBattleSquaddieCollection

    for (const deployment of pending) {
        const existing =
            collection.byOutOfBattleSquaddieId.get(
                deployment.outOfBattleSquaddieId
            ) ?? []
        if (existing.length < deployment.coordinates.length) {
            errors.push(
                `[MissionManagerValidationService.validate]: deployment "${deployment.id}" requires ${deployment.coordinates.length} inBattleSquaddies for outOfBattleSquaddieId "${deployment.outOfBattleSquaddieId}" but only ${existing.length} exist`
            )
        }
    }
}
