/**
 * Contract Service
 * Centralized service for interacting with Starknet contracts
 * Requirements: 1.2, 1.3, 1.4
 */

import { Contract, Account, RpcProvider, CallData, cairo, shortString } from 'starknet';
import { 
  PUMP_FACTORY_ABI, 
  BONDING_CURVE_POOL_ABI, 
  MEMECOIN_TOKEN_ABI,
  STEALTH_ADDRESS_GENERATOR_ABI,
  NULLIFIER_REGISTRY_ABI,
  COMMITMENT_TREE_ABI,
  DARK_POOL_MIXER_ABI,
  PRIVACY_RELAYER_ABI,
} from '../abi';
import { getContractConfig, getContractAddresses, isValidContractAddress, NetworkId } from '../config/contracts';

// ============================================================================
// Types
// ============================================================================

export interface LaunchParams {
  name: string;
  symbol: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  stealthCreator: string;
  migrationThreshold: bigint;
}

export interface LaunchResult {
  transactionHash: string;
  tokenAddress: string;
  poolAddress: string;
  launchId: bigint;
}

export interface PoolState {
  token: string;
  quoteToken: string;
  tokensSold: bigint;
  reserveBalance: bigint;
  migrated: boolean;
}

export interface PoolConfig {
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
}

export interface PublicLaunchInfo {
  token: string;
  pool: string;
  quoteToken: string;
  name: string;
  symbol: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  createdAt: bigint;
  migrated: boolean;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  error?: string;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

// ============================================================================
// Contract Service Class
// ============================================================================

export class ContractService {
  private provider: RpcProvider;

  private account: Account | null = null;

  private network: NetworkId;

  private pumpFactoryContract: Contract | null = null;

  private stealthGeneratorContract: Contract | null = null;

  private nullifierRegistryContract: Contract | null = null;

  private commitmentTreeContract: Contract | null = null;

  private darkPoolMixerContract: Contract | null = null;

  private privacyRelayerContract: Contract | null = null;

  constructor(network?: NetworkId) {
    this.network = network || 'sepolia';
    const config = getContractConfig(this.network);
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  }

  // =========================================================================
  // Account Management
  // =========================================================================

  /**
   * Set the connected account for transactions
   * Requirements: 1.2
   */
  setAccount(account: Account): void {
    this.account = account;
    // Reset cached contracts when account changes
    this.pumpFactoryContract = null;
    this.stealthGeneratorContract = null;
    this.nullifierRegistryContract = null;
    this.commitmentTreeContract = null;
    this.darkPoolMixerContract = null;
    this.privacyRelayerContract = null;
  }

  /**
   * Get the current account
   */
  getAccount(): Account | null {
    return this.account;
  }

  /**
   * Check if an account is connected
   */
  isConnected(): boolean {
    return this.account !== null;
  }

  // =========================================================================
  // Contract Instance Creation
  // =========================================================================

  /**
   * Get PumpFactory contract instance
   * Requirements: 1.3
   */
  getPumpFactoryContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.pumpFactory)) {
      throw new Error('PumpFactory contract address not configured');
    }

    if (!this.pumpFactoryContract) {
      this.pumpFactoryContract = new Contract(
        PUMP_FACTORY_ABI,
        addresses.pumpFactory,
        this.account || this.provider
      );
    }

    return this.pumpFactoryContract;
  }

  /**
   * Get BondingCurvePool contract instance for a specific pool
   * Requirements: 1.3
   */
  getBondingCurvePoolContract(poolAddress: string): Contract {
    if (!isValidContractAddress(poolAddress)) {
      throw new Error('Invalid pool address');
    }

    return new Contract(
      BONDING_CURVE_POOL_ABI,
      poolAddress,
      this.account || this.provider
    );
  }

  /**
   * Get MemecoinToken contract instance for a specific token
   * Requirements: 1.3
   */
  getTokenContract(tokenAddress: string): Contract {
    if (!isValidContractAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }

    return new Contract(
      MEMECOIN_TOKEN_ABI,
      tokenAddress,
      this.account || this.provider
    );
  }

  // =========================================================================
  // Privacy Contract Instances
  // =========================================================================

  /**
   * Get StealthAddressGenerator contract instance
   */
  getStealthGeneratorContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.stealthAddressGenerator)) {
      throw new Error('StealthAddressGenerator contract address not configured');
    }

    if (!this.stealthGeneratorContract) {
      this.stealthGeneratorContract = new Contract(
        STEALTH_ADDRESS_GENERATOR_ABI,
        addresses.stealthAddressGenerator,
        this.account || this.provider
      );
    }

    return this.stealthGeneratorContract;
  }

  /**
   * Get NullifierRegistry contract instance
   */
  getNullifierRegistryContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.nullifierRegistry)) {
      throw new Error('NullifierRegistry contract address not configured');
    }

    if (!this.nullifierRegistryContract) {
      this.nullifierRegistryContract = new Contract(
        NULLIFIER_REGISTRY_ABI,
        addresses.nullifierRegistry,
        this.account || this.provider
      );
    }

    return this.nullifierRegistryContract;
  }

  /**
   * Get CommitmentTree contract instance
   */
  getCommitmentTreeContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.commitmentTree)) {
      throw new Error('CommitmentTree contract address not configured');
    }

    if (!this.commitmentTreeContract) {
      this.commitmentTreeContract = new Contract(
        COMMITMENT_TREE_ABI,
        addresses.commitmentTree,
        this.account || this.provider
      );
    }

    return this.commitmentTreeContract;
  }

  /**
   * Get DarkPoolMixer contract instance
   */
  getDarkPoolMixerContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.darkPoolMixer)) {
      throw new Error('DarkPoolMixer contract address not configured');
    }

    if (!this.darkPoolMixerContract) {
      this.darkPoolMixerContract = new Contract(
        DARK_POOL_MIXER_ABI,
        addresses.darkPoolMixer,
        this.account || this.provider
      );
    }

    return this.darkPoolMixerContract;
  }

  /**
   * Get PrivacyRelayer contract instance
   */
  getPrivacyRelayerContract(): Contract {
    const addresses = getContractAddresses(this.network);
    
    if (!isValidContractAddress(addresses.privacyRelayer)) {
      throw new Error('PrivacyRelayer contract address not configured');
    }

    if (!this.privacyRelayerContract) {
      this.privacyRelayerContract = new Contract(
        PRIVACY_RELAYER_ABI,
        addresses.privacyRelayer,
        this.account || this.provider
      );
    }

    return this.privacyRelayerContract;
  }

  // =========================================================================
  // Stealth Address Methods
  // =========================================================================

  /**
   * Generate a fresh stealth address via contract
   */
  async generateFreshStealthAddress(): Promise<{ address: string; txHash: string }> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const stealth = this.getStealthGeneratorContract();
    const tx = await stealth.invoke('generate_fresh_stealth', []);
    
    const receipt = await this.waitForTransaction(tx.transaction_hash);
    
    // Extract stealth address from events
    const stealthAddress = this.extractStealthAddressFromReceipt(receipt);
    
    return {
      address: stealthAddress || '0x0',
      txHash: tx.transaction_hash,
    };
  }

  /**
   * Generate stealth address with full parameters
   */
  async generateStealthAddress(
    spendingPubkey: string,
    viewingPubkey: string,
    ephemeralRandom: string
  ): Promise<{ address: string; viewTag: string; ephemeralPubkey: string; txHash: string }> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const stealth = this.getStealthGeneratorContract();
    const tx = await stealth.invoke('generate_stealth_address', [
      spendingPubkey,
      viewingPubkey,
      ephemeralRandom,
    ]);
    
    const receipt = await this.waitForTransaction(tx.transaction_hash);
    
    // Extract data from events
    const eventData = this.extractStealthGeneratedEvent(receipt);
    
    return {
      address: eventData?.stealthAddress || '0x0',
      viewTag: eventData?.viewTag || '0x0',
      ephemeralPubkey: eventData?.ephemeralPubkey || '0x0',
      txHash: tx.transaction_hash,
    };
  }

  /**
   * Check if an address is a valid stealth address
   */
  async isValidStealthAddress(address: string): Promise<boolean> {
    const stealth = this.getStealthGeneratorContract();
    const result = await stealth.call('is_valid_stealth', [address]);
    return Boolean(result);
  }

  /**
   * Get stealth address by view tag
   */
  async getStealthByViewTag(viewTag: string): Promise<string> {
    const stealth = this.getStealthGeneratorContract();
    const result = await stealth.call('get_stealth_by_view_tag', [viewTag]);
    return result?.toString() || '0x0';
  }

  // =========================================================================
  // Nullifier Registry Methods
  // =========================================================================

  /**
   * Check if a nullifier is spent
   */
  async isNullifierSpent(nullifier: string): Promise<boolean> {
    const registry = this.getNullifierRegistryContract();
    const result = await registry.call('is_spent', [nullifier]);
    return Boolean(result);
  }

  /**
   * Get total spent nullifiers count
   */
  async getTotalSpentNullifiers(): Promise<bigint> {
    const registry = this.getNullifierRegistryContract();
    const result = await registry.call('get_total_spent');
    return this.parseU256(result);
  }

  // =========================================================================
  // Commitment Tree Methods
  // =========================================================================

  /**
   * Get current Merkle root
   */
  async getCurrentMerkleRoot(): Promise<string> {
    const tree = this.getCommitmentTreeContract();
    const result = await tree.call('get_current_root');
    return result?.toString() || '0x0';
  }

  /**
   * Get total leaf count in tree
   */
  async getMerkleTreeLeafCount(): Promise<bigint> {
    const tree = this.getCommitmentTreeContract();
    const result = await tree.call('get_leaf_count');
    return this.parseU256(result);
  }

  /**
   * Verify a Merkle proof
   */
  async verifyMerkleProof(
    leaf: string,
    leafIndex: bigint,
    proof: string[],
    root: string
  ): Promise<boolean> {
    const tree = this.getCommitmentTreeContract();
    const result = await tree.call('verify_proof', [
      leaf,
      cairo.uint256(leafIndex),
      proof,
      root,
    ]);
    return Boolean(result);
  }

  // =========================================================================
  // DarkPool Mixer Methods
  // =========================================================================

  /**
   * Get DarkPool mixer fee (in basis points)
   */
  async getMixerFee(): Promise<bigint> {
    const mixer = this.getDarkPoolMixerContract();
    const result = await mixer.call('get_fee_bps');
    return this.parseU256(result);
  }

  /**
   * Get amount after fee deduction
   */
  async getAmountAfterFee(amount: bigint): Promise<bigint> {
    const mixer = this.getDarkPoolMixerContract();
    const result = await mixer.call('get_amount_after_fee', [cairo.uint256(amount)]);
    return this.parseU256(result);
  }

  /**
   * Check if a token is supported by the mixer
   */
  async isTokenSupportedByMixer(tokenAddress: string): Promise<boolean> {
    const mixer = this.getDarkPoolMixerContract();
    const result = await mixer.call('is_token_supported', [tokenAddress]);
    return Boolean(result);
  }

  /**
   * Get mixer deposit limits
   */
  async getMixerLimits(): Promise<{ min: bigint; max: bigint }> {
    const mixer = this.getDarkPoolMixerContract();
    const [min, max] = await Promise.all([
      mixer.call('get_min_deposit'),
      mixer.call('get_max_deposit'),
    ]);
    return {
      min: this.parseU256(min),
      max: this.parseU256(max),
    };
  }

  // =========================================================================
  // Helper Methods for Privacy Events
  // =========================================================================

  /**
   * Extract stealth address from receipt events
   */
  private extractStealthAddressFromReceipt(receipt: any): string | null {
    try {
      const events = receipt.events || [];
      const event = events.find((e: any) => e.keys && e.data);
      if (event && event.data && event.data[0]) {
        return event.data[0].toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract StealthAddressGenerated event data
   */
  private extractStealthGeneratedEvent(receipt: any): {
    stealthAddress: string;
    viewTag: string;
    ephemeralPubkey: string;
  } | null {
    try {
      const events = receipt.events || [];
      const event = events.find((e: any) => e.keys && e.data);
      if (event && event.data) {
        return {
          stealthAddress: event.data[0]?.toString() || '0x0',
          viewTag: event.data[1]?.toString() || '0x0',
          ephemeralPubkey: event.data[2]?.toString() || '0x0',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // PumpFactory Methods
  // =========================================================================

  /**
   * Create a new token launch
   * Requirements: 2.1
   */
  async createLaunch(params: LaunchParams): Promise<LaunchResult> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const factory = this.getPumpFactoryContract();
    
    // Convert string to felt252 for name and symbol
    const nameAsFelt = shortString.encodeShortString(params.name);
    const symbolAsFelt = shortString.encodeShortString(params.symbol);

    const calldata = CallData.compile({
      name: nameAsFelt,
      symbol: symbolAsFelt,
      base_price: cairo.uint256(params.basePrice),
      slope: cairo.uint256(params.slope),
      max_supply: cairo.uint256(params.maxSupply),
      stealth_creator: params.stealthCreator,
      migration_threshold: cairo.uint256(params.migrationThreshold),
    });

    const tx = await factory.invoke('create_launch', calldata);
    
    // Wait for transaction confirmation
    const receipt = await this.waitForTransaction(tx.transaction_hash);
    
    // Extract addresses from events (LaunchCreated event)
    const launchEvent = this.extractLaunchCreatedEvent(receipt);
    
    return {
      transactionHash: tx.transaction_hash,
      tokenAddress: launchEvent?.token || '0x0',
      poolAddress: launchEvent?.pool || '0x0',
      launchId: launchEvent?.launchId || BigInt(0),
    };
  }

  /**
   * Check if address is a valid deployed contract (not a mock)
   */
  private isValidDeployedAddress(address: string): boolean {
    if (!address || address === '0x0') return false;
    
    // Convert to BigInt to check if it's a mock address (small numbers like 1000-9999)
    try {
      const addrBigInt = BigInt(address);
      // Mock addresses are small numbers, real addresses are much larger
      // A real Starknet address should be at least 40+ hex chars (160+ bits)
      if (addrBigInt < BigInt('0x10000000000000000')) {
        console.warn(`Skipping mock address: ${address}`);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all launches from PumpFactory
   * Requirements: 3.1
   */
  async getAllLaunches(): Promise<PublicLaunchInfo[]> {
    const factory = this.getPumpFactoryContract();
    
    // Get total launches count
    const totalLaunches = await factory.call('total_launches');
    const count = BigInt(totalLaunches.toString());
    
    const launches: PublicLaunchInfo[] = [];
    
    // Fetch each launch
    // eslint-disable-next-line no-restricted-syntax
    for (let i = BigInt(0); i < count; i += BigInt(1)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const launch = await this.getLaunch(i);
        
        // Filter out mock/invalid addresses
        if (this.isValidDeployedAddress(launch.token) && this.isValidDeployedAddress(launch.pool)) {
          launches.push(launch);
        } else {
          console.warn(`Skipping launch ${i} with mock addresses: token=${launch.token}, pool=${launch.pool}`);
        }
      } catch (error) {
        console.error(`Failed to fetch launch ${i}:`, error);
      }
    }
    
    return launches;
  }

  /**
   * Get a specific launch by ID
   */
  async getLaunch(launchId: bigint | number): Promise<PublicLaunchInfo> {
    const factory = this.getPumpFactoryContract();
    const id = typeof launchId === 'number' ? BigInt(launchId) : launchId;
    
    const result = await factory.call('get_launch', [cairo.uint256(id)]);
    
    return this.parsePublicLaunchInfo(result);
  }

  /**
   * Get total number of launches
   */
  async getTotalLaunches(): Promise<bigint> {
    const factory = this.getPumpFactoryContract();
    const result = await factory.call('total_launches');
    return BigInt(result.toString());
  }

  // =========================================================================
  // BondingCurvePool Methods
  // =========================================================================

  /**
   * Get pool state
   * Requirements: 4.1
   */
  async getPoolState(poolAddress: string): Promise<PoolState> {
    // Validate pool address
    if (!poolAddress || poolAddress === '0x0' || poolAddress === '0') {
      throw new Error('Invalid pool address');
    }
    
    const pool = this.getBondingCurvePoolContract(poolAddress);
    const result = await pool.call('get_state');
    
    return this.parsePoolState(result);
  }

  /**
   * Get pool configuration (base_price, slope, max_supply)
   */
  async getPoolConfig(poolAddress: string): Promise<PoolConfig> {
    const pool = this.getBondingCurvePoolContract(poolAddress);
    
    const [basePrice, slope, maxSupply] = await Promise.all([
      pool.call('base_price'),
      pool.call('slope'),
      pool.call('max_supply'),
    ]);

    return {
      basePrice: this.parseU256(basePrice),
      slope: this.parseU256(slope),
      maxSupply: this.parseU256(maxSupply),
    };
  }

  /**
   * Get current price from pool
   */
  async getCurrentPrice(poolAddress: string): Promise<bigint> {
    const pool = this.getBondingCurvePoolContract(poolAddress);
    const result = await pool.call('get_current_price');
    return this.parseU256(result);
  }

  /**
   * Get buy cost for a given amount of tokens
   * Requirements: 5.1
   * 
   * Calculates the cost using the bonding curve integral:
   * cost = base_price * amount + slope * (current_sold + amount)^2 / 2 - slope * current_sold^2 / 2
   */
  async getBuyCost(poolAddress: string, amountTokens: bigint): Promise<bigint> {
    const pool = this.getBondingCurvePoolContract(poolAddress);
    
    // Get current pool state and config
    const [state, basePrice, slope] = await Promise.all([
      pool.call('get_state'),
      pool.call('base_price'),
      pool.call('slope'),
    ]);
    
    const stateObj = this.parsePoolState(state);
    const tokensSold = stateObj.tokensSold;
    const base = this.parseU256(basePrice);
    const s = this.parseU256(slope);
    const amount = BigInt(amountTokens);
    
    // Calculate cost using bonding curve integral
    // cost = base_price * amount + slope * ((current + amount)^2 - current^2) / 2
    const currentSold = tokensSold;
    const newSold = currentSold + amount;
    
    // Linear component: base_price * amount
    const linearCost = base * amount;
    
    // Quadratic component: slope * (newSold^2 - currentSold^2) / 2
    const quadraticCost = (s * (newSold * newSold - currentSold * currentSold)) / BigInt(2);
    
    return linearCost + quadraticCost;
  }

  /**
   * Get sell return for a given amount of tokens
   * Requirements: 6.1
   * 
   * Calculates the return using the bonding curve integral:
   * return = base_price * amount + slope * current_sold^2 / 2 - slope * (current_sold - amount)^2 / 2
   */
  async getSellReturn(poolAddress: string, amountTokens: bigint): Promise<bigint> {
    const pool = this.getBondingCurvePoolContract(poolAddress);
    
    // Get current pool state and config
    const [state, basePrice, slope] = await Promise.all([
      pool.call('get_state'),
      pool.call('base_price'),
      pool.call('slope'),
    ]);
    
    const stateObj2 = this.parsePoolState(state);
    const tokensSold = stateObj2.tokensSold;
    const base = this.parseU256(basePrice);
    const s = this.parseU256(slope);
    const amount = BigInt(amountTokens);
    
    // Cannot sell more than what's been sold
    if (amount > tokensSold) {
      throw new Error('INSUFFICIENT_TOKENS_SOLD');
    }
    
    // Calculate return using bonding curve integral
    // return = base_price * amount + slope * (currentSold^2 - newSold^2) / 2
    const currentSold = tokensSold;
    const newSold = currentSold - amount;
    
    // Linear component: base_price * amount
    const linearReturn = base * amount;
    
    // Quadratic component: slope * (currentSold^2 - newSold^2) / 2
    const quadraticReturn = (s * (currentSold * currentSold - newSold * newSold)) / BigInt(2);
    
    return linearReturn + quadraticReturn;
  }

  /**
   * Buy tokens from bonding curve
   * Requirements: 5.2
   */
  async buy(poolAddress: string, amountTokens: bigint): Promise<TransactionResult> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const pool = this.getBondingCurvePoolContract(poolAddress);
    
    const tx = await pool.invoke('buy', [cairo.uint256(amountTokens)]);
    
    await this.waitForTransaction(tx.transaction_hash);
    
    return {
      hash: tx.transaction_hash,
      status: 'confirmed',
    };
  }

  /**
   * Sell tokens to bonding curve
   * Requirements: 6.2
   */
  async sell(poolAddress: string, amountTokens: bigint): Promise<TransactionResult> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const pool = this.getBondingCurvePoolContract(poolAddress);
    
    const tx = await pool.invoke('sell', [cairo.uint256(amountTokens)]);
    
    await this.waitForTransaction(tx.transaction_hash);
    
    return {
      hash: tx.transaction_hash,
      status: 'confirmed',
    };
  }

  // =========================================================================
  // Token Methods
  // =========================================================================

  /**
   * Get token balance for a user
   * Requirements: 9.1
   */
  async getBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
    const token = this.getTokenContract(tokenAddress);
    const result = await token.call('balance_of', [userAddress]);
    return this.parseU256(result);
  }

  /**
   * Approve token spending
   * Requirements: 5.2, 6.2
   */
  async approve(tokenAddress: string, spender: string, amount: bigint): Promise<TransactionResult> {
    if (!this.account) {
      throw new Error('Account not connected');
    }

    const token = this.getTokenContract(tokenAddress);
    
    const tx = await token.invoke('approve', [spender, cairo.uint256(amount)]);
    
    return this.waitForTransaction(tx.transaction_hash);
  }

  /**
   * Get token allowance
   */
  async getAllowance(tokenAddress: string, owner: string, spender: string): Promise<bigint> {
    const token = this.getTokenContract(tokenAddress);
    const result = await token.call('allowance', [owner, spender]);
    return this.parseU256(result);
  }

  // =========================================================================
  // Transaction Status Tracking
  // =========================================================================

  /**
   * Wait for transaction confirmation
   * Requirements: 1.4
   */
  async waitForTransaction(txHash: string): Promise<any> {
    try {
      console.log('Waiting for transaction:', txHash);
      
      const receipt = await this.provider.waitForTransaction(txHash, {
        retryInterval: 2000,
      });

      console.log('Transaction receipt received:', receipt);
      
      const isSuccess = receipt.isSuccess();
      
      if (!isSuccess) {
        console.error('Transaction failed:', receipt);
        throw new Error('Transaction reverted');
      }
      
      // Return the full receipt for event parsing
      return receipt;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * Requirements: 1.4
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return 'pending';
      }

      return receipt.isSuccess() ? 'confirmed' : 'failed';
    } catch {
      return 'pending';
    }
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Parse u256 from contract response
   */
  // eslint-disable-next-line class-methods-use-this
  private parseU256(value: any): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'object' && 'low' in value && 'high' in value) {
      const low = BigInt(value.low.toString());
      const high = BigInt(value.high.toString());
      // eslint-disable-next-line no-bitwise
      return low + (high << BigInt(128));
    }
    return BigInt(value.toString());
  }

  /**
   * Parse PoolState from contract response
   */
  private parsePoolState(result: any): PoolState {
    return {
      token: result.token?.toString() || '0x0',
      quoteToken: result.quote_token?.toString() || '0x0',
      tokensSold: this.parseU256(result.tokens_sold),
      reserveBalance: this.parseU256(result.reserve_balance),
      migrated: Boolean(result.migrated),
    };
  }

  /**
   * Parse PublicLaunchInfo from contract response
   */
  private parsePublicLaunchInfo(result: any): PublicLaunchInfo {
    // Helper to convert felt252 to hex address
    const toHexAddress = (value: any): string => {
      if (!value) return '0x0';
      const bigIntValue = BigInt(value.toString());
      return `0x${bigIntValue.toString(16).padStart(64, '0')}`;
    };
    
    return {
      token: toHexAddress(result.token),
      pool: toHexAddress(result.pool),
      quoteToken: toHexAddress(result.quote_token),
      name: shortString.decodeShortString(result.name?.toString() || '0x0'),
      symbol: shortString.decodeShortString(result.symbol?.toString() || '0x0'),
      basePrice: this.parseU256(result.base_price),
      slope: this.parseU256(result.slope),
      maxSupply: this.parseU256(result.max_supply),
      createdAt: BigInt(result.created_at?.toString() || '0'),
      migrated: Boolean(result.migrated),
    };
  }

  /**
   * Extract LaunchCreated event from transaction receipt
   */
  private extractLaunchCreatedEvent(receipt: any): { launchId: bigint; token: string; pool: string } | null {
    try {
      console.log('Parsing receipt for LaunchCreated event:', JSON.stringify(receipt, null, 2));
      
      const events = receipt.events || [];
      console.log(`Found ${events.length} events in receipt`);
      
      const addresses = getContractAddresses(this.network);
      const factoryAddress = addresses.pumpFactory.toLowerCase();
      console.log('Looking for events from factory:', factoryAddress);
      
      // Log all event addresses for debugging
      events.forEach((e: any, i: number) => {
        console.log(`Event ${i}: from=${e.from_address}, keys=${e.keys?.length}, data=${e.data?.length}`);
      });
      
      // Find LaunchCreated event from factory contract
      const launchEvent = events.find((event: any) => {
        const fromAddr = event.from_address?.toLowerCase();
        return fromAddr === factoryAddress && event.keys && event.keys.length >= 3 && event.data && event.data.length >= 3;
      });
      
      if (launchEvent) {
        console.log('Found LaunchCreated event from factory:', launchEvent);
        
        // Cairo event structure:
        // #[derive(Drop, starknet::Event)]
        // pub struct LaunchCreated {
        //     #[key]
        //     pub launch_id: u256,           // keys[1], keys[2] (u256 = 2 felts)
        //     pub token: ContractAddress,    // data[0]
        //     pub pool: ContractAddress,     // data[1]
        //     pub stealth_creator: ContractAddress, // data[2]
        //     pub migration_threshold: u256, // data[3], data[4]
        // }
        
        // Parse launch_id from keys (u256 = low, high)
        const launchIdLow = BigInt(launchEvent.keys[1]?.toString() || '0');
        const launchIdHigh = BigInt(launchEvent.keys[2]?.toString() || '0');
        const launchId = launchIdLow + (launchIdHigh << BigInt(128));
        
        // Parse addresses from data
        const tokenFelt = BigInt(launchEvent.data[0]?.toString() || '0');
        const poolFelt = BigInt(launchEvent.data[1]?.toString() || '0');
        
        // Convert felt252 to hex address format
        const token = `0x${tokenFelt.toString(16).padStart(64, '0')}`;
        const pool = `0x${poolFelt.toString(16).padStart(64, '0')}`;
        
        const result = {
          launchId,
          token,
          pool,
        };
        
        console.log('Parsed event data:', result);
        return result;
      }
      
      console.warn('No LaunchCreated event found in receipt');
      return null;
    } catch (error) {
      console.error('Error parsing LaunchCreated event:', error);
      return null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let contractServiceInstance: ContractService | null = null;

/**
 * Get or create ContractService singleton
 */
export const getContractService = (network?: NetworkId): ContractService => {
  if (!contractServiceInstance) {
    contractServiceInstance = new ContractService(network);
  }
  return contractServiceInstance;
};

/**
 * Reset ContractService instance (useful for testing or network changes)
 */
export const resetContractService = (): void => {
  contractServiceInstance = null;
};

export default ContractService;
