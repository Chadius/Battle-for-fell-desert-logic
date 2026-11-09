import { describe, expect, it } from "vitest"
import { SquaddieTurnActionRecordService } from "./squaddieTurnActionRecord.js"
import { MissionStatisticsService } from "../missionStatistics.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"

describe("SquaddieTurnActionRecord keeps its mission statistics change", () => {
    const record = SquaddieTurnActionRecordService.new({
        action: SquaddieActionService.defaultEndTurn(),
        results: [{ inBattleSquaddieId: 0, outOfBattleSquaddieId: "hero" }],
        missionStatisticsChange: MissionStatisticsService.new({
            healingReceivedByPlayerTeam: 2,
        }),
    })

    describe("when cloned", () => {
        it("keeps the same mission statistics change", () => {
            expect(
                SquaddieTurnActionRecordService.clone(record)
                    .missionStatisticsChange
            ).toEqual(record.missionStatisticsChange)
        })
    })

    describe("when serialized and loaded", () => {
        it("keeps the same mission statistics change", () => {
            const loaded = SquaddieTurnActionRecordService.createFromJSON(
                SquaddieTurnActionRecordService.serialize(record)
            )

            expect(loaded.missionStatisticsChange).toEqual(
                record.missionStatisticsChange
            )
        })
    })
})
