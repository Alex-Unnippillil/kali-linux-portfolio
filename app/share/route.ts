import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const text = formData.get('text');
  const url = formData.get('url');
  const files = formData.getAll('files');

  if (typeof text === 'string') {
    console.log('Shared text:', text);
  }

  if (typeof url === 'string') {
    console.log('Shared URL:', url);
  }

  files.forEach((file) => {
    if (file instanceof File) {
      console.log('Shared file:', file.name, file.type, file.size);
    } else {
      console.log('Shared file value:', file);
    }
  });

  return NextResponse.redirect(new URL('/inbox', req.url), 303);
}
