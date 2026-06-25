import { NextRequest, NextResponse } from 'next/server';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const url = req.nextUrl;
  const type = url.searchParams.get('type') || 'activity';
  const sector = url.searchParams.get('sector');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  if (isUsingMemDb || !db) {
    const mdb = getMemDb();
    if (type === 'admin') return NextResponse.json({ logs: [], total: 0, limit, offset: 0, storage: 'memory (serverless)' });
    let logs = [...mdb.logs].reverse();
    if (sector) logs = logs.filter((l) => l.sector === sector);
    logs = logs.slice(0, limit);
    return NextResponse.json({ logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })), total: mdb.logs.length, limit, offset: 0, storage: 'memory (serverless)' });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  if (type === 'admin') {
    const where: Record<string, unknown> = {};
    if (sector) where.action = { contains: sector, mode: 'insensitive' };
    const [logs, total] = await Promise.all([
      db.adminLog.findMany({ where, include: { admin: { select: { walletAddress: true, username: true } }, targetUser: { select: { walletAddress: true, username: true } } }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      db.adminLog.count({ where }),
    ]);
    return NextResponse.json({ logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })), total, limit, offset });
  }
  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;
  const [logs, total] = await Promise.all([
    db.activityLog.findMany({ where, include: { user: { select: { walletAddress: true, username: true } } }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    db.activityLog.count({ where }),
  ]);
  return NextResponse.json({ logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })), total, limit, offset });
}
