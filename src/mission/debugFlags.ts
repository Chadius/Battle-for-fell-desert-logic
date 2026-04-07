export interface DebugFlags {
    enemyAlwaysEndsTheirTurn?: boolean
}

export const DebugFlagsService = {
    new: (): DebugFlags => ({}),
    setFlag: ({
        debugFlags,
        value,
        flag,
    }: {
        debugFlags: DebugFlags
        flag: keyof DebugFlags
        value: boolean
    }): DebugFlags => {
        const newFlags: DebugFlags = { ...debugFlags }
        newFlags[flag] = value
        return newFlags
    },
}
