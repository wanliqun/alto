export type ConfluxEspaceNetwork = "mainnet" | "testnet"

export type ConfluxEspaceNetworkConfig = {
    chainId: number
    name: string
}

const CONFLUX_ESPACE_NETWORKS = {
    mainnet: {
        chainId: 1030,
        name: "Conflux eSpace Mainnet"
    },
    testnet: {
        chainId: 71,
        name: "Conflux eSpace Testnet"
    }
} as const satisfies Record<ConfluxEspaceNetwork, ConfluxEspaceNetworkConfig>

export const getConfluxEspaceNetwork = (): ConfluxEspaceNetwork => {
    const network = (
        process.env.CONFLUX_ESPACE_NETWORK ??
        process.env.npm_config_network ??
        "testnet"
    )
        .trim()
        .toLowerCase()

    if (network !== "mainnet" && network !== "testnet") {
        throw new Error(
            `Invalid Conflux eSpace network: ${network}. Supported networks: mainnet, testnet`
        )
    }

    return network
}

export const getConfluxEspaceNetworkConfig = (
    network = getConfluxEspaceNetwork()
): ConfluxEspaceNetworkConfig => CONFLUX_ESPACE_NETWORKS[network]
