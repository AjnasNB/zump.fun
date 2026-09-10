import { ethers } from 'ethers';
import { PUMP_FACTORY_ABI, MEME_TOKEN_ABI } from '../abi/evm';
import {
  getContractConfig,
  getContractAddresses,
  isValidContractAddress,
  NetworkId,
} from '../config/contracts';

export interface LaunchParams {
  name: string;
  symbol: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  stealthCreator?: string;
  migrationThreshold?: bigint;
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
  id: number;
  token: string;
  pool: string;
  quoteToken: string;
  name: string;
  symbol: string;
  creator: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  tokensSold: bigint;
  reserveBalance: bigint;
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

const LEGACY_GAS_PRICE = ethers.utils.parseUnits('20', 'gwei');

function toBigInt(value: ethers.BigNumberish): bigint {
  return BigInt(ethers.BigNumber.from(value).toString());
}

function asAddress(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('0x')) return value;
  return ethers.constants.AddressZero;
}

function unwrapLaunch(row: any): {
  token: string;
  creator: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  tokensSold: bigint;
  reserveBalance: bigint;
  createdAt: bigint;
} {
  const inner = row?.token != null ? row : row?.[0]?.token != null ? row[0] : row;
  return {
    token: asAddress(inner.token ?? inner[0]),
    creator: asAddress(inner.creator ?? inner[1]),
    basePrice: toBigInt(inner.basePrice ?? inner[2] ?? 0),
    slope: toBigInt(inner.slope ?? inner[3] ?? 0),
    maxSupply: toBigInt(inner.maxSupply ?? inner[4] ?? 0),
    tokensSold: toBigInt(inner.tokensSold ?? inner[5] ?? 0),
    reserveBalance: toBigInt(inner.reserveBalance ?? inner[6] ?? 0),
    createdAt: toBigInt(inner.createdAt ?? inner[7] ?? 0),
  };
}

export class ContractService {
  private readProvider: ethers.providers.JsonRpcProvider;

  private signer: ethers.Signer | null = null;

  constructor(_network?: NetworkId) {
    const config = getContractConfig();
    this.readProvider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  }

  setAccount(signer: ethers.Signer | null): void {
    this.signer = signer;
  }

  getAccount(): ethers.Signer | null {
    return this.signer;
  }

  isConnected(): boolean {
    return this.signer !== null;
  }

  private getProvider(): ethers.providers.Provider {
    return this.signer?.provider || this.readProvider;
  }

  private factory(withSigner = false): ethers.Contract {
    const { pumpFactory } = getContractAddresses();
    if (!isValidContractAddress(pumpFactory)) {
      throw new Error('Pump factory address is not configured');
    }
    const runner = withSigner ? this.signer || this.getProvider() : this.getProvider();
    return new ethers.Contract(pumpFactory, PUMP_FACTORY_ABI, runner);
  }

  private token(address: string, withSigner = false): ethers.Contract {
    const runner = withSigner ? this.signer || this.getProvider() : this.getProvider();
    return new ethers.Contract(address, MEME_TOKEN_ABI, runner);
  }

  private txOverrides(value?: ethers.BigNumberish) {
    const overrides: ethers.PayableOverrides = {
      gasPrice: LEGACY_GAS_PRICE,
    };
    if (value !== undefined) overrides.value = value;
    return overrides;
  }

  async getLaunchCount(): Promise<number> {
    const count = await this.factory().launchCount();
    return Number(count.toString());
  }

  async getTotalLaunches(): Promise<bigint> {
    return BigInt(await this.getLaunchCount());
  }

  async resolveLaunchId(tokenAddress: string): Promise<number> {
    const stored = await this.factory().launchIdOf(tokenAddress);
    const idPlusOne = Number(stored.toString());
    if (!idPlusOne) {
      throw new Error('Launch not found for token');
    }
    return idPlusOne - 1;
  }

  async getLaunchByToken(tokenAddress: string): Promise<PublicLaunchInfo> {
    const id = await this.resolveLaunchId(tokenAddress);
    return this.getLaunch(id);
  }

  async getLaunch(id: number): Promise<PublicLaunchInfo> {
    const parsed = unwrapLaunch(await this.factory().getLaunch(id));
    let name = 'Unknown Token';
    let symbol = '???';
    if (parsed.token !== ethers.constants.AddressZero) {
      try {
        const erc20 = this.token(parsed.token);
        [name, symbol] = await Promise.all([erc20.name(), erc20.symbol()]);
      } catch {
        // token metadata is optional if RPC flakes
      }
    }

    return {
      id,
      token: parsed.token,
      pool: parsed.token,
      quoteToken: 'BOT',
      name,
      symbol,
      creator: parsed.creator,
      basePrice: parsed.basePrice,
      slope: parsed.slope,
      maxSupply: parsed.maxSupply,
      tokensSold: parsed.tokensSold,
      reserveBalance: parsed.reserveBalance,
      createdAt: parsed.createdAt,
      migrated: false,
    };
  }

  async getAllLaunches(): Promise<PublicLaunchInfo[]> {
    const count = await this.getLaunchCount();
    if (count === 0) return [];
    const launches = await Promise.all(
      Array.from({ length: count }, (_, i) => this.getLaunch(i))
    );
    return launches;
  }

  async getPoolState(tokenAddress: string): Promise<PoolState> {
    const launch = await this.getLaunch(await this.resolveLaunchId(tokenAddress));
    return {
      token: launch.token,
      quoteToken: launch.quoteToken,
      tokensSold: launch.tokensSold,
      reserveBalance: launch.reserveBalance,
      migrated: false,
    };
  }

  async getPoolConfig(tokenAddress: string): Promise<PoolConfig> {
    const launch = await this.getLaunch(await this.resolveLaunchId(tokenAddress));
    return {
      basePrice: launch.basePrice,
      slope: launch.slope,
      maxSupply: launch.maxSupply,
    };
  }

  async getCurrentPrice(tokenAddress: string): Promise<bigint> {
    const id = await this.resolveLaunchId(tokenAddress);
    const price = await this.factory().currentPrice(id);
    return toBigInt(price);
  }

  async getBuyCost(_poolOrToken: string, amountTokens: bigint): Promise<bigint> {
    const id = await this.resolveLaunchId(_poolOrToken);
    const [cost] = await this.factory().quoteBuy(id, amountTokens.toString());
    return toBigInt(cost);
  }

  async getSellReturn(_poolOrToken: string, amountTokens: bigint): Promise<bigint> {
    const id = await this.resolveLaunchId(_poolOrToken);
    const [refund] = await this.factory().quoteSell(id, amountTokens.toString());
    return toBigInt(refund);
  }

  async getBalance(tokenAddress: string, owner: string): Promise<bigint> {
    if (tokenAddress.toUpperCase() === 'BOT' || tokenAddress === ethers.constants.AddressZero) {
      const bal = await this.getProvider().getBalance(owner);
      return toBigInt(bal);
    }
    const bal = await this.token(tokenAddress).balanceOf(owner);
    return toBigInt(bal);
  }

  async getNativeBalance(owner: string): Promise<bigint> {
    const bal = await this.getProvider().getBalance(owner);
    return toBigInt(bal);
  }

  async createLaunch(params: LaunchParams): Promise<LaunchResult> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const factory = this.factory(true);
    const tx = await factory.createLaunch(
      params.name,
      params.symbol,
      params.basePrice.toString(),
      params.slope.toString(),
      params.maxSupply.toString(),
      this.txOverrides()
    );
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((log: ethers.providers.Log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((ev: ethers.utils.LogDescription | null) => ev?.name === 'LaunchCreated');

    const launchId = parsed ? toBigInt(parsed.args.id) : BigInt(0);
    const tokenAddress = parsed ? (parsed.args.token as string) : ethers.constants.AddressZero;

    return {
      transactionHash: receipt.transactionHash,
      tokenAddress,
      poolAddress: tokenAddress,
      launchId,
    };
  }

  async buy(tokenAddress: string, amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const id = await this.resolveLaunchId(tokenAddress);
    const factory = this.factory(true);
    const [cost] = await factory.quoteBuy(id, amount.toString());
    const tx = await factory.buy(id, amount.toString(), this.txOverrides(cost));
    const receipt = await tx.wait();
    return {
      hash: receipt.transactionHash,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
    };
  }

  async sell(tokenAddress: string, amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const id = await this.resolveLaunchId(tokenAddress);
    const factory = this.factory(true);
    const tx = await factory.sell(id, amount.toString(), this.txOverrides());
    const receipt = await tx.wait();
    return {
      hash: receipt.transactionHash,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
    };
  }

  async waitForTransaction(hash: string): Promise<TransactionResult> {
    const receipt = await this.getProvider().waitForTransaction(hash);
    if (!receipt) {
      return { hash, status: 'pending' };
    }
    return {
      hash,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
    };
  }
}

let singleton: ContractService | null = null;

export function getContractService(): ContractService {
  if (!singleton) {
    singleton = new ContractService();
  }
  return singleton;
}

export function resetContractService(): void {
  singleton = null;
}

export default ContractService;
