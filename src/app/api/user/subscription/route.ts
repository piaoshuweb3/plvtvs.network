import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// GET /api/user/subscription — get current user's subscription
// POST /api/user/subscription — purchase / extend subscription
//   Body: { tier: 1|2|3, txHash?: string }
// ============================================================

const TIER_CONFIG = [
  null,
  { durationDays: 30, priceEth: 0.005 },
  { durationDays: 90, priceEth: 0.012 },
  { durationDays: 365, priceEth: 0.04 },
];

export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const subscriptions = await db.subscription.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    subscriptions: subscriptions.map((s) => ({
      ...s,
      startsAt: s.startsAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const tier = Number(body.tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > 3) {
    return NextResponse.json({ error: 'Invalid tier (1, 2, or 3)' }, { status: 400 });
  }
  const config = TIER_CONFIG[tier]!;

  const user = await db.user.findUnique({ where: { id: ctx.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const now = new Date();
  const baseTime =
    user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
      ? user.subscriptionExpiresAt
      : now;
  const expiresAt = new Date(baseTime.getTime() + config.durationDays * 24 * 60 * 60 * 1000);

  // Create subscription record (in production: verify txHash on-chain)
  const subscription = await db.subscription.create({
    data: {
      userId: ctx.userId,
      tier,
      priceEth: config.priceEth,
      txHash: body.txHash || `sim_${Date.now()}`,
      expiresAt,
      isActive: true,
    },
  });

  // Update user
  const updatedUser = await db.user.update({
    where: { id: ctx.userId },
    data: { subscriptionTier: tier, subscriptionExpiresAt: expiresAt },
  });

  // Activity log
  await db.activityLog.create({
    data: {
      userId: ctx.userId,
      sector: 'SYSTEM',
      level: 'SUCCESS',
      message: `Subscription tier ${tier} activated. Expires ${expiresAt.toISOString().slice(0, 10)}.`,
      metadata: JSON.stringify({ tier, priceEth: config.priceEth, txHash: body.txHash }),
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
  });
}
