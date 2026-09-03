/// <reference types="node" />
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(sourceDirectory, "..")

// Domains that deliberately have no package subpath: their modules are
// internal to the repo (test fixtures/helpers) and are not part of the
// public API. Also they contain genuine duplicate-symbol collisions across
// files, so a barrel over them would silently drop exports.
const packagePrivateDomains = new Set(["testUtils"])

interface PackageExports {
    [subpath: string]: { types?: string; import?: string } | string
}

const readPackageExports = (): PackageExports => {
    const packageJson = JSON.parse(
        readFileSync(join(repositoryRoot, "package.json"), "utf-8")
    ) as { exports: PackageExports }
    return packageJson.exports
}

// "./build/coordinateMap/index.js" -> absolute path to "src/coordinateMap/index.ts"
const sourceModulePathForBuildTarget = (buildTarget: string): string =>
    join(
        repositoryRoot,
        buildTarget.replace(/^\.\/build\//, "src/").replace(/\.js$/, ".ts")
    )

const domainSubpathEntries = (): [string, string][] =>
    Object.entries(readPackageExports())
        .filter(
            ([subpath]) =>
                subpath.startsWith("./") && subpath !== "./package.json"
        )
        .map(([subpath, exportEntry]) => {
            if (
                typeof exportEntry === "string" ||
                exportEntry.import === undefined
            ) {
                throw new Error(
                    `domainSubpathEntries: package.json exports "${subpath}" has no import target`
                )
            }
            return [subpath, exportEntry.import]
        })

const containsNonTestModule = (directory: string): boolean =>
    readdirSync(directory).some((entry) => {
        const entryPath = join(directory, entry)
        if (statSync(entryPath).isDirectory())
            return containsNonTestModule(entryPath)
        return (
            entry.endsWith(".ts") &&
            !entry.endsWith(".test.ts") &&
            entry !== "index.ts"
        )
    })

const sourceDomainFolders = (): string[] =>
    readdirSync(sourceDirectory)
        .filter((entry) => statSync(join(sourceDirectory, entry)).isDirectory())
        .filter((entry) => !packagePrivateDomains.has(entry))
        .filter((entry) => containsNonTestModule(join(sourceDirectory, entry)))

describe("every package subpath resolves to a usable module", () => {
    for (const [subpath, importTarget] of domainSubpathEntries()) {
        it(`${subpath} exports at least one symbol`, async () => {
            const module: Record<string, unknown> = await import(
                sourceModulePathForBuildTarget(importTarget)
            )
            expect(Object.keys(module).length).toBeGreaterThan(0)
        })
    }
})

describe("every source domain folder is reachable by a consumer", () => {
    const subpathImportTargets = domainSubpathEntries().map(
        ([, importTarget]) => importTarget
    )

    for (const folder of sourceDomainFolders()) {
        it(`${folder} has a package.json exports subpath`, () => {
            const isReachable = subpathImportTargets.some((importTarget) =>
                importTarget.includes(`/${folder}/`)
            )
            expect(isReachable).toBe(true)
        })
    }
})
