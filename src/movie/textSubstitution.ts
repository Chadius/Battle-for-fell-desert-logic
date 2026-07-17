import { ExpressionParserService } from "./textSubstitution/expressionParser.js"
import { ExpressionValueService } from "./textSubstitution/expressionValue.js"

type BraceSegment =
    | { kind: "literal"; text: string }
    | { kind: "expression"; text: string }
    | { kind: "unmatchedBrace"; text: string }

const IDENTIFIER_ONLY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
const PERMISSIVE_TOKEN_VALUE = "0"

export const TextSubstitutionService = {
    substitute: (text: string, tokens: Record<string, string>): string =>
        braceSegments(text)
            .map((segment) => {
                switch (segment.kind) {
                    case "literal":
                        return segment.text
                    case "unmatchedBrace":
                        return segment.text
                    case "expression":
                        return TextSubstitutionService.resolveExpression(
                            segment.text,
                            tokens
                        )
                }
            })
            .join(""),

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
    validate: (text: string): string[] =>
        braceSegments(text).flatMap((segment) => {
            if (segment.kind === "unmatchedBrace") {
                return [
                    `[TextSubstitutionService.validate]: unclosed expression, missing '}' for "${segment.text}"`,
                ]
            }
            if (segment.kind === "expression") {
                const error = expressionSyntaxError(segment.text)
                return error === undefined ? [] : [error]
            }
            return []
        }),
}

const braceSegments = (text: string): BraceSegment[] => {
    const segments: BraceSegment[] = []
    let cursor = 0

    while (cursor < text.length) {
        const openBraceIndex = text.indexOf("{", cursor)
        if (openBraceIndex === -1) {
            segments.push({ kind: "literal", text: text.slice(cursor) })
            return segments
        }

        const closeBraceIndex = text.indexOf("}", openBraceIndex)
        if (closeBraceIndex === -1) {
            segments.push({
                kind: "literal",
                text: text.slice(cursor, openBraceIndex),
            })
            segments.push({
                kind: "unmatchedBrace",
                text: text.slice(openBraceIndex),
            })
            return segments
        }

        segments.push({
            kind: "literal",
            text: text.slice(cursor, openBraceIndex),
        })
        segments.push({
            kind: "expression",
            text: text.slice(openBraceIndex + 1, closeBraceIndex),
        })
        cursor = closeBraceIndex + 1
    }
    return segments
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
