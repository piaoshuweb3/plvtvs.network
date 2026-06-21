import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOperator, requireSuperAdmin, authOk } from '@/lib/plvtvs/admin-auth';

// ============================================================
// PATCH /api/admin/users/[id] — update a user's role / status / yield
// Body: { role?, status?, totalYield?, subscriptionTier? }
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Determine required privilege
  const wantsRoleChange = body.role !== undefined;
  const ctx = wantsRoleChange
    ? await requireSuperAdmin(req)
    : await requireOperator(req);
  if (!authOk(ctx)) return ctx;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Operators cannot touch other operators/admins
  if (ctx.role === 'OPERATOR' && (target.role === 'OPERATOR' || target.role === 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: 'Operators cannot modify other admins.' },
      { status: 403 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.role !== undefined) data.role = body.role;
  if (body.status !== undefined) data.status = body.status;
  if (body.totalYield !== undefined) data.totalYield = body.totalYield;
  if (body.subscriptionTier !== undefined) data.subscriptionTier = body.subscriptionTier;

  const updated = await db.user.update({
    where: { id },
    data,
  });

  // Admin log
  await db.adminLog.create({
    data: {
      adminId: ctx.userId,
      targetUserId: id,
      action: wantsRoleChange ? 'ROLE_CHANGE' : 'USER_UPDATE',
      reason: body.reason || 'Admin action',
      metadata: JSON.stringify(data),
    },
  });

  return NextResponse.json({
    user: {
      ...updated,
      subscriptionExpiresAt: updated.subscriptionExpiresAt?.toISOString() || null,
      lastLoginAt: updated.lastLoginAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

// ============================================================
// DELETE /api/admin/users/[id] — ban a user (super admin only)
// ============================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireSuperAdmin(req);
  if (!authOk(ctx)) return ctx;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.role === 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Cannot ban a super admin.' },
      { status: 403 }
    );
  }

  const banned = await db.user.update({
    where: { id },
    data: { status: 'BANNED' },
  });

  await db.adminLog.create({
    data: {
      adminId: ctx.userId,
      targetUserId: id,
      action: 'BAN_USER',
      reason: 'Banned via admin console',
    },
  });

  return NextResponse.json({
    user: { id: banned.id, status: banned.status },
  });
}
