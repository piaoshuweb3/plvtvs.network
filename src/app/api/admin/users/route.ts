import { NextRequest, NextResponse } from 'next/server';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const url = req.nextUrl;
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  if (isUsingMemDb || !db) {
    const mdb = getMemDb();
    let users = Array.from(mdb.users.values());
    if (role) users = users.filter((u) => u.role === role);
    if (status) users = users.filter((u) => u.status === status);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter((u) => u.walletAddress.toLowerCase().includes(s) || (u.username?.toLowerCase().includes(s) ?? false) || (u.email?.toLowerCase().includes(s) ?? false));
    }
    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, walletAddress: u.walletAddress, username: u.username, email: u.email, role: u.role, status: u.status, subscriptionTier: u.subscriptionTier, subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString() || null, totalYield: u.totalYield, lastLoginAt: u.lastLoginAt?.toISOString() || null, createdAt: u.createdAt.toISOString(), _count: { nodes: 0, subscriptions: 0 } })),
      total: users.length, limit: 50, offset: 0, storage: 'memory (serverless)',
    });
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) { where.OR = [{ walletAddress: { contains: search, mode: 'insensitive' } }, { username: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]; }
  const [users, total] = await Promise.all([
    db.user.findMany({ where, select: { id: true, walletAddress: true, username: true, email: true, role: true, status: true, subscriptionTier: true, subscriptionExpiresAt: true, totalYield: true, lastLoginAt: true, createdAt: true, _count: { select: { nodes: true, subscriptions: true } } }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    db.user.count({ where }),
  ]);
  return NextResponse.json({ users: users.map((u) => ({ ...u, subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString() || null, lastLoginAt: u.lastLoginAt?.toISOString() || null, createdAt: u.createdAt.toISOString() })), total, limit, offset });
}
