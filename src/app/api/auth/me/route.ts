import { NextRequest, NextResponse } from 'next/server';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    if (!wallet) return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });

    if (isUsingMemDb || !db) {
      const mdb = getMemDb();
      const user = mdb.users.get(wallet);
      if (!user) return NextResponse.json({ user: null });
      return NextResponse.json({
        user: {
          id: user.id, walletAddress: user.walletAddress, username: user.username,
          email: user.email, role: user.role, status: user.status,
          avatarSeed: user.avatarSeed, subscriptionTier: user.subscriptionTier,
          subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
          totalYield: user.totalYield,
          lastLoginAt: user.lastLoginAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
        },
      });
    }

    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
      select: { id: true, walletAddress: true, username: true, email: true, role: true, status: true, avatarSeed: true, subscriptionTier: true, subscriptionExpiresAt: true, totalYield: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ user: null });
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
