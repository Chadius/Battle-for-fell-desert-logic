import type { CampaignSquaddieDeploymentCoordinate } from "./campaignSquaddieDeploymentCoordinate.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import type { CampaignSquaddie } from "../campaign/army/campaignSquaddie.js"
import type { MissionDeployment } from "./missionDeployment.js"
import { OffsetCoordinateService } from "../coordinateMap/offsetCoordinate.js"

export interface CampaignSquaddieDeploymentValidationResult {
    isValid: boolean
    errors: string[]
}

export const CampaignSquaddieDeploymentValidationService = {
    validateCoordinateCollection: (
        collection: CampaignSquaddieDeploymentCoordinateCollection
    ): CampaignSquaddieDeploymentValidationResult => {
        const errors = [
            ...atMostOneLeaderCoordinateErrors(collection),
            ...duplicateCoordinatePositionErrors(collection),
            ...duplicateSpecificSquaddieRequestErrors(collection),
        ]
        return { isValid: errors.length === 0, errors }
    },

    validateNoLeaderRequestConflict: ({
        collection,
        leaderCampaignSquaddieId,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        leaderCampaignSquaddieId: string | undefined
    }): CampaignSquaddieDeploymentValidationResult => {
        const errors = leaderRequestConflictErrors(
            collection,
            leaderCampaignSquaddieId
        )
        return { isValid: errors.length === 0, errors }
    },

    validateAssignmentEligibility: ({
        campaignSquaddie,
    }: {
        campaignSquaddie: CampaignSquaddie
    }): CampaignSquaddieDeploymentValidationResult => {
        if (
            !CampaignSquaddieDeploymentValidationService.isSquaddieEligible(
                campaignSquaddie
            )
        ) {
            return {
                isValid: false,
                errors: [
                    `[CampaignSquaddieDeploymentValidationService.validateAssignmentEligibility]: campaignSquaddie "${campaignSquaddie.id}" is injured and cannot be deployed`,
                ],
            }
        }
        return { isValid: true, errors: [] }
    },

    validateCoordinateIsNotLockSatisfied: ({
        coordinate: deploymentCoordinate,
        assignedCampaignSquaddie,
    }: {
        coordinate: CampaignSquaddieDeploymentCoordinate
        assignedCampaignSquaddie: CampaignSquaddie | undefined
    }): CampaignSquaddieDeploymentValidationResult => {
        if (
            requestIsLockSatisfied(
                deploymentCoordinate,
                assignedCampaignSquaddie
            )
        ) {
            return {
                isValid: false,
                errors: [
                    `[CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied]: coordinate "${deploymentCoordinate.id}" is locked to its requested squaddie and cannot be reassigned`,
                ],
            }
        }
        return { isValid: true, errors: [] }
    },

    isSquaddieEligible: (campaignSquaddie: CampaignSquaddie): boolean =>
        campaignSquaddie.injury == undefined,

    validateNoOverlapWithMissionDeployments: ({
        collection,
        missionDeployments,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        missionDeployments: MissionDeployment[]
    }): CampaignSquaddieDeploymentValidationResult => {
        const errors = missionDeploymentOverlapErrors(
            collection,
            missionDeployments
        )
        return { isValid: errors.length === 0, errors }
    },
}

const requestIsSatisfiedBy = (
    deploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
    campaignSquaddie: CampaignSquaddie | undefined
): boolean => {
    if (campaignSquaddie == undefined) return false
    switch (deploymentCoordinate.request.type) {
        case "NONE":
            return false
        case "SPECIFIC_SQUADDIE":
            return (
                campaignSquaddie.id ===
                deploymentCoordinate.request.campaignSquaddieId
            )
        case "LEADER":
            return campaignSquaddie.isLeader
    }
}

const requestIsLockSatisfied = (
    deploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
    campaignSquaddie: CampaignSquaddie | undefined
): boolean =>
    deploymentCoordinate.locked &&
    requestIsSatisfiedBy(deploymentCoordinate, campaignSquaddie)

const atMostOneLeaderCoordinateErrors = (
    collection: CampaignSquaddieDeploymentCoordinateCollection
): string[] => {
    const leaderCoordinateCount =
        CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
            collection
        ).filter(
            (deploymentCoordinate) =>
                deploymentCoordinate.request.type === "LEADER"
        ).length

    if (leaderCoordinateCount > 1) {
        return [
            `[CampaignSquaddieDeploymentValidationService.validateCoordinateCollection]: at most one LEADER-type coordinate is allowed, found ${leaderCoordinateCount}`,
        ]
    }
    return []
}

const duplicateCoordinatePositionErrors = (
    collection: CampaignSquaddieDeploymentCoordinateCollection
): string[] => {
    const coordinateIdByPosition = new Map<string, string>()
    const errors: string[] = []

    for (const deploymentCoordinate of CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
        collection
    )) {
        const position = `${deploymentCoordinate.coordinate.row},${deploymentCoordinate.coordinate.col}`
        const existingCoordinateId = coordinateIdByPosition.get(position)
        if (existingCoordinateId != undefined) {
            errors.push(
                `[CampaignSquaddieDeploymentValidationService.validateCoordinateCollection]: coordinates "${existingCoordinateId}" and "${deploymentCoordinate.id}" both occupy position (${position})`
            )
            continue
        }
        coordinateIdByPosition.set(position, deploymentCoordinate.id)
    }

    return errors
}

const duplicateSpecificSquaddieRequestErrors = (
    collection: CampaignSquaddieDeploymentCoordinateCollection
): string[] => {
    const coordinateIdByCampaignSquaddieId = new Map<string, string>()
    const errors: string[] = []

    for (const deploymentCoordinate of CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
        collection
    )) {
        if (deploymentCoordinate.request.type !== "SPECIFIC_SQUADDIE") continue

        const { campaignSquaddieId } = deploymentCoordinate.request
        const existingCoordinateId =
            coordinateIdByCampaignSquaddieId.get(campaignSquaddieId)
        if (existingCoordinateId != undefined) {
            errors.push(
                `[CampaignSquaddieDeploymentValidationService.validateCoordinateCollection]: coordinates "${existingCoordinateId}" and "${deploymentCoordinate.id}" both request campaign squaddie "${campaignSquaddieId}"`
            )
            continue
        }
        coordinateIdByCampaignSquaddieId.set(
            campaignSquaddieId,
            deploymentCoordinate.id
        )
    }

    return errors
}

const missionDeploymentOverlapErrors = (
    collection: CampaignSquaddieDeploymentCoordinateCollection,
    missionDeployments: MissionDeployment[]
): string[] => {
    const campaignSquaddieDeploymentCoordinateIdByPosition = new Map(
        CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
            collection
        ).map((campaignSquaddieDeploymentCoordinate) => [
            OffsetCoordinateService.coordinateToKey(
                campaignSquaddieDeploymentCoordinate.coordinate
            ),
            campaignSquaddieDeploymentCoordinate.id,
        ])
    )

    const errors: string[] = []
    for (const missionDeployment of missionDeployments) {
        for (const coordinate of missionDeployment.coordinates) {
            const campaignSquaddieDeploymentCoordinateId =
                campaignSquaddieDeploymentCoordinateIdByPosition.get(
                    OffsetCoordinateService.coordinateToKey(coordinate)
                )
            if (campaignSquaddieDeploymentCoordinateId == undefined) continue
            errors.push(
                `[CampaignSquaddieDeploymentValidationService.validateNoOverlapWithMissionDeployments]: deployment "${missionDeployment.id}" coordinate (row ${coordinate.row}, col ${coordinate.col}) overlaps with campaign squaddie deployment coordinate "${campaignSquaddieDeploymentCoordinateId}"`
            )
        }
    }
    return errors
}

const leaderRequestConflictErrors = (
    collection: CampaignSquaddieDeploymentCoordinateCollection,
    leaderCampaignSquaddieId: string | undefined
): string[] => {
    if (leaderCampaignSquaddieId == undefined) return []

    const deploymentCoordinates =
        CampaignSquaddieDeploymentCoordinateCollectionService.getAll(collection)
    const hasLeaderRoleRequest = deploymentCoordinates.some(
        (deploymentCoordinate) => deploymentCoordinate.request.type === "LEADER"
    )
    const coordinateRequestingLeaderByName = deploymentCoordinates.find(
        (deploymentCoordinate) =>
            deploymentCoordinate.request.type === "SPECIFIC_SQUADDIE" &&
            deploymentCoordinate.request.campaignSquaddieId ===
                leaderCampaignSquaddieId
    )

    if (hasLeaderRoleRequest && coordinateRequestingLeaderByName != undefined) {
        return [
            `[CampaignSquaddieDeploymentValidationService.validateNoLeaderRequestConflict]: coordinate "${coordinateRequestingLeaderByName.id}" requests the leader "${leaderCampaignSquaddieId}" by name while another coordinate requests the LEADER role, creating an ambiguous assignment`,
        ]
    }
    return []
}
