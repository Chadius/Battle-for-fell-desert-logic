export interface TimeParts {
    hours: number
    minutes: number
    seconds: number
    milliseconds: number
}

const PATTERN_UNIT_REGEX = /h+|m+|s+|S+/g

export const TimeFormatterService = {
    format: (totalMilliseconds: number, pattern: string): string => {
        const parts = TimeFormatterService.computeParts(
            totalMilliseconds,
            pattern
        )
        return pattern.replace(PATTERN_UNIT_REGEX, (run) =>
            TimeFormatterService.formatRun(run, parts)
        )
    },

    computeParts: (totalMilliseconds: number, pattern: string): TimeParts => {
        const hasHours = pattern.includes("h")
        const hasMinutes = pattern.includes("m")
        const hasSeconds = pattern.includes("s")

        const milliseconds = Math.floor(totalMilliseconds) % 1000
        const totalSeconds = Math.floor(totalMilliseconds / 1000)

        const hours = hasHours ? Math.floor(totalSeconds / 3600) : 0
        const secondsAfterHours = hasHours ? totalSeconds % 3600 : totalSeconds

        const minutes = hasMinutes ? Math.floor(secondsAfterHours / 60) : 0
        const seconds = TimeFormatterService.computeSeconds(
            hasMinutes,
            hasSeconds,
            secondsAfterHours
        )

        return { hours, minutes, seconds, milliseconds }
    },

    computeSeconds: (
        hasMinutes: boolean,
        hasSeconds: boolean,
        secondsAfterHours: number
    ): number => {
        if (!hasSeconds) return 0
        return hasMinutes ? secondsAfterHours % 60 : secondsAfterHours
    },

    formatRun: (run: string, parts: TimeParts): string => {
        const value = TimeFormatterService.valueForUnit(run[0], parts)
        return `${value}`.padStart(run.length, "0")
    },

    valueForUnit: (unit: string, parts: TimeParts): number => {
        switch (unit) {
            case "h":
                return parts.hours
            case "m":
                return parts.minutes
            case "s":
                return parts.seconds
            case "S":
                return parts.milliseconds
            default:
                throw new Error(
                    `[TimeFormatterService.format]: unsupported pattern unit "${unit}"`
                )
        }
    },
}
