import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PublicClient,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    getContract
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { SimpleAccountFactoryAbi } from "../../../../src/types/contracts/SimpleAccountFactory.js"
import {
    CONFLUX_ESPACE_CORE_CONTRACTS,
    DETERMINISTIC_DEPLOYER_ADDRESS
} from "./constants.js"
import type { ConfluxEspaceEntryPointVersion } from "./env.js"

export type ConfluxEspaceCoreContracts = {
    version: ConfluxEspaceEntryPointVersion
    entryPoint: Address
    simpleAccountFactory: Address
}

const DETERMINISTIC_DEPLOYER_TRANSACTION =
    "0xf8a58V85174876e80V830186aV8V80b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600V81602V82378035828234f58015156039578182fd5b8V82525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222".replaceAll(
        "V",
        "0"
    ) as Hex

const hasBytecode = async ({
    publicClient,
    address
}: {
    publicClient: PublicClient
    address: Address
}) => {
    const bytecode = await publicClient.getBytecode({ address })
    return bytecode !== undefined && bytecode !== "0x"
}

const ensureDeterministicDeployer = async ({
    publicClient,
    walletClient,
    deployMissing
}: {
    publicClient: PublicClient
    walletClient: WalletClient
    deployMissing: boolean
}) => {
    if (
        await hasBytecode({
            publicClient,
            address: DETERMINISTIC_DEPLOYER_ADDRESS
        })
    ) {
        return
    }

    if (!deployMissing) {
        throw new Error(
            `Missing deterministic deployer at ${DETERMINISTIC_DEPLOYER_ADDRESS}. Set CONFLUX_ESPACE_DEPLOY_CONTRACTS=true to deploy it.`
        )
    }

    const hash = await walletClient.sendRawTransaction({
        serializedTransaction: DETERMINISTIC_DEPLOYER_TRANSACTION
    })

    await publicClient.waitForTransactionReceipt({ hash })
}

const ensureCreateCallDeployment = async ({
    publicClient,
    walletClient,
    address,
    createCall,
    label,
    deployMissing
}: {
    publicClient: PublicClient
    walletClient: WalletClient
    address: Address
    createCall: Hex
    label: string
    deployMissing: boolean
}) => {
    if (await hasBytecode({ publicClient, address })) {
        return
    }

    if (!deployMissing) {
        throw new Error(
            `Missing ${label} at ${address}. Set CONFLUX_ESPACE_DEPLOY_CONTRACTS=true to deploy it.`
        )
    }

    const hash = await walletClient.sendTransaction({
        to: DETERMINISTIC_DEPLOYER_ADDRESS,
        data: createCall,
        gas: 15_000_000n,
        chain: publicClient.chain
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status !== "success") {
        throw new Error(`Failed to deploy ${label}`)
    }

    if (!(await hasBytecode({ publicClient, address }))) {
        throw new Error(`${label} deployment finished without bytecode`)
    }
}

export const createConfluxEspaceClients = ({
    chain,
    rpcUrl,
    privateKey
}: {
    chain: Chain
    rpcUrl: string
    privateKey: Hex
}) => {
    const account = privateKeyToAccount(privateKey)

    return {
        publicClient: createPublicClient({
            chain,
            transport: http(rpcUrl)
        }),
        walletClient: createWalletClient({
            account,
            chain,
            transport: http(rpcUrl)
        })
    }
}

export const ensureConfluxEspaceCoreContracts = async ({
    publicClient,
    walletClient,
    versions,
    deployMissing
}: {
    publicClient: PublicClient
    walletClient: WalletClient
    versions: ConfluxEspaceEntryPointVersion[]
    deployMissing: boolean
}): Promise<ConfluxEspaceCoreContracts[]> => {
    await ensureDeterministicDeployer({
        publicClient,
        walletClient,
        deployMissing
    })

    const deployed: ConfluxEspaceCoreContracts[] = []

    for (const version of versions) {
        const contracts = CONFLUX_ESPACE_CORE_CONTRACTS[version]

        await ensureCreateCallDeployment({
            publicClient,
            walletClient,
            address: contracts.entryPoint,
            createCall: contracts.entryPointCreateCall,
            label: `EntryPoint v${version}`,
            deployMissing
        })

        await ensureCreateCallDeployment({
            publicClient,
            walletClient,
            address: contracts.simpleAccountFactory,
            createCall: contracts.simpleAccountFactoryCreateCall,
            label: `SimpleAccountFactory v${version}`,
            deployMissing
        })

        deployed.push({
            version,
            entryPoint: contracts.entryPoint,
            simpleAccountFactory: contracts.simpleAccountFactory
        })
    }

    return deployed
}

export const getPredictedSimpleAccountAddress = async ({
    publicClient,
    factoryAddress,
    owner
}: {
    publicClient: PublicClient
    factoryAddress: Address
    owner: Address
}) => {
    const simpleAccountFactory = getContract({
        address: factoryAddress,
        abi: SimpleAccountFactoryAbi,
        client: publicClient
    })

    return await simpleAccountFactory.read.getAddress([owner, 0n])
}
