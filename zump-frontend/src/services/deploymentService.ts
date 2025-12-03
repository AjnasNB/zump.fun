/**
 * Deployment Service
 * Handles real contract deployment for token launches
 * Deploys MemecoinToken and BondingCurvePool, then registers with PumpFactory
 */

import { Account, Contract, CallData, hash, stark, RpcProvider } from 'starknet';
import { getContractConfig, getContractAddresses } from '../config/contracts';
import { PUMP_FACTORY_ABI } from '../abi';

// Class hashes from deployment (these are declared on Sepolia)
const CLASS_HASHES = {
  MemecoinToken: '0x05760e0c93665dcbe1ee270331b7fc1624e2084d15438f6a9075a3f0dc2a885f',
  BondingCurvePool: '0x039e341c7a61fe3ed1692a85c464b7f820d67fedafed195449ac1786347654c7',
};

export interface DeployTokenParams {
  name: string;
  symbol: string;
  maxSupply: bigint;
  owner: string;
}

export interface DeployPoolParams {
  tokenAddress: string;
  quoteTokenAddress: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  owner: string;
}

export interface LaunchDeploymentResult {
  tokenAddress: string;
  poolAddress: string;
  launchId: bigint;
  tokenDeployTx: string;
  poolDeployTx: string;
  registerTx: string;
}

/**
 * Deploy a new MemecoinToken contract
 */
export async function deployMemecoinToken(
  account: Account,
  params: DeployTokenParams
): Promise<{ address: string; transactionHash: string }> {
  const { name, symbol, maxSupply, owner } = params;
  
  // Unique salt for deployment
  const salt = stark.randomAddress();
  
  // Constructor calldata for MemecoinToken
  // constructor(name: felt252, symbol: felt252, max_supply: u256, owner: ContractAddress)
  const constructorCalldata = CallData.compile({
    name: stark.encodeShortString(name.slice(0, 31)),
    symbol: stark.encodeShortString(symbol.slice(0, 31)),
    max_supply: { low: maxSupply & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: maxSupply >> BigInt(128) },
    owner,
  });
  
  // Calculate future contract address
  const contractAddress = hash.calculateContractAddressFromHash(
    salt,
    CLASS_HASHES.MemecoinToken,
    constructorCalldata,
    0
  );
  
  // Deploy the contract
  const { transaction_hash } = await account.deployContract({
    classHash: CLASS_HASHES.MemecoinToken,
    constructorCalldata,
    salt,
  });
  
  // Wait for transaction
  await account.waitForTransaction(transaction_hash);
  
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
  const { tokenAddress, quoteTokenAddress, basePrice, slope, maxSupply, owner } = params;
  
  // Unique salt for deployment
  const salt = stark.randomAddress();
  
  // Constructor calldata for BondingCurvePool
  // constructor(token: ContractAddress, quote_token: ContractAddress, base_price: u256, slope: u256, max_supply: u256, owner: ContractAddress)
  const constructorCalldata = CallData.compile({
    token: tokenAddress,
    quote_token: quoteTokenAddress,
    base_price: { low: basePrice & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: basePrice >> BigInt(128) },
    slope: { low: slope & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: slope >> BigInt(128) },
    max_supply: { low: maxSupply & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: maxSupply >> BigInt(128) },
    owner,
  });
  
  // Calculate future contract address
  const contractAddress = hash.calculateContractAddressFromHash(
    salt,
    CLASS_HASHES.BondingCurvePool,
    constructorCalldata,
    0
  );
  
  // Deploy the contract
  const { transaction_hash } = await account.deployContract({
    classHash: CLASS_HASHES.BondingCurvePool,
    constructorCalldata,
    salt,
  });
  
  // Wait for transaction
  await account.waitForTransaction(transaction_hash);
  
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
    stark.encodeShortString(params.name.slice(0, 31)),
    stark.encodeShortString(params.symbol.slice(0, 31)),
    { low: params.basePrice & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: params.basePrice >> BigInt(128) },
    { low: params.slope & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: params.slope >> BigInt(128) },
    { low: params.maxSupply & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: params.maxSupply >> BigInt(128) },
    params.stealthCreator,
    { low: params.migrationThreshold & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), high: params.migrationThreshold >> BigInt(128) },
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
 * Full launch deployment: Deploy token, pool, and register with factory
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
  
  // Step 1: Deploy Token
  const tokenResult = await deployMemecoinToken(account, {
    name: params.name,
    symbol: params.symbol,
    maxSupply: params.maxSupply,
    owner: ownerAddress,
  });
  
  onProgress?.('deploying_pool', `Token deployed at ${tokenResult.address}. Deploying BondingCurvePool...`);
  
  // Step 2: Deploy Pool
  const poolResult = await deployBondingCurvePool(account, {
    tokenAddress: tokenResult.address,
    quoteTokenAddress: addresses.quoteToken,
    basePrice: params.basePrice,
    slope: params.slope,
    maxSupply: params.maxSupply,
    owner: ownerAddress,
  });
  
  onProgress?.('registering', `Pool deployed at ${poolResult.address}. Registering with PumpFactory...`);
  
  // Step 3: Register with Factory
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

