import {
    http,
    type Chain,
    createPublicClient,
    defineChain,
    parseEther
} from "viem"
import {
    type ConfluxEspaceNetwork,
    getConfluxEspaceNetworkConfig
} from "./network.js"

export const MIN_SIMPLE_ACCOUNT_BALANCE = parseEther("0.05")

export const getConfluxEspaceChain = async ({
    rpcUrl,
    network
}: {
    rpcUrl: string
    network: ConfluxEspaceNetwork
}): Promise<Chain> => {
    const probeClient = createPublicClient({
        transport: http(rpcUrl)
    })

    const chainId = await probeClient.getChainId()
    const networkConfig = getConfluxEspaceNetworkConfig(network)

    if (chainId !== networkConfig.chainId) {
        throw new Error(
            `${networkConfig.name} RPC returned chain ID ${chainId}; expected ${networkConfig.chainId}`
        )
    }

    return defineChain({
        id: chainId,
        name: networkConfig.name,
        nativeCurrency: {
            name: "Conflux",
            symbol: "CFX",
            decimals: 18
        },
        rpcUrls: {
            default: {
                http: [rpcUrl]
            },
            public: {
                http: [rpcUrl]
            }
        }
    })
}
