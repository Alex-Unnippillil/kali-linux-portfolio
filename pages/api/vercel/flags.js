import { NextResponse } from 'next/server';
import { verifyAccess } from 'flags';
import { getProviderData } from 'flags/next';
// Feature flag definitions used by the provider
import * as appFlags from '../../../app-flags';

export const config = { runtime: 'edge' };

/**
 * Serve feature flag configuration for Vercel's toolbar.
 * @param {import('next/server').NextRequest} request
 */
export default async function handler(request) {
  const authorized = await verifyAccess(request.headers.get('authorization'));
  if (!authorized) {
    return NextResponse.json(null, { status: 401 });
  }
  const data = await getProviderData(appFlags);
  return NextResponse.json(data);

}
