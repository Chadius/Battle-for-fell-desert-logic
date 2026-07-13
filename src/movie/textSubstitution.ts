export const TextSubstitutionService = {
    substitute: (text: string, tokens: Record<string, string>): string => {
        return Object.entries(tokens).reduce(
            (result, [token, value]) => result.split(token).join(value),
            text
        )
    },
}
