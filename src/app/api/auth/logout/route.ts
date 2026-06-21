import { NextResponse } from 'next/server';

export async function POST() {
  // Stateless logout — actual session clearing happens client-side.
  // We keep this endpoint for symmetry / future server-session invalidation.
  return NextResponse.json({ ok: true });
}
