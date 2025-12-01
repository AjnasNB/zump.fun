# Build and Deploy Instructions

## Step 1: Install Scarb

**You need to install Scarb first before building.** 

See `INSTALL_SCARB.md` for detailed installation instructions.

Quick method:
1. Download from: https://github.com/software-mansion/scarb/releases
2. Get the latest `scarb-x86_64-pc-windows-msvc.zip`
3. Extract and add `scarb.exe` to your PATH

Verify installation:
```bash
scarb --version
```

## Step 2: Build Contracts

Once Scarb is installed, run:

```bash
scarb build
```

This will compile all Cairo contracts to:
- `target/dev/*.sierra.json` (Sierra IR)
- `target/dev/*.casm.json` (CASM assembly)

## Step 3: Configure Environment

Make sure your `.env` file is set up:

```env
NETWORK=sepolia
RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
PRIVATE_KEY=your_private_key_here
ACCOUNT_ADDRESS=your_account_address_here
QUOTE_TOKEN=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
```

## Step 4: Install Node Dependencies

```bash
npm install
```

## Step 5: Deploy Core Contracts

```bash
npm run deploy
```

This deploys:
- ProtocolConfig
- PumpFactory
- LiquidityMigration

Deployment addresses saved to `deployments/sepolia.json`

## Step 6: Create Your First Launch

```bash
npm run create-launch "MyToken" "MTK" "1000000000000000" "1000000000000" "1000000000000000000000000"
```

## Troubleshooting

**"Scarb not found"**
→ Install Scarb (see INSTALL_SCARB.md)

**"Contract not found"**
→ Run `scarb build` first

**"Deployment failed"**
→ Check your account has ETH and .env is correct

**"Module not found"**
→ Run `npm install`

