import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAccess, type ApiData } from 'flags';
import { getProviderData } from 'flags/next';
import * as appFlags from '../../../app-flags';

export const config = { runtime: 'edge' };

export default async function handler(request: NextRequest) {
  const authorized = await verifyAccess(request.headers.get('authorization'));
  if (!authorized) {
    return NextResponse.json(null, { status: 401 });
  }

  const data = (await getProviderData(appFlags)) as ApiData;
  return NextResponse.json(data);
}
