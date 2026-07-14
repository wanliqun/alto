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
        path: join(__dirname, ".env.conflux-espace")
    })

    const env = getConfluxEspaceDemoEnv()
    const chain = await getConfluxEspaceChain({
        rpcUrl: env.rpcUrl,
        network: env.network
    })

    const { publicClient, walletClient } = createConfluxEspaceClients({
        chain,
        rpcUrl: env.rpcUrl,
        privateKey: env.bundlerPrivateKey
    })

    const deployed = await ensureConfluxEspaceCoreContracts({
        publicClient,
        walletClient,
        versions: env.entryPointVersions,
        deployMissing: env.deployContracts
    })

    const bundler = env.altoRpcUrl
        ? undefined
        : await startConfluxEspaceBundler({
              env,
              entryPoints: deployed.map(({ entryPoint }) => entryPoint)
          })
    const altoRpc = env.altoRpcUrl ?? bundler?.altoRpc

    if (!altoRpc) {
        throw new Error("Missing Conflux eSpace Alto RPC URL")
    }

    provide("confluxEspaceRpc", env.rpcUrl)
    provide("confluxEspaceAltoRpc", altoRpc)
    provide("confluxEspaceChainId", chain.id)
    provide("confluxEspaceChainName", chain.name)
    provide("confluxEspaceEntryPointVersions", env.entryPointVersions)
    provide("confluxEspaceCoreContracts", deployed)
    provide("confluxEspaceOwnerPrivateKey", env.ownerPrivateKey)
    provide("confluxEspaceBundlerPrivateKey", env.bundlerPrivateKey)
    provide("confluxEspaceSendBundleNow", env.sendBundleNow)

    return async () => {
        await bundler?.stop()
    }
}

declare module "vitest" {
    export interface ProvidedContext {
        confluxEspaceRpc: string
        confluxEspaceAltoRpc: string
        confluxEspaceChainId: number
        confluxEspaceChainName: string
        confluxEspaceEntryPointVersions: Array<"0.6" | "0.7" | "0.8">
        confluxEspaceCoreContracts: Array<{
            version: "0.6" | "0.7" | "0.8"
            entryPoint: `0x${string}`
            simpleAccountFactory: `0x${string}`
        }>
        confluxEspaceOwnerPrivateKey: `0x${string}`
        confluxEspaceBundlerPrivateKey: `0x${string}`
        confluxEspaceSendBundleNow: boolean
    }
}
