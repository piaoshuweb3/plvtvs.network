import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deriveRoleFromWallet } from '@/lib/plvtvs/auth-constants';

// Lazy-load viem chain reader so it's only imported when needed
// (keeps the auth route fast when contract isn't configured)
async function readOnChainSubscription(wallet: string) {
  const { readOnChainSubscription: read } = await import(
    '@/lib/plvtvs/chain/subscription'
  );
  return read(wallet);
}

// ============================================================
// POST /api/auth/login
// Body: { walletAddress: string }
// Signs in (or auto-registers) a wallet. Returns the PlvtvsUser object.
// Also verifies on-chain subscription state and syncs DB.
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body?.walletAddress || '').toLowerCase();

    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Auto-register
      const role = deriveRoleFromWallet(walletAddress);
      user = await db.user.create({
        data: {
          walletAddress,
          role,
          avatarSeed: walletAddress,
          lastLoginAt: new Date(),
        },
      });

      // Log registration
      await db.activityLog.create({
        data: {
          userId: user.id,
          sector: 'SYSTEM',
          level: 'SUCCESS',
          message: `New ghost encapsulated: ${walletAddress.slice(0, 10)}...`,
        },
      });
    } else {
      // Check ban/suspend status
      if (user.status === 'BANNED') {
        return NextResponse.json(
          { error: 'Ghost banned by admin. Contact support.' },
          { status: 403 }
        );
      }
      if (user.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Ghost temporarily suspended.' },
          { status: 403 }
        );
      }

      // Update last login + re-derive role (in case admin list changed)
      const role = deriveRoleFromWallet(walletAddress);
      user = await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          role: user.role === 'USER' ? role : user.role, // don't downgrade admins
        },
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          sector: 'SYSTEM',
          level: 'INFO',
          message: `Ghost re-jacked-in: ${walletAddress.slice(0, 10)}...`,
        },
      });
    }

    // ============================================================
    // On-chain subscription verification (Base L2)
    // Only runs if NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT is set to a
    // non-zero address. Skipped in dev mode to avoid RPC calls.
    // ============================================================
    const contractAddr = process.env.NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT;
    if (contractAddr && contractAddr !== '0x0000000000000000000000000000000000000000') {
      try {
        const onChain = await readOnChainSubscription(walletAddress);
        if (onChain.expiresAt > 0n) {
          if (onChain.isActive) {
            const expiryDate = new Date(Number(onChain.expiresAt) * 1000);
            const days = Number(onChain.remainingSeconds) / 86400;
            let tier = 1;
            if (days > 80) tier = 2;
            if (days > 300) tier = 3;
            user = await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionExpiresAt: expiryDate,
                subscriptionTier: tier,
              },
            });
          } else if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
            user = await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionTier: 0,
                subscriptionExpiresAt: null,
              },
            });
          }
        }
      } catch (e) {
        console.warn('[/api/auth/login] On-chain verification skipped:', e);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarSeed: user.avatarSeed,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
        totalYield: user.totalYield,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[/api/auth/login] Error:', e);
    return NextResponse.json(
      { error: 'Internal authentication failure' },
      { status: 500 }
    );
  }
}
