import type { BattleSquaddieId } from "./inBattle/battleSquaddieId.js"

const separator = "+++"

export const SquaddieIdConverterService = {
    separator,
    squaddieIdToKey: ({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: BattleSquaddieId): string => {
        return `${outOfBattleSquaddieId}${separator}${inBattleSquaddieId}`
    },
    keyToSquaddieId: (key: string): BattleSquaddieId => {
        const [outOfBattleSquaddieId, inBattleSquaddieIdStr] =
            key.split(separator)
        return {
            outOfBattleSquaddieId,
            inBattleSquaddieId: Number(inBattleSquaddieIdStr),
        }
    },
}
