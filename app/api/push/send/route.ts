export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import prisma from '@/lib/prisma';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_EMAIL) {
  webPush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(req: NextRequest) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  const payload = await req.json();
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(sub.data as any, JSON.stringify(payload));
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        }
      }
    })
  );

  return NextResponse.json({ sent });
}
