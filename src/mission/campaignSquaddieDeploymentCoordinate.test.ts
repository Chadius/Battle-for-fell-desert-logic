import { describe, expect, it } from "vitest"
import { CampaignSquaddieDeploymentCoordinateService } from "./campaignSquaddieDeploymentCoordinate.js"

describe("CampaignSquaddieDeploymentCoordinate", () => {
    describe("new", () => {
        it("creates a coordinate requesting nobody in particular", () => {
            const coordinate = CampaignSquaddieDeploymentCoordinateService.new({
                id: "slot-1",
                coordinate: { row: 1, col: 2 },
                request: { type: "NONE" },
            })

            expect(coordinate.id).toBe("slot-1")
            expect(coordinate.coordinate).toEqual({ row: 1, col: 2 })
            expect(coordinate.request).toEqual({ type: "NONE" })
            expect(coordinate.locked).toBe(false)
        })

        it("creates a coordinate requesting a specific campaign squaddie", () => {
            const coordinate = CampaignSquaddieDeploymentCoordinateService.new({
                id: "slot-2",
                coordinate: { row: 0, col: 0 },
                request: {
                    type: "SPECIFIC_SQUADDIE",
                    campaignSquaddieId: "lini",
                },
                locked: true,
            })

            expect(coordinate.request).toEqual({
                type: "SPECIFIC_SQUADDIE",
                campaignSquaddieId: "lini",
            })
            expect(coordinate.locked).toBe(true)
        })

        it("creates a coordinate requesting the leader", () => {
            const coordinate = CampaignSquaddieDeploymentCoordinateService.new({
                id: "slot-3",
                coordinate: { row: 4, col: 4 },
                request: { type: "LEADER" },
                locked: true,
            })

            expect(coordinate.request).toEqual({ type: "LEADER" })
            expect(coordinate.locked).toBe(true)
        })

        it("throws when locked is true but the request type is NONE", () => {
            expect(() =>
                CampaignSquaddieDeploymentCoordinateService.new({
                    id: "slot-4",
                    coordinate: { row: 0, col: 0 },
                    request: { type: "NONE" },
                    locked: true,
                })
            ).toThrow("CampaignSquaddieDeploymentCoordinateService.new")
        })
    })

    describe("serialize and deserialize", () => {
        it("round-trips a coordinate", () => {
            const coordinate = CampaignSquaddieDeploymentCoordinateService.new({
                id: "slot-1",
                coordinate: { row: 1, col: 2 },
                request: {
                    type: "SPECIFIC_SQUADDIE",
                    campaignSquaddieId: "lini",
                },
                locked: true,
            })

            const serialized =
                CampaignSquaddieDeploymentCoordinateService.serialize(
                    coordinate
                )
            const deserialized =
                CampaignSquaddieDeploymentCoordinateService.deserialize(
                    serialized
                )

            expect(deserialized).toEqual(coordinate)
        })

        it("throws on malformed input", () => {
            expect(() =>
                CampaignSquaddieDeploymentCoordinateService.deserialize({
                    id: "",
                    coordinate: { row: 0, col: 0 },
                    request: { type: "NONE" },
                    locked: false,
                })
            ).toThrow("CampaignSquaddieDeploymentCoordinateService.deserialize")
        })

        it("throws when deserializing a locked NONE request", () => {
            expect(() =>
                CampaignSquaddieDeploymentCoordinateService.deserialize({
                    id: "slot-1",
                    coordinate: { row: 0, col: 0 },
                    request: { type: "NONE" },
                    locked: true,
                })
            ).toThrow("CampaignSquaddieDeploymentCoordinateService.deserialize")
        })
    })
})
