import { NextResponse } from 'next/server';
import * as appFlags from '../../../../app-flags';

export const dynamic = 'force-static';

export async function GET() {
  const data = {
    beta: await appFlags.beta(),
  };
  return NextResponse.json(data);
}
