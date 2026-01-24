import { defineConfig, loadEnv } from "vite"
import { resolve } from "path"

export default defineConfig(({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

    const version = "0.0.060"
    const environmentVariables = {
        "process.env.VERSION":
            JSON.stringify(process.env.VERSION) || JSON.stringify(version),
    }
    if (mode === "production") {
        environmentVariables["process.env.CAMPAIGN_ID"] =
            JSON.stringify("templeDefense")
    } else {
        environmentVariables["process.env.VERSION"] = JSON.stringify(
            `${version}-DEVELOPMENT`
        )
    }

    console.log("VERSION: " + environmentVariables["process.env.VERSION"])

    return {
        plugins: [],
        root: "./",
        define: {
            ...environmentVariables,
        },
        build: {
            sourcemap: true,
            lib: {
                entry: resolve(__dirname, "src/index.ts"),
                name: "BattleOfFellDesertLogic",
                fileName: "battle-of-fell-desert-logic",
            },
        },
        test: {
            sourcemap: true,
        },
    }
})
