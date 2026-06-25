import { NextRequest, NextResponse } from 'next/server';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';
import { requireOperator, authOk } from '@/lib/plvtvs/admin-auth';

export async function GET(req: NextRequest) {
  const ctx = await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const now = new Date();
  const last24h = new Date(now.getTime() - 86400000);
  const last7d = new Date(now.getTime() - 604800000);

  if (isUsingMemDb || !db) {
    const mdb = getMemDb();
    const users = Array.from(mdb.users.values());
    const byRole: Record<string, number> = {};
    for (const u of users) byRole[u.role] = (byRole[u.role] || 0) + 1;
    const logs24h = mdb.logs.filter((l) => l.createdAt >= last24h).length;
    return NextResponse.json({
      users: {
        total: users.length,
        active: users.filter((u) => u.status === 'ACTIVE').length,
        banned: users.filter((u) => u.status === 'BANNED').length,
        suspended: users.filter((u) => u.status === 'SUSPENDED').length,
        new24h: users.filter((u) => u.createdAt >= last24h).length,
        new7d: users.filter((u) => u.createdAt >= last7d).length,
        subscribers: users.filter((u) => u.subscriptionTier > 0).length,
        byRole,
      },
      subscriptions: { active: 0, totalRevenueEth: 0 },
      nodes: { total: 0, online: 0, bySector: {}, byStatus: {} },
      yield: { totalEth: users.reduce((s, u) => s + u.totalYield, 0) },
      activity: { logs24h, adminActions24h: 0 },
      generatedAt: now.toISOString(),
      storage: 'memory (serverless)',
    });
  }

  const [totalUsers, activeSubscribers, bannedUsers, suspendedUsers, newUsers24h, newUsers7d, onlineNodes, totalNodes, totalYieldAgg, activeSubscriptions, logs24h, adminActions24h, usersByRole, nodesBySector, nodesByStatus] = await Promise.all([
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
  const revenueAgg = await db.subscription.aggregate({ _sum: { priceEth: true } });

  return NextResponse.json({
    users: { total: totalUsers, active: totalUsers - bannedUsers - suspendedUsers, banned: bannedUsers, suspended: suspendedUsers, new24h: newUsers24h, new7d: newUsers7d, subscribers: activeSubscribers, byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])) },
    subscriptions: { active: activeSubscriptions, totalRevenueEth: revenueAgg._sum.priceEth || 0 },
    nodes: { total: totalNodes, online: onlineNodes, bySector: Object.fromEntries(nodesBySector.map((n) => [n.sector, n._count])), byStatus: Object.fromEntries(nodesByStatus.map((n) => [n.status, n._count])) },
    yield: { totalEth: totalYieldAgg._sum.totalYield || 0 },
    activity: { logs24h, adminActions24h },
    generatedAt: now.toISOString(),
    storage: 'postgresql',
  });
}
