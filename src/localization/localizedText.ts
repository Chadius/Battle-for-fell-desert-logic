import { z } from "zod"

export type LocalizedText = Record<string, { text: string }>

const FALLBACK_LANGUAGE_CODE = "en-US"

const LANGUAGE_SUBTAG = "[a-z]{2}"
const REGION_SUBTAG = "[A-Z]{2}"
const LANGUAGE_CODE_PATTERN = new RegExp(
    `^${LANGUAGE_SUBTAG}-${REGION_SUBTAG}$`
)

const languageCodeSchema = z.string().regex(LANGUAGE_CODE_PATTERN)

export const localizedTextSchema = z.record(
    languageCodeSchema,
    z.object({ text: z.string() }),
    {
        error: (issue) =>
            issue.code === "invalid_key"
                ? "Invalid language code key. Must be language-REGION, like en-US or fr-FR"
                : undefined,
    }
)

export const LocalizedTextService = {
    FALLBACK_LANGUAGE_CODE,

    resolve: (
        localizedText: LocalizedText,
        languageCode: string,
        fallbackLanguageCode: string = FALLBACK_LANGUAGE_CODE
    ): string => {
        if (localizedText[languageCode]) return localizedText[languageCode].text

        const fallbackEntry = localizedText[fallbackLanguageCode]

        if (
            fallbackLanguageCode !== FALLBACK_LANGUAGE_CODE &&
            fallbackEntry !== undefined
        ) {
            return fallbackEntry.text
        }
        if (fallbackEntry !== undefined) {
            return `${languageCode} MISSING: ${fallbackEntry.text}`
        }
        return `${languageCode} MISSING:`
    },
}
