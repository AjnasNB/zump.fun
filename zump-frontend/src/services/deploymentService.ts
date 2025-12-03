/**
 * Deployment Service
 * Handles real contract deployment for token launches
 * Deploys MemecoinToken and BondingCurvePool, then registers with PumpFactory
 */

import { Account, Contract, CallData, shortString, RpcProvider, cairo } from 'starknet';
import { getContractConfig, getContractAddresses } from '../config/contracts';
import { PUMP_FACTORY_ABI, MEMECOIN_TOKEN_ABI } from '../abi';

// Class hashes from deployment (these are declared on Sepolia)
const CLASS_HASHES = {
  MemecoinToken: '0x05760e0c93665dcbe1ee270331b7fc1624e2084d15438f6a9075a3f0dc2a885f',
  BondingCurvePool: '0x039e341c7a61fe3ed1692a85c464b7f820d67fedafed195449ac1786347654c7',
};

export interface DeployTokenParams {
  name: string;
  symbol: string;
  decimals?: number;  // Default 18
  initialMinter: string;  // Pool will be the minter
}

export interface DeployPoolParams {
  tokenAddress: string;
  quoteTokenAddress: string;
  creator: string;
  protocolConfig: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
}

export interface LaunchDeploymentResult {
  tokenAddress: string;
  poolAddress: string;
  launchId: bigint;
  tokenDeployTx: string;
  poolDeployTx: string;
  registerTx: string;
}

// Universal Deployer Contract address on Starknet
const UDC_ADDRESS = '0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf';

/**
 * Extract deployed contract address from transaction receipt
 */
function extractDeployedAddress(receipt: any): string | null {
  console.log('Parsing deployment receipt:', JSON.stringify(receipt, null, 2));
  
  // Method 1: Check events array
  const events = receipt.events || [];
  for (const event of events) {
    // UDC ContractDeployed event has deployed address in keys[1] or data[0]
    const fromAddr = event.from_address?.toLowerCase?.() || '';
    if (fromAddr.includes('41a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf')) {
      console.log('Found UDC event:', event);
      // Try keys first (address is usually keys[1])
      if (event.keys && event.keys.length > 1) {
        return event.keys[1];
      }
      // Then try data
      if (event.data && event.data.length > 0) {
        return event.data[0];
      }
    }
  }
  
  // Method 2: Check contract_address in receipt directly
  if (receipt.contract_address) {
    return receipt.contract_address;
  }
  
  // Method 3: Check deploy_transaction_receipts
  if (receipt.deploy_transaction_receipts?.[0]?.contract_address) {
    return receipt.deploy_transaction_receipts[0].contract_address;
  }
  
  return null;
}

/**
 * Deploy a new MemecoinToken contract
 */
export async function deployMemecoinToken(
  account: Account,
  params: DeployTokenParams
): Promise<{ address: string; transactionHash: string }> {
  const { name, symbol, decimals = 18, initialMinter } = params;
  
  // Constructor calldata for MemecoinToken
  const constructorCalldata = [
    shortString.encodeShortString(name.slice(0, 31)),
    shortString.encodeShortString(symbol.slice(0, 31)),
    decimals.toString(),
    initialMinter,
  ];
  
  // Generate unique salt
  const salt = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  
  // Deploy via UDC
  const deployCall = {
    contractAddress: UDC_ADDRESS,
    entrypoint: 'deployContract',
    calldata: CallData.compile({
      classHash: CLASS_HASHES.MemecoinToken,
      salt,
      unique: 1,
      calldata: constructorCalldata,
    }),
  };
  
  console.log('Deploying MemecoinToken with call:', deployCall);
  
  const { transaction_hash } = await account.execute(deployCall);
  console.log('Token deploy tx hash:', transaction_hash);
  
  // Wait for transaction
  const receipt = await account.waitForTransaction(transaction_hash);
  
  // Extract contract address
  const contractAddress = extractDeployedAddress(receipt);
  
  if (!contractAddress) {
    console.error('Receipt without contract address:', receipt);
    throw new Error(`Failed to get contract address. Check console for receipt details. TX: ${transaction_hash}`);
  }
  
  console.log('Token deployed at:', contractAddress);
  
  return {
    address: contractAddress,
    transactionHash: transaction_hash,
  };
}

/**
 * Deploy a new BondingCurvePool contract
 */
export async function deployBondingCurvePool(
  account: Account,
  params: DeployPoolParams
): Promise<{ address: string; transactionHash: string }> {
  const { tokenAddress, quoteTokenAddress, creator, protocolConfig, basePrice, slope, maxSupply } = params;
  
  // Constructor calldata for BondingCurvePool
  const uint256BasePrice = cairo.uint256(basePrice);
  const uint256Slope = cairo.uint256(slope);
  const uint256MaxSupply = cairo.uint256(maxSupply);
  
  const constructorCalldata = [
    tokenAddress,
    quoteTokenAddress,
    creator,
    protocolConfig,
    uint256BasePrice.low.toString(),
    uint256BasePrice.high.toString(),
    uint256Slope.low.toString(),
    uint256Slope.high.toString(),
    uint256MaxSupply.low.toString(),
    uint256MaxSupply.high.toString(),
  ];
  
  // Generate unique salt
  const salt = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  
  // Deploy via UDC
  const deployCall = {
    contractAddress: UDC_ADDRESS,
    entrypoint: 'deployContract',
    calldata: CallData.compile({
      classHash: CLASS_HASHES.BondingCurvePool,
      salt,
      unique: 1,
      calldata: constructorCalldata,
    }),
  };
  
  console.log('Deploying BondingCurvePool with call:', deployCall);
  
  const { transaction_hash } = await account.execute(deployCall);
  console.log('Pool deploy tx hash:', transaction_hash);
  
  // Wait for transaction
  const receipt = await account.waitForTransaction(transaction_hash);
  
  // Extract contract address
  const contractAddress = extractDeployedAddress(receipt);
  
  if (!contractAddress) {
    console.error('Pool receipt without contract address:', receipt);
    throw new Error(`Failed to get pool contract address. TX: ${transaction_hash}`);
  }
  
  console.log('Pool deployed at:', contractAddress);
  
  return {
    address: contractAddress,
    transactionHash: transaction_hash,
  };
}

/**
 * Register a launch with PumpFactory using register_anonymous_launch
 */
export async function registerLaunchWithFactory(
  account: Account,
  params: {
    tokenAddress: string;
    poolAddress: string;
    quoteTokenAddress: string;
    name: string;
    symbol: string;
    basePrice: bigint;
    slope: bigint;
    maxSupply: bigint;
    stealthCreator: string;
    migrationThreshold: bigint;
  }
): Promise<{ launchId: bigint; transactionHash: string }> {
  const addresses = getContractAddresses();
  const config = getContractConfig();
  
  const factoryContract = new Contract(
    PUMP_FACTORY_ABI,
    addresses.pumpFactory,
    account
  );
  
  // Call register_anonymous_launch
  const { transaction_hash } = await factoryContract.invoke('register_anonymous_launch', [
    params.tokenAddress,
    params.poolAddress,
    params.quoteTokenAddress,
    shortString.encodeShortString(params.name.slice(0, 31)),
    shortString.encodeShortString(params.symbol.slice(0, 31)),
    cairo.uint256(params.basePrice),
    cairo.uint256(params.slope),
    cairo.uint256(params.maxSupply),
    params.stealthCreator,
    cairo.uint256(params.migrationThreshold),
  ]);
  
  // Wait for transaction and get receipt
  const receipt = await account.waitForTransaction(transaction_hash);
  
  // Parse launch ID from events (simplified - in production parse properly)
  // For now, query total_launches to get the ID
  const provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  const factoryRead = new Contract(PUMP_FACTORY_ABI, addresses.pumpFactory, provider);
  const totalLaunches = await factoryRead.call('total_launches');
  const launchId = BigInt(totalLaunches.toString()) - BigInt(1);
  
  return {
    launchId,
    transactionHash: transaction_hash,
  };
}

/**
 * Update token minter to pool address
 */
async function updateTokenMinter(
  account: Account,
  tokenAddress: string,
  newMinter: string
): Promise<string> {
  const tokenContract = new Contract(
    MEMECOIN_TOKEN_ABI,
    tokenAddress,
    account
  );
  
  const { transaction_hash } = await tokenContract.invoke('update_minter', [newMinter]);
  await account.waitForTransaction(transaction_hash);
  
  return transaction_hash;
}

/**
 * Full launch deployment: Deploy token, pool, update minter, and register with factory
 */
export async function deployFullLaunch(
  account: Account,
  params: {
    name: string;
    symbol: string;
    basePrice: bigint;
    slope: bigint;
    maxSupply: bigint;
    migrationThreshold: bigint;
    stealthCreator?: string;
  },
  onProgress?: (step: string, details?: string) => void
): Promise<LaunchDeploymentResult> {
  const addresses = getContractAddresses();
  const ownerAddress = account.address;
  const stealthCreator = params.stealthCreator || ownerAddress;
  
  onProgress?.('deploying_token', 'Deploying MemecoinToken contract...');
  
  // Step 1: Deploy Token (minter = owner initially)
  const tokenResult = await deployMemecoinToken(account, {
    name: params.name,
    symbol: params.symbol,
    decimals: 18,
    initialMinter: ownerAddress, // Will be updated to pool after pool deployment
  });
  
  onProgress?.('deploying_pool', `Token deployed at ${tokenResult.address}. Deploying BondingCurvePool...`);
  
  // Step 2: Deploy Pool
  const poolResult = await deployBondingCurvePool(account, {
    tokenAddress: tokenResult.address,
    quoteTokenAddress: addresses.quoteToken,
    creator: stealthCreator,
    protocolConfig: addresses.protocolConfig,
    basePrice: params.basePrice,
    slope: params.slope,
    maxSupply: params.maxSupply,
  });
  
  onProgress?.('updating_minter', `Pool deployed at ${poolResult.address}. Updating token minter...`);
  
  // Step 3: Update token minter to pool
  await updateTokenMinter(account, tokenResult.address, poolResult.address);
  
  onProgress?.('registering', 'Registering with PumpFactory...');
  
  // Step 4: Register with Factory
  const registerResult = await registerLaunchWithFactory(account, {
    tokenAddress: tokenResult.address,
    poolAddress: poolResult.address,
    quoteTokenAddress: addresses.quoteToken,
    name: params.name,
    symbol: params.symbol,
    basePrice: params.basePrice,
    slope: params.slope,
    maxSupply: params.maxSupply,
    stealthCreator,
    migrationThreshold: params.migrationThreshold,
  });
  
  onProgress?.('complete', `Launch registered with ID ${registerResult.launchId}`);
  
  return {
    tokenAddress: tokenResult.address,
    poolAddress: poolResult.address,
    launchId: registerResult.launchId,
    tokenDeployTx: tokenResult.transactionHash,
    poolDeployTx: poolResult.transactionHash,
    registerTx: registerResult.transactionHash,
  };
}

export default {
  deployMemecoinToken,
  deployBondingCurvePool,
  registerLaunchWithFactory,
  deployFullLaunch,
  CLASS_HASHES,
};


