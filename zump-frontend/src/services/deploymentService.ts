import { ethers } from 'ethers';
import { getContractService, LaunchResult } from './contractService';

export interface DeployTokenParams {
  name: string;
  symbol: string;
  decimals?: number;
  initialMinter: string;
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

export interface FullLaunchParams {
  name: string;
  symbol: string;
  basePrice: bigint;
  slope: bigint;
  maxSupply: bigint;
  migrationThreshold?: bigint;
  stealthCreator?: string;
}

export async function deployFullLaunch(
  signer: ethers.Signer,
  params: FullLaunchParams,
  onProgress?: (step: string, details?: string) => void
): Promise<LaunchDeploymentResult> {
  onProgress?.('creating_launch', 'Submitting createLaunch');
  const service = getContractService();
  service.setAccount(signer);
  const result: LaunchResult = await service.createLaunch({
    name: params.name,
    symbol: params.symbol,
    basePrice: params.basePrice,
    slope: params.slope,
    maxSupply: params.maxSupply,
  });
  onProgress?.('complete', result.tokenAddress);
  return {
    tokenAddress: result.tokenAddress,
    poolAddress: result.poolAddress,
    launchId: result.launchId,
    tokenDeployTx: result.transactionHash,
    poolDeployTx: result.transactionHash,
    registerTx: result.transactionHash,
  };
}

export default {
  deployFullLaunch,
};
