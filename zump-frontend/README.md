# Zump.fun Frontend

React memecoin launchpad UI for **BOT Chain**. Uses ethers.js + MetaMask (no Starknet).

## Features

- Launch tokens via PumpFactory
- Buy / sell on the linear bonding curve (native BOT)
- Live price and on-chain pool state
- Token list from chain + optional Supabase metadata
- Trade history from Supabase (when configured)

## Prerequisites

- Node.js 18+
- Yarn or npm
- MetaMask (or another EIP-1193 wallet)
- Supabase project (optional, for images / trade history)

## Quick start

```bash
cd zump-frontend
cp .env.example .env
yarn install
yarn start
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` (never commit `.env`):

```env
REACT_APP_BOT_RPC_URL=https://rpc.botchain.ai
REACT_APP_BOT_WS_URL=wss://ws-rpc.botchain.ai
REACT_APP_BOT_EXPLORER_URL=https://scan.botchain.ai
REACT_APP_BOT_CHAIN_ID=677
REACT_APP_PUMP_FACTORY_ADDRESS=0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

On Vercel, set the same `REACT_APP_*` variables for Production / Preview / Development.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start` | Dev server |
| `yarn build` | Production build |
| `yarn lint` | ESLint |

## Project structure

```
src/
├── abi/                 # PumpFactory + ERC-20 fragments
├── config/contracts.ts  # BOT Chain addresses / RPC
├── providers/           # BotChainProvider (wallet)
├── hooks/               # Launch, trading, token detail
├── services/            # Contract + Supabase clients
└── pages/               # Launchpad UI routes
```

## Troubleshooting

- **Wallet does nothing** — Install MetaMask, allow the site, switch to BOT Chain (677).
- **Empty launches** — Confirm factory address and RPC; check [scan.botchain.ai](https://scan.botchain.ai).
- **No trade history** — Supabase must be configured; BOT public RPC does not support reliable `eth_getLogs` for history.

## License

MIT
