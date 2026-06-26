import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, authOk } from '@/lib/plvtvs/admin-auth';
import { checkAndSendReminders, isEmailConfigured } from '@/lib/plvtvs/email';

// ============================================================
// POST /api/email/reminder — trigger subscription expiry scan
// Requires SUPER_ADMIN. Scans all active subscribers and sends
// reminder emails for those expiring in 3 or 1 day.
// ============================================================

export async function POST(req: NextRequest) {
  const ctx = await requireSuperAdmin(req);
  if (!authOk(ctx)) return ctx;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email system not configured. Set RESEND_API_KEY in environment.' },
      { status: 503 }
    );
  }

  try {
    const result = await checkAndSendReminders();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/email/reminder] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
