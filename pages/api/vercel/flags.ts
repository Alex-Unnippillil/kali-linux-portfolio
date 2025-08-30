import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAccess, type ApiData } from '@vercel/flags';
import { getProviderData } from '@vercel/flags/next';
import { beta } from '../../../app-flags';

export const config = { runtime: 'edge' };

export default async function handler(request: NextRequest) {
  const authorized = await verifyAccess(request.headers.get('authorization'));
  if (!authorized) {
    return NextResponse.json(null, { status: 401 });
  }

  const data = (await getProviderData({ beta })) as ApiData;
  return NextResponse.json(data);
}
