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

const serializeMinimalAction = (id: string): SerializedSquaddieAction =>
    SquaddieActionService.serialize(
        SquaddieActionService.new({
            id,
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
            actions: [serializeMinimalAction("campaign-exclusive-action")],
        })
        expect(result.isValid).toBeTruthy()
        expect(result.warnings).toHaveLength(0)
    })

    it("emits a warning for each action ID present in both campaign and mission data", () => {
        const engine = new MissionEngine()
        const collidingActionId =
            MissionEngineTestHarnessIds.lini.scimitarActionId
        const result = loadValidMissionWithCampaign(engine, {
            actions: [serializeMinimalAction(collidingActionId)],
        })
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0]).toContain(collidingActionId)
        expect(result.warnings[0]).toContain("mission version will be used")
    })

    describe("when the campaign and mission define the same action id", () => {
        it("uses the mission's action", () => {
            const engine = new MissionEngine()
            const collidingActionId =
                MissionEngineTestHarnessIds.lini.scimitarActionId
            loadValidMissionWithCampaign(engine, {
                actions: [serializeMinimalAction(collidingActionId)],
            })

            const resolvedAction = engine.getActionById(collidingActionId)

            expect(SquaddieActionService.serialize(resolvedAction)).toEqual(
                MissionEngineTestHarness.serializedAction(collidingActionId)
            )
        })
    })

    describe("when only the campaign defines an action", () => {
        it("uses the campaign's action", () => {
            const engine = new MissionEngine()
            const campaignOnlyId = "campaign-exclusive-action"
            const campaignAction = serializeMinimalAction(campaignOnlyId)
            loadValidMissionWithCampaign(engine, {
                actions: [campaignAction],
            })

            const resolvedAction = engine.getActionById(campaignOnlyId)

            expect(SquaddieActionService.serialize(resolvedAction)).toEqual(
                campaignAction
            )
        })
    })
})
