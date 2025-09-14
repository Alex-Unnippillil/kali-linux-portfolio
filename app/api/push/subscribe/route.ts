export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { endpoint: subscription.endpoint, data: subscription },
      update: { data: subscription },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscription error:', err);
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
  }
}
