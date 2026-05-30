/**
 * One-time data generation script.
 * Run with: npx tsx scripts/generateMissionDataFiles.ts
 *
 * Reads each test mission's serialize functions and writes JSON bundles to
 * src/data/missions/{testHarness,movement,targetPractice,sneakAttack}/.
 * Re-run whenever a mission's squaddies, map, actions, or state changes.
 *
 * Each file is wrapped with { createdAt, updatedAt, data }. createdAt is
 * preserved across regenerations; updatedAt is always the current run time.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { MissionEngineTestHarness } from "../src/testUtils/mission/missionEngineTestHarness.js"
import * as movement from "../src/testUtils/mission/movementTestMission.js"
import * as targetPractice from "../src/testUtils/mission/targetPracticeMission.js"
import * as sneakAttack from "../src/testUtils/mission/sneakAttackMission.js"

const __filename = fileURLToPath(import.meta.url)
const projectRoot = join(dirname(__filename), "..")
const outputRoot = join(projectRoot, "src", "data", "missions")

function readExistingCreatedAt(filePath: string): string | undefined {
    if (!existsSync(filePath)) return undefined
    try {
        const existing = JSON.parse(readFileSync(filePath, "utf-8")) as unknown
        if (
            typeof existing === "object" &&
            existing !== null &&
            "createdAt" in existing &&
            typeof (existing as { createdAt: unknown }).createdAt === "string"
        ) {
            return (existing as { createdAt: string }).createdAt
        }
    } catch {
        // Unparseable — treat as new file
    }
    return undefined
}

function writeJsonFile(filePath: string, data: unknown, now: string): void {
    const createdAt = readExistingCreatedAt(filePath) ?? now
    writeFileSync(
        filePath,
        JSON.stringify({ createdAt, updatedAt: now, data }, null, 2)
    )
}

function writeMissionBundle(
    folderName: string,
    serialize: {
        missionState: () => unknown
        squaddies: () => unknown
        attributeSheets: () => unknown
        maps: () => unknown
        actions: () => unknown
    }
): void {
    const dir = join(outputRoot, folderName)
    mkdirSync(dir, { recursive: true })
    const now = new Date().toISOString()
    writeJsonFile(join(dir, "missionState.json"), serialize.missionState(), now)
    writeJsonFile(join(dir, "squaddies.json"), serialize.squaddies(), now)
    writeJsonFile(
        join(dir, "attributeSheets.json"),
        serialize.attributeSheets(),
        now
    )
    writeJsonFile(join(dir, "maps.json"), serialize.maps(), now)
    writeJsonFile(join(dir, "actions.json"), serialize.actions(), now)
    writeJsonFile(join(dir, "items.json"), [], now)
    console.log(`Generated: ${dir}`)
}

writeMissionBundle("testHarness", {
    missionState: MissionEngineTestHarness.serializeMissionState,
    squaddies: MissionEngineTestHarness.serializeSquaddies,
    attributeSheets: MissionEngineTestHarness.serializeAttributeSheets,
    maps: MissionEngineTestHarness.serializeMaps,
    actions: MissionEngineTestHarness.serializeActions,
})

writeMissionBundle("movement", {
    missionState: movement.serializeMissionState,
    squaddies: movement.serializeSquaddies,
    attributeSheets: movement.serializeAttributeSheets,
    maps: movement.serializeMaps,
    actions: movement.serializeActions,
})

writeMissionBundle("targetPractice", {
    missionState: targetPractice.serializeMissionState,
    squaddies: targetPractice.serializeSquaddies,
    attributeSheets: targetPractice.serializeAttributeSheets,
    maps: targetPractice.serializeMaps,
    actions: targetPractice.serializeActions,
})

writeMissionBundle("sneakAttack", {
    missionState: sneakAttack.serializeMissionState,
    squaddies: sneakAttack.serializeSquaddies,
    attributeSheets: sneakAttack.serializeAttributeSheets,
    maps: sneakAttack.serializeMaps,
    actions: sneakAttack.serializeActions,
})
