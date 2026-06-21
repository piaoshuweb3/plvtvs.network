'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// useOnChainSubscription — client hook for purchasing a Base-chain
// subscription via the PlutusSubscription smart contract.
// ============================================================

const PLUTUS_ABI = parseAbi([
  'function purchaseSubscription(uint256 _tierId) external payable',
  'function isSubscriptionActive(address _user) external view returns (bool)',
  'function getRemainingTime(address _user) external view returns (uint256)',
  'function pricingTiers(uint256) external view returns (uint256 duration, uint256 price, bool isActive)',
  'event Subscribed(address indexed user, uint256 tierId, uint256 newExpiryTimestamp, uint256 pricePaid)',
]);

// Hard-coded to env var (set in .env.local)
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export interface Tier {
  id: number;
  durationDays: number;
  priceEth: number;
  isActive: boolean;
}

export const DEFAULT_TIERS: Tier[] = [
  { id: 0, durationDays: 30, priceEth: 0.005, isActive: true },
  { id: 1, durationDays: 90, priceEth: 0.012, isActive: true },
  { id: 2, durationDays: 365, priceEth: 0.04, isActive: true },
];

export function useOnChainSubscription() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: txHash, error: writeError, isPending: isTxSending } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isContractConfigured =
    CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  /**
   * Purchase a subscription on-chain.
   * After tx confirms, calls /api/user/subscription to sync DB.
   */
  const purchase = async (tier: Tier): Promise<{ ok: boolean; txHash?: string; error?: string }> => {
    if (!isConnected || !address) {
      return { ok: false, error: 'Connect your wallet first.' };
    }
    if (!isContractConfigured) {
      return {
        ok: false,
        error:
          'Subscription contract not deployed yet. Set NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT in env.',
      };
    }

    setSyncError(null);
    try {
      getAudioEngine().playClick();

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PLUTUS_ABI,
        functionName: 'purchaseSubscription',
        args: [BigInt(tier.id)],
        value: BigInt(Math.floor(tier.priceEth * 1e18)), // ETH → wei
      });

      // Wait for confirmation via wagmi hook (re-render)
      // Then sync DB
      setSyncing(true);
      // Note: wagmi's useWaitForTransactionReceipt will update `isConfirmed`
      // We poll here as fallback
      const maxWait = 60000; // 60s
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, 2000));
        // wagmi hook will update isConfirmed state on re-render
        // we just need to wait and re-check
        if (isConfirmed) break;
      }

      // Call our API to record the on-chain purchase
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-plvtvs-wallet': address,
        },
        body: JSON.stringify({ txHash: hash, tier: tier.id + 1 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sync failed' }));
        setSyncError(err.error || 'Failed to sync on-chain subscription');
        return { ok: false, error: err.error, txHash: hash };
      }

      getAudioEngine().playSuccess();
      return { ok: true, txHash: hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSyncError(msg);
      return { ok: false, error: msg };
    } finally {
      setSyncing(false);
    }
  };

  return {
    purchase,
    isContractConfigured,
    contractAddress: CONTRACT_ADDRESS,
    tiers: DEFAULT_TIERS,
    isPending: isTxSending || isConfirming || syncing,
    txHash,
    writeError,
    syncError,
  };
}
