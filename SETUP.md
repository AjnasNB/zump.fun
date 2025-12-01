# Setup Guide

## Quick Start

### 1. Install Dependencies

**Install Scarb (Cairo Package Manager):**

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Windows (using Scoop)
scoop install scarb

# Or download from: https://github.com/software-mansion/scarb/releases
```

**Install Node.js dependencies:**
```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your StarkNet account details:
```env
NETWORK=sepolia
RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
PRIVATE_KEY=your_private_key_here
ACCOUNT_ADDRESS=your_account_address_here
QUOTE_TOKEN=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
```

### 3. Build Contracts

```bash
scarb build
```

This compiles all Cairo contracts. You should see output in `target/dev/` directory.

### 4. Deploy Core Contracts

Deploy the protocol contracts:
```bash
npm run deploy
```

This deploys:
- ProtocolConfig
- PumpFactory  
- LiquidityMigration

Deployment addresses are saved to `deployments/{NETWORK}.json`.

### 5. Create Your First Launch

```bash
npm run create-launch "MyToken" "MTK" "1000000000000000" "1000000000000" "1000000000000000000000000"
```

Parameters:
- Name: "MyToken"
- Symbol: "MTK"
- Base Price: 1000000000000000 (0.001 ETH in wei)
- Slope: 1000000000000 (0.000001 ETH per token)
- Max Supply: 1000000000000000000000000 (1M tokens with 18 decimals)

### 6. Interact with Contracts

Query factory:
```bash
npm run interact factory total_launches
```

Get launch info:
```bash
npm run interact factory get_launch 0
```

Get pool price:
```bash
npm run interact pool get_current_price <pool_address>
```

## Common Issues

### Scarb not found
- Make sure Scarb is installed and in your PATH
- Restart your terminal after installation

### Build errors
- Ensure you're using Scarb 2.3.0 or later
- Check that all contract files are in `src/` directory

### Deployment errors
- Verify your account has testnet ETH
- Check RPC URL is correct for your network
- Ensure private key and account address match

### Contract not found errors
- Run `scarb build` before deploying
- Check that compiled files exist in `target/dev/`

## Next Steps

1. **Test the contracts** - Create a launch and try buying/selling tokens
2. **Integrate frontend** - Connect your frontend to the deployed contracts
3. **Customize parameters** - Adjust fees, curve parameters, etc.
4. **Add features** - Implement additional functionality as needed

## Network Addresses

### Sepolia Testnet
- ETH Token: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`

### Mainnet (when ready)
- Update QUOTE_TOKEN in .env with mainnet ETH address

