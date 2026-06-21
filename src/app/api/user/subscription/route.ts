import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, authOk } from '@/lib/plvtvs/admin-auth';
import { readOnChainSubscription, readPricingTiers } from '@/lib/plvtvs/chain/subscription';

// ============================================================
// GET /api/user/subscription — get user's subscriptions (DB + on-chain)
// POST /api/user/subscription — record an on-chain purchase (verify tx)
//   Body: { txHash: string, tier: 1|2|3 }
// ============================================================

export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  // Read on-chain state
  const onChain = await readOnChainSubscription(ctx.walletAddress).catch((e) => {
    console.error('[/api/user/subscription] On-chain read failed:', e);
    return null;
  });

  // Read DB records
  const subscriptions = await db.subscription.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Sync DB user record with on-chain truth
  if (onChain && onChain.isActive) {
    const expiryDate = new Date(Number(onChain.expiresAt) * 1000);
    const tier = subscriptions.find((s) => s.txHash)?.tier || 1;
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        subscriptionTier: tier,
        subscriptionExpiresAt: expiryDate,
      },
    });
  } else if (onChain && !onChain.isActive) {
    // On-chain says expired — update DB
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        subscriptionTier: 0,
        subscriptionExpiresAt: null,
      },
    });
  }

  // Pricing tiers
  const tiers = await readPricingTiers().catch(() => []);

  return NextResponse.json({
    onChain: onChain
      ? {
          isActive: onChain.isActive,
          remainingSeconds: Number(onChain.remainingSeconds),
          expiresAt: Number(onChain.expiresAt) > 0
            ? new Date(Number(onChain.expiresAt) * 1000).toISOString()
            : null,
          contractAddress: onChain.contractAddress,
          chain: onChain.chain,
        }
      : null,
    tiers: tiers.map((t) => ({
      id: t.id,
      durationDays: Number(t.duration) / 86400,
      priceEth: Number(t.price) / 1e18,
      isActive: t.isActive,
    })),
    subscriptions: subscriptions.map((s) => ({
      ...s,
      startsAt: s.startsAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

// ============================================================
// POST — record an on-chain purchase after the user has paid via
// the smart contract directly. We verify by reading the chain.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { txHash } = body as { txHash?: string };

  if (!txHash || typeof txHash !== 'string') {
    return NextResponse.json(
      { error: 'txHash required (the on-chain purchase tx hash)' },
      { status: 400 }
    );
  }

  // Read the on-chain state — this is the source of truth
  const onChain = await readOnChainSubscription(ctx.walletAddress).catch((e) => {
    console.error('[/api/user/subscription] On-chain read failed:', e);
    return null;
  });

  if (!onChain || !onChain.isActive) {
    return NextResponse.json(
      { error: 'On-chain subscription not active. Please complete the transaction first.' },
      { status: 400 }
    );
  }

  // Determine tier from remaining time (heuristic)
  const days = Number(onChain.remainingSeconds) / 86400;
  let tier = 1;
  if (days > 80) tier = 2;
  if (days > 300) tier = 3;

  const expiresAt = new Date(Number(onChain.expiresAt) * 1000);
  const startsAt = new Date();

  // Create / update DB record
  const subscription = await db.subscription.create({
    data: {
      userId: ctx.userId,
      tier,
      priceEth: 0, // actual amount is in tx receipt; we trust on-chain here
      txHash,
      startsAt,
      expiresAt,
      isActive: true,
    },
  });

  // Update user
  const updatedUser = await db.user.update({
    where: { id: ctx.userId },
    data: {
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt,
    },
  });

  await db.activityLog.create({
    data: {
      userId: ctx.userId,
      sector: 'SYSTEM',
      level: 'SUCCESS',
      message: `On-chain subscription activated · tier ${tier} · tx ${txHash.slice(0, 10)}...`,
      metadata: JSON.stringify({ txHash, tier, expiresAt: expiresAt.toISOString() }),
    },
  });

  return NextResponse.json({
    subscription: {
      ...subscription,
      startsAt: subscription.startsAt.toISOString(),
      expiresAt: subscription.expiresAt.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
    },
    user: {
      ...updatedUser,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt?.toISOString() || null,
      lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
      createdAt: updatedUser.createdAt.toISOString(),
    },
    onChain: {
      isActive: onChain.isActive,
      expiresAt: expiresAt.toISOString(),
      contractAddress: onChain.contractAddress,
      chain: onChain.chain,
    },
  });
}
