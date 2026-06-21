import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// GET /api/admin/nodes — list all nodes across all users
// Query: ?sector=&status=&userId=&limit=&offset=
// PATCH /api/admin/nodes — bulk-restart nodes by id list
// ============================================================

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const url = req.nextUrl;
  const sector = url.searchParams.get('sector');
  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('userId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [nodes, total] = await Promise.all([
    db.node.findMany({
      where,
      include: {
        user: { select: { walletAddress: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.node.count({ where }),
  ]);

  return NextResponse.json({
    nodes: nodes.map((n) => ({
      ...n,
      lastHeartbeat: n.lastHeartbeat?.toISOString() || null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { nodeIds, action } = body as { nodeIds: string[]; action: string };

  if (!Array.isArray(nodeIds) || nodeIds.length === 0 || !action) {
    return NextResponse.json({ error: 'nodeIds[] and action required' }, { status: 400 });
  }

  let newStatus: 'SPAWNING' | 'ONLINE' | 'DEGRADED' | 'OFFLINE' | null = null;
  if (action === 'restart') newStatus = 'SPAWNING';
  else if (action === 'online') newStatus = 'ONLINE';
  else if (action === 'offline') newStatus = 'OFFLINE';

  if (!newStatus) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const result = await db.node.updateMany({
    where: { id: { in: nodeIds } },
    data: { status: newStatus, updatedAt: new Date() },
  });

  await db.adminLog.create({
    data: {
      adminId: ctx.userId,
      action: `NODE_${action.toUpperCase()}`,
      reason: `Bulk action on ${nodeIds.length} nodes`,
      metadata: JSON.stringify({ nodeIds, action }),
    },
  });

  return NextResponse.json({ updated: result.count });
}
