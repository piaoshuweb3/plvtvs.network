import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// GET /api/admin/users — list users with filters
// Query: ?role=&status=&search=&limit=&offset=
// ============================================================

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const url = req.nextUrl;
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { walletAddress: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        role: true,
        status: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        totalYield: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { nodes: true, subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString() || null,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}
