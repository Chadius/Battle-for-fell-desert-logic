import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import {
    SquaddieActionService,
    type SerializedSquaddieAction,
} from "../../../squaddieAction/squaddieAction.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"

const serializeMinimalAction = (
    id: string,
    name: string
): SerializedSquaddieAction =>
    SquaddieActionService.serialize(
        SquaddieActionService.new({
            id,
            name,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: { self: false, foe: true, friend: false },
            attribute: AttributeScore.BODY,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })
    )

const loadValidMissionWithCampaign = (
    engine: MissionEngine,
    campaignData?: {
        squaddies?: unknown
        attributeSheets?: unknown
        items?: unknown
        actions?: unknown
    }
) =>
    engine.loadMissionFromJson({
        squaddies: MissionEngineTestHarness.serializeSquaddies(),
        attributeSheets: MissionEngineTestHarness.serializeAttributeSheets(),
        maps: MissionEngineTestHarness.serializeMaps(),
        actions: MissionEngineTestHarness.serializeActions(),
        missionState: MissionEngineTestHarness.serializeMissionState(),
        campaignData,
    })

describe("MissionEngine.loadMissionFromJson with campaign data", () => {
    it("returns empty warnings when no campaign data is provided", () => {
        const engine = new MissionEngine()
        const result = loadValidMissionWithCampaign(engine)
        expect(result.isValid).toBeTruthy()
        expect(result.warnings).toHaveLength(0)
    })

    it("returns empty warnings when campaign and mission have no overlapping IDs", () => {
        const engine = new MissionEngine()
        const result = loadValidMissionWithCampaign(engine, {
            actions: [
                serializeMinimalAction(
                    "campaign-exclusive-action",
                    "Campaign Only"
                ),
            ],
        })
        expect(result.isValid).toBeTruthy()
        expect(result.warnings).toHaveLength(0)
    })

    it("emits a warning for each action ID present in both campaign and mission data", () => {
        const engine = new MissionEngine()
        const collidingActionId =
            MissionEngineTestHarnessIds.lini.scimitarActionId
        const result = loadValidMissionWithCampaign(engine, {
            actions: [
                serializeMinimalAction(collidingActionId, "Campaign Version"),
            ],
        })
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0]).toContain(collidingActionId)
        expect(result.warnings[0]).toContain("mission version will be used")
    })

    it("mission action wins over campaign action when IDs collide", () => {
        const engine = new MissionEngine()
        const collidingActionId =
            MissionEngineTestHarnessIds.lini.scimitarActionId
        loadValidMissionWithCampaign(engine, {
            actions: [
                serializeMinimalAction(collidingActionId, "Campaign Version"),
            ],
        })

        const resolvedAction =
            engine.missionManager!.squaddieActionManager!.collection!.actionById.get(
                collidingActionId
            )
        expect(resolvedAction?.name).not.toBe("Campaign Version")
        expect(resolvedAction?.name).toBeDefined()
    })

    it("campaign-only action is accessible after merge", () => {
        const engine = new MissionEngine()
        const campaignOnlyId = "campaign-exclusive-action"
        loadValidMissionWithCampaign(engine, {
            actions: [serializeMinimalAction(campaignOnlyId, "Campaign Only")],
        })

        const campaignOnlyAction =
            engine.missionManager!.squaddieActionManager!.collection!.actionById.get(
                campaignOnlyId
            )
        expect(campaignOnlyAction).toBeDefined()
        expect(campaignOnlyAction?.name).toBe("Campaign Only")
    })
})
