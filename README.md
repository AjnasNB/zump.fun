# Zump.fun

Memecoin launchpad on **BOT Chain**. Launch a token and trade it on a live linear bonding curve priced in native **BOT** — real on-chain data only (no simulated balances or fake stats).

## Network

| Property | Value |
|----------|-------|
| Chain | BOT Chain |
| Chain ID | `677` (`0x2a5`) |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |
| Native token | BOT (18 decimals) |

## Deployed contracts

| Contract | Address |
|----------|---------|
| PumpFactory | [`0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66`](https://scan.botchain.ai/address/0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66) |
| Token implementation | [`0x407D29Cd0fc3663fc934aBe318d818BB3115b307`](https://scan.botchain.ai/address/0x407D29Cd0fc3663fc934aBe318d818BB3115b307) |

Addresses are also recorded in `contracts/deployed.json`.

## Features

- Launch ERC-20 memecoins from a cloneable factory
- Linear bonding curve buy/sell against native BOT (1% fee)
- MetaMask wallet connect + automatic BOT Chain add/switch
- Launch list, token detail, live price, and on-chain pool state
- Optional Supabase cache for token metadata, images, and trade history

## Repo layout

```
contracts/          # Foundry Solidity (PumpFactory + MemeToken)
zump-frontend/      # React (CRA) app — deploy this to Vercel
supabase/           # Optional schema for metadata / trade_events
```

## Contracts (Foundry)

```bash
cd contracts
forge build
forge test
# Deploy (needs BOT funded private key — never commit it)
forge script script/Deploy.s.sol:Deploy --rpc-url bot --broadcast
```

## Frontend

```bash
cd zump-frontend
cp .env.example .env
yarn install
yarn start
```

App runs at `http://localhost:3000`.

Required env vars (see `zump-frontend/.env.example`):

```env
REACT_APP_BOT_RPC_URL=https://rpc.botchain.ai
REACT_APP_BOT_WS_URL=wss://ws-rpc.botchain.ai
REACT_APP_BOT_EXPLORER_URL=https://scan.botchain.ai
REACT_APP_BOT_CHAIN_ID=677
REACT_APP_PUMP_FACTORY_ADDRESS=0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

## Partnership with BOT Chain

1. **Native BOT liquidity** — Launches and trades settle in BOT, keeping volume and fees on-chain.
2. **End-to-end consumer app** — Factory, curve, wallet, and explorer paths are BOT Chain native.
3. **Shared growth** — More launches drive BOT demand for gas and curve fills; more users get a place to discover and trade new tokens.

## License

MIT
