import { defineConfig, loadEnv } from "vite"

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
        base: "",
        plugins: [],
        server: {
            open: true,
            port: 3000,
        },
        root: "./",
        define: {
            ...environmentVariables,
        },
    }
})
