import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useBotChain } from '../providers/BotChainProvider';
import { LaunchParams, LaunchResult, getContractService } from '../services/contractService';
import { getSupabaseService } from '../services/supabaseService';
import { TokenMetadataInsert } from '../@types/supabase';

export interface LaunchFormData {
  name: string;
  symbol: string;
  description: string;
  imageFile?: File;
  imageUrl?: string;
  basePrice: string;
  slope: string;
  maxSupply: string;
  migrationThreshold?: string;
  tags?: string[];
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

export interface GasEstimate {
  estimatedFee: bigint;
  estimatedFeeFormatted: string;
  suggestedMaxFee: bigint;
  suggestedMaxFeeFormatted: string;
}

export interface LaunchState {
  isLaunching: boolean;
  isEstimating: boolean;
  error: Error | null;
  transactionHash: string | null;
  tokenAddress: string | null;
  poolAddress: string | null;
  launchId: bigint | null;
  gasEstimate: GasEstimate | null;
  deploymentStep: string | null;
}

export interface UseTokenLaunchReturn extends LaunchState {
  launch: (params: LaunchFormData) => Promise<LaunchResult>;
  estimateGas: (params: LaunchFormData) => Promise<GasEstimate>;
  reset: () => void;
}

const WEI_DECIMALS = 18;

export const parseAmount = (amount: string, decimals: number = WEI_DECIMALS): bigint => {
  if (!amount || amount === '') return BigInt(0);
  return BigInt(ethers.utils.parseUnits(amount, decimals).toString());
};

export const formatAmount = (amount: bigint, decimals: number = WEI_DECIMALS): string => {
  return ethers.utils.formatUnits(amount.toString(), decimals);
};

const initialState: LaunchState = {
  isLaunching: false,
  isEstimating: false,
  error: null,
  transactionHash: null,
  tokenAddress: null,
  poolAddress: null,
  launchId: null,
  gasEstimate: null,
  deploymentStep: null,
};

export function useTokenLaunch(): UseTokenLaunchReturn {
  const { account, address } = useAccount();
  const { ensureBotChain } = useBotChain();
  const [state, setState] = useState<LaunchState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const estimateGas = useCallback(
    async (params: LaunchFormData): Promise<GasEstimate> => {
      if (!account || !address) {
        throw new Error('Wallet not connected');
      }
      setState((prev) => ({ ...prev, isEstimating: true, error: null }));
      try {
        const gasPrice = ethers.utils.parseUnits('20', 'gwei');
        const estimatedGas = ethers.BigNumber.from(350000);
        const fee = estimatedGas.mul(gasPrice);
        const estimate: GasEstimate = {
          estimatedFee: BigInt(fee.toString()),
          estimatedFeeFormatted: formatAmount(BigInt(fee.toString())),
          suggestedMaxFee: BigInt(fee.toString()),
          suggestedMaxFeeFormatted: formatAmount(BigInt(fee.toString())),
        };
        setState((prev) => ({ ...prev, isEstimating: false, gasEstimate: estimate }));
        return estimate;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to estimate gas');
        setState((prev) => ({ ...prev, isEstimating: false, error: err }));
        throw err;
      }
    },
    [account, address]
  );

  const launch = useCallback(
    async (params: LaunchFormData): Promise<LaunchResult> => {
      if (!account || !address) {
        throw new Error('Wallet not connected');
      }

      setState((prev) => ({
        ...prev,
        isLaunching: true,
        error: null,
        transactionHash: null,
        tokenAddress: null,
        poolAddress: null,
        launchId: null,
        deploymentStep: 'preparing',
      }));

      try {
        await ensureBotChain();
        const basePrice = parseAmount(params.basePrice);
        const slope = parseAmount(params.slope);
        const maxSupply = parseAmount(params.maxSupply);

        let imageUrl = params.imageUrl || '';
        if (params.imageFile) {
          try {
            setState((prev) => ({ ...prev, deploymentStep: 'uploading_image' }));
            const supabaseService = getSupabaseService();
            imageUrl = await supabaseService.uploadTokenImage(params.imageFile);
          } catch (uploadError) {
            console.error('Failed to upload image:', uploadError);
          }
        }

        setState((prev) => ({ ...prev, deploymentStep: 'creating_launch' }));
        const service = getContractService();
        service.setAccount(account);
        const launchParams: LaunchParams = {
          name: params.name,
          symbol: params.symbol,
          basePrice,
          slope,
          maxSupply,
        };
        const result = await service.createLaunch(launchParams);

        setState((prev) => ({
          ...prev,
          transactionHash: result.transactionHash,
          tokenAddress: result.tokenAddress,
          poolAddress: result.poolAddress,
          launchId: result.launchId,
          deploymentStep: 'saving_metadata',
        }));

        if (result.tokenAddress && result.tokenAddress !== ethers.constants.AddressZero) {
          try {
            const supabaseService = getSupabaseService();
            const metadata: TokenMetadataInsert = {
              token_address: result.tokenAddress,
              pool_address: result.poolAddress,
              launch_id: result.launchId.toString(),
              name: params.name,
              symbol: params.symbol,
              description: params.description || null,
              image_url: imageUrl || null,
              creator_address: address,
              tags: params.tags || [],
              website_url: params.websiteUrl || null,
              twitter_url: params.twitterUrl || null,
              telegram_url: params.telegramUrl || null,
            };
            await supabaseService.createTokenMetadata(metadata);
          } catch (metadataError) {
            console.error('Failed to store metadata:', metadataError);
          }
        }

        setState((prev) => ({ ...prev, isLaunching: false, deploymentStep: 'complete' }));
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to launch token');
        setState((prev) => ({ ...prev, isLaunching: false, error: err, deploymentStep: 'failed' }));
        throw err;
      }
    },
    [account, address, ensureBotChain]
  );

  return {
    ...state,
    launch,
    estimateGas,
    reset,
  };
}

export default useTokenLaunch;
