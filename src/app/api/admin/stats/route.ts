import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// GET /api/admin/stats — overview KPIs for the admin console
// ============================================================

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeSubscribers,
    bannedUsers,
    suspendedUsers,
    newUsers24h,
    newUsers7d,
    onlineNodes,
    totalNodes,
    totalYield,
    activeSubscriptions,
    logs24h,
    adminActions24h,
    usersByRole,
    nodesBySector,
    nodesByStatus,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { subscriptionTier: { gt: 0 } } }),
    db.user.count({ where: { status: 'BANNED' } }),
    db.user.count({ where: { status: 'SUSPENDED' } }),
    db.user.count({ where: { createdAt: { gte: last24h } } }),
    db.user.count({ where: { createdAt: { gte: last7d } } }),
    db.node.count({ where: { status: 'ONLINE' } }),
    db.node.count(),
    db.user.aggregate({ _sum: { totalYield: true } }),
    db.subscription.count({ where: { isActive: true } }),
    db.activityLog.count({ where: { createdAt: { gte: last24h } } }),
    db.adminLog.count({ where: { createdAt: { gte: last24h } } }),
    db.user.groupBy({ by: ['role'], _count: true }),
    db.node.groupBy({ by: ['sector'], _count: true }),
    db.node.groupBy({ by: ['status'], _count: true }),
  ]);

  // Revenue (sum of all subscription prices)
  const revenueAgg = await db.subscription.aggregate({ _sum: { priceEth: true } });

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: totalUsers - bannedUsers - suspendedUsers,
      banned: bannedUsers,
      suspended: suspendedUsers,
      new24h: newUsers24h,
      new7d: newUsers7d,
      subscribers: activeSubscribers,
      byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    },
    subscriptions: {
      active: activeSubscriptions,
      totalRevenueEth: revenueAgg._sum.priceEth || 0,
    },
    nodes: {
      total: totalNodes,
      online: onlineNodes,
      bySector: Object.fromEntries(nodesBySector.map((n) => [n.sector, n._count])),
      byStatus: Object.fromEntries(nodesByStatus.map((n) => [n.status, n._count])),
    },
    yield: {
      totalEth: totalYield._sum.totalYield || 0,
    },
    activity: {
      logs24h,
      adminActions24h,
    },
    generatedAt: now.toISOString(),
  });
}
