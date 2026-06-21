import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// Admin / Operator auth helpers
// ============================================================

export interface AuthContext {
  userId: string;
  walletAddress: string;
  role: 'USER' | 'OPERATOR' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

export async function requireAuth(req: NextRequest): Promise<AuthContext | NextResponse> {
  const wallet = req.headers.get('x-plvtvs-wallet')?.toLowerCase();
  if (!wallet || !wallet.startsWith('0x')) {
    return NextResponse.json(
      { error: 'Authentication required. Connect wallet first.' },
      { status: 401 }
    );
  }
  const user = await db.user.findUnique({
    where: { walletAddress: wallet },
    select: { id: true, walletAddress: true, role: true, status: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: 'Ghost not registered.' },
      { status: 404 }
    );
  }
  if (user.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: `Ghost status: ${user.status}. Access denied.` },
      { status: 403 }
    );
  }
  return {
    userId: user.id,
    walletAddress: user.walletAddress,
    role: user.role,
    status: user.status,
  };
}

export async function requireOperator(req: NextRequest): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.role !== 'OPERATOR' && ctx.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Operator privileges required.' },
      { status: 403 }
    );
  }
  return ctx;
}

export async function requireSuperAdmin(req: NextRequest): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Super Admin privileges required.' },
      { status: 403 }
    );
  }
  return ctx;
}

export function authOk(ctx: AuthContext | NextResponse): ctx is AuthContext {
  return !(ctx instanceof NextResponse);
}
