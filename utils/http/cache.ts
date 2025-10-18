import crypto from 'crypto';

export function generateStrongEtag(payload: string): string {
  return `"${crypto.createHash('sha1').update(payload).digest('base64')}"`;
}

export function ifNoneMatchIncludes(
  etag: string,
  header: string | string[] | undefined,
): boolean {
  if (!header) return false;
  const values = Array.isArray(header) ? header : header.split(',');
  return values.some((value) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const normalized = trimmed.startsWith('W/') ? trimmed.slice(2) : trimmed;
    return normalized === etag;
  });
}
