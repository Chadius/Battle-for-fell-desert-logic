import { ExpressionParserService } from "./textSubstitution/expressionParser.js"
import { ExpressionValueService } from "./textSubstitution/expressionValue.js"

interface BraceExpressionHandlers {
    onLiteral: (literal: string) => void
    onExpression: (expressionText: string) => void
}

const IDENTIFIER_ONLY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
const PERMISSIVE_TOKEN_VALUE = "0"

export const TextSubstitutionService = {
    substitute: (text: string, tokens: Record<string, string>): string => {
        let substitutedText = ""
        forEachBraceExpression(text, {
            onLiteral: (literal) => {
                substitutedText += literal
            },
            onExpression: (expressionText) => {
                substitutedText += TextSubstitutionService.resolveExpression(
                    expressionText,
                    tokens
                )
            },
        })
        return substitutedText
    },

    resolveExpression: (
        expressionText: string,
        tokens: Record<string, string>
    ): string => {
        const trimmed = expressionText.trim()
        if (IDENTIFIER_ONLY_REGEX.test(trimmed)) {
            return trimmed in tokens ? tokens[trimmed] : `{${expressionText}}`
        }

        const expressionValue = ExpressionParserService.evaluate(
            expressionText,
            tokens
        )
        return ExpressionValueService.toDisplayString(expressionValue)
    },

    // Validates {...} expression syntax without requiring real token values, so
    // dialogue authoring UIs can flag malformed text (e.g. "{TOKEN+}") before a
    // mission ever supplies the actual tokens. Unresolved bare identifiers are
    // not errors here — see resolveExpression's pass-through behavior — since
    // token existence can't be checked without mission-specific context.
    validate: (text: string): string[] => {
        const errors: string[] = []
        forEachBraceExpression(text, {
            onLiteral: () => {},
            onExpression: (expressionText) => {
                const error = expressionSyntaxError(expressionText)
                if (error !== undefined) errors.push(error)
            },
        })
        return errors
    },
}

const forEachBraceExpression = (
    text: string,
    handlers: BraceExpressionHandlers
): void => {
    let cursor = 0

    while (cursor < text.length) {
        const openBraceIndex = text.indexOf("{", cursor)
        const closeBraceIndex =
            openBraceIndex === -1 ? -1 : text.indexOf("}", openBraceIndex)

        if (openBraceIndex === -1 || closeBraceIndex === -1) {
            handlers.onLiteral(text.slice(cursor))
            return
        }

        handlers.onLiteral(text.slice(cursor, openBraceIndex))
        handlers.onExpression(text.slice(openBraceIndex + 1, closeBraceIndex))
        cursor = closeBraceIndex + 1
    }
}

const expressionSyntaxError = (expressionText: string): string | undefined => {
    const trimmed = expressionText.trim()
    if (IDENTIFIER_ONLY_REGEX.test(trimmed)) return undefined

    try {
        ExpressionParserService.evaluate(expressionText, permissiveTokens())
        return undefined
    } catch (error) {
        return error instanceof Error ? error.message : String(error)
    }
}

const permissiveTokens = (): Record<string, string> =>
    new Proxy(
        {},
        {
            get: () => PERMISSIVE_TOKEN_VALUE,
            has: () => true,
        }
    ) as Record<string, string>
