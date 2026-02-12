import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req
    .json()
    .catch(() => null) as { tag?: unknown } | null;

  const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';

  if (!tag) {
    return NextResponse.json({ revalidated: false });
  }

  try {
    await revalidateTag(tag);
    return NextResponse.json({ revalidated: true });
  } catch (error) {
    console.error('Failed to revalidate tag:', error);
    return NextResponse.json({ revalidated: false });
  }
}
