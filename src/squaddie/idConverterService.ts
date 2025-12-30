const separator = "+++"

export const SquaddieIdConverterService = {
    squaddieIdToKey: ({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): string => {
        return `${outOfBattleSquaddieId}${separator}${inBattleSquaddieId}`
    },
    keyToSquaddieId: (
        key: string
    ): {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    } => {
        const [outOfBattleSquaddieId, inBattleSquaddieIdStr] =
            key.split(separator)
        return {
            outOfBattleSquaddieId,
            inBattleSquaddieId: Number(inBattleSquaddieIdStr),
        }
    },
}
