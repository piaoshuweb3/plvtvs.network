import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deriveRoleFromWallet } from '@/lib/plvtvs/auth';

// ============================================================
// POST /api/auth/login
// Body: { walletAddress: string }
// Signs in (or auto-registers) a wallet. Returns the PlvtvsUser object.
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
