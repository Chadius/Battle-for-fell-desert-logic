import { beforeEach, describe, expect, it } from "vitest"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import {
    type CampaignSquaddieDeploymentCoordinate,
    CampaignSquaddieDeploymentCoordinateService,
} from "./campaignSquaddieDeploymentCoordinate.js"

describe("CampaignSquaddieDeploymentCoordinateCollection", () => {
    let collection: CampaignSquaddieDeploymentCoordinateCollection
    let slotOne: CampaignSquaddieDeploymentCoordinate

    beforeEach(() => {
        slotOne = CampaignSquaddieDeploymentCoordinateService.new({
            id: "slot-1",
            coordinate: { row: 0, col: 0 },
            request: { type: "NONE" },
        })
        collection = CampaignSquaddieDeploymentCoordinateCollectionService.new()
    })

    it("can add and retrieve coordinates", () => {
        const newCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection,
                campaignSquaddieDeploymentCoordinate: slotOne,
            })
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: newCollection,
                id: slotOne.id,
            })
        ).toEqual(slotOne)
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection,
                id: slotOne.id,
            })
        ).toBeUndefined()
    })

    it("can update an existing coordinate", () => {
        const withSlotOne =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection,
                campaignSquaddieDeploymentCoordinate: slotOne,
            })
        const updatedSlotOne = CampaignSquaddieDeploymentCoordinateService.new({
            id: slotOne.id,
            coordinate: { row: 2, col: 2 },
            request: {
                type: "SPECIFIC_SQUADDIE",
                campaignSquaddieId: "lini",
            },
        })
        const updatedCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: withSlotOne,
                campaignSquaddieDeploymentCoordinate: updatedSlotOne,
            })
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: updatedCollection,
                id: slotOne.id,
            })
        ).toEqual(updatedSlotOne)
    })

    it("can remove a coordinate", () => {
        const withSlotOne =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection,
                campaignSquaddieDeploymentCoordinate: slotOne,
            })
        const withoutSlotOne =
            CampaignSquaddieDeploymentCoordinateCollectionService.remove({
                collection: withSlotOne,
                id: slotOne.id,
            })
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: withoutSlotOne,
                id: slotOne.id,
            })
        ).toBeUndefined()
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: withSlotOne,
                id: slotOne.id,
            })
        ).toEqual(slotOne)
    })

    it("deep clones existing coordinates so separate collection snapshots don't share references", () => {
        const withSlotOne =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection,
                campaignSquaddieDeploymentCoordinate: slotOne,
            })
        const slotTwo = CampaignSquaddieDeploymentCoordinateService.new({
            id: "slot-2",
            coordinate: { row: 4, col: 4 },
            request: { type: "NONE" },
        })
        const withSlotTwo =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: withSlotOne,
                campaignSquaddieDeploymentCoordinate: slotTwo,
            })

        const slotOneFromWithSlotTwo =
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: withSlotTwo,
                id: slotOne.id,
            })!
        slotOneFromWithSlotTwo.coordinate.row = 9

        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                collection: withSlotOne,
                id: slotOne.id,
            })!.coordinate.row
        ).toBe(slotOne.coordinate.row)
    })

    it("can check membership and list all coordinates", () => {
        const withSlotOne =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection,
                campaignSquaddieDeploymentCoordinate: slotOne,
            })
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.has({
                collection: withSlotOne,
                id: slotOne.id,
            })
        ).toBeTruthy()
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.has({
                collection,
                id: slotOne.id,
            })
        ).toBeFalsy()
        expect(
            CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
                withSlotOne
            )
        ).toEqual([slotOne])
    })

    describe("serialize and deserializeAll", () => {
        it("round-trips a collection", () => {
            const withSlotOne =
                CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate(
                    {
                        collection,
                        campaignSquaddieDeploymentCoordinate: slotOne,
                    }
                )
            const serialized =
                CampaignSquaddieDeploymentCoordinateCollectionService.serialize(
                    withSlotOne
                )
            const { collection: deserializedCollection, errors } =
                CampaignSquaddieDeploymentCoordinateCollectionService.deserializeAll(
                    serialized
                )
            expect(errors).toHaveLength(0)
            expect(
                CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                    collection: deserializedCollection,
                    id: slotOne.id,
                })
            ).toEqual(slotOne)
        })

        it("collects errors for invalid entries but keeps valid ones", () => {
            const serializedSlotOne =
                CampaignSquaddieDeploymentCoordinateService.serialize(slotOne)
            const { collection: deserializedCollection, errors } =
                CampaignSquaddieDeploymentCoordinateCollectionService.deserializeAll(
                    [
                        serializedSlotOne,
                        {
                            id: "",
                            coordinate: { row: 0, col: 0 },
                            request: { type: "NONE" },
                            locked: false,
                        },
                    ]
                )
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain(
                "CampaignSquaddieDeploymentCoordinateService.deserialize"
            )
            expect(
                CampaignSquaddieDeploymentCoordinateCollectionService.getById({
                    collection: deserializedCollection,
                    id: slotOne.id,
                })
            ).toEqual(slotOne)
        })
    })
})
