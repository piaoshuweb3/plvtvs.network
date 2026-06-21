import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// GET /api/auth/me?wallet=0x...
// Returns the public profile of a wallet (for client rehydration).
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
    }
    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        role: true,
        status: true,
        avatarSeed: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        totalYield: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        ...user,
        subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[/api/auth/me] Error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
