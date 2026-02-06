import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, normalizeIdentifier } from '../../../lib/rateLimit';

const errorSchema = z.object({
  message: z.string().min(1).max(5000),
  stack: z.string().max(8000).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  const identifier = normalizeIdentifier({
    headers: req.headers,
    ip: req.ip ?? undefined,
  });
  const limit = checkRateLimit(identifier, { max: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, {
      status: 429,
    });
  }

  let payload;
  try {
    const json = await req.json();
    payload = errorSchema.parse(json);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, {
      status: 400,
    });
  }

  const metadataPreview = payload.metadata
    ? JSON.stringify(payload.metadata).slice(0, 2000)
    : undefined;

  console.error('Client error:', {
    message: payload.message,
    stack: payload.stack,
    metadata: metadataPreview,
    ip: identifier,
  });

  return NextResponse.json({ ok: true, remaining: limit.remaining });
}
