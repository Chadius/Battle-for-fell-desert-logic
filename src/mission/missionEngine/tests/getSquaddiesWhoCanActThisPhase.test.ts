import { beforeEach, describe, expect, it } from "vitest"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { MissionEngine } from "../missionEngine"
import { MissionStateService } from "../../missionState"
import { MissionAffiliationTurn, MissionTurnService } from "../../missionTurn"
import { MissionManager } from "../../missionManager"
import { TurnControllerType } from "../../turnController"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"

describe("getSquaddiesWhoCanActThisPhase", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let playerSquaddieId: BattleSquaddieId

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                },
            })

        const playerSquaddie = OutOfBattleSquaddieService.new({
            id: "player-1",
            name: "Player Squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "test_sheet",
        })

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy-1",
            name: "Enemy Squaddie",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "test_sheet",
        })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })

        inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })
    })

    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        expect(() => missionEngine.getSquaddiesWhoCanActThisPhase()).toThrow(
            "missionManager is undefined"
        )
    })

    it("returns only player squaddies during PLAYER_TURN phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(1)
        expect(result[0].outOfBattleSquaddieId).toBe("player-1")
    })

    it("returns only enemy squaddies during ENEMY_TURN phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(1)
        expect(result[0].outOfBattleSquaddieId).toBe("enemy-1")
    })

    it("excludes squaddies who cannot act (no action points)", () => {
        inBattleSquaddieManager.spendActionPoints({
            ...playerSquaddieId,
            actionPoints: 3,
        })

        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(0)
    })

    it("returns empty array during TURN_START phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(0)
    })

    it("returns empty array during TURN_END phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(0)
    })

    describe("HUMAN controlled squaddies who can act", () => {
        let playerSquaddieId: BattleSquaddieId
        let player2SquaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet2",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const player1 = OutOfBattleSquaddieService.new({
                id: "player-a",
                name: "Player A",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet2",
            })
            const player2 = OutOfBattleSquaddieService.new({
                id: "player-b",
                name: "Player B",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet2",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(player1)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(player2)

            const localInBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            playerSquaddieId = localInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-a",
            })
            player2SquaddieId = localInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-b",
            })

            inBattleSquaddieManager = localInBattleSquaddieManager
        })

        it("all PLAYER squaddies are HUMAN by default — readyAction is accepted", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })
            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            playerSquaddieId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })
            expect(result.isValid).toBe(true)
        })

        it("PLAYER phase with all squaddies overridden to AI — readyAction is rejected", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
                controllerTypeOverrides: {
                    affiliation: {
                        [SquaddieAffiliation.PLAYER]: TurnControllerType.AI,
                    },
                },
            })
            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            playerSquaddieId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })
            expect(result.isValid).toBe(false)
            expect(result.message).toBe("This squaddie is AI controlled")
        })

        it("PLAYER phase with mixed HUMAN/AI squaddies — readyAction accepted for HUMAN, rejected for AI", () => {
            const player1Key =
                SquaddieIdConverterService.squaddieIdToKey(playerSquaddieId)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
                controllerTypeOverrides: {
                    squaddie: {
                        [player1Key]: TurnControllerType.AI,
                    },
                },
            })
            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const aiResult = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            playerSquaddieId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })
            expect(aiResult.isValid).toBe(false)

            const humanResult = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: player2SquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        player2SquaddieId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId:
                            player2SquaddieId.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            player2SquaddieId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })
            expect(humanResult.isValid).toBe(true)
        })

        it("PLAYER phase where all HUMAN squaddies exhausted — engine auto-advances to ENEMY_TURN", () => {
            const harness = new MissionEngineTestHarness()
            harness.transitionToNextPhase()
            harness.transitionToNextPhase()

            const liniId = harness.getLiniSquaddieId()
            harness.endSquaddieTurn(liniId)

            expect(harness.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.ENEMY_TURN
            )
        })
    })

    it("returns player squaddies during PLAYER_TURN_START phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn:
                    MissionAffiliationTurn.PLAYER_TURN_START,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(1)
        expect(result[0].outOfBattleSquaddieId).toBe("player-1")
    })
})
