export type TExpressionValue = string | number | boolean

export const ExpressionValueService = {
    toNumber: (value: TExpressionValue, description: string): number => {
        if (typeof value === "number") return value
        if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value)
            if (!Number.isNaN(parsed)) return parsed
        }
        throw new Error(
            `[TextSubstitutionService.substitute]: ${description} is not a number: "${value}"`
        )
    },

    toDisplayString: (value: TExpressionValue): string => {
        if (typeof value === "string") return value
        if (typeof value === "boolean") return value ? "true" : "false"
        return ExpressionValueService.formatNumber(value)
    },

    formatNumber: (value: number): string => {
        return parseFloat(value.toFixed(2)).toString()
    },
}
