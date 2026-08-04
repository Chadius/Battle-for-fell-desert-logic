import { describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { GlossaryManager } from "../../campaign/glossary/glossaryManager.js"
import { GlossaryCollectionService } from "../../campaign/glossary/glossaryCollection.js"
import { GlossaryTermType } from "../../campaign/glossary/glossaryTermType.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"

const MAP_ID = "glossary-test-map"

const buildValidMissionManager = (): MissionManager => {
    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: MAP_ID,
            name: "Glossary Test Map",
            movementProperties: ["1 1"],
        }),
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    SquaddieActionService.defaultActions().forEach((squaddieAction) =>
        squaddieActionManager.addOrUpdate(squaddieAction)
    )

    return new MissionManager({
        missionState: MissionStateService.new({ id: "m1", mapId: MAP_ID }),
        inBattleSquaddieManager: new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new()
        ),
        coordinateMapCollectionManager,
        squaddieActionManager,
    })
}

describe("MissionManager.resolveGlossaryTerms", () => {
    describe("when the manager has a glossaryManager with matching terms", () => {
        it("resolves each termId to its name and definition in the requested language", () => {
            const glossaryManager = new GlossaryManager(
                GlossaryCollectionService.new()
            )
            glossaryManager.addTermsFromJson({
                terms: [
                    {
                        termId: "action.scimitar",
                        type: GlossaryTermType.SQUADDIE_ACTION,
                        name: { "en-us": { text: "Scimitar" } },
                        definition: {
                            "en-us": { text: "A curved melee blade" },
                        },
                    },
                    {
                        termId: "item.healing-potion",
                        type: GlossaryTermType.SQUADDIE_ITEM,
                        name: { "en-us": { text: "Healing Potion" } },
                        definition: {
                            "en-us": { text: "Restores hit points" },
                        },
                    },
                ],
            })
            const manager = new MissionManager({ glossaryManager })

            const resolvedGlossaryTerms = manager.resolveGlossaryTerms(
                ["action.scimitar", "item.healing-potion"],
                "en-us"
            )

            expect(resolvedGlossaryTerms).toEqual({
                "action.scimitar": {
                    name: "Scimitar",
                    definition: "A curved melee blade",
                },
                "item.healing-potion": {
                    name: "Healing Potion",
                    definition: "Restores hit points",
                },
            })
        })
    })

    describe("when a requested termId has no matching glossary entry", () => {
        it("omits it from the resolved result instead of throwing", () => {
            const glossaryManager = new GlossaryManager(
                GlossaryCollectionService.new()
            )
            const manager = new MissionManager({ glossaryManager })

            const resolvedGlossaryTerms = manager.resolveGlossaryTerms(
                ["action.unknown"],
                "en-us"
            )

            expect(resolvedGlossaryTerms).toEqual({})
        })
    })

    describe("when the manager has no glossaryManager", () => {
        it("throws naming the calling function", () => {
            const manager = new MissionManager()

            expect(() =>
                manager.resolveGlossaryTerms(["action.scimitar"], "en-us")
            ).toThrow("[MissionManager.resolveGlossaryTerms]")
        })
    })
})

describe("MissionManager.addGlossaryFromJson", () => {
    describe("after a successful validate", () => {
        it("makes the loaded terms resolvable through resolveGlossaryTerms", () => {
            const manager = buildValidMissionManager()

            manager.addGlossaryFromJson({
                terms: [
                    {
                        termId: "action.scimitar",
                        type: GlossaryTermType.SQUADDIE_ACTION,
                        name: { "en-us": { text: "Scimitar" } },
                        definition: {
                            "en-us": { text: "A curved melee blade" },
                        },
                    },
                ],
            })
            const result = manager.validate()

            expect(result.isValid).toBeTruthy()
            expect(
                manager.resolveGlossaryTerms(["action.scimitar"], "en-us")
            ).toEqual({
                "action.scimitar": {
                    name: "Scimitar",
                    definition: "A curved melee blade",
                },
            })
        })
    })
})
