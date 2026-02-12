import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log('RUM metric:', body);

  return new NextResponse(null, { status: 204 });
}
