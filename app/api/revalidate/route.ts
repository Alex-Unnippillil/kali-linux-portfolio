import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();

    if (typeof path !== 'string' || path.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid path provided.' },
        { status: 400 }
      );
    }

    revalidatePath(path);

    return NextResponse.json({ ok: true, revalidatedPath: path });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}
