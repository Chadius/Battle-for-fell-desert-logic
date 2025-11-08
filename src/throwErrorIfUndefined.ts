export const ThrowErrorIfUndefined = ({
    className,
    value,
    functionName,
    fieldName,
}: {
    className: string
    value: any
    functionName: string
    fieldName: string
}): void => {
    if (value != undefined) return
    throw new Error(
        `[${className}:${functionName}] ${fieldName} must be defined`
    )
}
