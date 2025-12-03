# Zump.fun Testnet Deployment

## Network Information
- **Network**: Starknet Sepolia Testnet
- **RPC**: https://rpc.starknet-testnet.lava.build
- **Chain ID**: SN_SEPOLIA
- **Deployment Date**: 2025-12-03

## Deployed Contracts

### Core Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| ProtocolConfig | `0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f` | [Voyager](https://sepolia.voyager.online/contract/0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f) |
| PumpFactory | `0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814` | [Voyager](https://sepolia.voyager.online/contract/0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814) |

### Class Hashes (Declared Contracts)

| Contract | Class Hash |
|----------|------------|
| ProtocolConfig | `0x0534c30dc743f0da15549d8f1f7b7f1c76e6f65dfa7052b5fb277b5ed471ed0d` |
| MemecoinToken | `0x05760e0c93665dcbe1ee270331b7fc1624e2084d15438f6a9075a3f0dc2a885f` |
| BondingCurvePool | `0x039e341c7a61fe3ed1692a85c464b7f820d67fedafed195449ac1786347654c7` |
| PumpFactory | `0x05a7fc102bf908e819a427eda583d9aa247e3a3d31fe741998ac18f8085fee98` |
| StealthAddressGenerator | `0x03568871d6930a1800dffb51e9f180d341ac7cc436f951bfb6f1a32abd639bfe` |
| CommitmentTree | `0x04a47bd5c77a538ac436d7b4a2966c1e725786e54e7466a40c81621da90172af` |
| NullifierRegistry | `0x0482c6de7a25d10da3b9925349cc2a5f73fa2445b7b3db4e6fdd87a1fca6ea1e` |
| ZKProofVerifier | `0x010fa2ba1e52412addfd0fdc5e3b9054498ec124654aa22522c815ee6595fc78` |
| DarkPoolMixer | `0x073f391fac86d27049af4f2a7253c9d8277829c44837493dd6444d9d55ac580b` |
| PrivacyRelayer | `0x07f0ea59304589e6c802f9b69f4820d5e6a8dbef84e184a8460ce2b125fa28dc` |
| EncryptedStateManager | `0x04be0fd2de378f92618b47d471bcfa5a168efc1ee24cece8fe6eac289ffbe3fe` |
| LiquidityMigration | `0x07447cd3a9b559ca301d22104446bbd4af82238de4d8a9a780aacba5f914ef32` |
| ZkDexHook | `0x02eaf378c05581ed5294168d2c7ec49a0473c82c60a94c0179e84fa0ba8fb165` |

### Token Addresses

| Token | Address |
|-------|---------|
| STRK (Quote Token) | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| ETH | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |

## Deployment Account

- **Address**: `0x039d367513530e4ae9851569c73994fabbfebeb08e2609c161756fc88b388046`
- **Type**: OpenZeppelin Account

## Transaction Hashes

| Action | Transaction Hash |
|--------|------------------|
| Account Deploy | `0x03265b114ea05f92ded739241d37002945507290c752c2fd6e565f81de5ce223` |
| ProtocolConfig Deploy | `0x04cff1ed0f9ca1fe989616ec4f74da8bbb3d61fce3e039091afda301889e71c1` |
| PumpFactory Deploy | `0x04d2f49356441646b086458c1ff08cc5a2748e935dca52bb43d3c0e1368b1b49` |
| Set Protocol Config | `0x00270adc243f2f17435efc8574f179759d56cad5f8f1fa972a39d90895147a9d` |
| Set Quote Token | `0x030adcbe99eb23493acd1f176407ed9c7ef3f3afc50022d8a98928549deedd64` |

## Frontend Configuration

Update `zump-frontend/src/config/contracts.ts` with the deployed addresses:

```typescript
const SEPOLIA_CONFIG: ContractConfig = {
  addresses: {
    pumpFactory: '0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814',
    protocolConfig: '0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f',
    quoteToken: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    // Privacy contracts not deployed for MVP
    stealthAddressGenerator: '0x0',
    nullifierRegistry: '0x0',
    zkProofVerifier: '0x0',
  },
  rpcUrl: 'https://rpc.starknet-testnet.lava.build',
  explorerUrl: 'https://sepolia.voyager.online',
  chainId: 'SN_SEPOLIA',
};
```

## Environment Variables

Create a `.env` file in `zump-frontend/`:

```bash
# Starknet Configuration
REACT_APP_STARKNET_NETWORK=sepolia
REACT_APP_STARKNET_RPC_URL=https://rpc.starknet-testnet.lava.build

# Contract Addresses
REACT_APP_PUMP_FACTORY_ADDRESS=0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814
REACT_APP_PROTOCOL_CONFIG_ADDRESS=0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f
REACT_APP_QUOTE_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

# Supabase (configure after setup)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Common Issues

1. **RPC Rate Limiting**
   - Use alternative RPC: `https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Or create free account at Infura/Alchemy

2. **Insufficient Balance**
   - Get testnet STRK from: https://starknet-faucet.vercel.app/
   - Account needs ~0.01 STRK for deployment

3. **Invalid Nonce Error**
   - Wait a few seconds between transactions
   - Network may be congested

4. **CASM Hash Mismatch**
   - Use `--casm-hash` flag with the expected hash from error message
   - This happens when network has different compiler version

## Re-deployment Guide

To redeploy contracts:

```bash
# Set environment
$env:STARKNET_RPC = "https://rpc.starknet-testnet.lava.build"

# Build contracts
.\scarb.exe build

# Declare (if class hash changed)
starkli declare target/dev/pump_fun_CONTRACT.contract_class.json --keystore $env:USERPROFILE\.starkli-wallets\deployer\keystore.json --account $env:USERPROFILE\.starkli-wallets\deployer\account.json --keystore-password "YOUR_PASSWORD"

# Deploy
starkli deploy CLASS_HASH CONSTRUCTOR_ARGS --keystore $env:USERPROFILE\.starkli-wallets\deployer\keystore.json --account $env:USERPROFILE\.starkli-wallets\deployer\account.json --keystore-password "YOUR_PASSWORD"
```

## Verification

Verify deployment by calling view functions:

```bash
# Check ProtocolConfig owner
starkli call 0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f get_owner --rpc https://rpc.starknet-testnet.lava.build

# Check PumpFactory owner  
starkli call 0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814 owner --rpc https://rpc.starknet-testnet.lava.build
```

