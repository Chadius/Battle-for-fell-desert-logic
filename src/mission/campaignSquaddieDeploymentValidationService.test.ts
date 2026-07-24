import { describe, expect, it } from "vitest"
import { CampaignSquaddieDeploymentValidationService } from "./campaignSquaddieDeploymentValidationService.js"
import {
    type CampaignSquaddieDeploymentCoordinate,
    CampaignSquaddieDeploymentCoordinateService,
} from "./campaignSquaddieDeploymentCoordinate.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "../campaign/army/campaignSquaddie.js"

const campaignSquaddie = (
    id: string,
    overrides: Partial<
        Omit<Parameters<typeof CampaignSquaddieService.new>[0], "id">
    > = {}
): CampaignSquaddie =>
    CampaignSquaddieService.new({
        id,
        outOfBattleAttributeSheetId: `sheet-${id}`,
        name: id,
        ...overrides,
    })

const deploymentCoordinate = (
    overrides: Partial<
        Parameters<typeof CampaignSquaddieDeploymentCoordinateService.new>[0]
    > = {}
): CampaignSquaddieDeploymentCoordinate =>
    CampaignSquaddieDeploymentCoordinateService.new({
        id: "slot-1",
        coordinate: { row: 0, col: 0 },
        request: { type: "NONE" },
        ...overrides,
    })

const addCoordinate = (
    collection: CampaignSquaddieDeploymentCoordinateCollection,
    campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate
): CampaignSquaddieDeploymentCoordinateCollection =>
    CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
        collection,
        campaignSquaddieDeploymentCoordinate,
    })

describe("CampaignSquaddieDeploymentValidationService", () => {
    describe("validateCoordinateCollection", () => {
        describe("when the collection has at most one LEADER-type coordinate", () => {
            it("is valid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader",
                        request: { type: "LEADER" },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-open",
                        coordinate: { row: 0, col: 1 },
                        request: { type: "NONE" },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
                        collection
                    )

                expect(result.isValid).toBe(true)
            })
        })

        describe("when the collection requests more than one LEADER-type coordinate", () => {
            it("is invalid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader-1",
                        request: { type: "LEADER" },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader-2",
                        coordinate: { row: 0, col: 1 },
                        request: { type: "LEADER" },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
                        collection
                    )

                expect(result.errors).toHaveLength(1)
            })
        })

        describe("when two coordinates occupy the same position", () => {
            it("is invalid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-1",
                        coordinate: { row: 0, col: 0 },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-2",
                        coordinate: { row: 0, col: 0 },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
                        collection
                    )

                expect(result.errors).toHaveLength(1)
            })
        })

        describe("when two coordinates request the same specific campaign squaddie", () => {
            it("is invalid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-1",
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId: "lini",
                        },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-2",
                        coordinate: { row: 0, col: 1 },
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId: "lini",
                        },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateCollection(
                        collection
                    )

                expect(result.errors).toHaveLength(1)
            })
        })
    })

    describe("validateNoLeaderRequestConflict", () => {
        describe("when one coordinate requests the LEADER role and another requests the leader by name", () => {
            it("is invalid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader-role",
                        request: { type: "LEADER" },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader-by-name",
                        coordinate: { row: 0, col: 1 },
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId: "captain",
                        },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateNoLeaderRequestConflict(
                        {
                            collection,
                            leaderCampaignSquaddieId: "captain",
                        }
                    )

                expect(result.errors).toHaveLength(1)
            })
        })

        describe("when the LEADER role and a specific squaddie request refer to different squaddies", () => {
            it("is valid", () => {
                let collection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-leader-role",
                        request: { type: "LEADER" },
                    })
                )
                collection = addCoordinate(
                    collection,
                    deploymentCoordinate({
                        id: "slot-lini",
                        coordinate: { row: 0, col: 1 },
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId: "lini",
                        },
                    })
                )

                const result =
                    CampaignSquaddieDeploymentValidationService.validateNoLeaderRequestConflict(
                        {
                            collection,
                            leaderCampaignSquaddieId: "captain",
                        }
                    )

                expect(result.isValid).toBe(true)
            })
        })
    })

    describe("validateAssignmentEligibility", () => {
        describe("when the campaign squaddie is not injured", () => {
            it("is valid", () => {
                const result =
                    CampaignSquaddieDeploymentValidationService.validateAssignmentEligibility(
                        { campaignSquaddie: campaignSquaddie("lini") }
                    )

                expect(result.isValid).toBe(true)
            })
        })

        describe("when the campaign squaddie is injured", () => {
            it("is invalid", () => {
                const result =
                    CampaignSquaddieDeploymentValidationService.validateAssignmentEligibility(
                        {
                            campaignSquaddie: campaignSquaddie("lini", {
                                injury: { duration: 3, permanent: false },
                            }),
                        }
                    )

                expect(result.errors).toHaveLength(1)
            })
        })
    })

    describe("validateCoordinateIsNotLockSatisfied", () => {
        describe("when the coordinate is not locked", () => {
            it("is valid regardless of who is assigned", () => {
                const coordinate = deploymentCoordinate({
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: false,
                })

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                        {
                            coordinate,
                            assignedCampaignSquaddie: campaignSquaddie("lini"),
                        }
                    )

                expect(result.isValid).toBe(true)
            })
        })

        describe("when the coordinate is locked and the assigned squaddie satisfies the request", () => {
            it("is invalid", () => {
                const coordinate = deploymentCoordinate({
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: true,
                })

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                        {
                            coordinate,
                            assignedCampaignSquaddie: campaignSquaddie("lini"),
                        }
                    )

                expect(result.errors).toHaveLength(1)
            })
        })

        describe("when the coordinate is locked but the requested squaddie is not the one assigned (lock fallback)", () => {
            it("is valid", () => {
                const coordinate = deploymentCoordinate({
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: true,
                })

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                        {
                            coordinate,
                            assignedCampaignSquaddie:
                                campaignSquaddie("someone-else"),
                        }
                    )

                expect(result.isValid).toBe(true)
            })
        })

        describe("when the coordinate is locked but nobody is assigned yet", () => {
            it("is valid", () => {
                const coordinate = deploymentCoordinate({
                    request: { type: "LEADER" },
                    locked: true,
                })

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                        {
                            coordinate,
                            assignedCampaignSquaddie: undefined,
                        }
                    )

                expect(result.isValid).toBe(true)
            })
        })

        describe("when the coordinate is locked to the LEADER request and the assigned squaddie is the leader", () => {
            it("is invalid", () => {
                const coordinate = deploymentCoordinate({
                    request: { type: "LEADER" },
                    locked: true,
                })

                const result =
                    CampaignSquaddieDeploymentValidationService.validateCoordinateIsNotLockSatisfied(
                        {
                            coordinate,
                            assignedCampaignSquaddie: campaignSquaddie(
                                "leader",
                                { isLeader: true }
                            ),
                        }
                    )

                expect(result.errors).toHaveLength(1)
            })
        })
    })
})
