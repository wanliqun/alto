import type { Address } from "viem"
import {
    ENTRY_POINT_V06_CREATECALL,
    ENTRY_POINT_V07_CREATECALL,
    ENTRY_POINT_V08_CREATECALL,
    SIMPLE_ACCOUNT_FACTORY_V06_CREATECALL,
    SIMPLE_ACCOUNT_FACTORY_V07_CREATECALL,
    SIMPLE_ACCOUNT_FACTORY_V08_CREATECALL
} from "../../deploy-contracts/constants.js"
import type { ConfluxEspaceEntryPointVersion } from "./env.js"

export const CONFLUX_ESPACE_TESTNET_NAME = "Conflux eSpace Testnet"

export const DETERMINISTIC_DEPLOYER_ADDRESS =
    "0x4e59b44847b379578588920ca78fbf26c0b4956c" satisfies Address

export const ENTRY_POINT_V08_ADDRESS =
    "0x4337084d9e255ff0702461cf8895ce9e3b5ff108" satisfies Address

export const ENTRY_POINT_V07_ADDRESS =
    "0x0000000071727De22E5E9d8BAf0edAc6f37da032" satisfies Address

export const ENTRY_POINT_V06_ADDRESS =
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" satisfies Address

export const SIMPLE_ACCOUNT_FACTORY_V08_ADDRESS =
    "0x13E9ed32155810FDbd067D4522C492D6f68E5944" satisfies Address

export const SIMPLE_ACCOUNT_FACTORY_V07_ADDRESS =
    "0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985" satisfies Address

export const SIMPLE_ACCOUNT_FACTORY_V06_ADDRESS =
    "0x9406Cc6185a346906296840746125a0E44976454" satisfies Address

export const ENTRY_POINT_V08_CREATE_CALL = ENTRY_POINT_V08_CREATECALL

export const ENTRY_POINT_V07_CREATE_CALL = ENTRY_POINT_V07_CREATECALL

export const ENTRY_POINT_V06_CREATE_CALL = ENTRY_POINT_V06_CREATECALL

export const SIMPLE_ACCOUNT_FACTORY_V08_CREATE_CALL =
    SIMPLE_ACCOUNT_FACTORY_V08_CREATECALL

export const SIMPLE_ACCOUNT_FACTORY_V07_CREATE_CALL =
    SIMPLE_ACCOUNT_FACTORY_V07_CREATECALL

export const SIMPLE_ACCOUNT_FACTORY_V06_CREATE_CALL =
    SIMPLE_ACCOUNT_FACTORY_V06_CREATECALL

export const CONFLUX_ESPACE_CORE_CONTRACTS = {
    "0.6": {
        entryPoint: ENTRY_POINT_V06_ADDRESS,
        simpleAccountFactory: SIMPLE_ACCOUNT_FACTORY_V06_ADDRESS,
        entryPointCreateCall: ENTRY_POINT_V06_CREATE_CALL,
        simpleAccountFactoryCreateCall: SIMPLE_ACCOUNT_FACTORY_V06_CREATE_CALL
    },
    "0.7": {
        entryPoint: ENTRY_POINT_V07_ADDRESS,
        simpleAccountFactory: SIMPLE_ACCOUNT_FACTORY_V07_ADDRESS,
        entryPointCreateCall: ENTRY_POINT_V07_CREATE_CALL,
        simpleAccountFactoryCreateCall: SIMPLE_ACCOUNT_FACTORY_V07_CREATE_CALL
    },
    "0.8": {
        entryPoint: ENTRY_POINT_V08_ADDRESS,
        simpleAccountFactory: SIMPLE_ACCOUNT_FACTORY_V08_ADDRESS,
        entryPointCreateCall: ENTRY_POINT_V08_CREATE_CALL,
        simpleAccountFactoryCreateCall: SIMPLE_ACCOUNT_FACTORY_V08_CREATE_CALL
    }
} satisfies Record<
    ConfluxEspaceEntryPointVersion,
    {
        entryPoint: Address
        simpleAccountFactory: Address
        entryPointCreateCall: `0x${string}`
        simpleAccountFactoryCreateCall: `0x${string}`
    }
>
