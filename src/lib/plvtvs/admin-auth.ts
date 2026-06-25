import { NextRequest, NextResponse } from 'next/server';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';

export interface AuthContext {
  userId: string;
  walletAddress: string;
  role: 'USER' | 'OPERATOR' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

export async function requireAuth(req: NextRequest): Promise<AuthContext | NextResponse> {
  const wallet = req.headers.get('x-plvtvs-wallet')?.toLowerCase();
  if (!wallet || !wallet.startsWith('0x')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (isUsingMemDb || !db) {
    const mdb = getMemDb();
    const user = mdb.users.get(wallet);
    if (!user) return NextResponse.json({ error: 'Ghost not registered.' }, { status: 404 });
    if (user.status !== 'ACTIVE') return NextResponse.json({ error: `Status: ${user.status}` }, { status: 403 });
    return { userId: user.id, walletAddress: user.walletAddress, role: user.role, status: user.status };
  }

  const user = await db.user.findUnique({ where: { walletAddress: wallet }, select: { id: true, walletAddress: true, role: true, status: true } });
  if (!user) return NextResponse.json({ error: 'Ghost not registered.' }, { status: 404 });
  if (user.status !== 'ACTIVE') return NextResponse.json({ error: `Status: ${user.status}` }, { status: 403 });
  return { userId: user.id, walletAddress: user.walletAddress, role: user.role, status: user.status };
}

export async function requireOperator(req: NextRequest): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.role !== 'OPERATOR' && ctx.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Operator required.' }, { status: 403 });
  return ctx;
}

export async function requireSuperAdmin(req: NextRequest): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super Admin required.' }, { status: 403 });
  return ctx;
}

export function authOk(ctx: AuthContext | NextResponse): ctx is AuthContext {
  return !(ctx instanceof NextResponse);
}
