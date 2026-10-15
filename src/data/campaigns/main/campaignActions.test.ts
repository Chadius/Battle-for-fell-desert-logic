import { beforeEach, describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import {
    DEFAULT_END_TURN_ACTION_ID,
    DEFAULT_MOVE_ACTION_ID,
} from "../../../squaddieAction/squaddieAction.js"

interface CampaignActionsFile {
    data: unknown[]
}

interface LoadedCampaignActions {
    squaddieActionManager: SquaddieActionManager
    loadErrors: string[]
}

const campaignFolderPath = dirname(fileURLToPath(import.meta.url))

const loadCampaignActions = (): LoadedCampaignActions => {
    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    const campaignActionsFile: CampaignActionsFile = JSON.parse(
        readFileSync(join(campaignFolderPath, "actions.json"), "utf-8")
    )
    const loadErrors = squaddieActionManager.addActionsFromJson(
        campaignActionsFile.data
    )
    return { squaddieActionManager, loadErrors }
}

describe("main campaign actions", () => {
    let loadedCampaignActions: LoadedCampaignActions

    beforeEach(() => {
        loadedCampaignActions = loadCampaignActions()
    })

    it("load without errors", () => {
        expect(loadedCampaignActions.loadErrors).toEqual([])
    })

    it("include the default end-turn action the engine uses to end a squaddie's turn", () => {
        expect(
            loadedCampaignActions.squaddieActionManager.has(
                DEFAULT_END_TURN_ACTION_ID
            )
        ).toBe(true)
    })

    it("include the default move action squaddies use to move", () => {
        expect(
            loadedCampaignActions.squaddieActionManager.has(
                DEFAULT_MOVE_ACTION_ID
            )
        ).toBe(true)
    })
})
