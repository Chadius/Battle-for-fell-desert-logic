import type { ArmyManager } from "../campaign/army/armyManager.js"
import type { CampaignSquaddie } from "../campaign/army/campaignSquaddie.js"
import type { CampaignSquaddieDeploymentCoordinate } from "./campaignSquaddieDeploymentCoordinate.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import {
    CampaignSquaddieDeploymentValidationService,
    type CampaignSquaddieDeploymentValidationResult,
} from "./campaignSquaddieDeploymentValidationService.js"

export class CampaignSquaddieDeploymentManager {
    private readonly armyManager: ArmyManager
    private readonly coordinateCollection: CampaignSquaddieDeploymentCoordinateCollection
    private readonly campaignSquaddieIdByCoordinateId: Map<string, string>

    constructor({
        armyManager,
        coordinateCollection,
    }: {
        armyManager: ArmyManager
        coordinateCollection: CampaignSquaddieDeploymentCoordinateCollection
    }) {
        if (armyManager == undefined) {
            throw new Error(
                `[CampaignSquaddieDeploymentManager.constructor]: armyManager must be defined`
            )
        }
        if (coordinateCollection == undefined) {
            throw new Error(
                `[CampaignSquaddieDeploymentManager.constructor]: coordinateCollection must be defined`
            )
        }
        this.throwIfValidationResultInvalid(
            CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
                coordinateCollection
            ),
            "constructor"
        )

        const leaderCampaignSquaddieId = armyManager
            .getAll()
            .find((campaignSquaddie) => campaignSquaddie.isLeader)?.id
        this.throwIfValidationResultInvalid(
            CampaignSquaddieDeploymentValidationService.validateNoLeaderRequestConflict(
                { collection: coordinateCollection, leaderCampaignSquaddieId }
            ),
            "constructor"
        )

        this.armyManager = armyManager
        this.coordinateCollection = coordinateCollection
        this.campaignSquaddieIdByCoordinateId = new Map()
    }

    defaultAssign(): void {
        const assignedCampaignSquaddieIds = new Set<string>()
        for (const deploymentCoordinate of this.getCoordinates()) {
            const campaignSquaddieId =
                this.eligibleCampaignSquaddieIdForRequest(
                    deploymentCoordinate,
                    assignedCampaignSquaddieIds
                )
            if (campaignSquaddieId == undefined) continue
            this.campaignSquaddieIdByCoordinateId.set(
                deploymentCoordinate.id,
                campaignSquaddieId
            )
            assignedCampaignSquaddieIds.add(campaignSquaddieId)
        }
    }

    getOpenCoordinates(): CampaignSquaddieDeploymentCoordinate[] {
        return this.getCoordinates().filter(
            (deploymentCoordinate) =>
                !this.campaignSquaddieIdByCoordinateId.has(
                    deploymentCoordinate.id
                )
        )
    }

    getUnplacedEligibleCampaignSquaddies(): CampaignSquaddie[] {
        const placedCampaignSquaddieIds = new Set(
            this.campaignSquaddieIdByCoordinateId.values()
        )
        return this.armyManager
            .getAll()
            .filter(
                (campaignSquaddie) =>
                    !placedCampaignSquaddieIds.has(campaignSquaddie.id) &&
                    CampaignSquaddieDeploymentValidationService.isSquaddieEligible(
                        campaignSquaddie
                    )
            )
    }

    getAssignedCampaignSquaddieId(coordinateId: string): string | undefined {
        return this.campaignSquaddieIdByCoordinateId.get(coordinateId)
    }

    assign({
        coordinateId,
        campaignSquaddieId,
    }: {
        coordinateId: string
        campaignSquaddieId: string
    }): void {
        const deploymentCoordinate = this.getCoordinateOrThrow(
            coordinateId,
            this.assign.name
        )
        const campaignSquaddie = this.armyManager.get(campaignSquaddieId)
        this.throwIfNotEligibleForAssignment(campaignSquaddie, this.assign.name)
        this.throwIfCoordinateIsLockSatisfied(
            deploymentCoordinate,
            this.assign.name
        )
        this.unassignFromPreviousCoordinateIfNeeded(
            campaignSquaddieId,
            coordinateId
        )

        this.campaignSquaddieIdByCoordinateId.set(
            coordinateId,
            campaignSquaddieId
        )
    }

    unassign(coordinateId: string): void {
        const deploymentCoordinate = this.getCoordinateOrThrow(
            coordinateId,
            this.unassign.name
        )
        if (!this.campaignSquaddieIdByCoordinateId.has(coordinateId)) return
        this.throwIfCoordinateIsLockSatisfied(
            deploymentCoordinate,
            this.unassign.name
        )
        this.campaignSquaddieIdByCoordinateId.delete(coordinateId)
    }

    swap({
        coordinateIdA,
        coordinateIdB,
    }: {
        coordinateIdA: string
        coordinateIdB: string
    }): void {
        const deploymentCoordinateA = this.getCoordinateOrThrow(
            coordinateIdA,
            this.swap.name
        )
        const deploymentCoordinateB = this.getCoordinateOrThrow(
            coordinateIdB,
            this.swap.name
        )
        this.throwIfCoordinateIsLockSatisfied(
            deploymentCoordinateA,
            this.swap.name
        )
        this.throwIfCoordinateIsLockSatisfied(
            deploymentCoordinateB,
            this.swap.name
        )

        const campaignSquaddieIdA =
            this.campaignSquaddieIdByCoordinateId.get(coordinateIdA)
        const campaignSquaddieIdB =
            this.campaignSquaddieIdByCoordinateId.get(coordinateIdB)

        this.setOrDeleteAssignment(coordinateIdA, campaignSquaddieIdB)
        this.setOrDeleteAssignment(coordinateIdB, campaignSquaddieIdA)
    }

    private getCoordinates(): CampaignSquaddieDeploymentCoordinate[] {
        return CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
            this.coordinateCollection
        )
    }

    private eligibleCampaignSquaddieIdForRequest(
        deploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
        alreadyAssignedCampaignSquaddieIds: Set<string>
    ): string | undefined {
        if (deploymentCoordinate.request.type === "SPECIFIC_SQUADDIE") {
            return this.eligibleSpecificCampaignSquaddieId(
                deploymentCoordinate.request.campaignSquaddieId,
                alreadyAssignedCampaignSquaddieIds
            )
        }
        if (deploymentCoordinate.request.type === "LEADER") {
            return this.eligibleLeaderCampaignSquaddieId(
                alreadyAssignedCampaignSquaddieIds
            )
        }
        return undefined
    }

    private eligibleSpecificCampaignSquaddieId(
        campaignSquaddieId: string,
        alreadyAssignedCampaignSquaddieIds: Set<string>
    ): string | undefined {
        if (alreadyAssignedCampaignSquaddieIds.has(campaignSquaddieId))
            return undefined
        if (!this.armyManager.has(campaignSquaddieId)) return undefined
        const campaignSquaddie = this.armyManager.get(campaignSquaddieId)
        return CampaignSquaddieDeploymentValidationService.isSquaddieEligible(
            campaignSquaddie
        )
            ? campaignSquaddieId
            : undefined
    }

    private eligibleLeaderCampaignSquaddieId(
        alreadyAssignedCampaignSquaddieIds: Set<string>
    ): string | undefined {
        const leader = this.armyManager
            .getAll()
            .find(
                (campaignSquaddie) =>
                    campaignSquaddie.isLeader &&
                    !alreadyAssignedCampaignSquaddieIds.has(
                        campaignSquaddie.id
                    ) &&
                    CampaignSquaddieDeploymentValidationService.isSquaddieEligible(
                        campaignSquaddie
                    )
            )
        return leader?.id
    }

    private unassignFromPreviousCoordinateIfNeeded(
        campaignSquaddieId: string,
        newCoordinateId: string
    ): void {
        const previousCoordinateId =
            this.coordinateIdAssignedTo(campaignSquaddieId)
        if (
            previousCoordinateId == undefined ||
            previousCoordinateId === newCoordinateId
        )
            return

        const previousDeploymentCoordinate = this.getCoordinateOrThrow(
            previousCoordinateId,
            this.assign.name
        )
        this.throwIfCoordinateIsLockSatisfied(
            previousDeploymentCoordinate,
            this.assign.name
        )
        this.campaignSquaddieIdByCoordinateId.delete(previousCoordinateId)
    }

    private setOrDeleteAssignment(
        coordinateId: string,
        campaignSquaddieId: string | undefined
    ): void {
        if (campaignSquaddieId == undefined) {
            this.campaignSquaddieIdByCoordinateId.delete(coordinateId)
        } else {
            this.campaignSquaddieIdByCoordinateId.set(
                coordinateId,
                campaignSquaddieId
            )
        }
    }

    private coordinateIdAssignedTo(
        campaignSquaddieId: string
    ): string | undefined {
        for (const [coordinateId, assignedCampaignSquaddieId] of this
            .campaignSquaddieIdByCoordinateId) {
            if (assignedCampaignSquaddieId === campaignSquaddieId)
                return coordinateId
        }
        return undefined
    }

    private getCoordinateOrThrow(
        coordinateId: string,
        callName: string
    ): CampaignSquaddieDeploymentCoordinate {
        const deploymentCoordinate =
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: this.coordinateCollection,
                id: coordinateId,
            })
        if (deploymentCoordinate == undefined) {
            throw new Error(
                `[CampaignSquaddieDeploymentManager.${callName}]: no coordinate "${coordinateId}" found`
            )
        }
        return deploymentCoordinate
    }

    private throwIfNotEligibleForAssignment(
        campaignSquaddie: CampaignSquaddie,
        callName: string
    ): void {
        this.throwIfValidationResultInvalid(
            CampaignSquaddieDeploymentValidationService.validateAssignmentEligibility(
                { campaignSquaddie }
            ),
            callName
        )
    }

    private throwIfCoordinateIsLockSatisfied(
        deploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
        callName: string
    ): void {
        const assignedCampaignSquaddieId =
            this.campaignSquaddieIdByCoordinateId.get(deploymentCoordinate.id)
        const assignedCampaignSquaddie =
            assignedCampaignSquaddieId != undefined
                ? this.armyManager.get(assignedCampaignSquaddieId)
                : undefined
        this.throwIfValidationResultInvalid(
            CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                { coordinate: deploymentCoordinate, assignedCampaignSquaddie }
            ),
            callName
        )
    }

    private throwIfValidationResultInvalid(
        { isValid, errors }: CampaignSquaddieDeploymentValidationResult,
        callName: string
    ): void {
        if (!isValid) {
            throw new Error(
                `[CampaignSquaddieDeploymentManager.${callName}]: ${errors.join("; ")}`
            )
        }
    }
}
