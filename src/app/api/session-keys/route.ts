// ============================================================
// PLVTVS.ONE — /api/session-keys
// ============================================================
// ERC-4337 Session Key management endpoints.
//
// POST   /api/session-keys          Create a new session key
// GET    /api/session-keys          List active session keys
// DELETE /api/session-keys?id=xxx   Revoke a session key
//
// All endpoints require authentication via x-plvtvs-wallet header.
// The session key private key is NEVER returned in API responses.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authOk } from '@/lib/plvtvs/admin-auth';
import {
  createSessionKey,
  listActiveSessionKeys,
  revokeSessionKey,
  type SessionKeyPermissions,
} from '@/lib/plvtvs/session-keys';

// ============================================================
// POST — Create a new session key
// ============================================================
// Body: { permissions: { maxEthPerTx, allowedContracts, allowedFunctions }, durationDays }
// Returns the session key metadata WITHOUT the private key.
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const {
    permissions,
    durationDays,
  } = body as {
    permissions?: SessionKeyPermissions;
    durationDays?: number;
  };

  // Validate permissions
  if (!permissions || typeof permissions.maxEthPerTx !== 'string') {
    return NextResponse.json(
      {
        error:
          'permissions.maxEthPerTx is required (e.g. "0.1" for 0.1 ETH per tx)',
      },
      { status: 400 },
    );
  }

  const days = typeof durationDays === 'number' && durationDays > 0
    ? durationDays
    : 7; // default 7 days

  if (days > 365) {
    return NextResponse.json(
      { error: 'Session key duration must be ≤ 365 days' },
      { status: 400 },
    );
  }

  const perms: SessionKeyPermissions = {
    maxEthPerTx: permissions.maxEthPerTx,
    allowedContracts: Array.isArray(permissions.allowedContracts)
      ? permissions.allowedContracts
      : [],
    allowedFunctions: Array.isArray(permissions.allowedFunctions)
      ? permissions.allowedFunctions
      : [],
  };

  const sessionKey = await createSessionKey(
    ctx.walletAddress,
    ctx.userId,
    perms,
    days,
  );

  // Return the session key WITHOUT the private key
  const { sessionPrivateKey: _, ...safe } = sessionKey;

  return NextResponse.json({ sessionKey: safe }, { status: 201 });
}

// ============================================================
// GET — List all active session keys for the authenticated user
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const keys = await listActiveSessionKeys(ctx.walletAddress);

  return NextResponse.json({ keys });
}

// ============================================================
// DELETE — Revoke a session key by ID
// ============================================================
// Query param: ?id=<session-key-uuid>
export async function DELETE(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (!authOk(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Session key id is required (e.g. ?id=uuid)' },
      { status: 400 },
    );
  }

  const revoked = await revokeSessionKey(id);

  if (!revoked) {
    return NextResponse.json(
      { error: 'Session key not found or already revoked' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
