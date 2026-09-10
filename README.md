# Zump.fun

Memecoin launchpad on **BOT Chain**. Launch a token and trade it on a live linear bonding curve priced in native **BOT** — real on-chain data only (no simulated balances or fake stats).

**Live app:** [https://zump-fun.vercel.app](https://zump-fun.vercel.app)

---

## Pitch deck

### Slide 1 — Title

**Zump.fun**  
Memecoin launchpad on BOT Chain

*Launch. Trade. Stay on-chain.*

---

### Slide 2 — What it is

Zump.fun is a pump.fun-style memecoin launchpad built natively on **BOT Chain**.

Anyone can:

1. Launch an ERC-20 memecoin
2. Trade it on a **live linear bonding curve** priced in **native BOT**
3. See real pool state, price, and progress — **no fake stats, no simulated balances**

---

### Slide 3 — The problem

Most memecoin launchpads either:

- Sit on congested / expensive chains, or
- Show demo numbers, mock portfolios, and “simulation” trading that never hits a real curve

Builders and traders on BOT Chain need a **simple, honest** place to create and trade tokens with real liquidity in **BOT**.

---

### Slide 4 — The product

| Surface | What users get |
|---------|----------------|
| Launch | One-tx create via PumpFactory (cloneable ERC-20) |
| Trade | Buy / sell on a linear bonding curve (1% fee) |
| Discover | Live launch list + token detail pages |
| Wallet | MetaMask connect + auto add/switch to BOT Chain (677) |
| Truth | Price, sold supply, reserve, creator — read from chain |

---

### Slide 5 — How the curve works

Linear bonding curve against **native BOT**:

- Price rises as tokens are bought
- Price falls as tokens are sold
- Cost is the average of start and end price over the fill
- Protocol takes **1%** per trade

Everything settles in **BOT** — gas and curve liquidity stay on BOT Chain.

---

### Slide 6 — Live on BOT Chain

| | |
|--|--|
| Chain ID | `677` (`0x2a5`) |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |
| PumpFactory | [`0x9C27…Cc66`](https://scan.botchain.ai/address/0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66) |
| App | [zump-fun.vercel.app](https://zump-fun.vercel.app) |

---

### Slide 7 — Partnership with BOT Chain (3 points)

1. **Native BOT liquidity**  
   Every launch and trade settles in BOT, so volume and fees stay on BOT Chain instead of bridging out.

2. **Real consumer surface**  
   Zump.fun is an end-to-end app on BOT Chain — factory, curve, wallet, RPC, and explorer — giving the network a clear memecoin product.

3. **Shared growth loop**  
   More launches → more BOT demand for gas and curve fills. More BOT Chain users → a simple place to discover and trade new tokens without leaving the ecosystem.

---

### Slide 8 — Why now

- BOT Chain is live with native BOT
- Factory + frontend are deployed and trading-ready
- Clear wedge: *honest* memecoin launches (on-chain only)

---

### Slide 9 — Ask / next

- Ecosystem listing & co-marketing with BOT Chain
- More liquidity / fee routing into BOT-native venues
- Indexer / trade history as RPC `eth_getLogs` matures
- Custom domain + continued launchpad UX polish

---

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

## License

MIT
