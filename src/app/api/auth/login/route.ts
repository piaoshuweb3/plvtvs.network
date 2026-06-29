import { NextRequest, NextResponse } from 'next/server';
import { deriveRoleFromWallet } from '@/lib/plvtvs/auth-constants';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body?.walletAddress || '').toLowerCase();

    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    if (isUsingMemDb || !db) {
      const mdb = getMemDb();
      let user = mdb.users.get(walletAddress);
      if (!user) {
        const role = deriveRoleFromWallet(walletAddress);
        user = {
          id: mdb.genId(), walletAddress, email: null, username: null,
          role, status: 'ACTIVE', avatarSeed: walletAddress,
          subscriptionTier: 0, subscriptionExpiresAt: null, totalYield: 0,
          lastLoginAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
        };
        mdb.users.set(walletAddress, user);
        mdb.logs.push({ id: mdb.genId(), userId: user.id, sector: 'SYSTEM', level: 'SUCCESS', message: `New soul: ${walletAddress.slice(0, 10)}...`, metadata: null, createdAt: new Date() });
      } else {
        if (user.status === 'BANNED') return NextResponse.json({ error: 'Banned' }, { status: 403 });
        if (user.status === 'SUSPENDED') return NextResponse.json({ error: 'Suspended' }, { status: 403 });
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();
        mdb.logs.push({ id: mdb.genId(), userId: user.id, sector: 'SYSTEM', level: 'INFO', message: `Re-jack-in: ${walletAddress.slice(0, 10)}...`, metadata: null, createdAt: new Date() });
      }
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

    // Prisma path
    let user = await db.user.findUnique({ where: { walletAddress } });
    if (!user) {
      const role = deriveRoleFromWallet(walletAddress);
      user = await db.user.create({ data: { walletAddress, role, avatarSeed: walletAddress, lastLoginAt: new Date() } });
      await db.activityLog.create({ data: { userId: user.id, sector: 'SYSTEM', level: 'SUCCESS', message: `New soul: ${walletAddress.slice(0, 10)}...` } });
    } else {
      if (user.status === 'BANNED') return NextResponse.json({ error: 'Banned' }, { status: 403 });
      if (user.status === 'SUSPENDED') return NextResponse.json({ error: 'Suspended' }, { status: 403 });
      const role = deriveRoleFromWallet(walletAddress);
      user = await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), role: user.role === 'USER' ? role : user.role } });
      await db.activityLog.create({ data: { userId: user.id, sector: 'SYSTEM', level: 'INFO', message: `Re-jack-in: ${walletAddress.slice(0, 10)}...` } });
    }
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
  } catch (e) {
    console.error('[/api/auth/login] Error:', e);
    return NextResponse.json({ error: 'Internal authentication failure' }, { status: 500 });
  }
}
