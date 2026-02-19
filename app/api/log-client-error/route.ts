import { NextRequest, NextResponse } from 'next/server';
import { requireAppRouteApiAuth } from '../../../lib/api-auth';

export async function POST(req: NextRequest) {
  const authError = requireAppRouteApiAuth(req);
  if (authError) {
    return authError;
  }

  const body = await req.json();
  console.error('Client error:', body);
  return NextResponse.json({ ok: true });
}
