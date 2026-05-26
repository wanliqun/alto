import { spawn } from "node:child_process"

const passthroughArgs = []
let entryPointVersions

const args = process.argv.slice(2)

for (let index = 0; index < args.length; index++) {
    const arg = args[index]

    if (arg === "--") {
        continue
    }

    if (arg.startsWith("--entrypoint-versions=")) {
        entryPointVersions = arg.slice("--entrypoint-versions=".length)
        continue
    }

    if (arg.startsWith("--entrypoint-version=")) {
        entryPointVersions = arg.slice("--entrypoint-version=".length)
        continue
    }

    if (arg === "--entrypoint-versions" || arg === "--entrypoint-version") {
        entryPointVersions = args[index + 1]
        index++
        continue
    }

    passthroughArgs.push(arg)
}

const child = spawn(
    process.platform === "win32" ? "vitest.cmd" : "vitest",
    ["run", "-c", "./vitest.conflux-espace.config.ts", ...passthroughArgs],
    {
        stdio: "inherit",
        env: {
            ...process.env,
            ...(entryPointVersions
                ? { npm_config_entrypoint_versions: entryPointVersions }
                : {})
        }
    }
)

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal)
        return
    }

    process.exit(code ?? 1)
})
