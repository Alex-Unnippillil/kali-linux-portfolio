import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import {
  getAppearancePayload,
  parseAppearanceUpdate,
  writeAppearanceSettings,
} from '@/lib/appearance-store';

export async function GET() {
  const payload = getAppearancePayload();
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const update = parseAppearanceUpdate(body);

  if (!update || Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
  }

  writeAppearanceSettings(update);
  revalidateTag('appearance');

  const payload = getAppearancePayload();

  return NextResponse.json(payload);
}
