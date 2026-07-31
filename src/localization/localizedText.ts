export type LocalizedText = Record<string, { text: string }>

const FALLBACK_LANGUAGE = "en-us"

export const LocalizedTextService = {
    FALLBACK_LANGUAGE,

    resolve: (
        localizedText: LocalizedText,
        languageCode: string,
        fallback: string = FALLBACK_LANGUAGE
    ): string => {
        if (localizedText[languageCode]) return localizedText[languageCode].text

        const fallbackEntry = localizedText[fallback]

        if (fallback !== FALLBACK_LANGUAGE && fallbackEntry !== undefined) {
            return fallbackEntry.text
        }
        if (fallbackEntry !== undefined) {
            return `${languageCode} MISSING: ${fallbackEntry.text}`
        }
        return `${languageCode} MISSING:`
    },
}
