import { join } from "node:path"
import { config } from "dotenv"
import { defineConfig } from "vitest/config"

const dotenvEnv =
    config({
        path: join(__dirname, ".env.conflux-espace")
    }).parsed ?? {}

export default defineConfig({
    test: {
        coverage: {
            all: false,
            provider: "v8",
            reporter: process.env.CI ? ["lcov"] : ["text", "json", "html"],
            exclude: [
                "**/errors/utils.ts",
                "**/_cjs/**",
                "**/_esm/**",
                "**/_types/**"
            ]
        },
        env: {
            ...dotenvEnv,
            ...process.env
        },
        sequence: {
            concurrent: false
        },
        fileParallelism: false,
        globalSetup: join(__dirname, "./conflux-espace.setup.ts"),
        include: ["tests/conflux-espace.simple-account.test.ts"],
        environment: "node",
        testTimeout: 300_000,
        hookTimeout: 180_000
    }
})
