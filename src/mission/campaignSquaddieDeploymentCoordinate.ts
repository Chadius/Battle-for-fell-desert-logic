import { z } from "zod"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"

export interface CampaignSquaddieDeploymentCoordinateRequestNone {
    type: "NONE"
}

export interface CampaignSquaddieDeploymentCoordinateRequestSpecificSquaddie {
    type: "SPECIFIC_SQUADDIE"
    campaignSquaddieId: string
}

export interface CampaignSquaddieDeploymentCoordinateRequestLeader {
    type: "LEADER"
}

export type CampaignSquaddieDeploymentCoordinateRequest =
    | CampaignSquaddieDeploymentCoordinateRequestNone
    | CampaignSquaddieDeploymentCoordinateRequestSpecificSquaddie
    | CampaignSquaddieDeploymentCoordinateRequestLeader

export interface CampaignSquaddieDeploymentCoordinate {
    id: string
    coordinate: OffsetCoordinate
    request: CampaignSquaddieDeploymentCoordinateRequest
    locked: boolean
}

const offsetCoordinateSchema = z.object({
    row: z.number(),
    col: z.number(),
})

const campaignSquaddieDeploymentCoordinateRequestSchema = z.discriminatedUnion(
    "type",
    [
        z.object({ type: z.literal("NONE") }),
        z.object({
            type: z.literal("SPECIFIC_SQUADDIE"),
            campaignSquaddieId: z.string().min(1),
        }),
        z.object({ type: z.literal("LEADER") }),
    ]
)

export const campaignSquaddieDeploymentCoordinateSchema = z
    .object({
        id: z.string().min(1),
        coordinate: offsetCoordinateSchema,
        request: campaignSquaddieDeploymentCoordinateRequestSchema,
        locked: z.boolean(),
    })
    .refine((data) => !(data.locked && data.request.type === "NONE"), {
        message: "locked cannot be true when request type is NONE",
        path: ["locked"],
    })

export type SerializedCampaignSquaddieDeploymentCoordinate = z.infer<
    typeof campaignSquaddieDeploymentCoordinateSchema
>

export const CampaignSquaddieDeploymentCoordinateService = {
    new: ({
        id,
        coordinate,
        request,
        locked,
    }: {
        id: string
        coordinate: OffsetCoordinate
        request: CampaignSquaddieDeploymentCoordinateRequest
        locked?: boolean
    }): CampaignSquaddieDeploymentCoordinate => {
        const campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate =
            {
                id,
                coordinate: { ...coordinate },
                request: { ...request },
                locked: locked ?? false,
            }
        throwIfInvalid(campaignSquaddieDeploymentCoordinate, "new")
        return campaignSquaddieDeploymentCoordinate
    },
    clone: (
        original: CampaignSquaddieDeploymentCoordinate
    ): CampaignSquaddieDeploymentCoordinate => clone(original),
    serialize: (
        campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate
    ): SerializedCampaignSquaddieDeploymentCoordinate => {
        throwIfCoordinateIsUndefined(
            campaignSquaddieDeploymentCoordinate,
            "serialize"
        )
        return {
            id: campaignSquaddieDeploymentCoordinate.id,
            coordinate: { ...campaignSquaddieDeploymentCoordinate.coordinate },
            request: { ...campaignSquaddieDeploymentCoordinate.request },
            locked: campaignSquaddieDeploymentCoordinate.locked,
        }
    },
    deserialize: (data: unknown): CampaignSquaddieDeploymentCoordinate => {
        const result =
            campaignSquaddieDeploymentCoordinateSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[CampaignSquaddieDeploymentCoordinateService.deserialize]: ${details}`
            )
        }
        const serialized = result.data
        return {
            id: serialized.id,
            coordinate: { ...serialized.coordinate },
            request: { ...serialized.request },
            locked: serialized.locked,
        }
    },
}

const clone = (
    original: CampaignSquaddieDeploymentCoordinate
): CampaignSquaddieDeploymentCoordinate => ({
    ...original,
    coordinate: { ...original.coordinate },
    request: { ...original.request },
})

const throwIfCoordinateIsUndefined = (
    campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
    callName: string
) => {
    if (campaignSquaddieDeploymentCoordinate == undefined)
        throw new Error(
            `[CampaignSquaddieDeploymentCoordinateService.${callName}]: campaignSquaddieDeploymentCoordinate must be defined`
        )
}

const throwIfInvalid = (
    campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate,
    callName: string
) => {
    const result = campaignSquaddieDeploymentCoordinateSchema.safeParse(
        campaignSquaddieDeploymentCoordinate
    )
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")
        throw new Error(
            `[CampaignSquaddieDeploymentCoordinateService.${callName}]: ${details}`
        )
    }
}
