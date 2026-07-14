# Alto E2E Test

E2E test will reconstruct a close to mainnet environment by deploying the following contracts:
- EntryPoint V0.7 to `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.
- EntryPoint V0.6 to `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`.
- SimpleAccountFactory V0.7 to `0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985`.
- SimpleAccountFactory V0.6 to `0x9406Cc6185a346906296840746125a0E44976454`.
- EntryPoint Simulation to `0xf93dA0397eAEB3dA615ab8869b10634fe92c4327`.
- EntryPoint V0.8 to `0x4337084d9e255ff0702461cf8895ce9e3b5ff108`.
- SimpleAccountFactory V0.8 to `0x13E9ed32155810FDbd067D4522C492D6f68E5944`.

## Testing locally

Run mock environment

```
docker-compose up
```

Run test cases

```
pnpm run test
```

## Conflux eSpace remote smoke test

This repo also includes a remote smoke test for Conflux eSpace Testnet and
Mainnet that:

- Ensures the deterministic deployer exists on the selected network
- Deploys the selected `EntryPoint` and `SimpleAccountFactory` versions to
  their deterministic addresses when missing and deployment is enabled
- Starts a local Alto instance against the remote network RPC, unless a remote
  Alto RPC URL is configured
- Funds the predicted SimpleAccount address
- Sends the first `eth_sendUserOperation`, which deploys the SimpleAccount and
  executes a native token transfer

### Environment

Copy [`.env.conflux-espace.example`](./.env.conflux-espace.example) to
`.env.conflux-espace`. Select `testnet` or `mainnet` with
`CONFLUX_ESPACE_NETWORK`, then configure the matching RPC URL and keys. Mainnet
requires a reusable owner private key so funds are not left in an account
controlled by a discarded key:

```bash
CONFLUX_ESPACE_NETWORK=mainnet
CONFLUX_ESPACE_RPC_URL=...
CONFLUX_ESPACE_BUNDLER_PRIVATE_KEY=...
CONFLUX_ESPACE_OWNER_PRIVATE_KEY=...
```

Notes:

- The test rejects RPCs with a chain ID that does not match the selected
  network: `71` for testnet and `1030` for mainnet.
- `CONFLUX_ESPACE_ENTRYPOINT_VERSIONS` is optional and defaults to `0.8`. Use a
  comma-separated list like `0.6,0.7,0.8` to cover multiple EntryPoint
  versions.
- `CONFLUX_ESPACE_ALTO_RPC_URL` is optional. If set, the smoke test uses that
  existing Alto RPC service and skips starting a local Alto process. The
  remote Alto service must support the selected EntryPoint versions.
- `CONFLUX_ESPACE_SEND_BUNDLE_NOW` is optional and defaults to `false`. Set it
  to `true` when testing against an Alto service running in manual bundle mode
  with debug endpoints enabled.
- `CONFLUX_ESPACE_EXECUTOR_PRIVATE_KEYS` is optional. If omitted, the bundler
  key is reused as the single executor key.
- `CONFLUX_ESPACE_OWNER_PRIVATE_KEY` is optional on testnet, where the test
  generates a throwaway owner when omitted. It is required on mainnet.
- `CONFLUX_ESPACE_DEPLOY_CONTRACTS` defaults to `true` on testnet and `false`
  on mainnet. Mainnet therefore only validates existing deterministic
  deployments unless deployment is explicitly enabled.
- The bundler key must hold enough native CFX to fund the demo account and
  submit the bundle transaction, plus contract deployment gas when enabled.
- The demo defaults to `safe-mode=false`, `balance-override=false`, and
  `code-override-support=false` because many public RPCs do not expose the full
  tracing/state-override surface area. If your RPC supports those features,
  you can switch them back on in the env file.

### Run

From the repo root:

```bash
pnpm run test:conflux-espace
```

The network normally comes from `.env.conflux-espace`. Override it for one run
without editing the file with:

```bash
pnpm run test:conflux-espace --network=mainnet
```

Run selected EntryPoint versions:

```bash
pnpm run test:conflux-espace --entrypoint-versions=0.6,0.7
```

Run against an existing remote Alto service:

```bash
CONFLUX_ESPACE_ALTO_RPC_URL=https://<your-alto-rpc> pnpm run test:conflux-espace
```

From `test/e2e` directly:

```bash
pnpm --dir ../.. run build:contracts
pnpm run test:conflux-espace
```
