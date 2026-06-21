'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useOnChainSubscription, type Tier } from '@/lib/plvtvs/chain/useOnChainSubscription';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// SubscriptionPanel — on-chain Base subscription purchase UI
// ============================================================

interface OnChainState {
  isActive: boolean;
  remainingSeconds: number;
  expiresAt: string | null;
  contractAddress: string;
  chain: string;
}

export default function SubscriptionPanel() {
  const { address, isConnected } = useAccount();
  const { purchase, tiers, isPending, isContractConfigured, contractAddress, syncError } =
    useOnChainSubscription();
  const [onChain, setOnChain] = useState<OnChainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch on-chain state
  const refresh = async () => {
    if (!address) return;
    setLoading(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/user/subscription`, {
        headers: { 'x-plvtvs-wallet': address },
      });
      if (res.ok) {
        const data = await res.json();
        setOnChain(data.onChain);
      }
    } catch (e) {
      console.error('Subscription fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) refresh();
  }, [isConnected, address]);

  const handlePurchase = async (tier: Tier) => {
    setLocalError(null);
    setSuccessMsg(null);
    getAudioEngine().playClick();
    const result = await purchase(tier);
    if (result.ok) {
      setSuccessMsg(
        `Subscription purchased on-chain! Tx: ${result.txHash?.slice(0, 10)}...`
      );
      await refresh();
    } else {
      setLocalError(result.error || 'Purchase failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="cyber-panel p-5">
        <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-3">
          ON-CHAIN SUBSCRIPTION
        </div>
        <div className="cyber-mono text-xs text-[#666]">
          Connect your wallet to purchase a Base L2 subscription.
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#FFCC00]">⛓</span>
          <span className="cyber-mono text-[10px] tracking-[0.2em] text-[#888]">
            BASE L2 SUBSCRIPTION
          </span>
        </div>
        <span
          className="cyber-mono text-[9px] px-1.5 py-0.5 border"
          style={{
            color: onChain?.isActive ? '#00FFCC' : '#666',
            borderColor: onChain?.isActive ? '#00FFCC' : '#1a1a1a',
          }}
        >
          {onChain?.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* On-chain status */}
      {onChain?.isActive && onChain.expiresAt && (
        <div className="mb-4 p-3 bg-[#00FFCC08] border border-[#00FFCC22]">
          <div className="cyber-mono text-[10px] text-[#888] tracking-wider mb-1">
            SUBSCRIPTION EXPIRES
          </div>
          <div className="cyber-mono text-sm text-[#00FFCC]">
            {new Date(onChain.expiresAt).toLocaleString()}
          </div>
          <div className="cyber-mono text-[10px] text-[#666] mt-1">
            {Math.ceil(onChain.remainingSeconds / 86400)} days remaining
          </div>
        </div>
      )}

      {/* Contract status */}
      <div className="mb-4 cyber-mono text-[10px] text-[#444]">
        Contract:{' '}
        {isContractConfigured ? (
          <span className="text-[#00FFCC]">
            {contractAddress.slice(0, 8)}...{contractAddress.slice(-4)}
          </span>
        ) : (
          <span className="text-[#FFCC00]">NOT DEPLOYED (dev mode)</span>
        )}
        <span className="ml-2">· Chain: {onChain?.chain || 'base-sepolia'}</span>
      </div>

      {/* Pricing tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="border border-[#1a1a1a] p-3 hover:border-[#FFCC00] transition-colors"
          >
            <div className="cyber-mono text-[10px] text-[#888] mb-1">
              TIER {tier.id + 1}
            </div>
            <div className="cyber-mono text-lg text-[#FFCC00] cyber-text-glow-gold mb-1">
              {tier.priceEth} ETH
            </div>
            <div className="cyber-mono text-[10px] text-[#666] mb-3">
              {tier.durationDays} days
            </div>
            <button
              onClick={() => handlePurchase(tier)}
              disabled={isPending || !isContractConfigured}
              className="cyber-btn cyber-btn-gold w-full !py-1.5 !px-2 !text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'PROCESSING...' : 'PURCHASE ON-CHAIN'}
            </button>
          </div>
        ))}
      </div>

      {/* Errors / success */}
      {localError && (
        <div className="cyber-mono text-[10px] text-[#ff4444] mb-2 break-all">
          ✕ {localError}
        </div>
      )}
      {syncError && (
        <div className="cyber-mono text-[10px] text-[#FFCC00] mb-2 break-all">
          ⚠ On-chain sync failed: {syncError}
        </div>
      )}
      {successMsg && (
        <div className="cyber-mono text-[10px] text-[#00FFCC] mb-2 break-all">
          ✓ {successMsg}
        </div>
      )}

      <button
        onClick={refresh}
        disabled={loading}
        className="cyber-mono text-[10px] text-[#666] hover:text-[#00FFCC] transition-colors"
      >
        {loading ? 'SYNCING...' : '↻ REFRESH ON-CHAIN STATE'}
      </button>
    </div>
  );
}
