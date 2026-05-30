/**
 * One-time data generation script.
 * Run with: npx tsx scripts/generateMissionDataFiles.ts
 *
 * Reads each test mission's serialize functions and writes JSON bundles to
 * src/data/missions/{testHarness,movement,targetPractice,sneakAttack}/.
 * Re-run whenever a mission's squaddies, map, actions, or state changes.
 */

import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { MissionEngineTestHarness } from "../src/testUtils/mission/missionEngineTestHarness.js"
import * as movement from "../src/testUtils/mission/movementTestMission.js"
import * as targetPractice from "../src/testUtils/mission/targetPracticeMission.js"
import * as sneakAttack from "../src/testUtils/mission/sneakAttackMission.js"

const __filename = fileURLToPath(import.meta.url)
const projectRoot = join(dirname(__filename), "..")
const outputRoot = join(projectRoot, "src", "data", "missions")

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
    writeFileSync(
        join(dir, "missionState.json"),
        JSON.stringify(serialize.missionState(), null, 2)
    )
    writeFileSync(
        join(dir, "squaddies.json"),
        JSON.stringify(serialize.squaddies(), null, 2)
    )
    writeFileSync(
        join(dir, "attributeSheets.json"),
        JSON.stringify(serialize.attributeSheets(), null, 2)
    )
    writeFileSync(
        join(dir, "maps.json"),
        JSON.stringify(serialize.maps(), null, 2)
    )
    writeFileSync(
        join(dir, "actions.json"),
        JSON.stringify(serialize.actions(), null, 2)
    )
    writeFileSync(join(dir, "items.json"), JSON.stringify([], null, 2))
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
