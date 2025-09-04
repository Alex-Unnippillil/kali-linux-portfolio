import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const file = await fs.readFile(path.join(process.cwd(), 'plugin-manager', 'catalog.json'), 'utf-8');
    return NextResponse.json(JSON.parse(file));
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}
