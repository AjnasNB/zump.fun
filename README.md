# Pump.fun on StarkNet 🚀

A modular memecoin launchpad on StarkNet with bonding-curve price discovery, protocol fees, and future-proof hooks for private trading & LP migration.

## 📋 Overview

**Pump.fun** is a memecoin launchpad inspired by the popular Solana platform, built entirely on StarkNet using Cairo 1. The platform allows users to create and trade memecoins through bonding curves, with automatic price discovery and built-in protocol fees.

### 🎯 MVP Features

- ✅ Create memecoins with a few clicks
- ✅ Bonding-curve based buying (price goes up as people buy)
- ✅ Simple sell-back mechanism
- ✅ Platform fee on trades
- ✅ Automatic status: PRE_MIGRATION / MIGRATED
- ✅ Factory-based launch registry

### 🔮 Future Features (V1+)

- Real DEX migration (JediSwap/Ekubo)
- LP lock + unlock rules
- Private orders / anti-MEV relayer
- Creator fee, referral fee
- Anti-bot rules, cooldowns, max wallet
- Better bonding curves (sigmoid, exponential, stages)
- Governance: protocol params change via DAO

## 🏗️ Architecture

### On-chain Contracts

1. **MemecoinToken** - ERC20-like token with mint/burn controlled by the curve contract
2. **BondingCurvePool** - Per-token curve contract handling buy/sell, price, reserves, protocol fee
3. **PumpFactory** - Registry that creates & tracks all launches
4. **ProtocolConfig** - Global protocol variables: fee %, fee wallet, allowed curve parameters
5. **LiquidityMigration** - Stub for future DEX migration (can set migrated flag)

### Contract Responsibilities

| Contract | Responsibility |
|----------|---------------|
| MemecoinToken | Minimal ERC20 with mint/burn controlled by minter |
| BondingCurvePool | Bonding curve logic, holds reserves, mints/burns memecoins |
| PumpFactory | Registers launches, deploys pools/tokens (or records them) |
| ProtocolConfig | Global config: fee %, treasury wallet, allowed slopes, etc. |
| LiquidityMigration | (Later) Move liquidity to DEX + lock LP |

## 🚀 Getting Started

### Prerequisites

- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- [Node.js](https://nodejs.org/) (v18+)
- [StarkNet account](https://www.starknet.io/en/developers/account-abstraction) with testnet ETH

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pumb.fum
   ```

2. **Install Scarb** (if not already installed)
   ```bash
   # On macOS/Linux
   curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
   
   # On Windows (using Scoop)
   scoop install scarb
   
   # Or download from: https://github.com/software-mansion/scarb/releases
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your StarkNet account details
   ```

### Configuration

Edit `.env` file with your configuration:

```env
NETWORK=sepolia
RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
PRIVATE_KEY=your_private_key_here
ACCOUNT_ADDRESS=your_account_address_here
QUOTE_TOKEN=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
```

## 📝 Usage

### Build Contracts

```bash
scarb build
```

This compiles all Cairo contracts to Sierra and CASM formats in the `target/dev/` directory.

### Deploy Core Contracts

Deploy the core protocol contracts (ProtocolConfig, PumpFactory, LiquidityMigration):

```bash
npm run deploy
```

This will:
1. Deploy `ProtocolConfig` with initial fee settings
2. Deploy `PumpFactory` for launch registry
3. Deploy `LiquidityMigration` stub
4. Save deployment addresses to `deployments/{NETWORK}.json`

### Create a New Launch

Create a new memecoin launch:

```bash
npm run create-launch <name> <symbol> <basePrice> <slope> <maxSupply> [quoteToken]
```

**Example:**
```bash
npm run create-launch "DogeCoin" "DOGE" "1000000000000000" "1000000000000" "1000000000000000000000000"
```

Parameters:
- `name`: Token name (e.g., "DogeCoin")
- `symbol`: Token symbol (e.g., "DOGE")
- `basePrice`: Starting price in wei (e.g., "1000000000000000" = 0.001 ETH)
- `slope`: Price increase per token sold (e.g., "1000000000000" = 0.000001 ETH)
- `maxSupply`: Maximum tokens to mint (e.g., "1000000000000000000000000" = 1M tokens with 18 decimals)
- `quoteToken`: (Optional) Quote token address (defaults to .env QUOTE_TOKEN)

This will:
1. Deploy a new `MemecoinToken`
2. Deploy a new `BondingCurvePool`
3. Link them together
4. Register the launch in `PumpFactory`
5. Save launch info to `deployments/launches.json`

## 📁 Project Structure

```
pumb.fum/
├── src/                          # Cairo source files
│   ├── lib.cairo                # Main library file
│   ├── memecoin_token.cairo     # ERC20 token contract
│   ├── protocol_config.cairo    # Global protocol config
│   ├── bonding_curve_pool.cairo # Bonding curve logic
│   ├── pump_factory.cairo       # Launch registry
│   └── liquidity_migration.cairo # DEX migration stub
├── scripts/                      # Deployment scripts
│   ├── deploy.ts                # Deploy core contracts
│   └── create_launch.ts         # Create new launch
├── deployments/                  # Deployment addresses
│   ├── sepolia.json             # Core contract deployments
│   └── launches.json            # Launch registry
├── target/                       # Compiled contracts (generated)
├── Scarb.toml                   # Scarb configuration
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

## 🔧 Contract Details

### MemecoinToken

Standard ERC20 token with additional mint/burn functionality controlled by the bonding curve pool.

**Key Functions:**
- `mint(to, amount)` - Only callable by minter (pool)
- `burn(from, amount)` - Only callable by minter (pool)
- `update_minter(new_minter)` - Transfer minter role

### BondingCurvePool

Implements a linear bonding curve: `price = base_price + slope * tokens_sold`

**Key Functions:**
- `buy(amount_tokens)` - Buy tokens at current price
- `sell(amount_tokens)` - Sell tokens back to pool
- `get_current_price()` - Get current token price
- `set_migrated()` - Mark pool as migrated (disables trading)

**Price Calculation:**
- Linear curve: `current_price = base_price + (slope * tokens_sold)`
- Protocol fee deducted on buy/sell
- Fees sent to protocol treasury

### PumpFactory

Registry for all launches. Frontend can query all launches and their details.

**Key Functions:**
- `register_launch(...)` - Register a new launch
- `get_launch(launch_id)` - Get launch details
- `total_launches()` - Get total number of launches
- `mark_migrated(launch_id)` - Mark launch as migrated

### ProtocolConfig

Global protocol configuration that can be updated by owner.

**Key Functions:**
- `get_fee_config()` - Get fee percentage and receiver
- `set_fee_config(fee_bps, fee_receiver)` - Update fees (owner only)
- `get_curve_limits()` - Get allowed curve parameters
- `set_curve_limits(...)` - Update limits (owner only)

### LiquidityMigration

Stub contract for future DEX migration functionality.

**Key Functions:**
- `migrate_stub(launch_id, pool_addr)` - Mark pool as migrated (owner only)

## 🧪 Testing

Run tests (when implemented):

```bash
scarb test
```

## 🔐 Security Considerations

⚠️ **This is a hackathon PoC. For production use:**

1. Add overflow checks for all arithmetic operations
2. Implement proper access controls on migration functions
3. Add rate limiting and anti-bot measures
4. Audit bonding curve math for edge cases
5. Implement proper LP locking mechanisms
6. Add comprehensive test coverage

## 📚 Resources

- [StarkNet Documentation](https://docs.starknet.io/)
- [Cairo Book](https://book.cairo-lang.org/)
- [Scarb Documentation](https://docs.swmansion.com/scarb/)
- [StarkNet.js](https://www.starknetjs.com/)

## 🤝 Contributing

This is a hackathon project. Contributions and improvements are welcome!

## 📄 License

MIT

## 🎯 Hackathon Pitch

**StarkPump: A modular memecoin launchpad on StarkNet with bonding-curve price discovery, protocol fees, and future-proof hooks for private trading & LP migration.**

**Today:**
- ✅ ERC20 memecoins auto-minted
- ✅ Linear bonding curve per pool
- ✅ Protocol fee controlled by ProtocolConfig
- ✅ Discoverability via PumpFactory

**Tomorrow:**
- 🔮 Liquidity migration to DEX via LiquidityMigration
- 🔮 Private order relayer (off-chain)
- 🔮 Governance over ProtocolConfig (DAO)

---

Built with ❤️ for StarkNet

