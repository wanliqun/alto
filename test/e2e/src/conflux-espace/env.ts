import { generatePrivateKey } from "viem/accounts"
import {
    type ConfluxEspaceNetwork,
    getConfluxEspaceNetwork
} from "./network.js"

export type ConfluxEspaceEntryPointVersion = "0.6" | "0.7" | "0.8"

const PRIVATE_KEY_REGEX = /^0x[a-fA-F0-9]{64}$/

export type ConfluxEspaceDemoEnv = {
    network: ConfluxEspaceNetwork
    rpcUrl: string
    altoRpcUrl?: string
    sendTransactionRpcUrl?: string
    bundlerPrivateKey: `0x${string}`
    executorPrivateKeys: string
    ownerPrivateKey: `0x${string}`
    entryPointVersions: ConfluxEspaceEntryPointVersion[]
    port: number
    blockTimeMs: number
    logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal"
    safeMode: boolean
    balanceOverride: boolean
    codeOverrideSupport: boolean
    deployContracts: boolean
    sendBundleNow: boolean
}

let cachedEnv: ConfluxEspaceDemoEnv | undefined

const requireString = (name: string) => {
    const value = process.env[name]?.trim()

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

const parseUrl = ({
    name,
    fallback
}: {
    name: string
    fallback?: string
}) => {
    const value = process.env[name]?.trim() || fallback

    if (!value) {
        return undefined
    }

    try {
        return new URL(value).toString()
    } catch {
        throw new Error(`Invalid URL environment variable: ${name}`)
    }
}

const parsePrivateKey = ({
    name,
    fallback
}: {
    name: string
    fallback?: `0x${string}`
}) => {
    const value = process.env[name]?.trim() || fallback

    if (!value) {
        return undefined
    }

    if (!PRIVATE_KEY_REGEX.test(value)) {
        throw new Error(`Invalid private key environment variable: ${name}`)
    }

    return value as `0x${string}`
}

const parseNumber = ({
    name,
    fallback,
    min
}: {
    name: string
    fallback: number
    min: number
}) => {
    const raw = process.env[name]?.trim()
    const value = raw ? Number(raw) : fallback

    if (!Number.isInteger(value) || value < min) {
        throw new Error(`Invalid numeric environment variable: ${name}`)
    }

    return value
}

const parseBoolean = ({
    name,
    fallback
}: {
    name: string
    fallback: boolean
}) => {
    const raw = process.env[name]?.trim().toLowerCase()

    if (!raw) {
        return fallback
    }

    if (raw === "true") {
        return true
    }

    if (raw === "false") {
        return false
    }

    throw new Error(`Invalid boolean environment variable: ${name}`)
}

const parseLogLevel = (name: string): ConfluxEspaceDemoEnv["logLevel"] => {
    const raw = process.env[name]?.trim()

    if (!raw) {
        return "debug"
    }

    switch (raw) {
        case "trace":
        case "debug":
        case "info":
        case "warn":
        case "error":
        case "fatal":
            return raw
        default:
            throw new Error(`Invalid log level environment variable: ${name}`)
    }
}

export const getConfluxEspaceEntryPointVersions =
    (): ConfluxEspaceEntryPointVersion[] => {
        const raw =
            process.env.npm_config_entrypoint_versions?.trim() ||
            process.env.npm_config_entrypoint_version?.trim() ||
            process.env.CONFLUX_ESPACE_ENTRYPOINT_VERSIONS?.trim() ||
            "0.8"

        const versions = raw
            .split(",")
            .map((version) => version.trim())
            .filter(Boolean)

        if (versions.length === 0) {
            throw new Error(
                "At least one Conflux eSpace EntryPoint version is required"
            )
        }

        const uniqueVersions = [...new Set(versions)]

        for (const version of uniqueVersions) {
            if (version !== "0.6" && version !== "0.7" && version !== "0.8") {
                throw new Error(
                    `Invalid Conflux eSpace EntryPoint version: ${version}. Supported versions: 0.6, 0.7, 0.8`
                )
            }
        }

        return uniqueVersions as ConfluxEspaceEntryPointVersion[]
    }

export const getConfluxEspaceDemoEnv = (): ConfluxEspaceDemoEnv => {
    if (cachedEnv) {
        return cachedEnv
    }

    const network = getConfluxEspaceNetwork()
    const bundlerPrivateKeyName = "CONFLUX_ESPACE_BUNDLER_PRIVATE_KEY"
    const bundlerPrivateKey = parsePrivateKey({ name: bundlerPrivateKeyName })
    const ownerPrivateKeyName = "CONFLUX_ESPACE_OWNER_PRIVATE_KEY"
    const ownerPrivateKey = parsePrivateKey({ name: ownerPrivateKeyName })

    if (!bundlerPrivateKey) {
        throw new Error(
            `Missing required environment variable: ${bundlerPrivateKeyName}`
        )
    }

    if (network === "mainnet" && !ownerPrivateKey) {
        throw new Error(
            `Missing required environment variable: ${ownerPrivateKeyName}. Mainnet tests require a reusable owner to avoid stranding funds in a throwaway account.`
        )
    }

    cachedEnv = {
        network,
        rpcUrl: parseUrl({
            name: "CONFLUX_ESPACE_RPC_URL",
            fallback: requireString("CONFLUX_ESPACE_RPC_URL")
        }) as string,
        altoRpcUrl: parseUrl({
            name: "CONFLUX_ESPACE_ALTO_RPC_URL"
        }),
        sendTransactionRpcUrl: parseUrl({
            name: "CONFLUX_ESPACE_SEND_TRANSACTION_RPC_URL"
        }),
        bundlerPrivateKey,
        executorPrivateKeys:
            process.env.CONFLUX_ESPACE_EXECUTOR_PRIVATE_KEYS?.trim() ??
            bundlerPrivateKey,
        ownerPrivateKey: ownerPrivateKey ?? generatePrivateKey(),
        entryPointVersions: getConfluxEspaceEntryPointVersions(),
        port: parseNumber({
            name: "CONFLUX_ESPACE_PORT",
            fallback: 4337,
            min: 1
        }),
        blockTimeMs: parseNumber({
            name: "CONFLUX_ESPACE_BLOCK_TIME_MS",
            fallback: 1_000,
            min: 100
        }),
        logLevel: parseLogLevel("CONFLUX_ESPACE_LOG_LEVEL"),
        safeMode: parseBoolean({
            name: "CONFLUX_ESPACE_SAFE_MODE",
            fallback: false
        }),
        balanceOverride: parseBoolean({
            name: "CONFLUX_ESPACE_BALANCE_OVERRIDE",
            fallback: false
        }),
        codeOverrideSupport: parseBoolean({
            name: "CONFLUX_ESPACE_CODE_OVERRIDE_SUPPORT",
            fallback: false
        }),
        deployContracts: parseBoolean({
            name: "CONFLUX_ESPACE_DEPLOY_CONTRACTS",
            fallback: network === "testnet"
        }),
        sendBundleNow: parseBoolean({
            name: "CONFLUX_ESPACE_SEND_BUNDLE_NOW",
            fallback: false
        })
    }

    return cachedEnv
}
