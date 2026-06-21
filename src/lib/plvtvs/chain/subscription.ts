import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// ============================================================
// PlutusSubscription — on-chain reader
// ============================================================
// Server-side viem client. Used by /api/subscription/* to verify
// a wallet's subscription status directly from the Base blockchain
// (no off-chain trust required).
// ============================================================

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as Address;

const IS_TESTNET = (process.env.NEXT_PUBLIC_BASE_CHAIN || 'base-sepolia') === 'base-sepolia';

const chain = IS_TESTNET ? baseSepolia : base;

// Use public Base RPCs (no API key required, rate-limited)
const RPC_URL = IS_TESTNET
  ? 'https://sepolia.base.org'
  : 'https://mainnet.base.org';

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const PLUTUS_ABI = parseAbi([
  'function isSubscriptionActive(address _user) external view returns (bool)',
  'function getRemainingTime(address _user) external view returns (uint256)',
  'function subscriptionExpiresAt(address) external view returns (uint256)',
  'function pricingTiers(uint256) external view returns (uint256 duration, uint256 price, bool isActive)',
  'function totalTiers() external view returns (uint256)',
]);

export interface OnChainSubscription {
  isActive: boolean;
  remainingSeconds: bigint;
  expiresAt: bigint; // unix seconds
  contractAddress: Address;
  chain: 'base-sepolia' | 'base';
}

/**
 * Read a wallet's subscription state from the Base blockchain.
 * Returns isActive=false if the contract is the zero address
 * (i.e. not yet deployed — local dev / demo mode).
 */
export async function readOnChainSubscription(
  wallet: string
): Promise<OnChainSubscription> {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    // Contract not deployed — return inactive (demo mode)
    return {
      isActive: false,
      remainingSeconds: 0n,
      expiresAt: 0n,
      contractAddress: CONTRACT_ADDRESS,
      chain: IS_TESTNET ? 'base-sepolia' : 'base',
    };
  }

  const walletAddr = wallet as Address;

  // Parallelize the three reads
  const [isActive, remainingSeconds, expiresAt] = await Promise.all([
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PLUTUS_ABI,
      functionName: 'isSubscriptionActive',
      args: [walletAddr],
    }) as Promise<boolean>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PLUTUS_ABI,
      functionName: 'getRemainingTime',
      args: [walletAddr],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PLUTUS_ABI,
      functionName: 'subscriptionExpiresAt',
      args: [walletAddr],
    }) as Promise<bigint>,
  ]);

  return {
    isActive,
    remainingSeconds,
    expiresAt,
    contractAddress: CONTRACT_ADDRESS,
    chain: IS_TESTNET ? 'base-sepolia' : 'base',
  };
}

/**
 * Read pricing tiers from the contract.
 */
export async function readPricingTiers(): Promise<
  { id: number; duration: bigint; price: bigint; isActive: boolean }[]
> {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return [
      { id: 0, duration: 2592000n, price: 5000000000000000n, isActive: true }, // 30d @ 0.005 ETH
      { id: 1, duration: 7776000n, price: 12000000000000000n, isActive: true }, // 90d @ 0.012 ETH
      { id: 2, duration: 31536000n, price: 40000000000000000n, isActive: true }, // 365d @ 0.04 ETH
    ];
  }

  const totalTiers = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: PLUTUS_ABI,
    functionName: 'totalTiers',
  })) as bigint;

  const tiers: { id: number; duration: bigint; price: bigint; isActive: boolean }[] = [];
  for (let i = 0n; i < totalTiers; i++) {
    const tier = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PLUTUS_ABI,
      functionName: 'pricingTiers',
      args: [i],
    })) as [bigint, bigint, boolean];
    tiers.push({
      id: Number(i),
      duration: tier[0],
      price: tier[1],
      isActive: tier[2],
    });
  }
  return tiers;
}

export { CONTRACT_ADDRESS, PLUTUS_ABI };
