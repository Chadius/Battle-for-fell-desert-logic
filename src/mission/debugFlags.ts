export interface DebugFlags {
    enemyAlwaysEndsTheirTurn?: boolean
    trainingWheels?: boolean
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
