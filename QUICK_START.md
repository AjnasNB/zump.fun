# Quick Start Guide 🚀

## Prerequisites Check

Before starting, ensure you have:
- ✅ Scarb installed (`scarb --version`)
- ✅ Node.js 18+ installed (`node --version`)
- ✅ StarkNet account with testnet ETH

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
# Install Node.js packages
npm install

# Verify Scarb is installed (if not, see SETUP.md)
scarb --version
```

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your details:
# - PRIVATE_KEY: Your StarkNet private key
# - ACCOUNT_ADDRESS: Your StarkNet account address
# - QUOTE_TOKEN: ETH token address (default provided)
```

### Step 3: Build Contracts

```bash
scarb build
```

Expected output: Contracts compiled to `target/dev/`

### Step 4: Deploy Core Contracts

```bash
npm run deploy
```

This deploys:
- ✅ ProtocolConfig (fee settings)
- ✅ PumpFactory (launch registry)
- ✅ LiquidityMigration (migration stub)

### Step 5: Create Your First Launch

```bash
npm run create-launch "TestCoin" "TEST" "1000000000000000" "1000000000000" "1000000000000000000000000"
```

Parameters explained:
- `"TestCoin"` - Token name
- `"TEST"` - Token symbol
- `"1000000000000000"` - Base price (0.001 ETH in wei)
- `"1000000000000"` - Slope (0.000001 ETH per token)
- `"1000000000000000000000000"` - Max supply (1M tokens)

### Step 6: Verify Launch

```bash
# Check total launches
npm run interact factory total_launches

# Get launch details
npm run interact factory get_launch 0
```

## Common Commands

```bash
# Build contracts
scarb build

# Deploy core contracts
npm run deploy

# Create new launch
npm run create-launch <name> <symbol> <basePrice> <slope> <maxSupply>

# Interact with contracts
npm run interact factory total_launches
npm run interact pool get_current_price <pool_address>

# Format code
npm run format

# Run tests (when implemented)
npm run test
```

## Next Steps

1. ✅ Contracts deployed
2. ✅ First launch created
3. 🔄 Integrate frontend
4. 🔄 Test buy/sell functionality
5. 🔄 Customize parameters

## Troubleshooting

**"Scarb not found"**
→ Install Scarb (see SETUP.md)

**"Contract not found"**
→ Run `scarb build` first

**"Deployment failed"**
→ Check account has ETH and .env is configured

**"Module not found"**
→ Run `npm install`

## Need Help?

- 📖 See `README.md` for full documentation
- 📖 See `SETUP.md` for detailed setup
- 📖 See `PROJECT_STRUCTURE.md` for architecture

---

🎉 You're ready to launch memecoins on StarkNet!

