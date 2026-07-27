import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface ChecksumResult {
  checksums: Record<string, string>;
  signature: string | null;
}

/**
 * Fetch checksum JSON and sign it with HMAC-SHA256.
 * Falls back to reading a local checksums.json if CHECKSUM_URL is unset.
 */
export async function fetchAndSignChecksums(): Promise<ChecksumResult> {
  let checksums: Record<string, string>;
  const url = process.env.CHECKSUM_URL;

  if (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch checksum json: ${res.statusText}`);
    }
    checksums = await res.json();
  } else {
    const filePath = path.join(process.cwd(), 'public', 'checksums.json');
    const file = await fs.readFile(filePath, 'utf8');
    checksums = JSON.parse(file);
  }

  const secret = process.env.CHECKSUM_SECRET;
  const json = JSON.stringify(checksums);
  const signature = secret
    ? crypto.createHmac('sha256', secret).update(json).digest('hex')
    : null;

  return { checksums, signature };
}

export default fetchAndSignChecksums;
