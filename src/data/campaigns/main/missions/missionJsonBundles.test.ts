/// <reference types="node" />
import { test, expect } from "vitest"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { MissionResourceLoader } from "../../../../mission/missionResourceLoader"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const campaignFolderPath = join(__dirname, "..")

function loadMissionBundle(folderPath: string): MissionResourceLoader {
    const loader = new MissionResourceLoader()
    loader.addSquaddiesFromJson(
        JSON.parse(
            readFileSync(join(campaignFolderPath, "squaddies.json"), "utf-8")
        )
    )
    loader.addAttributeSheetsFromJson(
        JSON.parse(
            readFileSync(
                join(campaignFolderPath, "attributeSheets.json"),
                "utf-8"
            )
        )
    )
    loader.addActionsFromJson(
        JSON.parse(
            readFileSync(join(campaignFolderPath, "actions.json"), "utf-8")
        )
    )
    loader.addSquaddiesFromJson(
        JSON.parse(readFileSync(join(folderPath, "squaddies.json"), "utf-8"))
    )
    loader.addAttributeSheetsFromJson(
        JSON.parse(
            readFileSync(join(folderPath, "attributeSheets.json"), "utf-8")
        )
    )
    loader.addMapsFromJson(
        JSON.parse(readFileSync(join(folderPath, "maps.json"), "utf-8"))
    )
    loader.addActionsFromJson(
        JSON.parse(readFileSync(join(folderPath, "actions.json"), "utf-8"))
    )
    loader.loadMissionStateFromJson(
        JSON.parse(readFileSync(join(folderPath, "missionState.json"), "utf-8"))
    )
    return loader
}

const missionFolders = [
    "testHarness",
    "movement",
    "targetPractice",
    "sneakAttack",
]

for (const folder of missionFolders) {
    test(`${folder} JSON bundle loads and validates via MissionResourceLoader`, () => {
        const folderPath = join(__dirname, folder)
        const loader = loadMissionBundle(folderPath)
        const { isValid, errors } = loader.validate()
        expect(errors).toEqual([])
        expect(isValid).toBe(true)
    })
}
