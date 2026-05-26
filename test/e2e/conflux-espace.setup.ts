import { join } from "node:path"
import { config as loadDotEnv } from "dotenv"
import { startConfluxEspaceBundler } from "./src/conflux-espace/bundler.js"
import { getConfluxEspaceChain } from "./src/conflux-espace/chain.js"
import {
    createConfluxEspaceClients,
    ensureConfluxEspaceCoreContracts
} from "./src/conflux-espace/contracts.js"
import { getConfluxEspaceDemoEnv } from "./src/conflux-espace/env.js"

// biome-ignore lint/style/noDefaultExport: vitest globalSetup requires default
export default async function setup({ provide }) {
    loadDotEnv({
        path: join(__dirname, ".env.conflux-espace-testnet")
    })

    const env = getConfluxEspaceDemoEnv()
    const chain = await getConfluxEspaceChain({
        rpcUrl: env.rpcUrl
    })

    const { publicClient, walletClient } = createConfluxEspaceClients({
        chain,
        rpcUrl: env.rpcUrl,
        privateKey: env.bundlerPrivateKey
    })

    const deployed = await ensureConfluxEspaceCoreContracts({
        publicClient,
        walletClient,
        versions: env.entryPointVersions
    })

    const bundler = await startConfluxEspaceBundler({
        env,
        entryPoints: deployed.map(({ entryPoint }) => entryPoint)
    })

    provide("confluxEspaceRpc", env.rpcUrl)
    provide("confluxEspaceAltoRpc", bundler.altoRpc)
    provide("confluxEspaceChainId", chain.id)
    provide("confluxEspaceEntryPointVersions", env.entryPointVersions)
    provide("confluxEspaceCoreContracts", deployed)
    provide("confluxEspaceOwnerPrivateKey", env.ownerPrivateKey)
    provide("confluxEspaceBundlerPrivateKey", env.bundlerPrivateKey)

    return async () => {
        await bundler.stop()
    }
}

declare module "vitest" {
    export interface ProvidedContext {
        confluxEspaceRpc: string
        confluxEspaceAltoRpc: string
        confluxEspaceChainId: number
        confluxEspaceEntryPointVersions: Array<"0.6" | "0.7" | "0.8">
        confluxEspaceCoreContracts: Array<{
            version: "0.6" | "0.7" | "0.8"
            entryPoint: `0x${string}`
            simpleAccountFactory: `0x${string}`
        }>
        confluxEspaceOwnerPrivateKey: `0x${string}`
        confluxEspaceBundlerPrivateKey: `0x${string}`
    }
}
