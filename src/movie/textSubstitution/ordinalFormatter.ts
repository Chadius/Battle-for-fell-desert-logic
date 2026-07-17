export const OrdinalFormatterService = {
    format: (value: number): string => {
        const rounded = Math.round(value)
        return `${rounded}${OrdinalFormatterService.suffixFor(rounded)}`
    },

    suffixFor: (value: number): string => {
        const absoluteValue = Math.abs(value)
        const lastTwoDigits = absoluteValue % 100
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th"

        const lastDigit = absoluteValue % 10
        switch (lastDigit) {
            case 1:
                return "st"
            case 2:
                return "nd"
            case 3:
                return "rd"
            default:
                return "th"
        }
    },
}
