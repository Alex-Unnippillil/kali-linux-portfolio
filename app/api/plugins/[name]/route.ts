import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface Params {
  params: { name: string };
}

export async function GET(request: Request, { params }: Params) {
  const filePath = path.join(process.cwd(), 'plugin-manager', params.name);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(data, { headers: { 'content-type': 'text/plain' } });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
