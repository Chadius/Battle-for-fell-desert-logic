import {
    ExpressionValueService,
    type TExpressionValue,
} from "./expressionValue.js"
import { OrdinalFormatterService } from "./ordinalFormatter.js"
import { TimeFormatterService } from "./timeFormatter.js"

interface ParseResult<T> {
    value: T
    next: number
}

type TRoundingFunctionName = "round" | "floor" | "ceil"
type TFunctionName = TRoundingFunctionName | "ordinal" | "plural" | "timeFormat"

const ERROR_PREFIX = "[TextSubstitutionService.substitute]"
const FUNCTION_NAMES: readonly TFunctionName[] = [
    "round",
    "floor",
    "ceil",
    "ordinal",
    "plural",
    "timeFormat",
]
const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*/
const NUMBER_REGEX = /^\d+(\.\d+)?/
const COMPARISON_OPERATORS = ["==", "!=", "<=", ">=", "<", ">", "="] as const
type TComparisonOperator = (typeof COMPARISON_OPERATORS)[number]

export const ExpressionParserService = {
    evaluate: (
        expressionText: string,
        tokens: Record<string, string>
    ): TExpressionValue => {
        const result = parseTernary(expressionText, 0, tokens)
        const next = skipWhitespace(expressionText, result.next)
        if (next !== expressionText.length) {
            throw new Error(
                `${ERROR_PREFIX}: unexpected characters after expression in "{${expressionText}}"`
            )
        }
        return result.value
    },
}

const skipWhitespace = (text: string, position: number): number => {
    let index = position
    while (index < text.length && /\s/.test(text[index])) index++
    return index
}

const parseTernary = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const condition = parseComparison(text, position, tokens)
    const afterCondition = skipWhitespace(text, condition.next)
    if (text[afterCondition] !== "?") return condition

    const colonIndex = text.indexOf(":", afterCondition + 1)
    if (colonIndex === -1) {
        throw new Error(
            `${ERROR_PREFIX}: ternary expression is missing ":" in "{${text}}"`
        )
    }
    if (typeof condition.value !== "boolean") {
        throw new Error(
            `${ERROR_PREFIX}: ternary condition must be a comparison or plural(...) in "{${text}}"`
        )
    }

    const trueBranch = text.slice(afterCondition + 1, colonIndex).trim()
    const falseBranch = text.slice(colonIndex + 1).trim()

    return {
        value: condition.value ? trueBranch : falseBranch,
        next: text.length,
    }
}

const parseComparison = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const left = parseArithmetic(text, position, tokens)
    const afterLeft = skipWhitespace(text, left.next)

    const operator = COMPARISON_OPERATORS.find((candidate) =>
        text.startsWith(candidate, afterLeft)
    )
    if (!operator) return left

    const right = parseArithmetic(text, afterLeft + operator.length, tokens)
    const leftNumber = ExpressionValueService.toNumber(
        left.value,
        "left side of comparison"
    )
    const rightNumber = ExpressionValueService.toNumber(
        right.value,
        "right side of comparison"
    )

    return {
        value: compare(operator, leftNumber, rightNumber),
        next: right.next,
    }
}

const compare = (
    operator: TComparisonOperator,
    left: number,
    right: number
): boolean => {
    switch (operator) {
        case "==":
        case "=":
            return left === right
        case "!=":
            return left !== right
        case "<=":
            return left <= right
        case ">=":
            return left >= right
        case "<":
            return left < right
        case ">":
            return left > right
    }
}

const parseArithmetic = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    let left = parseTerm(text, position, tokens)
    let cursor = skipWhitespace(text, left.next)

    while (text[cursor] === "+" || text[cursor] === "-") {
        const operator = text[cursor]
        const right = parseTerm(text, cursor + 1, tokens)
        const leftNumber = ExpressionValueService.toNumber(
            left.value,
            "left operand"
        )
        const rightNumber = ExpressionValueService.toNumber(
            right.value,
            "right operand"
        )
        const value =
            operator === "+"
                ? leftNumber + rightNumber
                : leftNumber - rightNumber
        left = { value, next: right.next }
        cursor = skipWhitespace(text, left.next)
    }

    return left
}

const parseTerm = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    let left = parseFactor(text, position, tokens)
    let cursor = skipWhitespace(text, left.next)

    while (
        text[cursor] === "*" ||
        text[cursor] === "/" ||
        text[cursor] === "%"
    ) {
        const operator = text[cursor]
        const right = parseFactor(text, cursor + 1, tokens)
        const leftNumber = ExpressionValueService.toNumber(
            left.value,
            "left operand"
        )
        const rightNumber = ExpressionValueService.toNumber(
            right.value,
            "right operand"
        )
        left = {
            value: applyTermOperator(operator, leftNumber, rightNumber),
            next: right.next,
        }
        cursor = skipWhitespace(text, left.next)
    }

    return left
}

const applyTermOperator = (
    operator: string,
    left: number,
    right: number
): number => {
    switch (operator) {
        case "*":
            return left * right
        case "/":
            return left / right
        case "%":
            return left % right
        default:
            throw new Error(
                `${ERROR_PREFIX}: unsupported operator "${operator}"`
            )
    }
}

const parseFactor = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const start = skipWhitespace(text, position)

    if (text[start] === "-") {
        const operand = parseFactor(text, start + 1, tokens)
        const operandNumber = ExpressionValueService.toNumber(
            operand.value,
            "negated value"
        )
        return { value: -operandNumber, next: operand.next }
    }

    if (text[start] === "(") {
        const inner = parseArithmetic(text, start + 1, tokens)
        const afterInner = skipWhitespace(text, inner.next)
        if (text[afterInner] !== ")") {
            throw new Error(`${ERROR_PREFIX}: expected ")" in "{${text}}"`)
        }
        return { value: inner.value, next: afterInner + 1 }
    }

    const numberMatch = NUMBER_REGEX.exec(text.slice(start))
    if (numberMatch) {
        return {
            value: Number(numberMatch[0]),
            next: start + numberMatch[0].length,
        }
    }

    return parseIdentifierOrFunctionCall(text, start, tokens)
}

const parseIdentifierOrFunctionCall = (
    text: string,
    start: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const identifierMatch = IDENTIFIER_REGEX.exec(text.slice(start))
    if (!identifierMatch) {
        throw new Error(`${ERROR_PREFIX}: expected a value in "{${text}}"`)
    }

    const identifierName = identifierMatch[0]
    const afterIdentifier = start + identifierName.length
    const afterIdentifierWhitespace = skipWhitespace(text, afterIdentifier)

    if (
        isFunctionName(identifierName) &&
        text[afterIdentifierWhitespace] === "("
    ) {
        return parseFunctionCall(
            identifierName,
            text,
            afterIdentifierWhitespace + 1,
            tokens
        )
    }

    if (!(identifierName in tokens)) {
        throw new Error(
            `${ERROR_PREFIX}: unknown token "${identifierName}" in "{${text}}"`
        )
    }

    return {
        value: ExpressionValueService.toNumber(
            tokens[identifierName],
            `token "${identifierName}"`
        ),
        next: afterIdentifier,
    }
}

const isFunctionName = (name: string): name is TFunctionName =>
    (FUNCTION_NAMES as readonly string[]).includes(name)

const parseFunctionCall = (
    name: TFunctionName,
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    switch (name) {
        case "round":
        case "floor":
        case "ceil":
            return parseRoundingFunctionCall(name, text, position, tokens)
        case "ordinal":
            return parseOrdinalFunctionCall(text, position, tokens)
        case "plural":
            return parsePluralFunctionCall(text, position, tokens)
        case "timeFormat":
            return parseTimeFormatFunctionCall(text, position, tokens)
    }
}

const expectClosingParen = (
    text: string,
    position: number,
    functionName: string
): number => {
    const cursor = skipWhitespace(text, position)
    if (text[cursor] !== ")") {
        throw new Error(
            `${ERROR_PREFIX}: expected ")" to close ${functionName}(...) in "{${text}}"`
        )
    }
    return cursor + 1
}

const parseRoundingFunctionCall = (
    name: TRoundingFunctionName,
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const valueArgument = parseArithmetic(text, position, tokens)
    const valueNumber = ExpressionValueService.toNumber(
        valueArgument.value,
        `${name}() argument`
    )

    let cursor = skipWhitespace(text, valueArgument.next)
    let decimalPlaces = 0
    if (text[cursor] === ",") {
        const placesArgument = parseArithmetic(text, cursor + 1, tokens)
        decimalPlaces = ExpressionValueService.toNumber(
            placesArgument.value,
            `${name}() decimal places`
        )
        cursor = placesArgument.next
    }

    return {
        value: applyRoundingFunction(name, valueNumber, decimalPlaces),
        next: expectClosingParen(text, cursor, name),
    }
}

const applyRoundingFunction = (
    name: TRoundingFunctionName,
    value: number,
    decimalPlaces: number
): number => {
    const scale = 10 ** decimalPlaces
    const scaled = value * scale
    switch (name) {
        case "round":
            return Math.round(scaled) / scale
        case "floor":
            return Math.floor(scaled) / scale
        case "ceil":
            return Math.ceil(scaled) / scale
    }
}

const parseOrdinalFunctionCall = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const valueArgument = parseArithmetic(text, position, tokens)
    const valueNumber = ExpressionValueService.toNumber(
        valueArgument.value,
        "ordinal() argument"
    )
    return {
        value: OrdinalFormatterService.format(valueNumber),
        next: expectClosingParen(text, valueArgument.next, "ordinal"),
    }
}

const parsePluralFunctionCall = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const valueArgument = parseArithmetic(text, position, tokens)
    const valueNumber = ExpressionValueService.toNumber(
        valueArgument.value,
        "plural() argument"
    )
    return {
        value: valueNumber === 1,
        next: expectClosingParen(text, valueArgument.next, "plural"),
    }
}

const parseTimeFormatFunctionCall = (
    text: string,
    position: number,
    tokens: Record<string, string>
): ParseResult<TExpressionValue> => {
    const valueArgument = parseArithmetic(text, position, tokens)
    const valueNumber = ExpressionValueService.toNumber(
        valueArgument.value,
        "timeFormat() argument"
    )

    const afterValue = skipWhitespace(text, valueArgument.next)
    if (text[afterValue] !== ",") {
        throw new Error(
            `${ERROR_PREFIX}: timeFormat() requires a pattern argument in "{${text}}"`
        )
    }

    const patternStart = skipWhitespace(text, afterValue + 1)
    const closingParenIndex = text.indexOf(")", patternStart)
    if (closingParenIndex === -1) {
        throw new Error(
            `${ERROR_PREFIX}: expected ")" to close timeFormat(...) in "{${text}}"`
        )
    }

    const pattern = text.slice(patternStart, closingParenIndex).trim()
    return {
        value: TimeFormatterService.format(valueNumber, pattern),
        next: closingParenIndex + 1,
    }
}
