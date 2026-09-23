import { beforeEach, describe, expect, it } from "vitest"
import { ArmyService } from "./army.js"
import { ArmyManager } from "./armyManager.js"
import {
    type CampaignSquaddieInjury,
    CampaignSquaddieService,
    DEFAULT_INJURY_DURATION_IN_MISSIONS,
} from "./campaignSquaddie.js"

const newCampaignSquaddie = (id: string, injury?: CampaignSquaddieInjury) =>
    CampaignSquaddieService.new({
        id,
        outOfBattleAttributeSheetId: `sheet-${id}`,
        outOfBattleSquaddieId: `battle-${id}`,
        name: id,
        injury,
    })

describe("Army after a mission is completed", () => {
    let armyManager: ArmyManager

    beforeEach(() => {
        armyManager = new ArmyManager(ArmyService.new())
        armyManager.addOrUpdate(newCampaignSquaddie("lini"))
        armyManager.addOrUpdate(newCampaignSquaddie("rem", { duration: 1 }))
        armyManager.addOrUpdate(newCampaignSquaddie("sir-camil", {}))
        armyManager.addOrUpdate(newCampaignSquaddie("nahla"))
    })

    describe("when a squaddie was knocked out", () => {
        beforeEach(() => {
            armyManager.recordMissionCompleted({
                missionId: "mission-3",
                knockedOutCampaignSquaddieIds: ["lini"],
            })
        })

        it("injures the squaddie for the full default duration", () => {
            expect(armyManager.get("lini").injury).toEqual({
                duration: DEFAULT_INJURY_DURATION_IN_MISSIONS,
            })
        })

        it("records the mission in the squaddie's injury history", () => {
            expect(armyManager.get("lini").injuryHistory).toEqual(["mission-3"])
        })
    })

    describe("when an injured squaddie sat out their last mission of recovery", () => {
        it("is no longer injured", () => {
            armyManager.recordMissionCompleted({
                missionId: "mission-3",
                knockedOutCampaignSquaddieIds: [],
            })
            expect(armyManager.get("rem").injury).toBeUndefined()
        })
    })

    describe("when a permanently injured squaddie sat out the mission", () => {
        it("stays permanently injured", () => {
            armyManager.recordMissionCompleted({
                missionId: "mission-3",
                knockedOutCampaignSquaddieIds: [],
            })
            expect(
                CampaignSquaddieService.isPermanentlyInjured(
                    armyManager.get("sir-camil")
                )
            ).toBe(true)
        })
    })

    describe("when an uninjured squaddie finished the mission standing", () => {
        it("stays uninjured", () => {
            armyManager.recordMissionCompleted({
                missionId: "mission-3",
                knockedOutCampaignSquaddieIds: ["lini"],
            })
            expect(armyManager.get("nahla").injury).toBeUndefined()
        })
    })

    describe("when a knocked out squaddie is not in the army", () => {
        const recordMissionWithStrangerKnockedOut = () =>
            armyManager.recordMissionCompleted({
                missionId: "mission-3",
                knockedOutCampaignSquaddieIds: ["stranger"],
            })

        it("throws", () => {
            expect(recordMissionWithStrangerKnockedOut).toThrow(
                "ArmyService.recordMissionCompleted"
            )
        })

        it("leaves every squaddie's injury as it was", () => {
            const armyBeforeMission = armyManager.serialize()

            try {
                recordMissionWithStrangerKnockedOut()
            } catch {
                // the thrown error is covered by the test above
            }

            expect(armyManager.serialize()).toEqual(armyBeforeMission)
        })
    })

    describe("when the army snapshot from before the mission is kept", () => {
        it("leaves the earlier snapshot unchanged", () => {
            const armyBeforeMission = ArmyService.addOrUpdate({
                army: ArmyService.new(),
                campaignSquaddie: newCampaignSquaddie("lini"),
            })

            ArmyService.recordMissionCompleted({
                army: armyBeforeMission,
                armyMissionResult: {
                    missionId: "mission-3",
                    knockedOutCampaignSquaddieIds: ["lini"],
                },
            })

            expect(
                ArmyService.getById({ army: armyBeforeMission, id: "lini" })
                    ?.injury
            ).toBeUndefined()
        })
    })
})
