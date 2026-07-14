import { createSmartAccountClient } from "permissionless"
import { toSimpleSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import {
    http,
    type Address,
    createPublicClient,
    createWalletClient,
    defineChain,
    parseEther
} from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { expect, inject, test } from "vitest"
import { MIN_SIMPLE_ACCOUNT_BALANCE } from "../src/conflux-espace/chain.js"
import { getPredictedSimpleAccountAddress } from "../src/conflux-espace/contracts.js"
import { getConfluxEspaceEntryPointVersions } from "../src/conflux-espace/env.js"

const callAltoRpc = async <T>({
    altoRpc,
    method,
    params = []
}: {
    altoRpc: string
    method: string
    params?: unknown[]
}): Promise<T> => {
    const response = await fetch(altoRpc, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 4337,
            method,
            params
        })
    })

    const payload = await response.json()

    if (payload.error) {
        throw new Error(
            `${method} failed: ${JSON.stringify(payload.error, null, 2)}`
        )
    }

    return payload.result as T
}

const tryCallAltoRpc = async <T>({
    altoRpc,
    method,
    params
}: {
    altoRpc: string
    method: string
    params?: unknown[]
}) => {
    try {
        return await callAltoRpc<T>({ altoRpc, method, params })
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error)
        }
    }
}

const getUserOperationDiagnostics = async ({
    altoRpc,
    userOpHash
}: {
    altoRpc: string
    userOpHash: `0x${string}`
}) => ({
    status: await tryCallAltoRpc({
        altoRpc,
        method: "pimlico_getUserOperationStatus",
        params: [userOpHash]
    }),
    receipt: await tryCallAltoRpc({
        altoRpc,
        method: "eth_getUserOperationReceipt",
        params: [userOpHash]
    }),
    supportedEntryPoints: await tryCallAltoRpc({
        altoRpc,
        method: "eth_supportedEntryPoints"
    })
})

test.each(getConfluxEspaceEntryPointVersions())(
    "Conflux eSpace can deploy and execute with EntryPoint v%s",
    async (entryPointVersion) => {
        const rpcUrl = inject("confluxEspaceRpc")
        const altoRpc = inject("confluxEspaceAltoRpc")
        const chainId = inject("confluxEspaceChainId")
        const chainName = inject("confluxEspaceChainName")
        const coreContracts = inject("confluxEspaceCoreContracts")
        const contracts = coreContracts.find(
            ({ version }) => version === entryPointVersion
        )

        if (!contracts) {
            throw new Error(
                `Missing Conflux eSpace core contracts for EntryPoint v${entryPointVersion}`
            )
        }

        const { entryPoint, simpleAccountFactory: factoryAddress } = contracts
        const ownerPrivateKey = inject("confluxEspaceOwnerPrivateKey")
        const bundlerPrivateKey = inject("confluxEspaceBundlerPrivateKey")

        const chain = defineChain({
            id: chainId,
            name: chainName,
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

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl)
        })

        const owner = privateKeyToAccount(ownerPrivateKey)
        const bundlerSigner = privateKeyToAccount(bundlerPrivateKey)

        const account = await toSimpleSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint,
                version: entryPointVersion as EntryPointVersion
            },
            factoryAddress,
            owner
        })

        const predictedAddress = await getPredictedSimpleAccountAddress({
            publicClient,
            factoryAddress,
            owner: owner.address
        })

        expect(account.address).toBe(predictedAddress)

        const bundlerWalletClient = createWalletClient({
            account: bundlerSigner,
            chain,
            transport: http(rpcUrl)
        })

        const accountBalance = await publicClient.getBalance({
            address: account.address
        })

        if (accountBalance < MIN_SIMPLE_ACCOUNT_BALANCE) {
            const fundHash = await bundlerWalletClient.sendTransaction({
                to: account.address,
                value: MIN_SIMPLE_ACCOUNT_BALANCE - accountBalance
            })

            await publicClient.waitForTransactionReceipt({
                hash: fundHash
            })
        }

        const recipient = privateKeyToAccount(generatePrivateKey()).address
        const transferValue = parseEther("0.0001")
        const recipientBalanceBefore = await publicClient.getBalance({
            address: recipient
        })

        const pimlicoClient = createPimlicoClient({
            chain,
            transport: http(altoRpc),
            entryPoint: {
                address: entryPoint,
                version: entryPointVersion as EntryPointVersion
            }
        })

        const smartAccountClient = createSmartAccountClient({
            account,
            chain,
            bundlerTransport: http(altoRpc),
            userOperation: {
                estimateFeesPerGas: async () =>
                    (await pimlicoClient.getUserOperationGasPrice()).fast
            }
        })

        const userOpHash = await smartAccountClient.sendUserOperation({
            calls: [
                {
                    to: recipient as Address,
                    value: transferValue,
                    data: "0x"
                }
            ]
        })

        if (inject("confluxEspaceSendBundleNow")) {
            await tryCallAltoRpc({
                altoRpc,
                method: "debug_bundler_sendBundleNow"
            })
        }

        let receipt: Awaited<
            ReturnType<typeof smartAccountClient.waitForUserOperationReceipt>
        >
        try {
            receipt = await smartAccountClient.waitForUserOperationReceipt({
                hash: userOpHash
            })
        } catch (error) {
            const diagnostics = await getUserOperationDiagnostics({
                altoRpc,
                userOpHash
            })

            throw new Error(
                [
                    `Timed out waiting for user operation ${userOpHash}.`,
                    `EntryPoint: ${entryPoint}`,
                    `Alto RPC: ${altoRpc}`,
                    `Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`,
                    `Original error: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                ].join("\n")
            )
        }

        expect(receipt.success).toBe(true)
        expect(receipt.entryPoint.toLowerCase()).toBe(entryPoint.toLowerCase())

        const bundleReceipt = await publicClient.waitForTransactionReceipt({
            hash: receipt.receipt.transactionHash,
            confirmations: 2
        })
        const deployedCode = await publicClient.getBytecode({
            address: account.address,
            blockNumber: bundleReceipt.blockNumber
        })

        if (!deployedCode || deployedCode === "0x") {
            throw new Error(
                [
                    `SimpleAccount ${account.address} has no bytecode after a successful user operation.`,
                    `Chain ID: ${chainId}`,
                    `EntryPoint: ${entryPoint}`,
                    `User operation: ${userOpHash}`,
                    `Bundle transaction: ${bundleReceipt.transactionHash}`,
                    `Bundle block: ${bundleReceipt.blockNumber}`
                ].join("\n")
            )
        }

        const recipientBalanceAfter = await publicClient.getBalance({
            address: recipient
        })
        expect(recipientBalanceAfter).toBeGreaterThan(recipientBalanceBefore)
    },
    300_000
)
