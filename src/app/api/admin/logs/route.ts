import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// GET /api/admin/logs — paginated activity & admin action logs
// Query: ?type=activity|admin&sector=&level=&limit=&offset=
// ============================================================

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const url = req.nextUrl;
  const type = url.searchParams.get('type') || 'activity';
  const sector = url.searchParams.get('sector');
  const level = url.searchParams.get('level');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (type === 'admin') {
    const where: Record<string, unknown> = {};
    if (sector) where.action = { contains: sector, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      db.adminLog.findMany({
        where,
        include: {
          admin: { select: { walletAddress: true, username: true } },
          targetUser: { select: { walletAddress: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.adminLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  }

  // Activity logs
  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;
  if (level) where.level = level;

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: { select: { walletAddress: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}
