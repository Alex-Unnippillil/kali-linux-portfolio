import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 2000;
const MAX_FILES = 8;

type ShareMetadataFile = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
};

type ShareMetadata = {
  title?: string;
  text?: string;
  url?: string;
  files?: ShareMetadataFile[];
};

function sanitizeEntry(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_FIELD_LENGTH
    ? `${trimmed.slice(0, Math.max(0, MAX_FIELD_LENGTH - 1))}…`
    : trimmed;
}

function buildMetadata(formData: FormData): ShareMetadata {
  const metadata: ShareMetadata = {};

  const title = sanitizeEntry(formData.get('title'));
  if (title) metadata.title = title;

  const text = sanitizeEntry(formData.get('text'));
  if (text) metadata.text = text;

  const url = sanitizeEntry(formData.get('url'));
  if (url) metadata.url = url;

  const entries = formData.getAll('files').filter((item): item is File => item instanceof File);
  if (entries.length) {
    metadata.files = entries.slice(0, MAX_FILES).map((file) => ({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
    }));
  }

  return metadata;
}

function metadataToSearchParams(metadata: ShareMetadata, existing: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(existing);

  if (metadata.title) params.set('title', metadata.title);
  if (metadata.text) params.set('text', metadata.text);
  if (metadata.url) params.set('url', metadata.url);

  if (metadata.files?.length) {
    try {
      params.set('files', JSON.stringify(metadata.files));
    } catch {
      // Ignore serialization failures
    }
  }

  if (!params.has('source')) {
    params.set('source', 'share-target');
  }

  return params;
}

export async function POST(request: NextRequest) {
  const redirectUrl = new URL('/apps/files/import', request.url);
  let params = new URLSearchParams(request.nextUrl.searchParams);

  try {
    const formData = await request.formData();
    const metadata = buildMetadata(formData);
    params = metadataToSearchParams(metadata, params);
  } catch {
    // Ignore parsing errors and fall back to original query parameters
  }

  const search = params.toString();
  if (search) {
    redirectUrl.search = search;
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
