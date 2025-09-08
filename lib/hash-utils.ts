export async function sha256File(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const { createHash } = await import('crypto');
  const hash = createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}
